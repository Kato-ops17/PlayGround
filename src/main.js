
import * as THREE from 'three';
import './style.css';
const canvas=document.querySelector('#scene');
const renderer=new THREE.WebGLRenderer({canvas,antialias:true,powerPreference:'high-performance'});renderer.setPixelRatio(Math.min(devicePixelRatio,1.7));renderer.setSize(innerWidth,innerHeight);renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.08;
const scene=new THREE.Scene();scene.background=new THREE.Color(0x101514);scene.fog=new THREE.FogExp2(0x111615,.023);
const camera=new THREE.PerspectiveCamera(72,innerWidth/innerHeight,.08,100);camera.position.y=1.65;camera.rotation.order='YXZ';const player=new THREE.Group();player.add(camera);scene.add(player);
const clock=new THREE.Clock(),raycaster=new THREE.Raycaster(),center=new THREE.Vector2(0,0),interactables=[],mats={},keys=new Set();raycaster.far=4.2;
const $=s=>document.querySelector(s),ui={menu:$('#menu-screen'),hud:$('#hud'),prompt:$('#interaction-prompt'),objective:$('#objective'),sub:$('#objective-sub'),toast:$('#toast'),note:$('#note-modal'),noteTitle:$('#note-title'),noteBody:$('#note-body'),look:$('#look-hint'),end:$('#end-screen')};
const flash=$('#flash'),solid=[];
function obstacle(x,z,hx,hz){solid.push({x,z,hx,hz});}
let activeArea='room',started=false,pointerLocked=false,yaw=0,pitch=0,flashlightOn=true,hasCode=false,doorOpened=false,evidence=0,entityAlert=false,gameEnded=false,toastTimer=0,elapsed=0,closing=true;
const mat=(name,color,roughness=.85,extra={})=>mats[name]||=new THREE.MeshStandardMaterial({color,roughness,...extra});
function box(parent,name,x,y,z,sx,sy,sz,material,opts={}){const m=new THREE.Mesh(new THREE.BoxGeometry(sx,sy,sz),material);m.name=name;m.position.set(x,y,z);m.castShadow=opts.cast??true;m.receiveShadow=opts.receive??true;if(opts.ry)m.rotation.y=opts.ry;if(opts.rx)m.rotation.x=opts.rx;parent.add(m);return m;}
function sphere(parent,name,x,y,z,r,material,sx=1,sy=1,sz=1){const m=new THREE.Mesh(new THREE.SphereGeometry(r,16,12),material);m.name=name;m.position.set(x,y,z);m.scale.set(sx,sy,sz);m.castShadow=true;parent.add(m);return m;}
function cylinder(parent,name,x,y,z,r1,r2,h,material,segments=12){const m=new THREE.Mesh(new THREE.CylinderGeometry(r1,r2,h,segments),material);m.name=name;m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;}
function light(parent,color,intensity,x,y,z,distance=0){const l=new THREE.PointLight(color,intensity,distance,2);l.position.set(x,y,z);parent.add(l);return l;}
function makeGroup(name){const g=new THREE.Group();g.name=name;scene.add(g);return g;}
const room=makeGroup('Safehouse'),lot=makeGroup('Ashford exterior'),lab=makeGroup('Sublevel laboratory');lot.visible=false;lab.visible=false;
const ambient=new THREE.HemisphereLight(0x9ca9aa,0x151515,.36);scene.add(ambient);const moon=new THREE.DirectionalLight(0xa6b8bf,.55);moon.position.set(-18,24,12);moon.castShadow=true;moon.shadow.mapSize.set(1024,1024);scene.add(moon);
const flashlight=new THREE.SpotLight(0xe5eddd,38,28,Math.PI/7,.4,1.4);flashlight.position.set(0,0,0);flashlight.target.position.set(0,0,-1);camera.add(flashlight,flashlight.target);const fill=new THREE.PointLight(0x9f7150,1.2,12);camera.add(fill);fill.position.set(0,1,1);
function addInteract(mesh,label,action){mesh.userData.label=label;mesh.userData.action=action;mesh.userData.area=mesh.parent===lot?'lot':mesh.parent===lab?'lab':'room';interactables.push(mesh);return mesh;}
function buildRoom(){
 room.add(new THREE.AmbientLight(0xb2aaa0,.55));const warm=light(room,0xffc583,22,-2.5,3.8,1,13);warm.castShadow=true;
 const wall=mat('plaster',0x746e63),floor=mat('wood',0x453b31),trim=mat('trim',0x302b25),glass=mat('glass',0x18272a,.2,{metalness:.25,emissive:0x102126,emissiveIntensity:.25,transparent:true,opacity:.18,depthWrite:false});
 box(room,'floor',0,-.12,0,12,.24,12,floor);box(room,'ceiling',0,4.8,0,12,.25,12,mat('ceiling',0x3f3d37));box(room,'back wall',0,2.4,5.95,12,4.8,.22,wall);box(room,'left wall',-5.95,2.4,0,.22,4.8,12,mat('left wall',0x5d594f));box(room,'right wall front',5.95,2.4,-4.8,.22,4.8,2.4,wall);box(room,'right wall back',5.95,2.4,4.8,.22,4.8,2.4,wall);box(room,'right wall lintel',5.95,4.15,0,.22,1.3,2.4,wall);
  box(room,'safehouse door frame',5.72,1.55,0,.16,3.1,2.2,mat('room frame',0x302b25));box(room,'safehouse door',5.62,1.5,0,.12,2.9,1.9,mat('room door',0x51483c));const exitTarget=box(room,'room exit target',5.0,1.55,0,1.5,2.8,2.2,new THREE.MeshBasicMaterial({transparent:true,opacity:0,colorWrite:false}));addInteract(exitTarget,'LEAVE THE SAFEHOUSE',()=>changeArea('lot'));
 box(room,'window left',-4.5,2.4,-5.95,3,4.8,.22,wall);box(room,'window right',4.5,2.4,-5.95,3,4.8,.22,wall);box(room,'window top',0,4.1,-5.95,6,1.4,.22,wall);box(room,'window sill wall',0,.93,-5.95,6,1.86,.22,wall);box(room,'window glass',0,2.65,-5.95,5.85,2.55,.08,glass,{cast:false});
 for(const x of [-3,0,3])box(room,'window mullion',x,2.65,-5.82,.095,2.65,.16,trim);for(const y of [1.36,3.94])box(room,'window frame',0,y,-5.82,6.12,.13,.18,trim);
 box(room,'couch base',-1.6,.47,1.4,3.15,.62,1.25,mat('couch',0x4c4941));box(room,'couch back',-1.6,1.12,.92,3.15,1.08,.38,mat('couch back',0x57534a));for(const x of [-2.7,-1.6,-.5])box(room,'couch cushion',x,.82,1.42,.96,.2,.9,mat('cushion',0x696257));for(const x of [-2.82,-.38])for(const z of [1,1.85])box(room,'couch leg',x,.2,z,.12,.4,.12,trim);
 box(room,'coffee table',-1.4,.52,3.05,2,.15,1.05,mat('table',0x302b25));for(const x of [-2.25,-.55])for(const z of [2.7,3.4])box(room,'table leg',x,.25,z,.09,.52,.09,trim);
 box(room,'cardboard box',3,.63,2.4,1.15,1.25,1.05,mat('box',0x796247));box(room,'box tape',2.45,1.28,2.4,.06,.03,1.05,mat('box tape',0xb59a70));box(room,'shipping crate',4.3,.48,3.8,1.25,.95,1.2,mat('crate',0x514638));box(room,'crate stripe',4.3,.48,3.17,.09,.95,.03,mat('crate stripe',0x927752));box(room,'suitcase',3.65,.3,-1.4,1.2,.6,.75,mat('suitcase',0x393d3b));
 cylinder(room,'lamp stem',-.1,1.6,-.1,.035,.045,2.9,mat('brass',0x866c4d));cylinder(room,'lamp shade',-.1,3.17,-.1,.25,.42,.48,mat('shade',0xb19a75));light(room,0xffb56b,9,-.1,2.95,-.1,7);
 const outside=new THREE.Group();room.add(outside);outside.position.z=-6.9;box(outside,'distant ground',0,-.35,-14,50,.2,35,mat('earth',0x202723),{cast:false});box(outside,'distant factory',0,1.45,-26,13,3.5,3,mat('factory',0x323535));box(outside,'factory roof',0,3.3,-26,14,.2,3.4,mat('roof',0x242827));for(const x of [-4.7,-1.8,2.5,4.2])box(outside,'factory windows',x,1.8,-24.43,.55,.75,.03,mat('lit window',0x9c8060,.4,{emissive:0x6e4323,emissiveIntensity:.55}),{cast:false});
 function pine(x,z,h){cylinder(outside,'pine trunk',x,h*.34,z,.12,.2,h*.68,mat('bark',0x302a22),7);for(let i=0;i<3;i++){const c=new THREE.Mesh(new THREE.ConeGeometry(h*(.29-i*.045),h*.46,7),mat('pine',i===1?0x1d2925:0x25312a));c.position.set(x,h*(.34+i*.19),z);c.castShadow=true;outside.add(c)}}for(const [x,z,h] of [[-8,-2,7],[-11,-9,9],[-7,-15,6],[9,-4,8],[12,-12,10],[7,-19,7],[16,-6,9],[-15,-4,8]])pine(x,z,h);
 box(room,'picture frame',-4.8,2.7,-1.5,.08,1.35,1.8,mat('frame',0x221f1c));box(room,'picture',-4.73,2.7,-1.5,.03,1.16,1.56,mat('picture',0x595449));cylinder(room,'rug',0,.015,2.2,2.5,2.5,.025,mat('rug',0x454239),32).scale.set(1,.3,.58);
}
buildRoom();
function buildLot(){
  lot.add(new THREE.AmbientLight(0x78898b,.28));
  const asphalt=mat('asphalt',0x252a29), concrete=mat('concrete',0x4a4b45), rust=mat('rust',0x443c32), brick=mat('brick',0x49443c), darkBrick=mat('dark brick',0x282e2d), metal=mat('metal',0x333a39,.54,{metalness:.45}), amber=mat('amber',0xffb65d,.3,{emissive:0xff7c2d,emissiveIntensity:2});
  box(lot,'parking lot',0,-.25,-8,100,.5,90,asphalt);
  // cracked patched asphalt, faded parking stripes and shallow puddles
  for(let i=0;i<18;i++){const x=((i*37)%57)-28,z=((i*23)%65)-36;box(lot,'asphalt patch',x,.006,z,1.3+(i%3)*.8,.015,.25+(i%4)*.2,mat('patch'+i,i%2?0x2a2e2c:0x202423),{cast:false});}
  for(let x=-23;x<=23;x+=7)box(lot,'parking stripe',x,.012,8,.12,.02,6,mat('stripe',0x8c8061),{cast:false});
  // abandoned factory: corrugated sheds, patched brick, loading bays, smokestack and tired sodium lamps.
  box(lot,'factory main',0,5,-27,28,10,4,brick);box(lot,'factory roof',0,10.05,-27,29,.28,4.7,mat('roof metal',0x272d2c));
  box(lot,'factory west wing',-13.6,3.8,-19.5,4,7,18,darkBrick);box(lot,'west wing roof',-13.6,7.35,-19.5,4.4,.28,18.5,mat('roof2',0x303433));
  box(lot,'factory east shed',9,3,-20,10,5.5,15,mat('shed',0x3e403c));box(lot,'shed roof',9,5.85,-20,10.5,.3,15.5,mat('shed roof',0x252a28));
  for(let x=-11;x<=12;x+=4){box(lot,'factory upper window',x,7.1,-24.94,1.1,1.5,.07,mat('dark pane'+x,0x151b1b,.25,{emissive:x===1?0x74502d:0x080d0e,emissiveIntensity:x===1?.4:.1}),{cast:false});box(lot,'factory lintel',x,7.9,-24.9,1.35,.13,.18,rust)}
  for(const x of [-10,-5,0,5,10]){box(lot,'facade pilaster',x,4.7,-24.86,.2,9.3,.24,mat('concrete rib',0x373a36));}
  // loading bay and rusted roll-up door
  box(lot,'loading door',2.4,3.2,-24.78,4.2,6.1,.12,mat('loading door',0x282d2c));
  for(let y=.45;y<6;y+=.35)box(lot,'door slat',2.4,y,-24.68,4.12,.035,.05,metal);
  box(lot,'loading canopy',2.4,6.5,-25.5,5,.25,1.8,rust);for(let x of [.2,4.6])box(lot,'canopy support',x,5.4,-25.2,.15,2.1,.15,metal);
  // Side entrance and keypad face the parking lot.
  box(lot,'side entrance frame',-10.2,1.7,-24.72,2.1,3.45,.25,mat('door surround',0x252a29));
  const entrance=box(lot,'side entrance',-10.2,1.65,-24.54,1.65,3,.18,mat('factory door',0x343936));
  box(lot,'door warning',-10.2,2.9,-24.42,1.3,.11,.08,mat('warning',0x856641));
  const keypad=box(lot,'keypad',-8.98,1.65,-24.34,.27,.54,.12,mat('keypad',0x171d1d,.3,{emissive:0x17302e,emissiveIntensity:.7}));
  for(let r=0;r<3;r++)for(let c=0;c<2;c++)sphere(lot,'keypad button',-9.06+c*.12,1.8-r*.13,-24.26,.025,mat('keypad light',0x6ab5a0,.25,{emissive:0x397d65,emissiveIntensity:1}));
  const doorTarget=box(lot,'door interaction',-10.05,1.7,-24.25,2.2,3.3,1.4,new THREE.MeshBasicMaterial({visible:false}));doorTarget.visible=true;doorTarget.material.colorWrite=false;
  // Factory side walls/ducts visibly disappear into the black tree line.
  for(let i=0;i<7;i++){const z=-17-i*3.4;box(lot,'side corrugation',-15.67,3.8,z,.08,6.3,.12,mat('side metal'+i,0x353b38));}
  box(lot,'vent stack',-6,13,-28,1.4,6,1.4,rust);box(lot,'vent cap',-6,16,-28,2,.25,2,metal);
  // flickering loading lamps
  for(const x of [-11,2,10]){box(lot,'lamp arm',x,8.5,-25.15,.12,.12,.8,metal);box(lot,'lamp shade',x,8.15,-25.2,.7,.18,.42,metal);const l=light(lot,0xffa653, x===-11?8:4,x,7.8,-25.1,17);l.userData.flicker=true;}
  // Weeds and black firs form a wall beyond the lot.
  const bark=mat('tree bark',0x292a25), leaves=mat('tree leaves',0x17221e);
  function tree(x,z,h){cylinder(lot,'tree trunk',x,h*.32,z,.18,.25,h*.64,bark,7);for(let i=0;i<4;i++){const t=new THREE.Mesh(new THREE.ConeGeometry(h*(.29-i*.035),h*.43,7),leaves);t.position.set(x,h*(.35+i*.15),z);t.castShadow=true;lot.add(t)}}
  for(const [x,z,h] of [[-26,-10,11],[-31,-21,14],[-24,-34,10],[25,-9,12],[30,-24,14],[23,-38,11],[18,-46,9],[-18,-48,10]])tree(x,z,h);
  // rusty security fence recedes along both edges
  for(const side of [-1,1]){for(let z=-49;z<1;z+=5){cylinder(lot,'fence post',side*25,.9,z,.055,.055,1.8,metal,6);box(lot,'fence rail',side*25,1.45,z-2.5,.055,.055,5,metal,{cast:false});box(lot,'fence rail',side*25,.5,z-2.5,.055,.055,5,metal,{cast:false});}}
  // Vehicle, red-brown paint faded by rain. Interactable driver's door is readable from the starting spot.
  const car= new THREE.Group();car.position.set(0,0,8.5);lot.add(car);
  const bodymat=mat('car paint',0x4d3028,.34,{metalness:.48}), tire=mat('rubber',0x111414,.95), chrome=mat('chrome',0x727674,.28,{metalness:.8}), windows=mat('car glass',0x192326,.17,{metalness:.25});
  box(car,'car chassis',0,.78,0,2.05,.72,4.5,bodymat);box(car,'car hood',0,1.1,-1.45,1.95,.28,1.35,bodymat);box(car,'car trunk',0,1.08,1.62,1.9,.35,1.05,bodymat);
  box(car,'car roof',0,1.8,.05,1.63,.18,1.9,bodymat);box(car,'windshield',0,1.52,-.99,1.56,.68,.07,windows,{ry:0});box(car,'rear glass',0,1.52,1.11,1.56,.62,.06,windows);
  for(const side of [-1,1]){box(car,'side glass',side*.83,1.55,.05,.06,.55,1.7,windows);for(const z of [-1.48,1.48]){cylinder(car,'tire',side*1.04,.47,z,.43,.43,.25,tire,16).rotation.z=Math.PI/2;cylinder(car,'hubcap',side*1.18,.47,z,.2,.2,.04,chrome,12).rotation.z=Math.PI/2;}box(car,'door panel',side*1.04,.86,.12,.1,.59,1.75,bodymat);box(car,'door handle',side*1.105,1.04,-.25,.04,.055,.32,chrome);}
  for(const x of [-.67,.67]){box(car,'headlight',x,.99,-2.27,.48,.28,.08,mat('headlamp',0xe0d4a9,.22,{emissive:0x9b8659,emissiveIntensity:.4}));box(car,'tail light',x,.98,2.26,.42,.3,.08,mat('tail lamp',0x7d2821,.3,{emissive:0x711f16,emissiveIntensity:.4}));}
  box(car,'front bumper',0,.48,-2.32,2.15,.18,.16,chrome);box(car,'rear bumper',0,.48,2.32,2.15,.18,.16,chrome);
  const carTarget=box(lot,'driver interaction',1.45,1,7.85,.9,1.7,1.7,new THREE.MeshBasicMaterial({visible:false}));carTarget.material.colorWrite=false;
  addInteract(carTarget,'SEARCH THE DRIVER\'S SEAT',()=>{
    if(evidence===3){finishGame();return;}
     if(!hasCode){hasCode=true;openNote('A folded maintenance slip','DOOR CODE: 0427\n\nIf the keypad is still alive, this should get you through the west service entrance.\n\nHolloway says we are not supposed to come back after the alarms. I think I am already too late.');setObjective('Find the west service entrance','The keypad is on the factory wall. Code: 0427.');toast('MAINTENANCE SLIP ADDED');}
    else openNote('Maintenance slip','DOOR CODE: 0427\n\nWest service entrance. Keep your head down.');
  });
  addInteract(doorTarget,'USE THE SERVICE KEYPAD',()=>{
    if(!hasCode){toast('THE KEYPAD NEEDS A CODE');return;}
    if(!doorOpened){doorOpened=true;entrance.rotation.y=Math.PI/2;setTimeout(()=>enterLab(),800);toast('ACCESS GRANTED · 04 / 27');}
  });
  lot.userData.lamps=[...lot.children.filter(o=>o.userData.flicker)];
}

function buildLab(){
  lab.add(new THREE.AmbientLight(0x596568,.26));
  const floor=mat('lab floor',0x343a39), wall=mat('lab wall',0x4b514e), tile=mat('tile',0x565b57), steel=mat('lab steel',0x39413f,.5,{metalness:.35}), pipe=mat('pipe',0x323836,.4,{metalness:.55}), red=mat('red light',0xb83f30,.3,{emissive:0x7e140c,emissiveIntensity:2}), white=mat('fluorescent',0xb6c4b8,.3,{emissive:0x829c8c,emissiveIntensity:1.6});
  box(lab,'sublevel floor',0,-.16,-11,28,.32,52,floor);box(lab,'sublevel ceiling',0,5.2,-11,28,.3,52,mat('lab ceiling',0x272e2e));
  box(lab,'lab left boundary',-13.8,2.4,-11,.35,4.8,52,wall);box(lab,'lab right boundary',13.8,2.4,-11,.35,4.8,52,wall);
  box(lab,'lab far wall',0,2.4,-37,28,4.8,.35,wall);box(lab,'lab entry wall left',-9.5,2.4,14,9,4.8,.35,wall);box(lab,'lab entry wall right',9.5,2.4,14,9,4.8,.35,wall);
  // Main spine with broken viewing windows into old test rooms.
  for(const x of [-6.4,6.4]){
    for(const [z,len] of [[-.4,26.8],[-22,11.6],[-32.6,4.8]])box(lab,'corridor divider',x,2.2,z,.22,4.4,len,wall);
    for(const z of [6,-4,-15,-26]){box(lab,'observation glass',x+Math.sign(x)*.13,2.2,z,.05,1.5,3.3,mat('lab glass'+x+z,0x152322,.2,{emissive:0x101b19,emissiveIntensity:.3}),{cast:false});box(lab,'observation frame',x+Math.sign(x)*.19,2.2,z, .1,1.75,3.55,steel);}
  }
  // Cross partitions create a recognizable maze, each with a wide pass-through.
  for(const z of [1,-10,-21]){box(lab,'cross wall left',-10,2.15,z,7.5,4.3,.24,wall);box(lab,'cross wall right',10,2.15,z,7.5,4.3,.24,wall);box(lab,'partition lintel',0,4.25,z,12.5,.35,.3,wall);}
  // Checkered old tile strips and grated drains
  for(let z=11;z>-35;z-=2){box(lab,'floor tile line',0,.012,z,12.7,.015,.035,mat('tile line'+z,z%4?0x414644:0x4a504e),{cast:false});}
  for(const x of [-10,10]){box(lab,'steam pipe',x,4.55,-11,.17,.17,49,pipe);box(lab,'lower pipe',x,3.9,-11,.08,.08,49,steel);}
  // Ceiling lamps: some steady, several dead, several blood-red.
  const lampPositions=[[-3,9,0x9fb8a7], [3,0,0xa8baa9],[-3,-12,0xff6250],[3,-24,0x9eb7a7],[0,-33,0xff5849]];
  for(const [x,z,c] of lampPositions){box(lab,'fluorescent housing',x,4.92,z,2.8,.13,.72,steel);const tube=box(lab,'fluorescent tube',x,4.83,z,2.35,.055,.34,mat('tube'+z,c,.3,{emissive:c,emissiveIntensity:z===-12||z===-33?2.5:1.2}),{cast:false});const l=light(lab,c,z===-12||z===-33?3.5:5.5,x,4.6,z,11);l.userData.flicker=(z===-12||z===-33);}
  // Blood smears and warning markings at the deeper level.
  for(let i=0;i<7;i++){const smear=box(lab,'old stain',-5.8+i*1.7,.025,-27-(i%3)*.7,.65,.012,.22,mat('stain'+i,i%2?0x322c27:0x492b25),{cast:false});smear.rotation.y=.3*(i%3-1);}
  box(lab,'restricted sign',-6.1,3.6,-5, .08,1.5,2.4,mat('sign frame',0x202624));box(lab,'restricted placard',-6.04,3.6,-5,.04,1.15,2.05,mat('sign',0x8c4937));
  // Research stations / shelves create cover and clear silhouettes for the encounter.
  for(const [x,z] of [[-9,6],[9,-4],[-9,-16],[9,-25]]){
    box(lab,'lab bench',x,1.15,z,4.6,.18,1.3,steel);for(const dx of [-1.9,1.9])box(lab,'bench leg',x+dx,.55,z,.12,1.1,.12,pipe);
    for(let i=0;i<3;i++){cylinder(lab,'specimen jar',x-1.3+i*1.2,1.65,z,.24,.24,.75,mat('jar'+i,0x7a968c,.19,{transparent:true,opacity:.6,emissive:i===1?0x173b32:0x091c19,emissiveIntensity:.6}),12);cylinder(lab,'jar lid',x-1.3+i*1.2,2.05,z,.26,.26,.08,steel,12);}
  }
  // Evidence: a cassette recorder, a test ledger, and the final incident reel.
  const evidenceDefs=[
    {pos:[4,1.45,4],label:'TAKE THE CASE TAPE',title:'CASE TAPE / SUBJECT 06',body:'RECOVERED AUDIO — 01:42 AM\n\n“...it knows when we’re looking at it. Shut the glass. Shut it now—”\n\n[ IMPACT ]\n\n“Don’t let it hear the broadcast.”'},
    {pos:[-9,1.55,-15],label:'READ THE TEST LEDGER',title:'TRIAL 06 / NIGHT LOG',body:'SUBJECT RESPONSE EXCEEDS ALL BASELINES.\n\nThe vocal pattern is an exact match for a person who has not yet entered the room. Dr. Vale wants another overnight run.\n\nThe west gate is the only route out. Do not use the intercom.'},
    {pos:[9,1.5,-29],label:'TAKE THE FINAL REEL',title:'INCIDENT RECORDING / 02:13',body:'We built a receiver. It was never a receiver.\n\nThe signal comes from under the building. Every time we answer, it gets closer.\n\nIf you are hearing this, leave the tape running. Do not turn around.'}
  ];
  evidenceDefs.forEach((d,i)=>{
    const [x,y,z]=d.pos;box(lab,'evidence table',x,y-.55,z,2.8,.12,1.6,steel);
    const tape=box(lab,'evidence object',x,y,z,.72,.24,.52,i===1?mat('ledger',0x887450):mat('tape'+i,0x342f28));
    box(lab,'reel label',x,y+.125,z,.34,.015,.2,mat('label'+i,0xd1c4a0));
    if(i!==1){const reelMetal=mat('reel metal',0x727674,.28,{metalness:.8});cylinder(lab,'tape reel',x-.19,y+.14,z,.11,.11,.025,reelMetal,12);cylinder(lab,'tape reel',x+.19,y+.14,z,.11,.11,.025,reelMetal,12);}
    const target=box(lab,'evidence target',x,y+.45,z,.95,1.2,1.1,new THREE.MeshBasicMaterial({visible:false}));target.material.colorWrite=false;
    addInteract(target,d.label,()=>{if(!target.userData.taken){target.userData.taken=true;tape.material=mat('taken',0x1b201e);evidence++;openNote(d.title,d.body);toast(`EVIDENCE ${String(evidence).padStart(2,'0')} / 03 RECOVERED`);if(evidence<3)setObjective('Recover the remaining evidence',`${evidence} of 3 recordings secured. Return to the entrance when you have all three.`);else {setObjective('Get out. Do not look back.','Return to the west entrance at the far end of the hall.');entityAlert=true;}}});
  });
  // Stalker silhouette starts buried in the deep testing room.
  const stalker=new THREE.Group();stalker.name='the signal';lab.add(stalker);
  const shadowMat=mat('entity',0x090d0d,.82,{emissive:0x070b0b,emissiveIntensity:.4});
  cylinder(stalker,'entity legs',0,.7,0,.2,.18,1.3,shadowMat,8);sphere(stalker,'entity torso',0,1.65,0,.62,shadowMat,.72,1.1,.48);sphere(stalker,'entity head',0,2.62,0,.34,shadowMat,.8,1.15,.75);
  for(const x of [-.19,.19])sphere(stalker,'entity eyes',x,2.66,-.28,.045,mat('entity eyes',0xc34a32,.2,{emissive:0xb82417,emissiveIntensity:2}),1,1,1);
  stalker.position.set(-1,0,-31);stalker.visible=false;lab.userData.stalker=stalker;
  lab.userData.lamps=[...lab.children.filter(o=>o.userData.flicker)];
  lab.userData.evidenceTargets=interactables.slice(-3);
}
buildLot();buildLab();

function setObjective(title,detail){ui.objective.textContent=title;ui.sub.textContent=detail;}
function toast(message){ui.toast.textContent=message;ui.toast.classList.add('show');toastTimer=2.6;}
function openNote(title,body){ui.noteTitle.textContent=title;ui.noteBody.textContent=body;ui.note.classList.remove('hidden');if(document.pointerLockElement)document.exitPointerLock();}
function closeNote(){ui.note.classList.add('hidden');if(started&&!gameEnded)canvas.requestPointerLock?.();}
function changeArea(area){
  activeArea=area;room.visible=area==='room';lot.visible=area==='lot';lab.visible=area==='lab';ui.prompt.innerHTML='';
  if(area==='room'){player.position.set(2.15,0,1.8);yaw=0;setObjective('Find a way out','The car is waiting in the lot. Search it before approaching the factory.');scene.background.set(0x171816);scene.fog.density=.023;}
  if(area==='lot'){player.position.set(0,0,13);yaw=0;setObjective('Search the car for a way inside','The factory side entrance is on the west wall.');scene.background.set(0x111615);scene.fog.density=.018;}
  if(area==='lab'){player.position.set(0,0,11.5);yaw=0;setObjective('Recover the lab recordings','Three recordings are scattered through the sublevel.');scene.background.set(0x0d1111);scene.fog.density=.027;}
  camera.rotation.set(pitch,yaw,0,'YXZ');
}
function enterLab(){changeArea('lab');toast('SUBLEVEL ACCESS · SIGNAL LOST');const stalker=lab.userData.stalker;if(stalker)stalker.visible=false;}
function finishGame(){gameEnded=true;ui.end.classList.remove('hidden');ui.prompt.innerHTML='';if(document.pointerLockElement)document.exitPointerLock();}
function closeOverlays(){if(!ui.note.classList.contains('hidden')){closeNote();return true;}return false;}
function tryInteract(){
  if(closeOverlays())return;
  raycaster.setFromCamera(center,camera);const hits=raycaster.intersectObjects(interactables.filter(o=>o.userData.area===activeArea),false);
  if(hits.length&&hits[0].distance<=raycaster.far){hits[0].object.userData.action?.();}
}
function onKeyDown(e){const k=e.key.toLowerCase();if([' ','arrowup','arrowdown','arrowleft','arrowright'].includes(k))e.preventDefault();keys.add(k);if(k==='e'&&!e.repeat)tryInteract();if(k==='f'&&!e.repeat){flashlightOn=!flashlightOn;flashlight.visible=flashlightOn;toast(flashlightOn?'FLASHLIGHT ON':'FLASHLIGHT OFF');}}
function onKeyUp(e){keys.delete(e.key.toLowerCase());}
function collides(x,z){
  const radius=.28, bounds=activeArea==='room'?{minX:-5.55,maxX:5.48,minZ:-5.5,maxZ:5.5}:activeArea==='lot'?{minX:-23,maxX:23,minZ:-48,maxZ:16.5}:{minX:-12.5,maxX:12.5,minZ:-35.5,maxZ:13.4};
  if(x<bounds.minX||x>bounds.maxX||z<bounds.minZ||z>bounds.maxZ)return true;
  if(activeArea==='room'){
    if(Math.abs(x+1.6)<1.9&&z>.78&&z<2.1)return true;
    if(Math.abs(x+1.4)<1.2&&z>2.42&&z<3.72)return true;
    if(x>2.25&&x<5.1&&z>1.75&&z<4.5)return true;
  }
  if(activeArea==='lot'&&Math.abs(x)<1.35&&z>6.05&&z<10.95)return true;
  if(activeArea==='lab'){
    if(Math.abs(Math.abs(x)-6.4)<.48&&z>-35.2&&z<13.2&&!((z>-16.2&&z<-13.8)||(z>-30.2&&z<-27.8)))return true;
    for(const wallZ of [1,-10,-21])if(Math.abs(z-wallZ)<.38&&Math.abs(x)>6.15)return true;
  }
  return false;
}
function move(dt){
  let forward=(keys.has('w')||keys.has('arrowup')?1:0)-(keys.has('s')||keys.has('arrowdown')?1:0),side=(keys.has('d')||keys.has('arrowright')?1:0)-(keys.has('a')||keys.has('arrowleft')?1:0);if(!forward&&!side)return;
  const length=Math.hypot(forward,side);forward/=length;side/=length;const speed=(keys.has('shift')?5.1:2.9)*dt;
  const dx=(-Math.sin(yaw)*forward+Math.cos(yaw)*side)*speed,dz=(-Math.cos(yaw)*forward-Math.sin(yaw)*side)*speed;
  if(!collides(player.position.x+dx,player.position.z))player.position.x+=dx;if(!collides(player.position.x,player.position.z+dz))player.position.z+=dz;
}
function updatePrompt(){
  raycaster.setFromCamera(center,camera);const hits=raycaster.intersectObjects(interactables.filter(o=>o.userData.area===activeArea),false);const hit=hits.find(h=>h.distance<=raycaster.far);
  if(hit){ui.prompt.innerHTML=`<b>E</b> ${hit.object.userData.label}`;}else if(activeArea==='lab'&&evidence===3&&player.position.z>11.8){ui.prompt.innerHTML='<b>↑</b> RETURN TO THE PARKING LOT';}else ui.prompt.innerHTML='';
}
function update(dt){
  elapsed+=dt;move(dt);camera.rotation.set(pitch,yaw,0,'YXZ');
  if(activeArea==='lab'&&player.position.z>12.15){if(evidence===3){changeArea('lot');player.position.set(-10,0,-21.3);yaw=Math.PI;toast('BACK OUTSIDE · GET TO THE CAR');}else player.position.z=12.15;}
  if(activeArea==='lot'&&doorOpened&&player.position.z<-48)player.position.z=-48;
  if(activeArea==='lab'&&entityAlert){const stalker=lab.userData.stalker;if(stalker){stalker.visible=true;const target=new THREE.Vector3(player.position.x,0,player.position.z);const direction=target.sub(stalker.position);if(direction.length()>2.2){direction.normalize();stalker.position.addScaledVector(direction,dt*.48);stalker.lookAt(player.position.x,1.2,player.position.z);}else if(!stalker.userData.scared){stalker.userData.scared=true;flash.classList.remove('bang');void flash.offsetWidth;flash.classList.add('bang');toast('IT HEARD THE RECORDING');stalker.position.set(-1,0,-31);}}}
  for(const area of [lot,lab])for(const l of area.userData.lamps||[]){if(Math.random()<dt*(l.userData.flicker?2.8:.35))l.intensity*=.12;else l.intensity=Math.min(l.userData.flicker?5.5:8,l.intensity+dt*10);}
  if(toastTimer>0){toastTimer-=dt;if(toastTimer<=0)ui.toast.classList.remove('show');}
  const seconds=Math.floor(elapsed),clock=$('#clock');if(clock)clock.textContent=`02:${String(13+Math.floor(seconds/60)).padStart(2,'0')}:${String(seconds%60).padStart(2,'0')}`;
  updatePrompt();
}
function animate(){requestAnimationFrame(animate);const dt=Math.min(clock.getDelta(),.05);if(started&&!gameEnded)update(dt);renderer.render(scene,camera);}
$('#start-button').addEventListener('click',()=>{if(started)return;started=true;ui.menu.classList.remove('visible');ui.hud.classList.remove('hidden');ui.look.classList.remove('hidden');changeArea('room');canvas.requestPointerLock?.();});
$('#close-note').addEventListener('click',closeNote);ui.note.addEventListener('click',e=>{if(e.target===ui.note)closeNote();});$('#restart-button').addEventListener('click',()=>location.reload());
canvas.addEventListener('click',()=>{if(started&&!gameEnded&&ui.note.classList.contains('hidden')&&!document.pointerLockElement)canvas.requestPointerLock?.();});
document.addEventListener('pointerlockchange',()=>{pointerLocked=document.pointerLockElement===canvas;ui.look.classList.toggle('hidden',!started||pointerLocked||gameEnded||!ui.note.classList.contains('hidden'));});
document.addEventListener('mousemove',e=>{if(pointerLocked&&started&&!gameEnded&&ui.note.classList.contains('hidden')){yaw-=e.movementX*.0022;pitch=Math.max(-1.35,Math.min(1.35,pitch-e.movementY*.0022));}});
document.addEventListener('keydown',onKeyDown);document.addEventListener('keyup',onKeyUp);
window.addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);renderer.setPixelRatio(Math.min(devicePixelRatio,1.7));});
window.__gameTest={state:()=>({area:activeArea,position:player.position.toArray(),yaw,prompt:ui.prompt.textContent,objective:ui.objective.textContent,evidence,hasCode,doorOpened,gameEnded}),teleport:(x,y,z,angle=0)=>{player.position.set(x,y,z);yaw=angle;camera.rotation.set(pitch,yaw,0,'YXZ');player.updateMatrixWorld(true);},interact:()=>{player.updateMatrixWorld(true);tryInteract();},targets:()=>interactables.map(o=>({name:o.name,area:o.userData.area,label:o.userData.label,position:o.position.toArray()})),aim:()=>{player.updateMatrixWorld(true);raycaster.setFromCamera(center,camera);return raycaster.intersectObjects(interactables.filter(o=>o.userData.area===activeArea),false).map(h=>({name:h.object.name,distance:h.distance,area:h.object.userData.area,label:h.object.userData.label}));}};
changeArea('room');animate();
