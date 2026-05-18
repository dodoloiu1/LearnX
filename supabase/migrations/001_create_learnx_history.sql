create table if not exists public.lesson_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null default 'Lecție nouă',
  source_type text not null default 'text' check (source_type in ('text', 'file', 'media')),
  language text not null default 'ro' check (language in ('ro', 'en')),
  transcription text not null default '',
  material text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists lesson_history_user_created_idx
  on public.lesson_history (user_id, created_at desc);

alter table public.lesson_history enable row level security;

drop policy if exists "Users can read own lesson history" on public.lesson_history;
create policy "Users can read own lesson history"
  on public.lesson_history
  for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own lesson history" on public.lesson_history;
create policy "Users can insert own lesson history"
  on public.lesson_history
  for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update own lesson history" on public.lesson_history;
create policy "Users can update own lesson history"
  on public.lesson_history
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete own lesson history" on public.lesson_history;
create policy "Users can delete own lesson history"
  on public.lesson_history
  for delete
  using (auth.uid() = user_id);

create or replace function public.set_lesson_history_updated_at()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_lesson_history_updated_at on public.lesson_history;
create trigger set_lesson_history_updated_at
  before update on public.lesson_history
  for each row
  execute function public.set_lesson_history_updated_at();
