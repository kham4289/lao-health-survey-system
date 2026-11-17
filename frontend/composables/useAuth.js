export function useAuth() {
 const user=useState('auth-user',()=>null)
 const request=useRequestFetch()
 const canWrite=computed(()=>['admin','data_entry'].includes(user.value?.role))
 const isAdmin=computed(()=>user.value?.role==='admin')
 async function refreshUser() {
  try {const result=await request('/api/auth/me');user.value=result.data}
  catch(error){
   if(error.statusCode===401||error.status===401)user.value=null
   else throw createError({statusCode:503,statusMessage:'Cannot connect to the sign-in service. Please try again.'})
  }
  return user.value
 }
 async function logout() {
  await $fetch('/api/auth/logout',{method:'POST'})
  user.value=null;clearNuxtData();await navigateTo('/login')
 }
 return {user,canWrite,isAdmin,refreshUser,logout}
}
