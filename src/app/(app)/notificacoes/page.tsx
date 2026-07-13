import { requireSession } from "@/lib/auth";
import { query } from "@/lib/db";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { Badge } from "@/components/Badge";
import { formatDateTime } from "@/lib/format";
import { markRead, markAllRead } from "./actions";
import type { NotificationRow } from "@/lib/types";

export const dynamic = "force-dynamic";

const SEV: Record<string, string> = { info: "blue", warning: "amber", critical: "red", success: "green" };

export default async function NotificacoesPage() {
  const user = await requireSession();
  const rows = await query<NotificationRow>(
    "select * from notifications where user_id = $1 order by created_at desc limit 100",
    [user.id]
  );
  const hasUnread = rows.some((r) => !r.read_at);

  return (
    <div>
      <PageHeader
        title="Notificações"
        subtitle="Central de alertas e eventos"
        actions={
          hasUnread && (
            <form action={markAllRead}>
              <button className="btn-secondary">Marcar todas como lidas</button>
            </form>
          )
        }
      />

      {rows.length === 0 ? (
        <EmptyState icon="🔔" title="Sem notificações" description="Você está em dia." />
      ) : (
        <div className="space-y-2">
          {rows.map((n) => (
            <div
              key={n.id}
              className={`card flex items-start justify-between gap-4 p-4 ${
                n.read_at ? "opacity-60" : ""
              }`}
            >
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <Badge color={SEV[n.severity] ?? "blue"}>{n.severity}</Badge>
                  <span className="font-medium text-slate-800 dark:text-slate-100">{n.title}</span>
                </div>
                {n.message && <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{n.message}</p>}
                <p className="mt-1 text-xs text-slate-400">{formatDateTime(n.created_at)}</p>
              </div>
              {!n.read_at && (
                <form action={markRead}>
                  <input type="hidden" name="id" value={n.id} />
                  <button className="btn-ghost text-xs">Marcar lida</button>
                </form>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
