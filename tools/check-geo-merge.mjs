#!/usr/bin/env node
// Source-preserving regression check; reads live GIS only for online analysis.
// Neither coordinates nor third-party feature data is saved, printed or committed.
import {readFileSync,writeFileSync} from 'node:fs';
import {mergeGeodataBuildings,OFFICIAL_ADDITIONS,OSM_PRESERVE,CONFIRMED_FOOTPRINTS,geometryFingerprint,confirmedGeometryStatus} from '../geo-building-merge.js';
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

const fingerprint=geometry=>{
 let hash=2166136261;
 for(const ch of JSON.stringify(geometry||null))
   hash=Math.imul(hash^ch.charCodeAt(0),16777619);
 return (hash>>>0).toString(16).padStart(8,'0');
};
const confirmedIds=['way/487459954','way/487459955','way/494469121','way/494724468','9248057','way/487459956','9248086'];
const officialById=new Map(official.map(f=>[String(f.properties?.objectid??f.properties?.OBJECTID??f.id),f]));
const geometryFingerprints=Object.fromEntries(confirmedIds.map(id=>{
 const feature=id.startsWith('way/')?osm.features.find(f=>f.id===id):officialById.get(id);
 assert(!!feature,'Confirmed footprint not found in source: '+id);
 return [id,fingerprint(feature.geometry)];
}));
const merged=mergeGeodataBuildings(osm.features,official);
assert(merged.officialAdded===3,'Three new classrooms were not obtained');
assert(merged.officialMissing.length===0,'Official IDs missing');
assert(merged.lockedSourceChanges.length===0,'A confirmed footprint changed in the source');
assert(CONFIRMED_FOOTPRINTS.length===7,'Expected seven user-confirmed footprints');
for(const entry of CONFIRMED_FOOTPRINTS){
 const record=merged.records.find(r=>r.id===entry.id);
 assert(record,'User-confirmed footprint missing from rendered set: '+entry.id);
 assert(record.source===entry.source || (entry.id==='9248057'&&record.source.includes('행안부')),'Source changed for '+entry.id);
 assert(geometryFingerprint(record.feature.geometry)===entry.geometryHash,'Geometry fingerprint drift for '+entry.id);
 assert(confirmedGeometryStatus(entry.id,record.feature.geometry)==='confirmed','Confirmed status not preserved: '+entry.id);
}
// Regression: simulate a changed OSM outline and ensure it cannot replace a locked building.
const mutated=JSON.parse(JSON.stringify(osm.features));
const edited=mutated.find(f=>f.id==='way/494724468');
assert(!!edited,'Adan Hall source polygon missing');
edited.geometry.coordinates[0][0][0]+=0.00001;
const untrusted=mergeGeodataBuildings(mutated,official);
assert(untrusted.lockedSourceChanges.some(x=>x.id==='way/494724468'),'Changed footprint was not detected');
assert(!untrusted.records.some(x=>x.id==='way/494724468'),'Changed footprint was silently displayed');
// Newly locked Yeseong main dorm must also reject silent outline changes.
const changedDorm=JSON.parse(JSON.stringify(osm.features));
const mainDorm=changedDorm.find(f=>f.id==='way/487459956');
assert(!!mainDorm,'Yeseong main dorm GIS polygon missing');
mainDorm.geometry.coordinates[0][0][0]+=0.00001;
const dormDrift=mergeGeodataBuildings(changedDorm,official);
assert(dormDrift.lockedSourceChanges.some(x=>x.id==='way/487459956'),'Yeseong dorm geometry drift not detected');
assert(!dormDrift.records.some(x=>x.id==='way/487459956'),'Altered dorm footprint silently displayed');
// Official source changes must also be rejected without fabricating another model.
const mutatedGov=JSON.parse(JSON.stringify(official));
const school=mutatedGov.find(f=>String(f.properties?.objectid??f.properties?.OBJECTID)==='9248057');
assert(!!school,'Verified school main-building polygon missing');
school.geometry.coordinates[0][0][0]+=0.00001;
const changedGov=mergeGeodataBuildings(osm.features,mutatedGov);
assert(changedGov.lockedSourceChanges.some(x=>x.id==='9248057'),'Modified official outline not detected');
assert(!changedGov.records.some(x=>x.id==='9248057'),'Modified official outline displayed');
const changedGirls=JSON.parse(JSON.stringify(official));
const firstSchool=changedGirls.find(f=>String(f.properties?.objectid??f.properties?.OBJECTID)==='9248086');
assert(!!firstSchool,'Girls school first official polygon missing');
firstSchool.geometry.coordinates[0][0][0]+=0.00001;
const girlsDrift=mergeGeodataBuildings(osm.features,changedGirls);
assert(girlsDrift.lockedSourceChanges.some(x=>x.id==='9248086'),'Girls school geometry drift not detected');
assert(!girlsDrift.records.some(x=>x.id==='9248086'),'Altered girls school polygon silently displayed');
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
 preservedOsmFootprints:merged.preserved.length,confirmedFootprints:merged.confirmed.filter(x=>x.available).length,roads:(osm.features||[]).filter(f=>f.properties?.featureType==='road').length,
 selectedOfficialIds:OFFICIAL_ADDITIONS.map(x=>x.id),
 preservedOsmIds:OSM_PRESERVE.map(x=>x.id),
 // Only counts and public feature IDs are stored, never licensed polygons.
 sourceGeometryStored:false,geometryFingerprints
};
writeFileSync('geo/merge-test-status.json',JSON.stringify(result,null,2)+'\n','utf8');
console.log(JSON.stringify(result,null,2));
