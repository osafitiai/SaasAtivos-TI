"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { saveAsset } from "@/app/(app)/ativos/actions";
import type { FieldOption } from "@/components/CrudManager";
import type { Asset } from "@/lib/types";
import { ASSET_STATUSES, PHYSICAL_CONDITIONS } from "@/lib/constants";
import { toDateInputValue } from "@/lib/format";

interface Options {
  categories: FieldOption[];
  companies: FieldOption[];
  branches: FieldOption[];
  departments: FieldOption[];
  locations: FieldOption[];
  suppliers: FieldOption[];
}

const SECTIONS = [
  "Identificação",
  "Categoria e dados técnicos",
  "Aquisição",
  "Localização e responsável",
  "Garantia",
  "Revisão",
];

export function AssetForm({ options, asset }: { options: Options; asset?: Asset }) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const tech = (asset?.technical_data ?? {}) as Record<string, string>;

  async function handleSubmit(formData: FormData) {
    setPending(true);
    setError(null);
    const res = await saveAsset(formData);
    setPending(false);
    if (res.error) {
      setError(res.error);
      return;
    }
    router.push(res.id ? `/ativos/${res.id}` : "/ativos");
    router.refresh();
  }

  return (
    <form action={handleSubmit} className="space-y-6">
      {asset && <input type="hidden" name="id" value={asset.id} />}

      {/* Stepper */}
      <div className="flex flex-wrap gap-2">
        {SECTIONS.map((s, i) => (
          <button
            key={s}
            type="button"
            onClick={() => setStep(i)}
            className={`rounded-full px-3 py-1 text-xs font-medium transition ${
              i === step
                ? "bg-brand-600 text-white"
                : "bg-slate-200 text-slate-600 hover:bg-slate-300 dark:bg-slate-800 dark:text-slate-300"
            }`}
          >
            {i + 1}. {s}
          </button>
        ))}
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-300">
          {error}
        </div>
      )}

      {/* Todas as seções ficam no DOM (display) para não perder valores ao trocar de aba */}
      <Section active={step === 0}>
        <Grid>
          <Field label="Nome do ativo" required span={2}>
            <input name="name" required defaultValue={asset?.name ?? ""} className="input" />
          </Field>
          <Field label="Código interno">
            <input name="internal_code" defaultValue={asset?.internal_code ?? ""} className="input" />
          </Field>
          <Field label="Patrimônio">
            <input name="asset_tag" defaultValue={asset?.asset_tag ?? ""} className="input" />
          </Field>
          <Field label="Número de série">
            <input name="serial_number" defaultValue={asset?.serial_number ?? ""} className="input" />
          </Field>
          <Field label="Etiqueta/QR">
            <input name="etiqueta" defaultValue="" className="input" placeholder="opcional" />
          </Field>
          <Field label="Marca">
            <input name="brand" defaultValue={asset?.brand ?? ""} className="input" />
          </Field>
          <Field label="Modelo">
            <input name="model" defaultValue={asset?.model ?? ""} className="input" />
          </Field>
          <Field label="Fabricante">
            <input name="manufacturer" defaultValue={asset?.manufacturer ?? ""} className="input" />
          </Field>
          <Field label="Cor">
            <input name="color" defaultValue={asset?.color ?? ""} className="input" />
          </Field>
          <Field label="Condição física">
            <select name="physical_condition" defaultValue={asset?.physical_condition ?? ""} className="input">
              <option value="">— selecione —</option>
              {PHYSICAL_CONDITIONS.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </Field>
          <Field label="Descrição" span={2}>
            <textarea name="description" rows={2} defaultValue={asset?.description ?? ""} className="input" />
          </Field>
        </Grid>
      </Section>

      <Section active={step === 1}>
        <Grid>
          <Field label="Categoria" required>
            <select name="category_id" required defaultValue={asset?.category_id ?? ""} className="input">
              <option value="">— selecione —</option>
              {options.categories.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </Field>
          <Field label="Vida útil (anos)" help="Vazio herda da categoria">
            <input name="useful_life_years" type="number" min="0" defaultValue={asset?.useful_life_years ?? ""} className="input" />
          </Field>
        </Grid>
        <h4 className="mt-4 text-sm font-semibold text-slate-500">Dados técnicos</h4>
        <Grid>
          <TechField label="Processador" name="processador" tech={tech} />
          <TechField label="Memória RAM" name="memoria_ram" tech={tech} />
          <TechField label="Armazenamento" name="armazenamento" tech={tech} />
          <TechField label="Sistema operacional" name="sistema_operacional" tech={tech} />
          <TechField label="Hostname" name="hostname" tech={tech} />
          <TechField label="IP" name="ip" tech={tech} />
          <TechField label="MAC Ethernet" name="mac_ethernet" tech={tech} />
          <TechField label="MAC Wi-Fi" name="mac_wifi" tech={tech} />
          <TechField label="IMEI" name="imei" tech={tech} />
          <TechField label="Número da linha" name="numero_linha" tech={tech} />
          <TechField label="Operadora" name="operadora" tech={tech} />
          <TechField label="Capacidade" name="capacidade" tech={tech} />
          <TechField label="Tamanho (monitor)" name="tamanho" tech={tech} />
          <TechField label="Resolução" name="resolucao" tech={tech} />
          <TechField label="Nº de portas (switch)" name="portas" tech={tech} />
          <TechField label="Estado da bateria" name="estado_bateria" tech={tech} />
        </Grid>
      </Section>

      <Section active={step === 2}>
        <Grid>
          <Field label="Fornecedor">
            <select name="supplier_id" defaultValue={asset?.supplier_id ?? ""} className="input">
              <option value="">— selecione —</option>
              {options.suppliers.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </Field>
          <Field label="Empresa compradora">
            <select name="company_id" defaultValue={asset?.company_id ?? ""} className="input">
              <option value="">— selecione —</option>
              {options.companies.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </Field>
          <Field label="Nº da nota fiscal">
            <input name="invoice_number" defaultValue={asset?.invoice_number ?? ""} className="input" />
          </Field>
          <Field label="Chave da NF-e">
            <input name="invoice_key" defaultValue={asset?.invoice_key ?? ""} className="input" />
          </Field>
          <Field label="Data da nota fiscal">
            <input name="invoice_date" type="date" defaultValue={toDateInputValue(asset?.invoice_date)} className="input" />
          </Field>
          <Field label="Pedido de compra">
            <input name="purchase_order" defaultValue={asset?.purchase_order ?? ""} className="input" />
          </Field>
          <Field label="Data de aquisição">
            <input name="acquisition_date" type="date" defaultValue={toDateInputValue(asset?.acquisition_date)} className="input" />
          </Field>
          <Field label="Valor de aquisição (BRL)">
            <input name="acquisition_value" type="number" step="0.01" min="0" defaultValue={asset?.acquisition_value ?? ""} className="input" />
          </Field>
        </Grid>
      </Section>

      <Section active={step === 3}>
        <Grid>
          <Field label="Filial">
            <select name="branch_id" defaultValue={asset?.branch_id ?? ""} className="input">
              <option value="">— selecione —</option>
              {options.branches.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </Field>
          <Field label="Departamento">
            <select name="department_id" defaultValue={asset?.department_id ?? ""} className="input">
              <option value="">— selecione —</option>
              {options.departments.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </Field>
          <Field label="Localização">
            <select name="location_id" defaultValue={asset?.location_id ?? ""} className="input">
              <option value="">— selecione —</option>
              {options.locations.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </Field>
          <Field label="Status">
            <select name="status" defaultValue={asset?.status ?? "Disponível"} className="input">
              {ASSET_STATUSES.map((s) => (
                <option key={s.value} value={s.value}>{s.value}</option>
              ))}
            </select>
          </Field>
        </Grid>
        <p className="mt-2 text-xs text-slate-400">
          A associação a um colaborador é feita pela ação “Movimentar” após salvar o ativo, garantindo o histórico.
        </p>
      </Section>

      <Section active={step === 4}>
        <Grid>
          <Field label="Início da garantia">
            <input name="warranty_start_date" type="date" defaultValue={toDateInputValue(asset?.warranty_start_date)} className="input" />
          </Field>
          <Field label="Término da garantia">
            <input name="warranty_end_date" type="date" defaultValue={toDateInputValue(asset?.warranty_end_date)} className="input" />
          </Field>
          <Field label="Observações" span={2}>
            <textarea name="notes" rows={3} defaultValue={asset?.notes ?? ""} className="input" />
          </Field>
        </Grid>
      </Section>

      <Section active={step === 5}>
        <div className="rounded-lg bg-slate-50 p-4 text-sm text-slate-600 dark:bg-slate-800/50 dark:text-slate-300">
          Revise os dados nas abas anteriores. A <strong>previsão de substituição</strong> é calculada
          automaticamente a partir da data de aquisição somada à vida útil. Clique em salvar para concluir.
        </div>
      </Section>

      {/* Navegação */}
      <div className="flex items-center justify-between border-t border-slate-200 pt-4 dark:border-slate-800">
        <button
          type="button"
          className="btn-secondary"
          onClick={() => setStep((s) => Math.max(0, s - 1))}
          disabled={step === 0}
        >
          ← Anterior
        </button>
        <div className="flex gap-2">
          {step < SECTIONS.length - 1 ? (
            <button type="button" className="btn-primary" onClick={() => setStep((s) => s + 1)}>
              Próximo →
            </button>
          ) : (
            <button type="submit" className="btn-primary" disabled={pending}>
              {pending ? "Salvando..." : "Salvar ativo"}
            </button>
          )}
        </div>
      </div>
    </form>
  );
}

function Section({ active, children }: { active: boolean; children: React.ReactNode }) {
  return <div className={active ? "block" : "hidden"}>{children}</div>;
}
function Grid({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">{children}</div>;
}
function Field({
  label,
  required,
  span,
  help,
  children,
}: {
  label: string;
  required?: boolean;
  span?: number;
  help?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={span === 2 ? "sm:col-span-2" : ""}>
      <label className="label">
        {label}
        {required && <span className="text-red-500"> *</span>}
      </label>
      {children}
      {help && <p className="mt-1 text-xs text-slate-400">{help}</p>}
    </div>
  );
}
function TechField({ label, name, tech }: { label: string; name: string; tech: Record<string, string> }) {
  return (
    <Field label={label}>
      <input name={`tech_${name}`} defaultValue={tech[name] ?? ""} className="input" />
    </Field>
  );
}
