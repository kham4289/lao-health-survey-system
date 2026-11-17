<script setup>
const route = useRoute()
const config = useRuntimeConfig()
const { data, status, error, refresh } = await useFetch(
  () => `${config.public.apiBase}/api/surveys/${encodeURIComponent(String(route.params.id))}`
)
</script>

<template>
  <div v-if="status === 'pending'" role="status" class="text-center pa-6">
    <v-progress-circular indeterminate color="teal" class="mr-2" />
    Loading survey…
  </div>
  <v-card v-else-if="error || !data?.data" class="pa-5 mx-auto" max-width="680">
    <h1 class="text-h5 mb-3">Edit Survey</h1>
    <v-alert type="error" class="mb-4">
      {{error?.statusCode === 404 ? 'Survey not found.' : 'Could not load this survey. Please try again.'}}
    </v-alert>
    <v-btn color="teal" @click="refresh()">Try again</v-btn>
    <v-btn to="/" variant="text" class="ml-2">Back to dashboard</v-btn>
  </v-card>
  <SurveyForm v-else :key="data.data.id" :survey="data.data" />
</template>
