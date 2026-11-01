// BUGIL Campus Lab v0.3: approximate positions from user-marked satellite imagery.
// Local orientation: +X = east, +Z = south. Units are illustrative, NOT survey meters.
export const FACILITIES = [
 {id:"main",no:"01",name:"본관",type:"academic",confidence:"높음",x:-8,z:-135,focus:52,
  parts:[{x:0,z:0,w:113,d:19,h:25}],notes:"대운동장 북쪽 · 긴 수평형 교사동과 중앙 박공"},
 {id:"adan",no:"02",name:"아단관",type:"modern",confidence:"높음",x:96,z:-116,focus:55,
  parts:[{x:-20,z:-9,w:38,d:24,h:22},{x:4,z:4,w:23,d:48,h:20},{x:29,z:16,w:33,d:17,h:17},{x:37,z:-13,w:15,d:21,h:15}],notes:"본관 동쪽 · 녹색 지붕과 복합형 건물 매스"},
 {id:"gym",no:"03",name:"현암관",type:"gym",confidence:"높음",x:-8,z:119,focus:47,
  parts:[{x:0,z:0,w:65,d:44,h:19}],notes:"대운동장 남쪽 · 넓은 체육관 지붕"},
 {id:"creative",no:"04",name:"창의관",type:"academic",confidence:"중간",x:-24,z:-210,focus:40,
  parts:[{x:0,z:0,w:29,d:28,h:20}],notes:"본관 뒤 북측 축에 있는 교사동"},
 {id:"summit",no:"05",name:"써미트홀",type:"modern",confidence:"중간",x:-24,z:-257,focus:36,
  parts:[{x:0,z:0,w:27,d:22,h:13}],notes:"창의관 북쪽의 소형 시설"},
 {id:"dormOld",no:"06",name:"여송학사 본관",type:"dorm",confidence:"중간",x:-12,z:-316,focus:57,
  parts:[{x:-7,z:3,w:44,d:20,h:20},{x:14,z:-14,w:28,d:20,h:16,rot:-0.25}],notes:"가장 북쪽 숲 안쪽의 기숙사 본관"},
 {id:"dormNew",no:"07",name:"여송학사 신관",type:"dorm",confidence:"높음",x:135,z:217,focus:66,
  parts:[{x:-22,z:0,w:23,d:66,h:27},{x:12,z:-21,w:57,d:22,h:28},{x:35,z:18,w:22,d:45,h:26}],notes:"남동쪽 경계 · 녹색 지붕과 붉은 벽돌 복합동"}
];
export const LANDMARKS = [
 {id:"field",no:"08",name:"대운동장",x:-5,z:5,kind:"field",notes:"본관 남쪽의 큰 흙 운동장"},
 {id:"baseball",no:"09",name:"야구장",x:-205,z:105,kind:"baseball",notes:"서쪽 독립 야구장과 주변 시설"},
 {id:"wood",no:"10",name:"북일랜드",x:-32,z:185,kind:"forest",notes:"남쪽 녹지와 산책 공간"},
 {id:"girlsField",no:"별도",name:"북일여고 운동장",x:158,z:27,kind:"field",notes:"동쪽 북일여고 시설 · 북일고 본관과 별도"}
];
export const CAMERA_PRESETS = {
 campus:{position:[-274,300,337],target:[-13,0,-22]},
 main:{position:[-126,92,-40],target:[-8,12,-135]},
 field:{position:[-35,195,198],target:[-5,0,5]},
 dorm:{position:[262,162,285],target:[135,12,217]}
};
