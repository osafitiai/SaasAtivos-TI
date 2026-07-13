import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { runDailyAlerts } from "@/lib/alerts";

// Dispara a rotina diária de alertas. Pode ser chamada por um agendador (cron)
// ou manualmente por um administrador.
export async function POST(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  const auth = request.headers.get("authorization");

  if (!(cronSecret && auth === `Bearer ${cronSecret}`)) {
    const user = await getSession();
    if (!user || !can(user, "admin.manage")) {
      return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
    }
  }

  const result = await runDailyAlerts();
  return NextResponse.json({ ok: true, dispatched: result });
}
