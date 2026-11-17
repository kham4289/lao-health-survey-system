<script setup>
const {user,isAdmin,logout}=useAuth()
const signingOut=ref(false),logoutError=ref('')
const roleNames={admin:'Administrator',data_entry:'Data entry',viewer:'Viewer'}
async function signOut(){signingOut.value=true;logoutError.value='';try{await logout()}catch{logoutError.value='Could not sign out. Please try again.'}finally{signingOut.value=false}}
</script>
<template><v-app><v-app-bar color="teal-darken-3">
 <v-app-bar-title><NuxtLink to="/" class="app-title">Lao Health Survey</NuxtLink></v-app-bar-title>
 <template v-if="user"><v-btn to="/" class="d-none d-sm-flex">Surveys</v-btn><v-btn v-if="isAdmin" to="/users" prepend-icon="mdi-account-group-outline">Users</v-btn><div class="account-label d-none d-md-block"><strong>{{user.name}}</strong><small>{{roleNames[user.role]}}</small></div><v-btn :loading="signingOut" aria-label="Sign out" @click="signOut">Sign out</v-btn></template>
 </v-app-bar><v-main><v-container><v-alert v-if="logoutError" type="error" class="mb-4">{{logoutError}}</v-alert><NuxtPage/></v-container></v-main></v-app></template>
<style scoped>.app-title{color:inherit;text-decoration:none;font-weight:600}.account-label{margin:0 16px;text-align:right;line-height:1.4}.account-label strong{display:block;font-size:13px}.account-label small{font-size:11px;opacity:.8}</style>
