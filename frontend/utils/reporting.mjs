export function percentage(value, total) {
  return total > 0 ? Math.round(value / total * 1000) / 10 : null;
}
export function collectionSeries(rows, query = {}) {
  const values = new Map(rows.map(row => [row.month, row.total]));
  const first = query.date_from?.slice(0, 7) || rows[0]?.month;
  const last = query.date_to?.slice(0, 7) || rows.at(-1)?.month;
  if (!first || !last) return [];
  const index = month => Number(month.slice(0, 4)) * 12 + Number(month.slice(5, 7)) - 1;
  const end = index(last), start = Math.max(index(first), end - 11);
  const result = [];
  for (let i = start; i <= end; i++) {
    const month = `${String(Math.floor(i / 12)).padStart(4, '0')}-${String(i % 12 + 1).padStart(2, '0')}`;
    result.push({month, total:values.get(month) || 0});
  }
  return result;
}
