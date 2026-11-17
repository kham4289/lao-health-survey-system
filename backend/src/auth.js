import { randomBytes, scrypt as scryptCallback, timingSafeEqual, createHash } from 'node:crypto';
import { promisify } from 'node:util';
import { pool } from './config/db.js';

const scrypt = promisify(scryptCallback);
export const roles = ['admin', 'data_entry', 'viewer'];
export const cookieName = 'health_session';
export const sessionSeconds = 8 * 60 * 60;
export const publicUser = user => ({id:user.id,name:user.name,email:user.email,role:user.role,active:user.active});
export function validateUser(body, passwordRequired = true) {
 if (!body || typeof body !== 'object') return 'Invalid user details';
 if (typeof body.name !== 'string' || !body.name.trim() || body.name.trim().length > 100) return 'Name is required (up to 100 characters)';
 if (typeof body.email !== 'string' || body.email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email.trim())) return 'Enter a valid email address';
 if (!roles.includes(body.role)) return 'Choose a valid role';
 if (passwordRequired && (typeof body.password !== 'string' || body.password.length < 12 || body.password.length > 128)) return 'Password must be 12–128 characters';
 return null;
}
export async function hashPassword(password) {
 const salt = randomBytes(16).toString('hex');
 const key = await scrypt(password,salt,64);
 return `scrypt:${salt}:${key.toString('hex')}`;
}
export async function verifyPassword(password, encoded) {
 const [,salt,hex] = encoded.split(':');
 const actual = await scrypt(password,salt,64);
 const expected = Buffer.from(hex,'hex');
 return expected.length === actual.length && timingSafeEqual(expected,actual);
}
export const tokenHash = token => createHash('sha256').update(token).digest('hex');
export function sessionToken(req) {
 const raw = (req.headers.cookie || '').split(';').map(v=>v.trim()).find(v=>v.startsWith(cookieName+'='));
 const token = raw?.slice(cookieName.length+1);
 return /^[a-f0-9]{64}$/.test(token || '') ? token : null;
}
export function setSessionCookie(res, token = '', maxAge = sessionSeconds) {
 const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
 res.setHeader('Set-Cookie',`${cookieName}=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${maxAge}${secure}`);
 res.setHeader('Cache-Control','no-store');
}
export async function createSession(res,userId,db=pool) {
 const token = randomBytes(32).toString('hex');
 await db.query('DELETE FROM user_sessions WHERE expires_at <= NOW()');
 await db.query("INSERT INTO user_sessions (token_hash,user_id,expires_at) VALUES ($1,$2,NOW() + INTERVAL '8 hours')",[tokenHash(token),userId]);
 setSessionCookie(res,token);
}
export async function requireAuth(req,res,next) {
 try {
  const token = sessionToken(req);
  if (!token) return res.status(401).json({status:false,message:'Please sign in'});
  const result = await pool.query('SELECT u.* FROM user_sessions s JOIN app_users u ON u.id=s.user_id WHERE s.token_hash=$1 AND s.expires_at>NOW() AND u.active=true',[tokenHash(token)]);
  if (!result.rows[0]) { setSessionCookie(res,'',0); return res.status(401).json({status:false,message:'Session expired. Please sign in again'}); }
  req.user = publicUser(result.rows[0]);
  res.setHeader('Cache-Control','no-store');
  next();
 } catch(error) { next(error); }
}
export const requireRole = (...allowed) => (req,res,next) => allowed.includes(req.user?.role) ? next() : res.status(403).json({status:false,message:'You do not have permission to perform this action'});
