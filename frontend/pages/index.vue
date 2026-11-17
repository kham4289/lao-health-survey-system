<script setup>
import { buildSurveyQuery, surveyFilterDraft } from '~/utils/survey-filters.mjs'
const config = useRuntimeConfig()
const {canWrite,isAdmin}=useAuth()
const today = new Intl.DateTimeFormat('en-CA', {timeZone:'Asia/Vientiane',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date())
const filters = reactive(surveyFilterDraft(useRoute().query,today))
const filterError = ref('')
let initialQuery = {}
try { initialQuery = buildSurveyQuery(filters) } catch (error) { filterError.value = error.message }
const appliedFilters = ref(initialQuery)
const {data:summary, refresh, status:summaryStatus, error:summaryError} = await useFetch(`${config.public.apiBase}/api/surveys/summary`, {
  key:'survey-summary', query:appliedFilters,
  default:()=>({data:{total:0,tobacco_users:0,average_age:null,by_province:[]}})
})
const {data:records, refresh:refreshRecords, status:recordsStatus, error:recordsError} = await useFetch(`${config.public.apiBase}/api/surveys`, {
  key:'survey-records', query:appliedFilters, default:()=>({data:[]})
})
const loading = computed(()=>summaryStatus.value === 'pending' || recordsStatus.value === 'pending')
const hasError = computed(()=>Boolean(summaryError.value || recordsError.value))
const deleteTarget = ref(null)
const deleting = ref(false)
const deleteError = ref('')
const deleteSuccess = ref('')
function confirmDelete(record) {
  deleteError.value = ''
  deleteSuccess.value = ''
  deleteTarget.value = record
}
async function deleteSurvey() {
  if (!deleteTarget.value || deleting.value) return
  deleting.value = true
  deleteError.value = ''
  try {
    await $fetch(`${config.public.apiBase}/api/surveys/${deleteTarget.value.id}`, {method:'DELETE'})
    deleteSuccess.value = `Survey ${deleteTarget.value.participant_code} deleted.`
    deleteTarget.value = null
    await Promise.all([refresh(), refreshRecords()])
  } catch (error) {
    deleteError.value = error.data?.message || 'Could not delete survey. Please try again.'
  } finally {
    deleting.value = false
  }
}
const exportUrl = computed(()=>`${config.public.apiBase}/api/surveys/export.csv?${new URLSearchParams(appliedFilters.value)}`)
const activeDescription = computed(()=>{
  const query = appliedFilters.value
  return [query.q ? `Search: ${query.q}` : 'All participants', query.province || 'All provinces', query.date_from ? `${query.date_from} to ${query.date_to}` : 'All dates'].join(' · ')
})
function applyFilters() {
  try {
    appliedFilters.value = buildSurveyQuery(filters)
    filterError.value = ''
    return true
  } catch (error) {
    filterError.value = error.message
    return false
  }
}
function resetFilters() {
  filters.search = ''
  filters.province = ''
  filters.period = 'all'
  applyFilters()
}
function exportCsv() {
  if (applyFilters()) window.location.assign(exportUrl.value)
}
function reload() { refresh(); refreshRecords() }
function createdDate(value) {
  return new Intl.DateTimeFormat('en-GB', {timeZone:'Asia/Vientiane',dateStyle:'medium',timeStyle:'short'}).format(new Date(value))
}
</script>

<template>
  <h1 class="text-h4 mb-4">Survey Dashboard</h1>
  <p class="mb-4">Demo records only — no real patient information.</p>
  <v-row>
    <v-col v-for="card in [{label:'Surveys',value:summary?.data?.total},{label:'Tobacco users',value:summary?.data?.tobacco_users},{label:'Average age',value:summary?.data?.average_age ?? '—'}]" :key="card.label" cols="12" sm="4">
      <v-card class="pa-5" elevation="2"><div class="text-subtitle-1">{{card.label}}</div><div class="text-h4">{{loading || hasError ? '—' : card.value}}</div></v-card>
    </v-col>
  </v-row>
  <div class="d-flex flex-wrap ga-2 my-5">
    <v-btn v-if="canWrite" color="teal" to="/surveys/create">New survey</v-btn>
    <v-btn :to="{path:'/analytics',query:appliedFilters}" color="teal-darken-3" variant="tonal" prepend-icon="mdi-chart-box-outline">Advanced dashboard</v-btn>
    <v-btn variant="outlined" :disabled="loading" @click="reload">Refresh</v-btn>
  </div>
  <h2 class="text-h6">By province</h2>
  <v-table><thead><tr><th>Province</th><th>Surveys</th></tr></thead><tbody>
    <tr v-for="province in !loading && !hasError ? summary?.data?.by_province : []" :key="province.province"><td>{{province.province}}</td><td>{{province.total}}</td></tr>
  </tbody></v-table>
  <h2 class="text-h6 mt-6 mb-3">Recent records</h2>
  <v-alert v-if="deleteSuccess" type="success" class="mb-4" role="status" closable @click:close="deleteSuccess=''">{{deleteSuccess}}</v-alert>
  <v-card class="pa-4 mb-4" variant="outlined">
    <v-chip v-if="filters.province" class="mb-4" color="teal" closable @click:close="filters.province='';applyFilters()">Province: {{filters.province}}</v-chip>
    <v-form @submit.prevent="applyFilters">
      <v-row>
        <v-col cols="12" md="6"><v-text-field v-model="filters.search" label="Search surveys" placeholder="Code, province, district, age or sex" maxlength="100" clearable hide-details="auto" /></v-col>
        <v-col cols="12" md="6"><v-select v-model="filters.period" label="Created date filter" :items="[{title:'All dates',value:'all'},{title:'Date to date',value:'range'},{title:'Month',value:'month'},{title:'Year',value:'year'}]" hide-details="auto" /></v-col>
        <template v-if="filters.period === 'range'">
          <v-col cols="12" sm="6"><v-text-field v-model="filters.from" label="From date" type="date" min="0001-01-01" max="9999-12-31" hide-details="auto" /></v-col>
          <v-col cols="12" sm="6"><v-text-field v-model="filters.to" label="To date" type="date" min="0001-01-01" max="9999-12-31" hide-details="auto" /></v-col>
        </template>
        <v-col v-if="filters.period === 'month'" cols="12" sm="6"><v-text-field v-model="filters.month" label="Month" type="month" min="0001-01" max="9999-12" hide-details="auto" /></v-col>
        <v-col v-if="filters.period === 'year'" cols="12" sm="6"><v-text-field v-model="filters.year" label="Year" type="number" min="1" max="9999" step="1" hide-details="auto" /></v-col>
      </v-row>
      <p class="text-body-2 mt-3">Dates use the survey's creation time in Laos. Both start and end dates are included.</p>
      <v-alert v-if="filterError" type="error" class="mt-3" role="alert">{{filterError}}</v-alert>
      <div class="d-flex flex-wrap ga-2 mt-4">
        <v-btn type="submit" color="teal" :loading="loading">Apply filters</v-btn>
        <v-btn variant="text" :disabled="loading" @click="resetFilters">Reset</v-btn>
        <v-btn variant="outlined" :disabled="loading" @click="exportCsv">Export matching CSV</v-btn>
      </div>
    </v-form>
  </v-card>
  <p class="text-body-2 mb-2" aria-live="polite">{{activeDescription}}</p>
  <v-progress-linear v-if="loading" indeterminate color="teal" aria-label="Loading surveys" />
  <v-alert v-if="hasError" type="error" class="my-3">Could not load surveys. Please try Refresh.</v-alert>
  <p v-else-if="!loading" class="text-body-2 mb-3" aria-live="polite">Showing {{records?.data?.length || 0}} of {{summary?.data?.total || 0}} matching surveys. The list shows up to 200 records; CSV includes all matches.</p>
  <v-table>
    <thead><tr><th>Code</th><th>Province</th><th>Age</th><th>Sex</th><th>Created date (Laos)</th><th v-if="canWrite">Actions</th></tr></thead>
    <tbody>
      <tr v-for="record in !loading && !hasError ? records?.data : []" :key="record.id">
        <td>{{record.participant_code}}</td><td>{{record.province}}</td><td>{{record.age}}</td><td>{{record.sex}}</td><td class="text-no-wrap">{{createdDate(record.created_at)}}</td>
        <td v-if="canWrite" class="text-no-wrap"><v-btn v-if="canWrite" :to="`/surveys/${record.id}/edit`" size="small" variant="text" color="teal" :aria-label="`Edit survey ${record.participant_code}`">Edit</v-btn><v-btn v-if="isAdmin" size="small" variant="text" color="error" :disabled="deleting" :aria-label="`Delete survey ${record.participant_code}`" @click="confirmDelete(record)">Delete</v-btn></td>
      </tr>
      <tr v-if="!loading && !hasError && !records?.data?.length"><td :colspan="canWrite?6:5" class="text-center py-6">No surveys match your filters.</td></tr>
    </tbody>
  </v-table>
  <v-dialog :model-value="Boolean(deleteTarget)" :persistent="deleting" max-width="440" aria-labelledby="delete-survey-title" @update:model-value="value => { if (!value && !deleting) deleteTarget = null }">
    <v-card>
      <v-card-title id="delete-survey-title">Delete survey?</v-card-title>
      <v-card-text>
        <p>Delete survey <strong>{{deleteTarget?.participant_code}}</strong>? This cannot be undone.</p>
        <v-alert v-if="deleteError" type="error" class="mt-4" role="alert">{{deleteError}}</v-alert>
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn :disabled="deleting" @click="deleteTarget=null">Cancel</v-btn>
        <v-btn color="error" variant="flat" :loading="deleting" @click="deleteSurvey">Delete</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>
