do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'anchor_user_states'
  ) then
    alter publication supabase_realtime
      add table public.anchor_user_states;
  end if;
end;
$$;
