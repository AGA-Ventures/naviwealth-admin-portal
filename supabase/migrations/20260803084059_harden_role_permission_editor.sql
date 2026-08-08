create or replace function public.replace_admin_role_permissions(
  target_role text,
  target_permissions text[],
  actor_admin_user_id bigint
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if target_role not in ('superadmin', 'admin', 'facilitator', 'viewer') then
    raise exception 'Select a valid administrator role.';
  end if;

  if target_permissions is null or cardinality(target_permissions) = 0 then
    raise exception 'Select at least one permission.';
  end if;

  if not ('portal.view' = any(target_permissions)) then
    raise exception 'Portal access is required for every role.';
  end if;

  if target_role = 'superadmin' and not (
    'users.manage' = any(target_permissions)
    and 'audit.view' = any(target_permissions)
  ) then
    raise exception 'Superadmins must retain user management and audit access.';
  end if;

  if target_role <> 'superadmin' and (
    'users.manage' = any(target_permissions)
    or 'audit.view' = any(target_permissions)
  ) then
    raise exception 'User management and audit access are reserved for superadmins.';
  end if;

  if exists (
    select 1
    from unnest(target_permissions) as candidate(permission)
    where candidate.permission not in (
      'portal.view',
      'simulation.run',
      'datasets.reuse',
      'datasets.edit',
      'settings.edit',
      'users.manage',
      'audit.view'
    )
  ) then
    raise exception 'Select only supported permissions.';
  end if;

  delete from public.admin_role_permissions
  where role = target_role;

  insert into public.admin_role_permissions (
    role,
    permission,
    updated_by_admin_user_id,
    updated_at
  )
  select
    target_role,
    candidate.permission,
    actor_admin_user_id,
    now()
  from (
    select distinct permission
    from unnest(target_permissions) as values_to_save(permission)
  ) as candidate;
end;
$$;
