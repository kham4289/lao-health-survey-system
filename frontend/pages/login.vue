<script setup>
const {user}=useAuth()
const {data:setupStatus,error:statusError,refresh}=await useFetch('/api/auth/status')
const needsSetup=computed(()=>Boolean(setupStatus.value?.needsSetup))
const form=reactive({name:'',email:'',password:'',confirm:''})
const busy=ref(false),error=ref(''),showPassword=ref(false)
async function submit(){
 if(busy.value)return
 error.value=''
 if(needsSetup.value&&form.password!==form.confirm){error.value='Passwords do not match';return}
 busy.value=true
 try{
  const result=await $fetch(needsSetup.value?'/api/auth/setup':'/api/auth/login',{method:'POST',body:{name:form.name,email:form.email,password:form.password}})
  user.value=result.data;form.password='';form.confirm='';clearNuxtData();await navigateTo('/')
 }catch(e){error.value=e.data?.message||'Could not sign in. Please try again.';if(e.status===409||e.statusCode===409)await refresh()}
 finally{busy.value=false}
}
</script>
<template><div class="login-shell">
 <section class="login-intro"><v-icon size="42" color="teal-darken-2">mdi-shield-account-outline</v-icon><p class="text-overline mt-5">LAO HEALTH SURVEY · DEMO</p><h1>{{needsSetup?'Create your administrator account':'Welcome back'}}</h1><p class="intro-copy">{{needsSetup?'Set up the first administrator to manage team access and begin collecting demo surveys.':'Sign in to collect surveys, review reports and work with your team.'}}</p><v-chip color="teal" variant="tonal" class="mt-5">Fictional survey data only</v-chip></section>
 <v-card class="pa-6 pa-sm-8" rounded="lg" elevation="2"><h2 class="text-h5 mb-2">{{needsSetup?'Administrator setup':'Sign in'}}</h2><p class="text-body-2 text-medium-emphasis mb-6">{{needsSetup?'This setup is available only before the first account is created.':'Use the account provided by your administrator.'}}</p>
 <v-alert v-if="statusError" type="error" class="mb-4">Could not check account setup. <v-btn variant="text" @click="refresh">Try again</v-btn></v-alert>
 <v-form v-else @submit.prevent="submit"><v-text-field v-if="needsSetup" v-model="form.name" label="Full name" autocomplete="name" required maxlength="100" variant="outlined"/><v-text-field v-model="form.email" label="Email address" type="email" autocomplete="username" required maxlength="254" variant="outlined"/><v-text-field v-model="form.password" label="Password" :type="showPassword?'text':'password'" :autocomplete="needsSetup?'new-password':'current-password'" :minlength="needsSetup?12:undefined" maxlength="128" required variant="outlined" :hint="needsSetup?'Use 12–128 characters. A long passphrase works well.':''" :persistent-hint="needsSetup"/><v-text-field v-if="needsSetup" v-model="form.confirm" label="Confirm password" :type="showPassword?'text':'password'" autocomplete="new-password" minlength="12" maxlength="128" required variant="outlined" class="mt-2"/><v-checkbox v-model="showPassword" label="Show password" density="compact" hide-details class="mb-4"/><v-alert v-if="error" type="error" role="alert" class="mb-4">{{error}}</v-alert><v-btn type="submit" color="teal-darken-2" block size="large" :loading="busy">{{needsSetup?'Create administrator':'Sign in'}}</v-btn></v-form>
 </v-card></div></template>
<style scoped>.login-shell{max-width:1000px;margin:60px auto;display:grid;grid-template-columns:1fr 1fr;gap:64px;align-items:center}.login-intro h1{font-size:38px;line-height:1.18;letter-spacing:-1px;color:#203f43;max-width:440px}.intro-copy{color:#667d80;line-height:1.8;margin-top:20px;max-width:400px}@media(max-width:700px){.login-shell{grid-template-columns:1fr;gap:28px;margin:20px auto;max-width:480px}.login-intro h1{font-size:30px}.login-intro>.v-icon{display:none}}</style>
