import assert from 'node:assert/strict';
import {createServer} from './server.mjs';
const server=createServer();
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const base='http://127.0.0.1:'+server.address().port;
try{
 for(const [file,type] of [['/','text/html'],['/app.js','text/javascript'],['/styles.css','text/css']]){
  const response=await fetch(base+file);
  assert.equal(response.status,200);assert.ok(response.headers.get('content-type').startsWith(type));
 }
 for(const file of ['/package.json','/server.mjs','/.openai/hosting.json','/node_modules/jsdom/package.json','/%2e%2e%2fREADME.md'])assert.equal((await fetch(base+file)).status,404);
 assert.equal((await fetch(base,{method:'POST'})).status,405);
 assert.equal((await fetch(base,{method:'HEAD'})).status,200);
 console.log('PASS: Node server serves built assets only, correct MIME, HEAD and method restrictions.');
}finally{await new Promise(resolve=>server.close(resolve))}
