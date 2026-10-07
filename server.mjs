import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const projectRoot=path.dirname(fileURLToPath(import.meta.url));
export function createServer({directory=path.join(projectRoot,'dist')}={}) {
 const allowed=new Set(['index.html','app.js','workflow.js','styles.css','logo.png']);
 const mime={'.png':'image/png','.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8'};
 return http.createServer(async(req,res)=>{
  res.setHeader('X-Content-Type-Options','nosniff');
  res.setHeader('Referrer-Policy','same-origin');
  if(!['GET','HEAD'].includes(req.method)){res.writeHead(405,{'Allow':'GET, HEAD'});res.end('Method not allowed');return}
  try{
   const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
   const name=pathname==='/'?'index.html':pathname.slice(1);
   if(!allowed.has(name)){res.writeHead(404);res.end('Not found');return}
   const data=await fs.readFile(path.join(directory,name));
   res.writeHead(200,{'Content-Type':mime[path.extname(name)],'Content-Length':data.length,'Cache-Control':'no-cache'});
   res.end(req.method==='HEAD'?undefined:data);
  }catch(error){
   res.writeHead(error.code==='ENOENT'?404:500);res.end('Unable to serve this file');
  }
 });
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const port=Number(process.env.PORT||5173),host=process.env.HOST||'127.0.0.1';
 if(!Number.isInteger(port)||port<1||port>65535)throw Error('PORT must be between 1 and 65535');
 const server=createServer({directory:process.argv.includes('--dev')?projectRoot:path.join(projectRoot,'dist')});
 server.on('error',error=>{console.error(error.code==='EADDRINUSE'?'พอร์ตถูกใช้งานแล้ว กรุณากำหนด PORT อื่น':error.message);process.exitCode=1});
 server.listen(port,host,()=>console.log('เปิดเว็บที่ http://'+host+':'+port));
 for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>server.close());
}
