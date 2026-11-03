// Authoritative, source-preserving selection. No new vertices or model heights are made here.
// Original OSM footprints remain the default; only three selected, LIVE official
// boundary records are used to fill missing school classroom blocks.
const ORIGIN_LAT=36.8315,ORIGIN_LON=127.1585;
const M_LON=111320*Math.cos(ORIGIN_LAT*Math.PI/180),M_LAT=111133;
export const OFFICIAL_ADDITIONS=[
 {id:"9248057",label:"북일고 본관 후보 · 공식 5층 교사",note:"공식 속성에는 '본관' 명칭 미기재"},
 {id:"9248086",label:"북일여고 제1교",note:"정부 건물 도형 제1교"},
 {id:"9248104",label:"북일여고 제2교",note:"정부 건물 도형 제2교"}
];
export const OSM_PRESERVE=[
 {id:"way/487459954",label:"여송학사 신관 (OSM 명칭 연결 잠정)"},
 {id:"way/487459955",label:"여고 여송학사 (OSM 명칭 연결 잠정)"},
 {id:"way/487459956",label:"여송학사 본관 (OSM 명칭 연결 잠정)"},
 {id:"way/494469121",label:"현암관 후보 · OSM 체육시설"}
];
const keepIds=new Set(OSM_PRESERVE.map(x=>x.id));
export const recordId=f=>String(f?.properties?.objectid??f?.properties?.OBJECTID??f?.id??"");
const polygons=f=>f?.geometry?.type==="Polygon"?[f.geometry.coordinates]:
    f?.geometry?.type==="MultiPolygon"?f.geometry.coordinates:[];
const toPlane=p=>[(p[0]-ORIGIN_LON)*M_LON,(ORIGIN_LAT-p[1])*M_LAT];
function ringArea(r){
 let a=0;for(let i=0;i<r.length-1;i++)a+=r[i][0]*r[i+1][1]-r[i+1][0]*r[i][1];
 return Math.abs(a)/2;
}
function prepared(f){
 const p=polygons(f).map(rings=>rings.map(r=>r.map(toPlane))).filter(r=>r[0]?.length>=4);
 const outer=p.map(r=>r[0]),pts=outer.flat();
 if(!pts.length)return null;
 const xs=pts.map(p=>p[0]),zs=pts.map(p=>p[1]);
 const a=p.reduce((sum,r)=>sum+Math.max(0,ringArea(r[0])-r.slice(1).reduce((s,h)=>s+ringArea(h),0)),0);
 return {parts:p,box:[Math.min(...xs),Math.min(...zs),Math.max(...xs),Math.max(...zs)],area:a};
}
function inRing(point,ring){
 let inside=false;const [px,pz]=point;
 for(let i=0,j=ring.length-1;i<ring.length;j=i++){
  const [xi,zi]=ring[i],[xj,zj]=ring[j];
  if((zi>pz)!==(zj>pz) && px < (xj-xi)*(pz-zi)/(zj-zi)+xi)inside=!inside;
 }
 return inside;
}
function inside(point,geom){return geom.parts.some(([outer,...holes])=>
 inRing(point,outer)&&!holes.some(h=>inRing(point,h)));}
function stronglyOverlaps(osm,gov){
 const a=prepared(osm),b=prepared(gov);if(!a||!b||a.area<1||b.area<1)return false;
 const [ax,az,ar,ab]=a.box,[bx,bz,br,bb]=b.box;
 const left=Math.max(ax,bx),top=Math.max(az,bz),right=Math.min(ar,br),bottom=Math.min(ab,bb);
 if(right<=left||bottom<=top)return false;
 const bboxArea=(right-left)*(bottom-top);
 if(bboxArea/Math.min(a.area,b.area)<.5)return false;
 // Deterministic area check based only on existing surveyed polygons.
 // We reject overlaps when intersection cannot be established confidently.
 const step=2;
 const nx=Math.max(1,Math.ceil((right-left)/step)),nz=Math.max(1,Math.ceil((bottom-top)/step));
 let count=0;
 for(let iz=0;iz<nz;iz++)for(let ix=0;ix<nx;ix++){
  const point=[left+(ix+.5)*(right-left)/nx,top+(iz+.5)*(bottom-top)/nz];
  if(inside(point,a)&&inside(point,b))count++;
 }
 const inter=count*(right-left)*(bottom-top)/(nx*nz);
 return inter/Math.min(a.area,b.area)>.58 && inter/a.area>.35;
}
export function mergeGeodataBuildings(osmFeatures,officialFeatures){
 const original=(osmFeatures||[]).filter(f=>
  f?.properties?.featureType==="building" && polygons(f).length);
 const government=(officialFeatures||[]).filter(f=>polygons(f).length);
 const byOfficialId=new Map(government.map(f=>[recordId(f),f]));
 const selected=OFFICIAL_ADDITIONS.map(t=>({spec:t,feature:byOfficialId.get(t.id)}))
   .filter(x=>x.feature);
 const rendered=[],removed=[];
 for(const f of original){
  const id=recordId(f);
  const conflict=!keepIds.has(id) &&
   selected.find(x=>stronglyOverlaps(f,x.feature));
  if(conflict){removed.push({osmId:id,replacedBy:conflict.spec.id});continue;}
  rendered.push({feature:f,source:"OpenStreetMap",id,label:OSM_PRESERVE.find(s=>s.id===id)?.label||null});
 }
 for(const x of selected){
  rendered.push({feature:x.feature,source:"행안부 원천 건물 경계 / Esri 실시간",id:x.spec.id,label:x.spec.label});
 }
 return {
  records:rendered,
  osmOriginal:original.length,osmRetained:original.length-removed.length,
  officialAdded:selected.length,removed,
  officialMissing:OFFICIAL_ADDITIONS.filter(t=>!byOfficialId.has(t.id)).map(t=>t.id),
  preserved:OSM_PRESERVE.map(x=>({...x,available:original.some(f=>recordId(f)===x.id)}))
 };
}
