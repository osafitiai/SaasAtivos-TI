-- Drop the old unique index
drop index if exists uq_assets_tag;

-- Create the new unique index that includes company_id, permitting duplicate asset tags for different companies
create unique index uq_assets_tag on assets (tenant_id, company_id, asset_tag);
