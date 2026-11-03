#!/usr/bin/env node
// Source-preserving regression check; reads live GIS only for online analysis.
// Neither coordinates nor third-party feature data is saved, printed or committed.
import {readFileSync,writeFileSync} from 'node:fs';
import {mergeGeodataBuildings,OFFICIAL_ADDITIONS,OSM_PRESERVE} from '../geo-building-merge.js';
const osm=JSON.parse(readFileSync('geo/osm-2026-bugil-vicinity.geojson','utf8'));
function assert(test,message){if(!test)throw Error(message);}
const base=mergeGeodataBuildings(osm.features,[]);
assert(base.osmOriginal===130,'OSM original building count changed unexpectedly');
assert(base.officialAdded===0&&base.osmRetained===130,'OSM-only fallback lost buildings');
for(const d of OSM_PRESERVE)
 assert(base.records.some(x=>x.id===d.id),'Missing preserved OSM source '+d.id);
console.log('OSM fallback passed:',base.osmRetained,'records');
const params=new URLSearchParams({
 f:'geojson',geometry:'127.1562,36.8288,127.163,36.8346',
 geometryType:'esriGeometryEnvelope',inSR:'4326',outSR:'4326',
 spatialRel:'esriSpatialRelIntersects',where:'1=1',
 outFields:'*',returnGeometry:'true',resultRecordCount:'2000'
});
const ac=new AbortController(),timer=setTimeout(()=>ac.abort(),25000);
let official;
try{
 const res=await fetch('https://portal.esrikr.com/arcgis/rest/services/MOIS_KR_Buildings_v2/FeatureServer/0/query?'+params,{signal:ac.signal,cache:'no-store'});
 assert(res.ok,'Official GIS service HTTP '+res.status);
 const data=await res.json();
 assert(data.type==='FeatureCollection'&&Array.isArray(data.features),'Incorrect official response format');
 official=data.features;
}finally{clearTimeout(timer);}
const merged=mergeGeodataBuildings(osm.features,official);
assert(merged.officialAdded===3,'Three new classrooms were not obtained');
assert(merged.officialMissing.length===0,'Official IDs missing');
for(const id of OFFICIAL_ADDITIONS.map(x=>x.id))assert(merged.records.some(x=>x.id===id),'Missing added '+id);
for(const d of OSM_PRESERVE){
 assert(merged.preserved.find(x=>x.id===d.id)?.available,'Protected OSM map missing '+d.id);
 const current=merged.records.find(x=>x.id===d.id)?.feature;
 const original=osm.features.find(x=>x.id===d.id);
 assert(current&&current===original,'OSM polygon changed for '+d.id);
}
const allIds=merged.records.map(x=>x.id);
assert(allIds.length===new Set(allIds).size,'Duplicate source IDs in merged buildings');
assert(merged.removed.every(r=>!OSM_PRESERVE.some(s=>s.id===r.osmId)),'Preserved OSM polygon was removed');
const result={
 status:'pass',osmOriginal:merged.osmOriginal,osmRetained:merged.osmRetained,
 officialAdded:merged.officialAdded,osmOverlappingReplaced:merged.removed.length,
 preservedOsmFootprints:merged.preserved.length,roads:(osm.features||[]).filter(f=>f.properties?.featureType==='road').length,
 selectedOfficialIds:OFFICIAL_ADDITIONS.map(x=>x.id),
 preservedOsmIds:OSM_PRESERVE.map(x=>x.id),
 // Only counts and public feature IDs are stored, never licensed polygons.
 sourceGeometryStored:false
};
writeFileSync('geo/merge-test-status.json',JSON.stringify(result,null,2)+'\n','utf8');
console.log(JSON.stringify(result,null,2));
