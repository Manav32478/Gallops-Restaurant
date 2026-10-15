import { randomBytes } from 'crypto';
import { mkdir, writeFile } from 'fs/promises';
import path from 'path';

export const UPLOAD_DIR = process.env.UPLOAD_DIR
  ? path.resolve(process.cwd(), process.env.UPLOAD_DIR)
  : path.resolve(process.cwd(), 'uploads');

const ALLOWED = new Map([
  ['image/jpeg', 'jpg'],
  ['image/png', 'png'],
  ['image/webp', 'webp'],
  ['image/avif', 'avif'],
  ['image/gif', 'gif'],
]);

export const MAX_UPLOAD_BYTES = 6 * 1024 * 1024;

export class UploadError extends Error {}

/**
 * Validates and stores an upload. Local filesystem by default;
 * set UPLOAD_PROVIDER=cloudinary (with CLOUDINARY_URL) in production.
 */
export async function storeImage(file: File, folder = 'menu'): Promise<string> {
  if (!ALLOWED.has(file.type)) {
    throw new UploadError('Unsupported file type. Use JPG, PNG, WEBP, AVIF or GIF.');
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    throw new UploadError('Image is larger than 6 MB.');
  }
  const bytes = Buffer.from(await file.arrayBuffer());
  if (bytes.length > MAX_UPLOAD_BYTES) throw new UploadError('Image is larger than 6 MB.');
  if (!looksLikeImage(bytes)) throw new UploadError('The file does not look like a valid image.');

  const ext = ALLOWED.get(file.type)!;
  const name = `${Date.now().toString(36)}-${randomBytes(6).toString('hex')}.${ext}`;
  const relative = `/uploads/${folder}/${name}`;
  const target = path.join(UPLOAD_DIR, folder, name);
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, bytes);
  return relative;
}

function looksLikeImage(buf: Buffer): boolean {
  if (buf.length < 12) return false;
  if (buf[0] === 0xff && buf[1] === 0xd8) return true; // jpeg
  if (buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return true; // png
  if (buf.subarray(0, 4).toString('ascii') === 'RIFF' && buf.subarray(8, 12).toString('ascii') === 'WEBP') return true;
  if (buf.subarray(4, 8).toString('ascii') === 'ftyp') return true; // avif/heif
  if (buf.subarray(0, 3).toString('ascii') === 'GIF') return true;
  return false;
}
