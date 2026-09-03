-- Daha önce telefon numaralı şemayı kurduysanız bu dosyayı
-- Supabase Dashboard > SQL Editor içinde bir kez çalıştırın.

alter table public.profiles
  add column if not exists email text;

-- Eski telefon alanı yeni hesapların oluşturulmasını engellemesin.
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'profiles'
      and column_name = 'phone'
  ) then
    alter table public.profiles alter column phone drop not null;
  end if;
end $$;

create unique index if not exists profiles_email_unique_idx
  on public.profiles (lower(email))
  where email is not null;

-- PostgREST/Supabase API şema önbelleğini hemen yenile.
notify pgrst, 'reload schema';

