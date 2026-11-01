// BUGIL CAMPUS LAB terrain prototype with contour/spot based source.
// Local height is referenced to 75.3m at an approximate school point.
// Alignment is provisional and NOT suitable for accurate ground level or surveying.
import { FACILITIES } from './campus-data.js';
import { sampleElevationMetres } from './height-grid.js';

const clamp=(n,a=0,b=1)=>Math.min(b,Math.max(a,n));
const smooth=t=>{t=clamp(t);return t*t*(3-2*t)};
const REFERENCE_ELEVATION=75.3;
function naturalElevation(x,z){
 return sampleElevationMetres(x,z)-REFERENCE_ELEVATION;
}
// Artistic flat pads and sports areas. Each plateau has a smooth graded shoulder.
const pads=[
  {id:'field',x:-5,z:5,w:156,d:128,edge:23},
  {id:'baseball',x:-214,z:106,w:145,d:145,edge:24},
  {id:'girlsField',x:179,z:17,w:102,d:80,edge:20},
  {id:'parking',x:119,z:150,w:76,d:49,edge:18},
  {id:'northPlaza',x:-8,z:-92,w:105,d:40,edge:13},
  {id:'southGymWalk',x:-8,z:86,w:77,d:23,edge:11}
];
for(const b of FACILITIES){
  let minX=Infinity,maxX=-Infinity,minZ=Infinity,maxZ=-Infinity;
  for(const p of b.parts){
    const c=Math.cos(p.rot||0),s=Math.sin(p.rot||0);
    const rx=(Math.abs(c)*p.w+Math.abs(s)*p.d)/2,rz=(Math.abs(s)*p.w+Math.abs(c)*p.d)/2;
    minX=Math.min(minX,b.x+p.x-rx);maxX=Math.max(maxX,b.x+p.x+rx);
    minZ=Math.min(minZ,b.z+p.z-rz);maxZ=Math.max(maxZ,b.z+p.z+rz);
  }
  pads.push({id:b.id,x:(minX+maxX)/2,z:(minZ+maxZ)/2,
    w:maxX-minX+5,d:maxZ-minZ+5,edge:b.id==='dormOld'?19:17,
    level:naturalElevation(b.x,b.z)});
}
for(const p of pads)if(!Number.isFinite(p.level))p.level=naturalElevation(p.x,p.z);

function weight(p,x,z){
 const dx=Math.max(0,Math.abs(x-p.x)-p.w/2);
 const dz=Math.max(0,Math.abs(z-p.z)-p.d/2);
 return 1-smooth(Math.hypot(dx,dz)/p.edge);
}
// Exact ground height used by terrain mesh, road ribbons, labels and buildings.
export function elevation(x,z){
 let h=naturalElevation(x,z);
 for(const p of pads){const t=weight(p,x,z);if(t>0)h=h+(p.level-h)*t}
 return h;
}
export function getPads(){return pads.map(({id,x,z,w,d,level})=>({id,x,z,w,d,level}))}
export function heightColor(t){ // 0..1 of the illustrative height range
 const stops=[[0,0.19,0.37,0.59],[.3,0.20,.55,.60],[.55,.54,.72,.40],[.8,.91,.71,.39],[1,.72,.40,.32]];
 const v=clamp(t);
 for(let i=1;i<stops.length;i++)if(v<=stops[i][0]){
  const a=stops[i-1],b=stops[i],f=(v-a[0])/(b[0]-a[0]);
  return [a[1]+f*(b[1]-a[1]),a[2]+f*(b[2]-a[2]),a[3]+f*(b[3]-a[3])];
 }
 return stops[stops.length-1].slice(1);
}
export const RELATIVE_HEIGHT_RANGE={min:-36,max:65,units:'metres relative to 75.3m approximate reference'};
export function approximateAboveSeaLevel(x,z){return elevation(x,z)+REFERENCE_ELEVATION;}
