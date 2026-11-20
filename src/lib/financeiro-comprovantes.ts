export const FINANCIAL_RECEIPT_MAX_BYTES = 10 * 1024 * 1024;
export const FINANCIAL_RECEIPT_URL_SECONDS = 300;
const MIME_EXTENSIONS: Readonly<Record<string, string>> = {
  "application/pdf": "pdf", "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp",
};

export function validateFinancialReceipt(file: Pick<File, "size" | "type">) {
  if (file.size <= 0) throw new Error("O comprovante está vazio.");
  if (file.size > FINANCIAL_RECEIPT_MAX_BYTES) throw new Error("O comprovante deve ter até 10 MB.");
  const extension = MIME_EXTENSIONS[file.type];
  if (!extension) throw new Error("Envie um PDF ou imagem JPG, PNG ou WebP.");
  return extension;
}