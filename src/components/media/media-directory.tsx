'use client';

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/toast';
import { ConfirmationModal } from '@/components/ui/confirmation-modal';
import { ImageCropperModal } from '@/components/ui/image-cropper';

export interface MediaAssetItem {
  id: string;
  name: string;
  url: string;
  mimeType: string;
  sizeBytes: number;
  category: string;
  createdAt: string;
}

export interface MediaDirectoryProps {
  onSelectUrl?: (url: string) => void;
  selectLabel?: string;
  compact?: boolean;
}

const CATEGORY_LABELS: Record<string, string> = {
  EVENT_THUMBNAIL: 'Event Thumbnail',
  AVATAR: 'Avatar Photo',
  PARTNER_LOGO: 'Partner Logo',
  BANNER: 'Banner Image',
  COVER_IMAGE: 'Cover Image',
  GENERAL: 'General Media',
};

export function MediaDirectory({ onSelectUrl, selectLabel = 'Use as Thumbnail', compact = false }: MediaDirectoryProps) {
  const toast = useToast();
  const [assets, setAssets] = useState<MediaAssetItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('EVENT_THUMBNAIL');
  const [dragOver, setDragOver] = useState(false);
  const [previewImage, setPreviewImage] = useState<MediaAssetItem | null>(null);
  const [modalSuccess, setModalSuccess] = useState<MediaAssetItem | null>(null);

  // Crop modal state
  const [cropperOpen, setCropperOpen] = useState(false);
  const [rawCropSrc, setRawCropSrc] = useState<string | null>(null);
  const [rawCropFileName, setRawCropFileName] = useState<string>('Uploaded Image');

  useEffect(() => {
    fetchMedia();
  }, []);

  async function fetchMedia() {
    try {
      setLoading(true);
      const res = await fetch('/api/media');
      const data = await res.json();
      const assetList = data.assets || data.data?.assets;
      if (data.ok && Array.isArray(assetList)) {
        setAssets(assetList);
      }
    } catch {
      toast.error('Failed to load media assets');
    } finally {
      setLoading(false);
    }
  }

  function handleFileSelect(file: File) {
    if (!file.type.startsWith('image/')) {
      toast.error('Please select a valid image file (PNG, JPEG, WEBP, GIF, SVG, AVIF, BMP)');
      return;
    }

    if (file.size > 12 * 1024 * 1024) {
      toast.error('File size exceeds 12MB limit');
      return;
    }

    setRawCropFileName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      setRawCropSrc(dataUrl);
      setCropperOpen(true);
    };
    reader.readAsDataURL(file);
  }

  async function uploadFinalAsset(dataUrl: string, sizeBytes: number, fileName: string) {
    setUploading(true);
    try {
      const res = await fetch('/api/media', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: fileName,
          url: dataUrl,
          mimeType: 'image/webp',
          sizeBytes,
          category: selectedCategory,
        }),
      });

      const data = await res.json();
      const newAsset = data.asset || data.data?.asset;

      if (data.ok && newAsset) {
        setAssets((prev) => [newAsset, ...prev]);
        setModalSuccess(newAsset);
        setCropperOpen(false);
        setRawCropSrc(null);
        toast.success('Media image adjusted and saved successfully!');
      } else {
        toast.error(data.error || 'Failed to upload media');
      }
    } catch {
      toast.error('Network error uploading image');
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete(id: string) {
    try {
      const res = await fetch(`/api/media?id=${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.ok) {
        setAssets((prev) => prev.filter((a) => String(a.id) !== id));
        toast.success('Media asset removed');
      }
    } catch {
      toast.error('Failed to delete asset');
    }
  }

  function copyToClipboard(url: string) {
    navigator.clipboard.writeText(url);
    toast.success('Image URL copied to clipboard');
  }

  function formatSize(bytes: number) {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  }

  return (
    <div className="space-y-6">
      {/* Upload Drag & Drop Box */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          if (e.dataTransfer.files?.[0]) {
            handleFileSelect(e.dataTransfer.files[0]);
          }
        }}
        className={`relative border-2 border-dashed p-6 text-center transition-all duration-300 ${
          dragOver ? 'border-cyan bg-cyan/10 scale-[1.01]' : 'border-line bg-surface-inset hover:border-cyan/50'
        }`}
      >
        <div className="mx-auto max-w-md space-y-3">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-cyan/40 bg-cyan/10 text-2xl text-cyan">
            🖼️
          </div>
          <div>
            <h4 className="text-base font-extrabold text-white text-ink">Upload & Adjust Media Asset</h4>
            <p className="mt-1 font-mono text-xs text-ink-muted">
              Supports all image formats (PNG, JPEG, WEBP, GIF, SVG, AVIF). Drag & drop or browse below to open the crop editor.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="rounded border border-line bg-surface px-3 py-1.5 font-mono text-xs text-ink focus:border-cyan focus:outline-none"
            >
              <option value="EVENT_THUMBNAIL">Event Thumbnail</option>
              <option value="COVER_IMAGE">Cover Image / Banner</option>
              <option value="AVATAR">Avatar Photo</option>
              <option value="PARTNER_LOGO">Partner Logo</option>
              <option value="GENERAL">General Media</option>
            </select>

            <label className="cursor-pointer rounded bg-cyan px-4 py-1.5 font-mono text-xs font-bold text-white transition-all hover:bg-cyan-bright">
              {uploading ? 'Uploading…' : '📁 Select Image to Crop & Upload'}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                disabled={uploading}
                onChange={(e) => {
                  if (e.target.files?.[0]) handleFileSelect(e.target.files[0]);
                }}
              />
            </label>
          </div>
        </div>
      </div>

      {/* Directory Grid */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h4 className="font-mono text-xs font-bold uppercase tracking-widest text-cyan">
            Media Directory Assets ({assets.length})
          </h4>
          <span className="font-mono text-[10px] text-ink-muted">Click image to inspect or copy URL</span>
        </div>

        {loading ? (
          <div className="p-8 text-center font-mono text-xs text-ink-muted animate-pulse">
            Loading media assets…
          </div>
        ) : assets.length === 0 ? (
          <div className="border border-dashed border-line p-8 text-center font-mono text-xs text-ink-muted">
            No media assets uploaded yet. Upload an image above to get started.
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {assets.map((asset) => (
              <motion.div
                key={String(asset.id)}
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="group relative flex flex-col overflow-hidden border border-line bg-surface p-2 transition-all hover:border-cyan"
              >
                {/* Thumbnail Preview */}
                <div
                  onClick={() => setPreviewImage(asset)}
                  className="relative aspect-video w-full cursor-pointer overflow-hidden rounded bg-void/50"
                >
                  <img
                    src={asset.url}
                    alt={asset.name}
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 flex items-center justify-center bg-void/60 opacity-0 transition-opacity group-hover:opacity-100">
                    <span className="font-mono text-[10px] font-bold text-white">🔍 Preview</span>
                  </div>
                </div>

                {/* Info */}
                <div className="mt-2 min-w-0 flex-1 space-y-1">
                  <p className="truncate font-sans text-xs font-bold text-ink" title={asset.name}>
                    {asset.name}
                  </p>
                  <div className="flex items-center justify-between font-mono text-[9px] text-ink-muted">
                    <span className="rounded bg-cyan/15 px-1.5 py-0.5 text-cyan font-semibold">
                      {CATEGORY_LABELS[asset.category] || asset.category}
                    </span>
                    <span>{formatSize(asset.sizeBytes)}</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="mt-2 flex flex-col gap-1 border-t border-line/60 pt-2">
                  {onSelectUrl && (
                    <Button
                      onClick={() => onSelectUrl(asset.url)}
                      tone="lime"
                      size="sm"
                      className="w-full text-[10px]"
                    >
                      🎯 {selectLabel}
                    </Button>
                  )}
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => copyToClipboard(asset.url)}
                      className="flex-1 rounded border border-line bg-surface-raised px-2 py-1 font-mono text-[10px] font-bold text-ink-muted hover:border-cyan hover:text-cyan"
                    >
                      📋 Copy URL
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(String(asset.id))}
                      className="rounded border border-rose/30 bg-rose/10 px-2 py-1 font-mono text-[10px] font-bold text-rose hover:bg-rose/20"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Interactive Crop Modal */}
      {cropperOpen && rawCropSrc && (
        <ImageCropperModal
          open={cropperOpen}
          imageSrc={rawCropSrc}
          fileName={rawCropFileName}
          category={selectedCategory}
          onClose={() => {
            setCropperOpen(false);
            setRawCropSrc(null);
          }}
          onCropComplete={(croppedDataUrl, croppedSizeBytes) => {
            uploadFinalAsset(croppedDataUrl, croppedSizeBytes, rawCropFileName);
          }}
        />
      )}

      {/* Image Preview Modal */}
      {previewImage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-void/80 backdrop-blur-md">
          <div className="relative max-w-2xl w-full border border-line bg-surface p-5 rounded-lg shadow-panel-lg space-y-4">
            <div className="flex items-center justify-between border-b border-line pb-3">
              <h3 className="font-bold text-white text-ink text-base truncate">{previewImage.name}</h3>
              <button
                onClick={() => setPreviewImage(null)}
                className="font-mono text-xs text-ink-muted hover:text-white"
              >
                ✕ Close
              </button>
            </div>
            <div className="max-h-[60vh] overflow-hidden rounded border border-line bg-void/80 flex items-center justify-center">
              <img src={previewImage.url} alt={previewImage.name} className="max-h-[55vh] object-contain" />
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
              <span className="font-mono text-xs text-ink-muted">
                {CATEGORY_LABELS[previewImage.category] || previewImage.category} • {formatSize(previewImage.sizeBytes)}
              </span>
              <div className="flex gap-2">
                <Button onClick={() => copyToClipboard(previewImage.url)} tone="paper" size="sm">
                  📋 Copy Image URL
                </Button>
                {onSelectUrl && (
                  <Button
                    onClick={() => {
                      onSelectUrl(previewImage.url);
                      setPreviewImage(null);
                    }}
                    tone="lime"
                    size="sm"
                  >
                    🎯 {selectLabel}
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Success Modal */}
      {modalSuccess && (
        <ConfirmationModal
          isOpen={Boolean(modalSuccess)}
          onClose={() => setModalSuccess(null)}
          icon="🖼️"
          badgeTone="cyan"
          badgeText="MEDIA UPLOADED"
          title="Adjusted Image Saved to Media Directory!"
          subtitle={`"${modalSuccess.name}" has been cropped, optimized, and saved to your Media Directory.`}
          details={[
            { label: 'Asset Name', value: modalSuccess.name },
            { label: 'Category', value: CATEGORY_LABELS[modalSuccess.category] || modalSuccess.category },
            { label: 'File Size', value: formatSize(modalSuccess.sizeBytes) },
          ]}
          primaryAction={{
            label: 'Copy Image URL',
            onClick: () => copyToClipboard(modalSuccess.url),
          }}
          secondaryAction={{
            label: 'Close Directory',
            onClick: () => setModalSuccess(null),
          }}
        />
      )}
    </div>
  );
}
