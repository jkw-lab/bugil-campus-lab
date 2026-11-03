import { FACILITIES } from './campus-data.js';
import { registerToGame } from './geo-registration.js';

// The OSM snapshot omits these teaching buildings. Keep their original,
// photography-aligned approximations apart from the real OSM features.
export const MISSING_TEACHING_BLOCK_IDS=['main','girlsA','girlsB'];
export function createProvisionalSchoolFootprints(osmData){
 const fit=registerToGame(osmData);
 const entries=[],summary=[];
 const selected=FACILITIES.filter(b=>MISSING_TEACHING_BLOCK_IDS.includes(b.id));
 for(const b of selected){
  let count=0;
  for(const [idx,part] of b.parts.entries()){
   const c=Math.cos(part.rot||0),s=Math.sin(part.rot||0);
   const corners=[[-1,-1],[1,-1],[1,1],[-1,1]];
   const ring=corners.map(([signX,signZ])=>{
    const dx=part.w*signX/2,dz=part.d*signZ/2;
    // Same Three.js Y-rotation convention used in the legacy campus.
    const gx=b.x+part.x+c*dx+s*dz;
    const gz=b.z+part.z-s*dx+c*dz;
    return fit.gameToWgs([gx,gz]);
   });
   ring.push([...ring[0]]);
   const feature={
    type:'Feature',id:'photo-estimate:'+b.id+':'+idx,
    properties:{
     featureType:'building',kind:'building',name:b.name,
     building:'school',height:null,levels:null,
     visualHeightMetres:part.h,localModel:true,
     facilityId:b.id,partIndex:idx,confidence:'provisional',
     source:'legacy photo-aligned campus model and 3-point OSM pitch registration',
     note:'Approximate shape and position; not traced from an actual OSM building footprint'
    },
    geometry:{type:'Polygon',coordinates:[ring]}
   };
   entries.push(feature);count++;
  }
  summary.push({id:b.id,name:b.name,partCount:count,
    confidence:'provisional',x:b.x,z:b.z,centerLonLat:fit.gameToWgs([b.x,b.z]),estimatedHeight:Math.max(...b.parts.map(p=>p.h))});
 }
 return {features:entries,buildings:summary,fitRmsGameUnits:fit.rms};
}
