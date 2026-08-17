import { prisma } from '@/lib/prisma';
import { requireSession } from '@/lib/auth';
import { route, jsonOk, ApiError, guard } from '@/lib/api';
import { isSafeUrl } from '@/lib/ssrf';
import { LIMITS } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

const ALLOWED_MIME_TYPES = [
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/webp',
  'image/gif',
  'image/svg+xml',
  'image/avif',
  'image/bmp',
  'image/x-icon',
  'image/vnd.microsoft.icon',
  'image/tiff',
];

const MAX_FILE_SIZE_BYTES = 12 * 1024 * 1024; // 12MB limit for high-res images

export const GET = route(async (req) => {
  const url = new URL(req.url);
  const category = url.searchParams.get('category');

  const where = category ? { category } : {};

  const assets = await prisma.mediaAsset.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: 100,
  });

  return jsonOk({ assets });
});

export const POST = route(async (req) => {
  guard(req, 'media-upload', LIMITS.upload);
  const session = await requireSession();

  const body = (await req.json()) as {
    name?: string;
    url?: string;
    mimeType?: string;
    sizeBytes?: number;
    category?: string;
  };

  const name = body.name?.trim() || 'Uploaded Media';
  const url = body.url;
  let mimeType = (body.mimeType || 'image/png').toLowerCase();
  const sizeBytes = Number(body.sizeBytes) || 0;
  const category = body.category || 'EVENT_THUMBNAIL';

  if (!url) {
    throw new ApiError('Image URL or file data is required.', 400);
  }

  // Handle data URLs MIME extraction if needed
  if (url.startsWith('data:image/')) {
    const extractedMime = url.slice(5, url.indexOf(';'));
    if (extractedMime) mimeType = extractedMime.toLowerCase();
  }

  // Validate SSRF for external URLs
  if (!isSafeUrl(url)) {
    throw new ApiError('The provided media URL is invalid or uses an unauthorized host protocol.', 400);
  }

  // Validate allowed MIME types (or fallback for data URLs)
  if (!url.startsWith('data:image/') && !ALLOWED_MIME_TYPES.includes(mimeType)) {
    throw new ApiError(`Invalid image type (${mimeType}). Supported formats: PNG, JPEG, WEBP, GIF, SVG, AVIF, BMP.`, 400);
  }

  // Validate maximum size
  if (sizeBytes > MAX_FILE_SIZE_BYTES) {
    throw new ApiError('File size exceeds the maximum limit of 12MB.', 400);
  }

  const asset = await prisma.mediaAsset.create({
    data: {
      name,
      url,
      mimeType,
      sizeBytes,
      category,
      uploadedBy: session.userId,
    },
  });

  return jsonOk({ asset });
});

export const DELETE = route(async (req) => {
  guard(req, 'media-delete', LIMITS.write);
  const session = await requireSession();

  const url = new URL(req.url);
  const id = url.searchParams.get('id');

  if (!id) {
    throw new ApiError('Asset ID is required.', 400);
  }

  const asset = await prisma.mediaAsset.findUnique({ where: { id }, select: { id: true, uploadedBy: true } });
  if (!asset) {
    throw new ApiError('Media asset not found.', 404);
  }

  // Only uploader or admin can delete
  if (asset.uploadedBy && asset.uploadedBy !== session.userId && session.role !== 'ADMIN') {
    throw new ApiError('You do not have permission to delete this media asset.', 403);
  }

  await prisma.mediaAsset.delete({
    where: { id },
  });

  return jsonOk({ deleted: true });
});
