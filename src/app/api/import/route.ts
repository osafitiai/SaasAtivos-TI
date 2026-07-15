import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import type { PoolClient } from "pg";
import { getSession } from "@/lib/auth";
import { pool, transaction } from "@/lib/db";
import { recordAudit } from "@/lib/audit";
import { classifyReplacement, computeReplacementDate } from "@/lib/replacement";

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
    const found = keys.find((k) => norm(k) === nc || norm(k).includes(nc));
    if (found && row[found] != null && String(row[found]).trim() !== "") {
      return String(row[found]).trim();
    }
  }
  return null;
}

function parseDate(v: string | null): string | null {
  if (!v) return null;
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

interface ImportError {
  row: number;
  column: string;
  message: string;
}

export async function POST(request: Request) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  const form = await request.formData();
  const file = form.get("file") as File | null;
  const commit = String(form.get("commit") || "") === "true";
  const importValidOnly = String(form.get("import_valid_only") || "") === "true";

  if (!file) return NextResponse.json({ error: "Arquivo não enviado." }, { status: 400 });

  let wb: XLSX.WorkBook;
  try {
    wb = XLSX.read(Buffer.from(await file.arrayBuffer()), { type: "buffer" });
  } catch {
    return NextResponse.json({ error: "Arquivo XLSX inválido." }, { status: 400 });
  }

  const sheetName = wb.SheetNames.find((n) => norm(n).includes("importa")) || wb.SheetNames[0];
  if (!sheetName) {
    return NextResponse.json({ error: "Nenhuma aba encontrada na planilha." }, { status: 400 });
  }

  const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(wb.Sheets[sheetName], { defval: null });
  const t = user.tenant_id;

  // Carregar caches do banco de dados para evitar queries repetitivas em loops grandes
  const [categoriesDb, locationsDb, employeesDb] = await Promise.all([
    pool.query<{ id: string; name: string }>("select id, name from asset_categories where tenant_id = $1", [t]),
    pool.query<{ id: string; name: string }>("select id, name from locations where tenant_id = $1", [t]),
    pool.query<{ id: string; full_name: string; email: string | null }>(
      "select id, full_name, email from employees where tenant_id = $1 and status not in ('Desligado', 'Inativo')",
      [t]
    ),
  ]);

  const categoryMap = new Map(categoriesDb.rows.map((c) => [norm(c.name), c.id]));
  const locationMap = new Map(locationsDb.rows.map((l) => [norm(l.name), l.id]));
  
  // Mapear colaboradores pelo nome e também pelo email
  const employeeNameMap = new Map(employeesDb.rows.map((e) => [norm(e.full_name), e.id]));
  const employeeEmailMap = new Map(
    employeesDb.rows.filter((e) => e.email).map((e) => [norm(e.email!), e.id])
  );

  const errors: ImportError[] = [];
  const validRowsToCommit: Array<{
    data: Record<string, unknown>;
    rawRowIndex: number;
  }> = [];

  // Rastreador de duplicados dentro da própria planilha
  const seenSerials = new Set<string>();
  const seenTags = new Set<string>();
  const seenTecladoSerials = new Set<string>();
  const seenMouseSerials = new Set<string>();
  const seenHeadsetSerials = new Set<string>();

  // Iterar por cada linha (a linha real no Excel é index + 2 por conta do cabeçalho)
  for (let i = 0; i < rawRows.length; i++) {
    const row = rawRows[i];
    const rowIndex = i + 2;

    const category = pick(row, ["categoria_ativo", "categoria", "tipo"]);
    const nomeMaquina = pick(row, ["nome_maquina", "nome"]);
    const tag = pick(row, ["patrimonio", "etiqueta", "tag"]);
    const serial = pick(row, ["numero_serie", "serie", "serial"]);
    const serialTeclado = pick(row, ["numero_serie_teclado", "serie_teclado", "serial_teclado"]);
    const serialMouse = pick(row, ["numero_serie_mouse", "serie_mouse", "serial_mouse"]);
    const serialHeadset = pick(row, ["numero_serie_headset", "serie_headset", "serial_headset"]);
    const brand = pick(row, ["marca"]);
    const model = pick(row, ["modelo"]);
    const condicao = pick(row, ["condicao", "situacao", "estado"]);
    const observacoes = pick(row, ["observacoes", "obs", "observacao"]);
    const usuarioResponsavel = pick(row, ["usuario_responsavel", "responsavel", "user", "nome_usuario"]);
    const emailUsuario = pick(row, ["email_usuario", "email", "email_responsavel"]);
    const anoProduto = pick(row, ["ano_produto", "ano"]);
    const localizacao = pick(row, ["localizacao", "local"]);
    const processador = pick(row, ["processador", "cpu"]);
    const sistemaOperacional = pick(row, ["sistema_operacional", "so", "sistema"]);
    const enderecoMac = pick(row, ["endereco_mac", "mac"]);
    const enderecoIp = pick(row, ["endereco_ip", "ip"]);
    const chaveLicencaWindows = pick(row, ["chave_licenca_windows", "licenca", "chave_windows"]);
    const tamanhoPolegadas = pick(row, ["tamanho_polegadas", "polegadas", "tamanho"]);
    const numeroNotaFiscal = pick(row, ["numero_nota_fiscal", "nota_fiscal", "nf"]);
    const dataCompra = pick(row, ["data_compra", "data_aquisicao", "data"]);
    const valorCompra = pick(row, ["valor_compra", "valor", "preco"]);
    const fornecedor = pick(row, ["fornecedor"]);

    let rowHasError = false;

    const addRowError = (column: string, message: string) => {
      errors.push({ row: rowIndex, column, message });
      rowHasError = true;
    };

    // 1. Validar Categoria
    if (!category) {
      addRowError("categoria_ativo", "A categoria do ativo é obrigatória.");
      continue; // Não dá pra fazer validações específicas sem categoria
    }

    const catNorm = norm(category);
    const validCategories = ["notebook", "monitor", "kit teclado e mouse", "headset"];
    if (!validCategories.includes(catNorm)) {
      addRowError("categoria_ativo", `Categoria "${category}" é inválida. Escolha entre: Notebook, Monitor, Kit teclado e mouse, Headset.`);
      continue;
    }

    // Obter ID da categoria (deve existir no banco graças ao self-healing)
    const categoryId = categoryMap.get(catNorm) || null;
    if (!categoryId) {
      addRowError("categoria_ativo", `Categoria "${category}" não encontrada no sistema.`);
      continue;
    }

    // 2. Validar Condição
    if (!condicao) {
      addRowError("condicao", "A condição do equipamento é obrigatória.");
    } else {
      const condNorm = norm(condicao);
      if (!["boa", "media", "media", "ruim"].includes(condNorm)) {
        addRowError("condicao", `Condição "${condicao}" é inválida. Escolha entre: Boa, Média ou Ruim.`);
      }
    }

    // 3. Validar Localização
    let locationId: string | null = null;
    if (!localizacao) {
      addRowError("localizacao", "A localização do equipamento é obrigatória.");
    } else {
      const locNorm = norm(localizacao);
      locationId = locationMap.get(locNorm) || null;
      if (!locationId) {
        addRowError("localizacao", `Localização "${localizacao}" não cadastrada no sistema.`);
      }
    }

    // 4. Validar Usuário Responsável (se preenchido)
    let employeeId: string | null = null;
    if (usuarioResponsavel || emailUsuario) {
      if (emailUsuario) {
        employeeId = employeeEmailMap.get(norm(emailUsuario)) || null;
      }
      if (!employeeId && usuarioResponsavel) {
        employeeId = employeeNameMap.get(norm(usuarioResponsavel)) || null;
      }
      if (!employeeId) {
        addRowError(
          usuarioResponsavel ? "usuario_responsavel" : "email_usuario",
          `Responsável "${usuarioResponsavel || emailUsuario}" não encontrado ou inativo no sistema.`
        );
      }
    }

    // 5. Validar formatos MAC e IP
    if (enderecoMac) {
      const macRegex = /^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/;
      if (!macRegex.test(enderecoMac)) {
        addRowError("endereco_mac", `Endereço MAC "${enderecoMac}" inválido. Use o formato: 00:1A:2B:3C:4D:5E.`);
      }
    }

    if (enderecoIp) {
      const ipRegex = /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/;
      if (!ipRegex.test(enderecoIp)) {
        addRowError("endereco_ip", `Endereço IP "${enderecoIp}" inválido.`);
      } else {
        const parts = enderecoIp.split(".").map(Number);
        if (parts.some((p) => p < 0 || p > 255)) {
          addRowError("endereco_ip", `Endereço IP "${enderecoIp}" possui octetos fora do intervalo 0-255.`);
        }
      }
    }

    // 6. Validar ano do produto
    if (anoProduto) {
      const yr = Number(anoProduto);
      if (Number.isNaN(yr) || yr < 1900 || yr > 2100) {
        addRowError("ano_produto", `Ano do produto "${anoProduto}" inválido. Deve ser um número entre 1900 e 2100.`);
      }
    }

    // 7. Validar campos específicos de cada categoria
    if (catNorm === "notebook") {
      if (!nomeMaquina) addRowError("nome_maquina", "Nome da máquina é obrigatório para Notebook.");
      if (!serial) addRowError("numero_serie", "Número de série é obrigatório para Notebook.");
      if (!tag) addRowError("patrimonio", "Patrimônio é obrigatório para Notebook.");
      if (!brand) addRowError("marca", "Marca é obrigatória para Notebook.");
      if (!model) addRowError("modelo", "Modelo é obrigatório para Notebook.");
    } else if (catNorm === "monitor") {
      if (!tag) addRowError("patrimonio", "Patrimônio é obrigatório para Monitor.");
      if (!serial) addRowError("numero_serie", "Número de série é obrigatório para Monitor.");
      if (!brand) addRowError("marca", "Marca é obrigatória para Monitor.");
      if (!model) addRowError("modelo", "Modelo do monitor é obrigatório para Monitor.");
      if (!tamanhoPolegadas || Number.isNaN(Number(tamanhoPolegadas))) {
        addRowError("tamanho_polegadas", "Tamanho em polegadas é obrigatório e deve ser numérico para Monitor.");
      }
    } else if (catNorm === "kit teclado e mouse") {
      if (!serialTeclado) addRowError("numero_serie_teclado", "Número de série do teclado é obrigatório para Kit.");
      if (!serialMouse) addRowError("numero_serie_mouse", "Número de série do mouse é obrigatório para Kit.");
      if (!brand) addRowError("marca", "Marca é obrigatória para Kit teclado e mouse.");
      if (!model) addRowError("modelo", "Modelo é obrigatório para Kit teclado e mouse.");
    } else if (catNorm === "headset") {
      if (!serialHeadset) addRowError("numero_serie_headset", "Número de série do headset é obrigatório para Headset.");
      if (!brand) addRowError("marca", "Marca é obrigatória para Headset.");
      if (!model) addRowError("modelo", "Modelo é obrigatório para Headset.");
    }

    // 8. Validar duplicidades internas na planilha
    if (serial) {
      const sNorm = norm(serial);
      if (seenSerials.has(sNorm)) {
        addRowError("numero_serie", `Número de série "${serial}" está duplicado dentro da planilha.`);
      }
      seenSerials.add(sNorm);
    }
    if (tag) {
      const tNorm = norm(tag);
      if (seenTags.has(tNorm)) {
        addRowError("patrimonio", `Patrimônio "${tag}" está duplicado dentro da planilha.`);
      }
      seenTags.add(tNorm);
    }
    if (serialTeclado) {
      const stNorm = norm(serialTeclado);
      if (seenTecladoSerials.has(stNorm)) {
        addRowError("numero_serie_teclado", `Nº de série do teclado "${serialTeclado}" duplicado na planilha.`);
      }
      seenTecladoSerials.add(stNorm);
    }
    if (serialMouse) {
      const smNorm = norm(serialMouse);
      if (seenMouseSerials.has(smNorm)) {
        addRowError("numero_serie_mouse", `Nº de série do mouse "${serialMouse}" duplicado na planilha.`);
      }
      seenMouseSerials.add(smNorm);
    }
    if (serialHeadset) {
      const shNorm = norm(serialHeadset);
      if (seenHeadsetSerials.has(shNorm)) {
        addRowError("numero_serie_headset", `Nº de série do headset "${serialHeadset}" duplicado na planilha.`);
      }
      seenHeadsetSerials.add(shNorm);
    }

    // 9. Validar duplicidades em relação ao banco de dados
    if (serial) {
      const dupDb = await pool.query("select id from assets where tenant_id=$1 and serial_number=$2 and deleted_at is null limit 1", [t, serial]);
      if (dupDb.rows.length > 0) {
        addRowError("numero_serie", `Número de série "${serial}" já está cadastrado no sistema.`);
      }
    }
    if (tag) {
      const dupDb = await pool.query("select id from assets where tenant_id=$1 and asset_tag=$2 and deleted_at is null limit 1", [t, tag]);
      if (dupDb.rows.length > 0) {
        addRowError("patrimonio", `Patrimônio "${tag}" já está cadastrado no sistema.`);
      }
    }

    // Montar payload técnico dinâmico
    const technical: Record<string, string> = {};
    if (processador) technical.processador = processador;
    if (sistemaOperacional) technical.sistema_operacional = sistemaOperacional;
    if (enderecoMac) technical.endereco_mac = enderecoMac;
    if (enderecoIp) technical.endereco_ip = enderecoIp;
    if (chaveLicencaWindows) technical.chave_licenca_windows = chaveLicencaWindows;
    if (tamanhoPolegadas) technical.tamanho_polegadas = tamanhoPolegadas;
    if (serialTeclado) technical.numero_serie_teclado = serialTeclado;
    if (serialMouse) technical.numero_serie_mouse = serialMouse;
    if (serialHeadset) technical.numero_serie_headset = serialHeadset;
    if (anoProduto) technical.ano_produto = anoProduto;

    // Normalizar a condição física para o padrão capitalizado do banco
    let normalizedCondition = "Boa";
    if (condicao) {
      const c = norm(condicao);
      if (c === "boa") normalizedCondition = "Boa";
      if (c === "media" || c === "média") normalizedCondition = "Média";
      if (c === "ruim") normalizedCondition = "Ruim";
    }

    // Obter o fornecedor cadastrado se houver
    let supplierId: string | null = null;
    if (fornecedor) {
      const supDb = await pool.query<{ id: string }>(
        "select id from suppliers where tenant_id=$1 and lower(trade_name)=lower($2) limit 1",
        [t, fornecedor]
      );
      supplierId = supDb.rows[0]?.id || null;
    }

    // Obter a coligada se preenchida
    let companyId: string | null = null;
    const coligadaName = pick(row, ["coligada", "empresa"]);
    if (coligadaName) {
      const compDb = await pool.query<{ id: string }>(
        "select id from companies where tenant_id=$1 and (lower(trade_name)=lower($2) or lower(legal_name)=lower($2)) limit 1",
        [t, coligadaName]
      );
      companyId = compDb.rows[0]?.id || null;
    }

    // Nome final do ativo
    let finalName = nomeMaquina;
    if (!finalName) {
      finalName = `${category} ${brand} ${model}`.trim();
    }

    const acqDate = parseDate(dataCompra);
    const acqValue = parseMoney(valorCompra);

    if (!rowHasError) {
      validRowsToCommit.push({
        rawRowIndex: rowIndex,
        data: {
          category_id: categoryId,
          name: finalName,
          serial_number: serial || null,
          asset_tag: tag || null,
          brand: brand || null,
          model: model || null,
          physical_condition: normalizedCondition,
          notes: observacoes || null,
          current_employee_id: employeeId,
          location_id: locationId,
          technical_data: Object.keys(technical).length ? JSON.stringify(technical) : null,
          invoice_number: numeroNotaFiscal || null,
          acquisition_date: acqDate,
          acquisition_value: acqValue,
          supplier_id: supplierId,
          company_id: companyId,
          status: employeeId ? "Em uso" : "Disponível",
        },
      });
    }
  }

  const validCount = validRowsToCommit.length;
  const invalidCount = rawRows.length - validCount;

  // Se commit for solicitado, persistir somente os registros autorizados
  let importedCount = 0;
  if (commit && (validCount > 0 || (importValidOnly && validCount > 0))) {
    try {
      await transaction(async (client) => {
        for (const valid of validRowsToCommit) {
          const d = valid.data;
          const keys = Object.keys(d);
          const cols = ["tenant_id", ...keys];
          const ph = cols.map((_, i) => `$${i + 1}`);

          await client.query(
            `insert into assets (${cols.join(", ")}) values (${ph.join(", ")})`,
            [t, ...keys.map((k) => d[k])]
          );
          importedCount++;
        }
      });

      await recordAudit({
        user,
        action: "import",
        entityType: "asset",
        entityId: "bulk",
        newValues: { count: importedCount },
      });
    } catch (err: unknown) {
      return NextResponse.json({ error: "Erro ao gravar no banco: " + (err instanceof Error ? err.message : String(err)) }, { status: 500 });
    }
  }

  return NextResponse.json({
    ok: true,
    validCount,
    invalidCount,
    errors,
    importedCount,
    commitExecuted: commit,
  });
}
