// BUGIL Campus Lab v0.3: approximate positions from user-marked satellite imagery.
// Local orientation: +X = east, +Z = south. Units are illustrative, NOT survey meters.
// v0.4.5 footprint revision: rectilinear dorm plan alignment to 2026 aerial references.
// Landmark centers are visually estimated, not GPS coordinates or surveyed measurements.
export const FACILITIES = [
 {id:"main",no:"01",name:"본관",type:"academic",confidence:"높음",x:-6,z:-142,focus:52,
  parts:[{x:0,z:0,w:113,d:19,h:25}],notes:"대운동장 북쪽 · 긴 수평형 교사동과 중앙 박공"},
 {id:"adan",no:"02",name:"아단관",type:"modern",confidence:"높음",x:105,z:-123,focus:55,
  parts:[{x:-20,z:-9,w:38,d:24,h:22},{x:4,z:4,w:23,d:48,h:20},{x:29,z:16,w:33,d:17,h:17},{x:37,z:-13,w:15,d:21,h:15}],notes:"본관 동쪽 · 녹색 지붕과 복합형 건물 매스"},
 {id:"gym",no:"03",name:"현암관",type:"gym",confidence:"높음",x:1,z:124,focus:47,
  parts:[{x:0,z:0,w:65,d:44,h:19}],notes:"대운동장 남쪽 · 넓은 체육관 지붕"},
 {id:"creative",no:"04",name:"창의관",type:"academic",confidence:"중간",x:-14,z:-213,focus:40,
  parts:[{x:0,z:0,w:29,d:28,h:20}],notes:"본관 뒤 북측 축에 있는 교사동"},
 {id:"summit",no:"05",name:"써미트홀",type:"modern",confidence:"중간",x:-16,z:-259,focus:36,
  parts:[{x:0,z:0,w:27,d:22,h:13}],notes:"창의관 북쪽의 소형 시설"},
 {id:"dormOld",no:"06",name:"여송학사 본관",type:"dorm",confidence:"중간",x:5,z:-320,focus:57,
  parts:[{x:-7,z:3,w:44,d:20,h:20},{x:14,z:-14,w:28,d:20,h:16,rot:-0.25}],notes:"가장 북쪽 숲 안쪽의 기숙사 본관"},
 {id:"dormNew",no:"07",name:"여송학사 신관",type:"dorm",confidence:"높음",x:166,z:220,focus:80,
  // Rectilinear roof silhouette traced against the user-supplied satellite screenshot.
  // West lower L connects to the central spine; upper bar bends toward the east.
  // No diagonal wing or diagonal angle anywhere in this footprint.
  parts:[
   {x:-40,z:25,w:18,d:53,h:27,detail:"westWing"},
   {x:-16,z:18,w:55,d:18,h:26,detail:"lowerBar"},
   {x:9,z:2,w:19,d:55,h:28,detail:"middleWing"},
   {x:34,z:-16,w:62,d:18,h:27,detail:"upperBar"},
   {x:57,z:-13,w:18,d:26,h:26,detail:"eastWing"},
   {x:10,z:-8,w:18,d:18,h:36,detail:"clockTower"}
  ],
  notes:"직각으로 꺾이는 M자형 지붕 · 위성사진의 서측 하단 날개와 중앙·동측 상단 연결동을 따라 배치"},
 {id:"girlsDorm",no:"여고",name:"여고 여송학사",type:"dorm",confidence:"높음",x:220,z:147,focus:58,
  // North east-west bar plus the SOUTHWEST leg, with a short straight connector.
  // The L faces the opposite direction from the previous version.
  parts:[
   {x:18,z:-19,w:70,d:28,h:24,detail:"girlsHorizontal"},
   {x:-35,z:4,w:21,d:42,h:24,detail:"girlsVertical"},
   {x:-20,z:-16,w:35,d:16,h:22,detail:"girlsConnector"}
  ],
  notes:"북일여고 운동장 남동쪽 · 북쪽 가로동의 서쪽 끝에서 남쪽으로 뻗는 ㄱ자형 별도 기숙사"},
// Girls' high school has distinct classroom buildings separate from its dormitory.
// Official school facilities identify A, B, and C blocks. This release represents the
// two missing primary classroom masses, A/B; exact footprints are provisional because
// the local OSM extract does not include both teaching blocks in usable detail.
 {id:"girlsA",no:"여고 A",name:"북일여고 A동",type:"girlsAcademic",confidence:"추정",x:240,z:-57,focus:62,
  parts:[
   {x:0,z:0,w:85,d:22,h:17,detail:"girlsDanceRoof"},
   {x:-32,z:9,w:20,d:22,h:13,detail:"girlsAStairs"}
  ],
  notes:"북일여고 교사동 A동 · 공식 시설 안내에 4층 무용실 표기 · 건물 위치·외곽 임시 배치"},
 {id:"girlsB",no:"여고 B",name:"북일여고 B동",type:"girlsAcademic",confidence:"추정",x:246,z:-113,focus:60,
  parts:[
   {x:0,z:0,w:84,d:23,h:14,detail:"girlsBClassrooms"},
   {x:32,z:-10,w:20,d:23,h:14,detail:"girlsBStairs"}
  ],
  notes:"북일여고 교사동 B동 · 공식 시설 안내에 1~3층 주요 시설 표기 · 건물 위치·외곽 임시 배치"}];
export const LANDMARKS = [
 {id:"field",no:"08",name:"대운동장",x:-5,z:5,kind:"field",notes:"본관 남쪽의 큰 흙 운동장"},
 {id:"baseball",no:"09",name:"야구장",x:-214,z:106,kind:"baseball",notes:"서쪽 독립 야구장과 주변 시설"},
 {id:"wood",no:"10",name:"북일랜드",x:-21,z:179,kind:"forest",notes:"남쪽 녹지와 산책 공간"},
 {id:"girlsField",no:"별도",name:"북일여고 운동장",x:179,z:17,kind:"field",notes:"동쪽 북일여고 시설 · 북일고 본관과 별도"}
];
export const CAMERA_PRESETS = {
 campus:{position:[-282,322,351],target:[-10,3,-22]},
 main:{position:[-126,92,-40],target:[-6,12,-142]},
 field:{position:[-35,195,198],target:[-5,0,5]},
 dorm:{position:[277,162,295],target:[166,10,220]}
};
