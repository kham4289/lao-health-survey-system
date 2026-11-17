import test from 'node:test';
import assert from 'node:assert/strict';
import { surveyFilters } from '../src/survey-filters.js';
import { buildSurveyQuery, surveyFilterDraft } from '../../frontend/utils/survey-filters.mjs';
import { collectionSeries, percentage } from '../../frontend/utils/reporting.mjs';

test('search stays parameterized and treats wildcard characters literally', () => {
  const result = surveyFilters({q:'  a%_\\b  '});
  assert.deepEqual(result.values, ['%a\\%\\_\\\\b%']);
  assert.ok(!result.where.includes('a%'));
  assert.match(result.where, /participant_code ILIKE \$1/);
});
test('dates use inclusive Laos calendar days with independent parameter positions', () => {
  const result = surveyFilters({date_from:'2024-02-29',date_to:'2024-02-29'});
  assert.deepEqual(result.values, ['2024-02-29','2024-02-29']);
  assert.match(result.where, /created_at >= \(\$1/);
  assert.match(result.where, /created_at < \(\(\$2::date \+ 1/);
  assert.match(result.where, /Asia\/Vientiane/);
  assert.deepEqual(surveyFilters({}), {where:'',values:[]});
});
test('invalid dates, reversed ranges and structured query values are rejected', () => {
  for (const query of [{date_from:'2026-02-29'},{date_to:'2026-04-31'},
    {date_from:'0000-01-01'},{date_from:'2026-12-01',date_to:'2026-01-01'},
    {q:['a','b']},{date_from:{}},{q:'a'.repeat(101)}]) {
    assert.throws(()=>surveyFilters(query));
  }
});
test('month and year choices produce complete calendar ranges', () => {
  for (const [month, end] of [['2024-02','2024-02-29'],['2026-02','2026-02-28'],['2026-12','2026-12-31'],['9999-12','9999-12-31']]) {
    assert.deepEqual(buildSurveyQuery({period:'month',month}), {date_from:month+'-01',date_to:end});
  }
  assert.deepEqual(buildSurveyQuery({search:' DEMO ',period:'year',year:2026}), {q:'DEMO',date_from:'2026-01-01',date_to:'2026-12-31'});
  assert.deepEqual(buildSurveyQuery({search:null,period:'all'}), {});
});
test('date selections reject incomplete or invalid values before exporting', () => {
  for (const filters of [{period:'range',from:'',to:''},{period:'range',from:'2026-04-31',to:'2026-05-01'},
    {period:'range',from:'2026-12-01',to:'2026-01-01'},{period:'month',month:'2026-13'},
    {period:'year',year:0},{period:'year',year:10000}]) assert.throws(()=>buildSurveyQuery(filters));
});
test('province drill-down remains exact and parameterized alongside dates and search', () => {
  const query = {q:'DEMO',date_from:'2026-01-01',date_to:'2026-12-31',province:'Luang Prabang'};
  const result = surveyFilters(query);
  assert.deepEqual(result.values, ['%DEMO%','2026-01-01','2026-12-31','Luang Prabang']);
  assert.match(result.where, /province = \$4/);
  assert.throws(()=>surveyFilters({province:['a','b']}));
  assert.deepEqual(buildSurveyQuery(surveyFilterDraft(query,'2026-11-17')), query);
});
test('collection charts fill calendar gaps without inventing counts and cap long ranges', () => {
  assert.deepEqual(collectionSeries([{month:'2026-01',total:3},{month:'2026-03',total:2}]), [
    {month:'2026-01',total:3},{month:'2026-02',total:0},{month:'2026-03',total:2}
  ]);
  const year = collectionSeries([{month:'2026-03',total:2}],{date_from:'2026-01-01',date_to:'2026-12-31'});
  assert.equal(year.length,12);
  assert.equal(year.reduce((sum,item)=>sum+item.total,0),2);
  const long = collectionSeries([],{date_from:'2020-01-01',date_to:'2026-12-31'});
  assert.equal(long.length,12);
  assert.equal(long[0].month,'2026-01');
  assert.deepEqual(collectionSeries([]),[]);
});
test('empty groups have no percentage and non-empty rates preserve their denominator', () => {
  assert.equal(percentage(0,0),null);
  assert.equal(percentage(1,3),33.3);
  assert.equal(percentage(3,3),100);
});
