import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { pool } from "@/lib/db";
import { validateUpload, storeFile } from "@/lib/storage";
import { recordAudit } from "@/lib/audit";

export async function POST(request: Request) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  const form = await request.formData();
  const file = form.get("file") as File | null;
  const entityType = String(form.get("entity_type") || "");
  const entityId = String(form.get("entity_id") || "");
  const documentType = String(form.get("document_type") || "outros");

  if (!file || !entityType || !entityId) {
    return NextResponse.json({ error: "Dados incompletos." }, { status: 400 });
  }

  const err = validateUpload(file.name, file.size);
  if (err) return NextResponse.json({ error: err }, { status: 400 });

  const bytes = Buffer.from(await file.arrayBuffer());
  const storagePath = await storeFile(user.tenant_id!, file.name, bytes, file.type);

  const { rows } = await pool.query<{ id: string }>(
    `insert into documents
       (tenant_id, entity_type, entity_id, document_type, file_name, storage_path, mime_type, size_bytes, uploaded_by_user_id)
     values ($1,$2,$3,$4,$5,$6,$7,$8,$9) returning id`,
    [user.tenant_id, entityType, entityId, documentType, file.name, storagePath, file.type, file.size, user.id]
  );

  await recordAudit({
    user,
    action: "upload",
    entityType: "document",
    entityId: rows[0].id,
    newValues: { file_name: file.name, entity_type: entityType, entity_id: entityId },
  });

  return NextResponse.json({ ok: true, id: rows[0].id });
}
