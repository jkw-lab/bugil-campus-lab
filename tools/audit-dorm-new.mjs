// Comparative online geospatial analysis only: licensed feature geometries are
// processed in memory and never saved, exported, or committed.
import {readFileSync,writeFileSync} from 'node:fs';
const OSM=JSON.parse(readFileSync('geo/osm-2026-bugil-vicinity.geojson','utf8'));
const ORIGIN={lon:127.1585,lat:36.8315};
const MX=111320*Math.cos(ORIGIN.lat*Math.PI/180),MZ=111133;
const xy=p=>[(p[0]-ORIGIN.lon)*MX,(ORIGIN.lat-p[1])*MZ];
const rings=f=>f?.geometry?.type==='Polygon'?[f.geometry.coordinates]:f?.geometry?.type==='MultiPolygon'?f.geometry.coordinates:[];
function toParts(f){return rings(f).map(a=>a.map(b=>b.map(xy)));}
function polygonArea(pts){let a=0;for(let i=0,j=pts.length-1;i<pts.length;j=i++)a+=pts[j][0]*pts[i][1]-pts[i][0]*pts[j][1];return Math.abs(a/2);}
function area(parts){return parts.reduce((total,rs)=>total+polygonArea(rs[0])-rs.slice(1).reduce((s,h)=>s+polygonArea(h),0),0);}
function bbox(parts){const ps=parts.flat(2),xs=ps.map(p=>p[0]),zs=ps.map(p=>p[1]);return [Math.min(...xs),Math.min(...zs),Math.max(...xs),Math.max(...zs)];}
function inRing(p,rs){let result=false;const [x,z]=p;for(let i=0,j=rs.length-1;i<rs.length;j=i++){const a=rs[i],b=rs[j];if((a[1]>z)!==(b[1]>z) && x<(b[0]-a[0])*(z-a[1])/(b[1]-a[1])+a[0])result=!result}return result;}
function contains(p,parts){return parts.some(([outer,...holes])=>inRing(p,outer)&&!holes.some(h=>inRing(p,h)));}
function center(b){return[(b[0]+b[2])/2,(b[1]+b[3])/2];}
function compare(pa,pb,step=.6){
 const b1=bbox(pa),b2=bbox(pb);
 const box=[Math.min(b1[0],b2[0]),Math.min(b1[1],b2[1]),Math.max(b1[2],b2[2]),Math.max(b1[3],b2[3])];
 const iBox=[Math.max(b1[0],b2[0]),Math.max(b1[1],b2[1]),Math.min(b1[2],b2[2]),Math.min(b1[3],b2[3])];
 if(iBox[2]<=iBox[0]||iBox[3]<=iBox[1])return {intersection:0,iou:0,coverageOsm:0,coverageOfficial:0};
 const nx=Math.ceil((iBox[2]-iBox[0])/step),nz=Math.ceil((iBox[3]-iBox[1])/step);
 let n=0;
 for(let z=0;z<nz;z++)for(let x=0;x<nx;x++){
  let pt=[iBox[0]+(x+.5)*(iBox[2]-iBox[0])/nx,iBox[1]+(z+.5)*(iBox[3]-iBox[1])/nz];
  if(contains(pt,pa)&&contains(pt,pb))n++;
 }
 const i=n*(iBox[2]-iBox[0])*(iBox[3]-iBox[1])/nx/nz;
 const A=area(pa),B=area(pb);
 return {intersection:i,iou:i/(A+B-i),coverageOsm:i/A,coverageOfficial:i/B};
}
function round(n){return Math.round(n*100)/100;}
const feature=OSM.features.find(f=>f.id==='way/487459954');if(!feature)throw Error('OSM target absent');
const origin=toParts(feature),oArea=area(origin),oBox=bbox(origin);
const params=new URLSearchParams({f:'geojson',geometry:'127.1585,36.8284,127.1616,36.8305',geometryType:'esriGeometryEnvelope',inSR:'4326',outSR:'4326',spatialRel:'esriSpatialRelIntersects',where:'1=1',outFields:'objectid,building_name,buld_nm_dc,gro_flo_co,Shape__Area',returnGeometry:'true',resultRecordCount:'2000'});
const ctrl=new AbortController(),timeout=setTimeout(()=>ctrl.abort(),23000);
let gov;
try{
 const url='https://portal.esrikr.com/arcgis/rest/services/MOIS_KR_Buildings_v2/FeatureServer/0/query?'+params;
 const r=await fetch(url,{signal:ctrl.signal,cache:'no-store'});
 if(!r.ok)throw Error('Official map HTTP '+r.status);
 const j=await r.json();if(j.type!=='FeatureCollection'||!Array.isArray(j.features))throw Error('Official map missing GeoJSON features');
 gov=j.features;
}finally{clearTimeout(timeout);}
const comparisons=[];
for(const f of gov){
 const g=toParts(f);if(!g.length)continue;
 const cmp=compare(origin,g,.5);
 const p=f.properties||{},b=bbox(g);
 if(cmp.intersection>1||Math.hypot(...center(b).map((v,i)=>v-center(oBox)[i]))<150){
  comparisons.push({
   id:String(p.objectid??p.OBJECTID??f.id),name:p.building_name||null,detail:p.buld_nm_dc||null,
   floors:p.gro_flo_co??null,areaM2:round(area(g)),bboxM:b.map(round),
   centerM:center(b).map(round),vertexCount:g[0][0].length-1,
   iouOsm:round(cmp.iou),overlapOsmPct:round(100*cmp.coverageOsm),
   overlapOfficialPct:round(100*cmp.coverageOfficial),intersectionM2:round(cmp.intersection)
  });
 }
}
comparisons.sort((a,b)=>b.intersectionM2-a.intersectionM2);
const overlapping=gov.filter(f=>comparisons.find(c=>c.id===String(f.properties?.objectid)&&c.intersectionM2>25));
const unionParts=overlapping.flatMap(f=>toParts(f));
function compareWithUnion(pa,pb,step=.5){
 const ba=bbox(pa),bb=bbox(pb),overlap=[Math.max(ba[0],bb[0]),Math.max(ba[1],bb[1]),Math.min(ba[2],bb[2]),Math.min(ba[3],bb[3])];
 let count=0,nx=Math.max(1,Math.ceil((overlap[2]-overlap[0])/step)),nz=Math.max(1,Math.ceil((overlap[3]-overlap[1])/step));
 for(let iz=0;iz<nz;iz++)for(let ix=0;ix<nx;ix++){
  let p=[overlap[0]+(ix+.5)*(overlap[2]-overlap[0])/nx,overlap[1]+(iz+.5)*(overlap[3]-overlap[1])/nz];
  if(contains(p,pa)&&contains(p,pb))count++;
 }
 const intersection=count*(overlap[2]-overlap[0])*(overlap[3]-overlap[1])/nx/nz;
 const groupArea=area(pb);
 return {intersectionM2:round(intersection),officialGroupAreaM2:round(groupArea),coverageOsmPct:round(100*intersection/area(pa)),coverageOfficialPct:round(100*intersection/groupArea),iou:round(intersection/(area(pa)+groupArea-intersection))};
}
const output={
 source:'public MOIS-KR Buildings v2 live analysis; no polygon geometry exported',
 analysis:'comparing OSM 487459954 with all official building polygons intersecting this school area',
 osm:{id:feature.id,building:feature.properties.building,name:feature.properties.name,officiallyNamed:false,verified:feature.properties.verified,areaM2:round(oArea),bboxM:oBox.map(round),vertices:origin[0][0].length-1},
 govCountQueried:gov.length,overlappingOfficial:comparisons.filter(x=>x.intersectionM2>1),
 nearOfficialNotOverlapping:comparisons.filter(x=>x.intersectionM2<=1).slice(0,10),
 unionOfOfficialOverlaps:overlapping.length?{ids:overlapping.map(f=>String(f.properties?.objectid)),...compareWithUnion(origin,unionParts)}:null,
 savedSourceGeometry:false
};
writeFileSync('geo/dorm-new-audit-result.json',JSON.stringify(output,null,2)+'\n');
console.log(JSON.stringify({status:'pass',osmid:output.osm.id,officialOverlaps:output.overlappingOfficial.length,officialGroupIoU:output.unionOfOfficialOverlaps?.iou,sourceGeometrySaved:false}));
