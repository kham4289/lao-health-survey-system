export function surveyFilters(query) {
  for (const key of ['q', 'date_from', 'date_to', 'province']) {
    if (query[key] !== undefined && typeof query[key] !== 'string') {
      throw new Error(`Invalid ${key}`);
    }
  }
  const search = (query.q || '').trim();
  if (search.length > 100) throw new Error('Search must be 100 characters or fewer');
  const from = query.date_from || '';
  const to = query.date_to || '';
  for (const date of [from, to]) {
    if (!date) continue;
    const parsed = new Date(`${date}T00:00:00Z`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || date < '0001-01-01' ||
        Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== date) {
      throw new Error('Dates must be valid YYYY-MM-DD dates');
    }
  }
  if (from && to && from > to) throw new Error('Start date must be on or before end date');
  const conditions = [];
  const values = [];
  if (search) {
    values.push(`%${search.replace(/[\\%_]/g, '\\$&')}%`);
    conditions.push(`(participant_code ILIKE $1 OR province ILIKE $1 OR district ILIKE $1 OR sex ILIKE $1 OR age::text ILIKE $1)`);
  }
  if (from) {
    values.push(from);
    conditions.push(`created_at >= ($${values.length}::date::timestamp AT TIME ZONE 'Asia/Vientiane')`);
  }
  if (to) {
    values.push(to);
    conditions.push(`created_at < (($${values.length}::date + 1)::timestamp AT TIME ZONE 'Asia/Vientiane')`);
  }
  const province = (query.province || '').trim();
  if (province.length > 100) throw new Error('Province must be 100 characters or fewer');
  if (province) {
    values.push(province);
    conditions.push(`province = $${values.length}`);
  }
  return { where: conditions.length ? ` WHERE ${conditions.join(' AND ')}` : '', values };
}
