import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import surveys from './routes/survey.routes.js';
import auth from './routes/auth.routes.js';
import users from './routes/user.routes.js';
import { pool } from './config/db.js';
const app=express();
const frontendOrigin=process.env.FRONTEND_ORIGIN || 'http://localhost:3000';
const allowedOrigins=new Set([frontendOrigin]);
const localOrigin=new URL(frontendOrigin);
if(['localhost','127.0.0.1'].includes(localOrigin.hostname)) {
 localOrigin.hostname=localOrigin.hostname==='localhost'?'127.0.0.1':'localhost';allowedOrigins.add(localOrigin.origin);
}
app.use(cors({origin:(origin,callback)=>callback(null,!origin||allowedOrigins.has(origin)),credentials:true}));
app.use((req,res,next)=>{
 if(!['GET','HEAD','OPTIONS'].includes(req.method) && req.headers.origin && !allowedOrigins.has(req.headers.origin)) return res.status(403).json({status:false,message:'Request origin is not allowed'});
 next();
});
app.use(express.json({limit:'32kb'}));
app.get('/api/health',async(req,res,next)=>{
 try {await pool.query('SELECT 1');res.setHeader('Cache-Control','no-store');res.json({status:true,message:'API and database running'});}catch(error){next(error);}
});
app.use('/api/auth',auth);
app.use('/api/users',users);
app.use('/api/surveys',surveys);
app.use((err,req,res,next)=>{
 console.error(err);
 if(['ECONNREFUSED','ECONNRESET','ETIMEDOUT','57P03','08001','08006','53300'].includes(err.code)||/connection timeout|connection terminated|timeout exceeded when trying to connect/i.test(err.message || '')) {
  res.setHeader('Retry-After','5');
  return res.status(503).json({status:false,message:'The database is temporarily unavailable. Please try again shortly.'});
 }
 res.status(500).json({status:false,message:'Internal server error'});
});
app.listen(Number(process.env.PORT)||5151,process.env.HOST || '127.0.0.1',()=>console.log('API ready'));
