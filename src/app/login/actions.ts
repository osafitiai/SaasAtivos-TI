"use server";

import { redirect } from "next/navigation";
import { queryOne } from "@/lib/db";
import { verifyPassword, createSession } from "@/lib/auth";
import { pool } from "@/lib/db";

export interface LoginState {
  error?: string;
}

export async function loginAction(
  _prev: LoginState,
  formData: FormData
): Promise<LoginState> {
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const password = String(formData.get("password") || "");

  if (!email || !password) {
    return { error: "Informe e-mail e senha." };
  }

  const user = await queryOne<{
    id: string;
    password_hash: string;
    status: string;
    session_version: number;
  }>(
    `select id, password_hash, status, session_version
       from users where lower(email) = $1 order by created_at limit 1`,
    [email]
  );

  if (!user || !(await verifyPassword(password, user.password_hash))) {
    return { error: "Credenciais inválidas." };
  }
  if (user.status !== "active") {
    return { error: "Usuário bloqueado. Contate o administrador." };
  }

  await pool.query("update users set last_login_at = now() where id = $1", [user.id]);
  await createSession(user.id, user.session_version);
  redirect("/dashboard");
}
