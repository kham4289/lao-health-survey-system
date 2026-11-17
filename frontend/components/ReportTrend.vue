<script setup>
const props=defineProps({items:{type:Array,default:()=>[]}})
const ceiling=computed(()=>Math.max(1,...props.items.map(item=>item.total)))
const step=computed(()=>520/Math.max(1,props.items.length))
const label=month=>new Intl.DateTimeFormat('en-GB',{month:'short',year:'2-digit',timeZone:'UTC'}).format(new Date(`${month}-01T00:00:00Z`))
const emit=defineEmits(['select'])
</script>
<template>
  <div class="trend-wrap">
    <svg viewBox="0 0 600 230" class="trend-chart" role="img" aria-label="Monthly survey collection chart. Use the month buttons below to filter.">
      <title>Monthly survey collection: {{items.map(item=>`${item.month}: ${item.total}`).join(', ')}}</title>
      <g v-for="fraction in [0,.5,1]" :key="fraction"><line x1="46" :y1="185-fraction*155" x2="578" :y2="185-fraction*155" stroke="#e8eef2" :stroke-dasharray="fraction ? '4 5' : undefined" /><text x="35" :y="189-fraction*155" text-anchor="end" fill="#8392a1" font-size="11">{{Math.round(ceiling*fraction)}}</text></g>
      <g v-for="(item,index) in items" :key="item.month">
        <rect :x="53+index*step+step*.16" :y="185-item.total/ceiling*155" :width="step*.62" :height="item.total/ceiling*155" rx="4" fill="#198d81"><title>{{label(item.month)}}: {{item.total}} surveys</title></rect>
        <text :x="53+index*step+step*.47" y="210" text-anchor="middle" fill="#8392a1" :font-size="items.length > 8 ? 9 : 11">{{label(item.month)}}</text>
        <text v-if="item.total" :x="53+index*step+step*.47" :y="175-item.total/ceiling*155" text-anchor="middle" fill="#24665f" font-size="11" font-weight="600">{{item.total}}</text>
      </g>
    </svg>
    <div class="trend-months" aria-label="Filter collection month"><button v-for="item in items" :key="item.month" type="button" :aria-label="`View ${label(item.month)}: ${item.total} surveys`" @click="emit('select',item.month)">{{label(item.month)}} <strong>{{item.total}}</strong></button></div>
  </div>
</template>
<style scoped>
.trend-chart{display:block;width:100%;height:auto;min-height:190px}.trend-months{display:flex;flex-wrap:wrap;gap:6px;margin-top:8px}.trend-months button{border:1px solid #e1e9ec;background:#fff;color:#637487;border-radius:5px;font-size:10px;padding:4px 7px;cursor:pointer}.trend-months strong{margin-left:4px;color:#157d72}.trend-months button:hover{border-color:#198d81;background:#f1f9f6}.trend-months button:focus-visible{outline:2px solid #198d81;outline-offset:2px}
</style>
