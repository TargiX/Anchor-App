create table if not exists public.anchor_user_states (
  user_id uuid primary key references auth.users(id) on delete cascade,
  state jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.anchor_user_states enable row level security;

create policy "Users can read their own Anchor state"
  on public.anchor_user_states
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can insert their own Anchor state"
  on public.anchor_user_states
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Users can update their own Anchor state"
  on public.anchor_user_states
  for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Users can delete their own Anchor state"
  on public.anchor_user_states
  for delete
  to authenticated
  using ((select auth.uid()) = user_id);

create or replace function public.set_anchor_user_states_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_anchor_user_states_updated_at
  on public.anchor_user_states;

create trigger set_anchor_user_states_updated_at
  before update on public.anchor_user_states
  for each row
  execute function public.set_anchor_user_states_updated_at();
