<script setup>
const props = defineProps({items:{type:Array,default:()=>[]},color:{type:String,default:'#188e83'},interactive:Boolean,unit:{type:String,default:'surveys'}})
const emit = defineEmits(['select'])
const maximum = computed(()=>Math.max(1,...props.items.map(item=>item.total)))
</script>
<template>
  <div class="report-bars">
    <component :is="interactive ? 'button' : 'div'" v-for="item in items" :key="item.label" :type="interactive ? 'button' : undefined" :class="['report-bar-row',{'is-interactive':interactive}]" :aria-label="interactive ? `Filter by ${item.label}: ${item.total} ${unit}` : undefined" @click="interactive && emit('select',item.label)">
      <span class="report-bar-heading"><span>{{item.label}}</span><strong>{{item.total.toLocaleString()}}</strong></span>
      <span class="report-bar-track"><span :style="{width:`${item.total/maximum*100}%`,background:color}" /></span>
    </component>
  </div>
</template>
<style scoped>
.report-bars{display:grid;gap:17px}.report-bar-row{display:block;width:100%;text-align:left;border:0;background:none;color:inherit;font:inherit;padding:0}.report-bar-heading{display:flex;justify-content:space-between;gap:16px;font-size:13px;margin-bottom:8px}.report-bar-heading>span{overflow-wrap:anywhere}.report-bar-heading strong{font-weight:700;font-variant-numeric:tabular-nums}.report-bar-track{display:block;height:9px;background:#edf2f5;border-radius:5px;overflow:hidden}.report-bar-track>span{display:block;height:100%;border-radius:5px;transition:width .35s ease}.is-interactive{cursor:pointer;border-radius:6px;padding:5px;margin:-5px}.is-interactive:hover{background:#f2f8f7}.is-interactive:focus-visible{outline:2px solid #188e83;outline-offset:4px}
</style>
