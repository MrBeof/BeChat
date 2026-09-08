(() => {
  'use strict';
  const $ = (s, root = document) => root.querySelector(s);
  const escape = (value = '') => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const movies = window.TILKI_CATALOG;
  const findMovie = id => movies.find(m => m.id === id);
  const labels = {home:'Ana sayfa',discover:'Keşfet',library:'Kütüphanem',friends:'Arkadaşlar',chat:'Sohbetler',profile:'Profilim'};
  const symbols = {home:'⌂',discover:'◈',library:'▣',friends:'♧',chat:'◌',profile:'◉'};
  const statuses = {planned:'İzleyeceklerim',watching:'İzliyorum',watched:'İzlediklerim',favorites:'Favoriler'};
  const view = {page:'home',query:'',genre:'Tümü',type:'all',sort:'selection',tab:'planned',library:[],friends:[],people:[],user:null,pending:null,error:'',loading:false,channel:null,version:0,lookup:0};
  const bridge = () => window.TilkiChat;
  const account = () => bridge()?.profile;
  const client = () => bridge()?.client;
  const initials = name => escape(String(name || '?').trim().split(/\s+/).slice(0,2).map(n=>n[0]).join('').toLocaleUpperCase('tr-TR'));
  function toast(message) { const el=$('#toast');el.textContent=message;el.classList.add('show');clearTimeout(toast.timer);toast.timer=setTimeout(()=>el.classList.remove('show'),4000); }
  function nav() {
    const user=account();
    $('#navigation').innerHTML=`<div class="t-logo"><span class="t-logo-mark" aria-hidden="true">🦊</span><span class="t-logo-name">Tilki</span><span class="t-alpha">ALFA</span></div><nav class="t-nav" aria-label="Ana menü">${Object.entries(labels).map(([id,label])=>`<button data-page="${id}" class="${view.page===id?'active':''}" ${view.page===id?'aria-current="page"':''} title="${label}" aria-label="${label}"><span class="t-nav-icon" aria-hidden="true">${symbols[id]}</span><span class="t-nav-label">${label}</span></button>`).join('')}</nav><div class="t-side-bottom"><button class="t-account" data-page="${user?'profile':'auth'}" title="${user?'Profilim':'Giriş yap'}"><span class="t-avatar">${user?initials(user.display_name):'↗'}</span><span class="t-account-copy"><b>${user?escape(user.display_name):'Misafir'}</b><small>${user?'Film kulübün hazır':'Giriş yap / Kayıt ol'}</small></span></button></div>`;
  }
  function go(page, updateHash=true) {
    if (!labels[page] && page!=='auth') page='home';
    view.page=page;
    if(updateHash && location.hash!==`#${page}`)history.pushState(null,'',`#${page}`);
    const social=page==='auth'||(page==='chat'&&account());
    $('#socialPane').hidden=!social;$('#cinema').hidden=social;
    nav();
    if(social) {bridge()?.render();if(page==='chat')bridge()?.markRead?.();} else render();
    window.scrollTo?.(0,0);
  }
  function requireUser(action) {
    if(account())return true;
    view.pending=action;closeDialog();go('auth');toast('Kütüphane ve sosyal özellikler için giriş yapmalısın.');return false;
  }
  function poster(movie) { return `<div class="t-poster" style="--poster:${movie.color}"><span class="t-type">${movie.type==='film'?'FİLM':'DİZİ'} · ${movie.year}</span><span class="t-symbol" aria-hidden="true">${movie.symbol}</span><span class="t-poster-title">${escape(movie.title)}</span></div>`; }
  function card(movie) {const saved=view.library.find(x=>x.movie_id===movie.id);return `<button class="t-movie" data-movie="${movie.id}" aria-label="${escape(movie.title)} detayları">${poster(movie)}<div class="t-movie-info"><b>${escape(movie.title)}</b><span>${saved?.favorite?'★ · ':''}${movie.year} · ${movie.genres[0]}</span></div></button>`;}
  function grid(list) {return `<div class="t-grid">${list.length?list.map(card).join(''):'<div class="t-empty"><h3>Burada henüz bir şey yok</h3><p>Başka bir filtre dene veya keşfetten listene bir yapım ekle.</p><button class="t-btn secondary" data-page="discover">Keşfet</button></div>'}</div>`;}
  function header(title,sub,search=false) {return `<div class="t-top"><div><h1 class="t-title">${title}</h1><p class="t-sub">${sub}</p></div>${search?`<input class="t-search" id="catalogSearch" type="search" aria-label="Film veya dizi ara" placeholder="⌕  Film veya dizi ara…" value="${escape(view.query)}">`:''}</div>`;}
  function gate(page) {return `${header(labels[page],'İyi hikâyeler, güzel sohbetler.')}<div class="t-empty"><h2>${page==='chat'?'Sohbet burada başlar':page==='friends'?'Film arkadaşlarını bul':'Kendi film köşeni oluştur'}</h2><p>Film ve dizileri herkes keşfedebilir. Listelerini kaydetmek, arkadaş eklemek ve sohbet etmek için hesabına giriş yap.</p><button class="t-btn" data-signin="${page}">Giriş yap / Kayıt ol</button></div>`;}
  function home() {return `${header(account()?`Merhaba, ${escape(account().display_name)} 👋`:'Sıradaki güzel hikâyeni bul.','Film seç. Listene ekle. Üzerine konuş.',true)}<section class="t-hero"><div class="t-hero-content"><span class="t-eyebrow">EDİTÖRÜN SEÇİMİ · INTERSTELLAR</span><h1>Bazı hikâyeler,<br>film bitince başlar.</h1><p>Yıldızların ötesine bir yolculuk. Sonrasında konuşacak çok şey var.</p><button class="t-btn" data-movie="interstellar">Filmi keşfet <span aria-hidden="true">→</span></button></div><div class="t-orbit" aria-hidden="true"></div></section><section class="t-section"><div class="t-section-head"><h2>Birlikte konuşmaya değer</h2><button class="t-link" data-page="discover">Tümünü keşfet →</button></div>${grid(movies.slice(0,6))}</section><section class="t-section"><div class="t-section-head"><h2>Diziye bir bölüm ara veremeyenlere</h2></div>${grid(movies.filter(m=>m.type==='series').slice(0,4))}</section><section class="t-section"><div class="t-guest"><div><h3>${account()?'Film gecesi için bir arkadaş bul':'Film zevkinin bir buluşma noktası var.'}</h3><p>${account()?'Arkadaş ekle, bir film önerisi gönder ve sohbeti başlat.':'İzlediklerini biriktir, favorilerini paylaş. Birlikte konuşunca daha güzel.'}</p></div><button class="t-btn secondary" data-${account()?'page="friends"':'signin="friends"'}>${account()?'Arkadaşlara git':'Aramıza katıl'} →</button></div></section>`;}
  function filtered() {
    const query=view.query.toLocaleLowerCase('tr-TR');
    const list=movies.filter(m=>(view.type==='all'||m.type===view.type)&&(view.genre==='Tümü'||m.genres.includes(view.genre))&&`${m.title} ${m.year} ${m.genres.join(' ')}`.toLocaleLowerCase('tr-TR').includes(query));
    if(view.sort==='newest')list.sort((a,b)=>b.year-a.year);
    if(view.sort==='title')list.sort((a,b)=>a.title.localeCompare(b.title,'tr'));
    return list;
  }
  function discover() {return `${header('Keşfet','Yeni bir dünya, bir film uzağında.',true)}<div class="t-filters" aria-label="Tür filtresi">${['Tümü','Bilim Kurgu','Drama','Aksiyon','Komedi','Gerilim','Müzik'].map(g=>`<button class="t-chip ${view.genre===g?'active':''}" data-genre="${g}" aria-pressed="${view.genre===g}">${g}</button>`).join('')}</div><div class="t-toolbar"><div class="t-filters" style="margin:0">${[['all','Tüm yapımlar'],['film','Filmler'],['series','Diziler']].map(([v,l])=>`<button class="t-chip ${view.type===v?'active':''}" data-type="${v}" aria-pressed="${view.type===v}">${l}</button>`).join('')}</div><select id="catalogSort" aria-label="Sıralama"><option value="selection" ${view.sort==='selection'?'selected':''}>Editör seçkisi</option><option value="newest" ${view.sort==='newest'?'selected':''}>Yıla göre: yeni → eski</option><option value="title" ${view.sort==='title'?'selected':''}>Ada göre: A → Z</option></select></div><p class="t-note" id="resultCount">${filtered().length} yapım · Alfa kataloğu</p><div id="catalogResults">${grid(filtered())}</div>`;}
  function library() {const selected=view.library.filter(x=>view.tab==='favorites'?x.favorite:x.status===view.tab);return `${header('Kütüphanem','İzleme yolculuğun, senin listelerin.')}<div class="t-filters">${Object.entries(statuses).map(([id,label])=>`<button class="t-chip ${view.tab===id?'active':''}" data-tab="${id}">${label} · ${view.library.filter(x=>id==='favorites'?x.favorite:x.status===id).length}</button>`).join('')}</div>${grid(selected.map(x=>findMovie(x.movie_id)).filter(Boolean))}`;}
  function person(p,actions,sub='') {return `<article class="t-person"><span class="t-avatar">${initials(p.display_name)}</span><div class="t-person-copy"><b>${escape(p.display_name)}</b><small>${escape(sub||p.status||'Yeni bir film arkadaşı')}</small></div><div class="t-person-actions">${actions}</div></article>`;}
  function friends() {
    const id=account().id, incoming=view.friends.filter(f=>f.recipient_id===id&&f.status==='pending'), accepted=view.friends.filter(f=>f.status==='accepted'),outgoing=view.friends.filter(f=>f.requester_id===id&&f.status==='pending');
    const peer=f=>f.requester_id===id?f.recipient:f.requester;
    return `${header('Arkadaşlar','Bir film önerisiyle başlayan arkadaşlıklar.')}<div class="t-section-head"><h2>Yeni bir arkadaş bul</h2></div><form id="peopleForm" class="t-toolbar"><input class="t-search" id="peopleSearch" aria-label="Görünen ada göre arkadaş ara" placeholder="En az 2 karakterle isim ara…" minlength="2" maxlength="60" required><button class="t-btn">Ara</button></form><div class="t-people" id="peopleResults">${peopleResults()}</div>${incoming.length?`<section class="t-section"><div class="t-section-head"><h2>Gelen istekler · ${incoming.length}</h2></div><div class="t-people">${incoming.map(f=>person(peer(f),`<button class="t-btn" data-accept-friend="${f.id}">Kabul et</button><button class="t-btn secondary" data-delete-friend="${f.id}">Reddet</button>`)).join('')}</div></section>`:''}<section class="t-section"><div class="t-section-head"><h2>Arkadaşların · ${accepted.length}</h2><button class="t-link" data-refresh>Senkronize et ↻</button></div><div class="t-people">${accepted.length?accepted.map(f=>person(peer(f),`<button class="t-btn secondary" data-chat-user="${peer(f).id}">Sohbet et</button><button class="t-link" data-delete-friend="${f.id}" aria-label="${escape(peer(f).display_name)} arkadaşlıktan çıkar">Çıkar</button>`)).join(''):'<div class="t-empty"><h3>İlk film arkadaşını ekle</h3><p>Yukarıdan bir isim ara ve arkadaşlık isteği gönder.</p></div>'}</div></section>${outgoing.length?`<section class="t-section"><div class="t-section-head"><h2>Gönderilen istekler</h2></div><div class="t-people">${outgoing.map(f=>person(peer(f),`<button class="t-btn secondary" data-delete-friend="${f.id}">İptal et</button>`,'Yanıt bekleniyor')).join('')}</div></section>`:''}`;
  }
  function peopleResults() {return view.people.map(p=>{const relation=view.friends.find(f=>f.requester_id===p.id||f.recipient_id===p.id);return person(p,relation?`<span class="t-note">${relation.status==='accepted'?'Arkadaşın':'İstek bekliyor'}</span>`:`<button class="t-btn secondary" data-add-friend="${p.id}">＋ Ekle</button>`)}).join('');}
  function profile() {const p=account();return `${header('Profilim','Film zevkinin küçük karargâhı.')}<div class="t-profile"><span class="t-avatar">${initials(p.display_name)}</span><div><h2 style="margin:0">${escape(p.display_name)}</h2><p class="t-sub">${escape(p.status||'Bir sonraki favorimin peşindeyim.')}</p><div class="t-stats"><div><b>${view.library.filter(x=>x.status==='watched').length}</b><span>İzlenen</span></div><div><b>${view.library.filter(x=>x.favorite).length}</b><span>Favori</span></div><div><b>${view.friends.filter(x=>x.status==='accepted').length}</b><span>Arkadaş</span></div></div></div></div><form id="profileForm" class="t-form"><label>Görünen ad<input name="display_name" minlength="2" maxlength="50" required value="${escape(p.display_name)}"></label><label>Hakkımda<input name="status" maxlength="160" value="${escape(p.status)}" placeholder="En sevdiğin film, bir replik…"></label><div><button class="t-btn">Değişiklikleri kaydet</button> <button type="button" class="t-btn secondary" data-settings>Hesap ve çıkış</button></div></form><section class="t-section"><div class="t-section-head"><h2>Favorilerim</h2></div>${grid(view.library.filter(x=>x.favorite).map(x=>findMovie(x.movie_id)).filter(Boolean))}</section>`;}
  function render() {
    if(view.page==='auth'||(view.page==='chat'&&account()))return;
    let content;
    if(!account()&&!['home','discover'].includes(view.page))content=gate(view.page);
    else content=({home,discover,library,friends,profile}[view.page]||home)();
    $('#cinema').innerHTML=`<div class="t-page">${view.error?`<div class="t-status" role="alert">${escape(view.error)} <button class="t-link" data-refresh>Tekrar dene</button></div>`:''}${view.loading?'<p class="t-note" role="status">Listelerin eşitleniyor…</p>':''}${content}<footer class="t-footer"><span>🦊 Tilki · Birlikte izlenecek çok hikâye var.</span><span>Alfa 0.3 · Özenle seçilmiş 12 yapım</span></footer></div>`;
    $('#catalogSearch')?.addEventListener('input',e=>{view.query=e.target.value;if(view.page==='home'){go('discover');const input=$('#catalogSearch');input.focus();input.setSelectionRange(input.value.length,input.value.length);}else{$('#catalogResults').innerHTML=grid(filtered());$('#resultCount').textContent=`${filtered().length} yapım · Alfa kataloğu`;}});
    $('#catalogSort')?.addEventListener('change',e=>{view.sort=e.target.value;render();});
    $('#peopleForm')?.addEventListener('submit',searchPeople);
    $('#profileForm')?.addEventListener('submit',saveProfile);
  }
  let previousFocus;
  function dialog(html) {closeDialog();previousFocus=document.activeElement;document.body.insertAdjacentHTML('beforeend',`<div class="t-dialog" id="cinemaDialog"><section class="t-dialog-box" role="dialog" aria-modal="true" aria-label="Film ve sosyal işlemler" tabindex="-1"><button class="t-close" data-close-cinema aria-label="Kapat">×</button>${html}</section></div>`);$('.t-dialog-box').focus();}
  function closeDialog() {const existing=$('#cinemaDialog');if(existing){existing.remove();previousFocus?.focus?.();}}
  function detail(id) {const m=findMovie(id);if(!m)return;const saved=view.library.find(x=>x.movie_id===id);dialog(`<div class="t-detail">${poster(m)}<div><span class="t-eyebrow">${m.type==='film'?'FİLM':'DİZİ'} · ${m.year}</span><h2>${escape(m.title)}</h2><span class="t-note">${m.genres.join(' · ')}</span><p>${m.description}</p><div class="t-detail-actions"><select id="movieStatus" aria-label="Kütüphane durumu"><option value="">Listene ekle…</option>${Object.entries(statuses).filter(([k])=>k!=='favorites').map(([k,v])=>`<option value="${k}" ${saved?.status===k?'selected':''}>${v}</option>`).join('')}</select><button class="t-btn" data-save-movie="${id}">${saved?'Listeyi güncelle':'＋ Kütüphaneme ekle'}</button><button class="t-btn secondary" data-favorite="${id}" aria-pressed="${!!saved?.favorite}">${saved?.favorite?'★ Favorilerimde':'☆ Favori'}</button><button class="t-btn secondary" data-share-movie="${id}">◌ Sohbette paylaş</button>${saved?`<button class="t-link" data-remove-movie="${id}">Kütüphaneden kaldır</button>`:''}</div><p class="t-note">Alfa seçkisinden. Film izleme veya yayın hizmeti değildir.</p></div></div>`);}
  async function mutateLibrary(id,changes,remove=false) {
    if(!requireUser({page:'library',movie:id}))return;
    const user=account(),version=view.version;
    const old=view.library.find(x=>x.movie_id===id);
    const row={owner_id:user.id,movie_id:id,status:old?.status||'planned',favorite:old?.favorite||false,...changes};
    const {error}=await(remove?client().from('cinema_library').delete().eq('owner_id',user.id).eq('movie_id',id):client().from('cinema_library').upsert(row));if(error)throw error;
    if(version!==view.version)return;
    view.library=view.library.filter(x=>x.movie_id!==id);if(!remove)view.library.unshift(row);
    render();detail(id);toast(remove?'Kütüphaneden kaldırıldı.':'Kütüphanen güncellendi.');
  }
  async function loadSocial() {
    if(!account())return;
    const version=view.version,id=account().id;view.loading=true;view.error='';render();
    try {
      const [libraryResult,friendResult]=await Promise.all([
        client().from('cinema_library').select('*').eq('owner_id',id).order('updated_at',{ascending:false}),
        client().from('cinema_friendships').select('*,requester:profiles!cinema_friendships_requester_id_fkey(id,display_name,status),recipient:profiles!cinema_friendships_recipient_id_fkey(id,display_name,status)').or(`requester_id.eq.${id},recipient_id.eq.${id}`).order('created_at',{ascending:false})
      ]);
      if(version!==view.version)return;
      if(libraryResult.error||friendResult.error)throw libraryResult.error||friendResult.error;
      view.library=libraryResult.data||[];view.friends=(friendResult.data||[]).filter(x=>x.requester&&x.recipient);
    }catch(error){if(version===view.version)view.error=/42P01|PGRST200|PGRST205/.test(error.code||'')?'Kütüphane ve arkadaşlık kurulumu henüz tamamlanmamış. Proje yöneticisinin alfa veritabanı güncellemesini uygulaması gerekiyor.':'Listeler yüklenemedi. Bağlantını kontrol edip yeniden dene.';}
    finally{if(version===view.version){view.loading=false;render();}}
  }
  async function searchPeople(event) {
    event.preventDefault();const query=$('#peopleSearch').value.trim();if(query.length<2)return;
    const version=view.version,lookup=++view.lookup,button=event.submitter;button.disabled=true;
    try {
      const safe=query.replace(/[\\%_]/g,'');const {data,error}=await client().from('profiles').select('id,display_name,status').neq('id',account().id).ilike('display_name',`%${safe}%`).limit(20);if(error)throw error;if(version!==view.version||lookup!==view.lookup)return;view.people=(data||[]).filter(x=>!bridge().blocked.includes(x.id));
      const results=$('#peopleResults');if(results)results.innerHTML=peopleResults()||'<p class="t-note">Bu isimle bir kullanıcı bulunamadı.</p>';
    }catch(error){toast('Kullanıcılar aranamadı: '+error.message);}finally{button.disabled=false;}
  }
  async function friendAction(action,id) {
    if(!requireUser({page:'friends'}))return;const version=view.version,user=account();
    let result;
    if(action==='add')result=await client().from('cinema_friendships').insert({requester_id:user.id,recipient_id:id});
    if(action==='accept')result=await client().from('cinema_friendships').update({status:'accepted'}).eq('id',id).eq('recipient_id',user.id).select('id').single();
    if(action==='delete')result=await client().from('cinema_friendships').delete().eq('id',id).select('id').single();
    if(result.error)throw result.error;if(version!==view.version)return;await loadSocial();toast(action==='add'?'Arkadaşlık isteği gönderildi.':action==='accept'?'Arkadaşlık isteği kabul edildi.':'İstek veya arkadaşlık kaldırıldı.');
  }
  async function startChat(id) {
    if(!requireUser({page:'chat'}))return;
    const friend=view.friends.find(f=>f.status==='accepted'&&(f.requester_id===id||f.recipient_id===id));
    const peer=friend?(friend.requester_id===id?friend.requester:friend.recipient):bridge().contacts.find(c=>c.id===id);
    if(!peer)throw new Error('Önce arkadaş eklemelisin.');
    await bridge().openContact(peer);closeDialog();go('chat');
  }
  function share(id) {
    if(!requireUser({page:'friends',share:id}))return;
    const peers=new Map();view.friends.filter(f=>f.status==='accepted').forEach(f=>{const p=f.requester_id===account().id?f.recipient:f.requester;peers.set(p.id,p)});bridge().contacts.forEach(p=>peers.set(p.id,p));
    dialog(`<h2>Bir film önerisi gönder</h2><p class="t-sub">${escape(findMovie(id).title)} için bir sohbet seç.</p><div class="t-section t-people">${peers.size?[...peers.values()].map(p=>person(p,`<button class="t-btn secondary" data-send-film="${id}" data-peer="${p.id}">Gönder</button>`)).join(''):'<div class="t-empty"><p>Henüz sohbet edeceğin biri yok.</p><button class="t-btn" data-page="friends" data-close-cinema>Arkadaş bul</button></div>'}</div>`);
  }
  async function saveProfile(event) {
    event.preventDefault();const form=event.currentTarget,button=event.submitter,user=account(),version=view.version;
    const row={display_name:form.elements.display_name.value.trim(),status:form.elements.status.value.trim()};if(row.display_name.length<2)return toast('Görünen ad en az 2 karakter olmalı.');button.disabled=true;
    try{const {error}=await client().from('profiles').update(row).eq('id',user.id);if(error)throw error;if(version!==view.version)return;Object.assign(user,row);nav();render();toast('Profilin güncellendi.');}catch(error){toast('Profil kaydedilemedi: '+error.message);}finally{button.disabled=false;}
  }
  async function sessionChanged() {
    const user=account();if((user?.id||null)===view.user){nav();return;}
    view.version++;view.user=user?.id||null;view.channel?.unsubscribe();view.channel=null;view.library=[];view.friends=[];view.people=[];view.error='';view.loading=false;
    if(user){
      const refresh=()=>{clearTimeout(sessionChanged.timer);sessionChanged.timer=setTimeout(loadSocial,250)};view.channel=client().channel(`tilki-social-${user.id}`).on('postgres_changes',{event:'*',schema:'public',table:'cinema_library',filter:`owner_id=eq.${user.id}`},refresh).on('postgres_changes',{event:'*',schema:'public',table:'cinema_friendships',filter:`requester_id=eq.${user.id}`},refresh).on('postgres_changes',{event:'*',schema:'public',table:'cinema_friendships',filter:`recipient_id=eq.${user.id}`},refresh).subscribe();
      const version=view.version,pending=view.pending;view.pending=null;go(bridge()?.recovery?'auth':pending?.page||(view.page==='auth'?'home':view.page));await loadSocial();if(version!==view.version)return;if(pending?.movie)detail(pending.movie);if(pending?.share)share(pending.share);
    }else go('home');
  }
  document.addEventListener('click',async event=>{
    const button=event.target.closest('button');if(!button)return;
    if(event.target.id==='cinemaDialog')closeDialog();
    const d=button.dataset;const handled=Object.keys(d).some(k=>['page','signin','movie','genre','type','tab','closeCinema','saveMovie','favorite','removeMovie','shareMovie','addFriend','acceptFriend','deleteFriend','chatUser','sendFilm','refresh','settings'].includes(k));if(!handled)return;
    try{
      if('closeCinema' in d)closeDialog();
      if(d.page){closeDialog();go(d.page);return;}
      if(d.signin){view.pending={page:d.signin};go('auth');return;}
      if(d.movie)return detail(d.movie);
      if(d.genre){view.genre=d.genre;return render();}
      if(d.type){view.type=d.type;return render();}
      if(d.tab){view.tab=d.tab;return render();}
      if(d.shareMovie)return share(d.shareMovie);
      if('settings' in d)return bridge().settings();
      button.disabled=true;
      if(d.saveMovie)await mutateLibrary(d.saveMovie,{status:$('#movieStatus').value||'planned'});
      if(d.favorite)await mutateLibrary(d.favorite,{favorite:!view.library.find(x=>x.movie_id===d.favorite)?.favorite});
      if(d.removeMovie)await mutateLibrary(d.removeMovie,{},true);
      if(d.addFriend)await friendAction('add',d.addFriend);
      if(d.acceptFriend)await friendAction('accept',d.acceptFriend);
      if(d.deleteFriend)await friendAction('delete',d.deleteFriend);
      if(d.chatUser)await startChat(d.chatUser);
      if(d.sendFilm){await startChat(d.peer);const ok=await bridge().sendFilm(d.sendFilm);if(ok)toast('Film önerisi gönderildi.');}
      if('refresh' in d)await loadSocial();
    }catch(error){toast(error.code==='23505'?'Bu kullanıcıyla zaten bir arkadaşlık veya bekleyen istek var.':'İşlem tamamlanamadı: '+error.message);}finally{button.disabled=false;}
  });
  document.addEventListener('click',e=>{if(e.target.id==='cinemaDialog')closeDialog();});
  document.addEventListener('keydown',event=>{
    const box=$('#cinemaDialog');if(!box)return;
    if(event.key==='Escape')closeDialog();
    if(event.key==='Tab'){const nodes=[...box.querySelectorAll('button:not(:disabled),input,select,[href]')];const first=nodes[0],last=nodes.at(-1);if(event.shiftKey&&(document.activeElement===first||document.activeElement===$('.t-dialog-box'))){event.preventDefault();last?.focus();}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first?.focus();}}
  });
  window.addEventListener('popstate',()=>go(location.hash.slice(1)||'home',false));
  window.addEventListener('tilki-session',sessionChanged);
  window.addEventListener('tilki-movie',event=>detail(event.detail));
  window.TilkiCinema={go,detail};
  go(location.hash.slice(1)||'home',false);
})();
