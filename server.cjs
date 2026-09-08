const http=require('node:http');
const fs=require('node:fs');
const path=require('node:path');
const allowed=new Set(['index.html','app.js','cinema.js','catalog.js','styles.css','cinema.css','supabase-config.js']);
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8'};
const server=http.createServer((req,res)=>{
  const name=new URL(req.url,'http://localhost').pathname.slice(1)||'index.html';
  if(!allowed.has(name)){res.writeHead(404);return res.end('Not found');}
  const file=path.join(__dirname,name);
  if(!fs.existsSync(file)){res.writeHead(404);return res.end('Not found');}
  res.writeHead(200,{'Content-Type':types[path.extname(file)],'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});
  fs.createReadStream(file).pipe(res);
});
server.listen(4173,'127.0.0.1',()=>process.stdout.write('Tilki preview: http://127.0.0.1:4173\n'));
