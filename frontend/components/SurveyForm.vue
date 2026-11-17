<script setup>
const props=defineProps({survey:{type:Object,default:null}})
const config=useRuntimeConfig()
const editing=Boolean(props.survey)
const form=reactive({participant_code:'',province:'',district:'',age:18,sex:'male',tobacco_use:false,physical_activity_days:0})
if (props.survey) {
  for (const key of Object.keys(form)) form[key]=props.survey[key]
}
const error=ref('');const loading=ref(false)
async function save(){if(loading.value)return;error.value='';loading.value=true;try {await $fetch(`${config.public.apiBase}/api/surveys${editing ? '/' + props.survey.id : ''}`,{method:editing ? 'PUT' : 'POST',body:{...form,age:Number(form.age),physical_activity_days:Number(form.physical_activity_days)}});clearNuxtData(['survey-summary','survey-records','survey-reporting','report-province-options']);await navigateTo('/')}catch(e){error.value=e?.data?.message||'Could not save survey'}finally{loading.value=false}}
</script>
<template><v-card class="pa-5 mx-auto" max-width="680"><h1 class="text-h5 mb-3">{{editing ? 'Edit Survey (Demo)' : 'New Survey (Demo)'}}</h1><v-alert class="mb-4" type="info">Use fictional participant codes only. Do not enter names or patient identifiers.</v-alert>
<v-form @submit.prevent="save"><v-text-field v-model="form.participant_code" label="Participant code" required maxlength="40"/><v-text-field v-model="form.province" label="Province" required maxlength="100"/><v-text-field v-model="form.district" label="District" required maxlength="100"/><v-text-field v-model.number="form.age" type="number" label="Age (18–120)" min="18" max="120"/><v-select v-model="form.sex" :items="['male','female','other']" label="Sex"/><v-switch v-model="form.tobacco_use" color="teal" label="Current tobacco use"/><v-select v-model.number="form.physical_activity_days" :items="[0,1,2,3,4,5,6,7]" label="Physical activity days / week"/><v-alert v-if="error" type="error" class="mb-3">{{error}}</v-alert><v-btn type="submit" color="teal" :loading="loading">{{editing ? 'Update survey' : 'Save survey'}}</v-btn><v-btn to="/" variant="text" class="ml-2" :disabled="loading">Cancel</v-btn></v-form></v-card></template>
