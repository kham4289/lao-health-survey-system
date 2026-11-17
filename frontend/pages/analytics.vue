<script setup>
const {canWrite}=useAuth()
import { buildSurveyQuery, surveyFilterDraft } from '~/utils/survey-filters.mjs'
import { collectionSeries, percentage } from '~/utils/reporting.mjs'
useHead({title:'Survey Intelligence · Lao Health Survey'})
const config=useRuntimeConfig()
const today=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Vientiane',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date())
const filters=reactive(surveyFilterDraft(useRoute().query,today))
const filterError=ref('')
let initialQuery={}
try{initialQuery=buildSurveyQuery(filters)}catch(e){filterError.value=e.message}
const applied=ref(initialQuery)
const {data,status,error,refresh}=await useFetch(`${config.public.apiBase}/api/surveys/reporting`,{key:'survey-reporting',query:applied})
const {data:provinceOptions}=await useFetch(`${config.public.apiBase}/api/surveys/summary`,{key:'report-province-options'})
const loading=computed(()=>status.value==='pending')
const report=computed(()=>!loading.value && !error.value ? data.value?.data : null)
const metrics=computed(()=>report.value?.metrics)
const rate=(value,total=metrics.value?.total)=>percentage(value,total)
const percent=value=>value===null || value===undefined ? '—' : `${value.toFixed(1)}%`
const number=value=>value===null || value===undefined ? '—' : value.toLocaleString()
const sexItems=computed(()=>[
  {label:'Female',total:report.value?.by_sex.find(item=>item.label==='female')?.total || 0,color:'#1a8e82'},
  {label:'Male',total:report.value?.by_sex.find(item=>item.label==='male')?.total || 0,color:'#6b83b7'},
  {label:'Other',total:report.value?.by_sex.find(item=>item.label==='other')?.total || 0,color:'#c4b38b'}
])
const ageItems=computed(()=>['18–29','30–44','45–59','60+'].map(label=>({label,total:report.value?.by_age.find(item=>item.label===label)?.total || 0})))
const tobaccoItems=computed(()=>[
  {label:'Current use',total:metrics.value?.tobacco_users || 0,color:'#c47b50'},
  {label:'No current use',total:(metrics.value?.total || 0)-(metrics.value?.tobacco_users || 0),color:'#9bcac0'}
])
const trend=computed(()=>collectionSeries(report.value?.collection_trend || [],applied.value))
const activity=computed(()=>(report.value?.by_activity || []).map(item=>({label:`${item.days} ${item.days===1?'day':'days'}`,total:item.total})))
const queryString=computed(()=>new URLSearchParams(applied.value).toString())
const recordsLink=computed(()=>({path:'/',query:applied.value}))
const periodLabel=computed(()=>applied.value.date_from ? `${applied.value.date_from} — ${applied.value.date_to}` : 'All collection dates')
const formatter=new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Vientiane',dateStyle:'medium',timeStyle:'short'})
const updatedAt=computed(()=>report.value?.generated_at ? formatter.format(new Date(report.value.generated_at)) : 'Awaiting data')
const qualityRows=computed(()=>[
  {label:'Required fields complete',detail:'Code, location, age, sex, tobacco and activity responses.',count:report.value?.quality.complete_records || 0},
  {label:'Values within survey rules',detail:'Age 18–120; activity 0–7 days; accepted sex values; required text present.',count:report.value?.quality.valid_records || 0},
  {label:'Unique participant codes',detail:'Distinct participant codes; uniqueness is enforced in the database.',count:report.value?.quality.unique_codes || 0}
])
const workflow=[
  {step:'01',icon:'mdi-clipboard-edit-outline',title:'Capture',description:'Enter a fictional participant code, location and survey responses.',action:'New survey',to:'/surveys/create'},
  {step:'02',icon:'mdi-check-decagram-outline',title:'Validate',description:'Check required values, accepted ranges and duplicate codes before saving.'},
  {step:'03',icon:'mdi-database-outline',title:'Manage',description:'Store in PostgreSQL; search, filter and correct existing survey records.',action:'Manage records',to:'/'},
  {step:'04',icon:'mdi-chart-box-outline',title:'Review',description:'Inspect collection patterns, participant profiles and data quality.'},
  {step:'05',icon:'mdi-file-delimited-outline',title:'Report',description:'Export the matching records as CSV or print this aggregate dashboard.'}
]
const controls=[
  {label:'Server-side input validation',state:'Implemented',done:true},
  {label:'Parameterized database queries',state:'Implemented',done:true},
  {label:'Unique participant code constraint',state:'Implemented',done:true},
  {label:'User sign-in & role permissions',state:'Implemented',done:true},
  {label:'Change and export audit trail',state:'Not implemented',done:false},
  {label:'Consent & retention workflow',state:'Not implemented',done:false}
]
function applyFilters(){try{applied.value=buildSurveyQuery(filters);filterError.value='';return true}catch(e){filterError.value=e.message;return false}}
function reset(){filters.search='';filters.province='';filters.period='all';applyFilters()}
function chooseProvince(province){filters.province=province;applyFilters()}
function chooseMonth(month){filters.period='month';filters.month=month;applyFilters()}
function exportCsv(){if(applyFilters())window.location.assign(`${config.public.apiBase}/api/surveys/export.csv?${queryString.value}`)}
function printReport(){window.print()}
</script>

<template>
  <div class="intelligence-page">
    <header class="intelligence-header">
      <div><NuxtLink to="/" class="back-link"><v-icon size="15">mdi-arrow-left</v-icon> Survey records</NuxtLink>
        <div class="eyebrow mt-5">LAO HEALTH SURVEY <span>/</span> ANALYTICS WORKSPACE</div>
        <h1>Survey intelligence<span>.</span></h1>
        <p class="page-intro">From field collection to a clearer picture.</p>
      </div>
      <div class="header-status"><span class="demo-badge"><span /> LOCAL DEMO</span><p>Fictional data · live database aggregates</p><small>Updated {{updatedAt}} · Laos time</small></div>
    </header>

    <nav class="report-navigation" aria-label="Report sections">
      <div><a href="#overview" class="nav-overview"><v-icon size="17">mdi-view-dashboard-outline</v-icon> Overview</a><a href="#data-quality">Data quality</a><a href="#workflow">Workflow & security</a></div>
      <div class="report-actions"><button type="button" :disabled="loading" @click="refresh()"><v-icon size="16">mdi-refresh</v-icon><span>Refresh</span></button><button type="button" :disabled="!report" @click="printReport"><v-icon size="16">mdi-printer-outline</v-icon><span>Print report</span></button></div>
    </nav>

    <section class="filter-panel" aria-label="Report filters">
      <div class="filter-heading"><v-icon size="18">mdi-tune-variant</v-icon><strong>Report scope</strong><span>Created date · Asia/Vientiane</span></div>
      <v-form @submit.prevent="applyFilters">
        <v-row dense>
          <v-col cols="12" md="4"><v-text-field v-model="filters.search" label="Search participants or locations" prepend-inner-icon="mdi-magnify" variant="outlined" density="compact" maxlength="100" clearable hide-details="auto" /></v-col>
          <v-col cols="12" sm="6" md="4"><v-select v-model="filters.province" label="Province" :items="provinceOptions?.data?.by_province?.map(item=>item.province) || []" clearable variant="outlined" density="compact" hide-details="auto" /></v-col>
          <v-col cols="12" sm="6" md="4"><v-select v-model="filters.period" label="Collection period" :items="[{title:'All dates',value:'all'},{title:'Date to date',value:'range'},{title:'Month',value:'month'},{title:'Year',value:'year'}]" variant="outlined" density="compact" hide-details="auto" /></v-col>
          <template v-if="filters.period==='range'"><v-col cols="12" sm="6"><v-text-field v-model="filters.from" type="date" label="From date" min="0001-01-01" max="9999-12-31" variant="outlined" density="compact" hide-details="auto" /></v-col><v-col cols="12" sm="6"><v-text-field v-model="filters.to" type="date" label="To date" min="0001-01-01" max="9999-12-31" variant="outlined" density="compact" hide-details="auto" /></v-col></template>
          <v-col v-if="filters.period==='month'" cols="12" sm="6"><v-text-field v-model="filters.month" type="month" label="Select month" min="0001-01" max="9999-12" variant="outlined" density="compact" hide-details="auto" /></v-col>
          <v-col v-if="filters.period==='year'" cols="12" sm="6"><v-text-field v-model="filters.year" type="number" label="Select year" min="1" max="9999" variant="outlined" density="compact" hide-details="auto" /></v-col>
        </v-row>
        <v-alert v-if="filterError" type="error" density="compact" class="mt-3">{{filterError}}</v-alert>
        <div class="filter-footer"><div class="scope-caption" aria-live="polite"><v-icon size="14">mdi-calendar-range</v-icon>{{periodLabel}}<span v-if="applied.province"> · {{applied.province}}</span><span v-if="applied.q"> · “{{applied.q}}”</span></div><div class="filter-buttons"><v-btn variant="text" size="small" :disabled="loading" @click="reset">Reset</v-btn><v-btn type="submit" color="teal-darken-2" size="small" variant="flat" :loading="loading">Apply filters</v-btn></div></div>
      </v-form>
    </section>

    <v-alert v-if="error" type="error" class="my-5">Could not load the report. <button type="button" class="retry-button" @click="refresh()">Try again</button></v-alert>
    <div v-if="loading" class="loading-report" role="status"><v-progress-circular indeterminate color="teal" size="24" /> Updating report from the database…</div>

    <section id="overview" class="metric-grid" aria-label="Survey indicators">
      <article class="metric-card metric-primary"><div class="metric-label">SURVEYS COLLECTED<v-icon size="19">mdi-clipboard-text-outline</v-icon></div><strong>{{number(metrics?.total)}}</strong><div class="metric-foot">Matching participant records</div></article>
      <article class="metric-card"><div class="metric-label">GEOGRAPHIC REACH<v-icon size="19">mdi-map-marker-radius-outline</v-icon></div><strong>{{number(metrics?.provinces)}}<small>provinces</small></strong><div class="metric-foot">{{number(metrics?.districts)}} districts represented</div></article>
      <article class="metric-card"><div class="metric-label">REQUIRED FIELDS COMPLETE<v-icon size="19">mdi-check-circle-outline</v-icon></div><strong>{{report ? percent(rate(report.quality.complete_records)) : '—'}}</strong><div class="metric-foot">{{number(report?.quality.complete_records)}} complete of {{number(metrics?.total)}} records</div></article>
      <article class="metric-card"><div class="metric-label">CURRENT TOBACCO USE<v-icon size="19">mdi-chart-donut</v-icon></div><strong>{{metrics ? percent(rate(metrics.tobacco_users)) : '—'}}</strong><div class="metric-foot">{{number(metrics?.tobacco_users)}} respondents reported use</div></article>
    </section>

    <div v-if="report && !metrics.total" class="empty-report"><v-icon size="34" color="teal">mdi-chart-box-outline</v-icon><h2>No surveys in this report scope</h2><p>Choose another period or province, reset the filters, or collect your first survey.</p><v-btn variant="outlined" color="teal" class="mt-3" @click="reset">Reset filters</v-btn></div>

    <template v-if="report && metrics.total">
      <div class="report-grid collection-grid">
        <section class="report-panel"><div class="panel-heading"><div><span class="section-kicker">DATA COLLECTION</span><h2>Collection over time</h2></div><span class="panel-badge">Monthly</span></div><p class="panel-description">Matching records by creation month. Up to 12 calendar months; choose a month below to explore.</p><ReportTrend :items="trend" @select="chooseMonth" /><div class="chart-note"><span class="chart-dot" /> Surveys recorded <span class="note-right">{{trend[0]?.month}} — {{trend.at(-1)?.month}}</span></div></section>
        <section class="report-panel"><div class="panel-heading"><div><span class="section-kicker">FIELD COVERAGE</span><h2>Collection by province</h2></div><v-icon size="21" color="teal">mdi-map-marker-outline</v-icon></div><p class="panel-description">Top six provinces by survey count. Click a bar to focus the report.</p><ReportBars :items="report.by_province.slice(0,6)" interactive @select="chooseProvince" /><div class="panel-bottom">{{metrics.provinces}} provinces represented · survey counts, not coverage targets</div></section>
      </div>

      <div class="report-grid participant-grid">
        <section class="report-panel"><div class="panel-heading"><div><span class="section-kicker">PARTICIPANT PROFILE</span><h2>Reported sex</h2></div><span class="panel-badge">n = {{metrics.total}}</span></div><ReportDonut :items="sexItems" label="Participant distribution by reported sex" /></section>
        <section class="report-panel"><div class="panel-heading"><div><span class="section-kicker">PARTICIPANT PROFILE</span><h2>Age distribution</h2></div><span class="panel-badge">Mean {{metrics.average_age}}</span></div><ReportBars :items="ageItems" color="#7188b5" /><div class="panel-bottom">Age in years · adults aged 18–120</div></section>
      </div>

      <div class="report-grid participant-grid">
        <section class="report-panel"><div class="panel-heading"><div><span class="section-kicker">SURVEY RESPONSES</span><h2>Tobacco use</h2></div><span class="panel-badge badge-warm">{{percent(rate(metrics.tobacco_users))}} current use</span></div><ReportDonut :items="tobaccoItems" label="Self-reported current tobacco use" /><div class="panel-bottom">Self-reported responses among matching participants.</div></section>
        <section class="report-panel"><div class="panel-heading"><div><span class="section-kicker">SURVEY RESPONSES</span><h2>Physical activity</h2></div><span class="panel-badge">Mean {{metrics.average_activity_days}} days</span></div><p class="panel-description">Reported activity days per week · count of participants</p><div class="activity-chart"><div v-for="item in activity" :key="item.label" class="activity-column"><strong>{{item.total}}</strong><div class="activity-track"><div :style="{height:`${item.total/Math.max(1,...activity.map(row=>row.total))*100}%`}" /></div><span>{{item.label}}</span></div></div><div class="panel-bottom">Descriptive responses; no clinical risk classification is assigned.</div></section>
      </div>
    </template>

    <section id="data-quality" class="report-panel quality-panel">
      <div class="panel-heading"><div><span class="section-kicker">DATA MANAGEMENT</span><h2>Quality before reporting</h2></div><span class="panel-badge">{{report ? number(metrics.total) : '—'}} records checked</span></div>
      <p class="panel-description">Checks run on the current report scope. Completeness and valid values do not establish clinical accuracy.</p>
      <div v-for="check in qualityRows" :key="check.label" class="quality-row"><div><h3>{{check.label}}</h3><p>{{check.detail}}</p></div><div class="quality-result"><div class="quality-track"><span :style="{width:`${report ? rate(check.count) || 0 : 0}%`}" /></div><strong>{{report ? percent(rate(check.count)) : '—'}}</strong><small>{{report ? check.count : '—'}} / {{number(metrics?.total)}}</small></div></div>
      <div class="quality-explanation"><v-icon size="17">mdi-information-outline</v-icon>Completeness checks all seven survey fields. Formal review, approval status and edit history are not tracked in this demo.</div>
    </section>

    <section id="workflow" class="workflow-section">
      <div class="section-title"><div><span class="section-kicker">HEALTH SURVEY WORKFLOW</span><h2>A connected collection-to-report process</h2></div><span class="plain-note">Current capabilities</span></div>
      <div class="workflow-grid"><article v-for="item in workflow" :key="item.step" class="workflow-card"><div class="workflow-top"><span>{{item.step}}</span><v-icon size="21">{{item.icon}}</v-icon></div><h3>{{item.title}}</h3><p>{{item.description}}</p><NuxtLink v-if="item.to && (item.to!=='/surveys/create' || canWrite)" :to="item.to">{{item.action}} <span>↗</span></NuxtLink></article></div>
    </section>

    <div class="report-grid governance-grid">
      <section class="report-panel"><div class="panel-heading"><div><span class="section-kicker">SECURITY & GOVERNANCE</span><h2>Controls, with clear boundaries</h2></div><v-icon size="21" color="teal">mdi-shield-check-outline</v-icon></div><div class="security-notice"><strong>Local demonstration · role-based access</strong><p>Sign-in is required. Administrators manage access, data entry staff create and edit surveys, and viewers can read and export. Use fictional data only.</p></div><div v-for="control in controls" :key="control.label" class="control-row"><span>{{control.label}}</span><span :class="['control-state',control.done ? 'implemented' : 'planned']"><span />{{control.state}}</span></div><p class="security-footnote">TLS and encryption at rest are not configured by this application. These are implementation statuses, not a security audit or compliance certification.</p></section>
      <section class="report-panel reporting-panel"><div><span class="section-kicker">REPORTING & HANDOFF</span><h2>Take the right records forward.</h2><p>Keep the same search, province and collection period when moving from aggregate analysis to record review or CSV reporting.</p></div><dl class="report-scope"><div><dt>Collection period</dt><dd>{{periodLabel}}</dd></div><div><dt>Province</dt><dd>{{applied.province || 'All provinces'}}</dd></div><div><dt>Search</dt><dd>{{applied.q || 'All participants'}}</dd></div><div><dt>Matching records</dt><dd>{{number(metrics?.total)}}</dd></div></dl><div class="handoff-actions"><v-btn color="teal-darken-2" variant="flat" prepend-icon="mdi-download" :disabled="loading || !report" @click="exportCsv">Export matching CSV</v-btn><v-btn :to="recordsLink" variant="outlined" color="teal-darken-2" :disabled="!report">View matching records</v-btn></div><small>CSV applies the current filter selections and includes all matches. Print report uses the applied report scope.</small></section>
    </div>
    <footer class="report-footer"><span>Lao Health Survey Management System</span><span>Independent demo · descriptive survey reporting · Asia/Vientiane</span></footer>
  </div>
</template>

<style scoped>
.intelligence-page{--ink:#203747;--muted:#748493;--teal:#168779;color:var(--ink);background:#f5f8fa;margin:-16px;padding:30px 26px 12px;border-radius:8px;font-family:inherit}.intelligence-header{display:flex;justify-content:space-between;gap:24px;align-items:flex-end;margin-bottom:28px}.back-link{font-size:12px;color:#6f8190;text-decoration:none;display:inline-flex;gap:6px;align-items:center}.back-link:hover{color:var(--teal)}.eyebrow{font-size:10px;letter-spacing:1.9px;font-weight:700;color:#6b8290}.eyebrow span{margin:0 9px;color:#a1b1ba}h1{font-size:clamp(30px,4vw,46px);letter-spacing:-1.8px;line-height:1.2;font-weight:700;margin-top:10px}h1>span{color:#229889}.page-intro{font-size:14px;color:var(--muted);margin-top:9px}.header-status{text-align:right;padding-bottom:2px}.demo-badge{display:inline-flex;align-items:center;gap:7px;font-size:10px;letter-spacing:1px;font-weight:700;color:#20786c;border:1px solid #d4e8df;border-radius:20px;padding:6px 10px;background:#edf7f1}.demo-badge>span{width:6px;height:6px;border-radius:50%;background:#279c7d}.header-status p{font-size:11px;color:#718593;margin:10px 0 3px}.header-status small{font-size:10px;color:#92a0aa}.report-navigation{display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid #dfe8ed;margin-bottom:23px;gap:12px}.report-navigation>div{display:flex;align-items:center;gap:25px}.report-navigation a{font-size:12px;text-decoration:none;color:#778692;display:inline-flex;align-items:center;gap:7px;padding:14px 0;border-bottom:2px solid transparent;white-space:nowrap}.report-navigation a:hover,.report-navigation a:focus-visible{color:var(--teal)}.report-navigation .nav-overview{border-color:var(--teal);color:#257a70;font-weight:700}.report-actions{gap:14px!important}.report-actions button{display:flex;gap:5px;align-items:center;font-size:11px;color:#657985;cursor:pointer}.report-actions button:disabled{opacity:.4;cursor:default}.filter-panel{background:#fff;border:1px solid #e2e9ee;border-radius:10px;padding:18px 20px;margin-bottom:23px}.filter-heading{display:flex;gap:9px;align-items:center;margin-bottom:16px;font-size:12px}.filter-heading .v-icon{color:#268577}.filter-heading>span{margin-left:auto;color:#93a0aa;font-size:10px}.filter-panel :deep(.v-field){font-size:12px;border-radius:6px}.filter-panel :deep(.v-label){font-size:12px}.filter-footer{display:flex;justify-content:space-between;align-items:center;gap:14px;margin-top:14px}.scope-caption{font-size:10px;color:#80919c;display:flex;align-items:center;gap:5px;flex-wrap:wrap}.filter-buttons{display:flex;gap:7px}.filter-buttons :deep(.v-btn){text-transform:none;letter-spacing:0;font-size:11px}.metric-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:16px;margin-bottom:22px;scroll-margin-top:85px}.metric-card{background:#fff;border:1px solid #e2e9ed;border-radius:10px;padding:21px 20px}.metric-label{font-size:9px;letter-spacing:1px;font-weight:700;color:#7a8a95;display:flex;align-items:center;justify-content:space-between;gap:6px}.metric-label .v-icon{color:#91b1a9}.metric-card>strong{font-size:36px;line-height:1.3;letter-spacing:-1.6px;display:block;margin:13px 0 8px;font-weight:700;font-variant-numeric:tabular-nums}.metric-card strong>small{font-size:12px;margin-left:8px;color:#82949c;letter-spacing:0;font-weight:400}.metric-foot{font-size:10px;color:#8b9aa4;line-height:1.6}.metric-primary{background:#176b62;border-color:#176b62;color:white}.metric-primary .metric-label{color:#c1e1d9}.metric-primary .metric-label .v-icon{color:#92c6b9}.metric-primary .metric-foot{color:#bedbd4}.report-grid{display:grid;gap:20px;margin-bottom:20px}.collection-grid{grid-template-columns:minmax(0,1.55fr) minmax(0,1fr)}.participant-grid,.governance-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.report-panel{background:#fff;border:1px solid #e2e9ed;border-radius:10px;padding:23px;min-width:0}.panel-heading{display:flex;justify-content:space-between;align-items:flex-start;gap:10px;margin-bottom:20px}.section-kicker{font-size:9px;font-weight:700;letter-spacing:1.3px;color:#8d9ba4}.report-panel h2,.section-title h2{font-size:17px;letter-spacing:-.35px;font-weight:650;margin-top:5px;line-height:1.4}.panel-badge{font-size:9px;color:#6e8492;background:#f1f5f7;border:1px solid #e9eef2;border-radius:5px;padding:4px 7px;white-space:nowrap;margin-top:6px}.badge-warm{color:#ac7757;background:#fcf4ed;border-color:#f0e5d9}.panel-description{font-size:11px;color:#8a98a4;line-height:1.7;margin-top:-7px;margin-bottom:20px}.chart-note{display:flex;align-items:center;gap:6px;font-size:10px;color:#8294a0;margin-top:15px}.chart-dot{background:#198d81;width:7px;height:7px;border-radius:2px}.note-right{margin-left:auto;color:#a0adb5}.panel-bottom{font-size:10px;color:#8b9ca8;border-top:1px solid #edf1f4;padding-top:15px;margin-top:23px;line-height:1.7}.activity-chart{display:flex;gap:12px;align-items:flex-end;height:167px;padding:8px 2px 0}.activity-column{display:flex;flex:1;flex-direction:column;align-items:center;gap:8px;min-width:0}.activity-column>strong{font-size:11px;font-weight:600;color:#5c7f77}.activity-track{height:106px;width:70%;display:flex;align-items:flex-end;border-radius:4px;background:#f0f5f3;overflow:hidden}.activity-track>div{width:100%;background:#87b8a9;border-radius:4px 4px 0 0;transition:height .3s}.activity-column>span{font-size:9px;color:#8b9ca4;white-space:nowrap}.quality-panel{margin-bottom:30px;scroll-margin-top:85px}.quality-row{display:flex;align-items:center;justify-content:space-between;border-top:1px solid #edf1f4;padding:17px 0;gap:22px}.quality-row h3{font-size:12px;font-weight:600}.quality-row p{font-size:10px;color:#8c9ba5;margin-top:4px;line-height:1.6}.quality-result{display:flex;align-items:center;gap:13px;min-width:37%;justify-content:flex-end}.quality-track{width:130px;height:6px;border-radius:4px;background:#ecf3ef;overflow:hidden}.quality-track>span{display:block;background:#5ca895;height:100%;border-radius:4px}.quality-result>strong{font-size:12px;color:#3a8373;min-width:46px;text-align:right}.quality-result>small{font-size:10px;color:#8c9da6;min-width:45px;text-align:right}.quality-explanation{display:flex;gap:8px;align-items:flex-start;font-size:10px;line-height:1.8;color:#8a9ba4;background:#f6f9fa;padding:11px 13px;border-radius:5px}.workflow-section{margin-bottom:24px;scroll-margin-top:85px}.section-title{display:flex;align-items:center;justify-content:space-between;margin:0 0 18px}.plain-note{font-size:10px;color:#96a5ae}.workflow-grid{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:13px}.workflow-card{background:#fff;border:1px solid #e2e9ed;border-radius:9px;padding:17px 15px;display:flex;flex-direction:column}.workflow-top{display:flex;justify-content:space-between;align-items:center;color:#6e9e94;margin-bottom:17px}.workflow-top>span{font-size:10px;letter-spacing:1px;color:#a3b1b9}.workflow-card h3{font-size:13px;margin-bottom:8px}.workflow-card p{font-size:10px;color:#899aa5;line-height:1.9;margin-bottom:12px}.workflow-card a{font-size:10px;color:#248578;text-decoration:none;margin-top:auto}.workflow-card a:hover{text-decoration:underline}.workflow-card a>span{margin-left:4px}.security-notice{background:#fcf8ef;border:1px solid #efe6d1;border-radius:6px;padding:12px 14px;margin-bottom:17px}.security-notice strong{font-size:11px;color:#9e7d43;font-weight:600}.security-notice p{font-size:10px;line-height:1.8;color:#a28c68;margin-top:4px}.control-row{display:flex;justify-content:space-between;align-items:center;gap:10px;padding:11px 0;border-bottom:1px solid #edf1f4;font-size:10px}.control-state{display:inline-flex;align-items:center;gap:5px;font-size:9px;white-space:nowrap}.control-state>span{width:5px;height:5px;border-radius:50%;background:currentColor}.implemented{color:#34846f}.planned{color:#a39172}.security-footnote{font-size:9px;line-height:1.9;color:#98a5ad;margin-top:15px}.reporting-panel{display:flex;flex-direction:column;background:linear-gradient(140deg,#f1f8f4,#fff);border-color:#dce9e1}.reporting-panel h2{font-size:24px;max-width:280px;line-height:1.4;letter-spacing:-.8px;margin-top:10px}.reporting-panel>div>p{font-size:11px;color:#7b948a;line-height:1.9;margin-top:12px;max-width:370px}.report-scope{margin:24px 0;display:grid;gap:11px}.report-scope>div{display:flex;justify-content:space-between;gap:18px;font-size:10px;border-bottom:1px solid #e3ece6;padding-bottom:10px}.report-scope dt{color:#8a9e95}.report-scope dd{font-weight:600;text-align:right;overflow-wrap:anywhere}.handoff-actions{display:flex;flex-wrap:wrap;gap:9px;margin-top:auto}.handoff-actions :deep(.v-btn){text-transform:none;font-size:11px;letter-spacing:0}.reporting-panel>small{font-size:9px;color:#94a79d;margin-top:14px;line-height:1.8}.report-footer{display:flex;justify-content:space-between;gap:15px;border-top:1px solid #e1e9ed;margin-top:28px;padding:18px 0 5px;font-size:9px;color:#a0aeb7}.empty-report{text-align:center;border:1px dashed #cbded7;border-radius:10px;padding:36px 20px;margin:0 0 20px;background:#fff}.empty-report h2{font-size:19px;margin-top:12px}.empty-report p{font-size:12px;color:#82949d;margin-top:8px}.loading-report{display:flex;gap:12px;align-items:center;font-size:12px;padding:12px 0 22px;color:#7b938a}.retry-button{text-decoration:underline;font:inherit}.report-navigation a:focus-visible,.report-actions button:focus-visible,.back-link:focus-visible{outline:2px solid #168779;outline-offset:4px}
@media(max-width:1050px){.metric-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.collection-grid{grid-template-columns:1fr 1fr}.report-panel{padding:20px}.workflow-grid{grid-template-columns:repeat(3,minmax(0,1fr))}.intelligence-page{padding:24px 18px 10px}.quality-track{width:80px}.report-navigation>div{gap:16px}}
@media(max-width:700px){.intelligence-header{flex-direction:column;align-items:flex-start;gap:20px}.header-status{text-align:left}.header-status p{display:inline-block;margin:0 0 0 9px}.header-status small{display:block;margin-top:7px}.report-grid{grid-template-columns:1fr}.report-navigation{flex-wrap:wrap}.report-navigation>div{gap:15px}.report-navigation a{font-size:10px}.report-actions{margin-bottom:10px}.filter-heading>span{font-size:9px}.filter-footer{align-items:flex-start;flex-direction:column}.filter-buttons{align-self:flex-end}.metric-card{padding:17px 14px}.metric-label{font-size:8px;letter-spacing:.5px}.metric-card>strong{font-size:30px}.metric-card strong>small{font-size:10px}.metric-foot{font-size:9px}.workflow-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.quality-row{flex-direction:column;align-items:flex-start;gap:10px}.quality-result{width:100%;justify-content:flex-start}.quality-track{flex:1}.report-footer{flex-direction:column}.intelligence-page{margin:-12px;padding:20px 14px 10px}.plain-note{display:none}.reporting-panel h2{font-size:24px}}
@media print{.intelligence-page{background:white;padding:0;margin:0}.report-navigation,.filter-panel,.back-link,.handoff-actions,.workflow-card a,.loading-report{display:none!important}.report-panel,.metric-card,.workflow-card{break-inside:avoid;box-shadow:none}.report-grid{grid-template-columns:1fr 1fr}.metric-grid{grid-template-columns:repeat(4,1fr)}.workflow-grid{grid-template-columns:repeat(5,1fr)}.report-panel{padding:16px}.intelligence-header{margin-bottom:20px}.report-footer{font-size:8px}.metric-primary{background:#fff;color:#176b62;border-color:#b9d4cb}.metric-primary .metric-label,.metric-primary .metric-foot{color:#527e70}}
</style>
