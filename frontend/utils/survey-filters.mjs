export function surveyFilterDraft(query, today) {
  const read = key => typeof query[key] === 'string' ? query[key] : '';
  return {
    search:read('q'), province:read('province'),
    period:read('date_from') || read('date_to') ? 'range' : 'all',
    from:read('date_from') || today, to:read('date_to') || today,
    month:today.slice(0, 7), year:today.slice(0, 4)
  };
}
function validDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || value < '0001-01-01') return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}
export function buildSurveyQuery(filters) {
  const query = {};
  const search = (filters.search || '').trim();
  if (search.length > 100) throw new Error('Search must be 100 characters or fewer.');
  if (search) query.q = search;
  const province = (filters.province || '').trim();
  if (province.length > 100) throw new Error('Province must be 100 characters or fewer.');
  if (province) query.province = province;
  if (filters.period === 'range') {
    if (!validDate(filters.from) || !validDate(filters.to)) throw new Error('Select a valid start and end date.');
    if (filters.from > filters.to) throw new Error('Start date must be on or before end date.');
    query.date_from = filters.from;
    query.date_to = filters.to;
  } else if (filters.period === 'month') {
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(filters.month) || filters.month < '0001-01') throw new Error('Select a valid month.');
    const end = new Date(`${filters.month}-01T00:00:00Z`);
    end.setUTCMonth(end.getUTCMonth() + 1, 0);
    query.date_from = `${filters.month}-01`;
    query.date_to = end.toISOString().slice(0, 10);
  } else if (filters.period === 'year') {
    if (!/^\d{4}$/.test(String(filters.year)) || Number(filters.year) < 1) throw new Error('Enter a year between 0001 and 9999.');
    query.date_from = `${filters.year}-01-01`;
    query.date_to = `${filters.year}-12-31`;
  } else if (filters.period !== 'all') throw new Error('Select a valid date filter.');
  return query;
}
