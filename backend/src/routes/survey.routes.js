import { Router } from 'express';
import { pool } from '../config/db.js';
import { surveyFilters } from '../survey-filters.js';
import { reporting } from '../reporting.js';
import { requireAuth,requireRole } from '../auth.js';
const router = Router();
router.use(requireAuth);
const columns = ['participant_code','province','district','age','sex','tobacco_use','physical_activity_days'];
function validate(b) {
  if (!b || typeof b !== 'object') return 'Invalid payload';
  for (const k of ['participant_code','province','district']) {
    if (typeof b[k] !== 'string' || !b[k].trim() || b[k].length > (k === 'participant_code' ? 40 : 100)) return `Invalid ${k}`;
  }
  if (!Number.isInteger(b.age) || b.age < 18 || b.age > 120) return 'Age must be 18–120';
  if (!['male','female','other'].includes(b.sex)) return 'Invalid sex';
  if (typeof b.tobacco_use !== 'boolean') return 'Invalid tobacco_use';
  if (!Number.isInteger(b.physical_activity_days) || b.physical_activity_days < 0 || b.physical_activity_days > 7) return 'Activity days must be 0–7';
  return null;
}
router.post('/', requireRole('admin','data_entry'), async (req,res,next) => {
  const err = validate(req.body); if (err) return res.status(400).json({status:false,message:err});
  try {
    const vals=columns.map(k => typeof req.body[k] === 'string' ? req.body[k].trim() : req.body[k]);
    const sql=`INSERT INTO surveys (${columns.join(',')}) VALUES (${columns.map((_,i)=>'$'+(i+1)).join(',')}) RETURNING *`;
    const result=await pool.query(sql,vals);
    res.status(201).json({status:true,data:result.rows[0]});
  } catch(e) { if (e.code==='23505') return res.status(409).json({status:false,message:'Participant code already exists'}); next(e); }
});
function filterSurveys(req, res, next) {
  try { req.surveyFilters = surveyFilters(req.query); next(); }
  catch (error) { res.status(400).json({status:false,message:error.message}); }
}
router.get('/', filterSurveys, async (req, res, next) => {
  try {
    const {where, values} = req.surveyFilters;
    const result = await pool.query(`SELECT * FROM surveys${where} ORDER BY created_at DESC, id DESC LIMIT 200`, values);
    res.json({status:true,data:result.rows});
  } catch (error) { next(error); }
});
router.get('/summary', filterSurveys, async (req, res, next) => {
  try {
    const {where, values} = req.surveyFilters;
    const result = await pool.query(`SELECT COUNT(*)::int AS total, COUNT(*) FILTER (WHERE tobacco_use)::int AS tobacco_users, ROUND(AVG(age),1)::float AS average_age FROM surveys${where}`, values);
    const provinces = await pool.query(`SELECT province, COUNT(*)::int AS total FROM surveys${where} GROUP BY province ORDER BY total DESC, province`, values);
    res.json({status:true,data:{...result.rows[0],by_province:provinces.rows}});
  } catch (error) { next(error); }
});
router.get('/export.csv', filterSurveys, async (req, res, next) => {
  try {
    const {where, values} = req.surveyFilters;
    const result = await pool.query(`SELECT participant_code,province,district,age,sex,tobacco_use,physical_activity_days,created_at FROM surveys${where} ORDER BY id`, values);
    const escape = value => '"' + String(value ?? '').replaceAll('"', '""') + '"';
    const fields = [...columns, 'created_at'];
    res.set('Content-Type', 'text/csv; charset=utf-8');
    res.set('Content-Disposition', 'attachment; filename="surveys.csv"');
    res.send([fields.join(','), ...result.rows.map(row => fields.map(key => escape(row[key])).join(','))].join('\r\n'));
  } catch (error) { next(error); }
});
router.get('/reporting', filterSurveys, reporting);
function validId(id) {
  return /^[1-9]\d{0,18}$/.test(id) && BigInt(id) <= 9223372036854775807n;
}
router.get('/:id', async (req, res, next) => {
  if (!validId(req.params.id)) return res.status(400).json({status:false,message:'Invalid survey ID'});
  try {
    const result = await pool.query('SELECT * FROM surveys WHERE id = $1', [req.params.id]);
    if (!result.rows.length) return res.status(404).json({status:false,message:'Survey not found'});
    res.json({status:true,data:result.rows[0]});
  } catch (e) { next(e); }
});
router.delete('/:id', requireRole('admin'), async (req, res, next) => {
  if (!validId(req.params.id)) return res.status(400).json({status:false,message:'Invalid survey ID'});
  try {
    const result = await pool.query('DELETE FROM surveys WHERE id = $1 RETURNING id', [req.params.id]);
    if (!result.rows.length) return res.status(404).json({status:false,message:'Survey not found'});
    res.json({status:true,data:result.rows[0]});
  } catch (e) { next(e); }
});
router.put('/:id', requireRole('admin','data_entry'), async (req, res, next) => {
  if (!validId(req.params.id)) return res.status(400).json({status:false,message:'Invalid survey ID'});
  const err = validate(req.body);
  if (err) return res.status(400).json({status:false,message:err});
  try {
    const values = columns.map(k => typeof req.body[k] === 'string' ? req.body[k].trim() : req.body[k]);
    const assignments = columns.map((column, i) => `${column} = $${i + 1}`).join(', ');
    const result = await pool.query(`UPDATE surveys SET ${assignments} WHERE id = $${columns.length + 1} RETURNING *`, [...values, req.params.id]);
    if (!result.rows.length) return res.status(404).json({status:false,message:'Survey not found'});
    res.json({status:true,data:result.rows[0]});
  } catch (e) {
    if (e.code === '23505') return res.status(409).json({status:false,message:'Participant code already exists'});
    next(e);
  }
});
export default router;
