create or replace function public.create_event_record_row(
  p_dataset_id integer,
  p_insert_after_row_number integer,
  p_source_file text,
  p_data jsonb
)
returns bigint
language plpgsql
security invoker
set search_path = ''
as $$
declare
  created_record_id bigint;
  dataset_kind text;
  highest_row_number integer;
  row_to_shift record;
begin
  select kind
  into dataset_kind
  from public.datasets
  where id = p_dataset_id
  for update;

  if not found then
    raise exception 'Event dataset not found.' using errcode = 'P0002';
  end if;

  if dataset_kind <> 'event' then
    raise exception 'This package is not an event dataset.' using errcode = '22023';
  end if;

  if p_insert_after_row_number < 1 or p_insert_after_row_number >= 500 then
    raise exception 'The event row insertion point is invalid.' using errcode = '22023';
  end if;

  if jsonb_typeof(p_data) <> 'object' then
    raise exception 'Event details must be a field-value object.' using errcode = '22023';
  end if;

  perform 1
  from public.event_records
  where dataset_id = p_dataset_id
    and row_number = p_insert_after_row_number;

  if not found then
    raise exception 'The selected Age Set row was not found.' using errcode = 'P0002';
  end if;

  select coalesce(max(row_number), 0)
  into highest_row_number
  from public.event_records
  where dataset_id = p_dataset_id;

  if highest_row_number >= 500 then
    raise exception 'This event dataset already contains the maximum 500 rows.' using errcode = '22023';
  end if;

  for row_to_shift in
    select id, row_number
    from public.event_records
    where dataset_id = p_dataset_id
      and row_number > p_insert_after_row_number
    order by row_number desc
  loop
    update public.event_records
    set row_number = row_to_shift.row_number + 1
    where id = row_to_shift.id;
  end loop;

  insert into public.event_records (
    dataset_id,
    row_number,
    source_file,
    data
  )
  values (
    p_dataset_id,
    p_insert_after_row_number + 1,
    left(coalesce(nullif(trim(p_source_file), ''), 'Admin added event'), 255),
    p_data
  )
  returning id into created_record_id;

  update public.datasets
  set
    member_ids = coalesce(
      (
        select array_agg(event_record.id::integer order by event_record.row_number)
        from public.event_records as event_record
        where event_record.dataset_id = p_dataset_id
      ),
      '{}'::integer[]
    ),
    updated_at = timezone('utc', now())
  where id = p_dataset_id;

  return created_record_id;
end;
$$;

revoke all on function public.create_event_record_row(integer, integer, text, jsonb)
  from public, anon, authenticated;
grant execute on function public.create_event_record_row(integer, integer, text, jsonb)
  to service_role;
