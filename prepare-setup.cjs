const fs=require('node:fs');
const source=['supabase.sql','cinema.sql'].map(file=>fs.readFileSync(file,'utf8')).join('\n\n');
fs.writeFileSync('setup.sql','-- Tilki 0.3: Run this entire file in Supabase SQL Editor.\n'+source);
console.log('setup.sql is ready. Existing accounts and messages are preserved.');
