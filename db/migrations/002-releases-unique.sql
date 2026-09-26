-- 002: enforce one row per (repo_id, tag_name) in repo_releases.
-- The sync engine upserts releases on this key; without a matching unique
-- constraint, ON CONFLICT never fires and every re-sync inserts duplicates.
-- First deduplicate (keep newest row = max id per key), then add the
-- constraint. Safe to re-run: the delete is a no-op without dupes, and the
-- constraint add is guarded by a pg_constraint check.
delete from repo_releases a using repo_releases b
where a.id < b.id
  and a.repo_id = b.repo_id
  and a.tag_name = b.tag_name;

DO $$ begin
  if not exists (select 1 from pg_constraint where conname = 'repo_releases_repo_tag_unique') then
    alter table repo_releases add constraint repo_releases_repo_tag_unique unique (repo_id, tag_name);
  end if;
end $$;
