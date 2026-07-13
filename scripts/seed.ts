import bcrypt from "bcryptjs";
import { pool } from "./db";
import {
  DEFAULT_CATEGORIES,
  DEFAULT_DEPARTMENTS,
  DEFAULT_LOCATIONS,
} from "../src/lib/constants";
import { computeReplacementDate, classifyReplacement } from "../src/lib/replacement";

async function q<T = unknown>(sql: string, params: unknown[] = []): Promise<T[]> {
  const r = await pool.query(sql, params);
  return r.rows as T[];
}
async function one<T = { id: string }>(sql: string, params: unknown[] = []): Promise<T> {
  const rows = await q<T>(sql, params);
  return rows[0];
}

function daysAgo(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

async function main() {
  // Trava de segurança: o seed APAGA e recria o tenant OSAFI. Para evitar perda
  // de dados em produção, exija a flag --force (ou SEED_FORCE=true) quando já
  // existir um tenant 'osafi' com dados reais.
  const force = process.argv.includes("--force") || process.env.SEED_FORCE === "true";
  const existing = await pool.query<{ users: string; assets: string }>(
    `select
       (select count(*) from users u join tenants t on t.id = u.tenant_id where t.slug='osafi')::text as users,
       (select count(*) from assets a join tenants t on t.id = a.tenant_id where t.slug='osafi')::text as assets`
  );
  const hasData =
    Number(existing.rows[0]?.users ?? 0) > 0 || Number(existing.rows[0]?.assets ?? 0) > 0;
  if (hasData && !force) {
    console.error(
      "\n⛔ O tenant 'osafi' já possui dados. O seed apagaria tudo e recriaria a base de demonstração." +
        "\n   Se isto é um ambiente de produção, NÃO rode o seed." +
        "\n   Para recriar mesmo assim (ex.: ambiente de teste):" +
        "\n     PowerShell:  $env:SEED_FORCE=\"true\"; npm run db:seed" +
        "\n     Bash:        SEED_FORCE=true npm run db:seed\n"
    );
    await pool.end();
    process.exit(1);
  }

  console.log("→ Limpando dados de demonstração anteriores...");
  await pool.query("delete from tenants where slug = 'osafi'");

  console.log("→ Criando plano e tenant...");
  const plan = await one<{ id: string }>(
    "insert into plans (name, max_assets, max_employees) values ('Enterprise', null, null) returning id"
  );
  const tenant = await one<{ id: string }>(
    "insert into tenants (name, slug, status, plan_id) values ('OSAFI', 'osafi', 'active', $1) returning id",
    [plan.id]
  );
  const t = tenant.id;

  console.log("→ Criando usuário administrador...");
  const adminPassword = process.env.SEED_ADMIN_PASSWORD || "osafi123";
  const pass = await bcrypt.hash(adminPassword, 10);
  const admin = await one<{ id: string }>(
    `insert into users (tenant_id, name, email, password_hash, role, scope_type, is_platform_admin)
     values ($1,'Administrador OSAFI','admin@osafi.com.br',$2,'admin','tenant',true) returning id`,
    [t, pass]
  );

  console.log("→ Criando empresa, filiais e departamentos...");
  const company = await one<{ id: string }>(
    `insert into companies (tenant_id, legal_name, trade_name, cnpj, status)
     values ($1,'OSAFI Serviços Ltda','OSAFI','12.345.678/0001-90','active') returning id`,
    [t]
  );
  const branchRJ = await one<{ id: string }>(
    `insert into branches (tenant_id, company_id, name, code, city, state, status)
     values ($1,$2,'Sede RJ','RJ','Rio de Janeiro','RJ','active') returning id`,
    [t, company.id]
  );
  await q(
    `insert into branches (tenant_id, company_id, name, code, city, state, status)
     values ($1,$2,'Filial SP','SP','São Paulo','SP','active')`,
    [t, company.id]
  );

  const deptMap = new Map<string, string>();
  for (const name of DEFAULT_DEPARTMENTS) {
    const d = await one<{ id: string }>(
      "insert into departments (tenant_id, company_id, name, status) values ($1,$2,$3,'active') returning id",
      [t, company.id, name]
    );
    deptMap.set(name, d.id);
  }

  console.log("→ Criando localizações...");
  const locMap = new Map<string, string>();
  for (const name of DEFAULT_LOCATIONS) {
    const l = await one<{ id: string }>(
      "insert into locations (tenant_id, branch_id, name, status) values ($1,$2,$3,'active') returning id",
      [t, branchRJ.id, name]
    );
    locMap.set(name, l.id);
  }

  console.log("→ Criando categorias...");
  const catMap = new Map<string, string>();
  for (const c of DEFAULT_CATEGORIES) {
    const cat = await one<{ id: string }>(
      `insert into asset_categories
         (tenant_id, name, code, icon, color, default_useful_life_years, requires_serial_number, status)
       values ($1,$2,$3,$4,$5,$6,$7,'active') returning id`,
      [t, c.name, c.code, c.icon, c.color, c.usefulLife, c.requiresSerial]
    );
    catMap.set(c.name, cat.id);
  }

  console.log("→ Criando fornecedores...");
  const dell = await one<{ id: string }>(
    `insert into suppliers (tenant_id, trade_name, legal_name, cnpj, service_types, status)
     values ($1,'Dell Brasil','Dell Computadores do Brasil Ltda','72.381.189/0001-10','["Compra","Garantia"]','active') returning id`,
    [t]
  );
  const techAssist = await one<{ id: string }>(
    `insert into suppliers (tenant_id, trade_name, service_types, status)
     values ($1,'TechAssist Manutenção','["Manutenção","Reparo externo"]','active') returning id`,
    [t]
  );

  console.log("→ Criando colaboradores...");
  async function emp(name: string, dept: string, email: string, status = "Ativo") {
    return one<{ id: string }>(
      `insert into employees (tenant_id, company_id, department_id, full_name, email, status, hire_date)
       values ($1,$2,$3,$4,$5,$6,$7) returning id`,
      [t, company.id, deptMap.get(dept), name, email, status, daysAgo(400)]
    );
  }
  const joao = await emp("João Almeida", "Financeiro", "joao@osafi.com.br");
  const larissa = await emp("Larissa Souza", "Marketing", "larissa@osafi.com.br");
  const gustavo = await emp("Gustavo Lima", "T.I", "gustavo@osafi.com.br");
  await emp("Marcos Pereira", "Controladoria", "marcos@osafi.com.br");
  await emp("Ana Rodrigues", "RH", "ana@osafi.com.br");

  console.log("→ Criando ativos e vínculos...");
  async function createAsset(opts: {
    name: string;
    category: string;
    tag?: string;
    serial?: string;
    brand?: string;
    model?: string;
    value?: number;
    acqDaysAgo?: number;
    status: string;
    employeeId?: string;
    location: string;
    condition?: string;
  }): Promise<string> {
    const cat = DEFAULT_CATEGORIES.find((c) => c.name === opts.category)!;
    const acqDate = daysAgo(opts.acqDaysAgo ?? 300);
    const repl = computeReplacementDate(acqDate, cat.usefulLife);
    const a = await one<{ id: string }>(
      `insert into assets
         (tenant_id, company_id, branch_id, category_id, location_id, current_employee_id, supplier_id,
          name, asset_tag, serial_number, brand, model, status, physical_condition,
          acquisition_date, acquisition_value, useful_life_years, replacement_date, replacement_status, warranty_end_date)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20) returning id`,
      [
        t, company.id, branchRJ.id, catMap.get(opts.category), locMap.get(opts.location) ?? null,
        opts.employeeId ?? null, dell.id, opts.name, opts.tag ?? null, opts.serial ?? null,
        opts.brand ?? null, opts.model ?? null, opts.status, opts.condition ?? "Bom",
        acqDate, opts.value ?? null, cat.usefulLife,
        repl ? repl.toISOString().slice(0, 10) : null, classifyReplacement(repl),
        daysAgo(opts.acqDaysAgo ? opts.acqDaysAgo - 365 : -65),
      ]
    );
    // vínculo + movimentação de entrega
    if (opts.employeeId) {
      await q(
        `insert into asset_assignments (tenant_id, asset_id, employee_id, location_id, assignment_type, started_at, delivered_by_user_id)
         values ($1,$2,$3,$4,'Entrega', now() - interval '30 days', $5)`,
        [t, a.id, opts.employeeId, locMap.get(opts.location) ?? null, admin.id]
      );
      await q(
        `insert into asset_movements (tenant_id, asset_id, movement_type, to_employee_id, to_location_id, from_status, to_status, performed_by_user_id, occurred_at, reason)
         values ($1,$2,'Entrega',$3,$4,'Disponível',$5,$6, now() - interval '30 days','Entrega inicial (seed)')`,
        [t, a.id, opts.employeeId, locMap.get(opts.location) ?? null, opts.status, admin.id]
      );
    }
    return a.id;
  }

  await createAsset({ name: "Notebook Dell Latitude 5440", category: "Notebook", tag: "NB-0001", serial: "DL5440RJ001", brand: "Dell", model: "Latitude 5440", value: 6200, status: "Em uso", employeeId: joao.id, location: "Sede - 1º Andar", acqDaysAgo: 800 });
  await createAsset({ name: "Monitor Dell P2422H", category: "Monitor", tag: "MON-0001", serial: "DLP2422H01", brand: "Dell", model: "P2422H", value: 1100, status: "Em uso", employeeId: joao.id, location: "Sede - 1º Andar" });
  await createAsset({ name: "Notebook Lenovo ThinkPad E14", category: "Notebook", tag: "NB-0002", serial: "LNV-E14-002", brand: "Lenovo", model: "ThinkPad E14", value: 5400, status: "Em uso", employeeId: larissa.id, location: "Sede - 2º Andar", acqDaysAgo: 500 });
  await createAsset({ name: "Notebook Asus ExpertBook", category: "Notebook", tag: "NB-0003", serial: "ASUS-EB-003", brand: "Asus", model: "ExpertBook B1", value: 4800, status: "Em estoque com a TI", location: "Estoque da TI", acqDaysAgo: 120 });
  const monitorManut = await createAsset({ name: "Monitor LG 24MP400", category: "Monitor", tag: "MON-0002", serial: "LG24MP400X", brand: "LG", model: "24MP400", value: 900, status: "Em manutenção", location: "Manutenção externa", condition: "Regular" });
  await createAsset({ name: "Kit Teclado + Mouse Logitech MK270", category: "Periférico", tag: "PER-0001", brand: "Logitech", model: "MK270", value: 180, status: "Em uso", employeeId: gustavo.id, location: "Sede - Térreo" });
  await createAsset({ name: "Notebook Dell antigo (substituição)", category: "Notebook", tag: "NB-0004", serial: "DL-OLD-004", brand: "Dell", model: "Vostro 3400", value: 3500, status: "Disponível", location: "Estoque da TI", acqDaysAgo: 1400 });

  console.log("→ Criando manutenção de exemplo...");
  await q(
    `insert into maintenances (tenant_id, asset_id, supplier_id, protocol, type, status, problem_description, service_cost, parts_cost, total_cost, opened_at, requested_by_user_id)
     values ($1,$2,$3,'OS-2026-001','Corretiva','Em execução','Tela com falha de imagem intermitente',250,180,430, now() - interval '5 days',$4)`,
    [t, monitorManut, techAssist.id, admin.id]
  );

  console.log("→ Criando licença de software...");
  await q(
    `insert into software_licenses (tenant_id, company_id, name, vendor, plan, quantity_purchased, quantity_used, starts_at, expires_at, billing_cycle, recurring_cost, status)
     values ($1,$2,'Microsoft 365 Business','Microsoft','Business Standard',25,18,$3,$4,'Anual',9500,'active')`,
    [t, company.id, daysAgo(300), daysAgo(-45)]
  );

  console.log("\n✓ Seed concluído!");
  console.log("─────────────────────────────────────");
  console.log("  Acesse:   http://localhost:3000");
  console.log("  Login:    admin@osafi.com.br");
  console.log(`  Senha:    ${adminPassword}`);
  console.log("─────────────────────────────────────");
  console.log("  Crie os demais usuários em Administração → Usuários.");
  if (adminPassword === "osafi123") {
    console.log("  ⚠  Defina SEED_ADMIN_PASSWORD para usar uma senha forte no seed.");
  }
  await pool.end();
}

main().catch((err) => {
  console.error("✗ Erro no seed:", err);
  process.exit(1);
});
