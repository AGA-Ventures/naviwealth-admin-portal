create or replace function public.delete_event_record_row(
  p_record_id bigint
)
returns integer
language plpgsql
security invoker
set search_path = ''
as $$
declare
  target_dataset_id integer;
  target_row_number integer;
  dataset_kind text;
  row_to_shift record;
begin
  select dataset_id
  into target_dataset_id
  from public.event_records
  where id = p_record_id;

  if not found then
    raise exception 'Event record not found.' using errcode = 'P0002';
  end if;

  select kind
  into dataset_kind
  from public.datasets
  where id = target_dataset_id
  for update;

  if not found then
    raise exception 'Event dataset not found.' using errcode = 'P0002';
  end if;

  if dataset_kind <> 'event' then
    raise exception 'This package is not an event dataset.' using errcode = '22023';
  end if;

  select row_number
  into target_row_number
  from public.event_records
  where id = p_record_id
    and dataset_id = target_dataset_id
  for update;

  if not found then
    raise exception 'Event record not found.' using errcode = 'P0002';
  end if;

  delete from public.event_records
  where id = p_record_id
    and dataset_id = target_dataset_id;

  for row_to_shift in
    select id, row_number
    from public.event_records
    where dataset_id = target_dataset_id
      and row_number > target_row_number
    order by row_number asc
  loop
    update public.event_records
    set row_number = row_to_shift.row_number - 1
    where id = row_to_shift.id;
  end loop;

  update public.datasets
  set
    member_ids = coalesce(
      (
        select array_agg(event_record.id::integer order by event_record.row_number)
        from public.event_records as event_record
        where event_record.dataset_id = target_dataset_id
      ),
      '{}'::integer[]
    ),
    updated_at = timezone('utc', now())
  where id = target_dataset_id;

  return target_dataset_id;
end;
$$;

grant delete on table public.event_records to service_role;
revoke all on function public.delete_event_record_row(bigint)
  from public, anon, authenticated;
grant execute on function public.delete_event_record_row(bigint)
  to service_role;
