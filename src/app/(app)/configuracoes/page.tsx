import { requireSession } from "@/lib/auth";
import { queryOne } from "@/lib/db";
import { ROLE_LABELS } from "@/lib/constants";
import { PageHeader } from "@/components/PageHeader";
import { ChangePasswordForm } from "./ChangePasswordForm";
import { logoutAllDevices, saveNotificationPrefs } from "./actions";

export const dynamic = "force-dynamic";

export default async function ConfiguracoesPage() {
  const user = await requireSession();
  const prefsRow = await queryOne<{ notification_prefs: Record<string, boolean> }>(
    "select notification_prefs from users where id = $1",
    [user.id]
  );
  const prefs = prefsRow?.notification_prefs ?? {};

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="Configurações" subtitle="Preferências da conta e segurança" />

      <div className="space-y-6">
        <div className="card p-5">
          <h3 className="mb-3 text-sm font-semibold text-slate-700 dark:text-slate-200">Perfil</h3>
          <dl className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
            <div><dt className="text-slate-400">Nome</dt><dd className="font-medium">{user.name}</dd></div>
            <div><dt className="text-slate-400">E-mail</dt><dd className="font-medium">{user.email}</dd></div>
            <div><dt className="text-slate-400">Perfil</dt><dd className="font-medium">{ROLE_LABELS[user.role]}</dd></div>
            <div><dt className="text-slate-400">Escopo</dt><dd className="font-medium">{user.scope_type}</dd></div>
          </dl>
        </div>

        <div className="card p-5">
          <h3 className="mb-3 text-sm font-semibold text-slate-700 dark:text-slate-200">Alterar senha</h3>
          <ChangePasswordForm />
        </div>

        <div className="card p-5">
          <h3 className="mb-3 text-sm font-semibold text-slate-700 dark:text-slate-200">
            Preferências de notificação
          </h3>
          <form action={saveNotificationPrefs} className="space-y-2">
            <Toggle name="email" label="Receber por e-mail (quando configurado)" checked={prefs.email} />
            <Toggle name="asset_assigned" label="Ativo atribuído a mim" checked={prefs.asset_assigned !== false} />
            <Toggle name="maintenance" label="Atualizações de manutenção" checked={prefs.maintenance !== false} />
            <Toggle name="warranty" label="Garantias e licenças a vencer" checked={prefs.warranty !== false} />
            <button type="submit" className="btn-primary mt-2">Salvar preferências</button>
          </form>
        </div>

        <div className="card p-5">
          <h3 className="mb-3 text-sm font-semibold text-slate-700 dark:text-slate-200">Segurança da sessão</h3>
          <p className="mb-3 text-sm text-slate-500 dark:text-slate-400">
            Encerra a sessão em todos os dispositivos onde você está conectado.
          </p>
          <form action={logoutAllDevices}>
            <button type="submit" className="btn-danger">Sair de todos os dispositivos</button>
          </form>
        </div>
      </div>
    </div>
  );
}

function Toggle({ name, label, checked }: { name: string; label: string; checked?: boolean }) {
  return (
    <label className="flex items-center gap-3 text-sm text-slate-700 dark:text-slate-300">
      <input type="checkbox" name={name} defaultChecked={checked} className="h-4 w-4 rounded border-slate-300" />
      {label}
    </label>
  );
}
