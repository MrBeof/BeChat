-- CipherChat tek parça Supabase kurulumu
-- Supabase Dashboard > SQL Editor içine yapıştırıp bir kez Run'a basın.

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique,
  display_name text not null default 'Kullanıcı',
  status text not null default 'Uçtan uca şifreli',
  public_key text not null,
  created_at timestamptz not null default now()
);

alter table public.profiles add column if not exists email text;
do $$
begin
  if exists (select 1 from information_schema.columns where table_schema='public' and table_name='profiles' and column_name='phone') then
    alter table public.profiles alter column phone drop not null;
  end if;
end $$;
create unique index if not exists profiles_email_unique_idx on public.profiles (lower(email)) where email is not null;

create table if not exists public.contacts (
  owner_id uuid not null references auth.users(id) on delete cascade,
  contact_id uuid not null references public.profiles(id) on delete cascade,
  verified boolean not null default false,
  created_at timestamptz not null default now(),
  primary key (owner_id, contact_id),
  check (owner_id <> contact_id)
);

create table if not exists public.blocked_users (
  owner_id uuid not null references auth.users(id) on delete cascade,
  blocked_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (owner_id, blocked_id),
  check (owner_id <> blocked_id)
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references auth.users(id) on delete cascade,
  recipient_id uuid not null references auth.users(id) on delete cascade,
  ciphertext text not null,
  iv text not null,
  digest text not null,
  status text not null default 'sent' check (status in ('sent','delivered','read')),
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  check (sender_id <> recipient_id)
);

create index if not exists messages_participants_idx on public.messages(sender_id,recipient_id,created_at);
create index if not exists messages_recipient_idx on public.messages(recipient_id,created_at desc);

alter table public.profiles enable row level security;
alter table public.contacts enable row level security;
alter table public.blocked_users enable row level security;
alter table public.messages enable row level security;
alter table public.messages replica identity full;

grant select,insert,update on public.profiles to authenticated;
grant select,insert,update,delete on public.contacts to authenticated;
grant select,insert,update,delete on public.blocked_users to authenticated;
grant select,insert,update on public.messages to authenticated;

drop policy if exists "Authenticated users can find profiles" on public.profiles;
drop policy if exists "Users create own profile" on public.profiles;
drop policy if exists "Users update own profile" on public.profiles;
drop policy if exists "Users see own contacts" on public.contacts;
drop policy if exists "Users manage own contacts" on public.contacts;
drop policy if exists "Users see own blocks" on public.blocked_users;
drop policy if exists "Users manage own blocks" on public.blocked_users;
drop policy if exists "Participants read messages" on public.messages;
drop policy if exists "Sender creates messages" on public.messages;
drop policy if exists "Participants update status" on public.messages;

create policy "Authenticated users can find profiles" on public.profiles for select to authenticated using (true);
create policy "Users create own profile" on public.profiles for insert to authenticated with check (auth.uid()=id);
create policy "Users update own profile" on public.profiles for update to authenticated using (auth.uid()=id) with check (auth.uid()=id);
create policy "Users see own contacts" on public.contacts for select to authenticated using (auth.uid()=owner_id);
create policy "Users manage own contacts" on public.contacts for all to authenticated using (auth.uid()=owner_id) with check (auth.uid()=owner_id);
create policy "Users see own blocks" on public.blocked_users for select to authenticated using (auth.uid()=owner_id);
create policy "Users manage own blocks" on public.blocked_users for all to authenticated using (auth.uid()=owner_id) with check (auth.uid()=owner_id);
create policy "Participants read messages" on public.messages for select to authenticated using (auth.uid()=sender_id or auth.uid()=recipient_id);

create or replace function public.is_message_blocked(target_id uuid, author_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists(select 1 from public.blocked_users where owner_id=target_id and blocked_id=author_id);
$$;
revoke all on function public.is_message_blocked(uuid,uuid) from public;
grant execute on function public.is_message_blocked(uuid,uuid) to authenticated;

create policy "Sender creates messages" on public.messages for insert to authenticated with check (
  auth.uid()=sender_id and not public.is_message_blocked(recipient_id,sender_id)
);
create policy "Participants update status" on public.messages for update to authenticated using (auth.uid()=sender_id or auth.uid()=recipient_id);

do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='messages') then
    alter publication supabase_realtime add table public.messages;
  end if;
end $$;

notify pgrst, 'reload schema';
