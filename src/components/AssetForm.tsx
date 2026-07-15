"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { saveAsset, quickCreateLocation } from "@/app/(app)/ativos/actions";
import type { FieldOption } from "@/components/CrudManager";
import type { Asset } from "@/lib/types";

interface Options {
  categories: FieldOption[];
  companies: FieldOption[];
  branches: FieldOption[];
  departments: FieldOption[];
  locations: FieldOption[];
  suppliers: FieldOption[];
  employees: FieldOption[];
}

export function AssetForm({ options, asset }: { options: Options; asset?: Asset }) {
  const router = useRouter();
  const [categoryId, setCategoryId] = useState(asset?.category_id ?? "");
  const [step, setStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [locations, setLocations] = useState(options.locations);
  const [selectedLoc, setSelectedLoc] = useState(asset?.location_id ?? "");

  const filteredCategories = options.categories.filter(
    (c) => !options.employees.some((e) => e.label.toLowerCase() === c.label.toLowerCase())
  );
  const selectedCatLabel = filteredCategories.find((o) => o.value === categoryId)?.label || "";
  const catLower = selectedCatLabel.toLowerCase();

  const isNotebook = catLower.includes("notebook");
  const isMonitor = catLower.includes("monitor");
  const isKit = catLower.includes("kit teclado");
  const isHeadset = catLower.includes("headset");

  const tech = (asset?.technical_data ?? {}) as Record<string, string>;

  // Apenas notebook tem duas abas. Os outros têm apenas "Identificação"
  const tabs = isNotebook ? ["Identificação", "Dados técnicos"] : ["Identificação"];

  const handleCategoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    if (categoryId && val && val !== categoryId) {
      if (
        !confirm(
          "Alterar a categoria pode apagar os dados específicos já preenchidos nesta tela. Deseja continuar?"
        )
      ) {
        return;
      }
    }
    setCategoryId(val);
    setStep(0);
    setError(null);
    setSuccess(null);
  };

  const handleAddLocation = async () => {
    const name = prompt("Digite o nome da nova localização:");
    if (!name || name.trim() === "") return;
    const res = await quickCreateLocation(name.trim());
    if (res.error) {
      alert("Erro ao criar localização: " + res.error);
    } else if (res.id) {
      const newOpt = { value: res.id, label: name.trim() };
      setLocations((prev) => [...prev, newOpt]);
      setSelectedLoc(res.id);
    }
  };

  async function handleSubmit(formData: FormData) {
    setPending(true);
    setError(null);
    setSuccess(null);
    // Adiciona localização atual selecionada caso tenha sido criada dinamicamente
    formData.set("location_id", selectedLoc);

    // Se for kit ou headset, o nome do ativo pode ser o Modelo ou Categoria + Modelo
    const brand = String(formData.get("brand") || "").trim();
    const model = String(formData.get("model") || "").trim();
    const nameMaquina = String(formData.get("name") || "").trim();
    
    let finalName = nameMaquina;
    if (!finalName) {
      finalName = `${selectedCatLabel} ${brand} ${model}`.trim();
    }
    formData.set("name", finalName);

    const res = await saveAsset(formData);
    setPending(false);
    if (res.error) {
      setError(res.error);
      return;
    }
    setSuccess("Ativo salvo com sucesso!");
    setTimeout(() => {
      router.push(res.id ? `/ativos/${res.id}` : "/ativos");
      router.refresh();
    }, 1500);
  }

  return (
    <form action={handleSubmit} className="space-y-6">
      {asset && <input type="hidden" name="id" value={asset.id} />}

      {success && (
        <div className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700 dark:bg-green-900/20 dark:text-green-300">
          {success}
        </div>
      )}

      {error && (
        <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-300">
          {error}
        </div>
      )}

      {/* Categoria do Ativo (Sempre visível no topo e obrigatório) */}
      <div className="card p-4">
        <label className="label font-bold text-slate-700 dark:text-slate-200">
          Categoria do ativo <span className="text-red-500">*</span>
        </label>
        <select
          name="category_id"
          required
          value={categoryId}
          onChange={handleCategoryChange}
          className="input mt-1"
        >
          <option value="">— selecione a categoria —</option>
          {filteredCategories.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>

      {categoryId && (
        <>
          {/* Abas dinâmicas se houver mais de uma */}
          {tabs.length > 1 && (
            <div className="flex gap-2 border-b border-slate-200 pb-2 dark:border-slate-800">
              {tabs.map((t, idx) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setStep(idx)}
                  className={`border-b-2 px-4 py-2 text-sm font-medium transition ${
                    step === idx
                      ? "border-brand-600 text-brand-600"
                      : "border-transparent text-slate-500 hover:text-slate-700"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          )}

          {/* ABA 1: Identificação (Comum para todos, mas campos variam) */}
          {step === 0 && (
            <div className="card p-6">
              <Grid>
                {/* 1. Notebook Form */}
                {isNotebook && (
                  <>
                    <Field label="Nome da máquina" required>
                      <input
                        name="name"
                        required
                        defaultValue={asset?.name ?? ""}
                        className="input"
                      />
                    </Field>
                    <Field label="Número de série" required>
                      <input
                        name="serial_number"
                        required
                        defaultValue={asset?.serial_number ?? ""}
                        className="input"
                      />
                    </Field>
                    <Field label="Patrimônio" required>
                      <input
                        name="asset_tag"
                        required
                        defaultValue={asset?.asset_tag ?? ""}
                        className="input"
                      />
                    </Field>
                    <Field label="Marca" required>
                      <input
                        name="brand"
                        required
                        defaultValue={asset?.brand ?? ""}
                        className="input"
                      />
                    </Field>
                    <Field label="Modelo" required>
                      <input
                        name="model"
                        required
                        defaultValue={asset?.model ?? ""}
                        className="input"
                      />
                    </Field>
                    <Field label="Condição do equipamento" required>
                      <ConditionSelect defaultValue={asset?.physical_condition} />
                    </Field>
                    <Field label="Usuário responsável">
                      <EmployeeSelect
                        employees={options.employees}
                        defaultValue={asset?.current_employee_id}
                      />
                    </Field>
                    <Field label="Ano do produto">
                      <input
                        name="tech_ano_produto"
                        type="number"
                        min="1900"
                        max="2100"
                        defaultValue={tech.ano_produto ?? ""}
                        className="input"
                      />
                    </Field>
                    <Field label="Localização">
                      <LocationSelect
                        locations={locations}
                        value={selectedLoc}
                        onChange={setSelectedLoc}
                        onAddNew={handleAddLocation}
                      />
                    </Field>
                    <Field label="Nota fiscal da compra (PDF, JPG, PNG)">
                      <input
                        type="file"
                        name="invoice_file"
                        accept=".pdf,.jpg,.jpeg,.png"
                        className="input"
                      />
                    </Field>
                    <Field label="Observações" span={2}>
                      <textarea
                        name="notes"
                        rows={4}
                        defaultValue={asset?.notes ?? ""}
                        className="input"
                      />
                    </Field>
                  </>
                )}

                {/* 2. Monitor Form */}
                {isMonitor && (
                  <>
                    <Field label="Patrimônio" required>
                      <input
                        name="asset_tag"
                        required
                        defaultValue={asset?.asset_tag ?? ""}
                        className="input"
                      />
                    </Field>
                    <Field label="Número de série" required>
                      <input
                        name="serial_number"
                        required
                        defaultValue={asset?.serial_number ?? ""}
                        className="input"
                      />
                    </Field>
                    <Field label="Marca" required>
                      <input
                        name="brand"
                        required
                        defaultValue={asset?.brand ?? ""}
                        className="input"
                      />
                    </Field>
                    <Field label="Modelo do monitor" required>
                      <input
                        name="model"
                        required
                        defaultValue={asset?.model ?? ""}
                        className="input"
                      />
                    </Field>
                    <Field label="Tamanho em polegadas" required>
                      <input
                        name="tech_tamanho_polegadas"
                        type="number"
                        min="1"
                        required
                        defaultValue={tech.tamanho_polegadas ?? ""}
                        className="input"
                      />
                    </Field>
                    <Field label="Condição do equipamento" required>
                      <ConditionSelect defaultValue={asset?.physical_condition} />
                    </Field>
                    <Field label="Usuário responsável">
                      <EmployeeSelect
                        employees={options.employees}
                        defaultValue={asset?.current_employee_id}
                      />
                    </Field>
                    <Field label="Localização">
                      <LocationSelect
                        locations={locations}
                        value={selectedLoc}
                        onChange={setSelectedLoc}
                        onAddNew={handleAddLocation}
                      />
                    </Field>
                    <Field label="Nota fiscal da compra (PDF, JPG, PNG)">
                      <input
                        type="file"
                        name="invoice_file"
                        accept=".pdf,.jpg,.jpeg,.png"
                        className="input"
                      />
                    </Field>
                    <Field label="Observações" span={2}>
                      <textarea
                        name="notes"
                        rows={4}
                        defaultValue={asset?.notes ?? ""}
                        className="input"
                      />
                    </Field>
                  </>
                )}

                {/* 3. Kit Teclado e Mouse Form */}
                {isKit && (
                  <>
                    <Field label="Número de série do teclado" required>
                      <input
                        name="tech_numero_serie_teclado"
                        required
                        defaultValue={tech.numero_serie_teclado ?? ""}
                        className="input"
                      />
                    </Field>
                    <Field label="Número de série do mouse" required>
                      <input
                        name="tech_numero_serie_mouse"
                        required
                        defaultValue={tech.numero_serie_mouse ?? ""}
                        className="input"
                      />
                    </Field>
                    <Field label="Marca" required>
                      <input
                        name="brand"
                        required
                        defaultValue={asset?.brand ?? ""}
                        className="input"
                      />
                    </Field>
                    <Field label="Modelo" required>
                      <input
                        name="model"
                        required
                        defaultValue={asset?.model ?? ""}
                        className="input"
                      />
                    </Field>
                    <Field label="Patrimônio (caso exista)">
                      <input
                        name="asset_tag"
                        defaultValue={asset?.asset_tag ?? ""}
                        className="input"
                      />
                    </Field>
                    <Field label="Condição do equipamento" required>
                      <ConditionSelect defaultValue={asset?.physical_condition} />
                    </Field>
                    <Field label="Usuário responsável">
                      <EmployeeSelect
                        employees={options.employees}
                        defaultValue={asset?.current_employee_id}
                      />
                    </Field>
                    <Field label="Localização">
                      <LocationSelect
                        locations={locations}
                        value={selectedLoc}
                        onChange={setSelectedLoc}
                        onAddNew={handleAddLocation}
                      />
                    </Field>
                    <Field label="Nota fiscal da compra (PDF, JPG, PNG)">
                      <input
                        type="file"
                        name="invoice_file"
                        accept=".pdf,.jpg,.jpeg,.png"
                        className="input"
                      />
                    </Field>
                    <Field label="Observações" span={2}>
                      <textarea
                        name="notes"
                        rows={4}
                        defaultValue={asset?.notes ?? ""}
                        className="input"
                      />
                    </Field>
                  </>
                )}

                {/* 4. Headset Form */}
                {isHeadset && (
                  <>
                    <Field label="Número de série do headset" required>
                      <input
                        name="tech_numero_serie_headset"
                        required
                        defaultValue={tech.numero_serie_headset ?? ""}
                        className="input"
                      />
                    </Field>
                    <Field label="Marca" required>
                      <input
                        name="brand"
                        required
                        defaultValue={asset?.brand ?? ""}
                        className="input"
                      />
                    </Field>
                    <Field label="Modelo" required>
                      <input
                        name="model"
                        required
                        defaultValue={asset?.model ?? ""}
                        className="input"
                      />
                    </Field>
                    <Field label="Patrimônio (caso exista)">
                      <input
                        name="asset_tag"
                        defaultValue={asset?.asset_tag ?? ""}
                        className="input"
                      />
                    </Field>
                    <Field label="Condição do equipamento" required>
                      <ConditionSelect defaultValue={asset?.physical_condition} />
                    </Field>
                    <Field label="Usuário responsável">
                      <EmployeeSelect
                        employees={options.employees}
                        defaultValue={asset?.current_employee_id}
                      />
                    </Field>
                    <Field label="Localização">
                      <LocationSelect
                        locations={locations}
                        value={selectedLoc}
                        onChange={setSelectedLoc}
                        onAddNew={handleAddLocation}
                      />
                    </Field>
                    <Field label="Nota fiscal da compra (PDF, JPG, PNG)">
                      <input
                        type="file"
                        name="invoice_file"
                        accept=".pdf,.jpg,.jpeg,.png"
                        className="input"
                      />
                    </Field>
                    <Field label="Observações" span={2}>
                      <textarea
                        name="notes"
                        rows={4}
                        defaultValue={asset?.notes ?? ""}
                        className="input"
                      />
                    </Field>
                  </>
                )}

                {/* 5. Fallback Form for any other category */}
                {!isNotebook && !isMonitor && !isKit && !isHeadset && (
                  <>
                    <Field label="Nome do ativo" required span={2}>
                      <input
                        name="name"
                        required
                        defaultValue={asset?.name ?? ""}
                        className="input"
                      />
                    </Field>
                    <Field label="Número de série">
                      <input
                        name="serial_number"
                        defaultValue={asset?.serial_number ?? ""}
                        className="input"
                      />
                    </Field>
                    <Field label="Patrimônio">
                      <input
                        name="asset_tag"
                        defaultValue={asset?.asset_tag ?? ""}
                        className="input"
                      />
                    </Field>
                    <Field label="Marca">
                      <input
                        name="brand"
                        defaultValue={asset?.brand ?? ""}
                        className="input"
                      />
                    </Field>
                    <Field label="Modelo">
                      <input
                        name="model"
                        defaultValue={asset?.model ?? ""}
                        className="input"
                      />
                    </Field>
                    <Field label="Condição do equipamento" required>
                      <ConditionSelect defaultValue={asset?.physical_condition} />
                    </Field>
                    <Field label="Usuário responsável">
                      <EmployeeSelect
                        employees={options.employees}
                        defaultValue={asset?.current_employee_id}
                      />
                    </Field>
                    <Field label="Localização">
                      <LocationSelect
                        locations={locations}
                        value={selectedLoc}
                        onChange={setSelectedLoc}
                        onAddNew={handleAddLocation}
                      />
                    </Field>
                    <Field label="Nota fiscal da compra (PDF, JPG, PNG)">
                      <input
                        type="file"
                        name="invoice_file"
                        accept=".pdf,.jpg,.jpeg,.png"
                        className="input"
                      />
                    </Field>
                    <Field label="Observações" span={2}>
                      <textarea
                        name="notes"
                        rows={4}
                        defaultValue={asset?.notes ?? ""}
                        className="input"
                      />
                    </Field>
                  </>
                )}
              </Grid>
            </div>
          )}

          {/* ABA 2: Dados técnicos (Apenas para notebook) */}
          {step === 1 && isNotebook && (
            <div className="card p-6">
              <Grid>
                <Field label="Processador">
                  <input
                    name="tech_processador"
                    defaultValue={tech.processador ?? ""}
                    className="input"
                  />
                </Field>
                <Field label="Sistema operacional">
                  <input
                    name="tech_sistema_operacional"
                    defaultValue={tech.sistema_operacional ?? ""}
                    className="input"
                  />
                </Field>
                <Field label="Endereço MAC">
                  <input
                    name="tech_endereco_mac"
                    defaultValue={tech.endereco_mac ?? ""}
                    className="input"
                  />
                </Field>
                <Field label="Endereço IP">
                  <input
                    name="tech_endereco_ip"
                    defaultValue={tech.endereco_ip ?? ""}
                    className="input"
                  />
                </Field>
                <Field label="Chave de licença do Windows">
                  <input
                    name="tech_chave_licenca_windows"
                    defaultValue={tech.chave_licenca_windows ?? ""}
                    className="input"
                  />
                </Field>
              </Grid>
            </div>
          )}

          {asset && (
            <div className="card p-4 border border-dashed border-slate-200 dark:border-slate-800 space-y-3">
              <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                Registrar Uso/Colaborador Anterior (Histórico)
              </h4>
              <p className="text-xs text-slate-400">
                Selecione um colaborador que já usou este equipamento no passado para registrar no histórico de movimentações.
              </p>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <Field label="Colaborador">
                  <select name="previous_employee_id" className="input">
                    <option value="">— selecione o colaborador —</option>
                    {options.employees.map((e) => (
                      <option key={e.value} value={e.value}>
                        {e.label}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Data de Uso (Opcional)">
                  <input type="date" name="previous_date" className="input" />
                </Field>
                <Field label="Motivo/Observação (Opcional)">
                  <input type="text" name="previous_reason" placeholder="Ex: Devolução antiga" className="input" />
                </Field>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2">
            <button
              type="submit"
              disabled={pending}
              className="btn-primary px-6 py-2.5 font-bold"
            >
              {pending ? "Salvando..." : "Salvar Ativo"}
            </button>
          </div>
        </>
      )}
    </form>
  );
}

function Grid({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">{children}</div>;
}

function Field({
  label,
  required,
  span,
  children,
}: {
  label: string;
  required?: boolean;
  span?: number;
  children: React.ReactNode;
}) {
  return (
    <div className={span ? `sm:col-span-${span}` : ""}>
      <label className="label">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {children}
    </div>
  );
}

function ConditionSelect({ defaultValue }: { defaultValue?: string | null }) {
  return (
    <select name="physical_condition" required defaultValue={defaultValue ?? "Boa"} className="input">
      <option value="Boa">Boa</option>
      <option value="Média">Média</option>
      <option value="Ruim">Ruim</option>
    </select>
  );
}

function EmployeeSelect({
  employees,
  defaultValue,
}: {
  employees: FieldOption[];
  defaultValue?: string | null;
}) {
  return (
    <select name="current_employee_id" defaultValue={defaultValue ?? ""} className="input">
      <option value="">— Sem responsável —</option>
      {employees.map((e) => (
        <option key={e.value} value={e.value}>
          {e.label}
        </option>
      ))}
    </select>
  );
}

function LocationSelect({
  locations,
  value,
  onChange,
  onAddNew,
}: {
  locations: FieldOption[];
  value: string;
  onChange: (v: string) => void;
  onAddNew: () => void;
}) {
  return (
    <div className="flex gap-2">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="input flex-1"
      >
        <option value="">— selecione —</option>
        {locations.map((l) => (
          <option key={l.value} value={l.value}>
            {l.label}
          </option>
        ))}
      </select>
      <button
        type="button"
        onClick={onAddNew}
        className="btn-secondary px-3 py-2 font-bold text-lg"
        title="Cadastrar nova localização"
      >
        +
      </button>
    </div>
  );
}
