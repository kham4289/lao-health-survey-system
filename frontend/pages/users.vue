<script setup>
const {user}=useAuth()
const roleOptions=[{title:'Administrator',value:'admin'},{title:'Data entry',value:'data_entry'},{title:'Viewer',value:'viewer'}]
const {data,error:loadError,status,refresh}=await useFetch('/api/users',{key:'team-users'})
const form=reactive({name:'',email:'',password:'',role:'data_entry'})
const drafts=reactive({})
watch(data,value=>{for(const member of value?.data||[])drafts[member.id]={role:member.role,active:member.active}},{immediate:true})
const creating=ref(false),saving=ref(null),error=ref(''),success=ref(''),showPassword=ref(false)
function changed(member){const d=drafts[member.id];return d&&(d.role!==member.role||d.active!==member.active)}
async function createUser(){
 if(creating.value)return
 creating.value=true;error.value='';success.value=''
 try{await $fetch('/api/users',{method:'POST',body:{...form}});success.value=`Account created for ${form.email}. Share its initial password privately.`;Object.assign(form,{name:'',email:'',password:'',role:'data_entry'});await refresh()}
 catch(e){error.value=e.data?.message||'Could not create user'}finally{creating.value=false}
}
async function saveUser(member){
 if(saving.value)return
 saving.value=member.id;error.value='';success.value=''
 try{await $fetch(`/api/users/${member.id}`,{method:'PATCH',body:drafts[member.id]});success.value=`Updated ${member.name}. They must sign in again.`;await refresh()}
 catch(e){error.value=e.data?.message||'Could not update user'}finally{saving.value=null}
}
</script>
<template>
 <div class="d-flex flex-wrap justify-space-between ga-3 align-center mb-6"><div><p class="text-overline text-teal-darken-2">ADMINISTRATION</p><h1 class="text-h4">Team access</h1><p class="text-body-2 text-medium-emphasis mt-2">Create accounts and control access to survey records.</p></div><v-btn to="/" variant="outlined" color="teal">Back to surveys</v-btn></div>
 <v-alert v-if="error" type="error" class="mb-4" role="alert" closable @click:close="error=''">{{error}}</v-alert><v-alert v-if="success" type="success" class="mb-4" role="status" closable @click:close="success=''">{{success}}</v-alert>
 <v-row><v-col cols="12" lg="4"><v-card class="pa-5" variant="outlined"><h2 class="text-h6 mb-4">Add new user</h2><v-form @submit.prevent="createUser">
 <v-text-field v-model="form.name" label="Full name" autocomplete="off" required maxlength="100" variant="outlined"/><v-text-field v-model="form.email" label="Email address" type="email" autocomplete="off" required maxlength="254" variant="outlined"/><v-select v-model="form.role" :items="roleOptions" label="User role" variant="outlined"/><v-text-field v-model="form.password" label="Initial password" :type="showPassword?'text':'password'" autocomplete="new-password" minlength="12" maxlength="128" required hint="12–128 characters; share privately with this user." persistent-hint variant="outlined"/><v-checkbox v-model="showPassword" label="Show password" hide-details density="compact" class="mb-4"/><v-btn type="submit" color="teal-darken-2" block :loading="creating" prepend-icon="mdi-account-plus-outline">Create user</v-btn>
 </v-form></v-card><v-card class="pa-5 mt-4" color="teal-lighten-5" flat><h2 class="text-subtitle-1 mb-3">Role permissions</h2><p class="text-body-2 mb-3"><strong>Administrator</strong><br>Manage users and create, edit, delete, view and export surveys.</p><p class="text-body-2 mb-3"><strong>Data entry</strong><br>Create, edit, view and export surveys.</p><p class="text-body-2"><strong>Viewer</strong><br>View dashboards and export surveys.</p></v-card></v-col>
 <v-col cols="12" lg="8"><v-card variant="outlined"><div class="pa-5 d-flex justify-space-between align-center"><h2 class="text-h6">Users <v-chip size="small" class="ml-2">{{data?.data?.length||0}}</v-chip></h2><v-btn variant="text" :loading="status==='pending'" @click="refresh">Refresh</v-btn></div><v-alert v-if="loadError" type="error" class="mx-5 mb-4">Could not load users. Please try Refresh.</v-alert><v-progress-linear v-if="status==='pending'" indeterminate color="teal"/>
 <v-table><thead><tr><th>User</th><th style="min-width:180px">Role</th><th>Status</th><th>Action</th></tr></thead><tbody><tr v-for="member in data?.data||[]" :key="member.id"><td class="py-4"><strong>{{member.name}}</strong><v-chip v-if="String(member.id)===String(user.id)" size="x-small" class="ml-2">You</v-chip><div class="text-caption text-medium-emphasis">{{member.email}}</div></td><td><v-select v-if="drafts[member.id]" v-model="drafts[member.id].role" :items="roleOptions" :aria-label="`Role for ${member.name}`" :disabled="String(member.id)===String(user.id)||Boolean(saving)" density="compact" variant="outlined" hide-details/></td><td><v-switch v-if="drafts[member.id]" v-model="drafts[member.id].active" :label="drafts[member.id].active?'Active':'Inactive'" :aria-label="`Active account for ${member.name}`" :disabled="String(member.id)===String(user.id)||Boolean(saving)" color="teal" hide-details density="compact"/></td><td><v-btn size="small" color="teal" variant="tonal" :disabled="!changed(member)||Boolean(saving)||String(member.id)===String(user.id)" :loading="saving===member.id" @click="saveUser(member)">Save</v-btn></td></tr></tbody></v-table><p class="text-caption text-medium-emphasis pa-5">Role and status changes sign the affected user out. You cannot change your own role or deactivate your own account.</p>
 </v-card></v-col></v-row>
</template>
