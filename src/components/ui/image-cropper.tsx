'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Modal } from './modal';
import { Button } from './button';

export interface ImageCropperProps {
  open: boolean;
  imageSrc: string;
  fileName?: string;
  category?: string;
  onClose: () => void;
  onCropComplete: (croppedDataUrl: string, croppedSizeBytes: number) => void;
}

export type AspectRatioPreset = '16:9' | '4:3' | '1:1' | 'free';

export function ImageCropperModal({
  open,
  imageSrc,
  fileName = 'Cropped Image',
  category = 'EVENT_THUMBNAIL',
  onClose,
  onCropComplete,
}: ImageCropperProps) {
  const [aspectRatio, setAspectRatio] = useState<AspectRatioPreset>('16:9');
  const [zoom, setZoom] = useState<number>(1);
  const [rotation, setRotation] = useState<number>(0);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);

  // Auto-select aspect ratio based on category
  useEffect(() => {
    if (category === 'HERO_BANNER' || category === 'COVER_IMAGE') setAspectRatio('16:9');
    else if (category === 'EVENT_THUMBNAIL') setAspectRatio('4:3');
    else if (category === 'AVATAR_PHOTO' || category === 'SPONSOR_LOGO') setAspectRatio('1:1');
    else setAspectRatio('16:9');
  }, [category, open]);

  // Render crop preview on canvas
  useEffect(() => {
    if (!open || !imageSrc) return;

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = imageSrc;
    img.onload = () => {
      imageRef.current = img;
      drawCanvas();
    };
  }, [open, imageSrc, aspectRatio, zoom, rotation]);

  const drawCanvas = () => {
    const canvas = canvasRef.current;
    const img = imageRef.current;
    if (!canvas || !img) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let targetWidth = img.width;
    let targetHeight = img.height;

    // Calculate aspect ratio crop box dimensions
    let cropWidth = img.width;
    let cropHeight = img.height;

    if (aspectRatio === '16:9') {
      if (img.width / img.height > 16 / 9) {
        cropWidth = img.height * (16 / 9);
      } else {
        cropHeight = img.width * (9 / 16);
      }
    } else if (aspectRatio === '4:3') {
      if (img.width / img.height > 4 / 3) {
        cropWidth = img.height * (4 / 3);
      } else {
        cropHeight = img.width * (3 / 4);
      }
    } else if (aspectRatio === '1:1') {
      const minDim = Math.min(img.width, img.height);
      cropWidth = minDim;
      cropHeight = minDim;
    }

    // Set canvas dimensions
    canvas.width = Math.min(cropWidth, 1600);
    canvas.height = Math.min(cropHeight, 1600 * (cropHeight / cropWidth));

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    // Center point
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.scale(zoom, zoom);

    // Source offset
    const sx = (img.width - cropWidth) / 2;
    const sy = (img.height - cropHeight) / 2;

    ctx.drawImage(
      img,
      sx,
      sy,
      cropWidth,
      cropHeight,
      -canvas.width / 2,
      -canvas.height / 2,
      canvas.width,
      canvas.height,
    );

    ctx.restore();
  };

  const handleCrop = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    setIsProcessing(true);
    try {
      const dataUrl = canvas.toDataURL('image/webp', 0.92);
      const head = 'data:image/webp;base64,';
      const sizeBytes = Math.round(((dataUrl.length - head.length) * 3) / 4);

      onCropComplete(dataUrl, sizeBytes);
    } catch {
      // Fallback to PNG
      const pngDataUrl = canvas.toDataURL('image/png');
      onCropComplete(pngDataUrl, pngDataUrl.length);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Crop & Adjust Image"
      kicker={`Adjusting asset for ${category.replace(/_/g, ' ')}`}
      tone="violet"
      size="lg"
    >
      <div className="space-y-5">
        {/* Preset Selector */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-4">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-bold uppercase tracking-wider text-ink-muted">Aspect Ratio:</span>
            <div className="flex items-center gap-1">
              {(
                [
                  { id: '16:9', label: '🖼️ Cover (16:9)' },
                  { id: '4:3', label: '🎟️ Event (4:3)' },
                  { id: '1:1', label: '👤 Square (1:1)' },
                  { id: 'free', label: '📐 Freeform' },
                ] as const
              ).map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => setAspectRatio(preset.id)}
                  className={`px-2.5 py-1 text-xs font-mono font-bold rounded border transition-colors ${
                    aspectRatio === preset.id
                      ? 'border-cyan bg-cyan/15 text-cyan'
                      : 'border-line bg-surface text-ink-muted hover:text-white'
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setRotation((r) => (r + 90) % 360)}
              className="px-2.5 py-1 text-xs font-mono font-bold rounded border border-line bg-surface text-ink-muted hover:text-white"
              title="Rotate 90 degrees"
            >
              🔄 Rotate ({rotation}°)
            </button>
          </div>
        </div>

        {/* Canvas Preview Box */}
        <div className="relative flex items-center justify-center overflow-hidden rounded border border-line bg-surface-inset p-4 min-h-[300px]">
          <canvas ref={canvasRef} className="max-h-[420px] max-w-full rounded object-contain shadow-panel" />
        </div>

        {/* Zoom Controls */}
        <div className="flex items-center gap-4 bg-surface p-3 rounded border border-line">
          <span className="font-mono text-xs font-bold uppercase text-ink-muted">Zoom:</span>
          <input
            type="range"
            min="0.5"
            max="2.5"
            step="0.05"
            value={zoom}
            onChange={(e) => setZoom(parseFloat(e.target.value))}
            className="flex-1 accent-cyan"
          />
          <span className="font-mono text-xs text-cyan font-bold">{Math.round(zoom * 100)}%</span>
          <button
            type="button"
            onClick={() => setZoom(1)}
            className="text-xs font-mono text-ink-muted hover:underline"
          >
            Reset
          </button>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <Button type="button" tone="paper" size="md" onClick={onClose}>
            Cancel
          </Button>
          <Button type="button" tone="lime" size="md" onClick={handleCrop} disabled={isProcessing}>
            {isProcessing ? 'Processing…' : '✨ Crop & Upload Asset'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
