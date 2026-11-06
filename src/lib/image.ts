"use client";

/** Shown when the browser can't read the photo (e.g. HEIC in some browsers). */
export const PHOTO_ERROR = "Impossible de lire cette photo. Essayez une photo JPEG ou PNG prise avec l'appareil photo.";

/**
 * Downscale a photo in the browser before sending it (faster upload, cheaper analysis).
 * Throws an Error with a French, user-ready message when the photo can't be decoded.
 */
export async function resizeImage(file: File, max = 1024): Promise<{ data: string; mediaType: "image/jpeg" }> {
  const bitmap = await createImageBitmap(file).catch(() => {
    throw new Error(PHOTO_ERROR);
  });
  const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error(PHOTO_ERROR);
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  const url = canvas.toDataURL("image/jpeg", 0.85);
  return { data: url.split(",")[1], mediaType: "image/jpeg" };
}
