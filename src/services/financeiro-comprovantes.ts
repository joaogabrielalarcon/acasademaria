import { supabase } from "@/integrations/supabase/client";
import { FINANCIAL_RECEIPT_URL_SECONDS, validateFinancialReceipt } from "@/lib/financeiro-comprovantes";

const BUCKET = "financeiro-comprovantes";

export async function uploadFinancialReceipt(file: File) {
  const extension = validateFinancialReceipt(file);
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) throw new Error("Entre no sistema para enviar o comprovante.");
  const path = `${user.id}/${crypto.randomUUID()}.${extension}`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, { contentType: file.type, upsert: false });
  if (error) throw error;
  return path;
}

export async function getFinancialReceiptUrl(path: string) {
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, FINANCIAL_RECEIPT_URL_SECONDS);
  if (error) throw error;
  return data.signedUrl;
}