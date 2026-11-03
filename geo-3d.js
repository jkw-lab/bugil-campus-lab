import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// Geographic 3D prototype: genuine OSM footprint geometry, not an indoor or survey model.
// Game-local coordinates are never mixed with WGS84 in this preview.
// WGS84 origin is a public school-vicinity point, not any building's measured corner.
const ORIGIN = {lon:127.1585,lat:36.8315};
const X_M = 111320*Math.cos(ORIGIN.lat*Math.PI/180);
const Z_M = 111133;
const METRE_RADIUS = 690;
const mobile = matchMedia('(max-width:760px)').matches;
const $ = id=>document.getElementById(id);
const host=$('scene');
const scene=new THREE.Scene();
scene.background=new THREE.Color('#b9d0da');
scene.fog=new THREE.FogExp2('#b9d0da',.00065);
const camera=new THREE.PerspectiveCamera(44,innerWidth/innerHeight,1,4500);
camera.position.set(-340,470,505);
const renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:'high-performance'});
renderer.setPixelRatio(Math.min(devicePixelRatio,mobile?1.4:1.7));
renderer.setSize(innerWidth,innerHeight);
renderer.outputColorSpace=THREE.SRGBColorSpace;
renderer.shadowMap.enabled=false;
renderer.toneMapping=THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure=1.2;
host.append(renderer.domElement);
const controls=new OrbitControls(camera,renderer.domElement);
controls.enableDamping=true;
controls.dampingFactor=.08;
controls.maxPolarAngle=Math.PI/2.08;
controls.minDistance=30;
controls.maxDistance=2100;
controls.target.set(0,0,0);
controls.update();
scene.add(new THREE.HemisphereLight(0xffffff,0x647c7a,2.3));
const light=new THREE.DirectionalLight(0xfff4d4,2.0);
light.position.set(-220,360,-170);
scene.add(light);
const grid=new THREE.GridHelper(1530,61,0x5c8079,0x74998e);
grid.position.y=.04;grid.material.opacity=.20;grid.material.transparent=true;scene.add(grid);
const ground=new THREE.Mesh(new THREE.PlaneGeometry(1800,1800),new THREE.MeshStandardMaterial({color:'#6a947e',roughness:1}));
ground.rotation.x=-Math.PI/2;ground.position.y=-.07;ground.receiveShadow=true;scene.add(ground);
const buildings=new THREE.Group(),land=new THREE.Group(),roads=new THREE.Group();
scene.add(land,roads,buildings);
const roofMaterial=new THREE.MeshStandardMaterial({color:0xd6d6ce,roughness:.87});
const walls=[
 new THREE.MeshStandardMaterial({color:0xb1b9b3,roughness:.9}),
 new THREE.MeshStandardMaterial({color:0xb2a59a,roughness:.9}),
 new THREE.MeshStandardMaterial({color:0xa1adb0,roughness:.8}),
 new THREE.MeshStandardMaterial({color:0xb5bba9,roughness:.85})
];
const streetMat=new THREE.MeshStandardMaterial({color:0x737d7d,roughness:1,side:THREE.DoubleSide});
const footpathMat=new THREE.MeshStandardMaterial({color:0xb2ac9d,roughness:1,side:THREE.DoubleSide});
const grassMat=new THREE.MeshStandardMaterial({color:0x78996a,roughness:1,side:THREE.DoubleSide});
const forestMat=new THREE.MeshStandardMaterial({color:0x4c7759,roughness:1,side:THREE.DoubleSide});
const pitchMat=new THREE.MeshStandardMaterial({color:0x92ab79,roughness:1,side:THREE.DoubleSide});
const raycaster=new THREE.Raycaster(),mouse=new THREE.Vector2();
const drawnMeshes=[];
let currentData=null;
function toWorld(pair){
 return [(pair[0]-ORIGIN.lon)*X_M,(ORIGIN.lat-pair[1])*Z_M];
}
function nearWorld(x,z){return Math.hypot(x,z)<METRE_RADIUS;}
function validCoord(p){return Array.isArray(p)&&p.length>=2&&Number.isFinite(p[0])&&Number.isFinite(p[1]);}
function shapeFromRings(rings) {
  const ext=rings?.[0];
  if(!Array.isArray(ext)||ext.length<4)return null;
  const out=ext.filter(validCoord).map(p=>toWorld(p));
  if(out.length<4)return null;
  const shape=new THREE.Shape();
  out.forEach((p,i)=>i===0?shape.moveTo(p[0],-p[1]):shape.lineTo(p[0],-p[1]));
  shape.closePath();
  for(const hole of rings.slice(1)) {
    if(!Array.isArray(hole)||hole.length<4)continue;
    const h=new THREE.Path();
    hole.filter(validCoord).map(toWorld).forEach((p,i)=>i===0?h.moveTo(p[0],-p[1]):h.lineTo(p[0],-p[1]));
    h.closePath();
    shape.holes.push(h);
  }
  return {shape,centroid:out.reduce((a,p)=>[a[0]+p[0]/out.length,a[1]+p[1]/out.length],[0,0])};
}
function polygons(geo) {
  if(geo?.type==='Polygon')return [geo.coordinates];
  if(geo?.type==='MultiPolygon')return geo.coordinates;
  return [];
}
function heightInfo(props) {
 const h=Number.parseFloat(String(props.height??''));
 if(Number.isFinite(h)&&h>=2&&h<=120)return {height:h,known:true,label:'공개 높이 태그'};
 const levels=Number.parseFloat(String(props.levels??props['building:levels']??''));
 if(Number.isFinite(levels)&&levels>=1&&levels<=35)
   return {height:levels*3.4,known:false,label:'공개 층수 × 임시 층고 3.4m'};
 return {height:props.building==='industrial'?9:11,known:false,label:'추정치'};
}
function clearGroup(group) {
 for(const child of [...group.children]){
   group.remove(child);
   child.geometry?.dispose();
 }
}
function makeBuilding(f) {
 const info=heightInfo(f.properties||{});
 let n=0;
 for(const rings of polygons(f.geometry)){
   const parsed=shapeFromRings(rings);
   if(!parsed||!nearWorld(...parsed.centroid))continue;
   let geo;
   try{
     geo=new THREE.ExtrudeGeometry(parsed.shape,{depth:info.height,bevelEnabled:false,steps:1,curveSegments:1});
     geo.rotateX(-Math.PI/2);
   }catch(e){continue;}
   const hash=String(f.id||f.properties?.name||'x').split('').reduce((n,ch)=>((n*31)+ch.charCodeAt(0))>>>0,0);
   const mesh=new THREE.Mesh(geo,[roofMaterial,walls[hash%walls.length]]);
   mesh.userData={properties:f.properties||{},height:info,id:f.id||'',centroid:parsed.centroid};
   mesh.castShadow=false;mesh.receiveShadow=true;
   buildings.add(mesh);drawnMeshes.push(mesh);n++;
 }
 return n;
}
function makeLand(f) {
 for(const rings of polygons(f.geometry)) {
   const parsed=shapeFromRings(rings);
   if(!parsed||!nearWorld(...parsed.centroid))continue;
   try{
    const geo=new THREE.ShapeGeometry(parsed.shape);
    geo.rotateX(-Math.PI/2);
    const p=f.properties||{};
    const mat=p.landuse==='forest'?forestMat:p.leisure==='pitch'?pitchMat:grassMat;
    const mesh=new THREE.Mesh(geo,mat);mesh.position.y=.015;land.add(mesh);
   }catch(e){}
 }
}
function makeRoad(f) {
 const g=f.geometry||{};
 const collections=g.type==='LineString'?[g.coordinates]:
     g.type==='MultiLineString'?g.coordinates:[];
 const tag=f.properties?.road||f.properties?.highway||'service';
 const isWalk=/footway|path|pedestrian/.test(tag);
 const width=isWalk?2.7:tag==='residential'?5.4:tag==='tertiary'?7:4.3;
 for(const coll of collections) {
   if(!Array.isArray(coll)||coll.length<2)continue;
   const points=coll.filter(validCoord).map(toWorld);
   const verts=[];
   for(let i=1;i<points.length;i++){
     const [x1,z1]=points[i-1],[x2,z2]=points[i];
     if(!nearWorld((x1+x2)/2,(z1+z2)/2))continue;
     const len=Math.hypot(x2-x1,z2-z1);
     if(len<.1)continue;
     const ox=(z2-z1)/len*width/2,oz=-(x2-x1)/len*width/2;
     const p1=[x1+ox,.06,z1+oz],p2=[x1-ox,.06,z1-oz],p3=[x2+ox,.06,z2+oz],p4=[x2-ox,.06,z2-oz];
     verts.push(...p1,...p2,...p3,...p2,...p4,...p3);
   }
   if(verts.length===0)continue;
   const geo=new THREE.BufferGeometry();
   geo.setAttribute('position',new THREE.Float32BufferAttribute(verts,3));
   geo.computeVertexNormals();
   const mesh=new THREE.Mesh(geo,isWalk?footpathMat:streetMat);
   mesh.renderOrder=1;roads.add(mesh);
 }
}
function createMarker(label,lon,lat,color) {
 const [x,z]=toWorld([lon,lat]);
 const base=new THREE.Mesh(new THREE.CylinderGeometry(2.5,2.5,.8,16),new THREE.MeshBasicMaterial({color}));
 base.position.set(x,.7,z);base.renderOrder=3;scene.add(base);
 const c=document.createElement('canvas');c.width=320;c.height=68;
 const cx=c.getContext('2d');
 cx.fillStyle='#102b38dd';cx.fillRect(0,0,320,68);
 cx.fillStyle='#ffffff';cx.font='bold 24px system-ui';cx.textAlign='center';cx.textBaseline='middle';cx.fillText(label,160,34);
 const tex=new THREE.CanvasTexture(c);
 const sprite=new THREE.Sprite(new THREE.SpriteMaterial({map:tex,transparent:true,depthTest:false}));
 sprite.scale.set(64,13.6,1);sprite.position.set(x,23,z);scene.add(sprite);
}
createMarker('북일고 지도 대표점',127.15817,36.83224,0xf8b863);
createMarker('북일여고 지도 대표점',127.16009,36.83162,0x64c6cf);
function renderData(data) {
 currentData=data;
 clearGroup(buildings);clearGroup(land);clearGroup(roads);
 drawnMeshes.length=0;
 const features=(data.features||[]).filter(f=>f?.geometry);
 const kind=f=>f.properties?.kind||f.properties?.featureType||(
 f.properties?.building?'building':f.properties?.highway?'road':'land');
 const landFeatures=features.filter(f=>kind(f)==='land');
 const roadFeatures=features.filter(f=>kind(f)==='road');
 const buildingFeatures=features.filter(f=>kind(f)==='building');
 landFeatures.slice(0,500).forEach(makeLand);
 roadFeatures.slice(0,850).forEach(makeRoad);
 let polygonsDrawn=0;
 for(const f of buildingFeatures.slice(0,2000)) {
   polygonsDrawn+=makeBuilding(f);
   if(polygonsDrawn>1200)break;
 }
 const provisional=drawnMeshes.filter(x=>!x.userData.height.known).length;
 const displayed=drawnMeshes.length;
 $('status').textContent='공개 건물 외곽선 '+displayed+'개 입체화 · 도로 '+roads.children.length+'개 · 높이 추정 '+provisional+'개';
 $('building').textContent='모든 건물은 실내 구조가 없는 단순 입체 모델이야. 건물을 선택해 속성 확인.';
 $('retry').hidden=true;
 if(!displayed) {
   $('status').textContent='수집된 건물 외곽선이 없어서 표시할 수 없어.';
   $('retry').hidden=false;
 }
}
async function load() {
 $('status').textContent='공개 지리정보를 가져오는 중…';
 $('retry').hidden=true;
 let err='자료 없음';
 for(const url of ['./geo/osm-2026-bugil-vicinity.geojson','./api/campus-geo']) {
  try {
    const res=await fetch(url,{cache:'no-cache'});
    if(!res.ok)throw new Error('HTTP '+res.status);
    const data=await res.json();
    if(data?.type!=='FeatureCollection'||!Array.isArray(data.features))throw new Error('GeoJSON 형식 오류');
    if(data.features.length<10)throw new Error('표시할 공개 지형 자료가 부족함');
    renderData(data);return;
  } catch(e){err=String(e.message||e);}
 }
 $('status').textContent='외부 지리정보 불러오기 실패';
 $('building').textContent='공개 지리정보 서비스에 접근하지 못했어. 현재 화면을 실제 캠퍼스 지도라고 볼 수 없어. 오류: '+err;
 $('retry').hidden=false;
}
$('retry').onclick=load;
$('top').onclick=()=>{
  controls.target.set(0,0,0);
  camera.position.set(0,1150,.01);
  controls.update();
};
$('isometric').onclick=()=>{
  controls.target.set(0,0,0);
  camera.position.set(-340,470,505);
  controls.update();
};
let start=null;
renderer.domElement.addEventListener('pointerdown',e=>start={x:e.clientX,y:e.clientY});
renderer.domElement.addEventListener('pointerup',e=>{
 if(!start||Math.hypot(e.clientX-start.x,e.clientY-start.y)>8){start=null;return;}
 start=null;
 const box=renderer.domElement.getBoundingClientRect();
 mouse.x=((e.clientX-box.left)/box.width)*2-1;
 mouse.y=-((e.clientY-box.top)/box.height)*2+1;
 raycaster.setFromCamera(mouse,camera);
 const hit=raycaster.intersectObjects(drawnMeshes,false)[0];
 if(!hit)return;
 const d=hit.object.userData;
 const p=d.properties;
 const lines=[
  (p.name||'이름 미등록 건물'),
  '출처: OpenStreetMap',
  '건물 식별값: '+d.id,
  '높이: '+d.height.height.toFixed(1)+'m ('+d.height.label+')',
  '건물 분류: '+(p.building||'미분류'),
  '위치: 실제 지도 좌표의 외곽선을 입체화 (명칭·시설 소속 검증 전)'
 ];
 $('building').textContent=lines.join('\n');
 $('building').style.whiteSpace='pre-line';
});
function resize(){
 camera.aspect=innerWidth/innerHeight;
 camera.updateProjectionMatrix();
 renderer.setSize(innerWidth,innerHeight);
}
addEventListener('resize',resize);
function animate(){requestAnimationFrame(animate);controls.update();renderer.render(scene,camera);}
animate();
load();