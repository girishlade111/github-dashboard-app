-- 001: track GitHub Pages enablement on repos (used by the sync engine's
-- pages phase to only query repos that report Pages enabled).
alter table repos add column if not exists has_pages boolean default false;
