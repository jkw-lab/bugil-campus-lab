import { FACILITIES, LANDMARKS } from './campus-data.js';
import { ROAD_PATHS, WALK_PATHS, BOUNDARY } from './roads-data.js';

// The game model is a hand-positioned illustration, NOT a surveyed map.
// This page intentionally does not mutate the game's building data.
const canvas = document.querySelector('#map');
const ctx = canvas.getContext('2d');
const $ = (s) => document.querySelector(s);
let width = 0, height = 0, ratio = 1;
let center = { x:-40, z:-18 };
let scale = 0.8;
let viewReady = false;
let selectedId = null;
let imported = [];
let aligner = null;
let anchorCount = 0;
let rms = null;
const pointers = new Map();
let lastSingle = null, lastPinch = null;

function rect(b,p) {
  const c=Math.cos(p.rot || 0), s=Math.sin(p.rot || 0);
  return [[-1,-1],[1,-1],[1,1],[-1,1]].map(([i,j])=>{
    const dx=i*p.w/2, dz=j*p.d/2;
    return [b.x+p.x+c*dx+s*dz, b.z+p.z-s*dx+c*dz];
  });
}
function path(points, close=false) {
  if(!points || points.length===0)return;
  ctx.beginPath();
  points.forEach((p,i)=>i===0?ctx.moveTo(p[0],p[1]):ctx.lineTo(p[0],p[1]));
  if(close)ctx.closePath();
}
function resize() {
  const r=canvas.getBoundingClientRect();
  width=Math.max(1,r.width);height=Math.max(1,r.height);
  ratio=Math.min(2,window.devicePixelRatio || 1);
  canvas.width=Math.round(width*ratio);canvas.height=Math.round(height*ratio);
  if(!viewReady)fitAll();else draw();
}
function fitAll() {
  const pts=[...BOUNDARY,...FACILITIES.flatMap(b=>b.parts.flatMap(p=>rect(b,p))),...LANDMARKS.map(o=>[o.x,o.z])];
  const xs=pts.map(p=>p[0]),zs=pts.map(p=>p[1]);
  const minX=Math.min(...xs),maxX=Math.max(...xs),minZ=Math.min(...zs),maxZ=Math.max(...zs);
  center={x:(minX+maxX)/2,z:(minZ+maxZ)/2};
  scale=Math.min(width/(maxX-minX+55),height/(maxZ-minZ+55));
  viewReady=true;draw();
}
function fitDorm() {
  const bs=FACILITIES.filter(b=>['dormNew','girlsDorm'].includes(b.id));
  const pts=bs.flatMap(b=>b.parts.flatMap(p=>rect(b,p)));
  const xs=pts.map(p=>p[0]),zs=pts.map(p=>p[1]);
  const minX=Math.min(...xs),maxX=Math.max(...xs),minZ=Math.min(...zs),maxZ=Math.max(...zs);
  center={x:(minX+maxX)/2,z:(minZ+maxZ)/2};
  scale=Math.min(width/(maxX-minX+95),height/(maxZ-minZ+95));
  draw();
}
function worldAt(x,y) {
  return {x:center.x+(x-width/2)/scale,z:center.z+(y-height/2)/scale};
}
function draw() {
  ctx.setTransform(ratio,0,0,ratio,0,0);
  ctx.clearRect(0,0,width,height);
  ctx.fillStyle='#15252d';ctx.fillRect(0,0,width,height);
  ctx.save();
  ctx.translate(width/2,height/2);
  ctx.scale(scale,scale);
  ctx.translate(-center.x,-center.z);
  const minX=center.x-width/scale/2-30,maxX=center.x+width/scale/2+30;
  const minZ=center.z-height/scale/2-30,maxZ=center.z+height/scale/2+30;
  const gridStep=scale>2?25:50;
  ctx.lineWidth=1/scale;ctx.strokeStyle='#263c48';
  for(let x=Math.floor(minX/gridStep)*gridStep;x<maxX;x+=gridStep){ctx.beginPath();ctx.moveTo(x,minZ);ctx.lineTo(x,maxZ);ctx.stroke();}
  for(let z=Math.floor(minZ/gridStep)*gridStep;z<maxZ;z+=gridStep){ctx.beginPath();ctx.moveTo(minX,z);ctx.lineTo(maxX,z);ctx.stroke();}
  path(BOUNDARY,true);ctx.fillStyle='#29433b88';ctx.fill();ctx.lineWidth=2/scale;ctx.strokeStyle='#748c7a';ctx.stroke();
  const drawRoad=(roads,stroke,alpha=1)=>{
    ctx.strokeStyle=stroke;ctx.globalAlpha=alpha;
    for(const r of roads){
      path(r.points);ctx.lineWidth=r.width;ctx.lineJoin='round';ctx.lineCap='round';ctx.stroke();
    }
    ctx.globalAlpha=1;
  };
  drawRoad(ROAD_PATHS,'#667983');drawRoad(WALK_PATHS,'#b1a48d',.8);
  // Each rotated rectangle is a legacy 3D block: these may overlap and are not a surveyed polygon union.
  for(const b of FACILITIES){
    const active=b.id===selectedId;
    for(const part of b.parts){
      path(rect(b,part),true);
      ctx.fillStyle=active?'#f5c77a77':'#e3a54e44';
      ctx.fill();ctx.strokeStyle=active?'#ffe6a8':'#e6a74b';
      ctx.lineWidth=(active?3:1.6)/scale;ctx.stroke();
    }
    ctx.fillStyle='#fff3da';ctx.font='bold '+Math.max(11,12/Math.max(0.7,scale))+'px system-ui';
    ctx.textAlign='center';ctx.textBaseline='middle';
    ctx.shadowColor='#101820';ctx.shadowBlur=8/scale;ctx.fillText(b.name,b.x,b.z);
    ctx.shadowBlur=0;
  }
  for(const l of LANDMARKS) {
    ctx.beginPath();ctx.arc(l.x,l.z,5/scale,0,2*Math.PI);ctx.fillStyle='#d3e0c2';ctx.fill();
    ctx.font=(11/Math.max(0.7,scale))+'px system-ui';ctx.fillStyle='#e9f1e7';
    ctx.fillText(l.name,l.x,l.z+14/scale);
  }
  if(aligner){
    const project=(pt)=>aligner(pt[0],pt[1]);
    for(const f of imported){
      const g=f.geometry;if(!g)continue;
      const polylines=[];
      if(g.type==='Polygon')polylines.push(...g.coordinates);
      else if(g.type==='MultiPolygon')g.coordinates.forEach(p=>polylines.push(...p));
      else if(g.type==='LineString')polylines.push(g.coordinates);
      else if(g.type==='MultiLineString')polylines.push(...g.coordinates);
      for(const line of polylines){
        if(!line || line.length<2)continue;
        const ps=line.filter(p=>Array.isArray(p)&&p.length>=2).map(project);
        if(ps.length<2)continue;
        const polygon=g.type.includes('Polygon');
        path(ps,polygon);
        ctx.strokeStyle=f.properties?.featureType==='road'?'#57b5bd':'#46d4d0';
        ctx.lineWidth=(polygon?2.5:1.4)/scale;
        if(polygon){ctx.fillStyle='#43ddd322';ctx.fill();}
        ctx.stroke();
      }
    }
  }
  // Subtle north arrow: -Z is north in game-local coordinates.
  ctx.restore();
  ctx.fillStyle='#b9cbd3';ctx.font='11px system-ui';ctx.textAlign='right';
  ctx.fillText('↑ 북쪽 (게임 기준 가정)',width-13,height-12);
}
function hitBuilding(pt) {
  for(const b of FACILITIES)for(const p of b.parts){
    const x=pt.x-b.x-p.x,z=pt.z-b.z-p.z;
    const c=Math.cos(p.rot||0),s=Math.sin(p.rot||0);
    const localX=c*x-s*z,localZ=s*x+c*z;
    if(Math.abs(localX)<=p.w/2&&Math.abs(localZ)<=p.d/2)return b;
  }
  return null;
}
function roadOverlapCandidates(b) {
  const conflicts=[];
  for(const road of ROAD_PATHS){
    let near=false;
    for(let j=1;j<road.points.length&&!near;j++){
      const [ax,az]=road.points[j-1], [bx,bz]=road.points[j];
      const steps=Math.max(1,Math.ceil(Math.hypot(bx-ax,bz-az)/4));
      for(let i=0;i<=steps;i++){
        const t=i/steps;
        const pt={x:ax+(bx-ax)*t,z:az+(bz-az)*t};
        for(const p of b.parts){
          const x=pt.x-b.x-p.x,z=pt.z-b.z-p.z;
          const c=Math.cos(p.rot||0),s=Math.sin(p.rot||0);
          const dx=c*x-s*z,dz=s*x+c*z;
          if(Math.abs(dx)<p.w/2+road.width/2&&Math.abs(dz)<p.d/2+road.width/2){
            near=true;break;
          }
        }
        if(near)break;
      }
    }
    if(near)conflicts.push(road.id);
  }
  return conflicts;
}
function selectBuilding(id){
  selectedId=id;
  for(const btn of document.querySelectorAll('#checklist button'))btn.style.color=btn.dataset.id===id?'#f4c37e':'';
  const b=FACILITIES.find(x=>x.id===id);
  if(b){
    const warnings=roadOverlapCandidates(b);
    $('#selected').textContent='';
    const title=document.createElement('strong');title.textContent=b.name+' · '+b.parts.length+'개 매스';
    $('#selected').append(title,document.createElement('br'),document.createTextNode('기존 상태: 위성사진 기반 추정, 지리 좌표 미검증.'));
    if(warnings.length)$('#selected').append(document.createElement('br'),document.createTextNode('도로 근접·중첩 검토 후보: '+warnings.join(', ')));
    else $('#selected').append(document.createElement('br'),document.createTextNode('도로 중심선과의 보수적 겹침 검사: 후보 없음.'));
  }
  draw();
}
function fillChecklist() {
  const root=$('#checklist');root.textContent='';
  FACILITIES.forEach(b=>{
    const li=document.createElement('li'),btn=document.createElement('button'),state=document.createElement('em');
    btn.textContent=b.name;btn.dataset.id=b.id;btn.onclick=()=>selectBuilding(b.id);
    state.textContent='미검증';
    li.append(btn,state);root.append(li);
  });
  $('#summary').textContent='건물 '+FACILITIES.length+'동 · 도로 '+ROAD_PATHS.length+'개 · 좌표 정렬 미검증';
}
function parseFeatureCollection(data) {
  if(data?.type==='FeatureCollection'&&Array.isArray(data.features))return data.features.filter(f=>f?.type==='Feature'&&f.geometry);
  if(data?.type==='Feature'&&data.geometry)return [data];
  throw new Error('GeoJSON FeatureCollection 또는 Feature만 지원해.');
}
function makeProjection(rows) {
  const first=rows[0], lat0=first[3], lon0=first[2];
  const scaleX=111412.84*Math.cos(lat0*Math.PI/180)-93.5*Math.cos(3*lat0*Math.PI/180);
  const scaleZ=111132.92-559.82*Math.cos(2*lat0*Math.PI/180);
  const samples=rows.map(a=>({x:(a[2]-lon0)*scaleX,z:(lat0-a[3])*scaleZ,gx:a[0],gz:a[1]}));
  const n=samples.length, avg=(k)=>samples.reduce((s,p)=>s+p[k],0)/n;
  const ux=avg('x'),uz=avg('z'),vx=avg('gx'),vz=avg('gz');
  let cross=0,dot=0,den=0;
  for(const p of samples){
    const x=p.x-ux,z=p.z-uz,a=p.gx-vx,b=p.gz-vz;
    dot+=x*a+z*b;cross+=x*b-z*a;den+=x*x+z*z;
  }
  if(den<0.01)throw new Error('기준점 사이 실제 거리가 너무 가까워 정렬할 수 없어.');
  const a=dot/den,b=cross/den,tx=vx-a*ux+b*uz,tz=vz-b*ux-a*uz;
  const transform=(lon,lat)=>{
    const x=(lon-lon0)*scaleX,z=(lat0-lat)*scaleZ;
    return [a*x-b*z+tx,b*x+a*z+tz];
  };
  const err=Math.sqrt(samples.reduce((sum,p)=>{
    const [x,z]=transform(rows[samples.indexOf(p)][2],rows[samples.indexOf(p)][3]);
    return sum+(x-p.gx)**2+(z-p.gz)**2;
  },0)/n);
  return {transform,error:err,scale:Math.hypot(a,b)};
}
function readAnchors() {
  const lines=$('#anchors').value.split(/\r?\n/).map(s=>s.trim()).filter(Boolean);
  if(lines.length<2)throw new Error('기준점을 최소 2개 입력해야 해.');
  if(lines.length>30)throw new Error('기준점은 30개까지 입력할 수 있어.');
  return lines.map((line,i)=>{
    const parts=line.split(/[,\s]+/).map(Number);
    if(parts.length!==4||parts.some(v=>!Number.isFinite(v)))throw new Error((i+1)+'번째 기준점 형식이 잘못됐어.');
    if(Math.abs(parts[2])>180||Math.abs(parts[3])>90)throw new Error((i+1)+'번째 위경도 범위를 확인해 줘.');
    return parts;
  });
}
$('#geojson').addEventListener('change',async event=>{
  const f=event.target.files?.[0];if(!f)return;
  try{
    if(f.size>12_000_000)throw new Error('12 MB 이내 파일만 가져올 수 있어.');
    const parsed=JSON.parse(await f.text());
    imported=parseFeatureCollection(parsed);
    $('#result').textContent='가져온 객체: '+imported.length+'개'+(aligner?' · 정렬 표시 중':' · 기준점 정렬 필요');
    draw();
  }catch(e){imported=[];$('#result').textContent='가져오기 오류: '+e.message;draw();}
});
$('#align').onclick=()=>{
  try{
    const rows=readAnchors(),result=makeProjection(rows);
    aligner=result.transform;anchorCount=rows.length;rms=result.error;
    $('#result').textContent=(imported.length?imported.length+'개 객체를 좌표 정렬했어.\n':'GeoJSON을 가져오면 정렬해서 그릴게.\n')+
      '기준점 '+anchorCount+'개 · RMS '+rms.toFixed(2)+' (게임 좌표 단위)\n추정 축척 '+result.scale.toFixed(3)+' · 실제 위치/높이 확정 아님.';
    $('#summary').textContent='건물 '+FACILITIES.length+'동 · 참조 데이터 '+imported.length+'개 · '+anchorCount+'점 임시 정렬';
    draw();
  }catch(e){$('#result').textContent='정렬 오류: '+e.message;}
};
$('#all').onclick=fitAll;$('#reset').onclick=()=>{selectedId=null;fitAll();};
$('#dorm').onclick=fitDorm;
$('#export').onclick=()=>{
  const features=FACILITIES.flatMap(b=>b.parts.map((p,i)=>({
    type:'Feature',properties:{id:b.id,name:b.name,part:i+1,source:'illustrative game blocks',verified:false,heightEstimate:p.h},
    geometry:{type:'Polygon',coordinates:[[...rect(b,p),rect(b,p)[0]]]}
  })));
  const content={kind:'BUGIL_GAME_LOCAL_POLYGONS',coordinateSystem:'GAME_XZ_NOT_WGS84',verified:false,created:'2026-11-03',features};
  const blob=new Blob([JSON.stringify(content,null,2)],{type:'application/json'});
  const url=URL.createObjectURL(blob),a=document.createElement('a');
  a.href=url;a.download='bugil-local-footprints-unverified.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),2000);
};
function pointerPt(e){const r=canvas.getBoundingClientRect();return {x:e.clientX-r.left,y:e.clientY-r.top};}
canvas.addEventListener('pointerdown',e=>{
  canvas.setPointerCapture(e.pointerId);pointers.set(e.pointerId,pointerPt(e));
  lastSingle=pointers.size===1?{...pointerPt(e),moved:false}:null;lastPinch=null;
});
canvas.addEventListener('pointermove',e=>{
  if(!pointers.has(e.pointerId))return;
  const before=pointers.get(e.pointerId),now=pointerPt(e);
  pointers.set(e.pointerId,now);
  if(pointers.size===1&&before){
    if(lastSingle&&(Math.abs(now.x-lastSingle.x)+Math.abs(now.y-lastSingle.y)>4))lastSingle.moved=true;
    center.x-=(now.x-before.x)/scale;center.z-=(now.y-before.y)/scale;draw();
  }else if(pointers.size===2){
    const values=[...pointers.values()];
    const d=Math.hypot(values[1].x-values[0].x,values[1].y-values[0].y);
    if(lastPinch){scale=Math.max(.12,Math.min(20,scale*d/lastPinch));draw();}
    lastPinch=d;lastSingle=null;
  }
});
function releasePointer(e){
  if(lastSingle&&!lastSingle.moved&&pointers.size===1){
    const v=pointerPt(e);const b=hitBuilding(worldAt(v.x,v.y));if(b)selectBuilding(b.id);
  }
  pointers.delete(e.pointerId);lastSingle=null;lastPinch=null;
}
canvas.addEventListener('pointerup',releasePointer);
canvas.addEventListener('pointercancel',releasePointer);
canvas.addEventListener('wheel',e=>{
  e.preventDefault();
  const v=pointerPt(e),before=worldAt(v.x,v.y);
  scale=Math.max(.12,Math.min(20,scale*Math.exp(-e.deltaY*.001)));
  center.x=before.x-(v.x-width/2)/scale;center.z=before.z-(v.y-height/2)/scale;draw();
},{passive:false});
window.addEventListener('resize',resize);
fillChecklist();resize();
