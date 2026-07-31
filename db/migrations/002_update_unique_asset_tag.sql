-- Drop the unique index for asset_tag completely to allow duplicate asset tags in the tenant
drop index if exists uq_assets_tag;
