'use client';

import { useEffect, useRef } from 'react';

/**
 * Minimal QR Code generator component using Canvas.
 * Generates a QR code for the given data string using a simplified
 * alphanumeric encoding rendered as a pixel grid.
 *
 * For production, replace with a full QR library like `qrcode`.
 * This provides a visual representation for demo/MVP purposes.
 */

interface QRCodeProps {
  data: string;
  size?: number;
  className?: string;
}

/**
 * Simple deterministic hash-based grid generator.
 * Creates a visually QR-like pattern from input data.
 * NOTE: This is a visual placeholder — not scannable.
 * For real QR, use the `qrcode` npm package.
 */
function generateQRGrid(data: string, gridSize: number = 25): boolean[][] {
  // Simple hash function
  const hash = (str: string, seed: number): number => {
    let h = seed;
    for (let i = 0; i < str.length; i++) {
      h = ((h << 5) - h + str.charCodeAt(i)) | 0;
    }
    return h;
  };

  const grid: boolean[][] = Array.from({ length: gridSize }, () =>
    Array(gridSize).fill(false)
  );

  // Position detection patterns (top-left, top-right, bottom-left)
  const drawFinder = (startR: number, startC: number) => {
    for (let r = 0; r < 7; r++) {
      for (let c = 0; c < 7; c++) {
        const isOuter = r === 0 || r === 6 || c === 0 || c === 6;
        const isInner = r >= 2 && r <= 4 && c >= 2 && c <= 4;
        grid[startR + r][startC + c] = isOuter || isInner;
      }
    }
  };

  drawFinder(0, 0);
  drawFinder(0, gridSize - 7);
  drawFinder(gridSize - 7, 0);

  // Timing patterns
  for (let i = 8; i < gridSize - 8; i++) {
    grid[6][i] = i % 2 === 0;
    grid[i][6] = i % 2 === 0;
  }

  // Data area — fill with deterministic pattern based on input
  for (let r = 0; r < gridSize; r++) {
    for (let c = 0; c < gridSize; c++) {
      // Skip finder patterns and timing
      if (r < 8 && c < 8) continue;
      if (r < 8 && c >= gridSize - 8) continue;
      if (r >= gridSize - 8 && c < 8) continue;
      if (r === 6 || c === 6) continue;

      const h = hash(data, r * gridSize + c);
      grid[r][c] = (h & 1) === 1;
    }
  }

  return grid;
}

export function QRCode({ data, size = 200, className = '' }: QRCodeProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const gridSize = 25;
    const grid = generateQRGrid(data, gridSize);
    const cellSize = size / gridSize;

    canvas.width = size;
    canvas.height = size;

    // Background
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, size, size);

    // Modules
    ctx.fillStyle = '#000000';
    for (let r = 0; r < gridSize; r++) {
      for (let c = 0; c < gridSize; c++) {
        if (grid[r][c]) {
          ctx.fillRect(
            Math.floor(c * cellSize),
            Math.floor(r * cellSize),
            Math.ceil(cellSize),
            Math.ceil(cellSize)
          );
        }
      }
    }
  }, [data, size]);

  return (
    <canvas
      ref={canvasRef}
      width={size}
      height={size}
      className={`rounded ${className}`}
      style={{ imageRendering: 'pixelated' }}
    />
  );
}

export default QRCode;
