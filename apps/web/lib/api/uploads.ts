import { api } from "./client";

/**
 * Upload an image to API storage. Accepts a File or a data URL string.
 * Returns the absolute URL the API now serves the file from.
 *
 * In dev/local: stored on the API's local disk and served via
 * http://localhost:4000/uploads/<hex>.<ext>. In production: same contract,
 * different backend (R2/S3) — UI code stays unchanged.
 */
export async function uploadImage(input: File | string): Promise<string> {
  const dataUrl = typeof input === "string" ? input : await fileToDataUrl(input);
  if (!/^data:image\//i.test(dataUrl)) {
    throw new Error("File harus berupa gambar (PNG/JPG/WebP/GIF).");
  }
  const res = await api<{ url: string }>("/uploads/image", { method: "POST", body: { dataUrl } });
  return res.url;
}

/**
 * Upload many in parallel. Returns the URLs in the same order as the input.
 * Strings already pointing at http(s) URLs are passed through unchanged so
 * a mixed list (existing + new) can be normalised in one pass.
 */
export async function uploadImages(items: Array<File | string>): Promise<string[]> {
  return Promise.all(items.map((it) => {
    if (typeof it === "string" && /^https?:\/\//i.test(it)) return it;
    return uploadImage(it);
  }));
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload  = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}
