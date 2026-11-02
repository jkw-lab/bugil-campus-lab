// A single terrain-draped road atlas prevents z-fighting and double-width overlaps.
// All routes are rasterized into one RGBA surface; round joins merge intersections.
import * as THREE from 'three';
import { ROAD_PATHS, WALK_PATHS } from './roads-data.js';

export function buildMergedRoads(terrainGeometry, mobile=false) {
  const sizeX=820,sizeZ=765,px=mobile?1536:2048;
  const width=px,height=Math.round(px*sizeZ/sizeX);
  const canvas=document.createElement('canvas');
  canvas.width=width;canvas.height=height;
  const ctx=canvas.getContext('2d',{alpha:true});
  if(!ctx)throw new Error('2D canvas unavailable for road atlas');
  ctx.clearRect(0,0,width,height);
  ctx.setTransform(width/sizeX,0,0,height/sizeZ,width/2,height/2);
  ctx.lineCap='round';ctx.lineJoin='round';
  function paint(paths,color,added=0){
    ctx.strokeStyle=color;
    for(const route of paths){
      const points=route.points;
      if(points.length<2)continue;
      const curve=new THREE.CatmullRomCurve3(points.map(([x,z])=>new THREE.Vector3(x,0,z)),false,'centripetal');
      const steps=Math.max(24,points.length*12);
      ctx.beginPath();
      for(let k=0;k<=steps;k++){
        const p=curve.getPoint(k/steps);
        if(k===0)ctx.moveTo(p.x,p.z);else ctx.lineTo(p.x,p.z);
      }
      ctx.lineWidth=route.width+added;
      ctx.stroke();
    }
  }
  // Paint borders/footpaths first, then the asphalt body. Crossing routes
  // write onto the same pixels rather than stacking separate coplanar meshes.
  paint(WALK_PATHS,'#c2beb3',.8);
  paint(ROAD_PATHS,'#626d68',2.0);
  paint(ROAD_PATHS,'#7c8381',0);
  const texture=new THREE.CanvasTexture(canvas);
  texture.colorSpace=THREE.SRGBColorSpace;
  texture.anisotropy=mobile?2:4;
  const material=new THREE.MeshBasicMaterial({
    map:texture,transparent:true,opacity:1,depthWrite:false,
    side:THREE.DoubleSide,polygonOffset:true,polygonOffsetFactor:-1,
    polygonOffsetUnits:-1
  });
  const geometry=terrainGeometry.clone();
  const heights=geometry.attributes.position;
  for(let i=0;i<heights.count;i++)heights.setY(i,heights.getY(i)+.46);
  geometry.computeVertexNormals();
  const mesh=new THREE.Mesh(geometry,material);
  mesh.frustumCulled=true;mesh.receiveShadow=false;mesh.renderOrder=2;
  return mesh;
}
