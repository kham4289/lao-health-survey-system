export default defineNuxtRouteMiddleware(async(to)=>{
 const {refreshUser,canWrite,isAdmin}=useAuth()
 const user=await refreshUser()
 if(to.path==='/login') {if(user)return navigateTo('/');return}
 if(!user)return navigateTo('/login')
 if(to.path==='/users'&&!isAdmin.value)return navigateTo('/')
 if((to.path==='/surveys/create'||/^\/surveys\/[^/]+\/edit$/.test(to.path))&&!canWrite.value)return navigateTo('/')
})
