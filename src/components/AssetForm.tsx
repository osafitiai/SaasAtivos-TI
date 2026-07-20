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
  const [previousUsers, setPreviousUsers] = useState<{
    id: string;
    employeeId: string;
    date: string;
    reason: string;
  }[]>([]);

  const addPreviousUser = () => {
    setPreviousUsers((prev) => [
      ...prev,
      { id: Math.random().toString(), employeeId: "", date: "", reason: "" },
    ]);
  };

  const removePreviousUser = (id: string) => {
    setPreviousUsers((prev) => prev.filter((item) => item.id !== id));
  };

  const updatePreviousUser = (
    id: string,
    field: "employeeId" | "date" | "reason",
    value: string
  ) => {
    setPreviousUsers((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: value } : item))
    );
  };

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

  const steps: string[] = ["Identificação"];
  if (isNotebook) steps.push("Dados técnicos");
  steps.push("Aquisição");

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
    setPreviousUsers([]);
    router.push(res.id ? `/ativos/${res.id}` : "/ativos");
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
          {steps.length > 1 && (
            <div className="flex gap-2 border-b border-slate-200 pb-2 dark:border-slate-800">
              {steps.map((t, idx) => (
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
          <div style={{ display: steps[step] === "Identificação" ? "block" : "none" }}>
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
                    <Field label="Patrimônio">
                      <input
                        name="asset_tag"
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
                    <Field label="Empresa">
                      <select name="company_id" defaultValue={asset?.company_id ?? ""} className="input">
                        <option value="">— selecione a empresa —</option>
                        {options.companies.map((c) => (
                          <option key={c.value} value={c.value}>
                            {c.label}
                          </option>
                        ))}
                      </select>
                    </Field>
                    <Field label="Filial">
                      <select name="branch_id" defaultValue={asset?.branch_id ?? ""} className="input">
                        <option value="">— selecione a filial —</option>
                        {options.branches.map((b) => (
                          <option key={b.value} value={b.value}>
                            {b.label}
                          </option>
                        ))}
                      </select>
                    </Field>
                    <Field label="Departamento">
                      <select name="department_id" defaultValue={asset?.department_id ?? ""} className="input">
                        <option value="">— selecione o departamento —</option>
                        {options.departments.map((d) => (
                          <option key={d.value} value={d.value}>
                            {d.label}
                          </option>
                        ))}
                      </select>
                    </Field>

                  </>
                )}

                {/* 2. Monitor Form */}
                {isMonitor && (
                  <>
                    <Field label="Patrimônio">
                      <input
                        name="asset_tag"
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
                    <Field label="Empresa">
                      <select name="company_id" defaultValue={asset?.company_id ?? ""} className="input">
                        <option value="">— selecione a empresa —</option>
                        {options.companies.map((c) => (
                          <option key={c.value} value={c.value}>
                            {c.label}
                          </option>
                        ))}
                      </select>
                    </Field>
                    <Field label="Filial">
                      <select name="branch_id" defaultValue={asset?.branch_id ?? ""} className="input">
                        <option value="">— selecione a filial —</option>
                        {options.branches.map((b) => (
                          <option key={b.value} value={b.value}>
                            {b.label}
                          </option>
                        ))}
                      </select>
                    </Field>
                    <Field label="Departamento">
                      <select name="department_id" defaultValue={asset?.department_id ?? ""} className="input">
                        <option value="">— selecione o departamento —</option>
                        {options.departments.map((d) => (
                          <option key={d.value} value={d.value}>
                            {d.label}
                          </option>
                        ))}
                      </select>
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
                    <Field label="Empresa">
                      <select name="company_id" defaultValue={asset?.company_id ?? ""} className="input">
                        <option value="">— selecione a empresa —</option>
                        {options.companies.map((c) => (
                          <option key={c.value} value={c.value}>
                            {c.label}
                          </option>
                        ))}
                      </select>
                    </Field>
                    <Field label="Filial">
                      <select name="branch_id" defaultValue={asset?.branch_id ?? ""} className="input">
                        <option value="">— selecione a filial —</option>
                        {options.branches.map((b) => (
                          <option key={b.value} value={b.value}>
                            {b.label}
                          </option>
                        ))}
                      </select>
                    </Field>
                    <Field label="Departamento">
                      <select name="department_id" defaultValue={asset?.department_id ?? ""} className="input">
                        <option value="">— selecione o departamento —</option>
                        {options.departments.map((d) => (
                          <option key={d.value} value={d.value}>
                            {d.label}
                          </option>
                        ))}
                      </select>
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
                    <Field label="Empresa">
                      <select name="company_id" defaultValue={asset?.company_id ?? ""} className="input">
                        <option value="">— selecione a empresa —</option>
                        {options.companies.map((c) => (
                          <option key={c.value} value={c.value}>
                            {c.label}
                          </option>
                        ))}
                      </select>
                    </Field>
                    <Field label="Filial">
                      <select name="branch_id" defaultValue={asset?.branch_id ?? ""} className="input">
                        <option value="">— selecione a filial —</option>
                        {options.branches.map((b) => (
                          <option key={b.value} value={b.value}>
                            {b.label}
                          </option>
                        ))}
                      </select>
                    </Field>
                    <Field label="Departamento">
                      <select name="department_id" defaultValue={asset?.department_id ?? ""} className="input">
                        <option value="">— selecione o departamento —</option>
                        {options.departments.map((d) => (
                          <option key={d.value} value={d.value}>
                            {d.label}
                          </option>
                        ))}
                      </select>
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
                    <Field label="Empresa">
                      <select name="company_id" defaultValue={asset?.company_id ?? ""} className="input">
                        <option value="">— selecione a empresa —</option>
                        {options.companies.map((c) => (
                          <option key={c.value} value={c.value}>
                            {c.label}
                          </option>
                        ))}
                      </select>
                    </Field>
                    <Field label="Filial">
                      <select name="branch_id" defaultValue={asset?.branch_id ?? ""} className="input">
                        <option value="">— selecione a filial —</option>
                        {options.branches.map((b) => (
                          <option key={b.value} value={b.value}>
                            {b.label}
                          </option>
                        ))}
                      </select>
                    </Field>
                    <Field label="Departamento">
                      <select name="department_id" defaultValue={asset?.department_id ?? ""} className="input">
                        <option value="">— selecione o departamento —</option>
                        {options.departments.map((d) => (
                          <option key={d.value} value={d.value}>
                            {d.label}
                          </option>
                        ))}
                      </select>
                    </Field>

                  </>
                )}
              </Grid>
            </div>
          </div>

          {/* ABA 2: Dados técnicos (Apenas para notebook) */}
          {isNotebook && (
            <div style={{ display: steps[step] === "Dados técnicos" ? "block" : "none" }}>
              <div className="card p-6">
                <Grid>
                <Field label="Processador">
                  <input
                    name="tech_processador"
                    defaultValue={tech.processador ?? ""}
                    className="input"
                  />
                </Field>
                <Field label="Hostname">
                  <input
                    name="tech_hostname"
                    defaultValue={tech.hostname ?? ""}
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
          </div>
          )}

          <div style={{ display: steps[step] === "Aquisição" ? "block" : "none" }}>
            <div className="card p-6">
              <Grid>
                <Field label="Fornecedor">
                  <select name="supplier_id" defaultValue={asset?.supplier_id ?? ""} className="input">
                    <option value="">— selecione o fornecedor —</option>
                    {options.suppliers.map((s) => (
                      <option key={s.value} value={s.value}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Nº da nota fiscal">
                  <input
                    type="text"
                    name="invoice_number"
                    defaultValue={asset?.invoice_number ?? ""}
                    className="input"
                  />
                </Field>
                <Field label="Chave da NF-e">
                  <input
                    type="text"
                    name="invoice_key"
                    defaultValue={asset?.invoice_key ?? ""}
                    className="input"
                  />
                </Field>
                <Field label="Data da nota fiscal">
                  <input
                    type="date"
                    name="invoice_date"
                    defaultValue={asset?.invoice_date ? String(asset.invoice_date).slice(0, 10) : ""}
                    className="input"
                  />
                </Field>
                <Field label="OC da compra / Pedido de compra">
                  <input
                    type="text"
                    name="purchase_order"
                    defaultValue={asset?.purchase_order ?? ""}
                    className="input"
                  />
                </Field>
                <Field label="Data de aquisição / compra">
                  <input
                    type="date"
                    name="acquisition_date"
                    defaultValue={asset?.acquisition_date ? String(asset.acquisition_date).slice(0, 10) : ""}
                    className="input"
                  />
                </Field>
                <Field label="Valor de aquisição / produto (BRL)">
                  <input
                    type="number"
                    step="0.01"
                    name="acquisition_value"
                    defaultValue={asset?.acquisition_value ?? ""}
                    className="input"
                  />
                </Field>
                <Field label="Anexar arquivo da Nota Fiscal (PDF, JPG, PNG)">
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
              </Grid>
            </div>
          </div>

          {asset && (
            <div className="card p-4 border border-dashed border-slate-200 dark:border-slate-800 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                    Registrar Uso/Colaborador Anterior (Histórico)
                  </h4>
                  <p className="text-xs text-slate-400">
                    Selecione um ou mais colaboradores que já usaram este equipamento no passado.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={addPreviousUser}
                  className="bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 px-3 py-1.5 text-xs font-semibold rounded-lg flex items-center gap-1 border border-slate-200 dark:border-slate-700 transition-colors"
                >
                  ➕ Adicionar
                </button>
              </div>

              {previousUsers.length === 0 ? (
                <p className="text-xs text-slate-500 italic py-2">
                  Nenhum colaborador anterior adicionado para registro nesta alteração. Clique em "Adicionar" para registrar uso anterior.
                </p>
              ) : (
                <div className="space-y-4">
                  {previousUsers.map((item) => (
                    <div key={item.id} className="grid grid-cols-1 gap-3 sm:grid-cols-12 items-end border border-slate-100 dark:border-slate-800 p-3 rounded-lg bg-slate-50/50 dark:bg-slate-900/50 relative">
                      <div className="sm:col-span-4">
                        <Field label="Colaborador">
                          <select
                            name="previous_employee_id"
                            value={item.employeeId}
                            onChange={(e) => updatePreviousUser(item.id, "employeeId", e.target.value)}
                            className="input"
                            required
                          >
                            <option value="">— selecione o colaborador —</option>
                            {options.employees.map((e) => (
                              <option key={e.value} value={e.value}>
                                {e.label}
                              </option>
                            ))}
                          </select>
                        </Field>
                      </div>
                      <div className="sm:col-span-3">
                        <Field label="Data de Uso (Opcional)">
                          <input
                            type="date"
                            name="previous_date"
                            value={item.date}
                            onChange={(e) => updatePreviousUser(item.id, "date", e.target.value)}
                            className="input"
                          />
                        </Field>
                      </div>
                      <div className="sm:col-span-4">
                        <Field label="Motivo/Observação (Opcional)">
                          <input
                            type="text"
                            name="previous_reason"
                            placeholder="Ex: Devolução antiga"
                            value={item.reason}
                            onChange={(e) => updatePreviousUser(item.id, "reason", e.target.value)}
                            className="input"
                          />
                        </Field>
                      </div>
                      <div className="sm:col-span-1 flex justify-end">
                        <button
                          type="button"
                          onClick={() => removePreviousUser(item.id)}
                          className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-md transition-colors"
                          title="Remover"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
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
