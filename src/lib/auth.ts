import "server-only";
import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import { queryOne } from "./db";
import type { SessionUser } from "./types";
import type { Role } from "./constants";

const COOKIE_NAME = "osafi_session";
const secret = new TextEncoder().encode(
  process.env.AUTH_SECRET || "dev-secret-osafi-ativos-troque-em-producao"
);
const MAX_AGE = Number(process.env.SESSION_MAX_AGE || 28800);

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 10);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

interface TokenPayload {
  sub: string;
  sv: number; // session_version
}

export async function createSession(userId: string, sessionVersion: number) {
  const token = await new SignJWT({ sv: sessionVersion })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE}s`)
    .sign(secret);

  const store = await cookies();
  store.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: MAX_AGE,
    path: "/",
  });
}

export async function destroySession() {
  const store = await cookies();
  store.delete(COOKIE_NAME);
}

interface DbUser {
  id: string;
  tenant_id: string | null;
  name: string;
  email: string;
  role: Role;
  scope_type: string;
  scope_ids: string[];
  employee_id: string | null;
  is_platform_admin: boolean;
  status: string;
  session_version: number;
}

export async function getSession(): Promise<SessionUser | null> {
  const store = await cookies();
  const token = store.get(COOKIE_NAME)?.value;
  if (!token) return null;

  let payload: TokenPayload;
  try {
    const verified = await jwtVerify<{ sv: number }>(token, secret);
    payload = { sub: verified.payload.sub as string, sv: verified.payload.sv };
  } catch {
    return null;
  }

  const user = await queryOne<DbUser>(
    `select id, tenant_id, name, email, role, scope_type, scope_ids,
            employee_id, is_platform_admin, status, session_version
       from users where id = $1`,
    [payload.sub]
  );

  if (!user || user.status !== "active") return null;
  if (user.session_version !== payload.sv) return null;

  return {
    id: user.id,
    tenant_id: user.tenant_id,
    name: user.name,
    email: user.email,
    role: user.role,
    scope_type: user.scope_type,
    scope_ids: Array.isArray(user.scope_ids) ? user.scope_ids : [],
    employee_id: user.employee_id,
    is_platform_admin: user.is_platform_admin,
  };
}

/** Garante sessão em Server Components; redireciona para login se ausente. */
export async function requireSession(): Promise<SessionUser> {
  const session = await getSession();
  if (!session) {
    const { redirect } = await import("next/navigation");
    redirect("/login");
  }
  return session!;
}
