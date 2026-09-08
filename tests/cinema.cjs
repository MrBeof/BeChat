const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
function setup(){
  const nodes=new Map(),events={},calls=[];
  function node(){return {innerHTML:'',hidden:false,focus(){},remove(){},classList:{add(){},remove(){}},addEventListener(){}};}
  for(const id of ['#navigation','#socialPane','#cinema','#toast'])nodes.set(id,node());
  const document={activeElement:null,querySelector:s=>nodes.get(s)||null,querySelectorAll:()=>[],addEventListener:(name,fn)=>{(events[name]??=[]).push(fn)},body:{insertAdjacentHTML(_,html){nodes.set('dialogHTML',html);nodes.set('#cinemaDialog',node());nodes.set('.t-dialog-box',node());}}};
  const window={addEventListener(){},scrollTo(){}};
  const context={window,document,location:{hash:''},history:{pushState(){}},crypto:globalThis.crypto,setTimeout,clearTimeout,console};
  vm.createContext(context);vm.runInContext(fs.readFileSync('catalog.js','utf8'),context);
  const code=fs.readFileSync('cinema.js','utf8').replace("  go(location.hash.slice(1)||'home',false);","  window.testing={view,filtered,mutateLibrary,friendAction,requireUser,detail,render};\n  go(location.hash.slice(1)||'home',false);");
  vm.runInContext(code,context);return {window,nodes,calls,...window.testing};
}
test('guest immediately sees catalog, no login wall',()=>{const x=setup();assert.match(x.nodes.get('#cinema').innerHTML,/Interstellar/);assert.equal(x.nodes.get('#socialPane').hidden,true);assert.equal(x.nodes.get('#cinema').hidden,false);});
test('guest social navigation displays sign-in gate',()=>{const x=setup();x.window.TilkiCinema.go('friends');assert.match(x.nodes.get('#cinema').innerHTML,/Giriş yap \/ Kayıt ol/);assert.doesNotMatch(x.nodes.get('#cinema').innerHTML,/peopleSearch/);});
test('genre, type, text and sorting combine correctly',()=>{const x=setup();Object.assign(x.view,{genre:'Bilim Kurgu',type:'series',query:'dark'});assert.deepEqual(Array.from(x.filtered(),m=>m.id),['dark']);Object.assign(x.view,{genre:'Tümü',type:'all',query:'',sort:'newest'});assert.equal(x.filtered()[0].id,'dune-part-two');});
test('anonymous save never writes data and retains intended movie',async()=>{const x=setup();await x.mutateLibrary('interstellar',{favorite:true});assert.equal(x.view.library.length,0);assert.equal(x.view.page,'auth');assert.equal(x.view.pending.movie,'interstellar');});
test('failed database mutation keeps previous library',async()=>{const x=setup();x.window.TilkiChat={profile:{id:'user',display_name:'Test'},client:{from(){return {upsert:async()=>({error:{message:'offline'}})}}}};await assert.rejects(x.mutateLibrary('interstellar',{favorite:true}));assert.equal(x.view.library.length,0);});
test('user-controlled names are escaped in profile view',()=>{const x=setup();x.window.TilkiChat={profile:{id:'u',display_name:'<img src=x onerror=alert(1)>',status:'<script>bad</script>'}};x.window.TilkiCinema.go('profile');const html=x.nodes.get('#cinema').innerHTML;assert.doesNotMatch(html,/<img src=x/);assert.match(html,/&lt;img/);assert.doesNotMatch(html,/<script>bad/);});
test('all catalog identifiers have database allowlist entries',()=>{const x=setup(),sql=fs.readFileSync('cinema.sql','utf8');assert.equal(new Set(x.window.TILKI_CATALOG.map(m=>m.id)).size,12);for(const movie of x.window.TILKI_CATALOG)assert.ok(sql.includes("'"+movie.id+"'"));});
