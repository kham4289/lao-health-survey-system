import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';

test('database outages return a recoverable service error during administrator setup', {skip:!process.env.TEST_DATABASE_URL,timeout:60000},async()=>{
 const port=Number(process.env.TEST_OUTAGE_PORT)||5163;
 const server=spawn(process.execPath,['src/app.js'],{
  cwd:new URL('../',import.meta.url),
  env:{...process.env,NODE_ENV:'test',DOTENV_CONFIG_PATH:'/dev/null',PORT:String(port),DATABASE_URL:'postgresql://postgres@127.0.0.1:1/unavailable'},
  stdio:['ignore','pipe','pipe']
 });
 let log='';server.stderr.on('data',chunk=>{log+=chunk.toString();});
 try{
  await new Promise((resolve,reject)=>{
   const timer=setTimeout(()=>reject(new Error('Outage test API did not start: '+log)),30000);
   server.once('error',error=>{clearTimeout(timer);reject(error);});
   server.once('exit',code=>{clearTimeout(timer);reject(new Error('Test API exited '+code+': '+log));});
   server.stdout.on('data',chunk=>{if(chunk.toString().includes('API ready')){clearTimeout(timer);resolve();}});
  });
  for(const path of ['/health','/auth/status','/auth/setup']){
   const response=await fetch(`http://127.0.0.1:${port}/api${path}`,path.endsWith('setup')?{
    method:'POST',headers:{'Content-Type':'application/json'},
    body:JSON.stringify({name:'Outage test',email:'outage@example.test',password:'test-password-long-enough'})
   }:{});
   assert.equal(response.status,503);
   assert.equal(response.headers.get('retry-after'),'5');
   assert.match((await response.json()).message,/database is temporarily unavailable/);
  }
 }finally{if(server.exitCode===null){server.kill('SIGTERM');await once(server,'exit');}}
});
