import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { loadGeographicElevation } from './geo-dem.js';
import { mergeGeodataBuildings, OFFICIAL_ADDITIONS, OSM_PRESERVE, confirmedGeometryStatus } from './geo-building-merge.js';

/**
 * GIS MERGE (v0.4.9)
 * Original OSM polygons are the base. Only three real official classroom
 * polygons are layered in. Gym/dorm OSM footprints are never overridden.
 * All roads come from OSM coordinates; terrain from Copernicus DEM.
 * Building heights and road widths without measurements are not fabricated.
 */
const ORIGIN={lon:127.1585,lat:36.8315};
const MX=111320*Math.cos(ORIGIN.lat*Math.PI/180),MZ=111133;
const SOURCE_GOV='https://portal.esrikr.com/arcgis/rest/services/MOIS_KR_Buildings_v2/FeatureServer/0/query';
const BOUNDS={xmin:127.1562,ymin:36.8288,xmax:127.1630,ymax:36.8346};
const TARGETS=[...OFFICIAL_ADDITIONS,...OSM_PRESERVE];
const $=id=>document.getElementById(id);
const host=$('scene'),mobile=matchMedia('(max-width:760px)').matches;
const scene=new THREE.Scene();scene.background=new THREE.Color('#bcd2d9');
scene.fog=new THREE.FogExp2('#bcd2d9',.00055);
const camera=new THREE.PerspectiveCamera(44,innerWidth/innerHeight,1,4000);
camera.position.set(-320,480,440);
const renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:'high-performance'});
renderer.setPixelRatio(Math.min(devicePixelRatio,mobile?1.35:1.7));
renderer.setSize(innerWidth,innerHeight);
renderer.outputColorSpace=THREE.SRGBColorSpace;
renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.16;
host.append(renderer.domElement);
const controls=new OrbitControls(camera,renderer.domElement);
controls.enableDamping=true;controls.dampingFactor=.08;
controls.maxPolarAngle=Math.PI/2.06;controls.minDistance=15;controls.maxDistance=2100;
controls.target.set(0,0,0);controls.update();
scene.add(new THREE.HemisphereLight(0xffffff,0x536a67,2.2));
const sun=new THREE.DirectionalLight(0xfff5dd,1.55);sun.position.set(-240,450,-155);scene.add(sun);
const terrainMaterial=new THREE.MeshStandardMaterial({vertexColors:true,roughness:1,side:THREE.DoubleSide});
const terrain=new THREE.Mesh(new THREE.PlaneGeometry(1800,1800,1,1),terrainMaterial);
terrain.rotation.x=-Math.PI/2;terrain.visible=false;scene.add(terrain);
const featuresGroup=new THREE.Group(),roadsGroup=new THREE.Group(),landGroup=new THREE.Group();
scene.add(landGroup,roadsGroup,featuresGroup);
const buildingFill=new THREE.MeshBasicMaterial({color:0x83bfcb,transparent:true,opacity:.62,side:THREE.DoubleSide,depthWrite:false});
const officialFill=new THREE.MeshBasicMaterial({color:0xe1c183,transparent:true,opacity:.74,side:THREE.DoubleSide,depthWrite:false});
const buildingEdge=new THREE.LineBasicMaterial({color:0x165f7a,linewidth:1});
const officialEdge=new THREE.LineBasicMaterial({color:0x8d5b18,linewidth:1});
const footLine=new THREE.LineBasicMaterial({color:0xe9e2c3,linewidth:1});
const roadLine=new THREE.LineBasicMaterial({color:0x57626a,linewidth:1});
const parkFill=new THREE.MeshBasicMaterial({color:0x467b66,transparent:true,opacity:.25,side:THREE.DoubleSide,depthWrite:false});
let dem=null;
const clickable=[],idToSurface=new Map();
const buildingLabels=new THREE.Group();scene.add(buildingLabels);
const ray=new THREE.Raycaster(),pointer=new THREE.Vector2();
const world=p=>[(p[0]-ORIGIN.lon)*MX,(ORIGIN.lat-p[1])*MZ];
const surface=(x,z)=>dem?dem.elevation(x,z):0;
function isCoord(p){return Array.isArray(p)&&p.length>=2&&Number.isFinite(p[0])&&Number.isFinite(p[1])&&p[0]>126&&p[0]<129&&p[1]>35&&p[1]<39;}
function polygonParts(f){
 if(f?.geometry?.type==='Polygon')return [f.geometry.coordinates];
 if(f?.geometry?.type==='MultiPolygon')return f.geometry.coordinates;
 return [];
}
function ringPaths(rings){
 if(!Array.isArray(rings)||!Array.isArray(rings[0])||rings[0].length<4)return null;
 if(rings[0].some(p=>!isCoord(p)))return null;
 const outer=rings[0].map(world);
 const s=new THREE.Shape();
 outer.forEach(([x,z],i)=>i?s.lineTo(x,-z):s.moveTo(x,-z));s.closePath();
 for(const hole of rings.slice(1)){
  if(!Array.isArray(hole)||hole.length<4||hole.some(p=>!isCoord(p)))continue;
  const path=new THREE.Path();
  hole.map(world).forEach(([x,z],i)=>i?path.lineTo(x,-z):path.moveTo(x,-z));
  path.closePath();s.holes.push(path);
 }
 return s;
}
function drapeShape(rings){
 const shape=ringPaths(rings);if(!shape)return null;
 const geo=new THREE.ShapeGeometry(shape);
 geo.rotateX(-Math.PI/2);
 const a=geo.getAttribute('position');
 for(let i=0;i<a.count;i++)a.setY(i,surface(a.getX(i),a.getZ(i))+.34);
 a.needsUpdate=true;geo.computeVertexNormals();
 return geo;
}
function boundaryLine(ring,material,yOffset=.51){
 if(!Array.isArray(ring)||ring.length<4||ring.some(p=>!isCoord(p)))return null;
 const ps=ring.map(world),vertices=[];
 for(let i=1;i<ps.length;i++){
  const [x1,z1]=ps[i-1],[x2,z2]=ps[i];
  const dist=Math.hypot(x2-x1,z2-z1);
  const n=Math.max(1,Math.ceil(dist/4));
  for(let j=0;j<n;j++){
   const t=j/n,x=x1+(x2-x1)*t,z=z1+(z2-z1)*t;
   vertices.push(new THREE.Vector3(x,surface(x,z)+yOffset,z));
  }
 }
 const [x,z]=ps[ps.length-1];vertices.push(new THREE.Vector3(x,surface(x,z)+yOffset,z));
 if(vertices.length<3)return null;
 return new THREE.Line(new THREE.BufferGeometry().setFromPoints(vertices),material);
}
function featureId(f){
 const p=f.properties||{};
 return String(p.objectid??p.OBJECTID??f.id??'');
}
function officialLabel(f){
 const p=f.properties||{};
 const name=[p.building_name||p.name,p.buld_nm_dc].filter(Boolean).join(' · ').trim();
 return name||'건물명 미등록';
}
function addBuilding(record){
 const {feature:f,source,id}=record;
 const isOfficial=source!=='OpenStreetMap';
 const material=isOfficial?officialFill:buildingFill,edge=isOfficial?officialEdge:buildingEdge;
 let count=0;
 for(const rings of polygonParts(f)){
  const geo=drapeShape(rings);if(!geo)continue;
  const mesh=new THREE.Mesh(geo,material);
  mesh.userData={record};mesh.renderOrder=3;
  featuresGroup.add(mesh);clickable.push(mesh);count++;
  for(const ring of rings){
   const line=boundaryLine(ring,edge);
   if(line){line.renderOrder=4;featuresGroup.add(line);}
  }
 }
 if(count&&id)idToSurface.set(id,record);
 return count;
}
function labelBuilding(record){
 const f=record.feature;
 const ring=polygonParts(f)?.[0]?.[0];
 if(!Array.isArray(ring)||ring.length<4)return;
 const pts=ring.map(world),xs=pts.map(p=>p[0]),zs=pts.map(p=>p[1]);
 const x=(Math.min(...xs)+Math.max(...xs))/2,z=(Math.min(...zs)+Math.max(...zs))/2;
 // 9m is only a readable floating label offset, NOT a claim about building height.
 const canvas=document.createElement('canvas');canvas.width=640;canvas.height=88;
 const context=canvas.getContext('2d');
 context.fillStyle='#14232de8';context.beginPath();context.roundRect(4,4,632,80,13);context.fill();
 context.strokeStyle=record.source==='OpenStreetMap'?'#7bc7d7':'#f0bd77';
 context.lineWidth=3;context.stroke();
 context.font='bold 27px system-ui';context.textAlign='center';context.textBaseline='middle';
 context.fillStyle='#f4f7f7';context.fillText(record.label||officialLabel(f),320,44);
 const texture=new THREE.CanvasTexture(canvas);
 const sprite=new THREE.Sprite(new THREE.SpriteMaterial({map:texture,depthTest:false,transparent:true}));
 sprite.scale.set(86,11.9,1);sprite.position.set(x,surface(x,z)+9,z);
 buildingLabels.add(sprite);
}
function addRoad(f){
 const g=f.geometry||{};
 const paths=g.type==='LineString'?[g.coordinates]:
   g.type==='MultiLineString'?g.coordinates:[];
 let count=0;
 for(const pts of paths){
  if(!Array.isArray(pts)||pts.length<2||pts.some(p=>!isCoord(p)))continue;
  const xyz=[];
  const pairs=pts.map(world);
  for(let i=1;i<pairs.length;i++){
   const [x1,z1]=pairs[i-1],[x2,z2]=pairs[i];
   const d=Math.hypot(x2-x1,z2-z1),n=Math.max(1,Math.ceil(d/5));
   for(let j=0;j<n;j++){
    const t=j/n,x=x1+(x2-x1)*t,z=z1+(z2-z1)*t;
    xyz.push(new THREE.Vector3(x,surface(x,z)+.47,z));
   }
  }
  const [x,z]=pairs[pairs.length-1];
  xyz.push(new THREE.Vector3(x,surface(x,z)+.47,z));
  const line=new THREE.Line(new THREE.BufferGeometry().setFromPoints(xyz),
    f.properties?.highway==='footway'?footLine:roadLine);
  line.renderOrder=5;roadsGroup.add(line);count++;
 }
 return count;
}
function addLand(f){
 let count=0;
 for(const rings of polygonParts(f)){
  const geo=drapeShape(rings);if(!geo)continue;
  const mesh=new THREE.Mesh(geo,parkFill);mesh.renderOrder=1;
  landGroup.add(mesh);count++;
 }
 return count;
}
function clearGroup(g){for(const o of [...g.children]){
 g.remove(o);o.geometry?.dispose();
 if(o.material?.map && o.material.map.isTexture)o.material.map.dispose();
 if(o.material?.isSpriteMaterial)o.material.dispose();
}}
function setTerrain(){
 if(!dem)return;
 // DEM's sampled, geographic elevations are interpolated only within its actual grid.
 const geo=new THREE.PlaneGeometry(1800,1800,120,120);
 geo.rotateX(-Math.PI/2);
 const a=geo.getAttribute('position'),colors=[];
 const low=new THREE.Color('#5d8e79'),high=new THREE.Color('#aeab77'),c=new THREE.Color();
 for(let i=0;i<a.count;i++){
  const x=a.getX(i),z=a.getZ(i),h=surface(x,z);
  a.setY(i,h-.08);
  c.copy(low).lerp(high,THREE.MathUtils.clamp((h+30)/115,0,1));
  colors.push(c.r,c.g,c.b);
 }
 a.needsUpdate=true;geo.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));
 geo.computeVertexNormals();
 terrain.geometry.dispose();terrain.geometry=geo;
 terrain.rotation.x=0;terrain.position.y=0;terrain.visible=true;
}
async function loadGov(){
 // The third-party service is licensed for online visualisation; do not
 // permanently download/rehost the feature dataset or cache offline.
 const qs=new URLSearchParams({
  f:'geojson',
  geometry:[BOUNDS.xmin,BOUNDS.ymin,BOUNDS.xmax,BOUNDS.ymax].join(','),
  geometryType:'esriGeometryEnvelope',inSR:'4326',
  spatialRel:'esriSpatialRelIntersects',where:'1=1',
  outFields:'*',returnGeometry:'true',outSR:'4326',
  resultRecordCount:'2000'
 });
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),20000);
 try{
  const response=await fetch(SOURCE_GOV+'?'+qs,{signal:controller.signal,cache:'no-store'});
  if(!response.ok)throw Error('정부 건물 경계 서비스 HTTP '+response.status);
  const json=await response.json();
  if(json.error)throw Error('지도 서비스 오류: '+JSON.stringify(json.error));
  if(json.type!=='FeatureCollection'||!Array.isArray(json.features)||json.features.length<15
    ||json.features.length>=2000||json.exceededTransferLimit)throw Error('건물 데이터 누락/불완전');
  if(!json.features.every(f=>polygonParts(f).length>0))throw Error('비폴리곤 건물 데이터');
  return json.features;
 }finally{clearTimeout(timer);}
}
function focusTarget(id){
 const r=idToSurface.get(id),f=r?.feature;
 if(!f){$('detail').textContent='해당 건물은 현재 지도 소스에서 확인되지 않았어.';return;}
 const pts=polygonParts(f)[0][0].map(world);
 const xs=pts.map(p=>p[0]),zs=pts.map(p=>p[1]);
 const x=(Math.min(...xs)+Math.max(...xs))/2,z=(Math.min(...zs)+Math.max(...zs))/2;
 const y=surface(x,z);
 controls.target.set(x,y,z);camera.position.set(x-105,y+125,z+148);controls.update();
 showBuilding(r);
}
function showBuilding(r){
 const f=r.feature,p=f.properties||{};
 const floors=p.gro_flo_co??p['building:levels'];
 const lines=[
  r.label||officialLabel(f),
  '원본: '+r.source,
  '건물 식별자: '+r.id,
  '지상 층수: '+(floors??'자료 미등록'),
  '실제 높이(m): 미확보 · 임의 추정값 사용하지 않음',
  '건물 윤곽: 실제 공개 지리정보 좌표',
  confirmedGeometryStatus(r.id,f.geometry)==='confirmed'?'위치·평면 윤곽: 사용자 검증 완료 · 변경 보호됨':r.id.startsWith('way/')?'건물명 대응: 추가 검증 필요':'원본 건물명과 시설명 대응: 추가 검증 필요'
 ];
 $('detail').textContent=lines.join('\n');
 $('detail').style.whiteSpace='pre-line';
}
function renderBuildings(selection){
 clearGroup(featuresGroup);clearGroup(buildingLabels);
 clickable.length=0;idToSurface.clear();
 let drawn=0;
 for(const record of selection.records)drawn+=addBuilding(record);
 for(const record of selection.records)if(record.label&&idToSurface.has(record.id))labelBuilding(record);
 $('status').textContent='OSM '+selection.osmRetained+'개 + 공식 교사동 '+selection.officialAdded+'개 · 윤곽 확정 '+selection.confirmed.filter(x=>x.available).length+'동 · 도로 '+roadsGroup.children.length+'개';
 $('source').textContent='건물: 기존 OSM 윤곽 우선 + 공식 교사동 3개 선택 · 도로: OSM 원본 중심선';
 $('height-note').textContent='건물의 실측 높이 부재: 위치·윤곽만 3D 지형에 투영하며, 임의 층고로 벽·지붕을 만들지 않음';
 const missing=selection.officialMissing;
 $('gov-note').textContent=selection.lockedSourceChanges.length?
  '주의: 확정된 건물 윤곽의 원본 좌표가 변경되어 표시를 중단함 — '+selection.lockedSourceChanges.map(x=>x.id).join(', '):
  missing.length?'공식 교사동 미확보 ID: '+missing.join(', ')+' (OSM 건물은 계속 표시됨)':
  '공식 교사동 3개 연결됨 · OSM 중복 '+selection.removed.length+'개 제거 · 확인된 '+selection.confirmed.filter(x=>x.available).length+'개 건물 윤곽 잠금';
 for(const t of TARGETS){
  const el=$(t.id);if(!el)continue;
  el.disabled=!idToSurface.has(t.id);
  el.title=idToSurface.has(t.id)?t.note||'실제 좌표 원본의 형태 표시':'원본 자료에서 해당 건물 ID 미확인';
 }
}
async function load(){
 $('status').textContent='실제 지도 자료를 불러오는 중…';
 let osm;
 try{
  const r=await fetch('./geo/osm-2026-bugil-vicinity.geojson');
  if(!r.ok)throw Error('OSM 자료 HTTP '+r.status);
  osm=await r.json();
  if(osm?.type!=='FeatureCollection'||!Array.isArray(osm.features))throw Error('GeoJSON 오류');
 }catch(err){
  $('status').textContent='도로 원본 지도 데이터 불러오기 실패: '+String(err.message||err);
  return;
 }
 try{
  dem=await loadGeographicElevation();setTerrain();
  $('terrain-status').textContent='지형: 실제 Copernicus GLO-90 고도 · 해발 '+dem.min+'~'+dem.max+'m · 90m 표본 보간';
 }catch(err){
  $('terrain-status').textContent='고도 데이터 미확보 — 지형 고도 표시 중단: '+String(err.message||err);
  // No guessed flat fallback: without DEM do not render model.
  $('status').textContent='실제 표고 정보를 가져오지 못해 지리정보 3D 모델을 표시하지 않았어.';
  return;
 }
 clearGroup(roadsGroup);clearGroup(landGroup);
 let roadCount=0;
 for(const f of osm.features){
  if(f.properties?.featureType==='road')roadCount+=addRoad(f);
  else if(f.properties?.featureType==='land' &&
       (f.properties?.leisure==='pitch'||f.properties?.leisure==='park'||
        f.properties?.landuse==='forest'||f.properties?.landuse==='grass'))
    addLand(f);
 }
 $('road-note').textContent='도로 '+roadCount+'개: OSM 중심선 그대로 (도로 폭·교량 높이 자료 미확보)';
 let official=[];
 try{
  official=await loadGov();
 }catch(err){
  console.warn('Public building boundary unavailable, showing OSM only:',err);
  $('gov-note').textContent='공식 교사동 자료 접속 실패. 기존 OSM 윤곽은 유지됨.';
 }
 const selection=mergeGeodataBuildings(osm.features,official);
 renderBuildings(selection);
}
for(const t of TARGETS){
 const button=document.createElement('button');button.id=t.id;button.textContent=t.label;
 button.className='jump-button';button.disabled=true;button.title=t.note||'원본 공간정보 기준';button.onclick=()=>focusTarget(t.id);
 $('jumps').append(button);
}
$('top').onclick=()=>{const y=surface(0,0);controls.target.set(0,y,0);camera.position.set(0,y+1100,.01);controls.update();};
$('isometric').onclick=()=>{const y=surface(0,0);controls.target.set(0,y,0);camera.position.set(-320,y+480,440);controls.update();};
const canvas=renderer.domElement;let start=null;
canvas.addEventListener('pointerdown',e=>start={x:e.clientX,y:e.clientY});
canvas.addEventListener('pointerup',e=>{
 if(!start||Math.hypot(e.clientX-start.x,e.clientY-start.y)>9){start=null;return;}
 start=null;
 const box=canvas.getBoundingClientRect();
 pointer.set((e.clientX-box.left)/box.width*2-1,-(e.clientY-box.top)/box.height*2+1);
 ray.setFromCamera(pointer,camera);
 const hit=ray.intersectObjects(clickable,false)[0];
 if(hit)showBuilding(hit.object.userData.record);
});
addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);});
function animate(){requestAnimationFrame(animate);controls.update();renderer.render(scene,camera);}
animate();load();
