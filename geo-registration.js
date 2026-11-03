// Fit a 2D similarity transformation from three independently identifiable
// sports-ground outlines in public OSM to the existing illustrated campus.
// This is a visual fit: never present the result as surveyed coordinates.
export const REFERENCE={lon:127.1585,lat:36.8315};
const MX=111320*Math.cos(REFERENCE.lat*Math.PI/180),MZ=111133;
export const CONTROL_POINTS=[
 {id:"way/475282796",label:"대운동장",game:[-5,5]},
 {id:"way/473817569",label:"야구장",game:[-214,106]},
 {id:"way/475282799",label:"북일여고 운동장",game:[179,17]}
];
export const OSM_CANDIDATES={
 dormOld:["way/487459956"],
 adan:["way/494724468"],
 gym:["way/494469121"],
 dormNew:["way/487459954"],
 girlsDorm:["way/487459955"]
};
export function wgsToMetres(lon,lat){
 return [(lon-REFERENCE.lon)*MX,(REFERENCE.lat-lat)*MZ];
}
function bboxCenter(feature){
 const g=feature?.geometry;
 if(!g ||g.type!=="Polygon" ||!Array.isArray(g.coordinates?.[0]))return null;
 const ps=g.coordinates[0].map(p=>wgsToMetres(p[0],p[1]));
 if(ps.length<3||ps.some(p=>p.some(v=>!Number.isFinite(v))))return null;
 const xs=ps.map(p=>p[0]),zs=ps.map(p=>p[1]);
 return [(Math.min(...xs)+Math.max(...xs))/2,(Math.min(...zs)+Math.max(...zs))/2];
}
export function registerToGame(data) {
 const byId=new Map((data?.features||[]).map(f=>[String(f.id),f]));
 const source=[],target=[];
 for(const a of CONTROL_POINTS){
  const p=bboxCenter(byId.get(a.id));
  if(!p)throw Error("OSM 기준점 누락: "+a.label);
  source.push(p);target.push(a.game);
 }
 const n=source.length;
 const mean=pts=>pts.reduce((o,p)=>[o[0]+p[0]/n,o[1]+p[1]/n],[0,0]);
 const sm=mean(source),tm=mean(target);
 let dot=0,cross=0,den=0;
 for(let i=0;i<n;i++){
  const x=source[i][0]-sm[0],z=source[i][1]-sm[1];
  const a=target[i][0]-tm[0],b=target[i][1]-tm[1];
  dot+=x*a+z*b;cross+=x*b-z*a;den+=x*x+z*z;
 }
 if(den<1)throw Error("지도 기준점이 너무 가까움");
 const A=dot/den,B=cross/den;
 const tx=tm[0]-A*sm[0]+B*sm[1],tz=tm[1]-B*sm[0]-A*sm[1];
 const metresToGame=(x,z)=>[A*x-B*z+tx,B*x+A*z+tz];
 const wgsToGame=([lon,lat])=>metresToGame(...wgsToMetres(lon,lat));
 // Inverse transform for provisional buildings missing from the OSM extract.
 // Inverted points have the same visual fit limitations as the original anchors.
 const gameToMetres=(gx,gz)=>{
  const qx=gx-tx,qz=gz-tz,det=A*A+B*B;
  return [(A*qx+B*qz)/det,(-B*qx+A*qz)/det];
 };
 const gameToWgs=([gx,gz])=>{
  const [east,south]=gameToMetres(gx,gz);
  return [REFERENCE.lon+east/MX,REFERENCE.lat-south/MZ];
 };
 const residuals=source.map((p,i)=>{
  const a=metresToGame(...p);
  return Math.hypot(a[0]-target[i][0],a[1]-target[i][1]);
 });
 const rms=Math.sqrt(residuals.reduce((s,x)=>s+x*x,0)/n);
 return {wgsToGame,metresToGame,gameToWgs,gameToMetres,rms,scale:Math.hypot(A,B),
  degrees:Math.atan2(B,A)*180/Math.PI,
  residuals,controlPointCount:n,source:"© OpenStreetMap contributors (ODbL)",
  candidateBuildings:OSM_CANDIDATES};
}