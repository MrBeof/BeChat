-- Tilki 0.3: Run this entire file in Supabase SQL Editor.
-- Tilki 0.3: normal Supabase accounts and message content.
-- Also migrates existing BeChat installations without deleting historical rows.
begin;
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique,
  display_name text not null default 'Filmsever',
  status text not null default 'Bir sonraki favorimin peşindeyim.',
  created_at timestamptz not null default now()
);
alter table public.profiles add column if not exists email text;
alter table public.profiles alter column status set default 'Bir sonraki favorimin peşindeyim.';
do $$
begin
  if exists(select 1 from information_schema.columns where table_schema='public' and table_name='profiles' and column_name='public_key') then
    alter table public.profiles alter column public_key drop not null;
  end if;
  if exists(select 1 from information_schema.columns where table_schema='public' and table_name='profiles' and column_name='phone') then
    alter table public.profiles alter column phone drop not null;
  end if;
end $$;
update public.profiles set status='Bir sonraki favorimin peşindeyim.'
where status in ('Uçtan uca şifreli','Güvenli bağlantı aktif','Güvenlik numarası doğrulandı');
create unique index if not exists profiles_email_unique_idx on public.profiles(lower(email)) where email is not null;

create or replace function public.tilki_create_profile()
returns trigger language plpgsql security definer set search_path=public as $$
declare chosen_name text;
begin
  chosen_name := left(trim(coalesce(new.raw_user_meta_data->>'display_name','')),50);
  if length(chosen_name)<2 then chosen_name := 'Filmsever'; end if;
  insert into public.profiles(id,email,display_name) values(new.id,lower(new.email),chosen_name)
    on conflict(id) do update set email=excluded.email;
  return new;
end $$;
revoke all on function public.tilki_create_profile() from public;
drop trigger if exists tilki_create_profile on auth.users;
create trigger tilki_create_profile after insert or update of email on auth.users
for each row execute function public.tilki_create_profile();
insert into public.profiles(id,email,display_name)
select id,lower(email),case when length(trim(coalesce(raw_user_meta_data->>'display_name','')))>=2
  then left(trim(raw_user_meta_data->>'display_name'),50) else 'Filmsever' end
from auth.users on conflict(id) do nothing;

create table if not exists public.contacts (
  owner_id uuid not null references auth.users(id) on delete cascade,
  contact_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key(owner_id,contact_id),check(owner_id<>contact_id)
);
create table if not exists public.blocked_users (
  owner_id uuid not null references auth.users(id) on delete cascade,
  blocked_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key(owner_id,blocked_id),check(owner_id<>blocked_id)
);
create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references auth.users(id) on delete cascade,
  recipient_id uuid not null references auth.users(id) on delete cascade,
  content jsonb,
  status text not null default 'sent' check(status in ('sent','delivered','read')),
  created_at timestamptz not null default now(),check(sender_id<>recipient_id)
);
alter table public.messages add column if not exists content jsonb;
-- Legacy fields remain as an archive; new rows no longer require these fields.
do $$
declare legacy_column text;
begin
  foreach legacy_column in array array['ciphertext','iv','digest'] loop
    if exists(select 1 from information_schema.columns c where c.table_schema='public' and c.table_name='messages' and c.column_name=legacy_column) then
      execute format('alter table public.messages alter column %I drop not null',legacy_column);
    end if;
  end loop;
end $$;
create index if not exists messages_participants_idx on public.messages(sender_id,recipient_id,created_at);
create index if not exists messages_recipient_idx on public.messages(recipient_id,created_at desc);
create index if not exists messages_conversation_cursor_idx on public.messages(sender_id,recipient_id,created_at desc,id desc);

alter table public.profiles enable row level security;
alter table public.contacts enable row level security;
alter table public.blocked_users enable row level security;
alter table public.messages enable row level security;
alter table public.messages replica identity full;
revoke all on public.profiles,public.contacts,public.blocked_users,public.messages from anon;
revoke all on public.messages from authenticated;
grant select,insert,update on public.profiles to authenticated;
grant select,insert,update,delete on public.contacts,public.blocked_users to authenticated;
grant select,insert on public.messages to authenticated;
grant update(status) on public.messages to authenticated;

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
create policy "Authenticated users can find profiles" on public.profiles for select to authenticated using(true);
create policy "Users create own profile" on public.profiles for insert to authenticated with check(auth.uid()=id);
create policy "Users update own profile" on public.profiles for update to authenticated using(auth.uid()=id) with check(auth.uid()=id);
create policy "Users manage own contacts" on public.contacts for all to authenticated using(auth.uid()=owner_id) with check(auth.uid()=owner_id);
create policy "Users manage own blocks" on public.blocked_users for all to authenticated using(auth.uid()=owner_id) with check(auth.uid()=owner_id);
create policy "Participants read messages" on public.messages for select to authenticated using(auth.uid()=sender_id or auth.uid()=recipient_id);

create or replace function public.is_message_blocked(target_id uuid,author_id uuid)
returns boolean language sql stable security definer set search_path=public as $$
  select exists(select 1 from public.blocked_users where owner_id=target_id and blocked_id=author_id);
$$;
revoke all on function public.is_message_blocked(uuid,uuid) from public;
grant execute on function public.is_message_blocked(uuid,uuid) to authenticated;
create policy "Sender creates messages" on public.messages for insert to authenticated with check (
  auth.uid()=sender_id and status='sent'
  and not public.is_message_blocked(recipient_id,sender_id)
  and not public.is_message_blocked(sender_id,recipient_id)
);
create policy "Participants update status" on public.messages for update to authenticated
using(auth.uid()=recipient_id) with check(auth.uid()=recipient_id);

create or replace function public.validate_message_write()
returns trigger language plpgsql set search_path=public as $$
begin
  if TG_OP='INSERT' then
    if new.status<>'sent' then raise exception 'Invalid initial message status'; end if;
    if jsonb_typeof(new.content) is distinct from 'object' or octet_length(new.content::text)>900000 then
      raise exception 'Invalid message content';
    end if;
    case new.content->>'type'
      when 'text' then
        if jsonb_typeof(new.content->'text') is distinct from 'string'
          or length(trim(new.content->>'text'))<1 or length(new.content->>'text')>10000 then
          raise exception 'Message text must contain 1-10000 characters';
        end if;
      when 'movie' then
        if new.content->>'movieId' is null or new.content->>'movieId' not in (
          'interstellar','breaking-bad','the-dark-knight','dune-part-two','stranger-things',
          'inception','peaky-blinders','whiplash','the-grand-budapest-hotel','dark','la-la-land','the-bear'
        ) then raise exception 'Unknown movie'; end if;
      when 'image' then
        if jsonb_typeof(new.content->'data') is distinct from 'string'
          or length(new.content->>'data')>850000
          or new.content->>'data' !~ '^data:image/(jpeg|png|webp|gif);base64,[A-Za-z0-9+/]+=*$'
          or length(coalesce(new.content->>'name',''))>80 then
          raise exception 'Invalid image';
        end if;
      else raise exception 'Unsupported message type';
    end case;
    new.created_at:=now();
  else
    if (to_jsonb(new)-'status') is distinct from (to_jsonb(old)-'status') then
      raise exception 'Only delivery status may be changed';
    end if;
    if (old.status='read' and new.status<>'read') or (old.status='delivered' and new.status='sent') then
      raise exception 'Message status cannot move backwards';
    end if;
  end if;
  return new;
end $$;
drop trigger if exists validate_message_write on public.messages;
create trigger validate_message_write before insert or update on public.messages
for each row execute function public.validate_message_write();

do $$
begin
  if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='messages') then
    alter publication supabase_realtime add table public.messages;
  end if;
  if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='contacts') then
    alter publication supabase_realtime add table public.contacts;
  end if;
end $$;
notify pgrst,'reload schema';
commit;


-- Tilki alpha migration. Run AFTER supabase.sql. Safe to rerun; preserves data.
begin;

create table if not exists public.cinema_library (
  owner_id uuid not null references public.profiles(id) on delete cascade,
  movie_id text not null check (movie_id in (
    'interstellar','breaking-bad','the-dark-knight','dune-part-two',
    'stranger-things','inception','peaky-blinders','whiplash',
    'the-grand-budapest-hotel','dark','la-la-land','the-bear'
  )),
  status text not null default 'planned' check (status in ('planned','watching','watched')),
  favorite boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key (owner_id,movie_id)
);

create table if not exists public.cinema_friendships (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references public.profiles(id) on delete cascade,
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending','accepted')),
  created_at timestamptz not null default now(),
  check (requester_id <> recipient_id)
);
create unique index if not exists cinema_friendships_pair_idx
  on public.cinema_friendships (least(requester_id,recipient_id),greatest(requester_id,recipient_id));
create index if not exists cinema_friendships_recipient_idx on public.cinema_friendships(recipient_id,status);
create index if not exists cinema_friendships_requester_idx on public.cinema_friendships(requester_id,status);

alter table public.cinema_library enable row level security;
alter table public.cinema_friendships enable row level security;
revoke all on public.cinema_library,public.cinema_friendships from anon;
revoke all on public.cinema_library,public.cinema_friendships from authenticated;
grant select,delete on public.cinema_library,public.cinema_friendships to authenticated;
grant insert(owner_id,movie_id,status,favorite),update(status,favorite,owner_id,movie_id) on public.cinema_library to authenticated;
grant insert(requester_id,recipient_id),update(status) on public.cinema_friendships to authenticated;

drop policy if exists "Own cinema library" on public.cinema_library;
create policy "Own cinema library" on public.cinema_library for all to authenticated
  using (owner_id=auth.uid()) with check (owner_id=auth.uid());

drop policy if exists "See own friendships" on public.cinema_friendships;
create policy "See own friendships" on public.cinema_friendships for select to authenticated
  using (auth.uid()=requester_id or auth.uid()=recipient_id);
drop policy if exists "Request friendship" on public.cinema_friendships;
create policy "Request friendship" on public.cinema_friendships for insert to authenticated
  with check (auth.uid()=requester_id and status='pending'
    and not public.is_message_blocked(recipient_id,requester_id)
    and not public.is_message_blocked(requester_id,recipient_id));
drop policy if exists "Accept received friendship" on public.cinema_friendships;
create policy "Accept received friendship" on public.cinema_friendships for update to authenticated
  using (auth.uid()=recipient_id and status='pending')
  with check (auth.uid()=recipient_id and status='accepted');
drop policy if exists "Remove own friendship" on public.cinema_friendships;
create policy "Remove own friendship" on public.cinema_friendships for delete to authenticated
  using (auth.uid()=requester_id or auth.uid()=recipient_id);

create or replace function public.cinema_library_timestamp()
returns trigger language plpgsql set search_path=public as $$
begin
  new.updated_at := now();
  return new;
end $$;
drop trigger if exists cinema_library_timestamp on public.cinema_library;
create trigger cinema_library_timestamp before insert or update on public.cinema_library
for each row execute function public.cinema_library_timestamp();

-- Only the recipient can accept. Once accepted, both sides get a chat contact.
create or replace function public.cinema_accept_friendship()
returns trigger language plpgsql security definer set search_path=public as $$
begin
  if new.requester_id <> old.requester_id or new.recipient_id <> old.recipient_id
    or new.id <> old.id or new.created_at <> old.created_at then
    raise exception 'Friendship participants are immutable';
  end if;
  if old.status='pending' and new.status='accepted' then
    if public.is_message_blocked(new.recipient_id,new.requester_id)
      or public.is_message_blocked(new.requester_id,new.recipient_id) then
      raise exception 'Blocked users cannot become friends';
    end if;
    insert into public.contacts(owner_id,contact_id)
      values(new.requester_id,new.recipient_id),(new.recipient_id,new.requester_id)
      on conflict do nothing;
  else
    raise exception 'Invalid friendship transition';
  end if;
  return new;
end $$;
revoke all on function public.cinema_accept_friendship() from public;
drop trigger if exists cinema_accept_friendship on public.cinema_friendships;
create trigger cinema_accept_friendship before update on public.cinema_friendships
for each row execute function public.cinema_accept_friendship();

do $$
begin
  if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='cinema_library') then
    alter publication supabase_realtime add table public.cinema_library;
  end if;
  if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='cinema_friendships') then
    alter publication supabase_realtime add table public.cinema_friendships;
  end if;
end $$;
notify pgrst, 'reload schema';
commit;
