import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { readFile } from 'node:fs/promises';
import { randomBytes } from 'node:crypto';
import pg from 'pg';

test('login, sessions and every role are enforced by the API', {skip:!process.env.TEST_DATABASE_URL,timeout:90000},async()=>{
 const pool=new pg.Pool({connectionString:process.env.TEST_DATABASE_URL});
 const schema='auth_test_'+randomBytes(8).toString('hex');
 let server;
 const port=Number(process.env.TEST_API_PORT)||5152;
 const base=`http://127.0.0.1:${port}/api`;
 async function request(path,{method='GET',body,cookie,origin}={}){
  const response=await fetch(base+path,{method,headers:{...(body?{'Content-Type':'application/json'}:{}),...(cookie?{Cookie:cookie}:{}),...(origin?{Origin:origin}:{})},body:body?JSON.stringify(body):undefined});
  const text=await response.text();
  return {status:response.status,data:response.headers.get('content-type')?.includes('application/json')?JSON.parse(text):text,cookie:response.headers.get('set-cookie')?.split(';')[0],headers:response.headers};
 }
 const password='test-only-long-password';
 const person=(email,role)=>({name:'Test '+role,email,password,role});
 try{
  await pool.query(`CREATE SCHEMA ${schema}`);
  const client=await pool.connect();
  try{
   await client.query(`SET search_path TO ${schema}`);
   await client.query(await readFile(new URL('../../database/schema.sql',import.meta.url),'utf8'));
   await client.query(await readFile(new URL('../../database/auth.sql',import.meta.url),'utf8'));
  }finally{client.release();}
  const url=new URL(process.env.TEST_DATABASE_URL);url.searchParams.set('options',`-c search_path=${schema}`);
  server=spawn(process.execPath,['src/app.js'],{cwd:new URL('../',import.meta.url),env:{...process.env,NODE_ENV:'test',PORT:String(port),DOTENV_CONFIG_PATH:'/dev/null',DATABASE_URL:url.toString(),FRONTEND_ORIGIN:'http://localhost:3000'},stdio:['ignore','pipe','pipe']});
  let serverError='';server.stderr.on('data',chunk=>{serverError+=chunk.toString();});
  await new Promise((resolve,reject)=>{
   const timer=setTimeout(()=>reject(new Error('Test API did not start: '+serverError)),30000);
   server.once('error',error=>{clearTimeout(timer);reject(error);});
   server.once('exit',code=>{clearTimeout(timer);reject(new Error('Test API exited: '+code+' '+serverError));});
   server.stdout.on('data',chunk=>{if(chunk.toString().includes('API ready')){clearTimeout(timer);resolve();}});
  });
  for(const path of ['/surveys','/surveys/summary','/surveys/reporting','/surveys/export.csv','/users']) assert.equal((await request(path)).status,401);
  assert.equal((await request('/auth/status')).data.needsSetup,true);
  await pool.query(`CREATE FUNCTION ${schema}.reject_session() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'Simulated session failure'; END $$`);
  await pool.query(`CREATE TRIGGER reject_session BEFORE INSERT ON ${schema}.user_sessions FOR EACH ROW EXECUTE FUNCTION ${schema}.reject_session()`);
  assert.equal((await request('/auth/setup',{method:'POST',body:person('rollback@example.test','admin')})).status,500);
  assert.equal((await pool.query(`SELECT COUNT(*)::int AS total FROM ${schema}.app_users`)).rows[0].total,0);
  await pool.query(`DROP TRIGGER reject_session ON ${schema}.user_sessions`);
  const setup=await request('/auth/setup',{method:'POST',body:person('ADMIN@example.test','viewer')});
  assert.equal(setup.status,201);assert.equal(setup.data.data.role,'admin');
  assert.match(setup.headers.get('set-cookie'),/HttpOnly/);assert.match(setup.headers.get('set-cookie'),/SameSite=Strict/);
  const admin=setup.cookie;
  assert.equal((await request('/auth/setup',{method:'POST',body:person('another@example.test','admin')})).status,409);
  assert.equal((await request('/auth/status')).data.needsSetup,false);
  assert.equal((await request('/auth/me',{cookie:admin})).data.data.email,'admin@example.test');
  assert.equal((await request('/auth/login',{method:'POST',body:{email:'admin@example.test',password:'wrong-password'}})).status,401);
  const staff=await request('/users',{method:'POST',cookie:admin,body:person('staff@example.test','data_entry')});assert.equal(staff.status,201);
  const viewer=await request('/users',{method:'POST',cookie:admin,body:person('viewer@example.test','viewer')});assert.equal(viewer.status,201);
  assert.equal((await request('/users',{method:'POST',cookie:admin,body:person('STAFF@example.test','viewer')})).status,409);
  assert.equal((await request('/users',{method:'POST',cookie:admin,body:{...person('weak@example.test','viewer'),password:'short'}})).status,400);
  const staffLogin=await request('/auth/login',{method:'POST',body:{email:'staff@example.test',password}});assert.equal(staffLogin.status,200);
  const viewerLogin=await request('/auth/login',{method:'POST',body:{email:'viewer@example.test',password}});assert.equal(viewerLogin.status,200);
  const survey={participant_code:'AUTH-TEST',province:'Vientiane Capital',district:'Demo',age:30,sex:'female',tobacco_use:false,physical_activity_days:3};
  assert.equal((await request('/surveys',{method:'POST',cookie:viewerLogin.cookie,body:survey})).status,403);
  for(const cookie of [staffLogin.cookie,viewerLogin.cookie]){
   assert.equal((await request('/users',{cookie})).status,403);
   assert.equal((await request('/users',{method:'POST',cookie,body:person('blocked@example.test','admin')})).status,403);
  }
  assert.equal((await request('/surveys',{method:'POST',cookie:admin,body:survey,origin:'https://evil.example'})).status,403);
  const created=await request('/surveys',{method:'POST',cookie:staffLogin.cookie,body:survey});assert.equal(created.status,201);
  const id=created.data.data.id;
  assert.equal((await request('/surveys/'+id,{method:'PUT',cookie:viewerLogin.cookie,body:{...survey,age:31}})).status,403);
  assert.equal((await request('/surveys/'+id,{method:'PUT',cookie:staffLogin.cookie,body:{...survey,age:31}})).status,200);
  assert.equal((await request('/surveys/'+id,{method:'DELETE',cookie:staffLogin.cookie})).status,403);
  for(const path of ['/surveys','/surveys/summary','/surveys/reporting','/surveys/export.csv']) assert.equal((await request(path,{cookie:viewerLogin.cookie})).status,200);
  assert.equal((await request('/users/'+setup.data.data.id,{method:'PATCH',cookie:admin,body:{role:'viewer',active:false}})).status,400);
  assert.equal((await request('/users/'+viewer.data.data.id,{method:'PATCH',cookie:admin,body:{role:'data_entry',active:true}})).status,200);
  assert.equal((await request('/auth/me',{cookie:viewerLogin.cookie})).status,401);
  assert.equal((await request('/users/'+staff.data.data.id,{method:'PATCH',cookie:admin,body:{role:'data_entry',active:false}})).status,200);
  assert.equal((await request('/surveys',{cookie:staffLogin.cookie})).status,401);
  assert.equal((await request('/auth/login',{method:'POST',body:{email:'staff@example.test',password}})).status,401);
  const list=await request('/users',{cookie:admin});assert.equal(list.status,200);assert.equal(JSON.stringify(list.data).includes('password_hash'),false);
  const stored=await pool.query(`SELECT password_hash FROM ${schema}.app_users`);
  for(const row of stored.rows){assert.match(row.password_hash,/^scrypt:/);assert.notEqual(row.password_hash,password);}
  assert.equal((await request('/surveys/'+id,{method:'DELETE',cookie:admin})).status,200);
  const secondLogin=await request('/auth/login',{method:'POST',body:{email:'ADMIN@example.test',password}});assert.equal(secondLogin.status,200);
  await pool.query(`UPDATE ${schema}.user_sessions SET expires_at=NOW()-INTERVAL '1 second'`);
  assert.equal((await request('/auth/me',{cookie:secondLogin.cookie})).status,401);
  const finalLogin=await request('/auth/login',{method:'POST',body:{email:'admin@example.test',password}});assert.equal(finalLogin.status,200);
  assert.equal((await request('/auth/logout',{method:'POST',cookie:finalLogin.cookie})).status,200);
  assert.equal((await request('/auth/me',{cookie:finalLogin.cookie})).status,401);
  let limited;
  for(let attempt=0;attempt<12;attempt++){
   limited=await request('/auth/login',{method:'POST',body:{email:'admin@example.test',password:'incorrect-password'}});
   if(limited.status===429)break;
  }
  assert.equal(limited.status,429);assert.ok(Number(limited.headers.get('retry-after'))>0);
 }finally{
  if(server&&server.exitCode===null){server.kill('SIGTERM');await once(server,'exit');}
  await pool.query(`DROP SCHEMA IF EXISTS ${schema} CASCADE`);await pool.end();
 }
});
