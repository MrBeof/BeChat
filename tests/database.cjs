const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {PGlite}=require('../.test-tools/package/dist/index.cjs');
const a='10000000-0000-0000-0000-000000000001',b='10000000-0000-0000-0000-000000000002',c='10000000-0000-0000-0000-000000000003';
async function scaffold(db){await db.exec(`create role anon;create role authenticated;create schema auth;create table auth.users(id uuid primary key,email text,raw_user_meta_data jsonb default '{}'::jsonb);create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;grant usage on schema public,auth to authenticated,anon;grant execute on function auth.uid() to authenticated,anon;create publication supabase_realtime;`);}
async function as(db,id){await db.exec('reset role');await db.query("select set_config('request.jwt.claim.sub',$1,false)",[id]);await db.exec('set role authenticated');}
async function install(db){await db.exec(fs.readFileSync('supabase.sql','utf8'));await db.exec(fs.readFileSync('cinema.sql','utf8'));}
test('fresh setup, idempotent migration, accounts, chat and social RLS',async()=>{
 const db=new PGlite();try{
  await scaffold(db);await install(db);await install(db);
  await db.query("insert into auth.users(id,email,raw_user_meta_data) values($1,'a@test.local','{\"display_name\":\"Aylin\"}'),($2,'b@test.local','{\"display_name\":\"Deniz\"}'),($3,'c@test.local','{}')",[a,b,c]);
  assert.equal((await db.query('select count(*)::int as n from profiles')).rows[0].n,3);
  await as(db,a);
  const msg=(await db.query('insert into messages(sender_id,recipient_id,content) values($1,$2,$3) returning id',[a,b,JSON.stringify({type:'text',text:'Merhaba'})])).rows[0].id;
  await assert.rejects(db.query('insert into messages(sender_id,recipient_id,content) values($1,$2,$3)',[b,a,JSON.stringify({type:'text',text:'forged'})]));
  await assert.rejects(db.query("update messages set status='read' where id=$1 returning id",[msg]).then(r=>{assert.equal(r.rows.length,1)}));
  await as(db,c);assert.equal((await db.query('select * from messages')).rows.length,0);
  await as(db,b);await db.query("update messages set status='read' where id=$1",[msg]);
  await assert.rejects(db.query('update messages set content=$1 where id=$2',[JSON.stringify({type:'text',text:'changed'}),msg]));
  await assert.rejects(db.query("update messages set status='sent' where id=$1",[msg]));
  await as(db,a);
  const friend=(await db.query('insert into cinema_friendships(requester_id,recipient_id) values($1,$2) returning id',[a,b])).rows[0].id;
  assert.equal((await db.query("update cinema_friendships set status='accepted' where id=$1 returning id",[friend])).rows.length,0);
  await as(db,b);await assert.rejects(db.query('insert into cinema_friendships(requester_id,recipient_id) values($1,$2)',[b,a]));
  await db.query("update cinema_friendships set status='accepted' where id=$1",[friend]);
  assert.equal((await db.query('select * from contacts')).rows.length,1);
  await as(db,a);assert.equal((await db.query('select * from contacts')).rows.length,1);
  await db.query("insert into cinema_library(owner_id,movie_id,status) values($1,'interstellar','watched')",[a]);
  await as(db,b);assert.equal((await db.query('select * from cinema_library')).rows.length,0);
  await db.query('insert into blocked_users(owner_id,blocked_id) values($1,$2)',[b,a]);
  await as(db,a);await assert.rejects(db.query('insert into messages(sender_id,recipient_id,content) values($1,$2,$3)',[a,b,JSON.stringify({type:'text',text:'blocked'})]));
  await db.exec('reset role;set role anon');await assert.rejects(db.query('select * from messages'));
 }finally{await db.close();}
});
test('legacy required keys migrate without removing old messages',async()=>{
 const db=new PGlite();try{
  await scaffold(db);
  await db.exec(`create table profiles(id uuid primary key references auth.users(id),email text unique,display_name text not null,status text not null default 'Uçtan uca şifreli',public_key text not null,created_at timestamptz default now());create table messages(id uuid primary key default gen_random_uuid(),sender_id uuid references auth.users(id),recipient_id uuid references auth.users(id),ciphertext text not null,iv text not null,digest text not null,status text not null default 'sent',created_at timestamptz not null default now());`);
  await db.query('insert into auth.users(id,email) values($1,$2),($3,$4)',[a,'a@test.local',b,'b@test.local']);
  await db.query("insert into profiles(id,email,display_name,public_key) values($1,'a@test.local','Old','old-key')",[a]);
  await db.query("insert into messages(sender_id,recipient_id,ciphertext,iv,digest) values($1,$2,'old-message','old-iv','old-digest')",[a,b]);
  await install(db);await install(db);assert.equal((await db.query('select ciphertext from messages')).rows[0].ciphertext,'old-message');
  await as(db,a);await db.query('insert into messages(sender_id,recipient_id,content) values($1,$2,$3)',[a,b,JSON.stringify({type:'movie',movieId:'interstellar'})]);
  assert.equal((await db.query('select count(*)::int n from messages')).rows[0].n,2);
 }finally{await db.close();}
});
