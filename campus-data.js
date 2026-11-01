// BUGIL Campus Lab — photo-referenced, approximate scene layout.
// World axes: +X east, +Z south. Dimensions are visual estimates, not survey measurements.
// Source: public school campus guide and user-provided Apple Maps overhead screenshots.
export const FACILITIES = [
 {id:"main",no:"01",name:"본관",type:"academic",confidence:"높음",x:-12,z:-115,focus:42,
  parts:[{x:0,z:0,w:112,d:18,h:25}],notes:"대운동장 북쪽 · 밝은 외벽 · 중앙 박공"},
 {id:"adan",no:"02",name:"아단관",type:"modern",confidence:"중간",x:89,z:-96,focus:46,
  parts:[{x:-13,z:-3,w:39,d:26,h:23},{x:18,z:8,w:20,d:53,h:19},{x:-37,z:6,w:15,d:25,h:16}],notes:"본관 동쪽 · 비정형 녹색 지붕"},
 {id:"gym",no:"03",name:"현암관",type:"gym",confidence:"높음",x:-1,z:111,focus:45,
  parts:[{x:0,z:0,w:63,d:42,h:19}],notes:"운동장 남쪽 · 넓은 옥상"},
 {id:"creative",no:"04",name:"창의관",type:"academic",confidence:"중간",x:-13,z:-161,focus:36,
  parts:[{x:0,z:0,w:54,d:19,h:19}],notes:"본관 뒤쪽 · 교사동"},
 {id:"summit",no:"05",name:"써미트홀",type:"modern",confidence:"낮음",x:50,z:-168,focus:28,
  parts:[{x:0,z:0,w:25,d:19,h:13}],notes:"북측 부속 건물 · 세부 위치 추가 검증 필요"},
 {id:"dormOld",no:"06",name:"여송학사 본관",type:"dorm",confidence:"중간",x:158,z:-106,focus:56,
  parts:[{x:-24,z:-4,w:53,d:17,h:26,rot:-0.10},{x:28,z:2,w:53,d:17,h:27,rot:0.10},{x:2,z:-9,w:23,d:23,h:23}],notes:"동북쪽 · 길고 굽은 기숙사동"},
 {id:"dormNew",no:"07",name:"여송학사 신관",type:"dorm",confidence:"높음",x:135,z:151,focus:52,
  parts:[{x:-26,z:2,w:23,d:65,h:28},{x:7,z:-18,w:54,d:21,h:28},{x:32,z:16,w:22,d:46,h:26}],notes:"남동쪽 · 붉은 벽돌 · 녹색 지붕"},
];
export const LANDMARKS = [
 {id:"field",no:"08",name:"대운동장",x:-5,z:5,kind:"field"},
 {id:"baseball",no:"09",name:"야구장",x:-158,z:103,kind:"baseball"},
 {id:"wood",no:"10",name:"북일랜드",x:-120,z:-35,kind:"forest"},
];
export const CAMERA_PRESETS = {
 campus:{position:[-206,201,255],target:[0,0,-5]},
 main:{position:[-114,82,-16],target:[-12,12,-115]},
 field:{position:[-12,167,165],target:[-6,0,0]},
 dorm:{position:[235,135,234],target:[138,12,36]}
};
