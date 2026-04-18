import jwt from "jsonwebtoken";
import { v4 as uuidv4 } from "uuid";

export interface JWTPayload {
  sub: string; // user ID
  email: string;
  dropzoneId?: string;
  roles: string[];
  type: "access" | "refresh";
  jti?: string; // JWT ID for token tracking
}

const ACCESS_TOKEN_EXPIRY = "15m";
const REFRESH_TOKEN_EXPIRY = "7d";

// In production use RS256 with key pair. Dev falls back to HS256 + shared secret.
const USE_RS256 = !!(process.env.JWT_PRIVATE_KEY && process.env.JWT_PUBLIC_KEY);
const ALGORITHM: jwt.Algorithm = USE_RS256 ? "RS256" : "HS256";
const SIGN_KEY = process.env.JWT_PRIVATE_KEY || process.env.JWT_SECRET || "dev-secret-change-me-in-production-min-32-chars!!";
const VERIFY_KEY = process.env.JWT_PUBLIC_KEY || process.env.JWT_SECRET || "dev-secret-change-me-in-production-min-32-chars!!";

export function generateTokenPair(payload: Omit<JWTPayload, "type" | "jti">) {
  const jti = uuidv4();
  const basePayload = { ...payload, jti };

  const accessToken = jwt.sign(
    { ...basePayload, type: "access" },
    SIGN_KEY,
    { algorithm: ALGORITHM, expiresIn: ACCESS_TOKEN_EXPIRY }
  );

  const refreshToken = jwt.sign(
    { ...basePayload, type: "refresh" },
    SIGN_KEY,
    { algorithm: ALGORITHM, expiresIn: REFRESH_TOKEN_EXPIRY }
  );

  return { accessToken, refreshToken, jti };
}

export function verifyToken(token: string): JWTPayload {
  try {
    const decoded = jwt.verify(token, VERIFY_KEY, {
      algorithms: [ALGORITHM],
    });
    return decoded as JWTPayload;
  } catch (error) {
    throw new Error("Invalid token");
  }
}

export function extractTokenFromHeader(
  authorizationHeader?: string
): string | null {
  if (!authorizationHeader) return null;
  const parts = authorizationHeader.split(" ");
  if (parts.length !== 2 || parts[0] !== "Bearer") return null;
  return parts[1];
}
