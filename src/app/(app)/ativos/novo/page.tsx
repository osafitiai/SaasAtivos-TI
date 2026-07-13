import Link from "next/link";
import { requireSession } from "@/lib/auth";
import { loadAssetFormOptions } from "@/lib/assetOptions";
import { PageHeader } from "@/components/PageHeader";
import { AssetForm } from "@/components/AssetForm";

export const dynamic = "force-dynamic";

export default async function NovoAtivoPage() {
  const user = await requireSession();
  const options = await loadAssetFormOptions(user.tenant_id);

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        title="Novo ativo"
        subtitle="Cadastro em etapas"
        actions={<Link href="/ativos" className="btn-secondary">← Voltar</Link>}
      />
      <div className="card p-6">
        <AssetForm options={options} />
      </div>
    </div>
  );
}
