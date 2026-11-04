import {build} from 'vite';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
await build({root});
let html=await readFile(resolve(root,'dist/index.html'),'utf8');
html=await replaceAsync(html,/<script\b[^>]*\bsrc="([^"]+)"[^>]*><\/script>/g,async(_,src)=>`<script type="module">${(await readFile(resolve(root,'dist',src),'utf8')).replace(/<\/script/gi,'<\\/script')}</script>`);
html=await replaceAsync(html,/<link\b[^>]*\brel="stylesheet"[^>]*\bhref="([^"]+)"[^>]*>/g,async(_,src)=>`<style>${await readFile(resolve(root,'dist',src),'utf8')}</style>`);
if(/<script[^>]+src=|<link[^>]+stylesheet/.test(html))throw new Error('External assets remain');
await mkdir(resolve(root,'artifacts'),{recursive:true});
await writeFile(resolve(root,'artifacts/Vildmark.html'),html);
console.log('Created artifacts/Vildmark.html');
async function replaceAsync(text,re,fn){const matches=[...text.matchAll(re)];const results=await Promise.all(matches.map(m=>fn(...m)));for(let i=matches.length-1;i>=0;i--){const m=matches[i];text=text.slice(0,m.index)+results[i]+text.slice(m.index+m[0].length);}return text;}
