import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { FACILITIES, LANDMARKS, CAMERA_PRESETS } from './campus-data.js';

// BUGIL CAMPUS LAB v0.2 — approximate illustrated campus, not geospatial survey data.
const scene = new THREE.Scene();
scene.background = new THREE.Color(0xbfd4dc);
scene.fog = new THREE.FogExp2(0xbfd4dc, 0.00115);
const host = document.getElementById('world');
const mobile = matchMedia('(max-width:760px)').matches;
const camera = new THREE.PerspectiveCamera(45,innerWidth/innerHeight,0.5,1400);
camera.position.set(...CAMERA_PRESETS.campus.position);
const renderer = new THREE.WebGLRenderer({antialias:true,powerPreference:'high-performance'});
renderer.setPixelRatio(Math.min(devicePixelRatio,mobile?1.5:1.8));
renderer.setSize(innerWidth,innerHeight);
renderer.outputColorSpace=THREE.SRGBColorSpace;
renderer.shadowMap.enabled=true;
renderer.shadowMap.type=THREE.PCFSoftShadowMap;
renderer.toneMapping=THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure=1.36;
host.appendChild(renderer.domElement);
const controls=new OrbitControls(camera,renderer.domElement);
controls.target.set(...CAMERA_PRESETS.campus.target);
controls.enableDamping=true;
controls.dampingFactor=.075;
controls.maxPolarAngle=Math.PI/2.07;
controls.minDistance=25;
controls.maxDistance=810;
controls.enablePan=true;
controls.update();
scene.add(new THREE.HemisphereLight(0xf7faff,0x6b8165,2.25));
const sun=new THREE.DirectionalLight(0xfff1da,2.25);
sun.position.set(-130,245,-120);sun.castShadow=true;
sun.shadow.mapSize.set(mobile?1024:2048,mobile?1024:2048);
sun.shadow.camera.left=-335;sun.shadow.camera.right=335;sun.shadow.camera.top=335;sun.shadow.camera.bottom=-335;
sun.shadow.bias=-.00009;sun.shadow.normalBias=.027;scene.add(sun);

const M={
 grass:new THREE.MeshStandardMaterial({color:0x79a174,roughness:1}),
 forest:new THREE.MeshStandardMaterial({color:0x608b62,roughness:1}),
 field:new THREE.MeshStandardMaterial({color:0xcaba98,roughness:1}),
 sand:new THREE.MeshStandardMaterial({color:0xc69e78}),
 turf:new THREE.MeshStandardMaterial({color:0x347f59}),
 asphalt:new THREE.MeshStandardMaterial({color:0x7c8381}),
 walkway:new THREE.MeshStandardMaterial({color:0xc2beb3}),
 line:new THREE.MeshBasicMaterial({color:0xe7e1c8}),
 concrete:new THREE.MeshStandardMaterial({color:0xc9cac2}),
 white:new THREE.MeshStandardMaterial({color:0xe6e6da}),
 pale:new THREE.MeshStandardMaterial({color:0xc7d0cb}),
 stone:new THREE.MeshStandardMaterial({color:0x8c9498}),
 dark:new THREE.MeshStandardMaterial({color:0x535b60}),
 glass:new THREE.MeshStandardMaterial({color:0x577789,roughness:.31,metalness:.12}),
 glassBlue:new THREE.MeshStandardMaterial({color:0x789eaf,roughness:.26,metalness:.11}),
 brick:new THREE.MeshStandardMaterial({color:0xa76658}),
 brick2:new THREE.MeshStandardMaterial({color:0xbb806b}),
 greenRoof:new THREE.MeshStandardMaterial({color:0x66876f}),
 solar:new THREE.MeshStandardMaterial({color:0x354c67,metalness:.3,roughness:.3}),
 roof:new THREE.MeshStandardMaterial({color:0x9a9c94}),
 tree1:new THREE.MeshStandardMaterial({color:0x3d7651}),
 tree2:new THREE.MeshStandardMaterial({color:0x4c8456}),
 tree3:new THREE.MeshStandardMaterial({color:0x5f9363}),
 tree4:new THREE.MeshStandardMaterial({color:0x366848}),
 trunk:new THREE.MeshStandardMaterial({color:0x665f48})
};
const boxGeo=new THREE.BoxGeometry(1,1,1);
function cuboid(parent,w,h,d,mat,x,y,z,cast=true){
 const m=new THREE.Mesh(boxGeo,mat);
 m.scale.set(w,h,d);m.position.set(x,y,z);m.castShadow=cast;m.receiveShadow=true;parent.add(m);return m;
}
function plane(parent,w,d,material,x,y,z,rot=0){
 const m=new THREE.Mesh(new THREE.PlaneGeometry(w,d),material);
 m.rotation.set(-Math.PI/2,0,rot);m.position.set(x,y,z);m.receiveShadow=true;parent.add(m);return m;
}
function elevation(x,z){
 const hillN=Math.pow(Math.max(0,(-z-175)/150),1.5)*31;
 const hillW=Math.pow(Math.max(0,(-x-207)/110),1.3)*19;
 return hillN+hillW+Math.sin(x*.018+z*.009)*.29;
}
const terrain=new THREE.PlaneGeometry(590,550,92,86);
terrain.rotateX(-Math.PI/2);
const a=terrain.attributes.position;
for(let i=0;i<a.count;i++){const x=a.getX(i),z=a.getZ(i);a.setY(i,elevation(x,z)-.8);}
terrain.computeVertexNormals();
const land=new THREE.Mesh(terrain,M.grass);
land.receiveShadow=true;scene.add(land);
plane(scene,560,185,M.forest,-10,.04,-209);
function path(points,width,material=M.asphalt){
 const vs=[],idx=[];
 for(let i=0;i<points.length;i++){
  const [x,z]=points[i],pr=points[Math.max(0,i-1)],nx=points[Math.min(points.length-1,i+1)];
  const dx=nx[0]-pr[0],dz=nx[1]-pr[1],r=Math.max(.001,Math.hypot(dx,dz));
  const ox=dz/r*width/2,oz=-dx/r*width/2,y=elevation(x,z)+.2;
  vs.push(x-ox,y,z-oz,x+ox,y,z+oz);
  if(i>0){const j=i*2;idx.push(j-2,j-1,j,j-1,j+1,j)}
 }
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(vs,3));g.setIndex(idx);g.computeVertexNormals();
 const m=new THREE.Mesh(g,material);m.material.side=THREE.DoubleSide;m.receiveShadow=true;scene.add(m);return m;
}
// Roads and walking paths are stylized routes, not routing or access guidance.
path([[105,248],[102,207],[65,170],[41,127],[41,77],[68,25],[91,-43],[112,-115]],13);
path([[-90,226],[-75,173],[-73,134],[-83,101],[-98,62],[-99,-30],[-76,-96]],10);
path([[-55,130],[-48,88],[-52,55],[-54,-68],[-56,-122]],7,M.walkway);
path([[-98,57],[-63,56],[6,56],[73,63]],8,M.walkway);
path([[34,-84],[64,-78],[96,-62],[138,-44]],8,M.walkway);
path([[-142,-90],[-115,-72],[-75,-61],[11,-65],[78,-65]],6,M.walkway);
path([[77,220],[133,211],[176,195],[209,169]],9);
path([[-226,171],[-193,152],[-136,139],[-98,143]],8);
path([[117,247],[170,240],[219,253]],8);
path([[188,-229],[196,-130],[207,-20],[216,97],[226,234]],17);

// Central yard and athletics.
plane(scene,136,110,M.field,-5,.4,5);
plane(scene,132,106,M.sand,-5,.43,5);
for(let q=-1;q<=1;q++){plane(scene,5,106,M.field,-5+q*40,.455,5)}
plane(scene,154,20,M.walkway,-5,.42,-67);
plane(scene,155,8,M.walkway,-5,.43,69);
plane(scene,76,45,M.walkway,-16,.34,-97);
plane(scene,66,39,M.grass,-16,.37,-96);
plane(scene,75,18,M.walkway,102,.34,67);
plane(scene,58,34,M.field,130,.36,67);
// Baseball: lawn circle, infield and backstop suggest a dedicated western field.
const diamond=new THREE.Mesh(new THREE.CircleGeometry(60,72),M.turf);
diamond.rotation.x=-Math.PI/2;diamond.position.set(-158,.37,103);scene.add(diamond);
const infield=new THREE.Mesh(new THREE.CircleGeometry(30,64),M.sand);
infield.rotation.x=-Math.PI/2;infield.position.set(-158,.395,103);scene.add(infield);
const baseSquare=new THREE.Mesh(new THREE.PlaneGeometry(28,28),M.field);
baseSquare.rotation.x=-Math.PI/2;baseSquare.rotation.z=Math.PI/4;baseSquare.position.set(-158,.415,103);scene.add(baseSquare);
const mound=new THREE.Mesh(new THREE.CircleGeometry(4,24),M.sand);mound.rotation.x=-Math.PI/2;mound.position.set(-158,.435,103);scene.add(mound);
for(let i=0;i<10;i++){const t=i/9*Math.PI*.9+Math.PI*.05;const x=-158-61*Math.cos(t),z=103-61*Math.sin(t);
 cuboid(scene,2,1.8,2,M.dark,x,1.0,z,false)}
// Tennis and outdoor courts.
plane(scene,74,43,M.turf,138,.39,45);
for(const x of [117,158]){plane(scene,.45,36,M.line,x,.47,45);plane(scene,34,.45,M.line,x+19,.47,45)}
// Parking bays.
plane(scene,70,43,M.asphalt,100,.37,129);
for(let i=0;i<8;i++)plane(scene,.5,16,M.line,69+i*8.4,.4,139);
// Mountain woodland and ornamental groves, using instancing for tablets.
let rngSeed=91381;function rnd(){rngSeed=(rngSeed*1664525+1013904223)>>>0;return rngSeed/4294967296}
const trunkGeo=new THREE.CylinderGeometry(.35,.55,1,5),leafGeo=new THREE.IcosahedronGeometry(1,0);
const trees=[];
function addTree(x,z,s){trees.push([x,z,s])}
for(let i=0;i<980;i++){
 const x=(rnd()-.5)*545,z=(rnd()-.5)*490;
 const wood=z<-173 || x<-218 || (z<-138 && x<-67 && x<18 && rnd()<.36);
 if(!wood)continue;
 if(FACILITIES.some(b=>Math.hypot(x-b.x,z-b.z)<40))continue;
 addTree(x,z,.68+rnd()*.9);
}
for(let i=0;i<120;i++){
 const x=-229+rnd()*105,z=-122+rnd()*205;
 if(Math.hypot(x+158,z-103)<73 || Math.hypot(x+8,z-12)<89)continue;
 if(FACILITIES.some(b=>Math.hypot(x-b.x,z-b.z)<30))continue;
 addTree(x,z,.62+rnd()*.7);
}
for(const [sx,sz,ex,ez,n] of [
 [-86,-99,-86,-154,11],[-64,-156,36,-156,16],
 [52,-106,68,-155,9],[-104,78,-104,126,10],
 [73,181,127,181,9],[185,125,185,-94,27]]){
 for(let i=0;i<n;i++){
  const t=(i+.5)/n,x=sx+(ex-sx)*t,z=sz+(ez-sz)*t;
  if(!FACILITIES.some(b=>Math.hypot(x-b.x,z-b.z)<21))addTree(x,z,.6+rnd()*.4)
 }
}
const trunks=new THREE.InstancedMesh(trunkGeo,M.trunk,trees.length);
const crowns=[
 new THREE.InstancedMesh(leafGeo,M.tree1,trees.length),
 new THREE.InstancedMesh(leafGeo,M.tree2,trees.length),
 new THREE.InstancedMesh(leafGeo,M.tree3,trees.length),
 new THREE.InstancedMesh(leafGeo,M.tree4,trees.length)
];
const o=new THREE.Object3D();
trees.forEach(([x,z,s],i)=>{
 const y=elevation(x,z);
 o.position.set(x,y+2.5*s,z);o.scale.set(s,5*s,s);o.rotation.set(0,0,0);o.updateMatrix();trunks.setMatrixAt(i,o.matrix);
 for(let k=0;k<4;k++){
  const ss=(k===0?3.3:k===1?2.9:k===2?2.4:1.8)*s;
  o.position.set(x,y+(5.3+k*.83)*s,z);
  o.scale.set(ss,ss*.8,ss);o.rotation.set(0,(i%7)*.23,0);o.updateMatrix();crowns[k].setMatrixAt(i,o.matrix);
 }
});
trunks.instanceMatrix.needsUpdate=true;scene.add(trunks);
for(const t of crowns){t.instanceMatrix.needsUpdate=true;scene.add(t);}
// Buildings: multipart silhouettes, visible windows, roof details.
const meshToFacility=new Map(),facilityObjects=new Map(),windowInstances=[],allLabels=[],debris=[];
function facadeFor(b){
 if(b.type==='dorm')return {wall:M.brick,roof:M.greenRoof,glass:M.glassBlue};
 if(b.type==='gym')return {wall:M.pale,roof:M.stone,glass:M.glass};
 if(b.type==='modern')return {wall:M.pale,roof:M.greenRoof,glass:M.glassBlue};
 return {wall:M.white,roof:M.roof,glass:M.glass};
}
function windowGrid(parent,p,material){
 const items=[],floors=Math.max(2,Math.round(p.h/4.8));
 const py=p.h/floors;
 for(let f=0;f<floors;f++){
  const y=(f+.5)*py;
  for(let j=-p.w/2+2.75;j<p.w/2-1.1;j+=4.7){
   items.push([j,y,p.d/2+.12,0],[j,y,-p.d/2-.12,0]);
  }
  for(let j=-p.d/2+2.75;j<p.d/2-1.1;j+=5.4){
   items.push([p.w/2+.12,y,j,Math.PI/2],[-p.w/2-.12,y,j,Math.PI/2]);
  }
 }
 const inst=new THREE.InstancedMesh(boxGeo,material,items.length);
 const dummy=new THREE.Object3D();
 items.forEach(([x,y,z,rot],i)=>{
  dummy.position.set(x,y,z);dummy.rotation.set(0,rot,0);dummy.scale.set(2,Math.min(2.1,py*.62),.15);dummy.updateMatrix();inst.setMatrixAt(i,dummy.matrix);
 });
 inst.instanceMatrix.needsUpdate=true;
 inst.castShadow=false;parent.add(inst);windowInstances.push(inst);
}
function addPediment(g,p){
 const w=23,centerZ=p.d/2+.18,y=p.h+.37,top=6;
 const ge=new THREE.BufferGeometry();
 ge.setAttribute('position',new THREE.Float32BufferAttribute([-w/2,y,centerZ,w/2,y,centerZ,0,y+top,centerZ],3));
 ge.computeVertexNormals();
 const m=new THREE.Mesh(ge,new THREE.MeshStandardMaterial({color:0xe9e8df,side:THREE.DoubleSide}));
 g.add(m);
 cuboid(g,23,.9,p.d*.5,M.roof,0,p.h+.2,0);
 cuboid(g,3.7,2.4,.18,M.dark,0,p.h+2.1,centerZ+.12);
}
function createFacility(b){
 const group=new THREE.Group();group.position.set(b.x,elevation(b.x,b.z),b.z);scene.add(group);
 const palette=facadeFor(b),major=[];
 for(const p of b.parts){
  const part=new THREE.Group();part.position.set(p.x,0,p.z);part.rotation.y=p.rot||0;group.add(part);
  let wall=palette.wall,roof=palette.roof;
  if(b.id==='adan'&&p===b.parts[0])wall=M.glassBlue;
  if(b.id==='summit')wall=M.white;
  if(b.id==='dormOld'&&p===b.parts[0])wall=M.pale;
  if(b.id==='dormNew')roof=M.greenRoof;
  const body=cuboid(part,p.w,p.h,p.d,wall,0,p.h/2,0);
  major.push(body);meshToFacility.set(body,b);
  cuboid(part,p.w+.4,.9,p.d+.4,roof,0,p.h+.45,0);
  windowGrid(part,p,palette.glass);
  // Horizontal lintels help indicate floor separation without expensive unique geometries.
  for(let y=4.6;y<p.h-1;y+=4.9){
   cuboid(part,p.w+.25,.18,p.d+.25,b.type==='dorm'?M.brick2:M.concrete,0,y,0,false)
  }
  if(b.id==='main'){
    addPediment(part,p);
    for(let j=-4;j<=4;j++)if(j!==0)cuboid(part,7,.16,4,M.solar,j*9,p.h+1.05,-2.6,false);
    for(let j=-1;j<=1;j++)cuboid(part,1.3,4,1.4,M.white,j*10,2.1,p.d/2+1.25);
    cuboid(part,2.7,3.7,.2,M.dark,0,1.95,p.d/2+.25);
  }
  if(b.id==='gym'){
    cuboid(part,p.w-3,.55,p.d-3,M.stone,0,p.h+1,0,false);
    cuboid(part,p.w*.35,5,.22,M.glassBlue,0,4,p.d/2+.23);
  }
  if(b.id==='adan'){
    cuboid(part,p.w*.53,p.h*.46,.3,M.glassBlue,-p.w*.08,p.h*.34,p.d/2+.2,false);
  }
  if(b.type==='dorm'){
    cuboid(part,Math.min(10,p.w*.3),3,.35,M.dark,0,1.9,p.d/2+.25);
  }
 }
 if(b.id==='main'){
  // Symmetric landscaped approach and prominent central stairs.
  plane(scene,66,31,M.walkway,b.x,.35,b.z+32);
  for(let i=0;i<5;i++)cuboid(scene,25,.22,2.2,M.concrete,b.x,.22+i*.19,b.z+8+i*2,false);
  for(let sx of [-1,1])for(let i=0;i<5;i++){
   const x=b.x+sx*(17+i*5),z=b.z+32+(i%2)*4;
   const bush=new THREE.Mesh(new THREE.IcosahedronGeometry(1.8,0),M.tree2);
   bush.position.set(x,2.15,z);scene.add(bush);
  }
 }
 if(b.id==='dormNew'){
  plane(scene,73,20,M.walkway,b.x,.33,b.z+51);
 }
 b.group=group;b.collapsed=false;b.major=major;b.label=createLabel(b.name,b.x,b.parts[0].h+10,b.z,18);
 facilityObjects.set(b.id,b);
}
function createLabel(text,x,y,z,scale=15){
 const c=document.createElement('canvas');c.width=512;c.height=126;
 const cx=c.getContext('2d');
 cx.fillStyle='#15242cdd';cx.beginPath();cx.roundRect(13,15,486,95,19);cx.fill();
 cx.strokeStyle='#ffffff55';cx.lineWidth=3;cx.stroke();
 cx.fillStyle='#fff';cx.font='bold 46px system-ui';cx.textAlign='center';cx.textBaseline='middle';cx.fillText(text,256,62);
 const tex=new THREE.CanvasTexture(c);
 const sprite=new THREE.Sprite(new THREE.SpriteMaterial({map:tex,depthTest:false,transparent:true}));
 sprite.position.set(x,y,z);sprite.scale.set(scale*2.3,scale*.565,1);scene.add(sprite);allLabels.push(sprite);return sprite;
}
FACILITIES.forEach(createFacility);
const landmarkLabels=[
 createLabel('대운동장',-5,7,5,15),
 createLabel('야구장',-158,9,103,14),
 createLabel('북일랜드',-147,17,-77,12)
];
// User interactions.
const facilityList=document.getElementById('facilities'),detail=document.getElementById('detail');
const allSites=[...FACILITIES,...LANDMARKS];
let selected=null,mode='inspect',labelsVisible=true,windowsEnhanced=false,noticeTimer;
for(const b of allSites){
 const el=document.createElement('button');el.className='facility';el.id='place-'+b.id;
 const no=document.createElement('span');no.className='fno';no.textContent=b.no;
 const data=document.createElement('span');data.className='fdata';
 const title=document.createElement('b');title.textContent=b.name;
 const sub=document.createElement('span');sub.textContent=b.notes||({field:'대운동장',baseball:'서쪽 야구장',forest:'학교 숲'}[b.kind])||'교내 시설';
 data.append(title,sub);el.append(no,data);
 el.addEventListener('click',()=>select(b,true));facilityList.append(el);
}
function showNotice(s){
 const el=document.getElementById('notice');el.textContent=s;el.classList.add('on');
 clearTimeout(noticeTimer);noticeTimer=setTimeout(()=>el.classList.remove('on'),1900);
}
function flyTo(pos,target){
 const startPos=camera.position.clone(),startTarget=controls.target.clone();
 const endPos=new THREE.Vector3(...pos),endTarget=new THREE.Vector3(...target);
 const started=performance.now(),duration=700;
 const anim=()=>{
  const t=Math.min(1,(performance.now()-started)/duration),k=1-(1-t)**3;
  camera.position.lerpVectors(startPos,endPos,k);controls.target.lerpVectors(startTarget,endTarget,k);
  controls.update();if(t<1)requestAnimationFrame(anim);
 };requestAnimationFrame(anim);
}
function select(b,move){
 selected=b;document.querySelectorAll('.facility').forEach(el=>el.classList.toggle('selected',el.id==='place-'+b.id));
 const text=b.notes||'공식 자료와 위성사진을 참고하여 배치한 캠퍼스 시설';
 detail.innerHTML='';
 const title=document.createElement('strong');title.textContent=b.no+' · '+b.name;
 detail.append(title,document.createElement('br'),document.createTextNode(text));
 if(b.confidence){detail.append(document.createElement('br'),document.createTextNode('위치 판독 신뢰도: '+b.confidence));}
 if(move){
  const high=b.parts?.[0]?.h||10,focus=b.focus||36;
  flyTo([b.x-focus,b.parts?high+focus*.85:focus*.9,b.z+focus],[b.x,b.parts?high*.55:0,b.z]);
 }
}
select(FACILITIES[0],false);
for(const button of document.querySelectorAll('#views button')){
 button.addEventListener('click',()=>{
  document.querySelectorAll('#views button').forEach(e=>e.classList.toggle('active',e===button));
  const view=CAMERA_PRESETS[button.dataset.view];flyTo(view.position,view.target);
 });
}
document.getElementById('inspect').addEventListener('click',()=>toggleMode('inspect'));
document.getElementById('collapse').addEventListener('click',()=>toggleMode('collapse'));
function toggleMode(m){
 mode=m;
 for(const id of ['inspect','collapse']){
  const e=document.getElementById(id),on=id===m;e.classList.toggle('active',on);e.setAttribute('aria-pressed',String(on));
 }
 document.getElementById('status-sub').textContent=m==='collapse'?'건물을 터치하면 블록으로 분리됩니다':'위치·비율은 사진 기반 추정치';
 showNotice(m==='collapse'?'블록 분리 모드: 건물을 선택하세요':'건물 탐색 모드');
}
document.getElementById('detail-view').addEventListener('click',e=>{
 windowsEnhanced=!windowsEnhanced;windowInstances.forEach(w=>w.material=windowsEnhanced?M.solar:M.glass);
 e.currentTarget.classList.toggle('active',windowsEnhanced);
 showNotice(windowsEnhanced?'창문 대비 강조':'기본 창문 색상');
});
document.getElementById('labels').addEventListener('click',e=>{
 labelsVisible=!labelsVisible;allLabels.forEach(s=>s.visible=labelsVisible);
 e.currentTarget.classList.toggle('active',!labelsVisible);
 showNotice(labelsVisible?'건물 이름 표시':'건물 이름 숨김');
});
document.getElementById('compare').addEventListener('click',()=>{
 flyTo([0,445,4],[0,0,0]);showNotice('전체 캠퍼스 위에서 보기');
});
function separateBuilding(b){
 if(b.collapsed)return showNotice('이미 분리된 건물입니다');
 b.collapsed=true;b.group.visible=false;b.label.visible=false;
 let count=0;
 for(const p of b.parts){
  const cols=Math.max(2,Math.min(8,Math.round(p.w/9))),rows=Math.max(2,Math.min(4,Math.round(p.h/6))),layers=Math.max(2,Math.min(4,Math.round(p.d/8)));
  const dx=p.w/cols,dy=p.h/rows,dz=p.d/layers;
  const ca=Math.cos(p.rot||0),sa=Math.sin(p.rot||0);
  for(let i=0;i<cols;i++)for(let j=0;j<rows;j++)for(let k=0;k<layers;k++){
   if(Math.random()<.23)continue;
   const lx=-p.w/2+(i+.5)*dx,lz=-p.d/2+(k+.5)*dz;
   const wx=b.x+p.x+lx*ca+lz*sa,wz=b.z+p.z+lz*ca-lx*sa;
   const h=dy*.89,m=cuboid(scene,dx*.91,h,dz*.91,b.type==='dorm'?M.brick:M.concrete,wx,elevation(b.x,b.z)+(j+.5)*dy,wz);
   debris.push({m,v:new THREE.Vector3((Math.random()-.5)*8,Math.random()*5+2,(Math.random()-.5)*8),
    spin:new THREE.Vector3(Math.random()-.5,Math.random()-.5,Math.random()-.5),floor:elevation(wx,wz)+h/2,stopped:false});
   count++;
  }
 }
 document.getElementById('status-title').textContent=b.name+' · 블록 '+count+'개';
 showNotice(b.name+' 모형을 블록으로 분리했습니다');
}
function restore(){
 for(const o of debris){scene.remove(o.m);o.m.geometry=boxGeo}debris.length=0;
 FACILITIES.forEach(b=>{b.collapsed=false;b.group.visible=true;b.label.visible=labelsVisible});
 document.getElementById('status-title').textContent='주요 건물 7동 · 지형';
 showNotice('전체 캠퍼스 복구 완료');
}
document.getElementById('restore').addEventListener('click',restore);
const ray=new THREE.Raycaster(),ndc=new THREE.Vector2();let pointerStart=null;
renderer.domElement.addEventListener('pointerdown',e=>{pointerStart={x:e.clientX,y:e.clientY}});
renderer.domElement.addEventListener('pointerup',e=>{
 if(!pointerStart)return;
 const travel=Math.hypot(e.clientX-pointerStart.x,e.clientY-pointerStart.y);pointerStart=null;
 if(travel>9)return;
 const rect=renderer.domElement.getBoundingClientRect();
 ndc.set((e.clientX-rect.left)/rect.width*2-1,-(e.clientY-rect.top)/rect.height*2+1);
 ray.setFromCamera(ndc,camera);
 const clickable=FACILITIES.filter(b=>!b.collapsed).flatMap(b=>b.major);
 const hits=ray.intersectObjects(clickable,false);
 if(!hits.length)return;
 const b=meshToFacility.get(hits[0].object);
 if(!b)return;
 select(b,false);
 if(mode==='collapse')separateBuilding(b);
 else showNotice(b.name+' 선택됨');
});
function updateDebris(dt){
 for(const o of debris){
  if(o.stopped)continue;
  o.v.y-=21*dt;o.m.position.addScaledVector(o.v,dt);
  o.m.rotation.x+=o.spin.x*dt;o.m.rotation.y+=o.spin.y*dt;
  o.m.rotation.z+=o.spin.z*dt;
  if(o.m.position.y<o.floor){o.m.position.y=o.floor;o.v.y=-o.v.y*.14;o.v.x*=.56;o.v.z*=.56;if(Math.abs(o.v.y)<.5)o.stopped=true}
 }
}
let prev=performance.now();
function animate(now){
 requestAnimationFrame(animate);
 const dt=Math.min(.04,(now-prev)/1000);prev=now;
 updateDebris(dt);controls.update();renderer.render(scene,camera);
}
window.addEventListener('resize',()=>{
 camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();
 renderer.setPixelRatio(Math.min(devicePixelRatio,innerWidth<=760?1.5:1.8));renderer.setSize(innerWidth,innerHeight);
});
document.getElementById('loading').remove();
requestAnimationFrame(animate);
