// Diagnostic only. Never stores or serves government building coordinates.
// Tests whether browsers may read the public MOIS-derived Esri FeatureServer.
module.exports=async function handler(req,res){
 res.setHeader('Cache-Control','no-store');
 const source='https://portal.esrikr.com/arcgis/rest/services/MOIS_KR_Buildings_v2/FeatureServer/0/query';
 const qs=new URLSearchParams({
  f:'geojson',geometry:'127.1562,36.8288,127.1630,36.8346',
  geometryType:'esriGeometryEnvelope',inSR:'4326',spatialRel:'esriSpatialRelIntersects',
  where:'1=1',outFields:'objectid,building_name,buld_nm_dc,gro_flo_co',
  outSR:'4326',returnGeometry:'true',resultRecordCount:'2000'
 });
 const ac=new AbortController(),timer=setTimeout(()=>ac.abort(),17000);
 try{
  const r=await fetch(source+'?'+qs.toString(),{signal:ac.signal,
   headers:{Origin:'https://bugil-campus-live.vercel.app'}});
  const allow=r.headers.get('access-control-allow-origin');
  const data=await r.json();
  res.status(200).json({
    originServiceStatus:r.status,allowOrigin:allow||null,
    officialGeometryCount:Array.isArray(data?.features)?data.features.length:null,
    browserDirectCORSCompatible:allow==='*'||allow==='https://bugil-campus-live.vercel.app',
    source:'Esri Korea public MOIS-derived footprints',
    dataSaved:false
  });
 }catch(e){
  res.status(502).json({error:String(e.message||e),dataSaved:false});
 }finally{clearTimeout(timer);}
};