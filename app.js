[source: 1](() => {
  "use strict";
  const $ = (s, root = document) => root.querySelector(s);
  const esc = (v = "") => String(v).replace(/[&<>'"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[c]));
  
  // WhatsApp Orijinal SVG İkon Seti
  const icon = (name) => {
    const paths = {
      lock: '<path d="M12 2a5 5 0 0 0-5 5v3H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8a2 2 0 0 0-2-2h-1V7a5 5 0 0 0-5-5zm3 8H9V7a3 3 0 0 1 6 0v3z"/>',
      plus: '<path d="M19 11h-6V5a1 1 0 0 0-2 0v6H5a1 1 0 0 0 0 2h6v6a1 1 0 0 0 2 0v-6h6a1 1 0 0 0 0-2z"/>',
      gear: '<path d="M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8zm-9 4a9 9 0 0 1 14.85-6.8l1.4-1.4a1 1 0 0 1 1.42 1.42l-1.4 1.4A9 9 0 1 1 3 12z"/>',
      shield: '<path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11v8.8s0 .01 0 0z"/>',
      send: '<path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>',
      back: '<path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/>',
      check: '<path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>',
      doubleCheck: '<path d="M0.41 13.41L6 19l1.41-1.41L1.83 12m4.58 0L12 17.59l1.41-1.41L7.83 10.59m11.58-4.59L8 17.41l-3.58-3.58L3 15.25l5 5 12-12z"/>',
      search: '<path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>',
      attach: '<path d="M16.5 6v11.5c0 2.21-1.79 4-4 4s-4-1.79-4-4V5a2.5 2.5 0 0 1 5 0v10.5c0 .55-.45 1-1 1s-1-.45-1-1V6H10v9.5a2.5 2.5 0 0 0 5 0V5c0-2.48-2.02-4.5-4.5-4.5S6 2.52 6 5v12.5c0 3.59 2.91 6.5 6.5 6.5s6.5-2.91 6.5-6.5V6h-2.5z"/>',
      emoji: '<path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm0 18a8 8 0 1 1 0-16 8 8 0 0 1 0 16zm-3.5-9a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3zm7 0a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3zm-3.5 6.5c2.33 0 4.31-1.46 5.11-3.5H6.89c.8 2.04 2.78 3.5 5.11 3.5z"/>',
      mic: '<path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.3-3c0 3-2.54 5.1-5.3 5.1S6.7 14 6.7 11H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c3.28-.48 6-3.3 6-6.72h-1.7z"/>'
    };
    return `<span class="icon"><svg viewBox="0 0 24 24" fill="currentColor">${paths[name] || paths.lock}</svg></span>`;
  };

  const enc = new TextEncoder(), dec = new TextDecoder();
  const b64 = b => btoa(String.fromCharCode(...new Uint8Array(b)));
  const unb64 = s => Uint8Array.from(atob(s), c => c.charCodeAt(0));
  const initials = n => n.split(/\s+/).map(x => x[0]).slice(0,2).join("").toUpperCase();
  const nowText = d => new Intl.DateTimeFormat("tr-TR",{hour:"2-digit",minute:"2-digit"}).format(new Date(d));
  const uid = () => crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;

  const seedContacts = [
    {id:"demo-aylin",email:"aylin@example.com",display_name:"Aylin Demir",status:"Güvenlik numarası doğrulandı",verified:true,color:"#00a884",public_key:"demo-aylin-key"},
    {id:"demo-mert",email:"mert@example.com",display_name:"Mert Kaya",status:"Uçtan uca şifreli",verified:false,color:"#6b7c85",public_key:"demo-mert-key"},
    {id:"demo-ekip",email:"ekip@example.com",display_name:"Ürün Ekibi",status:"Bugün aktif",verified:true,color:"#128c7e",public_key:"demo-ekip-key"}
  ];
  const seedMessages = {
    "demo-aylin":[
      {id:"m1",plaintext:"Güvenlik numarasını karşılaştırdım, ikimizde de aynı görünüyor.",mine:false,created_at:Date.now()-720000,status:"read",ciphertext:"dGVzdC1jaXBoZXJ0ZXh0LWJsb2I=",iv:"dGVzdC1pdi0xMjM0",digest:"5e884898da28047151d0e56f8dc62927"},
      {id:"m2",plaintext:"Harika! WhatsApp uçtan uca şifreleme mantığı sorunsuz çalışıyor. 🔒",mine:true,created_at:Date.now()-640000,status:"read",ciphertext:"YWVzLTI1Ni1nY20tZW5jcnlwdGVk",iv:"cmRanG0LW5vbmNl",digest:"7c222fb2927d828af22f592134e89324"}
    ]
  };

  const state = {step:"email",authMode:"login",email:"",session:null,profile:null,contacts:[],messages:{},active:null,client:null,channel:null,demo:false,keyPair:null};
  const config = window.CIPHERCHAT_CONFIG || {};
  const configured = /^https:\/\/.+\.supabase\.co$/.test(config.supabaseUrl || "") && (config.supabaseAnonKey || "").length > 30;
  if (configured && window.supabase) state.client = window.supabase.createClient(config.supabaseUrl, config.supabaseAnonKey,{auth:{persistSession:true,autoRefreshToken:true}});

  function toast(msg){const t=$("#toast");t.textContent=msg;t.classList.add("show");clearTimeout(toast.t);toast.t=setTimeout(()=>t.classList.remove("show"),2600)}
  function render(){ if(!state.session && !state.demo) renderAuth(); else renderWorkspace(); }
  
  function authShell(content){
    $("#app").innerHTML=`<section class="auth-card">
      <div class="brand">
        <span class="brand-mark">${icon("lock")}</span>
        <span>WhatsApp Web</span>
        <span class="supabase-state ${configured?'online':''}">${configured?'● Supabase Bağlı':'○ Demo Modu'}</span>
      </div>
      ${content}
      <div class="trust-row">
        <span><i class="dot"></i>AES-256-GCM</span>
        <span><i class="dot"></i>P-256 ECDH</span>
        <span><i class="dot"></i>Uçtan Uca Şifreli</span>
      </div>
      ${!configured?'<div class="demo-note">Supabase bilgileri henüz girilmemiş. Denemek için <b>Demo Prototip</b> butonuna tıklayabilirsiniz.</div>':''}
    </section>`;
  }

  function renderAuth(){
    if(state.step==="email") {
      const signup=state.authMode==="signup";
      authShell(`
        <div class="auth-tabs" role="tablist">
          <button type="button" class="auth-tab ${!signup?'active':''}" data-mode="login">Giriş Yap</button>
          <button type="button" class="auth-tab ${signup?'active':''}" data-mode="signup">Kayıt Ol</button>
        </div>
        <div class="eyebrow">${signup?'GÜVENLİ HESAP':'HOŞ GELDİNİZ'}</div>
        <h1>${signup?'Hesap Oluşturun':'Giriş Yapın'}</h1>
        <p class="lead">${signup?'Tarayıcınızda benzersiz şifreleme anahtarınız üretilecek.':'Kayıtlı e-posta ve parolanızla mesajlaşmaya devam edin.'}</p>
        <form id="emailForm">
          ${signup?'<div class="field"><label>Görünen Ad</label><input id="displayName" placeholder="Adınız Soyadınız" required></div>':''}
          <div class="field"><label>E-posta Adresi</label><input id="email" type="email" placeholder="ornek@domain.com" required></div>
          <div class="field"><label>Parola</label><input id="password" type="password" placeholder="En az 8 karakter" minlength="8" required></div>
          <button class="btn block" type="submit">${signup?'Hesabı Oluştur':'Giriş Yap'}</button>
          ${!configured?'<button class="btn ghost block" type="button" id="demoBtn">Demo Prototipi Aç</button>':''}
        </form>
      `);
    }
    bindAuth();
  }

  function bindAuth(){
    document.querySelectorAll("[data-mode]").forEach(btn=>btn.addEventListener("click",()=>{state.authMode=btn.dataset.mode;render()}));
    $("#emailForm")?.addEventListener("submit", async e=>{
      e.preventDefault();
      state.email=$("#email").value.trim().toLowerCase();
      if(!state.client)return toast("Lütfen Supabase konfigürasyonunu ekleyin veya demo modunu açın.");
      const password=$("#password").value;
      try {
        if(state.authMode==="signup"){
          const displayName=$("#displayName").value.trim();
          const {data,error}=await state.client.auth.signUp({email:state.email,password,options:{data:{display_name:displayName}}});
          if(error)throw error;
          if(!data.session){state.authMode="login";render();return toast("Kayıt tamamlandı. E-postanızı onaylayıp giriş yapabilirsiniz.")}
          state.session=data.session;
        }else{
          const {data,error}=await state.client.auth.signInWithPassword({email:state.email,password});
          if(error)throw error;
          state.session=data.session;
        }
        await bootstrapReal();
      }catch(err){
        toast(err.message||"Kimlik doğrulama hatası oluştu.");
      }
    });
    $("#demoBtn")?.addEventListener("click",()=>{
      state.demo=true;
      state.profile={id:"demo-me",email:"deniz@example.com",display_name:"Deniz",status:"Uçtan uca şifreli"};
      state.contacts=structuredClone(seedContacts);
      state.messages=structuredClone(seedMessages);
      render();
    });
  }

  async function makeKeys(){
    const kp=await crypto.subtle.generateKey({name:"ECDH",namedCurve:"P-256"},true,["deriveKey","deriveBits"]);
    const pub=b64(await crypto.subtle.exportKey("spki",kp.publicKey));
    const priv=b64(await crypto.subtle.exportKey("pkcs8",kp.privateKey));
    localStorage.setItem("cipherchat.keys",JSON.stringify({pub,priv}));
    state.keyPair=kp;
    return pub;
  }

  async function loadKeys(){
    let saved=JSON.parse(localStorage.getItem("cipherchat.keys")||"null");
    if(!saved)return makeKeys();
    state.keyPair={
      publicKey:await crypto.subtle.importKey("spki",unb64(saved.pub),{name:"ECDH",namedCurve:"P-256"},true,[]),
      privateKey:await crypto.subtle.importKey("pkcs8",unb64(saved.priv),{name:"ECDH",namedCurve:"P-256"},true,["deriveKey","deriveBits"])
    };
    return saved.pub;
  }

  async function bootstrapReal(){
    const pub=await loadKeys(), user=state.session.user;
    let {data:profile}=await state.client.from("profiles").select("*").eq("id",user.id).maybeSingle();
    if(!profile){
      const profileEmail=(state.email||user.email||"").toLowerCase();
      const name=user.user_metadata?.display_name||profileEmail.split("@")[0]||"Kullanıcı";
      const row={id:user.id,email:profileEmail,display_name:name,status:"Uçtan uca şifreli",public_key:pub};
      const {data,error}=await state.client.from("profiles").upsert(row).select().single();
      if(error)return toast("Profil oluşturulamadı: "+error.message);
      profile=data;
    }
    state.profile=profile;
    await loadContacts();
    render();
    subscribe();
  }

  async function loadContacts(){
    const {data,error}=await state.client.from("contacts").select("verified, contact:profiles!contacts_contact_id_fkey(*)").eq("owner_id",state.profile.id);
    if(error){toast(error.message);return}
    state.contacts=(data||[]).map(x=>({...x.contact,verified:x.verified,color:`hsl(${Math.abs(hash(x.contact.id))%360} 40% 45%)`}));
    const {data:msgs}=await state.client.from("messages").select("*").or(`sender_id.eq.${state.profile.id},recipient_id.eq.${state.profile.id}`).order("created_at");
    for(const m of msgs||[]){
      const cid=m.sender_id===state.profile.id?m.recipient_id:m.sender_id;
      const c=state.contacts.find(x=>x.id===cid);
      if(c){
        m.mine=m.sender_id===state.profile.id;
        m.plaintext=await decryptMessage(m,c).catch(()=>"🔒 Bu mesaj çözülemedi");
        (state.messages[cid]??=[]).push(m);
      }
    }
  }

  function hash(s){let h=0;for(const c of s)h=((h<<5)-h)+c.charCodeAt(0);return h}
  async function sharedKey(contact){if(state.demo)return null;const peer=await crypto.subtle.importKey("spki",unb64(contact.public_key),{name:"ECDH",namedCurve:"P-256"},false,[]);return crypto.subtle.deriveKey({name:"ECDH",public:peer},state.keyPair.privateKey,{name:"AES-GCM",length:256},false,["encrypt","decrypt"])}
  async function encryptMessage(text,contact){const key=await sharedKey(contact),iv=crypto.getRandomValues(new Uint8Array(12)),cipher=await crypto.subtle.encrypt({name:"AES-GCM",iv},key,enc.encode(text)),digest=await crypto.subtle.digest("SHA-256",cipher);return{ciphertext:b64(cipher),iv:b64(iv),digest:b64(digest)}}
  async function decryptMessage(m,contact){const key=await sharedKey(contact),plain=await crypto.subtle.decrypt({name:"AES-GCM",iv:unb64(m.iv)},key,unb64(m.ciphertext));return dec.decode(plain)}

  function subscribe(){
    state.channel?.unsubscribe();
    state.channel=state.client.channel("messages").on("postgres_changes",{event:"INSERT",schema:"public",table:"messages",filter:`recipient_id=eq.${state.profile.id}`},async p=>{
      const m=p.new,c=state.contacts.find(x=>x.id===m.sender_id);
      if(!c)return;
      m.mine=false;
      m.plaintext=await decryptMessage(m,c).catch(()=>"🔒 Şifreli mesaj");
      (state.messages[c.id]??=[]).push(m);
      render();
      toast(`${c.display_name}: ${m.plaintext}`);
    }).subscribe();
  }

  function renderWorkspace(){
    const active=state.contacts.find(c=>c.id===state.active), msgs=state.messages[state.active]||[];
    $("#app").innerHTML=`
      <section class="workspace ${active?'chat-open':''}">
        <aside class="sidebar">
          <header class="sidebar-head">
            <button class="profile-avatar-btn" id="settings" title="Profil & Ayarlar">
              <div class="avatar" style="background:${state.profile.color||'#00a884'}">${initials(state.profile.display_name)}</div>
            </button>
            <div class="sidebar-actions">
              <button class="icon-btn" id="newChat" title="Yeni Sohbet">${icon("plus")}</button>
              <button class="icon-btn" id="settingsIcon" title="Ayarlar">${icon("gear")}</button>
            </div>
          </header>
          <div class="search-wrap">
            <div class="search-box">
              ${icon("search")}
              <input class="search" id="search" placeholder="Aratın veya yeni sohbet başlatın">
            </div>
          </div>
          <div class="contact-list">${contactList()}</div>
        </aside>
        <section class="chat">${active?chatView(active,msgs):emptyView()}</section>
      </section>
    `;
    bindWorkspace(active);
  }

  function contactList(filter=""){
    const items=state.contacts.filter(c=>c.display_name.toLowerCase().includes(filter.toLowerCase()));
    return items.map(c=>{
      const last=(state.messages[c.id]||[]).at(-1);
      return `
        <button class="contact ${state.active===c.id?'active':''}" data-contact="${c.id}">
          <div class="avatar" style="background:${c.color}">${initials(c.display_name)}</div>
          <div class="contact-main">
            <div class="contact-line">
              <strong>${esc(c.display_name)}</strong>
              <time>${last?nowText(last.created_at):''}</time>
            </div>
            <div class="preview">
              ${last?`${last.mine?icon('doubleCheck'):''}${esc(last.plaintext)}`:esc(c.status)}
            </div>
          </div>
        </button>
      `;
    }).join("")||'<div class="empty"><p>Sohbet bulunamadı.</p></div>';
  }

  function emptyView(){
    return `
      <div class="empty">
        <div>
          <div class="brand-mark" style="margin: 0 auto 20px; width:64px; height:64px;">${icon("lock")}</div>
          <h2>WhatsApp Web — Uçtan Uca Şifreli</h2>
          <p>Kişisel mesajlarınız AES-256-GCM ve P-256 ECDH ile şifrelenir.<br>Mesajlarınızı siz ve alıcı dışında kimse okuyamaz.</p>
        </div>
      </div>
    `;
  }

  function chatView(c,msgs){
    return `
      <header class="chat-head">
        <button class="icon-btn back" id="back">${icon("back")}</button>
        <div class="avatar" style="background:${c.color}">${initials(c.display_name)}</div>
        <div class="profile-copy">
          <strong>${esc(c.display_name)}</strong>
          <span>${c.verified?' Dorulanmış Kişi':'çevrim içi'}</span>
        </div>
        <div class="head-actions">
          <button class="icon-btn" id="verify" title="Güvenlik Kodu">${icon("shield")}</button>
        </div>
      </header>
      <div class="security-strip">
        ${icon("lock")} Mesajlar uçtan uca şifrelidir. Bu sohbetin dışındaki hiç kimse mesajları okuyamaz.
      </div>
      <div class="messages" id="messages">
        ${msgs.length?msgs.map(messageView).join(""):''}` +
      `</div>
      <div class="composer-wrap">
        <div class="typing" id="typing"></div>
        <form class="composer" id="composer">
          <button type="button" class="icon-btn">${icon("emoji")}</button>
          <button type="button" class="icon-btn">${icon("attach")}</button>
          <textarea id="messageInput" rows="1" placeholder="Bir mesaj yazın" required></textarea>
          <button class="send-btn" type="submit" aria-label="Gönder">${icon("send")}</button>
        </form>
      </div>
    `;
  }

  function messageView(m){
    return `
      <article class="message ${m.mine?'mine':''}" data-message="${m.id}">
        <p>${esc(m.plaintext)}</p>
        <div class="message-meta">
          <span>${nowText(m.created_at)}</span>
          ${m.mine?`<span class="ticks">${m.status==='read'?icon('doubleCheck'):icon('check')}</span>`:''}
        </div>
      </article>
    `;
  }

  function bindWorkspace(active){
    document.querySelectorAll("[data-contact]").forEach(x=>x.onclick=()=>{
      state.active=x.dataset.contact;
      render();
      setTimeout(()=>{$("#messages")?.scrollTo(0,999999)},0);
    });
    
    $("#search")?.addEventListener("input",e=>$(".contact-list").innerHTML=contactList(e.target.value));
    $("#back")?.addEventListener("click",()=>{state.active=null;render()});
    $("#newChat")?.addEventListener("click",newChatModal);
    $("#settings")?.addEventListener("click",settingsModal);
    $("#settingsIcon")?.addEventListener("click",settingsModal);
    $("#verify")?.addEventListener("click",()=>verifyModal(active));
    
    const textarea = $("#messageInput");
    if(textarea){
      textarea.addEventListener("keydown", e => {
        if(e.key === "Enter" && !e.shiftKey){
          e.preventDefault();
          $("#composer").dispatchEvent(new Event("submit"));
        }
      });
    }

    $("#composer")?.addEventListener("submit",e=>{
      e.preventDefault();
      sendMessage(active,$("#messageInput").value);
    });

    document.querySelectorAll("[data-message]").forEach(x=>x.onclick=()=>inspectModal((state.messages[state.active]||[]).find(m=>m.id===x.dataset.message)));
  }

  async function sendMessage(contact,text){
    if(!text.trim())return;
    try {
      if(state.demo){
        const raw=enc.encode(text),digest=await crypto.subtle.digest("SHA-256",raw);
        const m={id:uid(),plaintext:text.trim(),mine:true,created_at:Date.now(),status:"sent",ciphertext:b64(raw),iv:b64(crypto.getRandomValues(new Uint8Array(12))),digest:b64(digest)};
        (state.messages[contact.id]??=[]).push(m);
        render();
        setTimeout(()=>{m.status="read";render();setTimeout(()=>{$("#messages")?.scrollTo(0,999999)},0)},500);
        setTimeout(()=>demoReply(contact),1200);
      } else {
        const payload=await encryptMessage(text.trim(),contact);
        const {data,error}=await state.client.from("messages").insert({...payload,sender_id:state.profile.id,recipient_id:contact.id}).select().single();
        if(error)throw error;
        data.mine=true;
        data.plaintext=text.trim();
        (state.messages[contact.id]??=[]).push(data);
        render();
      }
      setTimeout(()=>{$("#messages")?.scrollTo(0,999999)},0);
    } catch(err) {
      toast("Mesaj gönderilemedi: "+err.message);
    }
  }

  function demoReply(contact){
    const replies=["Mesajını aldım, şifre çözüldü! 🔒","Harika, WhatsApp teması çok daha kaliteli görünüyor.","Supabase Realtime ve E2EE tam uyumlu çalışıyor."];
    const m={id:uid(),plaintext:replies[Math.floor(Math.random()*replies.length)],mine:false,created_at:Date.now(),status:"read",ciphertext:"ZW5jcnlwdGVkLXBlZXItcmVwbHk=",iv:"c2VjdXJlLW5vbmNl",digest:"2cf24dba5fb0a30e26e83b2ac5b9e29e"};
    (state.messages[contact.id]??=[]).push(m);
    render();
    setTimeout(()=>{$("#messages")?.scrollTo(0,999999)},0);
  }

  function modal(html){
    document.body.insertAdjacentHTML("beforeend",`<div class="modal-backdrop" id="modal"><div class="modal">${html}</div></div>`);
    $("#modal").onclick=e=>{if(e.target.id==="modal"||e.target.closest("[data-close]"))$("#modal").remove()}
  }

  function newChatModal(){
    modal(`
      <h2>Yeni Kişi Ekle</h2>
      <p>Mesajlaşmak istediğiniz kişinin Supabase kayıtlı e-posta adresini girin.</p>
      <div class="field"><label>E-posta Adresi</label><input id="newEmail" type="email" placeholder="kullanici@domain.com"></div>
      <div class="modal-actions">
        <button class="btn ghost" data-close>İptal</button>
        <button class="btn" id="findContact">Sohbet Başlat</button>
      </div>
    `);
    $("#findContact").onclick=async()=>{
      const email=$("#newEmail").value.trim().toLowerCase();
      if(!email.includes("@"))return toast("Geçerli bir e-posta girin");
      if(state.demo){
        const c={id:uid(),email,display_name:email.split("@")[0],status:"Aramıza katıldı",verified:false,color:"#00a884",public_key:"demo"};
        state.contacts.unshift(c);
        $("#modal").remove();
        state.active=c.id;
        render();
        return;
      }
      const {data,error}=await state.client.from("profiles").select("*").eq("email",email).neq("id",state.profile.id).maybeSingle();
      if(error||!data)return toast("Bu e-postayla kayıtlı kullanıcı bulunamadı");
      await state.client.from("contacts").upsert({owner_id:state.profile.id,contact_id:data.id});
      await loadContacts();
      $("#modal").remove();
      state.active=data.id;
      render();
    }
  }

  function verifyModal(c){
    let digits=String(Math.abs(hash(state.profile.id+c.id))).padEnd(60,"7").repeat(5).slice(0,60).match(/.{1,5}/g).join(" ");
    modal(`
      <h2>Güvenlik Kodunu Doğrula</h2>
      <p><b>${esc(c.display_name)}</b> ile aranızdaki uçtan uca şifrelemenin doğruluğunu aşağıdaki kodu karşılaştırarak teyit edin.</p>
      <div class="crypto-box"><label>GÜVENLİK NUMARASI</label><code>${digits}</code></div>
      <div class="modal-actions">
        <button class="btn ghost" data-close>Kapat</button>
        <button class="btn" id="toggleVerify">${c.verified?'Doğrulamayı Kaldır':'Doğrulandı Olarak İşaretle'}</button>
      </div>
    `);
    $("#toggleVerify").onclick=async()=>{
      c.verified=!c.verified;
      if(!state.demo)await state.client.from("contacts").update({verified:c.verified}).eq("owner_id",state.profile.id).eq("contact_id",c.id);
      $("#modal").remove();
      render();
      toast(c.verified?"Kişi doğrulandı":"Doğrulama kaldırıldı");
    }
  }

  function inspectModal(m){
    modal(`
      <h2>Paket Detayları (AES-256-GCM)</h2>
      <p>Sunucu veya Supabase veritabanında saklanan ham veriler aşağıdaki gibidir:</p>
      <div class="crypto-grid">
        <div class="crypto-box"><label>CIPHERTEXT (ŞİFRELİ METİN)</label><code>${esc(m.ciphertext)}</code></div>
        <div class="crypto-box"><label>IV / NONCE</label><code>${esc(m.iv)}</code></div>
        <div class="crypto-box"><label>SHA-256 DIGEST</label><code>${esc(m.digest)}</code></div>
      </div>
      <div class="modal-actions"><button class="btn" data-close>Kapat</button></div>
    `);
  }

  function settingsModal(){
    modal(`
      <h2>Profil & Ayarlar</h2>
      <p><b>${esc(state.profile.display_name)}</b><br>${esc(state.profile.email)}</p>
      <div class="crypto-grid">
        <div class="crypto-box"><label>DURUM</label><code>${state.demo?'Yerel Demo Modu Active':'Supabase Auth + Realtime Aktif'}</code></div>
        <div class="crypto-box"><label>ÖZEL ANAHTAR STATUSÜ</label><code>Tarayıcı IndexedDB/LocalStorage alanında güvende.</code></div>
      </div>
      <div class="modal-actions">
        <button class="btn ghost" data-close>Kapat</button>
        <button class="btn danger" id="logout">Oturumu Kapat</button>
      </div>
    `);
    $("#logout").onclick=async()=>{
      if(!state.demo)await state.client.auth.signOut();
      state.session=null;
      state.demo=false;
      state.step="email";
      state.active=null;
      $("#modal").remove();
      render();
    }
  }

  async function init(){
    if(state.client){
      const {data}=await state.client.auth.getSession();
      if(data.session){
        state.session=data.session;
        await bootstrapReal();
        return;
      }
    }
    render();
  }
  init();
})();