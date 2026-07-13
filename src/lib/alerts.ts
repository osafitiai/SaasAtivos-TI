import "server-only";
import { pool } from "./db";
import { notifyItTeam } from "./notifications";

/**
 * Rotina diária de alertas (SRS seção 28). Evita repetição usando alert_dispatch_log.
 * Retorna um resumo por tipo de alerta gerado.
 */
export async function runDailyAlerts(): Promise<Record<string, number>> {
  const result: Record<string, number> = {};
  const tenants = await pool.query<{ id: string }>("select id from tenants where status = 'active'");

  for (const { id: tenantId } of tenants.rows) {
    // helper que só notifica se ainda não notificou hoje para a entidade
    async function dispatch(
      key: string,
      entityId: string,
      payload: Parameters<typeof notifyItTeam>[1]
    ) {
      const already = await pool.query(
        `select 1 from alert_dispatch_log
          where tenant_id=$1 and alert_key=$2 and entity_id=$3 and dispatched_at > now() - interval '1 day'`,
        [tenantId, key, entityId]
      );
      if (already.rowCount) return;
      await notifyItTeam(tenantId, payload);
      await pool.query(
        `insert into alert_dispatch_log (tenant_id, alert_key, entity_id) values ($1,$2,$3)
         on conflict (tenant_id, alert_key, entity_id) do update set dispatched_at = now()`,
        [tenantId, key, entityId]
      );
      result[key] = (result[key] ?? 0) + 1;
    }

    // Substituição vencida / 90 dias
    const repl = await pool.query<{ id: string; name: string; d: number }>(
      `select id, name,
              (coalesce(replacement_date, (acquisition_date + (useful_life_years||' years')::interval)::date) - current_date) as d
         from assets
        where tenant_id=$1 and deleted_at is null and status not in ('Baixado','Descartado','Vendido','Doado')
          and coalesce(replacement_date, (acquisition_date + (useful_life_years||' years')::interval)::date) <= current_date + 90`,
      [tenantId]
    );
    for (const a of repl.rows) {
      const vencido = a.d < 0;
      await dispatch(vencido ? "replacement_overdue" : "replacement_90", a.id, {
        type: "asset.replacement_due",
        title: vencido ? "Substituição vencida" : "Substituição em até 90 dias",
        message: `O ativo "${a.name}" ${vencido ? "está com substituição vencida" : "precisa ser substituído em breve"}.`,
        entityType: "asset",
        entityId: a.id,
        severity: vencido ? "critical" : "warning",
      });
    }

    // Garantias vencendo (30/60/90)
    const warr = await pool.query<{ id: string; name: string }>(
      `select id, name from assets
        where tenant_id=$1 and deleted_at is null and warranty_end_date is not null
          and warranty_end_date between current_date and current_date + 90`,
      [tenantId]
    );
    for (const a of warr.rows) {
      await dispatch("warranty", a.id, {
        type: "asset.warranty_expiring",
        title: "Garantia próxima do vencimento",
        message: `A garantia do ativo "${a.name}" vence em até 90 dias.`,
        entityType: "asset",
        entityId: a.id,
        severity: "warning",
      });
    }

    // Licenças vencendo
    const lic = await pool.query<{ id: string; name: string }>(
      `select id, name from software_licenses
        where tenant_id=$1 and expires_at is not null and expires_at between current_date and current_date + 90`,
      [tenantId]
    );
    for (const l of lic.rows) {
      await dispatch("license", l.id, {
        type: "license.expiring",
        title: "Licença próxima do vencimento",
        message: `A licença "${l.name}" vence em até 90 dias.`,
        entityType: "software_license",
        entityId: l.id,
        severity: "warning",
      });
    }

    // Empréstimos vencidos
    const loans = await pool.query<{ id: string; asset_id: string }>(
      `select aa.id, aa.asset_id from asset_assignments aa
        where aa.tenant_id=$1 and aa.ended_at is null and aa.expected_return_at is not null
          and aa.expected_return_at < now()`,
      [tenantId]
    );
    for (const l of loans.rows) {
      await dispatch("loan_overdue", l.id, {
        type: "loan.overdue",
        title: "Empréstimo atrasado",
        message: "Há um empréstimo com devolução vencida.",
        entityType: "asset",
        entityId: l.asset_id,
        severity: "warning",
      });
    }

    // Manutenções com prazo vencido
    const maint = await pool.query<{ id: string }>(
      `select id from maintenances
        where tenant_id=$1 and status not in ('Concluída','Cancelada','Sem reparo')
          and expected_at is not null and expected_at < now()`,
      [tenantId]
    );
    for (const m of maint.rows) {
      await dispatch("maintenance_overdue", m.id, {
        type: "maintenance.overdue",
        title: "Manutenção atrasada",
        message: "Uma ordem de manutenção passou do prazo previsto.",
        entityType: "maintenance",
        entityId: m.id,
        severity: "warning",
      });
    }

    // Colaboradores desligados com ativos
    const term = await pool.query<{ id: string; full_name: string }>(
      `select distinct e.id, e.full_name from employees e
        join assets a on a.current_employee_id = e.id and a.deleted_at is null
       where e.tenant_id=$1 and e.status = 'Desligado'`,
      [tenantId]
    );
    for (const e of term.rows) {
      await dispatch("terminated_with_assets", e.id, {
        type: "employee.terminated_with_assets",
        title: "Colaborador desligado com ativos",
        message: `${e.full_name} está desligado e ainda possui ativos vinculados.`,
        entityType: "employee",
        entityId: e.id,
        severity: "critical",
      });
    }
  }

  return result;
}
