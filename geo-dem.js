// WGS84-registered, gently interpolated elevation grid derived from the
// Copernicus GLO-90 dataset. It cannot resolve narrow paths, steps or walls.
// Grid uses the same east-positive / south-positive metre coordinates
// as geo-3d.js, with a visible world datum at the grid centre.
export async function loadGeographicElevation(){
 const response=await fetch('./geo/campus-glo90-dem.json',{cache:'default'});
 if(!response.ok)throw new Error('Copernicus 고도 파일 HTTP '+response.status);
 const d=await response.json();
 if(d.width!==21||d.height!==21||d.stepMetres!==90
     ||d.origin?.lat!==36.8315||d.origin?.lon!==127.1585
     ||!Array.isArray(d.heightsMetres)||d.heightsMetres.length!==441
     ||d.heightsMetres.some(v=>!Number.isFinite(v)))throw new Error('고도 데이터 구조가 일치하지 않음');
 const W=d.width,H=d.height,step=d.stepMetres;
 const baseline=d.centerElevationMetres;
 if(!Number.isFinite(baseline))throw new Error('고도 기준값 누락');
 const absolute=(x,z)=>{
  const gx=Math.max(0,Math.min(W-1,(x-d.minX)/step));
  const gz=Math.max(0,Math.min(H-1,(z-d.minZ)/step));
  const ix=Math.floor(gx),iz=Math.floor(gz),nx=Math.min(ix+1,W-1),nz=Math.min(iz+1,H-1);
  const u=gx-ix,v=gz-iz;
  const a=(i,j)=>d.heightsMetres[j*W+i];
  return a(ix,iz)*(1-u)*(1-v)+a(nx,iz)*u*(1-v)+a(ix,nz)*(1-u)*v+a(nx,nz)*u*v;
 };
 return {
  elevation: (x,z)=>absolute(x,z)-baseline,
  aboveSeaLevel: absolute,
  baseline,
  min:d.rangeMetres[0],max:d.rangeMetres[1],
  label:'Copernicus GLO-90 (90m, Open-Meteo)',
  resolutionMetres:90,
  source:d.source
 };
}
