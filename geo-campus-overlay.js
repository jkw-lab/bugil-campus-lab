import * as THREE from 'three';
import {registerToGame,OSM_CANDIDATES} from './geo-registration.js';

// Public outdoor geometry only. This overlay makes NO changes to game entities,
// building destruction/collapse, terrain or road datasets.
function createShape(outer,project) {
 if(!Array.isArray(outer)||outer.length<4)return null;
 const points=outer.filter(p=>Array.isArray(p)&&p.length>=2).map(project);
 if(points.length<4||points.some(p=>!p.every(Number.isFinite)))return null;
 const shape=new THREE.Shape();
 points.forEach(([x,z],i)=>{
   if(i===0)shape.moveTo(x,-z);
   else shape.lineTo(x,-z);
 });
 shape.closePath();
 return shape;
}
export async function createCampusGeoOverlay(scene,FACILITIES,elevation) {
 const response=await fetch('./geo/osm-2026-bugil-vicinity.geojson',{cache:'no-cache'});
 if(!response.ok)throw Error('저장된 공개 지도 파일을 찾지 못함');
 const data=await response.json();
 const transform=registerToGame(data);
 if(!Number.isFinite(transform.rms)||transform.rms>25)throw Error('기준점 정합 오차가 너무 큼');
 const byWay=new Map(data.features.map(f=>[f.id,f]));
 const byFacility=new Map(FACILITIES.map(b=>[b.id,b]));
 const overlay=new THREE.Group();
 overlay.name='provisional OSM outlines (not surveyed)';
 overlay.visible=false;
 const fill=new THREE.MeshBasicMaterial({color:0x12b8cd,transparent:true,opacity:.2,
   side:THREE.DoubleSide,depthWrite:false,depthTest:false});
 const edgeMaterial=new THREE.LineBasicMaterial({color:0x00eeef,transparent:true,opacity:.95,
   depthTest:false,depthWrite:false});
 let count=0;
 const unresolved=[];
 for(const [facilityId,ids] of Object.entries(OSM_CANDIDATES)){
   const building=byFacility.get(facilityId);
   if(!building)continue;
   for(const id of ids){
     const feature=byWay.get(id);
     if(!feature||feature.geometry?.type!=='Polygon'){unresolved.push(id);continue;}
     const shape=createShape(feature.geometry.coordinates[0],transform.wgsToGame);
     if(!shape){unresolved.push(id);continue;}
     const h=Math.max(...building.parts.map(p=>p.h||0));
     const base=elevation(building.x,building.z)+.12;
     const geometry=new THREE.ExtrudeGeometry(shape,{
       depth:h,bevelEnabled:false,curveSegments:1,steps:1
     });
     geometry.rotateX(-Math.PI/2);
     geometry.translate(0,base,0);
     const volume=new THREE.Mesh(geometry,fill);
     volume.renderOrder=8;volume.userData={facilityId,osmWay:id,provisional:true};
     overlay.add(volume);
     const edges=new THREE.LineSegments(new THREE.EdgesGeometry(geometry,18),edgeMaterial);
     edges.renderOrder=9;overlay.add(edges);count++;
   }
 }
 if(count===0)throw Error('비교할 공개 지도 건물 윤곽 없음');
 scene.add(overlay);
 return {group:overlay,count,rms:transform.rms,scale:transform.scale,
   rotation:transform.degrees,unresolved,verified:false,
   attribution:'© OpenStreetMap contributors (ODbL)'};
}