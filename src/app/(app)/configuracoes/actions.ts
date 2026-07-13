"use server";

import { revalidatePath } from "next/cache";
import { pool, queryOne } from "@/lib/db";
import { getSession, verifyPassword, hashPassword, destroySession } from "@/lib/auth";
import { recordAudit } from "@/lib/audit";
import { redirect } from "next/navigation";

export interface ActionState {
  error?: string;
  success?: string;
}

export async function changePassword(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await getSession();
  if (!user) return { error: "Não autenticado." };

  const current = String(formData.get("current") || "");
  const next = String(formData.get("next") || "");
  const confirm = String(formData.get("confirm") || "");

  if (next.length < 6) return { error: "A nova senha deve ter ao menos 6 caracteres." };
  if (next !== confirm) return { error: "A confirmação não confere." };

  const row = await queryOne<{ password_hash: string }>(
    "select password_hash from users where id = $1",
    [user.id]
  );
  if (!row || !(await verifyPassword(current, row.password_hash))) {
    return { error: "Senha atual incorreta." };
  }

  await pool.query("update users set password_hash = $2 where id = $1", [
    user.id,
    await hashPassword(next),
  ]);
  await recordAudit({ user, action: "update", entityType: "user", entityId: user.id, newValues: { password_changed: true } });
  return { success: "Senha alterada com sucesso." };
}

export async function logoutAllDevices() {
  const user = await getSession();
  if (!user) return;
  await pool.query("update users set session_version = session_version + 1 where id = $1", [user.id]);
  await recordAudit({ user, action: "logout_all", entityType: "user", entityId: user.id });
  await destroySession();
  redirect("/login");
}

export async function saveNotificationPrefs(formData: FormData) {
  const user = await getSession();
  if (!user) return;
  const prefs = {
    email: formData.get("email") === "on",
    asset_assigned: formData.get("asset_assigned") === "on",
    maintenance: formData.get("maintenance") === "on",
    warranty: formData.get("warranty") === "on",
  };
  await pool.query("update users set notification_prefs = $2 where id = $1", [
    user.id,
    JSON.stringify(prefs),
  ]);
  revalidatePath("/configuracoes");
}
