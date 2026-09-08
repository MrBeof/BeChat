const fs=require('node:fs');
const path=require('node:path');
const {execFileSync}=require('node:child_process');
const vm=require('node:vm');
const sandbox={window:{}};
vm.runInNewContext(fs.readFileSync('supabase-config.js','utf8'),sandbox);
const key=sandbox.window.CIPHERCHAT_CONFIG?.supabaseAnonKey||'';
if(key.startsWith('sb_secret_'))throw Error('Secret Supabase keys must never be shipped to the browser.');
if(key.split('.').length===3){const claims=JSON.parse(Buffer.from(key.split('.')[1],'base64url').toString());if(claims.role!=='anon')throw Error('Only an anon/public Supabase key may be published.');}
for(const name of ['app.js','cinema.js','catalog.js'])execFileSync(process.execPath,['--check',name]);
execFileSync(process.execPath,['prepare-setup.cjs']);
fs.mkdirSync('dist',{recursive:true});
for(const name of ['index.html','app.js','cinema.js','catalog.js','styles.css','cinema.css','supabase-config.js'])fs.copyFileSync(name,path.join('dist',name));
console.log('Static build ready: dist');
