import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import type { PoolClient } from "pg";
import { getSession } from "@/lib/auth";
import { transaction } from "@/lib/db";
import { recordAudit } from "@/lib/audit";
import { computeReplacementDate, classifyReplacement } from "@/lib/replacement";

function norm(s: string): string {
  return s
    .toString()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
}

function pick(row: Record<string, unknown>, candidates: string[]): string | null {
  const keys = Object.keys(row);
  for (const cand of candidates) {
    const nc = norm(cand);
    const found = keys.find((k) => norm(k).includes(nc));
    if (found && row[found] != null && String(row[found]).trim() !== "") {
      return String(row[found]).trim();
    }
  }
  return null;
}

function parseDate(v: string | null): string | null {
  if (!v) return null;
  // Excel serial number
  if (/^\d+(\.\d+)?$/.test(v)) {
    const serial = Number(v);
    if (serial > 30000 && serial < 60000) {
      const d = new Date(Math.round((serial - 25569) * 86400 * 1000));
      return d.toISOString().slice(0, 10);
    }
  }
  const m = v.match(/(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})/);
  if (m) {
    const [, d, mo, y] = m;
    const year = y.length === 2 ? "20" + y : y;
    return `${year}-${mo.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }
  const parsed = new Date(v);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString().slice(0, 10);
}

function parseMoney(v: string | null): number | null {
  if (!v) return null;
  const n = Number(String(v).replace(/[R$\s.]/g, "").replace(",", "."));
  return Number.isNaN(n) ? null : n;
}

interface Summary {
  employees: { created: number; skipped: number };
  assets: { created: number; skipped: number; duplicates: string[] };
  maintenances: { created: number; skipped: number };
  errors: string[];
}

export async function POST(request: Request) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  const form = await request.formData();
  const file = form.get("file") as File | null;
  const commit = String(form.get("commit") || "") === "true";
  if (!file) return NextResponse.json({ error: "Arquivo não enviado." }, { status: 400 });

  let wb: XLSX.WorkBook;
  try {
    wb = XLSX.read(Buffer.from(await file.arrayBuffer()), { type: "buffer" });
  } catch {
    return NextResponse.json({ error: "Arquivo XLSX inválido." }, { status: 400 });
  }

  const summary: Summary = {
    employees: { created: 0, skipped: 0 },
    assets: { created: 0, skipped: 0, duplicates: [] },
    maintenances: { created: 0, skipped: 0 },
    errors: [],
  };

  function sheet(nameIncludes: string): Record<string, unknown>[] {
    const name = wb.SheetNames.find((n) => norm(n).includes(norm(nameIncludes)));
    if (!name) {
      if (nameIncludes === "ativo" && wb.SheetNames.length > 0) {
        return XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { defval: null });
      }
      return [];
    }
    return XLSX.utils.sheet_to_json(wb.Sheets[name], { defval: null });
  }

  try {
    await transaction(async (client: PoolClient) => {
      const t = user.tenant_id;

      // Cache de departamentos, categorias, localizações, colaboradores, empresas
      const deptCache = new Map<string, string>();
      const catCache = new Map<string, string>();
      const locCache = new Map<string, string>();
      const empCache = new Map<string, string>();
      const companyCache = new Map<string, string>();

      async function ensureDept(name: string | null): Promise<string | null> {
        if (!name) return null;
        const key = norm(name);
        if (deptCache.has(key)) return deptCache.get(key)!;
        const ex = await client.query<{ id: string }>(
          "select id from departments where tenant_id=$1 and lower(name)=lower($2) limit 1",
          [t, name]
        );
        let id = ex.rows[0]?.id;
        if (!id) {
          const ins = await client.query<{ id: string }>(
            "insert into departments (tenant_id, name, status) values ($1,$2,'active') returning id",
            [t, name]
          );
          id = ins.rows[0].id;
        }
        deptCache.set(key, id);
        return id;
      }
      async function ensureCat(name: string | null): Promise<string | null> {
        const cname = name || "Outros";
        const key = norm(cname);
        if (catCache.has(key)) return catCache.get(key)!;
        const ex = await client.query<{ id: string }>(
          "select id from asset_categories where tenant_id=$1 and lower(name)=lower($2) limit 1",
          [t, cname]
        );
        let id = ex.rows[0]?.id;
        if (!id) {
          const ins = await client.query<{ id: string }>(
            "insert into asset_categories (tenant_id, name, status) values ($1,$2,'active') returning id",
            [t, cname]
          );
          id = ins.rows[0].id;
        }
        catCache.set(key, id);
        return id;
      }
      async function ensureLoc(name: string | null): Promise<string | null> {
        if (!name) return null;
        const key = norm(name);
        if (locCache.has(key)) return locCache.get(key)!;
        const ex = await client.query<{ id: string }>(
          "select id from locations where tenant_id=$1 and lower(name)=lower($2) limit 1",
          [t, name]
        );
        let id = ex.rows[0]?.id;
        if (!id) {
          const ins = await client.query<{ id: string }>(
            "insert into locations (tenant_id, name, status) values ($1,$2,'active') returning id",
            [t, name]
          );
          id = ins.rows[0].id;
        }
        locCache.set(key, id);
        return id;
      }
      async function findEmp(name: string | null): Promise<string | null> {
        if (!name) return null;
        const key = norm(name);
        if (empCache.has(key)) return empCache.get(key)!;
        const ex = await client.query<{ id: string }>(
          "select id from employees where tenant_id=$1 and lower(full_name)=lower($2) limit 1",
          [t, name]
        );
        const id = ex.rows[0]?.id ?? null;
        if (id) empCache.set(key, id);
        return id;
      }
      async function ensureCompany(name: string | null): Promise<string | null> {
        if (!name) return null;
        const key = norm(name);
        if (companyCache.has(key)) return companyCache.get(key)!;
        const ex = await client.query<{ id: string }>(
          "select id from companies where tenant_id=$1 and (lower(trade_name)=lower($2) or lower(legal_name)=lower($2)) limit 1",
          [t, name]
        );
        let id = ex.rows[0]?.id;
        if (!id) {
          const ins = await client.query<{ id: string }>(
            "insert into companies (tenant_id, trade_name, legal_name, status) values ($1,$2,$2,'active') returning id",
            [t, name]
          );
          id = ins.rows[0].id;
        }
        companyCache.set(key, id);
        return id;
      }

      // 1. Colaboradores
      for (const row of sheet("colaborador")) {
        const name = pick(row, ["Nome Completo", "Nome", "Colaborador"]);
        if (!name) continue;
        const email = pick(row, ["E-mail", "Email"]);
        const dept = pick(row, ["Departamento", "Setor"]);
        const registrationNumber = pick(row, ["Matrícula", "Matricula", "Registro"]);
        const jobTitle = pick(row, ["Cargo", "Função", "Funcao"]);
        const phone = pick(row, ["Telefone", "Celular", "Fone"]);

        const existing = await client.query<{ id: string }>(
          "select id from employees where tenant_id=$1 and (lower(full_name)=lower($2) or (email is not null and lower(email)=lower($3))) limit 1",
          [t, name, email ?? ""]
        );
        if (existing.rows[0]) {
          summary.employees.skipped++;
          empCache.set(norm(name), existing.rows[0].id);
          continue;
        }
        const deptId = await ensureDept(dept);
        const ins = await client.query<{ id: string }>(
          "insert into employees (tenant_id, full_name, email, department_id, registration_number, job_title, phone, status) values ($1,$2,$3,$4,$5,$6,$7,'Ativo') returning id",
          [t, name, email, deptId, registrationNumber, jobTitle, phone]
        );
        empCache.set(norm(name), ins.rows[0].id);
        summary.employees.created++;
      }

      // 2. Ativos
      for (const row of sheet("ativo")) {
        const name = pick(row, ["Nome do Equipamento", "Nome do Ativo", "Equipamento", "Nome"]);
        if (!name) continue;
        const serial = pick(row, ["Nº de Série", "Numero de Serie", "Série", "Serie"]);
        const tag = pick(row, ["Patrimônio", "Patrimonio", "Tag"]);
        const category = pick(row, ["Categoria"]) || pick(row, ["Equipamento"]);
        let brand = pick(row, ["Marca"]);
        const model = pick(row, ["Modelo"]);
        if (!brand && model) {
          const firstWord = model.split(" ")[0];
          const commonBrands = ["dell", "hp", "lenovo", "apple", "asus", "acer", "samsung", "lg", "positivo", "intelbras", "xiaomi", "microsoft"];
          if (commonBrands.includes(firstWord.toLowerCase())) {
            brand = firstWord.toUpperCase();
          }
        }
        const loc = pick(row, ["Localização", "Localizacao"]);
        const respName = pick(row, ["Responsável", "Responsavel", "Usuário", "Usuario", "User"]);
        const companyName = pick(row, ["Coligada", "Empresa", "Companhia"]);
        const companyId = await ensureCompany(companyName);
        const acqDate = parseDate(pick(row, ["Data de Aquisição", "Aquisicao", "Aquisição", "Ano"]));
        const acqValue = parseMoney(pick(row, ["Valor de Aquisição", "Valor"]));
        const usefulLife = Number(pick(row, ["Vida Útil", "Vida Util"]) || "") || null;
        const status = pick(row, ["Status", "Situação", "Situacao"]) || "Disponível";

        const internalCode = pick(row, ["Código Interno", "Codigo Interno", "Código", "Codigo", "Cod"]);
        const manufacturer = pick(row, ["Fabricante"]);
        const color = pick(row, ["Cor"]);
        const description = pick(row, ["Descrição", "Descricao"]);
        let physicalCondition = pick(row, ["Estado", "Conservação", "Conservacao", "Condição", "Condicao", "Situação", "Situacao"]);
        if (physicalCondition) {
          const pcLower = physicalCondition.toLowerCase();
          if (pcLower.includes("boa") || pcLower.includes("bom")) physicalCondition = "Bom";
          else if (pcLower.includes("regular") || pcLower.includes("aten")) physicalCondition = "Regular";
          else if (pcLower.includes("criti") || pcLower.includes("ruim")) physicalCondition = "Ruim";
          else if (pcLower.includes("novo")) physicalCondition = "Novo";
          else if (pcLower.includes("excelente")) physicalCondition = "Excelente";
          else if (pcLower.includes("irrecu")) physicalCondition = "Irrecuperável";
        }
        const invoiceNumber = pick(row, ["Nota Fiscal", "NF", "Número da Nota", "Numero da Nota"]);
        const purchaseOrder = pick(row, ["Ordem de Compra", "OC", "Pedido"]);
        const notes = pick(row, ["Observações", "Observacoes", "Notas", "OBS", "Obs"]);

        // Duplicidade por série e patrimônio
        let isDuplicate = false;
        let dupInfo = "";
        if (serial) {
          const dupSerial = await client.query(
            "select id from assets where tenant_id=$1 and serial_number=$2 and deleted_at is null limit 1",
            [t, serial]
          );
          if (dupSerial.rows[0]) {
            isDuplicate = true;
            dupInfo = `Série: ${serial}`;
          }
        }
        if (!isDuplicate && tag) {
          const dupTag = await client.query(
            "select id from assets where tenant_id=$1 and asset_tag=$2 and deleted_at is null limit 1",
            [t, tag]
          );
          if (dupTag.rows[0]) {
            isDuplicate = true;
            dupInfo = `Patrimônio: ${tag}`;
          }
        }

        if (isDuplicate) {
          summary.assets.skipped++;
          summary.assets.duplicates.push(`${name} (${dupInfo})`);
          continue;
        }

        const catId = await ensureCat(category);
        const locId = await ensureLoc(loc);
        
        let empId = await findEmp(respName);
        if (!empId && respName) {
          const dept = pick(row, ["Departamento", "Setor"]);
          const deptId = await ensureDept(dept);
          const ins = await client.query<{ id: string }>(
            "insert into employees (tenant_id, full_name, department_id, status) values ($1,$2,$3,'Ativo') returning id",
            [t, respName, deptId]
          );
          empId = ins.rows[0].id;
          empCache.set(norm(respName), empId);
          summary.employees.created++;
        }

        const replDate = computeReplacementDate(acqDate, usefulLife);
        const mappedStatus = norm(status) === "ativo" || norm(status) === "boa" ? (empId ? "Em uso" : "Disponível") : status;

        await client.query(
          `insert into assets (tenant_id, category_id, name, serial_number, asset_tag, brand, model, location_id,
             current_employee_id, company_id, acquisition_date, acquisition_value, useful_life_years, replacement_date,
             replacement_status, status, internal_code, manufacturer, color, description, physical_condition,
             invoice_number, purchase_order, notes)
           values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24)`,
          [
            t, catId, name, serial, tag, brand, model, locId, empId, companyId, acqDate, acqValue, usefulLife,
            replDate ? replDate.toISOString().slice(0, 10) : null,
            classifyReplacement(replDate), mappedStatus, internalCode, manufacturer, color, description, physicalCondition,
            invoiceNumber, purchaseOrder, notes
          ]
        );
        summary.assets.created++;
      }

      // 3. Manutenções
      for (const row of sheet("manuten")) {
        const serial = pick(row, ["Nº de Série", "Série", "Serie", "Patrimônio", "Patrimonio"]);
        if (!serial) { summary.maintenances.skipped++; continue; }
        const asset = await client.query<{ id: string }>(
          "select id from assets where tenant_id=$1 and (serial_number=$2 or asset_tag=$2) and deleted_at is null limit 1",
          [t, serial]
        );
        if (!asset.rows[0]) { summary.maintenances.skipped++; continue; }
        const type = pick(row, ["Tipo"]) || "Corretiva";
        const date = parseDate(pick(row, ["Data da Manutenção", "Data"]));
        const desc = pick(row, ["Descrição", "Descricao", "Problema"]);
        const cost = parseMoney(pick(row, ["Custo"])) ?? 0;
        const mStatus = pick(row, ["Status da Manutenção", "Status"]) || "Concluída";

        await client.query(
          `insert into maintenances (tenant_id, asset_id, type, status, problem_description, total_cost, service_cost, opened_at, completed_at)
           values ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
          [t, asset.rows[0].id, type, mStatus, desc, cost, cost, date || new Date().toISOString(), mStatus === "Concluída" ? (date || new Date().toISOString()) : null]
        );
        summary.maintenances.created++;
      }

      if (!commit) {
        // Dry-run: desfaz tudo
        throw { rollbackPreview: true };
      }

      await recordAudit({ user, action: "import", entityType: "spreadsheet", newValues: summary, client });
    });
  } catch (e: unknown) {
    if (e && typeof e === "object" && "rollbackPreview" in e) {
      return NextResponse.json({ preview: true, summary });
    }
    return NextResponse.json(
      { error: "Erro na importação: " + (e instanceof Error ? e.message : String(e)) },
      { status: 500 }
    );
  }

  return NextResponse.json({ committed: true, summary });
}
