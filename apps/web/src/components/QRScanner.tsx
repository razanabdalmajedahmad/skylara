'use client';

import { useEffect, useRef, useState } from 'react';

interface QRScannerProps {
  onScan: (code: string) => void;
  onError?: (error: string) => void;
}

export function QRScanner({ onScan, onError }: QRScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let stream: MediaStream | null = null;

    const startScanning = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: 'environment',
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
        });

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          setIsScanning(true);
        }
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Failed to access camera';
        setError(errorMsg);
        onError?.(errorMsg);
      }
    };

    void startScanning();

    return () => {
      stream?.getTracks().forEach((track) => track.stop());
    };
  }, [onError]);

  // Simple QR code detection placeholder
  // In production, integrate with a QR code library like jsQR or html5-qrcode
  const handleCapture = () => {
    if (videoRef.current && canvasRef.current) {
      const context = canvasRef.current.getContext('2d');
      if (context) {
        context.drawImage(videoRef.current, 0, 0);
        // QR detection would happen here with a library
        // For now, this is a placeholder
      }
    }
  };

  if (error) {
    return (
      <div className="w-full bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
        <p className="font-semibold">Camera Error</p>
        <p className="text-sm">{error}</p>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="bg-black rounded-lg overflow-hidden">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          className="w-full"
        />
      </div>
      <canvas
        ref={canvasRef}
        className="hidden"
        width={1280}
        height={720}
      />
      {isScanning && (
        <p className="text-center text-sm text-gray-600 mt-2">
          Point camera at QR code
        </p>
      )}
    </div>
  );
}
