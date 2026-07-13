import Link from "next/link";
import { notFound } from "next/navigation";
import { requireSession } from "@/lib/auth";
import { queryOne } from "@/lib/db";
import { loadAssetFormOptions } from "@/lib/assetOptions";
import { PageHeader } from "@/components/PageHeader";
import { AssetForm } from "@/components/AssetForm";
import type { Asset } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function EditarAtivoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireSession();
  const asset = await queryOne<Asset>(
    "select * from assets where id = $1 and tenant_id = $2 and deleted_at is null",
    [id, user.tenant_id]
  );
  if (!asset) notFound();
  const options = await loadAssetFormOptions(user.tenant_id);

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        title={`Editar: ${asset.name}`}
        actions={<Link href={`/ativos/${id}`} className="btn-secondary">← Voltar</Link>}
      />
      <div className="card p-6">
        <AssetForm options={options} asset={asset} />
      </div>
    </div>
  );
}
