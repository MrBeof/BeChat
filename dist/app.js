(() => {
  'use strict';
  const $ = selector => document.querySelector(selector);
  const esc = (value = '') => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const initials = name => esc(String(name || '?').trim().split(/\s+/).slice(0,2).map(n=>n[0]).join('').toLocaleUpperCase('tr-TR'));
  const time = value => new Date(value).toLocaleTimeString('tr-TR',{hour:'2-digit',minute:'2-digit'});
  const newId = () => crypto.randomUUID();
  const fields = 'id,sender_id,recipient_id,content,status,created_at';
  const profileFields = 'id,display_name,status';
  const state = {client:null,session:null,profile:null,demo:false,contacts:[],blocked:[],messages:{},active:null,drafts:{},pending:{},sending:false,epoch:0,channel:null,mode:'login',recovery:false,authBusy:false,email:'',notice:'',error:'',connection:'Bağlanıyor',loading:{},older:{},readBusy:new Set()};
  const config = window.TILKI_CONFIG || window.CIPHERCHAT_CONFIG || {};
  if(config.supabaseUrl && config.supabaseAnonKey && window.supabase) {
    state.client=window.supabase.createClient(config.supabaseUrl,config.supabaseAnonKey,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
  }
  function toast(message) {const el=$('#toast');el.textContent=message;el.classList.add('show');clearTimeout(toast.timer);toast.timer=setTimeout(()=>el.classList.remove('show'),4000);}
  function messageError(error) {
    if(/42P01|42703|23502|PGRST20[045]/.test(error.code||''))return 'Veritabanı güncellemesi eksik. Kurulum dosyasını uyguladıktan sonra tekrar dene.';
    if(/invalid login credentials/i.test(error.message||''))return 'E-posta veya parola hatalı.';
    if(/email not confirmed/i.test(error.message||''))return 'Önce e-postandaki onay bağlantısını aç.';
    if(/already registered/i.test(error.message||''))return 'Bu e-posta zaten kayıtlı. Giriş yapmayı dene.';
    return error.message || 'İşlem tamamlanamadı. Tekrar dene.';
  }
  function preserveDraft() {const input=$('#messageInput');if(state.profile&&input?.dataset.contact&&input.dataset.owner===state.profile.id)state.drafts[input.dataset.contact]=input.value;}
  function render() {
    preserveDraft();
    if(!state.profile || state.recovery)renderAuth();else renderWorkspace();
    window.dispatchEvent(new Event('tilki-session'));
  }
  function renderAuth() {
    const signup=state.mode==='signup', reset=state.mode==='reset', recovery=state.recovery;
    $('#app').innerHTML=`<section class="auth-card"><div class="brand"><span class="brand-mark">🦊</span>Tilki</div>${!recovery?`<div class="auth-tabs"><button type="button" class="auth-tab ${state.mode==='login'?'active':''}" data-auth-mode="login">Giriş yap</button><button type="button" class="auth-tab ${signup?'active':''}" data-auth-mode="signup">Kayıt ol</button></div>`:''}<div class="eyebrow">${recovery?'Yeni başlangıç':signup?'Film kulübüne katıl':reset?'Hesabına geri dön':'Tekrar hoş geldin'}</div><h1>${recovery?'Yeni parolanı belirle.':signup?'Hikâyeye katıl.':reset?'Parolanı mı unuttun?':'Sohbete devam et.'}</h1><p class="lead">${recovery?'Hesabın için en az 8 karakterli yeni bir parola seç.':signup?'Listelerini kaydet, arkadaşlarını bul ve film üzerine konuş.':reset?'Parola yenileme bağlantısını e-posta adresine göndereceğiz.':'E-posta ve parolanla giriş yap. Sohbetlerin hesabınla birlikte gelir.'}</p>${state.notice?`<p class="auth-notice" role="status">${esc(state.notice)}</p>`:''}${!state.client?'<p class="auth-notice" role="status">Hesap bağlantısı kullanılamıyor. Sayfayı yenileyebilir veya demo hesabını deneyebilirsin.</p>':''}<form id="authForm">${signup?'<div class="field"><label for="displayName">Görünen ad</label><input id="displayName" autocomplete="name" minlength="2" maxlength="50" required></div>':''}${!recovery?`<div class="field"><label for="email">E-posta</label><input id="email" type="email" autocomplete="email" value="${esc(state.email)}" required></div>`:''}${!reset||recovery?`<div class="field"><label for="password">Parola</label><input id="password" type="password" autocomplete="${signup||recovery?'new-password':'current-password'}" minlength="${signup||recovery?'8':'1'}" maxlength="128" required></div>${signup||recovery?'<div class="field"><label for="passwordAgain">Parola tekrar</label><input id="passwordAgain" type="password" autocomplete="new-password" minlength="8" maxlength="128" required></div>':''}`:''}<button class="btn block" ${!state.client?'disabled':''}>${recovery?'Parolayı güncelle':signup?'Hesap oluştur':reset?'Yenileme bağlantısı gönder':'Giriş yap'}</button></form>${!recovery?`<button class="btn ghost block" data-auth-mode="${reset?'login':'reset'}">${reset?'Girişe dön':'Parolamı unuttum'}</button><button class="btn secondary block" id="demoBtn">Demo hesabıyla dene</button>`:''}<button class="btn ghost block" data-page="home">← Üye olmadan keşfet</button></section>`;
    document.querySelectorAll('[data-auth-mode]').forEach(button=>button.onclick=()=>{state.mode=button.dataset.authMode;state.notice='';render();});
    $('#authForm')?.addEventListener('submit',authenticate);
    $('#demoBtn')?.addEventListener('click',startDemo);
  }
  async function authenticate(event) {
    event.preventDefault();if(state.authBusy||!state.client)return;
    const button=event.submitter;state.authBusy=true;if(button)button.disabled=true;
    const mode=state.mode, password=$('#password')?.value;
    try {
      if(state.recovery||mode==='signup') {if(password!==$('#passwordAgain').value)throw Error('Parolalar eşleşmiyor.');if(password.length<8)throw Error('Parola en az 8 karakter olmalı.');}
      if(state.recovery) {const {error}=await state.client.auth.updateUser({password});if(error)throw error;state.recovery=false;state.notice='';state.mode='login';window.TilkiCinema.go('home');render();toast('Parolan güncellendi.');return;}
      state.email=$('#email').value.trim().toLowerCase();
      const redirectTo=new URL(location.pathname,location.origin).href+'#auth';
      if(mode==='reset') {const {error}=await state.client.auth.resetPasswordForEmail(state.email,{redirectTo});if(error)throw error;state.notice='Adresin kayıtlıysa parola yenileme bağlantısı gönderildi. Gelen kutunu ve spam klasörünü kontrol et.';render();return;}
      let result;
      if(mode==='signup') {
        const display_name=$('#displayName').value.trim();if(display_name.length<2)throw Error('Görünen ad en az 2 karakter olmalı.');
        result=await state.client.auth.signUp({email:state.email,password,options:{data:{display_name},emailRedirectTo:redirectTo}});
      }else result=await state.client.auth.signInWithPassword({email:state.email,password});
      if(result.error)throw result.error;
      if(!result.data.session){state.mode='login';state.notice='Devam etmek için e-postana gelen onay bağlantısını aç, sonra giriş yap.';render();return;}
      state.notice='';await bootstrap(result.data.session);
    }catch(error){state.notice=messageError(error);if(!state.profile)render();else toast(state.notice);}finally{state.authBusy=false;if(button)button.disabled=false;}
  }
  function clearSession() {
    state.epoch++;state.channel?.unsubscribe();state.channel=null;
    Object.assign(state,{session:null,profile:null,demo:false,contacts:[],blocked:[],messages:{},active:null,drafts:{},pending:{},sending:false,loading:{},older:{},error:'',connection:'Bağlanıyor',recovery:false});state.readBusy.clear();
    $('#modal')?.remove();$('#app').innerHTML='';
  }
  let boot;
  async function bootstrap(session) {
    if(boot?.id===session.user.id)return boot.promise;
    const promise=(async()=>{
      if(state.profile?.id!==session.user.id)clearSession();
      const epoch=state.epoch,user=session.user;state.session=session;
      const {data,error}=await state.client.from('profiles').select(profileFields).eq('id',user.id).maybeSingle();if(error)throw error;
      let profile=data;
      if(!profile){const row={id:user.id,email:user.email,display_name:(user.user_metadata?.display_name||user.email?.split('@')[0]||'Filmsever').slice(0,50),status:'Bir sonraki favorimin peşindeyim.'};const result=await state.client.from('profiles').upsert(row).select(profileFields).single();if(result.error)throw result.error;profile=result.data;}
      if(epoch!==state.epoch)return;
      state.profile={...profile,email:user.email};subscribe();render();await refresh();
    })();
    boot={id:session.user.id,promise};try{await promise;}finally{if(boot?.promise===promise)boot=null;}
  }
  function startDemo() {
    clearSession();state.demo=true;state.connection='Demo oturumu';
    state.profile={id:'demo-me',display_name:'Deniz',email:'deniz@example.com',status:'Bir sonraki favorimin peşindeyim.'};
    state.contacts=[{id:'demo-aylin',display_name:'Aylin Demir',status:'Bilim kurgu ve bolca kahve.'},{id:'demo-mert',display_name:'Mert Kaya',status:'Bir bölüm daha…'}];
    mergeMessage({id:'demo-message',sender_id:'demo-aylin',recipient_id:'demo-me',content:{type:'text',text:'Interstellar bitti ama hâlâ düşünüyorum. Senin favori sahnen hangisi?'},created_at:new Date().toISOString(),status:'read'});render();
  }
  function normalizeContent(content) {
    if(!content||typeof content!=='object')return {type:'legacy',text:'Önceki sürüme ait bu mesaj görüntülenemiyor.'};
    if(content.type==='text'&&typeof content.text==='string')return {type:'text',text:content.text.slice(0,10000)};
    if(content.type==='movie'&&window.TILKI_CATALOG.some(m=>m.id===content.movieId))return {type:'movie',movieId:content.movieId};
    if(content.type==='image'&&typeof content.data==='string'&&content.data.length<=850000&&/^data:image\/(jpeg|png|webp|gif);base64,[A-Za-z0-9+/]+=*$/.test(content.data))return {type:'image',data:content.data,name:String(content.name||'Görsel').slice(0,80)};
    return {type:'legacy',text:'Bu mesaj türü desteklenmiyor.'};
  }
  function preview(message) {const c=normalizeContent(message.content);return c.type==='movie'?'🎬 '+window.TILKI_CATALOG.find(m=>m.id===c.movieId).title:c.type==='image'?'📷 Görsel':c.text;}
  function mergeMessage(message) {
    if(!state.profile)return;
    const me=state.profile.id;if(message.sender_id!==me&&message.recipient_id!==me)return;
    const id=message.sender_id===me?message.recipient_id:message.sender_id;
    if(state.blocked.includes(id))return;
    const list=state.messages[id]??=[];const existing=list.find(m=>m.id===message.id);
    if(existing){const ranks={sent:0,delivered:1,read:2};const status=ranks[existing.status]>ranks[message.status]?existing.status:message.status;Object.assign(existing,message,{status});}
    else list.push({...message});
    list.sort((a,b)=>a.created_at.localeCompare(b.created_at)||a.id.localeCompare(b.id));
  }
  async function refresh() {
    if(!state.profile||state.demo)return;const epoch=state.epoch,id=state.profile.id;
    try {
      const [contacts,blocks]=await Promise.all([state.client.from('contacts').select('contact:profiles!contacts_contact_id_fkey(id,display_name,status)').eq('owner_id',id),state.client.from('blocked_users').select('blocked_id').eq('owner_id',id)]);
      if(contacts.error||blocks.error)throw contacts.error||blocks.error;if(epoch!==state.epoch)return;
      const peers=new Map(state.contacts.map(c=>[c.id,c]));(contacts.data||[]).forEach(row=>{if(row.contact)peers.set(row.contact.id,row.contact)});state.blocked=(blocks.data||[]).map(r=>r.blocked_id);state.contacts=[...peers.values()].filter(c=>!state.blocked.includes(c.id));
      const recent=await state.client.from('messages').select(fields).or(`sender_id.eq.${id},recipient_id.eq.${id}`).order('created_at',{ascending:false}).order('id',{ascending:false}).limit(100);if(recent.error)throw recent.error;if(epoch!==state.epoch)return;
      const unknown=[...new Set((recent.data||[]).map(m=>m.sender_id===id?m.recipient_id:m.sender_id))].filter(peer=>!peers.has(peer)&&!state.blocked.includes(peer));
      if(unknown.length){const result=await state.client.from('profiles').select(profileFields).in('id',unknown);if(result.error)throw result.error;if(epoch!==state.epoch)return;for(const p of result.data||[])if(!state.contacts.some(c=>c.id===p.id))state.contacts.push(p);}
      for(const message of recent.data||[])mergeMessage(message);state.error='';render();
      if(state.active)await loadHistory(state.active);
      acknowledge('delivered');
    }catch(error){if(epoch===state.epoch){state.error=messageError(error);render();}}
  }
  async function loadHistory(id,older=false) {
    if(state.demo||state.loading[id]||!state.profile)return;
    const epoch=state.epoch,me=state.profile.id;state.loading[id]=true;
    const previousScroll=$('#messages')?.scrollHeight||0;
    try {
      let query=state.client.from('messages').select(fields).or(`and(sender_id.eq.${me},recipient_id.eq.${id}),and(sender_id.eq.${id},recipient_id.eq.${me})`);
      const first=(state.messages[id]||[])[0];
      if(older&&first)query=query.or(`created_at.lt.${first.created_at},and(created_at.eq.${first.created_at},id.lt.${first.id})`);
      const {data,error}=await query.order('created_at',{ascending:false}).order('id',{ascending:false}).limit(50);if(error)throw error;if(epoch!==state.epoch)return;
      (data||[]).forEach(mergeMessage);state.older[id]=data?.length===50;state.error='';
    }catch(error){if(epoch===state.epoch)state.error=messageError(error);}
    finally{if(epoch===state.epoch){state.loading[id]=false;if(state.active===id){render();const el=$('#messages');if(el)el.scrollTop=older?el.scrollHeight-previousScroll:el.scrollHeight;acknowledge('read',id);}}}
  }
  async function receive(payload) {
    const message=payload.new,epoch=state.epoch;if(!state.profile||!message?.id)return;
    const id=message.sender_id===state.profile.id?message.recipient_id:message.sender_id;
    if(state.blocked.includes(id))return;
    if(!state.contacts.some(c=>c.id===id)){const {data,error}=await state.client.from('profiles').select(profileFields).eq('id',id).maybeSingle();if(error||!data||epoch!==state.epoch)return;if(!state.contacts.some(c=>c.id===id))state.contacts.push(data);}
    if(epoch!==state.epoch)return;const known=(state.messages[id]||[]).some(m=>m.id===message.id);mergeMessage(message);render();
    if(message.recipient_id===state.profile.id){if(!known&&state.active!==id)toast('Yeni bir mesajın var.');acknowledge(chatVisible(id)?'read':'delivered',id);}
  }
  function subscribe() {
    state.channel?.unsubscribe();const id=state.profile.id,epoch=state.epoch;
    state.channel=state.client.channel(`tilki-chat-${id}-${epoch}`)
      .on('postgres_changes',{event:'*',schema:'public',table:'messages',filter:`recipient_id=eq.${id}`},p=>receive(p).catch(e=>toast(messageError(e))))
      .on('postgres_changes',{event:'*',schema:'public',table:'messages',filter:`sender_id=eq.${id}`},p=>receive(p).catch(e=>toast(messageError(e))))
      .on('postgres_changes',{event:'INSERT',schema:'public',table:'contacts',filter:`owner_id=eq.${id}`},()=>refresh())
      .subscribe(status=>{if(epoch!==state.epoch)return;state.connection=status==='SUBSCRIBED'?'Bağlı':status==='CHANNEL_ERROR'||status==='TIMED_OUT'?'Bağlantı bekleniyor':'Bağlanıyor';const label=$('#connectionStatus');if(label)label.textContent=state.connection;if(status==='SUBSCRIBED')refresh();});
  }
  function chatVisible(id) {return state.active===id&&!document.hidden&&!$('#socialPane')?.hidden;}
  async function acknowledge(status,id=null) {
    if(state.demo||!state.profile)return;if(status==='read'&&!chatVisible(id))return;
    const epoch=state.epoch,me=state.profile.id;
    const messages=(id?state.messages[id]||[]:Object.values(state.messages).flat()).filter(m=>m.recipient_id===me&&(status==='read'?m.status!=='read':m.status==='sent')&&!state.readBusy.has(m.id));
    if(!messages.length)return;messages.forEach(m=>state.readBusy.add(m.id));
    try {const {error}=await state.client.from('messages').update({status}).in('id',messages.map(m=>m.id)).eq('recipient_id',me).in('status',status==='read'?['sent','delivered']:['sent']);if(error)throw error;if(epoch===state.epoch){messages.forEach(m=>{if(m.status!=='read')m.status=status;});render();}}
    catch(error){/* A later open or reconnect retries acknowledgments. */}
    finally{if(epoch===state.epoch){messages.forEach(m=>state.readBusy.delete(m.id));if(status==='delivered'&&chatVisible(state.active))acknowledge('read',state.active);}}
  }
  function renderWorkspace() {
    const selected=state.contacts.find(c=>c.id===state.active),focus=$('#messageInput')===document.activeElement,caret=$('#messageInput')?.selectionStart,scroll=$('#messages'),oldTop=scroll?.scrollTop||0,atBottom=!scroll||scroll.scrollHeight-scroll.scrollTop-scroll.clientHeight<80;
    const search=$('#search')?.value||'';
    $('#app').innerHTML=`<section class="workspace ${selected?'chat-open':''}"><aside class="sidebar"><header class="sidebar-head"><div class="brand">Sohbetler</div><button class="icon-btn" id="settings" aria-label="Hesap ayarları">⚙</button></header><div class="profile"><span class="avatar">${initials(state.profile.display_name)}</span><div class="profile-copy"><strong>${esc(state.profile.display_name)}</strong><span id="connectionStatus">${state.demo?'Demo oturumu':esc(state.connection)}</span></div></div><input class="search" id="search" aria-label="Sohbet ara" placeholder="Sohbetlerde ara…" value="${esc(search)}">${state.error?`<p class="auth-notice chat-error" role="alert">${esc(state.error)}</p>`:""}<div class="contact-list">${contactList(search)}</div><footer class="sidebar-foot"><button class="btn secondary block" data-page="friends">＋ Arkadaş bul</button></footer></aside><section class="chat">${selected?chatView(selected):'<div class="empty chat-empty"><div><h2>Filmden sonra konuşalım.</h2><p>Bir sohbet seç veya yeni bir arkadaş bul.</p><button class="btn secondary" data-page="friends">Arkadaşlara git →</button></div></div>'}</section></section>`;
    $('.contact-list').onclick=e=>{const button=e.target.closest('[data-contact]');if(button)openContact(state.contacts.find(c=>c.id===button.dataset.contact)).catch(e=>toast(messageError(e)));};
    $('#search').oninput=e=>$('.contact-list').innerHTML=contactList(e.target.value);
    $('#settings').onclick=settings;
    $('#chatBack')?.addEventListener('click',()=>{state.active=null;render();});
    $('#refreshChat')?.addEventListener('click',refresh);
    $('#loadOlder')?.addEventListener('click',()=>loadHistory(state.active,true));
    $('#composer')?.addEventListener('submit',e=>{e.preventDefault();const text=$('#messageInput').value.trim();if(text)transmit({type:'text',text});});
    $('#messageInput')?.addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.shiftKey&&!e.isComposing){e.preventDefault();$('#composer').requestSubmit();}});
    $('#imageButton')?.addEventListener('click',()=>$('#imageInput').click());
    $('#imageInput')?.addEventListener('change',e=>sendImage(e.target.files?.[0]));
    $('#blockPeer')?.addEventListener('click',()=>blockPeer(selected));
    document.querySelectorAll('[data-open-image]').forEach(button=>button.onclick=()=>{const message=(state.messages[state.active]||[]).find(m=>m.id===button.dataset.openImage),c=normalizeContent(message?.content);if(c.type==='image')modal(`<h2>Paylaşılan görsel</h2><img class="image-preview" src="${esc(c.data)}" alt="${esc(c.name)}"><button class="btn secondary" data-close>Kapat</button>`);});
    const input=$('#messageInput');if(input){input.value=state.drafts[state.active]||'';if(focus){input.focus();input.setSelectionRange(caret,caret);}}
    const next=$('#messages');if(next)next.scrollTop=atBottom?next.scrollHeight:oldTop;
  }
  function contactList(query='') {
    return [...state.contacts].filter(c=>!state.blocked.includes(c.id)&&c.display_name.toLocaleLowerCase('tr-TR').includes(query.toLocaleLowerCase('tr-TR'))).sort((a,b)=>String(state.messages[b.id]?.at(-1)?.created_at||'').localeCompare(String(state.messages[a.id]?.at(-1)?.created_at||''))).map(c=>{
      const list=state.messages[c.id]||[],last=list.at(-1),unread=list.filter(m=>m.recipient_id===state.profile.id&&m.status!=='read').length;
      return `<button class="contact ${state.active===c.id?'active':''}" data-contact="${c.id}"><span class="avatar">${initials(c.display_name)}</span><span class="contact-main"><span class="contact-line"><strong>${esc(c.display_name)}</strong><time>${last?time(last.created_at):''}</time></span><span class="preview">${esc(last?preview(last):'Bir merhaba gönder.')}</span></span>${unread?`<span class="unread-count" aria-label="${unread} okunmamış mesaj">${unread}</span>`:''}</button>`;
    }).join('')||'<div class="empty">Henüz sohbet yok.</div>';
  }
  function chatView(peer) {return `<header class="chat-head"><button class="icon-btn back" id="chatBack" aria-label="Sohbetlere dön">←</button><span class="avatar">${initials(peer.display_name)}</span><div class="profile-copy"><strong>${esc(peer.display_name)}</strong><span>${esc(peer.status||'Film sohbeti')}</span></div><button class="icon-btn" id="blockPeer" title="Kullanıcıyı engelle" aria-label="Kullanıcıyı engelle">⊘</button></header><div class="chat-status">${state.error?`<span role="alert">${esc(state.error)}</span>`:state.demo?'Demo sohbeti · Yanıtlar örnektir.':'Film önerilerini ve düşüncelerini paylaş.'}<button class="t-link" id="refreshChat">Yenile ↻</button></div><div class="messages" id="messages" aria-label="Mesajlar">${state.older[peer.id]?'<button class="btn ghost" id="loadOlder">Önceki mesajları yükle</button>':''}${(state.messages[peer.id]||[]).map(messageView).join('')||'<div class="empty">İlk mesajı sen gönder.</div>'}</div><div class="composer-wrap"><form class="composer" id="composer"><input id="imageInput" type="file" accept="image/jpeg,image/png,image/webp,image/gif" hidden><button class="icon-btn attach" id="imageButton" type="button" aria-label="Görsel paylaş" ${state.sending?'disabled':''}>＋</button><textarea id="messageInput" data-contact="${peer.id}" data-owner="${state.profile.id}" aria-label="Mesaj" placeholder="Mesaj yaz…" maxlength="10000" rows="1"></textarea><button class="btn send" aria-label="Mesajı gönder" ${state.sending?'disabled':''}>➤</button></form></div>`;}
  function messageView(message) {
    const content=normalizeContent(message.content),mine=message.sender_id===state.profile.id;let html;
    if(content.type==='movie'){const movie=window.TILKI_CATALOG.find(m=>m.id===content.movieId);html=`<button class="t-shared" data-movie="${movie.id}"><span>🎬 Film önerisi</span><strong>${esc(movie.title)}</strong><small>${movie.year} · Detayları gör →</small></button>`;}
    else if(content.type==='image')html=`<button class="shared-image" data-open-image="${message.id}"><img src="${esc(content.data)}" alt="${esc(content.name)}" loading="lazy"></button>`;
    else html=`<p>${esc(content.text)}</p>`;
    return `<article class="message ${mine?'mine':''}">${html}<div class="message-meta">${time(message.created_at)} ${mine?`<span>${({sent:'Gönderildi ✓',delivered:'Teslim edildi ✓✓',read:'Okundu ✓✓'})[message.status]||'Gönderildi ✓'}</span>`:''}</div></article>`;
  }
  async function openContact(peer) {
    if(!peer||!state.profile)throw Error('Önce giriş yap.');if(state.blocked.includes(peer.id))throw Error('Bu kullanıcı engellenmiş.');
    const epoch=state.epoch;
    if(!state.contacts.some(c=>c.id===peer.id)){if(!state.demo){const {error}=await state.client.from('contacts').upsert({owner_id:state.profile.id,contact_id:peer.id});if(error)throw error;}if(epoch!==state.epoch)return;state.contacts.push(peer);}
    preserveDraft();state.active=peer.id;render();await loadHistory(peer.id);acknowledge('read',peer.id);
  }
  function validateOutgoing(content) {
    const normalized=normalizeContent(content);
    if(normalized.type==='legacy')throw Error('Mesaj içeriği geçersiz.');
    if(content.type==='text'&&(!content.text.trim()||content.text.length>10000))throw Error('Mesaj 1–10.000 karakter arasında olmalı.');
    return normalized;
  }
  async function transmit(content) {
    if(!state.profile||!state.active||state.sending)return false;
    let body;try{body=validateOutgoing(content);}catch(e){toast(e.message);return false;}
    const peer=state.active,epoch=state.epoch,user=state.profile.id;
    if(state.blocked.includes(peer)){toast('Bu kullanıcı engellenmiş.');return false;}
    const encoded=JSON.stringify(body),pending=state.pending[peer];
    const id=pending?.encoded===encoded?pending.id:newId();state.pending[peer]={encoded,id};state.sending=true;render();
    try {
      let message={id,sender_id:user,recipient_id:peer,content:body,status:'sent',created_at:new Date().toISOString()};
      if(!state.demo){let result=await state.client.from('messages').insert({id,sender_id:user,recipient_id:peer,content:body}).select(fields).single();if(result.error?.code==='23505')result=await state.client.from('messages').select(fields).eq('id',id).eq('sender_id',user).single();if(result.error)throw result.error;message=result.data;}
      if(epoch!==state.epoch)return false;
      mergeMessage(message);delete state.pending[peer];
      const input=$('#messageInput');if(body.type==='text'&&input?.dataset.contact===peer&&input.value.trim()===body.text){input.value='';state.drafts[peer]='';}
      if(state.demo)setTimeout(()=>{if(epoch!==state.epoch)return;mergeMessage({...message,status:'read'});mergeMessage({id:newId(),sender_id:peer,recipient_id:user,content:{type:'text',text:body.type==='movie'?'Listeme ekledim! İzleyince konuşalım.':'Bence bunu bir film gecesinde konuşmalıyız. 🍿'},status:'read',created_at:new Date().toISOString()});render();},900);
      return true;
    }catch(error){if(epoch===state.epoch)toast('Mesaj gönderilemedi: '+messageError(error));return false;}
    finally{if(epoch===state.epoch){state.sending=false;render();}}
  }
  async function sendImage(file) {
    if(!file)return;const epoch=state.epoch,peer=state.active;
    if(!/^image\/(jpeg|png|webp|gif)$/.test(file.type)||file.size>600*1024)return toast('JPG, PNG, WebP veya GIF seç. En fazla 600 KB olabilir.');
    const reader=new FileReader();reader.onload=()=>{if(epoch===state.epoch&&peer===state.active)transmit({type:'image',name:file.name.slice(0,80),data:reader.result});};reader.onerror=()=>toast('Görsel okunamadı.');reader.readAsDataURL(file);
  }
  function modal(html) {
    $('#modal')?.remove();document.body.insertAdjacentHTML('beforeend',`<div class="modal-backdrop" id="modal"><section class="modal" role="dialog" aria-modal="true" aria-label="Hesap ve sohbet ayarları" tabindex="-1">${html}</section></div>`);$('.modal').focus();
    $('#modal').onclick=e=>{if(e.target.id==='modal'||e.target.closest('[data-close]'))$('#modal')?.remove();};
  }
  function settings() {
    modal(`<h2>Hesabım</h2><p><b>${esc(state.profile.display_name)}</b><br>${esc(state.profile.email)}</p><p>${state.demo?'Demo hesabı; değişiklikler bu oturumda kalır.':'Mesaj geçmişin hesabında saklanır. Başka cihazdan giriş yaparak devam edebilirsin.'}</p><div class="modal-actions"><button class="btn secondary" id="blockedList">Engellenenler (${state.blocked.length})</button><button class="btn danger" id="logout">Çıkış yap</button><button class="btn ghost" data-close>Kapat</button></div>`);
    $('#logout').onclick=async()=>{try{if(!state.demo){const {error}=await state.client.auth.signOut();if(error)throw error;}clearSession();state.mode='login';state.notice='';render();}catch(e){toast(messageError(e));}};
    $('#blockedList').onclick=showBlocked;
  }
  function blockPeer(peer) {
    modal(`<h2>${esc(peer.display_name)} engellensin mi?</h2><p>Aranızda yeni mesaj gönderilemez. Engeli hesap ayarlarından kaldırabilirsin.</p><div class="modal-actions"><button class="btn ghost" data-close>Vazgeç</button><button class="btn danger" id="confirmBlock">Engelle</button></div>`);
    $('#confirmBlock').onclick=async()=>{const epoch=state.epoch;try{if(!state.demo){const {error}=await state.client.from('blocked_users').upsert({owner_id:state.profile.id,blocked_id:peer.id});if(error)throw error;}if(epoch!==state.epoch)return;state.blocked.push(peer.id);state.contacts=state.contacts.filter(c=>c.id!==peer.id);state.active=null;$('#modal')?.remove();render();}catch(e){toast(messageError(e));}};
  }
  async function showBlocked() {
    const epoch=state.epoch;let people=state.blocked.map(id=>({id,display_name:id}));
    if(!state.demo&&people.length){const {data,error}=await state.client.from('profiles').select(profileFields).in('id',state.blocked);if(error)return toast(messageError(error));people=data||[];}
    if(epoch!==state.epoch)return;
    modal(`<h2>Engellenenler</h2>${people.map(p=>`<p>${esc(p.display_name)} <button class="btn secondary" data-unblock="${p.id}">Engeli kaldır</button></p>`).join('')||'<p>Engellenen kullanıcı yok.</p>'}<button class="btn ghost" data-close>Kapat</button>`);
    document.querySelectorAll('[data-unblock]').forEach(button=>button.onclick=async()=>{try{const id=button.dataset.unblock;if(!state.demo){const {error}=await state.client.from('blocked_users').delete().eq('owner_id',state.profile.id).eq('blocked_id',id);if(error)throw error;}if(epoch!==state.epoch)return;state.blocked=state.blocked.filter(x=>x!==id);await refresh();await showBlocked();}catch(e){toast(messageError(e));}});
  }
  async function init() {
    render();if(!state.client)return;
    state.client.auth.onAuthStateChange((event,session)=>{
      if(event==='SIGNED_OUT'){clearSession();render();return;}
      if(event==='PASSWORD_RECOVERY'){state.recovery=true;setTimeout(async()=>{try{await bootstrap(session);state.recovery=true;window.TilkiCinema.go('auth');render();}catch(e){toast(messageError(e));}},0);return;}
      if(session&&!state.authBusy&&!state.demo&&(event==='SIGNED_IN'||event==='TOKEN_REFRESHED')&&state.profile?.id!==session.user.id)setTimeout(()=>bootstrap(session).catch(e=>{state.notice=messageError(e);render();}),0);
    });
    const {data,error}=await state.client.auth.getSession();if(error)throw error;if(data.session)await bootstrap(data.session);
  }
  window.TilkiChat={get profile(){return state.profile},get client(){return state.client},get demo(){return state.demo},get contacts(){return state.contacts},get blocked(){return state.blocked},get recovery(){return state.recovery},render,settings,openContact,refresh,sendFilm:movieId=>transmit({type:'movie',movieId}),markRead:()=>acknowledge('read',state.active)};
  document.addEventListener('visibilitychange',()=>{if(!document.hidden){acknowledge('read',state.active);}});
  window.addEventListener('online',refresh);
  document.addEventListener('keydown',e=>{if(e.key==='Escape')$('#modal')?.remove();});
  init().catch(error=>{state.notice=messageError(error);render();});
})();
