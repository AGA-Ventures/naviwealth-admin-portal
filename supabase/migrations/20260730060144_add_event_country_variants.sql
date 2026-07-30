alter table public.datasets
add column country_code text not null default 'MY',
add column currency_code text not null default 'MYR',
add column dataset_family_id uuid not null default gen_random_uuid(),
add column localization_state text not null default 'localized';

alter table public.datasets
add constraint datasets_country_code_check
check (country_code in ('MY', 'CN')),
add constraint datasets_currency_code_check
check (currency_code in ('MYR', 'CNY')),
add constraint datasets_country_currency_check
check (
  (country_code = 'MY' and currency_code = 'MYR')
  or
  (country_code = 'CN' and currency_code = 'CNY')
),
add constraint datasets_localization_state_check
check (localization_state in ('localized', 'needs_review'));

drop index if exists public.datasets_name_unique;

create unique index datasets_country_name_unique
on public.datasets (kind, country_code, lower(name));

create unique index datasets_family_country_unique
on public.datasets (dataset_family_id, country_code);

create index datasets_kind_country_updated_idx
on public.datasets (kind, country_code, updated_at desc);

create or replace function public.create_event_country_variant(
  source_dataset_id integer,
  target_country_code text
)
returns integer
language plpgsql
security invoker
set search_path = ''
as $$
declare
  source_dataset public.datasets%rowtype;
  target_dataset_id integer;
  target_currency_code text;
  has_imported_records boolean;
begin
  select *
  into source_dataset
  from public.datasets
  where id = source_dataset_id
  for share;

  if not found then
    raise exception 'Dataset not found.' using errcode = 'P0002';
  end if;

  if source_dataset.kind <> 'event' then
    raise exception 'Country variants are currently available only for event datasets.'
      using errcode = '22023';
  end if;

  if target_country_code not in ('MY', 'CN') then
    raise exception 'Unsupported country code.' using errcode = '22023';
  end if;

  if source_dataset.country_code = target_country_code then
    raise exception 'Choose a different country for this dataset variant.'
      using errcode = '22023';
  end if;

  if exists (
    select 1
    from public.datasets
    where dataset_family_id = source_dataset.dataset_family_id
      and country_code = target_country_code
  ) then
    raise exception 'This dataset family already has a variant for that country.'
      using errcode = '23505';
  end if;

  target_currency_code := case target_country_code
    when 'MY' then 'MYR'
    when 'CN' then 'CNY'
  end;

  select exists (
    select 1
    from public.event_records
    where dataset_id = source_dataset.id
  )
  into has_imported_records;

  insert into public.datasets (
    name,
    kind,
    description,
    status,
    member_ids,
    reuse_count,
    validation_state,
    country_code,
    currency_code,
    dataset_family_id,
    localization_state
  )
  values (
    source_dataset.name,
    'event',
    source_dataset.description,
    'draft',
    case
      when has_imported_records then '{}'::integer[]
      else source_dataset.member_ids
    end,
    0,
    'warning',
    target_country_code,
    target_currency_code,
    source_dataset.dataset_family_id,
    'needs_review'
  )
  returning id into target_dataset_id;

  if has_imported_records then
    insert into public.event_records (
      dataset_id,
      row_number,
      source_file,
      data
    )
    select
      target_dataset_id,
      row_number,
      source_file,
      data
    from public.event_records
    where dataset_id = source_dataset.id
    order by row_number;

    update public.datasets
    set member_ids = coalesce(
      (
        select array_agg(record.id::integer order by record.row_number)
        from public.event_records as record
        where record.dataset_id = target_dataset_id
      ),
      '{}'::integer[]
    )
    where id = target_dataset_id;
  end if;

  return target_dataset_id;
end;
$$;

revoke all on function public.create_event_country_variant(integer, text)
from public, anon, authenticated;
grant execute
on function public.create_event_country_variant(integer, text)
to service_role;

grant insert on table public.event_records to service_role;
grant usage, select on sequence public.event_records_id_seq to service_role;
