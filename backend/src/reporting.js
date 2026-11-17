import { pool } from './config/db.js';

export async function reporting(req, res, next) {
  try {
    const { where, values } = req.surveyFilters;
    const result = await pool.query(`
      WITH filtered AS (SELECT * FROM surveys${where}),
      monthly AS (
        SELECT to_char(created_at AT TIME ZONE 'Asia/Vientiane', 'YYYY-MM') AS month,
               COUNT(*)::int AS total
        FROM filtered GROUP BY 1
      )
      SELECT
        (SELECT json_build_object(
          'total', COUNT(*)::int,
          'provinces', COUNT(DISTINCT NULLIF(BTRIM(province), ''))::int,
          'districts', (COUNT(DISTINCT (province, district)) FILTER (WHERE BTRIM(province) <> '' AND BTRIM(district) <> ''))::int,
          'average_age', ROUND(AVG(age), 1)::float,
          'tobacco_users', (COUNT(*) FILTER (WHERE tobacco_use))::int,
          'average_activity_days', ROUND(AVG(physical_activity_days), 1)::float,
          'first_record', MIN(created_at), 'last_record', MAX(created_at)
        ) FROM filtered) AS metrics,
        (SELECT COALESCE(json_agg(t ORDER BY t.month), '[]'::json)
         FROM (SELECT * FROM monthly ORDER BY month DESC LIMIT 12) t) AS collection_trend,
        (SELECT COALESCE(json_agg(t), '[]'::json)
         FROM (SELECT province AS label, COUNT(*)::int AS total FROM filtered
               GROUP BY province ORDER BY total DESC, province) t) AS by_province,
        (SELECT COALESCE(json_agg(t), '[]'::json)
         FROM (SELECT sex AS label, COUNT(*)::int AS total FROM filtered
               GROUP BY sex ORDER BY sex) t) AS by_sex,
        (SELECT COALESCE(json_agg(t ORDER BY t.position), '[]'::json)
         FROM (SELECT CASE WHEN age < 30 THEN '18–29' WHEN age < 45 THEN '30–44'
                           WHEN age < 60 THEN '45–59' ELSE '60+' END AS label,
                      CASE WHEN age < 30 THEN 1 WHEN age < 45 THEN 2 WHEN age < 60 THEN 3 ELSE 4 END AS position,
                      COUNT(*)::int AS total FROM filtered GROUP BY 1, 2) t) AS by_age,
        (SELECT json_agg(t ORDER BY t.days)
         FROM (SELECT days, COUNT(f.id)::int AS total FROM generate_series(0, 7) days
               LEFT JOIN filtered f ON f.physical_activity_days = days GROUP BY days) t) AS by_activity,
        (SELECT json_build_object(
          'complete_records', (COUNT(*) FILTER (WHERE
            NULLIF(BTRIM(participant_code), '') IS NOT NULL AND NULLIF(BTRIM(province), '') IS NOT NULL
            AND NULLIF(BTRIM(district), '') IS NOT NULL AND age IS NOT NULL AND sex IS NOT NULL
            AND tobacco_use IS NOT NULL AND physical_activity_days IS NOT NULL))::int,
          'valid_records', (COUNT(*) FILTER (WHERE age BETWEEN 18 AND 120
            AND sex IN ('male', 'female', 'other') AND physical_activity_days BETWEEN 0 AND 7
            AND tobacco_use IS NOT NULL AND NULLIF(BTRIM(participant_code), '') IS NOT NULL
            AND NULLIF(BTRIM(province), '') IS NOT NULL AND NULLIF(BTRIM(district), '') IS NOT NULL))::int,
          'unique_codes', COUNT(DISTINCT participant_code)::int
        ) FROM filtered) AS quality
    `, values);
    res.json({status:true,data:{...result.rows[0],generated_at:new Date().toISOString(),timezone:'Asia/Vientiane'}});
  } catch (error) { next(error); }
}
