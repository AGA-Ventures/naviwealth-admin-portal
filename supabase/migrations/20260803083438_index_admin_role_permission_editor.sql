create index if not exists admin_role_permissions_updated_by_idx
  on public.admin_role_permissions (updated_by_admin_user_id)
  where updated_by_admin_user_id is not null;
