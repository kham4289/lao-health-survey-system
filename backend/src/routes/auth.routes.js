import { Router } from 'express';
import { pool } from '../config/db.js';
import { createSession, hashPassword, verifyPassword, validateUser, publicUser, requireAuth, sessionToken, tokenHash, setSessionCookie } from '../auth.js';
const router = Router();
const attempts = new Map();
const windowMs = 15 * 60 * 1000;
function limit(req,res,next) {
 const now=Date.now();
 for (const [key,value] of attempts) if (value.until<=now) attempts.delete(key);
 const key=req.ip;
 const entry=attempts.get(key) || {count:0,until:now+windowMs};
 if (entry.count>=10) {res.setHeader('Retry-After',Math.ceil((entry.until-now)/1000));return res.status(429).json({status:false,message:'Too many sign-in attempts. Try again in 15 minutes'});}
 entry.count++; attempts.set(key,entry); next();
}
router.get('/status',async(req,res,next)=>{
 try { const result=await pool.query('SELECT EXISTS(SELECT 1 FROM app_users) AS has_users');res.setHeader('Cache-Control','no-store');res.json({status:true,needsSetup:!result.rows[0].has_users}); } catch(e){next(e);}
});
router.post('/setup',limit,async(req,res,next)=>{
 const body={...req.body,role:'admin'};
 const error=validateUser(body);if(error)return res.status(400).json({status:false,message:error});
 let client;
 try {
  const passwordHash=await hashPassword(body.password);
  client=await pool.connect();await client.query('BEGIN');
  await client.query('SELECT pg_advisory_xact_lock(762451)');
  const existing=await client.query('SELECT id FROM app_users LIMIT 1');
  if(existing.rowCount){await client.query('ROLLBACK');return res.status(409).json({status:false,message:'Administrator setup is already complete. Please sign in'});}
  const result=await client.query("INSERT INTO app_users (name,email,password_hash,role) VALUES ($1,$2,$3,'admin') RETURNING *",[body.name.trim(),body.email.trim().toLowerCase(),passwordHash]);
  await createSession(res,result.rows[0].id,client);
  await client.query('COMMIT');
  res.status(201).json({status:true,data:publicUser(result.rows[0])});
 }catch(e){if(client)await client.query('ROLLBACK').catch(()=>{});next(e);}finally{client?.release();}
});
const dummyHashPromise=hashPassword('dummy-password-for-timing');
router.post('/login',limit,async(req,res,next)=>{
 try {
  const {email,password}=req.body || {};
  if(typeof email!=='string'||email.length>254||typeof password!=='string'||password.length>128)return res.status(401).json({status:false,message:'Email or password is incorrect'});
  const result=await pool.query('SELECT * FROM app_users WHERE email=$1',[email.trim().toLowerCase()]);
  const user=result.rows[0];
  const matches=await verifyPassword(password,user?.password_hash || await dummyHashPromise);
  if(!matches||!user?.active)return res.status(401).json({status:false,message:'Email or password is incorrect'});
  const oldToken=sessionToken(req);
  if(oldToken)await pool.query('DELETE FROM user_sessions WHERE token_hash=$1',[tokenHash(oldToken)]);
  await createSession(res,user.id);res.json({status:true,data:publicUser(user)});
 }catch(e){next(e);}
});
router.get('/me',requireAuth,(req,res)=>res.json({status:true,data:req.user}));
router.post('/logout',async(req,res,next)=>{
 try {const token=sessionToken(req);if(token)await pool.query('DELETE FROM user_sessions WHERE token_hash=$1',[tokenHash(token)]);setSessionCookie(res,'',0);res.json({status:true});}catch(e){next(e);}
});
export default router;
