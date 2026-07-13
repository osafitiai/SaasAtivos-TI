"use server";

import { revalidatePath } from "next/cache";
import { pool } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function markRead(formData: FormData) {
  const user = await getSession();
  if (!user) return;
  const id = String(formData.get("id"));
  await pool.query(
    "update notifications set read_at = now() where id = $1 and user_id = $2 and read_at is null",
    [id, user.id]
  );
  revalidatePath("/notificacoes");
}

export async function markAllRead() {
  const user = await getSession();
  if (!user) return;
  await pool.query(
    "update notifications set read_at = now() where user_id = $1 and read_at is null",
    [user.id]
  );
  revalidatePath("/notificacoes");
}
