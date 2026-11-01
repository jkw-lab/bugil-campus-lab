import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { FACILITIES, LANDMARKS, CAMERA_PRESETS } from './campus-data.js';
import { ROAD_PATHS, WALK_PATHS, BOUNDARY } from './roads-data.js';

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
 const north=Math.pow(Math.max(0,(-z-171)/150),1.38)*17;
 const west=Math.pow(Math.max(0,(-x-260)/115),1.3)*10;
 const east=Math.pow(Math.max(0,(x-185)/140),1.3)*5;
 return north+west+east+Math.sin(x*.017+z*.009)*.22;
}
function insideBoundary(x,z){
 let inside=false;
 for(let i=0,j=BOUNDARY.length-1;i<BOUNDARY.length;j=i++){
  const [xi,zi]=BOUNDARY[i],[xj,zj]=BOUNDARY[j];
  if(((zi>z)!==(zj>z)) && x<(xj-xi)*(z-zi)/(zj-zi)+xi)inside=!inside;
 }
 return inside;
}
const terrain=new THREE.PlaneGeometry(820,765,155,141);
terrain.rotateX(-Math.PI/2);
const a=terrain.attributes.position, terrainColors=[];
const inGrass=new THREE.Color(0x8aa782),outsideGrass=new THREE.Color(0x789a78);
const forestColor=new THREE.Color(0x557c5c),vColor=new THREE.Color();
for(let i=0;i<a.count;i++){
 const x=a.getX(i),z=a.getZ(i);
 a.setY(i,elevation(x,z)-.5);
 vColor.copy(insideBoundary(x,z)?inGrass:outsideGrass);
 const forestFactor=THREE.MathUtils.clamp((-z-171)/120,0,.85);
 vColor.lerp(forestColor,forestFactor);
 const speckle=.94+.1*Math.sin(x*.43+z*.34)*Math.cos(x*.29-z*.37);
 terrainColors.push(vColor.r*speckle,vColor.g*speckle,vColor.b*speckle);
}
terrain.setAttribute('color',new THREE.Float32BufferAttribute(terrainColors,3));
terrain.computeVertexNormals();
const terrainMaterial=M.grass.clone();terrainMaterial.color.setHex(0xffffff);terrainMaterial.vertexColors=true;
const land=new THREE.Mesh(terrain,terrainMaterial);
land.receiveShadow=true;scene.add(land);
// Piecewise Catmull-Rom surface ribbons follow the user-marked roads.
function path(points,width,material=M.asphalt){
 if(points.length<2)return;
 const curve=new THREE.CatmullRomCurve3(points.map(([x,z])=>new THREE.Vector3(x,0,z)),false,'centripetal');
 const samples=Math.max(16,points.length*10),verts=[],uv=[],idx=[];
 for(let i=0;i<=samples;i++){
  const t=i/samples,p=curve.getPoint(t),dir=curve.getTangent(t);
  const r=Math.max(.001,Math.hypot(dir.x,dir.z)),ox=dir.z/r*width/2,oz=-dir.x/r*width/2;
  const left=[p.x-ox,p.z-oz],right=[p.x+ox,p.z+oz];
  verts.push(left[0],elevation(...left)+.19,left[1],right[0],elevation(...right)+.19,right[1]);
  uv.push(0,t*points.length,1,t*points.length);
  if(i>0){const j=i*2;idx.push(j-2,j-1,j,j-1,j+1,j)}
 }
 const g=new THREE.BufferGeometry();
 g.setAttribute('position',new THREE.Float32BufferAttribute(verts,3));
 g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));
 g.setIndex(idx);g.computeVertexNormals();
 const m=new THREE.Mesh(g,material);m.material.side=THREE.DoubleSide;m.receiveShadow=true;scene.add(m);
 return m;
}
ROAD_PATHS.forEach(r=>path(r.points,r.width,M.asphalt));
WALK_PATHS.forEach(r=>path(r.points,r.width,M.walkway));
// Central sandy yard, the western baseball stadium and adjacent facilities.
plane(scene,146,116,M.field,-5,.39,5);
plane(scene,141,111,M.sand,-5,.43,5);
plane(scene,144,13,M.walkway,-5,.46,-56);
plane(scene,145,7,M.walkway,-5,.46,67);
for(let q=-1;q<=1;q++)plane(scene,2,110,M.field,-5+q*53,.458,5);
// North forecourt and south gym approach.
plane(scene,90,36,M.walkway,-8,.32,-91);
plane(scene,80,30,M.grass,-8,.36,-93);
plane(scene,68,16,M.walkway,-8,.37,86);
// Baseball field: a separate, broadly circular western outfield.
const baseball=new THREE.Mesh(new THREE.CircleGeometry(67,72),M.turf);
baseball.rotation.x=-Math.PI/2;baseball.position.set(-205,elevation(-205,105)+.24,105);scene.add(baseball);
const diamond=new THREE.Mesh(new THREE.CircleGeometry(33,64),M.sand);
diamond.rotation.x=-Math.PI/2;diamond.position.set(-205,elevation(-205,105)+.265,105);scene.add(diamond);
const infield=new THREE.Mesh(new THREE.PlaneGeometry(31,31),M.field);
infield.rotation.x=-Math.PI/2;infield.rotation.z=Math.PI/4;infield.position.set(-205,elevation(-205,105)+.285,105);scene.add(infield);
const mound=new THREE.Mesh(new THREE.CircleGeometry(4,24),M.sand);
mound.rotation.x=-Math.PI/2;mound.position.set(-205,elevation(-205,105)+.30,105);scene.add(mound);
// Outfield boundary and compact western auxiliary buildings.
for(let i=0;i<20;i++){
 const t=.15+i/19*Math.PI*.9,x=-205-68*Math.cos(t),z=105-68*Math.sin(t);
 cuboid(scene,1.5,1.5,1.5,M.dark,x,elevation(x,z)+.75,z,false);
}
const westAnnex=new THREE.Group();
westAnnex.position.set(-246,elevation(-246,29),29);scene.add(westAnnex);
cuboid(westAnnex,36,10,17,M.pale,0,5,0);
cuboid(westAnnex,37,.8,18,M.roof,0,10.5,0);
cuboid(westAnnex,13,6,9,M.glassBlue,26,3,-5);
const westUtility=new THREE.Group();
westUtility.position.set(-233,elevation(-233,-15),-15);scene.add(westUtility);
cuboid(westUtility,21,7,13,M.white,0,3.5,0);
cuboid(westUtility,22,.8,14,M.greenRoof,0,7.4,0);
// Separate eastern girls' school recreation ground and adjoining school blocks.
plane(scene,89,65,M.field,160,.34,25);
plane(scene,84,61,M.sand,160,.375,25);
const girlsSchool=new THREE.Group();
girlsSchool.position.set(194,elevation(194,-114),-114);scene.add(girlsSchool);
cuboid(girlsSchool,53,19,15,M.pale,0,9.5,0);
cuboid(girlsSchool,54,.8,16,M.greenRoof,0,19.4,0);
for(const [x,z,w,d,h] of [[-12,19,30,16,17],[1,28,45,15,20],[40,14,30,16,17]]){
 cuboid(girlsSchool,w,h,d,M.pale,x,h/2,z);cuboid(girlsSchool,w+.5,.7,d+.5,M.greenRoof,x,h+.35,z);
}
// Eastern stairs/terraces by the girls' ground.
for(let i=0;i<5;i++)cuboid(scene,71,.2,2.3,M.concrete,156,.38+i*.05,-16-i*5,false);
// Parking off the southern east road.
plane(scene,63,38,M.asphalt,119,.4,150);
for(let i=0;i<7;i++)plane(scene,.5,15,M.line,95+i*7.5,.45,158);
// A small south-east utility building next to the parking bays.
const southAnnex=new THREE.Group();southAnnex.position.set(168,elevation(168,158),158);scene.add(southAnnex);
cuboid(southAnnex,26,13,19,M.white,0,6.5,0);
cuboid(southAnnex,26.5,1,19.5,M.greenRoof,0,13.5,0);

// Mountain woodland and ornamental groves, using instancing for tablets.
let rngSeed=91381;function rnd(){rngSeed=(rngSeed*1664525+1013904223)>>>0;return rngSeed/4294967296}
const trunkGeo=new THREE.CylinderGeometry(.35,.55,1,5),leafGeo=new THREE.IcosahedronGeometry(1,0);
const trees=[];
function addTree(x,z,s){trees.push([x,z,s])}
for(let i=0;i<1370;i++){
 const x=(rnd()-.5)*795,z=(rnd()-.5)*730;
 const woodland=z<-176 || x<-284 || (z<-110&&x<-100&&rnd()<.6) || (x>212&&z<-70);
 if(!woodland)continue;
 if(FACILITIES.some(b=>Math.hypot(x-b.x,z-b.z)<46))continue;
 if(ROAD_PATHS.some(r=>r.points.some((p,j)=>{
  if(!j)return false;
  const [ax,az]=r.points[j-1],[bx,bz]=p,dx=bx-ax,dz=bz-az;
  const t=THREE.MathUtils.clamp(((x-ax)*dx+(z-az)*dz)/(dx*dx+dz*dz||1),0,1);
  return Math.hypot(x-(ax+t*dx),z-(az+t*dz))<r.width/2+3;
 })))continue;
 addTree(x,z,.68+rnd()*.9);
}
for(let i=0;i<160;i++){
 const x=-319+rnd()*130,z=-146+rnd()*335;
 if(Math.hypot(x+205,z-105)<74 || Math.hypot(x+8,z-12)<89)continue;
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
 b.group=group;b.collapsed=false;b.major=major;b.label=createLabel(b.name,b.x,elevation(b.x,b.z)+b.parts[0].h+10,b.z,18);
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
 createLabel('대운동장',-5,8,5,15),
 createLabel('야구장',-205,9,105,14),
 createLabel('북일랜드',-32,9,185,12),
 createLabel('북일여고 운동장',158,8,27,11)
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
 const sub=document.createElement('span');sub.textContent=b.notes||({field:'운동장',baseball:'서쪽 야구장',forest:'학교 녹지'}[b.kind])||'교내 시설';
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
 document.getElementById('status-title').textContent='주요 건물 7동 · 도로·지형';
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
