-- Supabase SQL Editor'da tek sefer çalıştırın.
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique not null,
  display_name text not null default 'Kullanıcı',
  status text not null default 'Uçtan uca şifreli',
  public_key text not null,
  created_at timestamptz not null default now()
);

-- Dosya eski telefon tabanlı kurulumun üzerine çalıştırılırsa şemayı güvenle güncelle.
alter table public.profiles add column if not exists email text;
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'profiles' and column_name = 'phone'
  ) then
    alter table public.profiles alter column phone drop not null;
  end if;
end $$;
create unique index if not exists profiles_email_unique_idx
  on public.profiles (lower(email)) where email is not null;

create table if not exists public.contacts (
  owner_id uuid not null references auth.users(id) on delete cascade,
  contact_id uuid not null references public.profiles(id) on delete cascade,
  verified boolean not null default false,
  created_at timestamptz not null default now(),
  primary key (owner_id, contact_id)
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
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.contacts enable row level security;
alter table public.messages enable row level security;

create policy "Authenticated users can find profiles" on public.profiles for select to authenticated using (true);
create policy "Users create own profile" on public.profiles for insert to authenticated with check (auth.uid() = id);
create policy "Users update own profile" on public.profiles for update to authenticated using (auth.uid() = id);
create policy "Users see own contacts" on public.contacts for select to authenticated using (auth.uid() = owner_id);
create policy "Users manage own contacts" on public.contacts for all to authenticated using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
create policy "Participants read messages" on public.messages for select to authenticated using (auth.uid() = sender_id or auth.uid() = recipient_id);
create policy "Sender creates messages" on public.messages for insert to authenticated with check (auth.uid() = sender_id);
create policy "Participants update status" on public.messages for update to authenticated using (auth.uid() = sender_id or auth.uid() = recipient_id);

create index if not exists messages_participants_idx on public.messages(sender_id, recipient_id, created_at);
alter publication supabase_realtime add table public.messages;
notify pgrst, 'reload schema';
