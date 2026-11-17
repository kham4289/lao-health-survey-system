<script setup>
const props = defineProps({items:{type:Array,default:()=>[]},label:{type:String,default:'Participant distribution'}})
const total = computed(()=>props.items.reduce((sum,item)=>sum+item.total,0))
const segments = computed(()=>{
  let offset=0
  return props.items.map(item=>{
    const length=total.value ? item.total/total.value*100 : 0
    const segment={...item,length,offset};offset+=length;return segment
  })
})
</script>
<template>
  <div class="report-donut-layout">
    <div class="report-donut">
      <svg viewBox="0 0 120 120" role="img" :aria-label="label">
        <title>{{label}}: {{items.map(item=>`${item.label}: ${item.total}`).join(', ')}}</title>
        <circle cx="60" cy="60" r="47" fill="none" stroke="#edf2f5" stroke-width="13" />
        <circle v-for="segment in segments" :key="segment.label" cx="60" cy="60" r="47" fill="none" :stroke="segment.color" stroke-width="13" pathLength="100" :stroke-dasharray="`${segment.length} ${100-segment.length}`" :stroke-dashoffset="-segment.offset" transform="rotate(-90 60 60)"><title>{{segment.label}}: {{segment.total}}</title></circle>
      </svg>
      <div class="report-donut-center"><strong>{{total.toLocaleString()}}</strong><span>participants</span></div>
    </div>
    <ul class="report-donut-legend">
      <li v-for="item in items" :key="item.label"><span class="legend-dot" :style="{background:item.color}" /><span>{{item.label}}</span><strong>{{item.total}}</strong><small>{{total ? (item.total/total*100).toFixed(1)+'%' : '—'}}</small></li>
    </ul>
  </div>
</template>
<style scoped>
.report-donut-layout{display:flex;align-items:center;gap:24px;flex-wrap:wrap}.report-donut{position:relative;width:170px;height:170px;flex-shrink:0}.report-donut svg{width:100%;height:100%}.report-donut-center{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;flex-direction:column;pointer-events:none}.report-donut-center strong{font-size:30px;line-height:1.2;letter-spacing:-1px}.report-donut-center span{font-size:11px;color:#738496;margin-top:4px}.report-donut-legend{list-style:none;padding:0;flex:1;min-width:170px;display:grid;gap:17px}.report-donut-legend li{display:flex;align-items:center;gap:9px;font-size:13px}.legend-dot{height:8px;width:8px;border-radius:50%;flex-shrink:0}.report-donut-legend strong{margin-left:auto;font-size:14px}.report-donut-legend small{min-width:44px;text-align:right;color:#768798;font-variant-numeric:tabular-nums}
</style>
