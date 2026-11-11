// Image storage. Production: Cloudinary (CLOUDINARY_URL). Development/tests: local disk under DATA_DIR/uploads.
// Customer photos (bookings, trade-ins, inquiries) are private and only reachable through the admin API.
// Admin-uploaded product/service images are public.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { v2 as cloudinary } from 'cloudinary';
import { DATA_DIR } from './db.js';

export const STORAGE_KIND = process.env.CLOUDINARY_URL ? 'cloudinary' : 'local';
export const UPLOADS = path.join(DATA_DIR, 'uploads');
export const PRIVATE_FOLDERS = ['bookings', 'tradeins', 'inquiries'];
if (STORAGE_KIND === 'cloudinary') cloudinary.config({ secure: true }); // reads CLOUDINARY_URL
else for (const d of [...PRIVATE_FOLDERS, 'public']) fs.mkdirSync(path.join(UPLOADS, d), { recursive: true });

const ROOT_FOLDER = process.env.CLOUDINARY_FOLDER || 'alluplinks';
const newName = () => `${Date.now()}-${crypto.randomBytes(6).toString('hex')}`;
const extOf = (file) => ((path.extname(file.originalname || '') || '.jpg').toLowerCase().replace(/[^.a-z0-9]/g, '') || '.jpg');

/** Saves one multer memory file. Returns a reference string stored in the database:
 *  private: "bookings/<name>.<ext>" (local) or "cld/bookings/<name>.<format>" (Cloudinary)
 *  public:  "/uploads/<name>.<ext>" (local) or an https://res.cloudinary.com/... URL */
export async function saveFile(file, folder) {
  const isPrivate = folder !== 'public';
  const name = newName();
  if (STORAGE_KIND === 'local') {
    const fname = name + extOf(file);
    await fs.promises.writeFile(path.join(UPLOADS, folder, fname), file.buffer);
    return isPrivate ? `${folder}/${fname}` : `/uploads/${fname}`;
  }
  const result = await new Promise((resolve, reject) => {
    cloudinary.uploader.upload_stream({
      folder: `${ROOT_FOLDER}/${folder}`, public_id: name, resource_type: 'image',
      type: isPrivate ? 'authenticated' : 'upload', overwrite: false
    }, (err, r) => (err ? reject(err) : resolve(r))).end(file.buffer);
  });
  return isPrivate ? `cld/${folder}/${name}.${result.format}` : result.secure_url;
}

export async function saveFiles(files, folder) {
  const out = [];
  for (const f of files || []) out.push(await saveFile(f, folder));
  return out;
}

export async function removeFiles(refs) {
  for (const ref of refs || []) {
    try {
      if (ref.startsWith('cld/')) {
        const [, folder, file] = ref.split('/');
        await cloudinary.uploader.destroy(`${ROOT_FOLDER}/${folder}/${file.replace(/\.[^.]+$/, '')}`, { type: 'authenticated', resource_type: 'image' });
      } else if (!ref.startsWith('/') && !ref.startsWith('http')) {
        await fs.promises.rm(path.join(UPLOADS, ref), { force: true });
      }
    } catch { /* best effort */ }
  }
}

/** Streams a private customer photo to an authenticated admin. `segments` is the stored reference split on "/",
 *  e.g. ["bookings","123.jpg"] (local) or ["cld","bookings","123.jpg"] (Cloudinary). Returns false if not found. */
export async function sendPrivateFile(res, segments) {
  const cloud = segments[0] === 'cld';
  const [folder, rawFile] = cloud ? segments.slice(1) : segments;
  if (!PRIVATE_FOLDERS.includes(folder) || !rawFile) return false;
  const file = path.basename(rawFile);
  if (cloud) {
    if (STORAGE_KIND !== 'cloudinary') return false;
    const format = (file.match(/\.([a-z0-9]+)$/i) || [])[1];
    const url = cloudinary.url(`${ROOT_FOLDER}/${folder}/${file.replace(/\.[^.]+$/, '')}`, { type: 'authenticated', sign_url: true, secure: true, format, resource_type: 'image' });
    const r = await fetch(url);
    if (!r.ok) return false;
    res.set('Cache-Control', 'private, max-age=3600');
    res.type(r.headers.get('content-type') || 'image/jpeg').send(Buffer.from(await r.arrayBuffer()));
    return true;
  }
  const p = path.join(UPLOADS, folder, file);
  if (!fs.existsSync(p)) return false;
  res.sendFile(p);
  return true;
}
