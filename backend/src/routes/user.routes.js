import { Router } from 'express';
import { pool } from '../config/db.js';
import { requireAuth,requireRole,hashPassword,validateUser,publicUser,roles } from '../auth.js';
const router=Router();
router.use(requireAuth,requireRole('admin'));
router.get('/',async(req,res,next)=>{
 try{const result=await pool.query('SELECT id,name,email,role,active,created_at FROM app_users ORDER BY created_at,id');res.json({status:true,data:result.rows});}catch(e){next(e);}
});
router.post('/',async(req,res,next)=>{
 const error=validateUser(req.body);if(error)return res.status(400).json({status:false,message:error});
 try{
  const {name,email,password,role}=req.body;
  const result=await pool.query('INSERT INTO app_users (name,email,password_hash,role) VALUES ($1,$2,$3,$4) RETURNING *',[name.trim(),email.trim().toLowerCase(),await hashPassword(password),role]);
  res.status(201).json({status:true,data:publicUser(result.rows[0])});
 }catch(e){if(e.code==='23505')return res.status(409).json({status:false,message:'This email address is already in use'});next(e);}
});
router.patch('/:id',async(req,res,next)=>{
 if(!/^[1-9]\d{0,18}$/.test(req.params.id)||BigInt(req.params.id)>9223372036854775807n)return res.status(400).json({status:false,message:'Invalid user ID'});
 if(String(req.user.id)===req.params.id)return res.status(400).json({status:false,message:'You cannot change your own role or deactivate your own account'});
 const {role,active}=req.body || {};
 if(!roles.includes(role)||typeof active!=='boolean')return res.status(400).json({status:false,message:'Choose a valid role and account status'});
 let client;
 try{
  client=await pool.connect();await client.query('BEGIN');await client.query('SELECT pg_advisory_xact_lock(762451)');
  // Recheck the acting admin under the lock so concurrent role changes cannot remove every admin.
  const acting=await client.query("SELECT id FROM app_users WHERE id=$1 AND active AND role='admin'",[req.user.id]);
  if(!acting.rowCount){await client.query('ROLLBACK');return res.status(403).json({status:false,message:'Administrator permission is required'});}
  const result=await client.query('UPDATE app_users SET role=$1,active=$2 WHERE id=$3 RETURNING *',[role,active,req.params.id]);
  if(!result.rowCount){await client.query('ROLLBACK');return res.status(404).json({status:false,message:'User not found'});}
  await client.query('DELETE FROM user_sessions WHERE user_id=$1',[req.params.id]);await client.query('COMMIT');
  res.json({status:true,data:publicUser(result.rows[0])});
 }catch(e){if(client)await client.query('ROLLBACK').catch(()=>{});next(e);}finally{client?.release();}
});
export default router;
