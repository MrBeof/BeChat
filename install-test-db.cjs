// Optional test-only PostgreSQL WASM runtime. Never included in the site build.
const fs=require('node:fs');
const path=require('node:path');
const {createHash}=require('node:crypto');
const {execFileSync}=require('node:child_process');
(async()=>{
  const version='0.5.8';
  const metadata=await fetch('https://registry.npmjs.org/@electric-sql/pglite/'+version).then(r=>{if(!r.ok)throw Error('Package metadata unavailable');return r.json();});
  const response=await fetch(metadata.dist.tarball);if(!response.ok)throw Error('Package download failed');
  const bytes=Buffer.from(await response.arrayBuffer());
  if('sha512-'+createHash('sha512').update(bytes).digest('base64')!==metadata.dist.integrity)throw Error('Package integrity mismatch');
  const dir=path.join(__dirname,'.test-tools');fs.mkdirSync(dir,{recursive:true});
  const archive=path.join(dir,'pglite.tgz');fs.writeFileSync(archive,bytes);
  execFileSync('tar',['-xzf',archive,'-C',dir]);
  console.log('PGlite '+version+' test runtime ready.');
})().catch(error=>{console.error(error.message);process.exitCode=1});
