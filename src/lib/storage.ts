import "server-only";
import { extname } from "node:path";
import { randomUUID } from "node:crypto";
import { getSupabaseAdmin, DOCUMENTS_BUCKET } from "./supabaseAdmin";

const ALLOWED_EXT = new Set([
  ".pdf", ".png", ".jpg", ".jpeg", ".gif", ".webp",
  ".doc", ".docx", ".xls", ".xlsx", ".csv", ".txt", ".zip",
]);
const MAX_SIZE = 20 * 1024 * 1024; // 20 MB

export function validateUpload(fileName: string, size: number): string | null {
  const ext = extname(fileName).toLowerCase();
  if (!ALLOWED_EXT.has(ext)) return "Extensão de arquivo não permitida.";
  if (size > MAX_SIZE) return "Arquivo excede o tamanho máximo de 20 MB.";
  return null;
}

/** Envia o arquivo ao Supabase Storage e retorna o caminho (key) dentro do bucket. */
export async function storeFile(
  tenantId: string,
  fileName: string,
  bytes: Buffer,
  contentType?: string
): Promise<string> {
  const ext = extname(fileName);
  const key = `${tenantId}/${randomUUID()}${ext}`;
  const supabase = getSupabaseAdmin();

  const { error } = await supabase.storage
    .from(DOCUMENTS_BUCKET)
    .upload(key, bytes, {
      contentType: contentType || "application/octet-stream",
      upsert: false,
    });

  if (error) throw new Error("Falha ao enviar arquivo: " + error.message);
  return key;
}

export async function loadFile(storagePath: string): Promise<Buffer> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.storage
    .from(DOCUMENTS_BUCKET)
    .download(storagePath);

  if (error || !data) throw new Error("Arquivo não encontrado no armazenamento.");
  return Buffer.from(await data.arrayBuffer());
}

export async function deleteFile(storagePath: string): Promise<void> {
  const supabase = getSupabaseAdmin();
  await supabase.storage.from(DOCUMENTS_BUCKET).remove([storagePath]);
}
