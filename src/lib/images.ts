import "server-only";

const MAX_IMAGE_BYTES = 2 * 1024 * 1024; // 2MB
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

export class ImageValidationError extends Error {}

export async function fileToDataUrl(file: File): Promise<string | null> {
  if (file.size === 0) return null;

  if (!ALLOWED_TYPES.has(file.type)) {
    throw new ImageValidationError(
      "Formato de imagem inválido. Use JPEG, PNG ou WebP."
    );
  }
  if (file.size > MAX_IMAGE_BYTES) {
    throw new ImageValidationError("A imagem deve ter no máximo 2MB.");
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  return `data:${file.type};base64,${buffer.toString("base64")}`;
}
