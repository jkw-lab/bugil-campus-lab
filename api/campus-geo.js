// Read-only Vercel endpoint: outdoor public map features.
// © OpenStreetMap contributors, ODbL. No indoor or entrance details.
const bbox="36.82555,127.151,36.83735,127.166";
const query='[out:json][timeout:30];(way["building"]('+bbox+');way["highway"~"^(service|residential|tertiary|unclassified|footway|pedestrian|path)$"]('+bbox+');way["landuse"~"^(forest|grass|recreation_ground)$"]('+bbox+');way["leisure"~"^(pitch|park|garden)$"]('+bbox+'););out geom;';
const endpoints=[
  "https://overpass.kumi.systems/api/interpreter",
  "https://overpass-api.de/api/interpreter",
  "https://overpass.private.coffee/api/interpreter"
];
function polygon(pts) {
  if(pts.length<4)return null;
  const p=pts.map(x=>[x.lon,x.lat]);
  if(p.some(a=>!a.every(Number.isFinite)))return null;
  if(p[0][0]!==p[p.length-1][0]||p[0][1]!==p[p.length-1][1])p.push([...p[0]]);
  return {type:"Polygon",coordinates:[p]};
}
function collect(data) {
  const features=[];
  for(const e of data?.elements||[]) {
    if(e.type!=="way"||!Array.isArray(e.geometry))continue;
    const t=e.tags||{};let geom,kind;
    if(t.building){geom=polygon(e.geometry);kind="building";}
    else if(t.highway){
      geom={type:"LineString",coordinates:e.geometry.map(p=>[p.lon,p.lat])};
      kind="road";
    } else if(t.landuse||t.leisure){geom=polygon(e.geometry);kind="land";}
    if(!geom)continue;
    features.push({
      type:"Feature",id:"osm:way/"+e.id,
      properties:{
        kind,name:typeof t.name==="string"?t.name:"",
        building:t.building||null,
        height:t.height||null,
        levels:t["building:levels"]||null,
        road:t.highway||null,
        landuse:t.landuse||null,
        leisure:t.leisure||null
      }, geometry:geom
    });
  }
  return {type:"FeatureCollection",coordinateSystem:"EPSG:4326",attribution:"© OpenStreetMap contributors (ODbL)",
    source:"live-overpass-public-map",verifiedCampusBuildings:false,verifiedHeight:false,features};
}
module.exports=async function handler(req,res){
  if(req.method!=="GET"){res.setHeader("Allow","GET");return res.status(405).json({error:"Only GET supported"});}
  res.setHeader("Cache-Control","public, s-maxage=43200, stale-while-revalidate=86400");
  let last="";
  for(const endpoint of endpoints){
    const controller=new AbortController();
    const timer=setTimeout(()=>controller.abort(),10000);
    try{
      const rsp=await fetch(endpoint,{
        method:"POST",headers:{"Content-Type":"application/x-www-form-urlencoded","User-Agent":"BugilCampusLab/0.2 public OSM visualizer"},
        body:new URLSearchParams({data:query}),signal:controller.signal
      });
      if(!rsp.ok)throw new Error("public map HTTP "+rsp.status);
      const d=await rsp.json(),mapped=collect(d);
      if(mapped.features.filter(f=>f.properties.kind==="building").length<3)throw new Error("not enough features returned");
      clearTimeout(timer);
      return res.status(200).json(mapped);
    }catch(e){last=e.name==="AbortError"?"timeout":String(e.message||e);clearTimeout(timer);}
  }
  return res.status(503).json({error:"공개 지도 서비스를 현재 불러오지 못했습니다.",detail:last,attribution:"© OpenStreetMap contributors (ODbL)"});
};