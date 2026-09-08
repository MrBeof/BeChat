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
