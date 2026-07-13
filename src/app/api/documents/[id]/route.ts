import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { pool, queryOne } from "@/lib/db";
import { loadFile, deleteFile } from "@/lib/storage";
import { recordAudit } from "@/lib/audit";

interface Doc {
  id: string;
  file_name: string;
  storage_path: string;
  mime_type: string | null;
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  const doc = await queryOne<Doc>(
    "select id, file_name, storage_path, mime_type from documents where id = $1 and tenant_id = $2 and deleted_at is null",
    [id, user.tenant_id]
  );
  if (!doc) return NextResponse.json({ error: "Não encontrado." }, { status: 404 });

  await recordAudit({ user, action: "download", entityType: "document", entityId: id });

  try {
    const buf = await loadFile(doc.storage_path);
    return new NextResponse(new Uint8Array(buf), {
      headers: {
        "Content-Type": doc.mime_type || "application/octet-stream",
        "Content-Disposition": `attachment; filename="${encodeURIComponent(doc.file_name)}"`,
      },
    });
  } catch {
    return NextResponse.json({ error: "Arquivo não encontrado no armazenamento." }, { status: 404 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  const doc = await queryOne<Doc>(
    "select id, file_name, storage_path from documents where id = $1 and tenant_id = $2 and deleted_at is null",
    [id, user.tenant_id]
  );
  if (!doc) return NextResponse.json({ error: "Não encontrado." }, { status: 404 });

  await pool.query("update documents set deleted_at = now() where id = $1", [id]);
  await deleteFile(doc.storage_path);
  await recordAudit({ user, action: "delete", entityType: "document", entityId: id, oldValues: { file_name: doc.file_name } });

  return NextResponse.json({ ok: true });
}
