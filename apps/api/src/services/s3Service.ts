import { getEnv } from "../utils/env";
import * as fs from "fs";
import * as path from "path";

/**
 * S3 File Upload Service
 *
 * Provides signed URL generation for direct client-to-S3 uploads,
 * and server-side utilities for file management.
 *
 * Uses @aws-sdk/client-s3 and @aws-sdk/s3-request-presigner.
 * Falls back to local filesystem storage when AWS credentials are not configured.
 */

// ── Local filesystem fallback ──────────────────────────────────────────────
const LOCAL_UPLOADS_DIR = path.resolve(process.cwd(), "uploads");

/** Ensure the uploads directory tree exists for a given file key */
function ensureLocalDir(fileKey: string): string {
  const fullPath = path.join(LOCAL_UPLOADS_DIR, fileKey);
  const dir = path.dirname(fullPath);
  fs.mkdirSync(dir, { recursive: true });
  return fullPath;
}

/** Check whether S3 credentials are present in the environment */
function isS3Configured(): boolean {
  const env = getEnv();
  return !!(env.AWS_ACCESS_KEY_ID && env.AWS_SECRET_ACCESS_KEY && env.S3_BUCKET_NAME);
}

/** Return the base URL used for locally-stored uploads */
function localBaseUrl(): string {
  const env = getEnv();
  const port = env.PORT || 3001;
  const host = env.HOST === "0.0.0.0" ? "localhost" : (env.HOST || "localhost");
  return `http://${host}:${port}`;
}

// Lazy-loaded AWS SDK modules (optional dependency)
let _s3Client: any = null;
let _sdkLoaded = false;
let _S3Client: any = null;
let _PutObjectCommand: any = null;
let _GetObjectCommand: any = null;
let _DeleteObjectCommand: any = null;
let _HeadBucketCommand: any = null;
let _getSignedUrl: any = null;

async function loadSdk() {
  if (_sdkLoaded) return !!_s3Client;
  _sdkLoaded = true;

  try {
    // @ts-ignore — optional dependency, lazy-loaded
    const clientModule = await import("@aws-sdk/client-s3");
    // @ts-ignore — optional dependency, lazy-loaded
    const presignerModule = await import("@aws-sdk/s3-request-presigner");
    _S3Client = clientModule.S3Client;
    _PutObjectCommand = clientModule.PutObjectCommand;
    _GetObjectCommand = clientModule.GetObjectCommand;
    _DeleteObjectCommand = clientModule.DeleteObjectCommand;
    _HeadBucketCommand = clientModule.HeadBucketCommand;

    _getSignedUrl = presignerModule.getSignedUrl;

    const env = getEnv();
    if (!env.AWS_ACCESS_KEY_ID || !env.AWS_SECRET_ACCESS_KEY || !env.S3_BUCKET_NAME) {
      console.warn("[S3] AWS credentials or bucket not configured. File uploads disabled.");
      return false;
    }

    _s3Client = new _S3Client({
      region: env.AWS_REGION,
      credentials: {
        accessKeyId: env.AWS_ACCESS_KEY_ID,
        secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
      },
    });
    return true;
  } catch {
    console.warn("[S3] @aws-sdk/client-s3 not installed. File uploads disabled.");
    return false;
  }
}

/** Upload categories with allowed MIME types and max sizes */
const UPLOAD_CONFIGS: Record<string, { maxSizeBytes: number; allowedTypes: string[]; prefix: string }> = {
  avatar: {
    maxSizeBytes: 5 * 1024 * 1024, // 5MB
    allowedTypes: ["image/jpeg", "image/png", "image/webp"],
    prefix: "avatars",
  },
  waiver: {
    maxSizeBytes: 10 * 1024 * 1024, // 10MB
    allowedTypes: ["application/pdf", "image/jpeg", "image/png"],
    prefix: "waivers",
  },
  document: {
    maxSizeBytes: 25 * 1024 * 1024, // 25MB
    allowedTypes: ["application/pdf", "image/jpeg", "image/png", "image/webp"],
    prefix: "documents",
  },
  media: {
    maxSizeBytes: 100 * 1024 * 1024, // 100MB
    allowedTypes: ["image/jpeg", "image/png", "image/webp", "video/mp4", "video/quicktime"],
    prefix: "media",
  },
  gear: {
    maxSizeBytes: 10 * 1024 * 1024, // 10MB
    allowedTypes: ["image/jpeg", "image/png", "image/webp"],
    prefix: "gear",
  },
  rental: {
    maxSizeBytes: 15 * 1024 * 1024, // 15MB
    allowedTypes: ["image/jpeg", "image/png", "image/webp"],
    prefix: "rentals",
  },
};

export type UploadCategory = keyof typeof UPLOAD_CONFIGS;

interface PresignedUploadResult {
  uploadUrl: string;
  fileKey: string;
  expiresIn: number;
}

interface PresignedDownloadResult {
  downloadUrl: string;
  expiresIn: number;
}

export class S3Service {
  private bucket: string;

  constructor() {
    this.bucket = getEnv().S3_BUCKET_NAME || "";
  }

  /** Check if S3 is available and configured */
  async isAvailable(): Promise<boolean> {
    const loaded = await loadSdk();
    if (!loaded || !_s3Client) return false;
    try {
      await _s3Client.send(new _HeadBucketCommand({ Bucket: this.bucket }));
      return true;
    } catch {
      return false;
    }
  }

  /** Check if local fallback is active (S3 not configured) */
  isLocalFallback(): boolean {
    return !isS3Configured();
  }

  /**
   * Generate a presigned PUT URL for direct client upload.
   * The client uploads directly to S3 — no file passes through our API server.
   *
   * When S3 is not configured, returns a local upload endpoint URL instead.
   * Files are saved to the local `uploads/` directory.
   */
  async getPresignedUploadUrl(params: {
    category: UploadCategory;
    fileName: string;
    contentType: string;
    dropzoneId: string;
    userId: string;
  }): Promise<PresignedUploadResult> {
    const config = UPLOAD_CONFIGS[params.category];
    if (!config) throw new Error(`Invalid upload category: ${params.category}`);

    if (!config.allowedTypes.includes(params.contentType)) {
      throw new Error(
        `File type ${params.contentType} not allowed for ${params.category}. Allowed: ${config.allowedTypes.join(", ")}`
      );
    }

    // Build key: {prefix}/{dropzoneId}/{userId}/{timestamp}-{sanitizedFileName}
    const sanitized = params.fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
    const timestamp = Date.now();
    const fileKey = `${config.prefix}/${params.dropzoneId}/${params.userId}/${timestamp}-${sanitized}`;

    // ── Local fallback when S3 is not configured ───────────────────────
    if (!isS3Configured()) {
      // S3 not configured — using local filesystem fallback
      if (typeof process !== "undefined" && process.env.NODE_ENV !== "test") {
        (globalThis as any).__skylara_log?.info?.(`[S3] Local fallback active — file stored at uploads/${fileKey}`);
      }
      // Ensure the directory exists for later write
      ensureLocalDir(fileKey);
      const base = localBaseUrl();
      const uploadUrl = `${base}/uploads/local`;
      const expiresIn = 600;
      return { uploadUrl, fileKey, expiresIn };
    }

    // ── Real S3 path ───────────────────────────────────────────────────
    await loadSdk();
    if (!_s3Client) throw new Error("S3 not configured");

    const expiresIn = 600; // 10 minutes
    const command = new _PutObjectCommand({
      Bucket: this.bucket,
      Key: fileKey,
      ContentType: params.contentType,
    });

    const uploadUrl = await _getSignedUrl(_s3Client, command, { expiresIn });

    return { uploadUrl, fileKey, expiresIn };
  }

  /** Generate a presigned GET URL for downloading/viewing a file. */
  async getPresignedDownloadUrl(fileKey: string): Promise<PresignedDownloadResult> {
    // Local fallback
    if (!isS3Configured()) {
      const base = localBaseUrl();
      return { downloadUrl: `${base}/uploads/${fileKey}`, expiresIn: 3600 };
    }

    await loadSdk();
    if (!_s3Client) throw new Error("S3 not configured");

    const expiresIn = 3600; // 1 hour
    const command = new _GetObjectCommand({
      Bucket: this.bucket,
      Key: fileKey,
    });

    const downloadUrl = await _getSignedUrl(_s3Client, command, { expiresIn });
    return { downloadUrl, expiresIn };
  }

  /** Delete a file from S3 (or local filesystem). */
  async deleteFile(fileKey: string): Promise<void> {
    // Local fallback
    if (!isS3Configured()) {
      const fullPath = path.join(LOCAL_UPLOADS_DIR, fileKey);
      if (fs.existsSync(fullPath)) {
        fs.unlinkSync(fullPath);
      }
      return;
    }

    await loadSdk();
    if (!_s3Client) throw new Error("S3 not configured");

    await _s3Client.send(
      new _DeleteObjectCommand({
        Bucket: this.bucket,
        Key: fileKey,
      })
    );
  }

  /**
   * Save file data to local storage (used by the local upload endpoint).
   * Returns the public URL for the saved file.
   */
  saveLocal(fileKey: string, data: Buffer): string {
    const fullPath = ensureLocalDir(fileKey);
    fs.writeFileSync(fullPath, data);
    const base = localBaseUrl();
    return `${base}/uploads/${fileKey}`;
  }

  /** Get the absolute path to the local uploads directory */
  static getUploadsDir(): string {
    return LOCAL_UPLOADS_DIR;
  }

  /** Get upload constraints for a category (used by frontend). */
  getUploadConfig(category: UploadCategory) {
    const config = UPLOAD_CONFIGS[category];
    if (!config) return null;
    return {
      maxSizeBytes: config.maxSizeBytes,
      maxSizeMB: Math.floor(config.maxSizeBytes / (1024 * 1024)),
      allowedTypes: config.allowedTypes,
    };
  }
}
