create table if not exists public.admin_role_permissions (
  role text not null
    check (role in ('superadmin', 'admin', 'facilitator', 'viewer')),
  permission text not null
    check (
      permission in (
        'portal.view',
        'simulation.run',
        'datasets.reuse',
        'datasets.edit',
        'settings.edit',
        'users.manage',
        'audit.view'
      )
    ),
  updated_by_admin_user_id bigint
    references public.admin_users (id) on delete set null,
  updated_at timestamptz not null default now(),
  primary key (role, permission)
);

alter table public.admin_role_permissions enable row level security;

revoke all on table public.admin_role_permissions from anon, authenticated;
grant all on table public.admin_role_permissions to service_role;

insert into public.admin_role_permissions (role, permission)
values
  ('superadmin', 'portal.view'),
  ('superadmin', 'simulation.run'),
  ('superadmin', 'datasets.reuse'),
  ('superadmin', 'datasets.edit'),
  ('superadmin', 'settings.edit'),
  ('superadmin', 'users.manage'),
  ('superadmin', 'audit.view'),
  ('admin', 'portal.view'),
  ('admin', 'simulation.run'),
  ('admin', 'datasets.reuse'),
  ('admin', 'datasets.edit'),
  ('admin', 'settings.edit'),
  ('facilitator', 'portal.view'),
  ('facilitator', 'simulation.run'),
  ('facilitator', 'datasets.reuse'),
  ('viewer', 'portal.view')
on conflict (role, permission) do nothing;

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

revoke all on function public.replace_admin_role_permissions(text, text[], bigint)
  from public, anon, authenticated;
grant execute on function public.replace_admin_role_permissions(text, text[], bigint)
  to service_role;

comment on table public.admin_role_permissions is
  'Editable role-to-permission assignments for the NaviWealth admin portal.';

comment on function public.replace_admin_role_permissions(text, text[], bigint) is
  'Atomically replaces one admin role permission set through the server-only gateway.';
