import "server-only";
import { mkdir, writeFile, readFile, unlink } from "node:fs/promises";
import { join, extname } from "node:path";
import { randomUUID } from "node:crypto";

const STORAGE_DIR = process.env.STORAGE_DIR || "./storage";

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

export async function storeFile(
  tenantId: string,
  fileName: string,
  bytes: Buffer
): Promise<string> {
  const dir = join(STORAGE_DIR, tenantId);
  await mkdir(dir, { recursive: true });
  const ext = extname(fileName);
  const key = `${randomUUID()}${ext}`;
  const fullPath = join(dir, key);
  await writeFile(fullPath, bytes);
  return join(tenantId, key).replace(/\\/g, "/");
}

export async function loadFile(storagePath: string): Promise<Buffer> {
  const safe = storagePath.replace(/\.\./g, "");
  return readFile(join(STORAGE_DIR, safe));
}

export async function deleteFile(storagePath: string): Promise<void> {
  const safe = storagePath.replace(/\.\./g, "");
  try {
    await unlink(join(STORAGE_DIR, safe));
  } catch {
    // arquivo já removido
  }
}
