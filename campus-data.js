// BUGIL Campus Lab v0.3: approximate positions from user-marked satellite imagery.
// Local orientation: +X = east, +Z = south. Units are illustrative, NOT survey meters.
// v0.4 pixel-to-scene calibration based on user-annotated overhead view; photo perspective may vary.
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
 {id:"dormNew",no:"07",name:"여송학사 신관",type:"dorm",confidence:"높음",x:151,z:210,focus:78,
  // Satellite top-down: the connected north bar feeds three southward wings.
  // Their two open courtyards give the complex its distinctive M-shaped silhouette.
  parts:[
   {x:0,z:-30,w:103,d:19,h:27,detail:"crossbar"},
   {x:-41,z:8,w:20,d:70,h:27,detail:"westWing"},
   {x:0,z:5,w:20,d:58,h:29,detail:"middleWing"},
   {x:41,z:7,w:20,d:67,h:27,detail:"eastWing"},
   {x:1,z:-31,w:16,d:18,h:36,detail:"clockTower"}
  ],
  notes:"위성사진 기준 M자형 평면 · 북측 연결동과 남쪽으로 뻗은 3개 날개, 열린 두 안뜰과 시계탑"},
 {id:"girlsDorm",no:"여고",name:"여고 여송학사",type:"dorm",confidence:"중간",x:202,z:122,focus:58,
  // Separate L/ㄱ footprint at the north-east side of the parking lot.
  parts:[
   {x:-15,z:-21,w:66,d:19,h:24,detail:"girlsHorizontal"},
   {x:18,z:11,w:20,d:65,h:24,detail:"girlsVertical"}
  ],
  notes:"여고 운동장 남쪽의 ㄱ자형 별도 건물 · 위성사진 윤곽 기준"}
];
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
 dorm:{position:[262,162,285],target:[151,10,210]}
};
