
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

/* ================= DATA ================= */
const SITES=[
 {id:'WH-01',name:'Riverside Hub',docks:4,stock:1412,cap:1800,ontime:96.6,dOn:'+0.4%',dStock:'+15',seed:11},
 {id:'WH-02',name:'Northgate DC',docks:6,stock:980,cap:1500,ontime:94.1,dOn:'−0.8%',dStock:'+42',seed:23},
 {id:'WH-03',name:'Eastport',docks:5,stock:760,cap:1400,ontime:97.8,dOn:'+1.1%',dStock:'−12',seed:37},
 {id:'WH-04',name:'Southfield Cross-Dock',docks:6,stock:610,cap:1600,ontime:96.2,dOn:'+0.4%',dStock:'+20',seed:41},
 {id:'WH-05',name:'Westgate Robotics',docks:5,stock:1230,cap:1700,ontime:95.4,dOn:'+0.2%',dStock:'+8',seed:53},
 {id:'AIR-01',name:'Lakeside Air Cargo',kind:'air',mode:'load',code:'LKS',docks:3,stock:0,cap:1,ontime:97.2,seed:61},
 {id:'ROUTE',name:'Parcel journey',kind:'journey',docks:0,stock:0,cap:1,ontime:96,seed:99},
 {id:'AIR-02',name:'Harbor Air Cargo',kind:'air',mode:'unload',code:'HBR',docks:3,stock:0,cap:1,ontime:95.8,seed:73},
];
const OPERATORS=['Noah Patel','Ava Kim','Liam Ortiz','Mia Novak','Ethan Brooks','Zoe Martin','Leo Garcia'];
const CITIES=['Newark, NJ','Philadelphia, PA','Baltimore, MD','Hartford, CT','Albany, NY','Trenton, NJ','Allentown, PA'];
const SKUS=[['Cardboard Box',1906],['Plastic Container',297],['Safety Helmet',21],['Packing Tape',4448],['Shrink Wrap',640],['Label Rolls',1220],['Pallet Wrap',310],['Foam Inserts',85]];
function rngOf(seed){let a=seed>>>0;return()=>{a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
const pad=n=>String(n).padStart(2,'0');
function hhmm(minOffset){const d=new Date(Date.now()+minOffset*60000);return pad(d.getHours())+':'+pad(d.getMinutes())}

let state=null; // current site state
function genSite(site){
  const r=rngOf(site.seed);const n=site.docks;
  const docks=[...Array(n)].map((_,i)=>({id:'D'+(i+1),i,truck:null}));
  // pick docked
  const occ=[];const want=n>=6?3:2;
  while(occ.length<want){const k=Math.floor(r()*n);if(!occ.includes(k))occ.push(k)}
  occ.sort((a,b)=>a-b);
  const trucks=[];let tn=2200+Math.floor(r()*90);
  occ.forEach((di,k)=>{const unloading=k%2===0;const done=1+Math.floor(r()*4);
    const t={id:'TRK-'+(tn+=7+Math.floor(r()*40)),type:'truck',state:'docked',dock:di,op:unloading?'Unloading':'Loading',units:done,total:6,driver:OPERATORS[(k+3)%7],carrier:['Bluepeak','Northline','Harbor Freight','Atlas Haul'][k%4]};
    t.ship={id:'#SHP-'+(78400+Math.floor(r()*500)),to:unloading?site.id+' '+site.name:CITIES[Math.floor(r()*CITIES.length)],step:unloading?4:2};
    trucks.push(t);docks[di].truck=t.id});
  const waiting={id:'TRK-'+(tn+=31),type:'truck',state:'waiting',dock:null,op:'At gate',units:0,total:6,waitMin:17,driver:'Owen Reyes',carrier:'Northline'};
  waiting.ship={id:'#SHP-'+(78900+Math.floor(r()*90)),to:site.id+' '+site.name,step:3};
  trucks.push(waiting);
  const road={id:'TRK-'+(tn+=19),type:'truck',state:'enroute',dock:null,op:'En route',units:0,total:6,eta:6+Math.floor(r()*9),driver:'Ivy Chen',carrier:'Atlas Haul'};
  road.ship={id:'#SHP-'+(79000+Math.floor(r()*90)),to:site.id+' '+site.name,step:3};
  trucks.push(road);
  // forklifts
  const fls=[];let fn=10;
  trucks.filter(t=>t.state==='docked').forEach((t,k)=>{fls.push({id:'FL-'+(fn++),type:'forklift',op:t.op,truck:t.id,dock:t.dock,battery:k===1?18:62+Math.floor(r()*30),speed:(7+r()*2).toFixed(1),moves:20+Math.floor(r()*30),operator:OPERATORS[k],model:'Toyota 8FBE18',charger:'C'+(1+k%3)})});
  fls.push({id:'FL-'+(fn++),type:'forklift',op:'Moving',battery:71,speed:'6.4',moves:14,operator:OPERATORS[4],model:'Linde E20',charger:'C2'});
  fls.push({id:'FL-'+(fn++),type:'forklift',op:'Charging',battery:86,speed:'0',moves:9,operator:'—',model:'Toyota 8FBE18',charger:'C1',slot:0});
  fls.push({id:'FL-'+(fn++),type:'forklift',op:'Charging',battery:93,speed:'0',moves:11,operator:'—',model:'Linde E20',charger:'C3',slot:2});
  const chargers=[0,1,2].map(i=>({id:'C'+(i+1),type:'charger',slot:i,fl:fls.find(f=>f.op==='Charging'&&f.slot===i)?.id||null,power:'48 V · 150 A'}));
  // pallets
  const pallets=[];const cnt=8;
  for(let i=0;i<cnt;i++){const s=SKUS[(i+site.seed)%SKUS.length];const low=s[0]==='Safety Helmet'||s[0]==='Foam Inserts';
    pallets.push({id:'PLT-'+(400+i*7+site.seed),type:'pallet',sku:s[0],qty:s[1],low,layers:low?1:2+Math.floor(r()*2),loc:'Staging '+String.fromCharCode(65+Math.floor(i/4))+(i%4+1),reorder:false})}
  if(site.id==='WH-04'){const lt=trucks.find(t=>t.op==='Loading');if(lt){lt.id='TRK-2311';lt.ship={id:'#SHP-78570',to:'AIR-01 Lakeside Air Cargo · YT 482',step:2};docks[lt.dock].truck=lt.id;fls.forEach(f=>{if(f.dock===lt.dock)f.truck=lt.id})}}
  const st={site,docks,trucks,fls,chargers,pallets};st.db=buildDB(st);return st;
}

/* ================= THREE SETUP ================= */
const host=document.getElementById('scene');
const renderer=new THREE.WebGLRenderer({antialias:true});
renderer.setPixelRatio(Math.min(devicePixelRatio,2));
renderer.setSize(innerWidth,innerHeight);
renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.08;
renderer.outputColorSpace=THREE.SRGBColorSpace;
host.appendChild(renderer.domElement);
const scene=new THREE.Scene();scene.background=new THREE.Color('#e7edf6');
const VIEW=62;
const camera=new THREE.OrthographicCamera(-1,1,1,-1,-500,1000);
const CAMDIR=new THREE.Vector3(1,0.92,1).normalize();
const controls=new OrbitControls(camera,renderer.domElement);
controls.enableDamping=true;controls.dampingFactor=.09;
controls.mouseButtons={LEFT:THREE.MOUSE.PAN,MIDDLE:THREE.MOUSE.DOLLY,RIGHT:THREE.MOUSE.ROTATE};
controls.touches={ONE:THREE.TOUCH.PAN,TWO:THREE.TOUCH.DOLLY_ROTATE};
controls.screenSpacePanning=false;controls.minZoom=.28;controls.maxZoom=4;
controls.minPolarAngle=.55;controls.maxPolarAngle=1.12;
function resize(){const a=innerWidth/innerHeight;camera.left=-VIEW*a/2;camera.right=VIEW*a/2;camera.top=VIEW/2;camera.bottom=-VIEW/2;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight)}
addEventListener('resize',resize);resize();
const HOME_T=new THREE.Vector3(9,0,10);
function setHome(){controls.target.copy(HOME_T);camera.position.copy(HOME_T).addScaledVector(CAMDIR,120);camera.zoom=.98;camera.updateProjectionMatrix();controls.update()}
setHome();
const homeT=()=>state&&state.kind==='journey'?controls.target.clone():state&&state.kind==='air'?new THREE.Vector3(30,0,-6):HOME_T.clone();const homeZ=()=>state&&state.kind==='air'?.58:.98;

scene.add(new THREE.HemisphereLight('#ffffff','#b8c4dc',1.15));
const sun=new THREE.DirectionalLight('#fff7ec',2.1);sun.position.set(45,70,30);sun.castShadow=true;
sun.shadow.mapSize.set(4096,4096);Object.assign(sun.shadow.camera,{left:-75,right:75,top:75,bottom:-75,near:1,far:220});
sun.shadow.bias=-.0004;sun.shadow.normalBias=.03;sun.shadow.radius=4;scene.add(sun);scene.add(sun.target);
const SUNOFF=new THREE.Vector3(45,70,30);
const fill=new THREE.DirectionalLight('#dbe6ff',.55);fill.position.set(-40,30,-20);scene.add(fill);

const mats={};
function M(c,o={}){const k=c+JSON.stringify(o);return mats[k]||(mats[k]=new THREE.MeshStandardMaterial({color:c,roughness:.72,metalness:.04,...o}))}
function RB(w,h,d,r=.1){r=Math.min(r,w/2-.001,h/2-.001,d/2-.001);return new RoundedBoxGeometry(w,h,d,3,Math.max(r,.001))}
function mesh(g,m,x=0,y=0,z=0,cast=true){const o=new THREE.Mesh(g,m);o.position.set(x,y,z);o.castShadow=cast;o.receiveShadow=true;return o}
function stripeTex(base,line,n=8,vertical=true){const c=document.createElement('canvas');c.width=c.height=128;const g=c.getContext('2d');g.fillStyle=base;g.fillRect(0,0,128,128);g.fillStyle=line;
  for(let i=0;i<n;i++){vertical?g.fillRect(i*128/n,0,128/n*.38,128):g.fillRect(0,i*128/n,128,128/n*.3)}
  const t=new THREE.CanvasTexture(c);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=8;return t}

/* ---------- models (no text, no logos) ---------- */
function makePallet(layers=2,low=false,scale=1){
  const g=new THREE.Group();
  const wood=M('#c99f6e');
  g.add(mesh(RB(1.2,.1,1.2,.02),wood,0,.13,0));
  [-.45,0,.45].forEach(x=>g.add(mesh(new THREE.BoxGeometry(.18,.1,1.2),M('#b98b57'),x,.05,0)));
  const tones=['#dba86a','#cf9a5b','#e2b37a','#d6a163'];
  let k=0;
  for(let l=0;l<layers;l++)for(let i=0;i<2;i++)for(let j=0;j<2;j++){
    if(low&&(i+j)>0&&l===0&&k>1){k++;continue}
    const b=mesh(RB(.56,.5,.56,.04),M(tones[(k++)%4]),-.29+i*.58,.44+l*.52,-.29+j*.58);g.add(b);
    g.add(mesh(new THREE.BoxGeometry(.1,.012,.565),M('#efd2a4'),b.position.x,b.position.y+.255,b.position.z,false));
  }
  g.scale.setScalar(scale);return g;
}
function makeForklift(){
  const g=new THREE.Group();const blue=M('#2b54d8'),yel=M('#f6b72c',{roughness:.55}),dark=M('#1e2433',{roughness:.6}),steel=M('#9aa4b5',{metalness:.5,roughness:.4});
  g.add(mesh(RB(1.5,.55,2.4,.14),blue,0,.48,0));
  g.add(mesh(RB(1.38,.85,1.45,.18),yel,0,1.15,-.3));
  g.add(mesh(RB(1.5,.75,.55,.16),yel,0,.95,-1.12));
  g.add(mesh(RB(.72,.16,.62,.06),dark,0,1.66,-.45));
  g.add(mesh(RB(.72,.62,.14,.06),dark,0,1.96,-.78));
  [[-.62,-.95],[.62,-.95],[-.62,.38],[.62,.38]].forEach(([x,z])=>g.add(mesh(new THREE.CylinderGeometry(.045,.045,1.75,8),dark,x,2.38,z)));
  g.add(mesh(RB(1.42,.08,1.5,.03),dark,0,3.26,-.29));
  [-.45,.45].forEach(x=>g.add(mesh(RB(.13,2.9,.14,.03),steel,x,1.6,.98)));
  g.add(mesh(RB(1.05,.1,.12,.02),steel,0,2.95,.98));
  const lift=new THREE.Group();lift.name='lift';
  lift.add(mesh(RB(1.1,.55,.1,.03),dark,0,.62,1.08));
  [-.3,.3].forEach(x=>lift.add(mesh(new THREE.BoxGeometry(.13,.06,1.15),steel,x,.36,1.66)));
  const load=makePallet(2,false,.92);load.position.set(0,.26,1.7);load.visible=false;load.name='load';lift.add(load);
  g.add(lift);
  const wg=new THREE.CylinderGeometry(.33,.33,.3,18);
  [[-.76,.7],[.76,.7],[-.76,-.75],[.76,-.75]].forEach(([x,z])=>{const w=mesh(wg,dark,x,.33,z);w.rotation.z=Math.PI/2;g.add(w)});
  g.add(mesh(RB(.18,.12,.06,.02),M('#fff3b0',{emissive:'#ffd75a',emissiveIntensity:.6}),.5,1.25,.44,false));
  g.add(mesh(new THREE.SphereGeometry(.1,10,8),M('#ff9f1a',{emissive:'#ff8a00',emissiveIntensity:.9}),0,3.35,-.8,false));
  return g;
}
function makeTruck(cab='#2f5be0'){
  const g=new THREE.Group();const white=M('#f6f8fc',{roughness:.5}),cabM=M(cab,{roughness:.45}),dark=M('#1b2232',{roughness:.6}),glass=M('#1c2b47',{roughness:.15,metalness:.35}),grey=M('#a9b3c4',{metalness:.4,roughness:.4});
  g.add(mesh(RB(2.6,3.1,11,.14),white,0,2.75,-1.5));
  g.add(mesh(RB(2.64,.22,10.9,.05),cabM,0,1.32,-1.5));
  g.add(mesh(new THREE.BoxGeometry(2.1,.45,10.6),dark,0,.95,-1.5));
  g.add(mesh(new THREE.BoxGeometry(2.4,2.6,.05),M('#e3e8f1'),0,2.75,-7.02,false));
  const wg=new THREE.CylinderGeometry(.52,.52,.5,20);
  [-5.7,-4.5,4.9,6.5].forEach(z=>[-1.02,1.02].forEach(x=>{const w=mesh(wg,dark,x,.52,z);w.rotation.z=Math.PI/2;g.add(w);const h=mesh(new THREE.CylinderGeometry(.22,.22,.52,12),grey,x,.52,z);h.rotation.z=Math.PI/2;g.add(h)}));
  g.add(mesh(RB(2.5,2.55,3.1,.3),cabM,0,1.95,5.85));
  g.add(mesh(RB(2.3,.75,1.7,.25),cabM,0,3.45,5.35));
  g.add(mesh(new THREE.BoxGeometry(2.15,1.05,.06),glass,0,2.62,7.41,false));
  [-1.26,1.26].forEach(x=>g.add(mesh(new THREE.BoxGeometry(.06,.9,1.3),glass,x,2.6,6.3,false)));
  g.add(mesh(new THREE.BoxGeometry(1.5,.7,.06),dark,0,1.35,7.41,false));
  g.add(mesh(RB(2.65,.38,.34,.08),grey,0,.72,7.42));
  [-.95,.95].forEach(x=>g.add(mesh(new THREE.BoxGeometry(.4,.2,.05),M('#fffbe6',{emissive:'#fff1b0',emissiveIntensity:.7}),x,1.15,7.45,false)));
  [-1.35,1.35].forEach(x=>g.add(mesh(new THREE.BoxGeometry(.08,.45,.25),dark,x,2.8,7.0,false)));
  return g;
}
function makeCharger(){const g=new THREE.Group();
  g.add(mesh(RB(.95,1.75,.62,.14),M('#f4f6fb',{roughness:.4}),0,.88,0));
  g.add(mesh(RB(.95,.12,.66,.04),M('#2b54d8'),0,1.8,0));
  g.add(mesh(new THREE.BoxGeometry(.5,.36,.02),M('#0f2a1a',{emissive:'#22c55e',emissiveIntensity:.9}),0,1.3,.32,false));
  g.add(mesh(new THREE.BoxGeometry(.12,.12,.02),M('#22c55e',{emissive:'#22c55e',emissiveIntensity:1}),0,.85,.32,false));
  const cable=mesh(new THREE.TorusGeometry(.32,.04,8,20,Math.PI*1.2),M('#1e2433'),.5,.65,.2,false);cable.rotation.y=Math.PI/2;g.add(cable);
  return g}
function makeTree(s=1,r){const g=new THREE.Group();g.add(mesh(new THREE.CylinderGeometry(.16,.22,1.3,8),M('#8a6a4b'),0,.65,0));
  const green=['#5cc97d','#4fbf73','#69d189'][Math.floor(r()*3)];
  g.add(mesh(new THREE.SphereGeometry(1.25,18,14),M(green,{roughness:.85}),0,2.2,0));
  g.add(mesh(new THREE.SphereGeometry(.85,16,12),M(green,{roughness:.85}),.45,2.9,.2));g.scale.setScalar(s);return g}
function makeBooth(){const g=new THREE.Group();g.add(mesh(RB(1.8,2.4,1.8,.14),M('#f4f6fb'),0,1.2,0));
  g.add(mesh(RB(2.2,.25,2.2,.06),M('#2b54d8'),0,2.5,0));
  g.add(mesh(new THREE.BoxGeometry(1.4,.8,.04),M('#1c2b47',{roughness:.15,metalness:.3}),0,1.6,.91,false));
  g.add(mesh(RB(.4,1.1,.4,.06),M('#e5e9f2'),-1.5,.55,0));
  const arm=new THREE.Group();arm.name='arm';arm.position.set(-1.5,1.0,0);
  for(let i=0;i<7;i++)arm.add(mesh(new THREE.BoxGeometry(.9,.14,.12),M(i%2?'#f8fafc':'#ef4444'),-.45-i*.9,0,0));
  g.add(arm);return g}

/* ---------- selection marker ---------- */
function outlineShape(w,d,r=.5,t=.18){const s=new THREE.Shape();const rr=(sh,W,D,R)=>{sh.moveTo(-W/2+R,-D/2);sh.lineTo(W/2-R,-D/2);sh.quadraticCurveTo(W/2,-D/2,W/2,-D/2+R);sh.lineTo(W/2,D/2-R);sh.quadraticCurveTo(W/2,D/2,W/2-R,D/2);sh.lineTo(-W/2+R,D/2);sh.quadraticCurveTo(-W/2,D/2,-W/2,D/2-R);sh.lineTo(-W/2,-D/2+R);sh.quadraticCurveTo(-W/2,-D/2,-W/2+R,-D/2)};
  rr(s,w,d,r);const h=new THREE.Path();rr(h,w-t*2,d-t*2,Math.max(r-t,.05));s.holes.push(h);return new THREE.ShapeGeometry(s)}
function makeMarker(w,d,color='#2563eb'){const g=new THREE.Group();
  const o=new THREE.Mesh(outlineShape(w,d),new THREE.MeshBasicMaterial({color,transparent:true,opacity:.95,depthWrite:false}));o.rotation.x=-Math.PI/2;o.position.y=.06;g.add(o);
  const f=new THREE.Mesh(new THREE.PlaneGeometry(w,d),new THREE.MeshBasicMaterial({color,transparent:true,opacity:.12,depthWrite:false}));f.rotation.x=-Math.PI/2;f.position.y=.05;g.add(f);
  g.userData.fill=f;return g}

/* ================= BUILD SITE ================= */
let root=null;const ents={};let clickable=[];let movers=[];let dockChips=[];let booth=null;let W=0;
const FOOT={aircraft:[48,56,0,-2],uld:[3.2,3.9,0,0],tug:[2.6,3.8,0,0],loader:[4.4,9.2,0,0],forklift:[2.4,4,0,.45],truck:[3.6,15.6,0,0],pallet:[1.8,1.8,0,0],charger:[1.7,1.5,0,0],tdock:[5.6,13.5,0,2.2],terminal:[50,22,0,0]};
const dockX=i=>state.kind==='air'?-37.5+i*7.2:-(state.site.docks-1)*3.6+i*7.2;
function chargerPos(i){return new THREE.Vector3(-W/2-12.5,0,4+i*3.4)}
function chargeSpot(i){return new THREE.Vector3(-W/2-9.2,0,4+i*3.4)}
function stagePos(i){return new THREE.Vector3(-W/2-13.5+(i%4)*3.1,0,14.8+Math.floor(i/4)*2.8)}
const AISLE=21.2;

function build(){
  if(state.kind==='air')return buildAir();
  if(state.kind==='journey')return buildJourney();
  if(root){scene.remove(root);root.traverse(o=>{if(o.geometry)o.geometry.dispose()})}
  Object.keys(ents).forEach(k=>delete ents[k]);clickable=[];movers=[];
  root=new THREE.Group();scene.add(root);
  const s=state.site;const r=rngOf(s.seed*7);
  W=s.docks*7.2+10;const D=22,H=9;
  // ground
  root.add(mesh(new THREE.PlaneGeometry(900,900),M('#e3e9f3',{roughness:.95}),0,0,0,false).rotateX(-Math.PI/2));
  const grass=M('#d3eedc',{roughness:1});
  [[-W/2-30,-14,26,30],[W/2+30,-16,30,26],[-W/2-28,46,30,18],[W/2+36,48,40,18]].forEach(([x,z,w,d])=>{const p=mesh(new THREE.PlaneGeometry(w,d),grass,x,.01,z,false);p.rotation.x=-Math.PI/2;root.add(p)});
  const pad=mesh(RB(W+46,.12,26,.4),M('#f1f4f9',{roughness:.9}),0,.03,12,false);root.add(pad);
  const sw=mesh(new THREE.BoxGeometry(760,.18,2),M('#f7f9fc'),0,.09,26,false);root.add(sw);
  const road=mesh(new THREE.PlaneGeometry(760,10),M('#cdd6e4',{roughness:.95}),0,.02,32,false);road.rotation.x=-Math.PI/2;root.add(road);
  const lineM=M('#ffffff',{roughness:.6});
  for(let x=-380;x<380;x+=5){const l=mesh(new THREE.BoxGeometry(2.4,.02,.22),lineM,x,.05,32,false);root.add(l)}
  root.add(mesh(new THREE.BoxGeometry(760,.18,2),M('#f7f9fc'),0,.09,38,false));
  // yard markings
  const yel=M('#f2c94c',{roughness:.6});
  for(let i=0;i<=s.docks;i++){const x=dockX(0)-3.6+i*7.2;root.add(mesh(new THREE.BoxGeometry(.16,.02,16),yel,x,.1,8.6,false))}
  root.add(mesh(new THREE.BoxGeometry(W+24,.02,.16),yel,0,.1,20.6,false));
  for(let x=-W/2-10;x<W/2+12;x+=3)root.add(mesh(new THREE.BoxGeometry(1.4,.02,.14),M('#ffffff'),x+.7,.1,22.4,false));
  // staging zone outline
  const sx=-W/2-15.1,sz=13.6;[[sx+6.2,sz,12.4,.14],[sx+6.2,sz+5.4,12.4,.14],[sx,sz+2.7,.14,5.4],[sx+12.4,sz+2.7,.14,5.4]].forEach(([x,z,w,d])=>root.add(mesh(new THREE.BoxGeometry(w,.02,d),yel,x,.1,z,false)));
  // crossing stripes
  for(let i=0;i<6;i++)root.add(mesh(new THREE.BoxGeometry(.5,.02,2.6),M('#ffffff'),W/2+6+i*1.0,.1,24.6,false));
  // warehouse
  const wh=new THREE.Group();wh.userData.entityId=s.id;
  const wallTex=stripeTex('#eef1f7','#dfe4ee',10,true);const wt1=wallTex.clone();wt1.repeat.set(W/1.6,1);wt1.needsUpdate=true;const wt2=wallTex.clone();wt2.repeat.set(D/1.6,1);wt2.needsUpdate=true;
  const wF=new THREE.MeshStandardMaterial({map:wt1,roughness:.65}),wS=new THREE.MeshStandardMaterial({map:wt2,roughness:.65}),top=M('#d7deea');
  const body=mesh(new THREE.BoxGeometry(W,H,D),[wS,wS,top,top,wF,wF],0,H/2,-D/2);wh.add(body);
  const blue=M('#2f58db',{roughness:.5});
  wh.add(mesh(RB(W+.3,1.1,D+.3,.05),blue,0,.55,-D/2));
  [[-W/2,0],[W/2,0],[-W/2,-D],[W/2,-D]].forEach(([x,z])=>wh.add(mesh(RB(.7,H+.2,.7,.1),blue,x,H/2,z)));
  wh.add(mesh(new THREE.BoxGeometry(W-3,.85,.12),M('#9cc3ff',{emissive:'#6aa5ff',emissiveIntensity:.25,roughness:.2,metalness:.2}),0,7.4,.02,false));
  const nSeg=Math.max(3,Math.round(W/8.5)),segW=W/nSeg;const roofTex=stripeTex('#3a63e3','#3157d4',12,true);roofTex.repeat.set(1,D/2);
  for(let i=0;i<nSeg;i++){const sh=new THREE.Shape();sh.moveTo(0,0);sh.lineTo(segW,0);sh.lineTo(segW*.78,3.4);sh.lineTo(0,0);
    const geo=new THREE.ExtrudeGeometry(sh,{depth:D+.6,bevelEnabled:false});const m=mesh(geo,new THREE.MeshStandardMaterial({color:'#3a63e3',roughness:.45}),-W/2+i*segW,H,-D-.3);wh.add(m);
    wh.add(mesh(new THREE.BoxGeometry(.18,3.0,D+.62),M('#c8d8ff',{emissive:'#9ec0ff',emissiveIntensity:.15,roughness:.2}),-W/2+(i+.78)*segW+.05,H+1.65,-D/2,false))}
  // docks
  dockChips=[];
  state.docks.forEach((dk,i)=>{const x=dockX(i);const occ=!!dk.truck;
    wh.add(mesh(RB(4.7,5.3,.5,.08),blue,x,2.65,.18));
    wh.add(mesh(new THREE.BoxGeometry(3.8,4.4,.1),M('#1b2540'),x,2.4,.3,false));
    const glow=mesh(new THREE.PlaneGeometry(3.4,3.9),M('#ffe6bd',{emissive:'#ffd59a',emissiveIntensity:.35}),x,2.3,.36,false);wh.add(glow);
    const rec=mesh(new THREE.BoxGeometry(3.8,4.4,.16),new THREE.MeshStandardMaterial({map:stripeTex('#e6ebf3','#cfd7e4',14,false),roughness:.6}),x,2.4,.46,false);
    wh.add(rec);dk.door=rec;dk.glow=glow;dk.openK=occ?1:0;setDoor(dk);
    if(occ){const p=makePallet(2,false,.95);p.position.set(x-.8,0,.9);wh.add(p);const p2=makePallet(1,false,.95);p2.position.set(x+.75,0,.9);wh.add(p2)}
    [-1.75,1.75].forEach(dx=>wh.add(mesh(RB(.35,.55,.3,.06),M('#1e2433'),x+dx,1.0,.55)));
    const lamp=mesh(RB(.5,.22,.14,.05),M(occ?'#f59e0b':'#22c55e',{emissive:occ?'#f59e0b':'#22c55e',emissiveIntensity:1}),x+1.8,5.0,.48,false);wh.add(lamp);dk.lamp=lamp;
    dockChips.push({el:null,pos:new THREE.Vector3(x,5.55,.6),text:dk.id});
  });
  root.add(wh);ents[s.id]={id:s.id,type:'warehouse',obj:wh,data:s,h:H+5};clickable.push(wh);
  // fence + trees
  const post=M('#c8d0dd');for(let x=-W/2-20;x<=W/2+20;x+=3){root.add(mesh(new THREE.BoxGeometry(.12,1.6,.12),post,x,.8,-30))}
  root.add(mesh(new THREE.BoxGeometry(W+40,.08,.06),post,0,1.5,-30,false));root.add(mesh(new THREE.BoxGeometry(W+40,.08,.06),post,0,.8,-30,false));
  for(let i=0;i<16;i++){const t=makeTree(.8+r()*.5,r);const side=i%3;
    if(side===0)t.position.set(-W/2-20+r()*14,0,-26+r()*24);else if(side===1)t.position.set(W/2+12+r()*22,0,-24+r()*22);else t.position.set(-W/2-24+(r()*(W+56)),0,42+r()*8);
    t.rotation.y=r()*6;root.add(t)}
  // background buildings
  [[W/2+44,-10,16,7,14],[-W/2-46,-4,14,6,12],[W/2+40,54,18,6,12]].forEach(([x,z,w,h,d])=>{root.add(mesh(RB(w,h,d,.2),M('#dfe6f1'),x,h/2,z));root.add(mesh(RB(w+.4,.5,d+.4,.1),M('#9fb6ea'),x,h+.25,z))});
  // charger zone
  const cz=mesh(new THREE.PlaneGeometry(9,11),M('#c9f0d6',{roughness:.9}),-W/2-10.5,.11,7.4,false);cz.rotation.x=-Math.PI/2;root.add(cz);
  state.chargers.forEach((c,i)=>{const g=makeCharger();g.position.copy(chargerPos(i));g.rotation.y=Math.PI/2;g.userData.entityId=c.id;root.add(g);ents[c.id]={id:c.id,type:'charger',obj:g,data:c,h:2.6};clickable.push(g)});
  // booth/gate
  booth=makeBooth();booth.position.set(W/2+13.5,0,23.2);root.add(booth);
  // pallets
  state.pallets.forEach((p,i)=>{const g=makePallet(p.layers,p.low,1.15);g.position.copy(stagePos(i));g.rotation.y=(r()-.5)*.15;g.userData.entityId=p.id;root.add(g);ents[p.id]={id:p.id,type:'pallet',obj:g,data:p,h:2.1};clickable.push(g)});
  // trucks
  const cabs=['#2f5be0','#2f5be0','#f4f6fb','#2f5be0','#e5484d'];
  state.trucks.forEach((t,k)=>{const g=makeTruck(cabs[k%cabs.length]);g.userData.entityId=t.id;root.add(g);
    const e={id:t.id,type:'truck',obj:g,data:t,h:4.6,path:null,speed:7};ents[t.id]=e;clickable.push(g);
    if(t.state==='docked'){g.position.set(dockX(t.dock),0,7.5);g.rotation.y=0}
    else if(t.state==='waiting'){g.position.set(W/2+24,0,30);g.rotation.y=-Math.PI/2}
    else {g.position.set(-120,0,34);g.rotation.y=Math.PI/2;e.loopRoad=true;movers.push(e)}
  });
  // forklifts
  state.fls.forEach((f,k)=>{const g=makeForklift();g.userData.entityId=f.id;root.add(g);const e={id:f.id,type:'forklift',obj:g,data:f,h:3.9,speed:3};ents[f.id]=e;clickable.push(g);
    if(f.op==='Charging'){const p=chargeSpot(f.slot);g.position.copy(p);g.rotation.y=-Math.PI/2}
    else{setForkliftLoop(e,k)}});
  buildAirportDistrict(W/2+70);
  buildDepotCampus(-120,-46,3,3,s.seed*5+11,{track:true,prefix:'DP',link:[-W/2-34,27],kinds:['terminal','hub','vans','branch','terminal','terminal','terminal','vans','terminal']});
  buildTown(-330,330,s.seed*7+3,{roadZ:32,rows:5,cars:10});
  makeDockChips();refreshMarkers();
}
function setForkliftLoop(e,k,init=true){const f=e.data;const g=e.obj;
  let pts;
  const V=(x,z,o={})=>Object.assign(new THREE.Vector3(x,0,z),o);
  if(f.dock!=null){const x=dockX(f.dock)+3.05;const st=stagePos(4+(k%4));
    pts=[V(st.x,AISLE-1.7,{pick:1}),V(st.x,AISLE,{rev:1}),V(x,AISLE),V(x,2.6,{drop:1}),V(x,AISLE)]}
  else{const a=stagePos(5),b=stagePos(7);
    pts=[V(a.x,AISLE-1.7,{pick:1}),V(a.x,AISLE,{rev:1}),V(W/2+2.5,AISLE),V(W/2+2.5,9,{drop:1}),V(W/2+2.5,AISLE),V(b.x,AISLE),V(b.x,AISLE-1.7,{pick:1}),V(b.x,AISLE,{rev:1})]}
  e.loop=pts;e.pause=0;
  if(init){e.li=(k*2)%pts.length;const prev=pts[(e.li+pts.length-1)%pts.length];g.position.copy(prev);const nx=pts[e.li];g.rotation.y=Math.atan2(nx.x-prev.x,nx.z-prev.z)+(nx.rev?Math.PI:0);e.carry=f.op==='Unloading'}
  else{e.li=2;e.path=[{v:V(g.position.x,AISLE)}]}
  if(!movers.includes(e))movers.push(e)}

/* ---------- movement ---------- */
const tmp=new THREE.Vector3();
function lerpAngle(a,b,t){let d=((b-a+Math.PI)%(Math.PI*2)+Math.PI*2)%(Math.PI*2)-Math.PI;return a+d*t}
function stepMover(e,dt){const g=e.obj;
  if(state.offline)return;
  if(e.loopRoad){const lo=e.lo??-220,hi=e.hi??300;g.position.x+=e.speed*dt;g.rotation.y=e.speed>0?Math.PI/2:-Math.PI/2;if(g.position.x>hi)g.position.x=lo;if(g.position.x<lo)g.position.x=hi;return}
  if(e.path){const p=e.path[0];tmp.subVectors(p.v,g.position);tmp.y=0;const dist=tmp.length();
    if(dist<.15){e.path.shift();if(!e.path.length){e.path=null;e.onArrive&&e.onArrive();}return}
    tmp.normalize();const sp=Math.min((p.sp||e.speed)*dt,dist);g.position.addScaledVector(tmp,sp);
    let ang=Math.atan2(tmp.x,tmp.z);if(p.rev)ang+=Math.PI;if(p.snap){g.position.x+=(p.v.x-g.position.x)*Math.min(1,dt*4)}g.rotation.y=lerpAngle(g.rotation.y,ang,Math.min(1,dt*(p.turn||4)));return}
  if(e.loop){if(e.pause>0){e.pause-=dt;return}
    const p=e.loop[e.li];tmp.subVectors(p,g.position);tmp.y=0;const dist=tmp.length();
    if(dist<.12){const dock=e.data.dock!=null&&!e.free;
      if(p.pick)e.carry=dock?e.data.op!=='Unloading':!e.carry;
      if(p.drop)e.carry=dock?e.data.op==='Unloading':false;
      if(p.stop&&e.onStop)e.onStop(p);e.li=(e.li+1)%e.loop.length;e.pause=(p.pick||p.drop)?1.1:p.stop?2.8:.15;return}
    tmp.normalize();g.position.addScaledVector(tmp,Math.min(e.speed*dt,dist));g.rotation.y=lerpAngle(g.rotation.y,Math.atan2(tmp.x,tmp.z)+(p.rev?Math.PI:0),Math.min(1,dt*6));
    const lift=g.getObjectByName('lift');const load=g.getObjectByName('load');if(lift&&load){load.visible=!!e.carry;lift.position.y+=((e.carry?.35:0)-lift.position.y)*Math.min(1,dt*3)}}
}

/* ================= SELECTION / LABELS ================= */
let selected=null,hovered=null,marker=null,hoverMarker=null;
const labelsEl=document.getElementById('labels');
const tagEls={};
function entAlerts(){const a=[];if(state.ulds)airAlerts(a);
  state.fls.forEach(f=>{if(f.battery<20&&f.op!=='Charging'&&f.op!=='To charger')a.push({id:f.id,lvl:'bad',title:f.id+' battery '+f.battery+'%',sub:'Will stop within ~25 min · '+f.op,tag:'Battery '+f.battery+'%'})});
  state.trucks.forEach(t=>{if(t.state==='waiting')a.push({id:t.id,lvl:'warn',title:t.id+' waiting at gate · '+t.waitMin+' min',sub:'No dock assigned · '+t.ship.id,tag:'Waiting '+t.waitMin+' min'})});
  state.pallets.forEach(p=>{if(p.low&&!p.reorder)a.push({id:p.id,lvl:'warn',title:'Low stock · '+p.sku,sub:p.qty+' units left · '+p.loc,tag:'Low stock'})});
  return a}
function tagText(id){const e=ents[id];const d=e.data;
  if(e.type==='link'){const s=SITES.find(x=>x.id===e.go);return s.name+' · open →'}
  if(e.type==='forklift')return d.op==='To charger'?'Heading to '+d.charger:d.op==='Charging'?'Charging '+d.battery+'%':d.op==='Loading'?'Loading truck':d.op==='Unloading'?'Unloading truck':d.op==='Available'?'Available':'Moving pallets';
  if(e.type==='truck')return d.state==='docked'?(d.op+' · '+state.docks[d.dock].id):d.state==='waiting'?'Waiting at gate':d.state==='arriving'?'Docking → '+state.docks[d.dock].id:'En route · '+d.eta+' min';
  if(state.kind==='air'){const at=airTag(e);if(at)return at}
  if(e.type==='tdock'){const st=cdStatus(d);return (d.vehicle&&st!=='Completed'?st+' '+cdProg(d)+'% · '+d.cargo:st)}if(e.type==='terminal')return d.name+' · '+d.doors.filter(x=>x.vehicle&&cdStatus(x)!=='Completed').length+'/'+d.doors.length+' doors busy';
  if(e.type==='pallet')return d.sku;if(e.type==='charger')return d.fl?'Charging '+d.fl:'Free';return state.site.name}
function cdProg(d){if(!d.vehicle)return 0;return Math.min(100,Math.round(d.p0+(Date.now()-d.t0)/60000*d.rate*3))}
function cdStatus(d){if(d.ov)return d.ov;if(d.vehicle&&cdProg(d)>=100)return 'Completed';return d.base}
const CHIPCLS={Loading:'busy',Unloading:'busy',Reserved:'res',Maintenance:'off',Blocked:'off',Completed:'done',Available:'free'};
function chipCls(c){return 'dchip '+(c.cls||'')+(c.door?' '+(CHIPCLS[cdStatus(c.door)]||''):'')+(c.door&&selected===c.door.id?' on':'')}
function refreshChips(){dockChips.forEach(c=>{if(c.el&&c.door)c.el.className=chipCls(c)})}
function makeDockChips(){labelsEl.querySelectorAll('.dchip').forEach(x=>x.remove());dockChips.forEach(c=>{const el=document.createElement('div');el.className=chipCls(c);el.textContent=c.text;if(c.door&&ents[c.door.id]){el.style.pointerEvents='auto';el.style.cursor='pointer';el.onclick=()=>select(c.door.id,true)}labelsEl.appendChild(el);c.el=el})}
function refreshMarkers(){
  Object.values(tagEls).forEach(el=>el.remove());Object.keys(tagEls).forEach(k=>delete tagEls[k]);
  const al=entAlerts();const show=new Map();al.forEach(a=>show.set(a.id,{cls:a.lvl,text:a.tag}));
  if(ents.LINK)show.set('LINK',{cls:'link',text:tagText('LINK')});
  if(hovered&&hovered!==selected&&hovered!=='LINK')show.set(hovered,{cls:'hover',text:tagText(hovered)});
  if(selected&&ents[selected])show.set(selected,{cls:'sel',text:tagText(selected)});
  show.forEach((v,id)=>{if(!ents[id]||id===state.site.id&&v.cls!=='sel')return;const el=document.createElement('div');el.className='tag '+v.cls;const ln=ents[id].type==='link';el.innerHTML=`${ln?ic(ents[id].go.startsWith('AIR')?'plane':'home','#fff',13):''}<span class="tid">${ln?ents[id].go:id}</span>${v.text}`;el.onclick=()=>ln?travelTo(ents[id].go):select(id,true);labelsEl.appendChild(el);tagEls[id]=el});
  document.getElementById('badge').textContent=al.length;document.getElementById('badge').style.display=al.length?'grid':'none';
}
function attachMarker(id,hover=false){const e=ents[id];if(!e)return null;let mk;
  if(e.type==='warehouse'){const air=state.kind==='air';mk=makeMarker(air?33:W+2.5,air?26.5:24.5,hover?'#94a3b8':'#2563eb');mk.position.set(air?-27:0,0,air?-12:-11)}
  else{const [w,d,ox,oz]=e.foot||FOOT[e.type];mk=makeMarker(w,d,hover?'#94a3b8':'#2563eb');mk.position.set(ox,0,oz)}
  e.obj.add(mk);return mk}
function select(id,focus=false,silent=false){
  if(marker){marker.parent&&marker.parent.remove(marker);marker=null}
  selected=id;if(id&&ents[id]){marker=attachMarker(id);if(focus)focusOn(id)}
  renderDetail();renderShip();renderOps();refreshMarkers();refreshChips();if(!silent)hideHint();on3DSelect(id);
}
function setHover(id){if(id===hovered)return;if(hoverMarker){hoverMarker.parent&&hoverMarker.parent.remove(hoverMarker);hoverMarker=null}
  hovered=id;if(id&&id!==selected&&ents[id]&&!['warehouse','link'].includes(ents[id].type))hoverMarker=attachMarker(id,true);renderer.domElement.style.cursor=id?'pointer':'';refreshMarkers()}
// camera tweens
let tween=null;
function focusOn(id){const e=ents[id];const p=new THREE.Vector3();e.obj.getWorldPosition(p);if(e.type==='warehouse')p.set(state.kind==='air'?-27:0,0,-4);
  const toT=p.clone();const off=camera.position.clone().sub(controls.target);tween={t:0,dur:.8,fromT:controls.target.clone(),toT,off,fromZ:camera.zoom,toZ:e.type==='warehouse'?1.05:e.type==='aircraft'?1.05:Math.max(camera.zoom,1.7)}}
function rotateBy(a){const off=camera.position.clone().sub(controls.target);const sph=new THREE.Spherical().setFromVector3(off);tween={t:0,dur:.6,rot:true,fromTh:sph.theta,toTh:sph.theta+a,sph,fromZ:camera.zoom,toZ:camera.zoom}}
function zoomBy(f){tween={t:0,dur:.3,fromT:controls.target.clone(),toT:controls.target.clone(),off:camera.position.clone().sub(controls.target),fromZ:camera.zoom,toZ:THREE.MathUtils.clamp(camera.zoom*f,controls.minZoom,controls.maxZoom)}}
function stepTween(dt){if(!tween)return;tween.t+=dt/tween.dur;const k=Math.min(1,tween.t);const s=k<.5?2*k*k:1-Math.pow(-2*k+2,2)/2;
  if(tween.rot){const sp=tween.sph.clone();sp.theta=tween.fromTh+(tween.toTh-tween.fromTh)*s;camera.position.copy(controls.target).add(new THREE.Vector3().setFromSpherical(sp))}
  else{controls.target.lerpVectors(tween.fromT,tween.toT,s);camera.position.copy(controls.target).add(tween.off)}
  camera.zoom=tween.fromZ+(tween.toZ-tween.fromZ)*s;camera.updateProjectionMatrix();if(k>=1)tween=null}

// picking
const ray=new THREE.Raycaster();const ptr=new THREE.Vector2();let down=null;
function pick(ev){const r=renderer.domElement.getBoundingClientRect();ptr.x=(ev.clientX-r.left)/r.width*2-1;ptr.y=-(ev.clientY-r.top)/r.height*2+1;ray.setFromCamera(ptr,camera);
  const hits=ray.intersectObjects(clickable,true);for(const h of hits){let o=h.object;while(o&&!o.userData.entityId)o=o.parent;if(o)return o.userData.entityId}return null}
renderer.domElement.addEventListener('pointerdown',e=>{down={x:e.clientX,y:e.clientY,b:e.button}});
renderer.domElement.addEventListener('pointerup',e=>{if(!down)return;const moved=Math.hypot(e.clientX-down.x,e.clientY-down.y);if(moved<5&&down.b===0){const id=pick(e);if(id&&ents[id]?.type==='link'){travelTo(ents[id].go);down=null;return}select(id||null,!!id&&ents[id]?.type!=='warehouse')}down=null});
renderer.domElement.addEventListener('pointermove',e=>{if(e.buttons)return;setHover(pick(e))});
renderer.domElement.addEventListener('contextmenu',e=>e.preventDefault());

/* ================= AIR CARGO LEG ================= */
const mmss=s=>{s=Math.max(0,Math.round(s));return pad(Math.floor(s/60))+':'+pad(s%60)};
const isLoad=()=>state.mode==='load';
function genAir(site){
  const r=rngOf(site.seed);const load=site.mode==='load';site.docks=3;
  const fl={id:'YT 482',type:'aircraft',from:'LKS',to:'HBR',cut:31*60,dep:hhmm(load?62:-128),arr:hhmm(load?192:-6),wMax:102,closed:false,released:false};
  const ulds=[];
  for(let i=0;i<8;i++){const ake=i%3===2;const kg=ake?700+Math.floor(r()*800):2600+Math.floor(r()*2100);
    const st=load?(i<5?'loaded':i===5?'on dolly':i===6?'ready':'building'):(i<2?'breakdown':'onboard');
    ulds.push({id:(ake?'AKE-':'PMC-')+(31040+i*37+Math.floor(r()*20)),type:'uld',kind:ake?'AKE':'PMC',kg,vol:ake?(3.4+r()).toFixed(1):(9+r()*3).toFixed(1),
      parcels:ake?60+Math.floor(r()*80):180+Math.floor(r()*220),pos:'P'+(i+1),state:st,flight:'YT 482',damaged:!load&&i===1,
      ship:{id:'#SHP-'+(78600+i*23+Math.floor(r()*20)),to:load?'HBR · Harbor Air Cargo':'WH-01 Riverside Hub'}})}
  const fx=load?ulds[6]:ulds[3];fx.ship={id:'#SHP-78570',to:load?'HBR · Harbor Air Cargo':'WH-01 Riverside Hub'};fx.featured=true;
  const docks=[0,1,2].map(i=>({id:'D'+(i+1),i,truck:null}));
  const trucks=[];
  const mk=(id,dock,op,ship,carrier,driver)=>{trucks.push({id,type:'truck',state:'docked',dock,op,units:2+Math.floor(r()*3),total:6,driver,carrier,ship});docks[dock].truck=id};
  if(load){mk('TRK-2311',0,'Unloading',{id:'#SHP-78570',to:'AIR-01 Lakeside Air Cargo · YT 482',step:4},'Northline','Ava Kim');mk('TRK-2342',2,'Unloading',{id:'#SHP-78633',to:'AIR-01 Lakeside Air Cargo · YT 517',step:4},'Atlas Haul','Leo Garcia')}
  else{mk('TRK-2405',0,'Loading',{id:'#SHP-78570',to:'WH-01 Riverside Hub',step:2},'Bluepeak','Mia Novak');mk('TRK-2419',1,'Loading',{id:'#SHP-78702',to:'WH-03 Eastport',step:2},'Harbor Freight','Zoe Martin')}
  trucks.push({id:load?'TRK-2377':'TRK-2431',type:'truck',state:'enroute',dock:null,op:'En route',units:0,total:6,eta:9,driver:'Ivy Chen',carrier:'Atlas Haul',ship:{id:'#SHP-79011',to:load?'AIR-01 Lakeside Air Cargo':'WH-02 Northgate DC',step:3}});
  const fls=trucks.filter(t=>t.state==='docked').map((t,k)=>({id:'FL-'+(31+k),type:'forklift',op:t.op,truck:t.id,dock:t.dock,battery:64+k*15,speed:'7.2',moves:18+k*6,operator:OPERATORS[k+2],model:'Linde E20',charger:'—'}));
  return {site,mode:site.mode,flight:fl,ulds,docks,trucks,fls,chargers:[],pallets:[],
    tug:{id:'TUG-1',type:'tug',leg:load?'To stand':'To stand',driver:'Owen Reyes',cycles:7},
    loader:{id:'KL-1',type:'loader',phase:'Idle',h:1.2,t:0,cycles:load?5:2,cur:null},
    next:{id:'YT 517',dest:load?'GRV':'LKS',dep:hhmm(load?175:95)}};
}

/* ---------- air models (no text, no logos) ---------- */
function makePlane(){
  const g=new THREE.Group();const white=M('#f7f9fc',{roughness:.32}),blue=M('#2f58db',{roughness:.4}),glass=M('#1c2b47',{roughness:.15,metalness:.35}),dark=M('#1e2433'),grey=M('#a9b3c4',{metalness:.45,roughness:.35});
  const wingM=new THREE.MeshStandardMaterial({color:'#c9d3e2',roughness:.45,side:THREE.DoubleSide});const blueD=new THREE.MeshStandardMaterial({color:'#2f58db',roughness:.4,side:THREE.DoubleSide});
  const fus=mesh(new THREE.CylinderGeometry(3,3,40,40),white,0,5.4,0);fus.rotation.x=Math.PI/2;g.add(fus);
  const nose=mesh(new THREE.SphereGeometry(3,32,20),white,0,5.4,20);nose.scale.set(1,1,1.5);g.add(nose);
  const cw=mesh(new THREE.BoxGeometry(2.4,.55,1.3),glass,0,7.15,22.3,false);cw.rotation.x=-.55;g.add(cw);
  const tail=mesh(new THREE.CylinderGeometry(.7,3,9,32),white,0,5.9,-24.5);tail.rotation.x=-Math.PI/2;g.add(tail);
  g.add(mesh(RB(4.2,1.3,13,.5),white,0,2.9,-1));
  [-1,1].forEach(sd=>{g.add(mesh(new THREE.BoxGeometry(.08,.32,36),blue,sd*2.92,6.1,-1,false))});
  // wings
  const shp=(pts,sd)=>{const sh=new THREE.Shape();pts.forEach(([x,z],i)=>i?sh.lineTo(sd*x,z):sh.moveTo(sd*x,z));return sh};
  [1,-1].forEach(sd=>{const w=mesh(new THREE.ExtrudeGeometry(shp([[2.6,4],[23,-10],[23,-12.6],[2.6,-6.5]],sd),{depth:.45,bevelEnabled:false}),wingM,0,4.95,0);w.rotation.x=Math.PI/2;g.add(w);const ed=new THREE.LineSegments(new THREE.EdgesGeometry(w.geometry),new THREE.LineBasicMaterial({color:'#8d9bb3'}));ed.position.copy(w.position);ed.rotation.copy(w.rotation);g.add(ed);
    [[8.5],[15.5]].forEach(([x])=>{const ez=4-(x-2.6)*14/20.4+1.4;
      const eng=mesh(new THREE.CylinderGeometry(1.15,1.0,4.6,26),white,sd*x,3.2,ez);eng.rotation.x=Math.PI/2;g.add(eng);
      const lip=mesh(new THREE.TorusGeometry(1.08,.13,10,26),blue,sd*x,3.2,ez+2.3,false);g.add(lip);
      g.add(mesh(new THREE.CircleGeometry(.95,24),dark,sd*x,3.2,ez+2.25,false));
      g.add(mesh(new THREE.BoxGeometry(.3,1.1,2.8),white,sd*x,4.3,ez-.6))})});
  // stabilisers
  [1,-1].forEach(sd=>{const h=mesh(new THREE.ExtrudeGeometry(shp([[.5,-20.5],[9,-25.5],[9,-27.4],[.5,-25]],sd),{depth:.3,bevelEnabled:false}),wingM,0,7,0);h.rotation.x=Math.PI/2;g.add(h);const ed=new THREE.LineSegments(new THREE.EdgesGeometry(h.geometry),new THREE.LineBasicMaterial({color:'#8d9bb3'}));ed.position.copy(h.position);ed.rotation.copy(h.rotation);g.add(ed)});
  const vs=new THREE.Shape();vs.moveTo(-17.5,0);vs.lineTo(-27.6,0);vs.lineTo(-29.2,9.5);vs.lineTo(-25,9.5);vs.lineTo(-17.5,0);
  const vt=mesh(new THREE.ExtrudeGeometry(vs,{depth:.5,bevelEnabled:false}),blueD,.25,7.4,0);vt.rotation.y=-Math.PI/2;g.add(vt);
  // gear
  const wh=new THREE.CylinderGeometry(.6,.6,.45,18);
  const gear=(x,z,n=2)=>{g.add(mesh(new THREE.CylinderGeometry(.18,.18,2.4,8),grey,x,1.8,z));for(let k=0;k<n;k++){const w=mesh(wh,dark,x+(k%2?.4:-.4),.6,z+(n>2?(k<2?-.7:.7):0));w.rotation.z=Math.PI/2;g.add(w)}};
  gear(0,16);[-2.1,2.1].forEach(x=>{gear(x,-2.5,4);gear(x*1.9,-4,4)});
  // open main-deck cargo door (left side = +x)
  g.add(mesh(new THREE.BoxGeometry(.3,2.7,3.6),M('#1b2540'),2.88,5.75,11,false));
  g.add(mesh(new THREE.PlaneGeometry(3.3,2.3),M('#ffe6bd',{emissive:'#ffd59a',emissiveIntensity:.25,side:THREE.DoubleSide}),2.75,5.7,11,false).rotateY(Math.PI/2));
  const door=mesh(new THREE.BoxGeometry(.16,2.7,3.6),white,3.9,8.0,11);door.rotation.z=-1.15;g.add(door);
  g.add(mesh(new THREE.SphereGeometry(.12,8,6),M('#ff3b3b',{emissive:'#ff3b3b',emissiveIntensity:1}),0,8.5,-2,false));
  return g;
}
function makeULD(kind='PMC',layers=2){
  const g=new THREE.Group();const alu=M('#c9d1dc',{metalness:.5,roughness:.35});
  if(kind==='AKE'){const sh=new THREE.Shape();sh.moveTo(0,0);sh.lineTo(1.56,0);sh.lineTo(1.56,1.63);sh.lineTo(-.45,1.63);sh.lineTo(-.45,.62);sh.lineTo(0,0);
    const m=mesh(new THREE.ExtrudeGeometry(sh,{depth:1.5,bevelEnabled:true,bevelSize:.03,bevelThickness:.03,bevelSegments:1}),alu,-.55,.12,-.75);g.add(m);
    g.add(mesh(new THREE.BoxGeometry(1.3,1.2,.03),M('#3b5bdb',{roughness:.6}),.25,.95,.79,false));
    for(let i=0;i<3;i++)g.add(mesh(new THREE.BoxGeometry(.05,1.55,1.52),M('#b3bccb',{metalness:.5}),-.1+i*.55,.92,0,false));
  }else{
    g.add(mesh(RB(2.4,.12,3.0,.03),alu,0,.12,0));
    const tones=['#dba86a','#cf9a5b','#f1f3f7','#e2b37a','#eef1f6'];let k=0;
    for(let l=0;l<layers;l++){const sx=l===layers-1&&layers>1?.85:1;for(let i=0;i<3;i++)for(let j=0;j<4;j++){
      const b=mesh(RB(.74*sx,.66,.7,.04),M(tones[(k++)%5]),(-.76+i*.76)*sx,.53+l*.68,-1.08+j*.72);g.add(b)}}
    const net=M('#1e2433',{roughness:.8});const top=.2+layers*.68;
    for(let i=-1;i<=1;i++)g.add(mesh(new THREE.BoxGeometry(.04,.03,3.0),net,i*.8,top,0,false));
    for(let j=-2;j<=2;j++)g.add(mesh(new THREE.BoxGeometry(2.3,.03,.04),net,0,top,j*.72,false));
  }
  return g;
}
function makeDolly(){const g=new THREE.Group();
  g.add(mesh(RB(2.7,.22,3.4,.05),M('#7d8799',{metalness:.4,roughness:.5}),0,.55,0));
  for(let i=-1;i<=1;i+=2)g.add(mesh(new THREE.BoxGeometry(.1,.14,3.3),M('#f6b72c'),i*1.33,.72,0,false));
  const wg=new THREE.CylinderGeometry(.24,.24,.2,12);[[-1.1,1.3],[1.1,1.3],[-1.1,-1.3],[1.1,-1.3]].forEach(([x,z])=>{const w=mesh(wg,M('#1e2433'),x,.24,z);w.rotation.z=Math.PI/2;g.add(w)});
  g.add(mesh(new THREE.BoxGeometry(.12,.1,1.3),M('#475569'),0,.45,2.3,false));
  const c=new THREE.Group();c.name='cargo';c.position.y=.62;g.add(c);return g}
function makeTug(){const g=new THREE.Group();
  g.add(mesh(RB(2.1,1.0,3.3,.2),M('#2b54d8',{roughness:.5}),0,.85,0));
  g.add(mesh(RB(1.9,.25,1.4,.08),M('#f4f6fb'),0,2.75,-.5));
  [[-.85,-1.1],[.85,-1.1],[-.85,.1],[.85,.1]].forEach(([x,z])=>g.add(mesh(new THREE.CylinderGeometry(.05,.05,1.4,8),M('#1e2433'),x,2.0,z)));
  g.add(mesh(RB(.8,.5,.7,.1),M('#1e2433'),0,1.6,-.6));
  const wg=new THREE.CylinderGeometry(.42,.42,.36,16);[[-1.02,1],[1.02,1],[-1.02,-1.05],[1.02,-1.05]].forEach(([x,z])=>{const w=mesh(wg,M('#1e2433'),x,.42,z);w.rotation.z=Math.PI/2;g.add(w)});
  g.add(mesh(new THREE.SphereGeometry(.13,10,8),M('#ff9f1a',{emissive:'#ff8a00',emissiveIntensity:1}),0,2.95,-.5,false));
  return g}
function makeLoader(){const g=new THREE.Group();const yel=M('#f6b72c',{roughness:.5}),blue=M('#2b54d8'),dark=M('#1e2433'),steel=M('#9aa4b5',{metalness:.5,roughness:.4});
  g.add(mesh(RB(3.4,.7,8.4,.15),yel,0,.75,0));g.add(mesh(RB(3.45,.18,8.45,.05),blue,0,.5,0));
  g.add(mesh(RB(2.2,1.6,1.6,.2),blue,0,1.9,-3.2));g.add(mesh(new THREE.BoxGeometry(1.9,.7,.05),M('#1c2b47',{roughness:.15,metalness:.3}),0,2.2,-2.38,false));
  const wg=new THREE.CylinderGeometry(.45,.45,.4,16);[[-1.5,2.8],[1.5,2.8],[-1.5,-2.8],[1.5,-2.8]].forEach(([x,z])=>{const w=mesh(wg,dark,x,.45,z);w.rotation.z=Math.PI/2;g.add(w)});
  const plat=new THREE.Group();plat.name='plat';plat.position.y=1.2;g.add(plat);
  plat.add(mesh(RB(3.4,.25,4.8,.06),steel,0,0,1.6));
  [-1.65,1.65].forEach(x=>plat.add(mesh(new THREE.BoxGeometry(.08,.6,4.6),yel,x,.4,1.6,false)));
  plat.add(mesh(RB(3.0,.1,.9,.03),M('#e5e9f2'),0,0,4.3));
  const pu=new THREE.Group();pu.name='puld';pu.position.set(0,.13,1.6);pu.add(makeULD('AKE'));pu.visible=false;plat.add(pu);
  const arms=[];[-1.3,1.3].forEach(x=>[0,1].forEach(k=>{const a=mesh(new THREE.BoxGeometry(.16,.16,1),steel,x,1,1.6);g.add(a);arms.push({m:a,k})}));
  g.userData.arms=arms;return g}
function setLoaderH(g,h){const plat=g.getObjectByName('plat');plat.position.y=h;
  g.userData.arms.forEach(({m,k})=>{const z1=-.6,z2=3.8,y1=1.0,y2=h-.05;const a=k?[z1,y1,z2,y2]:[z2,y1,z1,y2];
    const dz=a[2]-a[0],dy=a[3]-a[1];m.position.set(m.position.x,(a[1]+a[3])/2,(a[0]+a[2])/2);m.scale.z=Math.hypot(dz,dy);m.rotation.x=-Math.atan2(dy,dz)})}
function makeTower(){const g=new THREE.Group();
  g.add(mesh(new THREE.CylinderGeometry(1.8,2.4,22,24),M('#f4f6fb'),0,11,0));
  g.add(mesh(new THREE.CylinderGeometry(3.6,2.6,1.2,24),M('#e5e9f2'),0,22.4,0));
  g.add(mesh(new THREE.CylinderGeometry(3.4,3.6,3.2,24),M('#7fb0ff',{emissive:'#6aa5ff',emissiveIntensity:.3,roughness:.15,metalness:.3}),0,24.6,0));
  g.add(mesh(new THREE.CylinderGeometry(3.9,3.9,.5,24),M('#2f58db'),0,26.4,0));
  g.add(mesh(new THREE.CylinderGeometry(.08,.08,4,6),M('#94a3b8'),0,28.6,0));
  return g}
function makePole(){const g=new THREE.Group();g.add(mesh(new THREE.CylinderGeometry(.15,.22,12,8),M('#c8d0dd'),0,6,0));
  g.add(mesh(RB(1.6,.35,.6,.08),M('#e5e9f2'),0,12.1,0));g.add(mesh(new THREE.BoxGeometry(1.4,.05,.45),M('#fff7d6',{emissive:'#fff1b0',emissiveIntensity:.9}),0,11.9,0,false));return g}

/* ---------- air scene ---------- */
const AIR={plane:null,loader:null,tug:null,ulPos:i=>new THREE.Vector3(-4+(i%3)*4.4,0,-15+Math.floor(i/3)*5)};
function buildAir(){
  if(root){scene.remove(root);root.traverse(o=>{if(o.geometry)o.geometry.dispose()})}
  Object.keys(ents).forEach(k=>delete ents[k]);clickable=[];movers=[];booth=null;
  root=new THREE.Group();scene.add(root);
  const s=state.site,r=rngOf(s.seed*7),load=isLoad();W=30;
  root.add(mesh(new THREE.PlaneGeometry(900,900),M('#e3e9f3',{roughness:.95}),0,0,0,false).rotateX(-Math.PI/2));
  const grass=M('#d3eedc',{roughness:1});
  [[-80,-20,40,70],[100,-14,40,90],[20,-66,170,24]].forEach(([x,z,w,d])=>{const p=mesh(new THREE.PlaneGeometry(w,d),grass,x,.01,z,false);p.rotation.x=-Math.PI/2;root.add(p)});
  // the same road continues from the warehouse
  root.add(mesh(new THREE.BoxGeometry(760,.18,2),M('#f7f9fc'),0,.09,26,false));
  const road=mesh(new THREE.PlaneGeometry(760,10),M('#cdd6e4',{roughness:.95}),0,.02,32,false);road.rotation.x=-Math.PI/2;root.add(road);
  for(let x=-380;x<380;x+=5)root.add(mesh(new THREE.BoxGeometry(2.4,.02,.22),M('#ffffff'),x,.05,32,false));
  root.add(mesh(new THREE.BoxGeometry(760,.18,2),M('#f7f9fc'),0,.09,38,false));
  // landside yard + airside apron
  root.add(mesh(RB(42,.12,25,.4),M('#f1f4f9',{roughness:.9}),-33,.03,12.5,false));
  root.add(mesh(RB(124,.1,74,.3),M('#d9e0ea',{roughness:.85}),49,.025,-12,false));
  // runway + taxiways (no text, only paint marks)
  const asph=M('#b4bfcf',{roughness:.9});
  root.add(mesh(new THREE.BoxGeometry(260,.06,12),M('#c7d0dd',{roughness:.9}),30,.03,-63,false));
  root.add(mesh(new THREE.BoxGeometry(250,.08,9),asph,30,.04,-63,false));
  for(let x=-90;x<150;x+=7)root.add(mesh(new THREE.BoxGeometry(3.5,.02,.28),M('#ffffff'),x,.09,-63,false));
  [-92,152].forEach(x=>{for(let k=-3;k<=3;k++)if(k)root.add(mesh(new THREE.BoxGeometry(5,.02,.55),M('#ffffff'),x,.09,-63+k*1.1,false))});
  [-58.7,-67.3].forEach(z=>root.add(mesh(new THREE.BoxGeometry(248,.02,.18),M('#ffffff'),30,.09,z,false)));
  [40,88].forEach(x=>{root.add(mesh(new THREE.BoxGeometry(8,.07,11),asph,x,.035,-53.5,false));root.add(mesh(new THREE.BoxGeometry(.22,.02,11),M('#f2c94c'),x,.09,-53.5,false))});
  for(let x=-90;x<150;x+=10){[-57.5,-68.5].forEach(z=>root.add(mesh(new THREE.CylinderGeometry(.15,.15,.35,8),M('#fff3b0',{emissive:'#ffe27a',emissiveIntensity:.9}),x,.18,z,false)))}
  const yel=M('#f2c94c',{roughness:.6}),wht=M('#ffffff'),red=M('#e5484d');
  root.add(mesh(new THREE.BoxGeometry(.26,.02,64),yel,40,.08,-15,false));
  root.add(mesh(new THREE.BoxGeometry(7,.02,.3),yel,40,.08,17.4,false));
  for(let x=-10;x<76;x+=3){root.add(mesh(new THREE.BoxGeometry(1.4,.02,.16),wht,x+.7,.08,22.2,false))}
  [[40,20,48,.16],[40,-44,48,.16],[16,-12,.16,64],[64,-12,.16,64]].forEach(([x,z,w,d])=>{for(let k=0;k<(w>d?w:d);k+=2){const seg=mesh(new THREE.BoxGeometry(w>d?1:.16,.02,w>d?.16:1),red,w>d?x-w/2+k+.5:x,.085,w>d?z:z-d/2+k+.5,false);root.add(seg)}});
  for(let i=0;i<=3;i++)root.add(mesh(new THREE.BoxGeometry(.16,.02,16),yel,-37.5-3.6+i*7.2,.1,8.6,false));
  for(let z=1;z<=25;z+=2.4)root.add(mesh(new THREE.BoxGeometry(.12,1.7,.12),M('#c8d0dd'),-11.5,.85,z));
  [.6,1.5].forEach(y=>root.add(mesh(new THREE.BoxGeometry(.05,.07,24),M('#c8d0dd'),-11.5,y,13,false)));
  // terminal
  const tm=new THREE.Group();tm.userData.entityId=s.id;const TW=30,TD=24,TH=10,cx=-27;
  const wallTex=stripeTex('#eef1f7','#dfe4ee',10,true);const t1=wallTex.clone();t1.repeat.set(TW/1.6,1);t1.needsUpdate=true;const t2=wallTex.clone();t2.repeat.set(TD/1.6,1);t2.needsUpdate=true;
  const wF=new THREE.MeshStandardMaterial({map:t1,roughness:.65}),wS=new THREE.MeshStandardMaterial({map:t2,roughness:.65}),top=M('#d7deea');
  tm.add(mesh(new THREE.BoxGeometry(TW,TH,TD),[wS,wS,top,top,wF,wF],cx,TH/2,-TD/2));
  const blue=M('#2f58db',{roughness:.5});
  tm.add(mesh(RB(TW+.3,1.1,TD+.3,.05),blue,cx,.55,-TD/2));tm.add(mesh(RB(TW+.5,.7,TD+.5,.05),blue,cx,TH+.2,-TD/2));
  [[cx-TW/2,0],[cx+TW/2,0],[cx-TW/2,-TD],[cx+TW/2,-TD]].forEach(([x,z])=>tm.add(mesh(RB(.7,TH+.4,.7,.1),blue,x,TH/2,z)));
  const glassM=M('#9cc3ff',{emissive:'#6aa5ff',emissiveIntensity:.22,roughness:.15,metalness:.25});
  tm.add(mesh(new THREE.BoxGeometry(7,8,.15),glassM,-16,5.2,.05,false));
  for(let i=0;i<5;i++)tm.add(mesh(new THREE.BoxGeometry(.12,8,.2),M('#e5e9f2'),-19.4+i*1.7,5.2,.1,false));
  tm.add(mesh(new THREE.BoxGeometry(.15,1,TD-3),glassM,cx+TW/2+.05,8.4,-TD/2,false));
  [[cx-8,-6],[cx+2,-15],[cx+9,-8],[cx-2,-18]].forEach(([x,z])=>{tm.add(mesh(RB(3.2,1.4,2.4,.1),M('#e5e9f2'),x,TH+1.1,z));tm.add(mesh(new THREE.CylinderGeometry(.8,.8,.25,16),M('#c8d0dd'),x,TH+1.9,z))});
  [-17,-7].forEach(z=>{tm.add(mesh(RB(.5,5.4,5,.08),blue,cx+TW/2+.18,2.7,z));const t=stripeTex('#e6ebf3','#cfd7e4',14,false);tm.add(mesh(new THREE.BoxGeometry(.2,4.5,4.1),new THREE.MeshStandardMaterial({map:t,roughness:.6}),cx+TW/2+.35,2.4,z,false))});
  dockChips=[];
  state.docks.forEach((dk,i)=>{const x=dockX(i);const occ=!!dk.truck;
    tm.add(mesh(RB(4.7,5.3,.5,.08),blue,x,2.65,.18));
    const rec=mesh(new THREE.BoxGeometry(3.8,4.4,.2),M(occ?'#1b2540':'#dfe5ef'),x,2.4,.35,false);
    if(!occ){const t=stripeTex('#e6ebf3','#cfd7e4',14,false);rec.material=new THREE.MeshStandardMaterial({map:t,roughness:.6})}tm.add(rec);
    if(occ){tm.add(mesh(new THREE.PlaneGeometry(3.4,3.9),M('#ffe6bd',{emissive:'#ffd59a',emissiveIntensity:.35}),x,2.3,.46,false));const p=makePallet(2,false,.95);p.position.set(x-.8,0,.9);tm.add(p)}
    const lamp=mesh(RB(.5,.22,.14,.05),M(occ?'#f59e0b':'#22c55e',{emissive:occ?'#f59e0b':'#22c55e',emissiveIntensity:1}),x+1.8,5.0,.48,false);tm.add(lamp);dk.lamp=lamp;
    dockChips.push({el:null,pos:new THREE.Vector3(x,5.55,.6),text:dk.id})});
  root.add(tm);ents[s.id]={id:s.id,type:'warehouse',obj:tm,data:s,h:TH+5};clickable.push(tm);
  // landside parcel staging (decor)
  for(let i=0;i<6;i++){const p=makePallet(1+(i%2),false,1.1);p.position.set(-50+(i%2)*2.6,0,12+Math.floor(i/2)*2.6);root.add(p)}
  const tw=makeTower();tw.position.set(-58,0,-40);root.add(tw);
  [[-6,0,24],[22,0,24],[64,0,24],[108,0,24],[108,0,-30],[64,0,-46]].forEach(([x,y,z])=>{const p=makePole();p.position.set(x,y,z);root.add(p)});
  for(let i=0;i<10;i++){const t=makeTree(.8+r()*.5,r);t.position.set(i<5?-70+r()*16:118+r()*14,0,-30+r()*50);root.add(t)}
  // aircraft
  const pl=makePlane();pl.position.set(40,0,-8);pl.userData.entityId=state.flight.id;root.add(pl);AIR.plane=pl;
  ents[state.flight.id]={id:state.flight.id,type:'aircraft',obj:pl,data:state.flight,h:15};clickable.push(pl);
  dockChips.push({el:null,pos:new THREE.Vector3(40,.4,19.2),text:'Stand 3'});
  const pl2=makePlane();pl2.position.set(88,0,-10);root.add(pl2);dockChips.push({el:null,pos:new THREE.Vector3(88,.4,17),text:'Stand 4'});
  root.add(mesh(new THREE.BoxGeometry(.26,.02,64),yel,88,.08,-15,false));root.add(mesh(new THREE.BoxGeometry(7,.02,.3),yel,88,.08,17.4,false));
  // high loader at the door
  const kl=makeLoader();kl.position.set(47.5,0,3);kl.rotation.y=-Math.PI/2;kl.userData.entityId=state.loader.id;root.add(kl);AIR.loader=kl;setLoaderH(kl,1.2);
  ents[state.loader.id]={id:state.loader.id,type:'loader',obj:kl,data:state.loader,h:6.5};clickable.push(kl);
  // staged ULDs (on dollies)
  let slot=0;state.ulds.forEach(u=>{const staged=load?['ready','building'].includes(u.state):u.state==='breakdown';if(!staged)return;addUldEnt(u,slot++)});
  // tug + dolly train
  const tug=makeTug();tug.userData.entityId=state.tug.id;root.add(tug);
  const V=(x,z,o={})=>Object.assign(new THREE.Vector3(x,0,z),o);
  const loop=[V(10,-4,{stop:'staging'}),V(10,19.5),V(47.5,19.5),V(47.5,8.6,{stop:'stand'}),V(56,8.6),V(56,24.5),V(15,24.5),V(15,-4),V(12.5,-7)];
  const e={id:state.tug.id,type:'tug',obj:tug,data:state.tug,h:3.6,speed:5,loop,li:2,pause:0,train:[],trail:[],dist:0};
  ents[state.tug.id]=e;clickable.push(tug);movers.push(e);
  for(let i=0;i<3;i++){const d=makeDolly();const c=d.getObjectByName('cargo');c.add(makeULD(i===1?'AKE':'PMC',2));c.visible=load;d.userData.entityId=state.tug.id;root.add(d);e.train.push(d);clickable.push(d)}
  for(let z=-4;z<=19.5;z+=.5){e.trail.push({p:new THREE.Vector3(10,0,z),d:e.dist});e.dist+=.5}
  tug.position.set(10,0,19.5);tug.rotation.y=0;e.lastP=tug.position.clone();
  e.onStop=p=>{const st=state.tug;if(p.stop==='stand'){e.train.forEach(d=>d.getObjectByName('cargo').visible=!load);st.leg='To terminal'}else{e.train.forEach(d=>d.getObjectByName('cargo').visible=load);st.leg='To stand';st.cycles++}};
  AIR.tug=e;
  // trucks + forklifts
  state.trucks.forEach((t,k)=>{const g=makeTruck(['#2f5be0','#f4f6fb','#2f5be0'][k%3]);g.userData.entityId=t.id;root.add(g);
    const te={id:t.id,type:'truck',obj:g,data:t,h:4.6,speed:7};ents[t.id]=te;clickable.push(g);
    if(t.state==='docked')g.position.set(dockX(t.dock),0,7.5);else{g.position.set(-120,0,34);g.rotation.y=Math.PI/2;te.loopRoad=true;movers.push(te)}});
  state.fls.forEach((f,k)=>{const g=makeForklift();g.userData.entityId=f.id;root.add(g);const fe={id:f.id,type:'forklift',obj:g,data:{...f,dock:null},h:3.9,speed:3};fe.data=f;ents[f.id]=fe;clickable.push(g);
    const x=dockX(f.dock)+3.05;fe.loop=[V(x,2.6,{pick:1}),V(x,18.5),V(-46,18.5),V(-46,15.8,{drop:1}),V(-46,18.5),V(x,18.5)];fe.li=k*2%6;g.position.copy(fe.loop[(fe.li+5)%6]);fe.carry=false;fe.free=true;movers.push(fe)});
  buildWarehouseDistrict(-125,isLoad()?'WH-04':'WH-01');
  makeDockChips();refreshMarkers();
}
function addUldEnt(u,slot){const p=AIR.ulPos(slot);const g=new THREE.Group();const d=makeDolly();g.add(d);
  const ul=makeULD(u.kind,u.state==='building'?1:2);ul.position.y=.62;g.add(ul);if(u.state==='building'){ul.children.forEach((c,i)=>{if(i>6)c.visible=false})}
  g.position.copy(p);g.userData.entityId=u.id;root.add(g);ents[u.id]={id:u.id,type:'uld',obj:g,data:u,h:3.2,slot};clickable.push(g)}
function removeUldEnt(id){const e=ents[id];if(!e)return;root.remove(e.obj);clickable=clickable.filter(o=>o!==e.obj);delete ents[id];if(selected===id)select(state.flight.id);if(hovered===id)hovered=null}

/* ---------- air animation ---------- */
const tv=new THREE.Vector3();
function placeTrain(e){if(!e.train)return;const T=e.trail;
  e.train.forEach((d,i)=>{const target=e.dist-(i+1)*4.4-.6;let k=T.length-1;while(k>0&&T[k].d>target)k--;const a=T[k],b=T[Math.min(k+1,T.length-1)];
    const f=b.d>a.d?Math.min(1,Math.max(0,(target-a.d)/(b.d-a.d))):0;d.position.lerpVectors(a.p,b.p,f);
    const c=T[Math.min(k+3,T.length-1)],q=T[Math.max(k-2,0)];if(c.p.distanceTo(q.p)>.01)d.rotation.y=Math.atan2(c.p.x-q.p.x,c.p.z-q.p.z)});
  while(T.length>4&&T[1].d<e.dist-30)T.shift()}
function nextCandidate(){const U=state.ulds;
  if(isLoad())return U.find(u=>u.state==='on dolly')||U.find(u=>u.state==='ready');
  return U.find(u=>u.state==='onboard')}
function stepAir(dt){if(!AIR.tug||!ents[state.tug.id])return;const e=AIR.tug;
  if(!state.offline){const g=e.obj;const moved=g.position.distanceTo(e.lastP);if(moved>.05){e.dist+=moved;e.trail.push({p:g.position.clone(),d:e.dist});e.lastP.copy(g.position)}}
  placeTrain(e);
  // high loader cycle
  const L=state.loader,kl=AIR.loader;if(!kl||state.offline)return;const pu=kl.getObjectByName('puld');const load=isLoad();
  if(state.flight.closed||state.flight.released){L.phase='Idle';return}
  if(L.t===0){L.cur=nextCandidate();if(!L.cur){L.phase='Idle';setLoaderH(kl,1.2);pu.visible=false;return}if(!load)L.cur.state='unloading'}
  L.t+=dt;const t=L.t;let h=1.2,slide=0,vis=false;
  if(load){if(t<2){L.phase='Receiving';vis=true}else if(t<4.5){L.phase='Lifting';h=1.2+(t-2)/2.5*3.05;vis=true}else if(t<6.5){L.phase='Transferring';h=4.25;slide=(t-4.5)/2*3.2;vis=true}
    else if(t<9){L.phase='Lowering';h=4.25-(t-6.5)/2.5*3.05}else{h=1.2}
    if(t>=6.5&&L.cur){const u=L.cur;u.state='loaded';removeUldEnt(u.id);L.cur=null;L.cycles++;onAirChange(u)}}
  else{if(t<2.5){L.phase='Lifting';h=1.2+t/2.5*3.05}else if(t<4.5){L.phase='Transferring';h=4.25;slide=3.2-(t-2.5)/2*3.2;vis=true}else if(t<7){L.phase='Lowering';h=4.25-(t-4.5)/2.5*3.05;vis=true}
    else if(t<8){h=1.2;vis=true}else{h=1.2}
    if(t>=8&&L.cur){const u=L.cur;u.state='breakdown';L.cur=null;L.cycles++;onAirChange(u)}}
  setLoaderH(kl,h);pu.visible=vis;pu.position.z=1.6+slide;
  if(L.t>=(load?10:9))L.t=0}
function onAirChange(u){if(selected===state.flight.id||selected===state.loader.id)renderDetail();renderOps();renderKPIs();renderShip();refreshMarkers();
  const U=state.ulds;
  if(isLoad()&&!U.some(x=>['on dolly','ready'].includes(x.state))&&U.some(x=>x.state==='building'))toast(u.id+' loaded · only '+U.find(x=>x.state==='building').id+' is left — not built yet','warn','#fcd34d');
  if(isLoad()&&U.every(x=>['loaded','offloaded'].includes(x.state)))toast('All ULDs on board · '+state.flight.id+' ready to close');
  if(!isLoad()&&U.every(x=>x.state==='breakdown'))toast(state.flight.id+' fully unloaded · ready to release')}
let airSec=0;
function airTick(){const f=state.flight;if(isLoad()&&!f.closed&&!state.offline)f.cut=Math.max(0,f.cut-1);
  document.querySelectorAll('[data-cut]').forEach(el=>el.textContent=f.closed?'Closed':mmss(f.cut));
  if(++airSec%5===0)refreshMarkers()}

/* ---------- air UI ---------- */
const ULD_STATE={building:['Building','warning'],ready:['Ready','success'],'on dolly':['To aircraft','info'],loaded:['On board','success'],offloaded:['Next flight','neutral'],
  onboard:['On board','info'],unloading:['Unloading','warning'],breakdown:['Breakdown','success']};
const uldPill=u=>pill(...(ULD_STATE[u.state]||[u.state,'neutral']));
function airStats(){const U=state.ulds;return{loaded:U.filter(u=>u.state==='loaded').length,ready:U.filter(u=>['ready','on dolly','loaded'].includes(u.state)).length,
  onboard:U.filter(u=>['onboard','unloading'].includes(u.state)).length,unl:U.filter(u=>u.state==='breakdown').length,total:U.length,
  payload:U.filter(u=>isLoad()?u.state==='loaded':['onboard','unloading'].includes(u.state)).reduce((a,u)=>a+u.kg,0)/1000,
  parcels:U.filter(u=>isLoad()?u.state==='loaded':['onboard','unloading'].includes(u.state)).reduce((a,u)=>a+u.parcels,0)}}
function renderTopAir(){const s=state.site;const a=airStats();
  $('siteBtn').innerHTML=`<span class="site-code">${s.id}</span><span><div class="site-name">${s.name}</div><div class="site-meta">${s.code} · ${isLoad()?'Outbound':'Inbound'} · Stand 3 active</div></span>${ic('chevD','#64748b')}`}
function renderKPIsAir(){const s=state.site,f=state.flight,a=airStats();
  const k=isLoad()?[['plane','Cut-off · '+f.id,`<span data-cut>${f.closed?'Closed':mmss(f.cut)}</span>`,'','departs '+f.dep+' → '+f.to],['box','ULDs ready',a.ready+'/'+a.total,'',a.loaded+' on board'],['clock','On-time departures',s.ontime+'%','+0.6%','last 30 days']]
    :[['plane','Arrived · '+f.id,f.arr,'',f.from+' → '+f.to],['box','ULDs unloaded',a.unl+'/'+a.total,'',a.onboard+' still on board'],['truck','Trucks dispatched',String(4+a.unl),'+1','to WH-01 · WH-03']];
  $('kpis').innerHTML=k.map(([i,l,v,d,sub])=>`<div class="kpi card"><div class="ic">${ic(i,'#2563eb',20)}</div><div><div class="l">${l}</div><div class="v">${v}${d?`<span class="d ${d.startsWith('−')?'neg':''}">${d.startsWith('−')?'↓':'↑'} ${d}</span>`:''}</div><div class="s">${sub}</div></div></div>`).join('')}
function holdMap(){const U=state.ulds,load=isLoad();const nxt=nextCandidate();
  const slots=U.map((u,i)=>{const col=3-Math.floor(i/2),row=i%2;const x=128+col*32,y=row?62:44;
    let fill='#e2e8f0',stroke='none',tc='#64748b',dash='';
    if(load){if(u.state==='loaded'){fill='#2563eb';tc='#fff'}else if(u===nxt){fill='#dbeafe';stroke='#2563eb';tc='#1d4ed8';dash='3 2'}else if(u.state==='building'){fill='#fef3c7';stroke='#f59e0b';tc='#92400e'}}
    else{if(u.state==='onboard'){fill='#2563eb';tc='#fff'}else if(u.state==='unloading'){fill='#fef3c7';stroke='#f59e0b';tc='#92400e'}}
    const sel=ents[u.id]?u.id:state.flight.id;
    return `<g data-sel="${sel}" style="cursor:pointer"><rect x="${x}" y="${y}" width="28" height="15" rx="3" fill="${fill}" stroke="${stroke}" stroke-width="1.5" stroke-dasharray="${dash}"/><text x="${x+14}" y="${y+10.5}" text-anchor="middle" font-size="8" font-weight="700" fill="${tc}">${u.pos}</text></g>`}).join('');
  return `<svg viewBox="0 0 306 120" width="100%" style="display:block;margin-top:10px;background:#f8fafc;border-radius:12px">
  <path d="M150 52 L120 8 L108 8 L118 52 Z M150 70 L120 112 L108 112 L118 70 Z" fill="#e5e9f2"/>
  <path d="M40 54 L18 34 L10 34 L22 56 Z M40 66 L18 86 L10 86 L22 64 Z" fill="#e5e9f2"/>
  <path d="M22 54 Q22 40 60 40 L262 40 Q296 40 298 60 Q296 80 262 80 L60 80 Q22 80 22 66 Z" fill="#fff" stroke="#cbd5e1"/>
  <rect x="244" y="40" width="1.5" height="40" fill="#cbd5e1"/>${slots}
  <path d="M276 52 Q284 54 286 60 Q284 66 276 68" fill="none" stroke="#94a3b8" stroke-width="2"/>
  <text x="14" y="16" font-size="8" fill="#64748b" font-weight="600">TAIL</text><text x="262" y="16" font-size="8" fill="#64748b" font-weight="600">NOSE →</text></svg>
  <div style="display:flex;gap:12px;font-size:10px;color:#64748b;margin-top:6px">${load?'<span><b style="color:#2563eb">■</b> On board</span><span><b style="color:#93c5fd">■</b> Next</span><span><b style="color:#f59e0b">■</b> Building</span><span><b style="color:#cbd5e1">■</b> Empty</span>':'<span><b style="color:#2563eb">■</b> On board</span><span><b style="color:#f59e0b">■</b> Unloading</span><span><b style="color:#cbd5e1">■</b> Unloaded</span>'}</div>`}
function detailAir(e){const d=e.data,s=state.site,f=state.flight,a=airStats(),load=isLoad();
  if(e.type==='aircraft'){const cg=(22+(load?a.loaded:a.onboard)*.6).toFixed(1);const cgp=(cg-10)/30*100;
    const done=load?state.ulds.every(u=>['loaded','offloaded'].includes(u.state)):state.ulds.every(u=>u.state==='breakdown');
    return head('#eaf1ff','plane','#2563eb','FLIGHT · '+s.code,f.id,f.from+' → '+f.to+' · Freighter · Stand 3')+
    `<div class="row-status">${load?(f.closed?pill('Closed','neutral'):pill('Loading','success')):(f.released?pill('Released','neutral'):pill('Unloading','success'))}<span>${load?(f.closed?'Pushback requested':'Cut-off in <b data-cut>'+mmss(f.cut)+'</b> · departs '+f.dep):'Arrived '+f.arr+' · '+a.onboard+' ULDs on board'}</span></div>`+
    `<div class="sec">HOLD MAP · MAIN DECK</div>`+holdMap()+
    `<div class="row-status"><div class="bar blue"><i style="width:${a.payload/f.wMax*100}%"></i></div><span>Payload ${a.payload.toFixed(1)} / ${f.wMax} t</span></div>`+
    `<div style="margin-top:12px;font-size:11px;color:#64748b;display:flex;justify-content:space-between"><span>Center of gravity</span><b style="color:#0f172a">${cg}% MAC</b></div>
     <div style="position:relative;height:10px;border-radius:5px;background:#e2e8f0;margin-top:6px"><div style="position:absolute;left:${(18-10)/30*100}%;width:${15/30*100}%;top:0;bottom:0;background:#bbf7d0;border-radius:5px"></div><div style="position:absolute;left:calc(${cgp}% - 2px);top:-3px;width:4px;height:16px;border-radius:2px;background:#0f172a"></div></div>
     <div style="display:flex;justify-content:space-between;font-size:9px;color:#94a3b8;margin-top:3px"><span>10%</span><span>safe 18–33%</span><span>40%</span></div>`+
    kv('Main deck positions',(load?a.loaded:a.onboard)+' / 8')+kv('Parcels on board',a.parcels.toLocaleString('en-US'))+kv(load?'Departure':'Next',load?f.dep:state.next.id+' · '+state.next.dep)+kv('Destination',load?'HBR · Harbor Air Cargo':'WH-01 · WH-03 by truck')+
    (load?`<button class="primary" data-a="closeflt" ${done&&!f.closed?'':'disabled'}>${f.closed?'Flight closed':done?'Close flight & request pushback':'Close flight · '+(8-a.loaded-state.ulds.filter(u=>u.state==='offloaded').length)+' positions left'}</button>`
      :`<button class="primary" data-a="release" ${done&&!f.released?'':'disabled'}>${f.released?'Aircraft released':done?'Release aircraft':'Release aircraft · '+a.onboard+' ULDs on board'}</button>`)}
  if(e.type==='uld'){const u=d;
    return head('#f1f5f9','box','#475569',(u.kind==='AKE'?'CONTAINER':'PALLET')+' · ULD',u.id,u.parcels+' parcels · '+u.ship.id)+
    `<div class="row-status">${uldPill(u)}<span>${u.state==='building'?'Build in progress · '+u.pos+' reserved':u.state==='ready'?'Staged · waiting for tug':u.state==='breakdown'?'Being broken down for trucks':'—'}</span></div>`+
    (u.state==='building'?`<div class="alertbox ${f.cut<1200?'bad':'warn'}">${ic('warn',f.cut<1200?'#b91c1c':'#b45309',16)}<span><b>Not built yet.</b> Cut-off in <b data-cut>${mmss(f.cut)}</b> — prioritize to make the flight.</span></div>`:'')+
    (u.damaged?`<div class="alertbox warn">${ic('warn','#b45309',16)}<span><b>Damage check.</b> Corner dent reported — inspect before release.</span></div>`:'')+
    kv('Weight',u.kg.toLocaleString('en-US')+' kg')+kv('Volume',u.vol+' m³')+kv('Position',u.pos)+kv('Flight',u.flight,true)+kv('Destination',u.ship.to)+
    (u.state==='building'?`<button class="primary" data-a="prio">Prioritize build</button><button class="secondary" data-a="offload">Offload to next flight (${state.next.id})</button>`:'')+
    (u.damaged?`<button class="primary" data-a="inspect">Mark inspected</button>`:'')}
  if(e.type==='tug'){const st=d;return head('#eaf1ff','truck','#2563eb','TUG · AIRSIDE',st.id,'Train of 3 dollies · '+st.driver)+
    `<div class="row-status">${pill(st.leg==='To stand'?'Heading to stand':'Returning to terminal','info')}<span>${st.leg==='To stand'?(load?'Bringing ULDs to Stand 3':'Empty dollies to Stand 3'):(load?'Empty dollies back':'Bringing ULDs to breakdown')}</span></div>`+
    kv('ULDs on train',AIR.tug.train[0].getObjectByName('cargo').visible?'3':'0')+kv('Speed','12 km/h')+kv('Trips today',st.cycles)+kv('Zone','Apron · Stand 3')}
  if(e.type==='loader'){const L=d;return head('#fef3c7','box','#b45309','HIGH LOADER',L.id,'Stand 3 · main deck door')+
    `<div class="row-status">${pill(L.phase,L.phase==='Idle'?'neutral':'info')}<span>${L.cur?L.cur.id+' · '+L.cur.pos:'Waiting for next ULD'}</span></div>`+
    kv('Lift height',(AIR.loader.getObjectByName('plat').position.y).toFixed(1)+' m')+kv('Max load','7 t')+kv('Cycles today',L.cycles)+kv('Operator','Ethan Brooks')}
  if(e.type==='warehouse'){return head('#eaf1ff','plane','#2563eb','AIR CARGO HUB · '+s.code,s.name,'3 truck docks · Stand 3 active')+
    `<div class="row-status">${pill(state.offline?'Offline':'Operational',state.offline?'danger':'success')}<span>${isLoad()?'Outbound wave':'Inbound wave'}</span></div>`+
    kv('Flights today','6')+kv('ULDs in process',a.total-(load?a.loaded:a.unl))+kv('Parcels today','12,480')+kv('Next departure',state.next.id+' · '+state.next.dep)+
    `<div class="sec">FLIGHTS</div><button class="inv" data-sel="${f.id}"><span><div class="n">${f.id} · ${f.from} → ${f.to}</div><div class="q">${load?'Departs '+f.dep:'Arrived '+f.arr}</div></span>${load?pill('Loading','success'):pill('Unloading','success')}</button><div class="inv"><span><div class="n">${state.next.id}</div><div class="q">${'Departs '+state.next.dep}</div></span>${pill('Scheduled','neutral')}</div>`}
  if(e.type==='forklift'){return head('#fef3c7','fork','#b45309','FORKLIFT · '+s.id,d.id,d.operator+' · '+d.model)+`<div class="row-status">${opPill(d.op)}<span>${d.op} ${d.truck} at ${state.docks[d.dock].id}</span></div>`+batt(d.battery)+kv('Moves today',d.moves)+kv('Speed',d.speed+' km/h')+kv('Site',s.name)}
  return ''}
const STEPS_AIR={load:['Received at hub','Built into ULD','At stand','Loaded on aircraft','Departed'],unload:['Arrived','Unloaded','Broken down','On truck','Delivered']};
function renderShipAir(){const load=isLoad();let u=selected&&ents[selected]?.type==='uld'?ents[selected].data:null;if(!u)u=state.ulds.find(x=>x.featured);
  const st=load?(state.flight.closed&&u.state==='loaded'?4:{building:1,ready:2,'on dolly':2,loaded:3,offloaded:1}[u.state]):{onboard:1,unloading:1,breakdown:2}[u.state];
  const S=STEPS_AIR[load?'load':'unload'];const icons=load?['clip','box','plane','check','plane']:['plane','box','box','truck','check'];const times=[-140,-62,-25,-4,30];
  const lab=i=>i===st&&load&&i===1?'Building':i===st&&load&&i===2?'Staged':S[i];
  $('ship').innerHTML=`<div class="track"><div class="th">${ic('plane','#2563eb',18)}Shipment Tracking<span class="r">${u.id} · ${state.flight.id}</span></div>
  <div class="stepper"><div class="line" style="left:10%;right:10%"></div><div class="line done" style="left:10%;width:${st*20}%"></div>
  ${S.map((_,i)=>`<div class="step ${i<st?'done':i===st?'current':'todo'}"><div class="sdot">${ic(icons[i],i<=st?'#fff':'#64748b',13)}</div><div class="sl">${lab(i)}</div><div class="st">${i<st?hhmm(times[i]):i===st?'now':'—'}</div></div>`).join('')}</div></div>
  <button class="shipcard" data-sel="${ents[u.id]?u.id:state.flight.id}"><div class="thumb" style="background:#eaf1ff;width:56px;height:56px">${ic('box','#2563eb',28)}</div><div style="flex:1;min-width:0"><div class="id">${u.ship.id}</div><div class="to">To: ${u.ship.to}</div><div style="margin-top:4px">${uldPill(u)}</div><div class="meta">${u.featured?'Route: WH-04 → LKS → HBR → WH-01':u.id+' · '+u.pos}</div></div>${ic('chevR','#64748b')}</button>`}
function renderOpsAir(){const s=state.site,f=state.flight,a=airStats(),load=isLoad();
  const tabs=[['Flights','1/2'],['ULDs',(load?a.ready:a.unl)+'/'+a.total],['Equipment',String(2+state.fls.length)]];let rows='';
  if(opsTab==='Flights')rows=`<button class="orow ${selected===f.id?'sel':''}" data-sel="${f.id}" data-focus="1"><div class="oid"><b>${f.id.replace(' ','')}</b><small>${f.from}→${f.to}</small></div><div class="od">${load?'Loading · departs '+f.dep:'Unloading · arrived '+f.arr}</div><div class="op">${pill(load?(f.closed?'Closed':'Loading'):'Unloading',f.closed?'neutral':'success')}</div><div class="opr"><div class="bar"><i style="width:${(load?a.loaded:a.unl)/8*100}%"></i></div>${load?a.loaded:a.unl}/8</div>${ic('chevR','#64748b',14)}</button>
   <div class="orow"><div class="oid"><b>${state.next.id.replace(' ','')}</b><small>${s.code}→${state.next.dest}</small></div><div class="od">Departs ${state.next.dep}</div><div class="op">${pill('Scheduled','neutral')}</div><div class="opr"><div class="bar"><i style="width:0"></i></div>0/8</div><span style="width:14px"></span></div>`;
  if(opsTab==='ULDs')rows=state.ulds.map(u=>`<button class="orow ${selected===u.id?'sel':''}" data-sel="${ents[u.id]?u.id:f.id}" data-focus="1"><div class="oid"><b>${u.kind}</b><small>${u.id.slice(4)}</small></div><div class="od">${u.pos} · ${(u.kg/1000).toFixed(1)} t · ${u.parcels} pcs</div><div class="op">${uldPill(u)}</div><div class="opr"><span class="muted">${u.ship.id}</span></div>${ic('chevR','#64748b',14)}</button>`).join('');
  if(opsTab==='Equipment'){const L=state.loader,T=state.tug;rows=`<button class="orow" data-sel="${T.id}" data-focus="1"><div class="oid"><b>TUG-1</b><small>Apron</small></div><div class="od">${T.leg==='To stand'?'Heading to stand':'Returning to terminal'}</div><div class="op">${pill('Moving','info')}</div><div class="opr"><span class="muted">3 dollies</span></div>${ic('chevR','#64748b',14)}</button>
    <button class="orow" data-sel="${L.id}" data-focus="1"><div class="oid"><b>KL-1</b><small>Stand 3</small></div><div class="od">High loader · ${L.phase}</div><div class="op">${pill(L.phase==='Idle'?'Idle':'In use',L.phase==='Idle'?'neutral':'warning')}</div><div class="opr"><span class="muted">${L.cycles} cycles</span></div>${ic('chevR','#64748b',14)}</button>`+
    state.fls.map(fl=>`<button class="orow" data-sel="${fl.id}" data-focus="1"><div class="oid"><b>${fl.id}</b><small>${s.id}</small></div><div class="od">${fl.op} ${fl.truck} at ${state.docks[fl.dock].id}</div><div class="op">${opPill(fl.op)}</div><div class="opr"><div class="bar"><i style="width:${fl.battery}%"></i></div>${fl.battery}%</div>${ic('chevR','#64748b',14)}</button>`).join('')}
  $('ops').innerHTML=`<div class="tabs"><div class="thumb" style="width:24px;height:24px;border-radius:6px;background:#eaf1ff">${ic('grid','#2563eb',14)}</div><div class="seg">${tabs.map(([n,c])=>`<button class="tab ${opsTab===n?'on':''}" data-tab="${n}">${n} <span>${c}</span></button>`).join('')}</div><div class="spacer"></div><span class="muted" style="font-size:11px">${s.name}</span></div><div class="opsrows">${rows}</div>`}
function airAlerts(a){const f=state.flight;
  state.ulds.forEach(u=>{if(isLoad()&&u.state==='building')a.push({id:u.id,lvl:f.cut<1200?'bad':'warn',title:'Cut-off risk · '+u.id,sub:'Not built · cut-off in '+mmss(f.cut),tag:'Not built'});
    if(u.damaged)a.push({id:ents[u.id]?u.id:f.id,lvl:'warn',title:'Damage check · '+u.id,sub:'Corner dent reported · '+u.pos,tag:'Damage check'})})}
function airTag(e){const d=e.data;if(e.type==='aircraft')return isLoad()?(d.closed?'Closed · pushback':'Loading · '+airStats().loaded+'/8'):'Unloading · '+airStats().onboard+' left';
  if(e.type==='uld')return (ULD_STATE[d.state]||[d.state])[0];if(e.type==='tug')return d.leg==='To stand'?'Heading to stand':'Returning to terminal';if(e.type==='loader')return d.phase;return null}
function airAction(a){const e=ents[selected];if(!e)return false;const f=state.flight;
  if(a==='prio'){const u=e.data;u.state='ready';const slot=e.slot;removeUldEnt(u.id);addUldEnt(u,slot);select(u.id);toast(u.id+' built · staged for Stand 3');renderAll();return true}
  if(a==='offload'){const u=e.data;u.state='offloaded';u.flight=state.next.id;removeUldEnt(u.id);toast(u.id+' moved to '+state.next.id,'clock','#93c5fd');renderAll();return true}
  if(a==='inspect'){e.data.damaged=false;toast(e.data.id+' inspected · released to breakdown');renderAll();return true}
  if(a==='closeflt'){f.closed=true;toast(f.id+' closed · pushback requested','plane','#93c5fd');renderAll();return true}
  if(a==='release'&&e.type==='aircraft'){f.released=true;toast(f.id+' released · ready for next rotation','plane','#93c5fd');renderAll();return true}
  return false}

/* ---------- route ribbon + travel ---------- */
const ROUTE=[['WH-04','home'],['AIR-01','plane'],['FLIGHT','plane'],['AIR-02','plane'],['WH-01','home']];
function renderRoute(){const cur=state.site.id;$('route').innerHTML=`<div class="rl" style="display:flex;align-items:center">Route · #SHP-78570${state.linkX!=null?'<button class="chip" data-a="overview" style="margin-left:auto;padding:2px 7px">⤢ Whole road</button>':''}<button class="chip ${state.kind==='journey'?'on':''}" data-go="ROUTE" style="margin-left:${state.linkX!=null?'4px':'auto'};padding:2px 7px">▶ Journey</button></div>${state.kind!=='journey'?`<button class="riskline" data-a="risk">${ic('warn','#b45309',13)}<span>Downstream: locker L-03 almost full · 2/48 free</span></button>`:''}<div class="rc">${ROUTE.map(([id,i],k)=>`${k?'<span class="ra">›</span>':''}<button class="chip ${id===cur?'on':''}" data-go="${id==='FLIGHT'?'AIR-02':id}" title="${id==='FLIGHT'?'Flight YT 482':id}">${id==='FLIGHT'?ic('plane',id===cur?'#fff':'#2563eb',13)+'YT 482':id}</button>`).join('')}</div>`}
const LEGS={'WH-04>AIR-01':['truck','Driving to AIR-01 · Lakeside Air Cargo','TRK-2311 · #SHP-78570 · 34 km · 42 min'],'AIR-01>AIR-02':['plane','Flying YT 482 · LKS → HBR','Freighter · 8 ULDs · 2 h 10 min'],
  'AIR-02>WH-01':['truck','Driving to WH-01 · Riverside Hub','TRK-2405 · #SHP-78570 · 28 km · 35 min'],'WH-04>AIR-02':['plane','Flying YT 482 · LKS → HBR','via AIR-01 · Lakeside Air Cargo']};
function travelTo(id){if(!id)return;if(id===state.site.id){if(id==='ROUTE'&&J.pending!=null){state.jpT=J.pending;J.pending=null}return}const leg=LEGS[state.site.id+'>'+id]||['home','Switching to '+id,SITES.find(x=>x.id===id).name];
  $('tIcon').innerHTML=ic(leg[0],'#2563eb',22);$('tt1').textContent=leg[1];$('tt2').textContent=leg[2];const tr=$('travel');tr.classList.add('on');
  const bar=tr.querySelector('.tbar i');bar.style.transition='none';bar.style.width='0';void bar.offsetWidth;bar.style.transition='width 1.1s ease-in-out';bar.style.width='100%';
  const linked=ents.LINK&&ents.LINK.go===id;tween={t:0,dur:1.1,fromT:controls.target.clone(),toT:linked?new THREE.Vector3(state.linkX,0,-4):controls.target.clone().add(new THREE.Vector3(leg[0]==='plane'?0:70,0,0)),off:camera.position.clone().sub(controls.target),fromZ:camera.zoom,toZ:linked?.55:camera.zoom*(leg[0]==='plane'?.6:1)};
  setTimeout(()=>{loadSite(id);setTimeout(()=>tr.classList.remove('on'),250)},1150)}

/* ================= ONE WORLD: road leads warehouse ⇄ airport ================= */
function addRunway(x1,x2,z){const asph=M('#b4bfcf',{roughness:.9}),w=M('#ffffff');const cx=(x1+x2)/2,L=x2-x1;
  root.add(mesh(new THREE.BoxGeometry(L+10,.06,12),M('#c7d0dd',{roughness:.9}),cx,.03,z,false));
  root.add(mesh(new THREE.BoxGeometry(L,.08,9),asph,cx,.04,z,false));
  for(let x=x1+4;x<x2-4;x+=7)root.add(mesh(new THREE.BoxGeometry(3.5,.02,.28),w,x,.09,z,false));
  [x1+2,x2-2].forEach(x=>{for(let k=-3;k<=3;k++)if(k)root.add(mesh(new THREE.BoxGeometry(4,.02,.55),w,x,.09,z+k*1.1,false))});
  [z+4.3,z-4.3].forEach(zz=>root.add(mesh(new THREE.BoxGeometry(L-2,.02,.18),w,cx,.09,zz,false)));
  for(let x=x1;x<x2;x+=10)[z+5.5,z-5.5].forEach(zz=>root.add(mesh(new THREE.CylinderGeometry(.15,.15,.35,8),M('#fff3b0',{emissive:'#ffe27a',emissiveIntensity:.9}),x,.18,zz,false)))}
function addLink(group,id,label,h){group.userData.entityId=id;root.add(group);ents[id]={id,type:'link',obj:group,data:{label},h};clickable.push(group)}
// airport district shown at the end of the road in the warehouse scene
function buildAirportDistrict(x0,opt={}){const g=new THREE.Group();const blue=M('#2f58db',{roughness:.5}),yel=M('#f2c94c',{roughness:.6});
  // access road from the main road
  g.add(mesh(new THREE.BoxGeometry(10,.06,6),M('#cdd6e4',{roughness:.95}),x0+8,.03,24,false));
  g.add(mesh(RB(34,.12,16,.3),M('#f1f4f9',{roughness:.9}),x0+15,.03,14,false));
  g.add(mesh(RB(118,.1,66,.3),M('#d9e0ea',{roughness:.85}),x0+92,.025,-12,false));
  // terminal
  const wt=stripeTex('#eef1f7','#dfe4ee',10,true);wt.repeat.set(18,1);
  g.add(mesh(new THREE.BoxGeometry(30,10,20),[new THREE.MeshStandardMaterial({map:wt}),new THREE.MeshStandardMaterial({map:wt}),M('#d7deea'),M('#d7deea'),new THREE.MeshStandardMaterial({map:wt}),new THREE.MeshStandardMaterial({map:wt})],x0+15,5,-4));
  g.add(mesh(RB(30.3,1.1,20.3,.05),blue,x0+15,.55,-4));g.add(mesh(RB(30.5,.7,20.5,.05),blue,x0+15,10.2,-4));
  g.add(mesh(new THREE.BoxGeometry(9,7.6,.15),M('#9cc3ff',{emissive:'#6aa5ff',emissiveIntensity:.22,roughness:.15,metalness:.25}),x0+24,5,6.05,false));
  [x0+4,x0+11].forEach(x=>{g.add(mesh(RB(4.7,5.3,.5,.08),blue,x,2.65,6.2));g.add(mesh(new THREE.BoxGeometry(3.8,4.4,.2),M('#1b2540'),x,2.4,6.35,false))});
  [[x0+4,'#2f5be0'],[x0+11,'#f4f6fb']].forEach(([x,c])=>{if(opt.freeDock1&&x===x0+4)return;const t=makeTruck(c);t.position.set(x,0,13.6);g.add(t)});
  const tw=makeTower();tw.position.set(x0+12,0,-30);tw.scale.setScalar(.85);g.add(tw);
  // stands with aircraft
  [[x0+60,true],[x0+108,false]].forEach(([x,busy],k)=>{if(!(opt.freeStand2&&k===1)){const p=makePlane();p.position.set(x,0,-10);g.add(p)}
    g.add(mesh(new THREE.BoxGeometry(.26,.02,60),yel,x,.08,-14,false));g.add(mesh(new THREE.BoxGeometry(7,.02,.3),yel,x,.08,15.3,false));
    if(busy){const kl=makeLoader();kl.position.set(x+7.5,0,1);kl.rotation.y=-Math.PI/2;setLoaderH(kl,4.2);kl.getObjectByName('puld').visible=true;g.add(kl);
      const tug=makeTug();tug.position.set(x+7.5,0,7);g.add(tug);
      for(let i=0;i<3;i++){const d=makeDolly();d.position.set(x+7.5,0,11.4+i*4.4);const c=d.getObjectByName('cargo');c.add(makeULD(i===1?'AKE':'PMC',2));g.add(d)}}
    else{for(let i=0;i<3;i++){const d=makeDolly();d.position.set(x+9+i*3.2,0,8);d.rotation.y=.2;const c=d.getObjectByName('cargo');c.add(makeULD('PMC',2));g.add(d)}}});
  [[x0+30,22],[x0+84,22],[x0+132,22],[x0+140,-30]].forEach(([x,z])=>{const p=makePole();p.position.set(x,0,z);g.add(p)});
  for(let z=8;z<=22;z+=2.4)g.add(mesh(new THREE.BoxGeometry(.12,1.6,.12),M('#c8d0dd'),x0+32,.8,z));
  root.add(g);
  addRunway(x0+20,x0+230,-58);
  [x0+60,x0+108].forEach(x=>{root.add(mesh(new THREE.BoxGeometry(8,.07,10),M('#b4bfcf',{roughness:.9}),x,.035,-48.5,false))});
  if(opt.noLink)return;
  const hit=new THREE.Mesh(new THREE.BoxGeometry(150,14,80),new THREE.MeshBasicMaterial({visible:false}));hit.position.set(x0+75,7,-10);
  const link=new THREE.Group();link.add(hit);addLink(link,'LINK','AIR-01',16);ents.LINK.labelPos=new THREE.Vector3(x0+15,0,-4);ents.LINK.go=state.site.id==='WH-01'?'AIR-02':'AIR-01';
  state.linkX=x0+55}
// warehouse district shown at the other end of the road in the air-hub scene
function buildWarehouseDistrict(x0,goId){const g=new THREE.Group();const blue=M('#2f58db',{roughness:.5});const W2=44;
  g.add(mesh(RB(W2+14,.12,24,.4),M('#f1f4f9',{roughness:.9}),x0,.03,12,false));
  const wt=stripeTex('#eef1f7','#dfe4ee',10,true);wt.repeat.set(W2/1.6,1);const wm=new THREE.MeshStandardMaterial({map:wt,roughness:.65});
  g.add(mesh(new THREE.BoxGeometry(W2,9,20),[wm,wm,M('#d7deea'),M('#d7deea'),wm,wm],x0,4.5,-10));
  g.add(mesh(RB(W2+.3,1.1,20.3,.05),blue,x0,.55,-10));
  const n=Math.round(W2/8.8),sw=W2/n;for(let i=0;i<n;i++){const sh=new THREE.Shape();sh.moveTo(0,0);sh.lineTo(sw,0);sh.lineTo(sw*.78,3.2);sh.lineTo(0,0);
    g.add(mesh(new THREE.ExtrudeGeometry(sh,{depth:20.6,bevelEnabled:false}),M('#3a63e3',{roughness:.45}),x0-W2/2+i*sw,9,-20.3))}
  for(let i=0;i<5;i++){const x=x0-W2/2+6+i*8;g.add(mesh(RB(4.7,5.3,.5,.08),blue,x,2.65,.18));g.add(mesh(new THREE.BoxGeometry(3.8,4.4,.2),M(i%2?'#dfe5ef':'#1b2540'),x,2.4,.35,false));
    if(i%2===0){const t=makeTruck(i===2?'#f4f6fb':'#2f5be0');t.position.set(x,0,7.5);g.add(t)}}
  for(let i=0;i<6;i++){const tr=makeTree(1,rngOf(i+9));tr.position.set(x0-W2/2-8+(i%2)*4,0,-14+i*4);g.add(tr)}
  root.add(g);
  if(!goId)return;
  const hit=new THREE.Mesh(new THREE.BoxGeometry(W2+10,14,30),new THREE.MeshBasicMaterial({visible:false}));hit.position.set(x0,7,-4);
  const link=new THREE.Group();link.add(hit);addLink(link,'LINK',goId,14);ents.LINK.labelPos=new THREE.Vector3(x0,0,-10);ents.LINK.go=goId;state.linkX=x0}

/* ================= JOURNEY: scroll along the parcel's road ================= */
const L2=(en,uk)=>LANG==='uk'?uk:en;

/* ---------- depot park: a small town of parcel terminals behind the yard (unbranded) ---------- */
function makeTerminal(nDoors,r,big=false){const g=new THREE.Group();const blue=M('#2f58db',{roughness:.5});const w=nDoors*6+(big?14:8),d=big?24:18,H=big?10:7.5;
  const wt=stripeTex('#eef1f7','#dfe4ee',10,true);wt.repeat.set(w/1.6,1);const wm=new THREE.MeshStandardMaterial({map:wt,roughness:.65});
  g.add(mesh(new THREE.BoxGeometry(w,H,d),[wm,wm,M('#dfe5ef'),M('#dfe5ef'),wm,wm],0,H/2,0));
  g.add(mesh(RB(w+.3,1,d+.3,.05),blue,0,.5,0));g.add(mesh(new THREE.BoxGeometry(w+.4,.7,d+.4),blue,0,H+.1,0));
  for(let i=0;i<Math.floor(w/9);i++)g.add(mesh(RB(2.4,.9,3,.15),M('#c9d1de'),-w/2+5+i*9,H+.9,-d/4,false));
  g.add(mesh(new THREE.BoxGeometry(w*.7,.1,1.4),M('#c8d8ff',{emissive:'#9ec0ff',emissiveIntensity:.15}),0,H+.5,0,false));
  const doors=[];const x0=-w/2+(big?10:6);
  for(let i=0;i<nDoors;i++){const x=x0+i*6;const open=r()<.55;
    g.add(mesh(RB(4.6,5,.4,.08),blue,x,2.5,d/2+.1));g.add(mesh(new THREE.BoxGeometry(3.7,4.2,.1),M('#1b2540'),x,2.2,d/2+.25,false));
    if(open)g.add(mesh(new THREE.PlaneGeometry(3.3,3.6),M('#ffe6bd',{emissive:'#ffd59a',emissiveIntensity:.35}),x,2.1,d/2+.31,false));
    const dr=mesh(new THREE.BoxGeometry(3.7,4.2,.14),new THREE.MeshStandardMaterial({map:stripeTex('#e6ebf3','#cfd7e4',14,false),roughness:.6}),x,2.2,d/2+.4,false);
    if(open){dr.scale.y=.1;dr.position.y=4.1}g.add(dr);
    g.add(mesh(RB(.45,.2,.12,.04),M(open?'#f59e0b':'#22c55e',{emissive:open?'#f59e0b':'#22c55e',emissiveIntensity:1}),x+1.8,4.7,d/2+.36,false));
    doors.push({x,open})}
  // office corner with glazing
  g.add(mesh(new THREE.BoxGeometry(big?8:5,3.2,.12),M('#9cc3ff',{emissive:'#6aa5ff',emissiveIntensity:.22,roughness:.15,metalness:.25}),w/2-(big?5:3.4),H*.55,d/2+.08,false));
  g.add(mesh(RB(big?9:6,1.2,.3,.1),blue,w/2-(big?5:3.4),H-.9,d/2+.2,false));
  return {g,doors,w,d,H}}
const CAMPUS_CARGO=[['E-commerce parcels','pcs'],['Pallets · electronics','plt'],['Pharma · cold chain','plt'],['Food · ambient','plt'],['Furniture · oversize','pcs'],['Documents','bags'],['Returns','pcs'],['Auto parts','plt'],['Textiles','plt']];
const CAMPUS_DEST=['Kyiv','Lviv','Odesa','Dnipro','Kharkiv','Poltava','Vinnytsia','Zaporizhzhia','Chernihiv'];
function buildDepotCampus(x0,z0,cols,rows,seed,o={}){const r=rngOf(seed);const g=new THREE.Group();const camp={terminals:[],doors:[]};let tn=0,vn=0;const pref=o.prefix||'DP';const N0=Date.now();
  const hitM=new THREE.MeshBasicMaterial({transparent:true,opacity:0,depthWrite:false});
  const CW=84,CD=56,asph=M('#c4cddc',{roughness:.95}),pave=M('#f1f4f9',{roughness:.9}),line=M('#ffffff'),yel=M('#f2c94c',{roughness:.6}),grass=M('#d3eedc',{roughness:1});
  const xa=x0-CW/2,xb=x0+cols*CW-CW/2,zTop=z0-rows*CD;
  // street grid: east-west streets south of every row, north-south streets between columns
  const ew=[];for(let k=0;k<=rows;k++){const z=z0+14-k*CD;ew.push(z);g.add(mesh(new THREE.BoxGeometry(xb-xa+8,.05,9),asph,(xa+xb)/2,.03,z,false));for(let x=xa;x<xb;x+=6)g.add(mesh(new THREE.BoxGeometry(2.6,.02,.2),line,x,.07,z,false))}
  for(let c=0;c<=cols;c++){const x=xa+c*CW;g.add(mesh(new THREE.BoxGeometry(9,.05,ew[0]-ew[rows]),asph,x,.032,(ew[0]+ew[rows])/2,false))}
  if(o.link){const [lx,lz]=o.link;g.add(mesh(new THREE.BoxGeometry(9,.05,lz-ew[0]),asph,lx,.034,(lz+ew[0])/2,false));for(let z=ew[0]+3;z<lz;z+=5)g.add(mesh(new THREE.BoxGeometry(.2,.02,2.4),line,lx,.08,z,false))}
  const kinds=o.kinds||['hub','terminal','vans','terminal','branch','terminal'];let n=0;
  for(let rr=0;rr<rows;rr++)for(let c=0;c<cols;c++){const cx=x0+c*CW,cz=z0-rr*CD;const kind=kinds[n++%kinds.length];
    g.add(mesh(new THREE.BoxGeometry(CW-11,.04,CD-11),pave,cx,.02,cz-14,false));
    if(kind==='hub'||kind==='terminal'){const big=kind==='hub';const T=makeTerminal(big?10:7+Math.floor(r()*2),r,big);const tz=cz-14-(big?2:0);T.g.position.set(cx,0,tz);g.add(T.g);
      tn++;const tid=pref+'-'+tn;const spec=big?[0,5,6]:[[1,3,7],[2,3],[1,4,8],[0,5,6],[7,1]][tn%5];
      const trec={id:tid,name:big?'Parcel hub':'Cargo terminal',kind,big,doors:[],cargoMix:spec.map(i=>CAMPUS_CARGO[i][0]),pos:new THREE.Vector3(cx,T.H+2,tz)};camp.terminals.push(trec);
      if(o.track){T.g.userData.entityId=tid;clickable.push(T.g);ents[tid]={id:tid,type:'terminal',obj:T.g,data:trec,h:T.H+1.5,foot:[T.w+2.5,T.d+2.5,0,0]}}
      dockChips.push({el:null,pos:new THREE.Vector3(cx,T.H+2.4,tz),text:tid+' · '+trec.name,cls:'tchip',minZoom:.18});
      const fz=tz+T.d/2;for(let k=0;k<T.doors.length;k++){const dd=T.doors[k];g.add(mesh(new THREE.BoxGeometry(.18,.02,9),yel,cx+dd.x-3,.06,fz+5,false));
        const did=pref+tn+'-D'+(k+1);const ci=spec[Math.floor(r()*spec.length)];const [cargo,unit]=CAMPUS_CARGO[ci];let veh=null,isVan=false;
        if(dd.open&&r()<.8){isVan=ci===0||ci===5?r()<.7:r()<.2;const tr=isVan?makeVan():makeTruck(['#2f5be0','#f4f6fb','#2f5be0','#475569'][Math.floor(r()*4)]);tr.position.set(cx+dd.x,0,fz+(isVan?3.7:7));g.add(tr);veh=(isVan?'VAN-':'TRK-')+(isVan?410+(vn++):3100+(vn++)*7)}
        const qty=unit==='plt'?(isVan?4:8+Math.floor(r()*18)):unit==='bags'?20+Math.floor(r()*60):120+Math.floor(r()*900);
        const dir=r()<.5?'Inbound':'Outbound';
        const dr={id:did,label:'D'+(k+1),term:tid,termName:trec.name,_c:1,in3d:true,type:'Terminal dock',vehicle:veh,vtype:veh?(isVan?'Van 3.5 t':'Tractor + trailer'):null,cargo,unit,qty,dir,
          weight:Math.round(qty*(unit==='plt'?(ci===4?380:520):unit==='bags'?6:2.4)),ship:veh?'#SHP-'+(81200+tn*40+k*3):null,dest:dir==='Outbound'?CAMPUS_DEST[Math.floor(r()*CAMPUS_DEST.length)]:'from '+CAMPUS_DEST[Math.floor(r()*CAMPUS_DEST.length)],
          base:veh?(dir==='Outbound'?'Loading':'Unloading'):(dd.open?'Reserved':r()<.12?'Maintenance':'Available'),p0:veh?5+Math.floor(r()*70):0,rate:veh?.6+r()*1.4:0,t0:N0,arr:veh?N0-(10+Math.floor(r()*70))*60000:null,ov:null,
          temp:ci===2?'+2…+8 °C':null,pos:new THREE.Vector3(cx+dd.x,5.55,fz+.6)};
        if(dr.base==='Reserved'){dr.sched=N0+(10+Math.floor(r()*80))*60000;dr.cargo=cargo}
        trec.doors.push(dr);camp.doors.push(dr);
        dr.chip={el:null,pos:dr.pos,text:dr.label,cls:'',minZoom:.45,door:dr};dockChips.push(dr.chip);
        if(o.track){const hg=new THREE.Group();hg.position.set(cx+dd.x,0,fz+4.5);const hb=new THREE.Mesh(new THREE.BoxGeometry(5,5.5,9),hitM);hb.position.y=2.75;hg.add(hb);hg.userData.entityId=did;g.add(hg);clickable.push(hg);
          ents[did]={id:did,type:'tdock',obj:hg,data:dr,h:6}}}
      for(let k=0;k<3;k++){const p=makePallet(1+Math.floor(r()*2),false,.95);p.position.set(cx+T.w/2+3,0,tz-6+k*3);g.add(p)}}
    if(kind==='vans'){for(let row=0;row<2;row++)for(let k=0;k<7;k++){const v=makeVan();v.position.set(cx-27+k*5.2,0,cz-26+row*11);v.rotation.y=row?Math.PI:0;g.add(v);
        g.add(mesh(new THREE.BoxGeometry(.16,.02,6),line,cx-29.6+k*5.2,.06,cz-26+row*11,false))}
      const b=makeBranch();b.position.set(cx+24,0,cz-22);b.rotation.y=-Math.PI/2;g.add(b);
      for(let k=0;k<4;k++){const ch=mesh(RB(1,1.8,.8,.15),M('#2f58db'),cx-27+k*5.2,.9,cz-12,false);g.add(ch)}}
    if(kind==='branch'){const b=makeBranch();b.position.set(cx-14,0,cz-16);g.add(b);
      for(let k=0;k<3;k++){const lk=makeLocker();lk.position.set(cx+10+k*6,0,cz-24);g.add(lk)}
      const p=mesh(new THREE.PlaneGeometry(26,14),grass,cx+16,.03,cz-8,false);p.rotation.x=-Math.PI/2;g.add(p);
      for(let k=0;k<6;k++){const t=makeTree(.7+r()*.4,r);t.position.set(cx+6+r()*22,0,cz-13+r()*9);g.add(t)}
      for(let k=0;k<3;k++){const c2=makeCar(r);c2.position.set(cx-24+k*3.6,0,cz-4);g.add(c2)}}
    // corner trees
    [[-CW/2+8,-CD+18],[CW/2-8,-CD+18]].forEach(([dx,dz])=>{const t=makeTree(.8,r);t.position.set(cx+dx,0,cz+dz);g.add(t)});
  }
  g.userData.exclude=true;g.traverse(m=>{if(m.isMesh)m.castShadow=false});root.add(g);if(o.track&&state)state.campus=camp;
  // vans driving on the park streets
  ew.forEach((z,k)=>[-1,1].forEach(sd=>{const v=makeVan();v.position.set(xa+r()*(xb-xa),0,z+sd*2.2);root.add(v);movers.push({obj:v,loopRoad:true,speed:sd*(5+r()*3),lo:xa,hi:xb})}));
  return {xa,xb,zTop}}
const JA=[[0,0,2,.85],[36,0,20,.9],[140,0,-12,.62],[385,34,-56,.5],[552,0,-12,.62],[830,0,-44,.5],[862,0,22,.95],[946,0,16,1.15],[1006,0,10,1.15]];
const JST=[
 {icon:'home',t:['Warehouse WH-04','Склад WH-04'],s:['Picked, packed, loaded on TRK-2311','Зібрано, запаковано, завантажено в TRK-2311'],st:['Loaded on truck','У вантажівці'],
  k:[['Orders picked','Зібрано замовлень','1,284','+6%'],['Dock-to-truck','Від доку до вантажівки','38 min',''],['Pick accuracy','Точність збирання','99.6%','+0.1%']],
  tr:[['Pick & pack time per order','Час збирання й пакування замовлення'],['Truck dwell at dock','Простій вантажівки біля доку'],['Mis-picks and damaged items','Помилки збирання й пошкодження'],['Forklift utilisation and battery','Завантаженість і заряд навантажувачів']],
  al:[['Truck waiting at gate > 15 min','Вантажівка чекає на в’їзді > 15 хв'],['SKU below reorder point','Товар нижче точки дозамовлення']],
  tb:{n:['Outbound loads','Відвантаження'],c:['Truck','Dock','Pallets','Departs','Status'],cu:['Вантажівка','Док','Палети','Виїзд','Статус'],r:[['TRK-2311','D4','6/6','13:20',['Loaded','Завантажено','success']],['TRK-2291','D3','2/6','13:55',['Loading','Завантаження','info']],['TRK-2357','Gate','—','—',['Waiting 17 min','Чекає 17 хв','warning']]]}},
 {icon:'truck',t:['Linehaul to the airport','Магістраль до аеропорту'],s:['TRK-2311 on the road · 34 km','TRK-2311 у дорозі · 34 км'],st:['On the road','У дорозі'],
  k:[['ETA AIR-01','Прибуття в AIR-01','18 min',''],['Cut-off buffer','Запас до cut-off','+52 min',''],['On-time linehaul','Вчасні рейси','97.1%','+0.8%']],
  tr:[['Live GPS and ETA vs flight cut-off','GPS і прибуття проти cut-off рейсу'],['Route deviations and stops','Відхилення від маршруту й зупинки'],['Temperature and shock sensors','Датчики температури й ударів'],['Driver hours','Години водія']],
  al:[['Cut-off buffer < 20 min','Запас до cut-off < 20 хв'],['Unplanned stop > 10 min','Незапланована зупинка > 10 хв']],
  tb:{n:['Trucks to AIR-01','Вантажівки до AIR-01'],c:['Truck','From','ETA','Buffer','Status'],cu:['Вантажівка','Звідки','Прибуття','Запас','Статус'],r:[['TRK-2311','WH-04','13:58','+52 min',['On time','Вчасно','success']],['TRK-2377','WH-02','14:25','+25 min',['On time','Вчасно','success']],['TRK-2402','WH-05','14:41','+9 min',['At risk','Ризик','warning']]]}},
 {icon:'plane',t:['Air hub AIR-01 · loading','Авіахаб AIR-01 · завантаження'],s:['Built into ULD PMC-31279, loaded on YT 482','Зібрано в ULD PMC-31279, завантажено на YT 482'],st:['In ULD · Stand 3','В ULD · стоянка 3'],
  k:[['Cut-off YT 482','Cut-off YT 482','30:58',''],['ULDs ready','ULD готові','7/8',''],['ULD build time','Час збирання ULD','41 min','−4 min']],
  tr:[['Cut-off readiness per flight','Готовність до cut-off по рейсах'],['ULD fill: volume and weight','Заповнення ULD: об’єм і вага'],['Load plan and center of gravity','План завантаження й центр ваги'],['Offloaded parcels','Посилки, зняті з рейсу']],
  al:[['ULD not built 30 min before cut-off','ULD не зібраний за 30 хв до cut-off'],['CG outside safe range','Центр ваги поза безпечною зоною']],
  tb:{n:['ULDs for YT 482','ULD для YT 482'],c:['ULD','Position','Weight','Parcels','Status'],cu:['ULD','Позиція','Вага','Посилки','Статус'],r:[['PMC-31279','P7','3.1 t','286',['Ready','Готовий','success']],['AKE-31244','P6','0.9 t','74',['To aircraft','До літака','info']],['PMC-31311','P8','—','—',['Not built','Не зібрано','danger']]]}},
 {icon:'plane',t:['Flight YT 482 · LKS → HBR','Рейс YT 482 · LKS → HBR'],s:['Freighter in the air · 2 h 10 min','Вантажний літак у повітрі · 2 год 10 хв'],st:['In flight','У польоті'],
  k:[['Departure delay','Затримка вильоту','+4 min',''],['ETA HBR','Прибуття в HBR','16:15',''],['Load factor','Завантаженість борту','86%','+3%']],
  tr:[['Departure and arrival delay','Затримка вильоту й прибуття'],['Delay minutes caused by cargo','Хвилини затримки через вантаж'],['Load factor by weight and volume','Завантаженість за вагою й об’ємом'],['Temperature-sensitive cargo','Вантаж із температурним режимом']],
  al:[['Arrival delay > 30 min','Затримка прибуття > 30 хв'],['Missed connection at HBR','Пропущена пересадка в HBR']],
  tb:{n:['Flights today','Рейси сьогодні'],c:['Flight','Route','Dep','Arr','Status'],cu:['Рейс','Маршрут','Виліт','Приліт','Статус'],r:[['YT 482','LKS→HBR','14:05','16:15',['In air','У повітрі','info']],['YT 517','LKS→GRV','17:40','19:30',['Scheduled','За розкладом','neutral']],['YT 390','HBR→LKS','12:10','14:20',['Landed','Приземлився','success']]]}},
 {icon:'plane',t:['Air hub AIR-02 · unloading','Авіахаб AIR-02 · вивантаження'],s:['ULD unloaded and broken down for trucks','ULD вивантажено й розформовано для вантажівок'],st:['Breakdown at HBR','Розформування в HBR'],
  k:[['ULDs unloaded','ULD вивантажено','6/8',''],['Breakdown time','Час розформування','27 min','−3 min'],['Damage reports','Звіти про пошкодження','1','']],
  tr:[['Time from landing to unloaded','Час від посадки до вивантаження'],['ULD breakdown time','Час розформування ULD'],['Transfer to trucks by route','Передача у вантажівки за маршрутами'],['Damage and inspections','Пошкодження й огляди']],
  al:[['ULD waiting for breakdown > 45 min','ULD чекає на розформування > 45 хв'],['Damage reported','Повідомлено про пошкодження']],
  tb:{n:['Inbound ULDs','ULD, що прибули'],c:['ULD','From','Parcels','Truck','Status'],cu:['ULD','Звідки','Посилки','Вантажівка','Статус'],r:[['PMC-31279','YT 482','286','TRK-2405',['Breakdown','Розформування','success']],['AKE-31152','YT 482','91','TRK-2419',['Damage check','Перевірка','warning']],['PMC-31088','YT 482','266','—',['On board','На борту','info']]]}},
 {icon:'home',t:['Sorting hub WH-01','Сортувальний хаб WH-01'],s:['Sorted to courier route R-14','Відсортовано на кур’єрський маршрут R-14'],st:['Sorted · route R-14','Відсортовано · R-14'],
  k:[['Parcels sorted / h','Відсортовано / год','4,820','+5%'],['Sort accuracy','Точність сортування','99.7%',''],['Missed route cut','Не встигли на маршрут','0.4%','−0.1%']],
  tr:[['Sort throughput per hour','Пропускна здатність сортування'],['Mis-sorts and re-sorts','Помилки й повторне сортування'],['Parcels per route and van fill','Посилки на маршрут і заповнення бусів'],['Dwell time in the hub','Час перебування в хабі']],
  al:[['Route not dispatched by 08:30','Маршрут не відправлено до 08:30'],['Van over capacity','Бус перевантажено']],
  tb:{n:['Routes ready to dispatch','Маршрути до відправлення'],c:['Route','Van','Parcels','Stops','Status'],cu:['Маршрут','Бус','Посилки','Зупинки','Статус'],r:[['R-14','V-14','142','18',['Loaded','Завантажено','success']],['R-09','V-09','118','15',['Loading','Завантаження','info']],['R-22','V-22','160','21',['Over capacity','Перевантажено','warning']]]}},
 {icon:'truck',t:['Courier van V-14','Кур’єрський бус V-14'],s:['Route R-14 · stop 7 of 18','Маршрут R-14 · зупинка 7 з 18'],st:['Out for delivery','Доставляється'],
  k:[['Stops done','Виконано зупинок','7/18',''],['On-time stops','Вчасні зупинки','94%','+2%'],['First-attempt success','Доставка з 1-ї спроби','91%','+1%']],
  tr:[['Stops done vs plan','Виконані зупинки проти плану'],['ETA window per customer','Вікно прибуття для клієнта'],['Failed attempts and reasons','Невдалі спроби та причини'],['Km and EV battery','Кілометри й заряд електробуса']],
  al:[['Stop late > 20 min','Зупинка запізнюється > 20 хв'],['2nd failed attempt','Друга невдала спроба']],
  tb:{n:['Van V-14 · stops','Бус V-14 · зупинки'],c:['Stop','Type','Parcels','ETA','Status'],cu:['Зупинка','Тип','Посилки','Прибуття','Статус'],r:[['#7','Pickup point','38','15:10',['Arriving','Прибуває','info']],['#8','Parcel locker','24','15:25',['Planned','Заплановано','neutral']],['#6','Door','1','14:52',['Failed · no one home','Невдало · нікого','danger']]]}},
 {icon:'box',t:['Pickup point & parcel locker','Відділення й поштомат'],s:['In locker L-07 · customer notified','У поштоматі L-07 · клієнта сповіщено'],st:['Waiting for pickup','Чекає на отримання'],
  k:[['Parcels waiting','Посилок чекає','312',''],['Locker cells free','Вільних комірок','18/96',''],['Avg time to pickup','Сер. час до отримання','1.6 days','−0.2']],
  tr:[['Occupancy of points and lockers','Заповненість відділень і поштоматів'],['Free storage days left','Скільки днів безкоштовного зберігання лишилось'],['Notifications sent and opened','Сповіщення: надіслано й відкрито'],['COD collected and returns','Накладений платіж і повернення']],
  al:[['Locker > 90% full','Поштомат заповнений > 90%'],['Storage ends tomorrow → reminder','Зберігання закінчується завтра → нагадування']],
  tb:{n:['Points & lockers','Відділення й поштомати'],c:['Point','Type','Waiting','Free','Status'],cu:['Точка','Тип','Чекає','Вільно','Статус'],r:[['PP-112','Pickup point','214','—',['Busy','Завантажене','warning']],['L-07','Locker','62','18/96',['OK','Норма','success']],['L-03','Locker','36','2/48',['Almost full','Майже повний','danger']]]}},
 {icon:'check',t:['Delivered','Доставлено'],s:['Picked up with PIN · rated 5/5','Отримано за PIN-кодом · оцінка 5/5'],st:['Delivered','Доставлено'],
  k:[['End-to-end','Від складу до клієнта','2 d 4 h',''],['SLA','SLA','On time',''],['Customer rating','Оцінка клієнта','4.8/5','+0.1']],
  tr:[['Lead time per leg vs plan','Час кожного етапу проти плану'],['SLA hit rate','Частка доставок у SLA'],['Proof of delivery: PIN, QR, photo','Підтвердження: PIN, QR, фото'],['Customer rating and returns','Оцінка клієнта й повернення']],
  al:[['SLA breach on any leg','Порушення SLA на будь-якому етапі'],['Rating ≤ 3 → follow-up','Оцінка ≤ 3 → зворотний зв’язок']],
  tb:{n:['Journey legs · #SHP-78570','Етапи маршруту · #SHP-78570'],c:['Leg','Plan','Actual','Delta','Status'],cu:['Етап','План','Факт','Різниця','Статус'],r:[['WH-04 → AIR-01','45 min','42 min','−3',['On time','Вчасно','success']],['YT 482','2 h 10 min','2 h 14 min','+4',['On time','Вчасно','success']],['WH-01 → locker','1 d','22 h','−2 h',['Early','Раніше','success']]]}}];
const J={heroes:[],tag:null};
function genJourney(site){site.docks=0;return {site,docks:[],trucks:[],fls:[],chargers:[],pallets:[],jp:0,jpT:0,stage:-1}}
function makeVan(){const g=new THREE.Group();const w=M('#f6f8fc',{roughness:.45}),b=M('#2b54d8'),dark=M('#1e2433'),glass=M('#1c2b47',{roughness:.15,metalness:.3});
  g.add(mesh(RB(2.2,2.3,5.2,.3),w,0,1.6,-.3));g.add(mesh(RB(2.1,1.4,1.4,.3),w,0,1.15,2.6));g.add(mesh(RB(2.24,.25,6.4,.06),b,0,.75,.3));
  g.add(mesh(new THREE.BoxGeometry(1.9,.8,.05),glass,0,2.05,2.1,false));g.add(mesh(new THREE.BoxGeometry(.06,.6,1),glass,1.11,2.0,1.5,false));g.add(mesh(new THREE.BoxGeometry(.06,.6,1),glass,-1.11,2.0,1.5,false));
  const wg=new THREE.CylinderGeometry(.4,.4,.3,16);[[-1,2.1],[1,2.1],[-1,-1.9],[1,-1.9]].forEach(([x,z])=>{const m=mesh(wg,dark,x,.4,z);m.rotation.z=Math.PI/2;g.add(m)});
  [-.7,.7].forEach(x=>g.add(mesh(new THREE.BoxGeometry(.35,.15,.05),M('#fffbe6',{emissive:'#fff1b0',emissiveIntensity:.7}),x,1.1,3.32,false)));return g}
function makeParcel(){const g=new THREE.Group();g.add(mesh(RB(.9,.7,.9,.06),M('#dba86a'),0,.35,0));g.add(mesh(new THREE.BoxGeometry(.16,.72,.92),M('#efd2a4'),0,.35,0,false));return g}
function makePickupPoint(){const g=new THREE.Group();const b=M('#2f58db',{roughness:.5});
  g.add(mesh(RB(14,5,9,.2),M('#f4f6fb'),0,2.5,0));g.add(mesh(RB(14.3,.5,9.3,.1),b,0,5.1,0));
  g.add(mesh(new THREE.BoxGeometry(9,3.2,.12),M('#9cc3ff',{emissive:'#6aa5ff',emissiveIntensity:.25,roughness:.15,metalness:.25}),-1.5,2.1,4.52,false));
  g.add(mesh(new THREE.BoxGeometry(1.8,3.4,.14),M('#1b2540'),4.6,1.7,4.53,false));
  g.add(mesh(RB(14,.25,2.4,.08),b,0,4.2,5.6));[-6.6,6.6].forEach(x=>g.add(mesh(new THREE.CylinderGeometry(.08,.08,4.2,8),M('#c8d0dd'),x,2.1,6.6)));
  for(let i=0;i<4;i++)for(let j=0;j<3;j++)g.add(mesh(RB(.8,.6,.6,.05),M(['#dba86a','#cf9a5b','#e2b37a'][(i+j)%3]),-5+i*1.1,.6+j*.75,3.6,false));
  return g}
function makeLocker(){const g=new THREE.Group();const b=M('#2f58db',{roughness:.45});
  g.add(mesh(RB(7.2,2.9,1.1,.12),b,0,1.55,0));g.add(mesh(RB(7.6,.25,1.6,.08),b,0,3.1,.15));
  for(let i=0;i<8;i++)for(let j=0;j<4;j++){if(i===3)continue;const open=i===5&&j===1;g.add(mesh(RB(.72,.56,.08,.03),M(open?'#f59e0b':'#f4f6fb',open?{emissive:'#f59e0b',emissiveIntensity:.4}:{}),-3.15+i*.86,.55+j*.64,.56,false))}
  g.add(mesh(new THREE.BoxGeometry(.6,.85,.06),M('#0f2a4a',{emissive:'#3b82f6',emissiveIntensity:.6}),-.57,1.9,.57,false));
  return g}
function makeHouse(c,r){const g=new THREE.Group();g.add(mesh(RB(7,4.2,6,.15),M(c),0,2.1,0));
  const roof=mesh(new THREE.ConeGeometry(5.4,2.6,4),M(r,{roughness:.6}),0,5.5,0);roof.rotation.y=Math.PI/4;roof.scale.set(1,1,.85);g.add(roof);
  g.add(mesh(new THREE.BoxGeometry(1.2,2.1,.1),M('#8a6a4b'),1.6,1.05,3.02,false));[-1.6].forEach(x=>g.add(mesh(new THREE.BoxGeometry(1.5,1.1,.08),M('#9cc3ff',{emissive:'#6aa5ff',emissiveIntensity:.2}),x,2.4,3.02,false)));
  g.add(mesh(RB(2.4,.2,1.6,.05),M('#e5e9f2'),1.6,.1,3.8));return g}
/* ---------- town: blocks, side streets, parcel branches, traffic (no logos, no lettering) ---------- */
function winTex(base,win,cols,rows){const k='win'+base+win+cols+rows;if(mats[k])return mats[k];const c=document.createElement('canvas');c.width=128;c.height=128;const x=c.getContext('2d');x.fillStyle=base;x.fillRect(0,0,128,128);
  const cw=128/cols,rh=128/rows;for(let i=0;i<cols;i++)for(let j=0;j<rows;j++){x.fillStyle=(i*7+j*3)%5===0?'#ffe7b0':win;x.fillRect(i*cw+cw*.22,j*rh+rh*.25,cw*.56,rh*.5)}
  const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;return mats[k]=new THREE.MeshStandardMaterial({map:t,roughness:.7})}
function makeApartment(r){const g=new THREE.Group();const fl=3+Math.floor(r()*5),w=8+Math.floor(r()*4)*2,d=8;const h=fl*2.6;
  const cols=[['#eef2f8','#9fb6d9'],['#f4efe7','#a9bcd8'],['#e6edf8','#8fa9d3'],['#f7f3ea','#b4c4dc']][Math.floor(r()*4)];
  const body=mesh(new THREE.BoxGeometry(w,h,d),winTex(cols[0],cols[1],Math.round(w/2),fl),0,h/2,0);g.add(body);
  g.add(mesh(new THREE.BoxGeometry(w+.4,.35,d+.4),M('#cfd8e6'),0,h+.17,0));
  if(r()<.5)g.add(mesh(new THREE.BoxGeometry(2.2,1.2,2.2),M('#dfe5ef'),w/4,h+.9,-1));
  g.add(mesh(new THREE.BoxGeometry(1.6,2.2,.12),M('#2b3a55'),0,1.1,d/2+.02,false));return g}
function makeShop(r){const g=new THREE.Group();const w=9,h=4.2,d=7;const c=['#fde7d4','#e9f7ef','#e8eefc','#fff3d6'][Math.floor(r()*4)];
  g.add(mesh(RB(w,h,d,.12),M(c),0,h/2,0));g.add(mesh(new THREE.BoxGeometry(w-1.2,2,.1),M('#a9c8f5',{emissive:'#7fb0ff',emissiveIntensity:.18,roughness:.15}),0,1.4,d/2+.02,false));
  const aw=mesh(new THREE.BoxGeometry(w-.6,.18,1.6),M(['#e5484d','#2f58db','#16a34a','#f59e0b'][Math.floor(r()*4)]),0,2.75,d/2+.7,false);aw.rotation.x=.25;g.add(aw);return g}
function makeBranch(){const g=new THREE.Group();const b=M('#2f58db',{roughness:.5}),w=M('#f6f8fc');
  g.add(mesh(RB(14,5,9,.15),w,0,2.5,0));g.add(mesh(new THREE.BoxGeometry(14.2,.9,9.2),b,0,5.1,0));
  g.add(mesh(new THREE.BoxGeometry(4,3.6,.12),M('#a9c8f5',{emissive:'#7fb0ff',emissiveIntensity:.2,roughness:.15}),-3.5,1.9,4.52,false));
  const gd=mesh(new THREE.BoxGeometry(4.2,3.8,.12),new THREE.MeshStandardMaterial({map:stripeTex('#e6ebf3','#cfd7e4',12,false),roughness:.6}),3.4,1.9,4.52,false);g.add(gd);
  g.add(mesh(RB(1.4,1.4,.25,.1),b,-3.5,4.2,4.6,false));
  const lk=makeLocker();lk.scale.setScalar(.55);lk.position.set(-8.6,0,2.5);lk.rotation.y=Math.PI/2;g.add(lk);
  [0,1].forEach(i=>{const v=makeVan();v.position.set(1.8+i*3.4,0,8.6);v.rotation.y=Math.PI;g.add(v)});return g}
function makeCar(r){const g=new THREE.Group();const c=['#e5484d','#f4f6fb','#2f58db','#475569','#f2c94c','#16a34a','#1e2433'][Math.floor(r()*7)];
  g.add(mesh(RB(1.9,.8,4,.3),M(c,{roughness:.4}),0,.65,0));g.add(mesh(RB(1.7,.7,2.1,.25),M('#1c2b47',{roughness:.15,metalness:.3}),0,1.3,-.2));
  [[-.85,1.3],[.85,1.3],[-.85,-1.3],[.85,-1.3]].forEach(([x,z])=>{const w=mesh(new THREE.CylinderGeometry(.36,.36,.3,12),M('#1e2433'),x,.36,z,false);w.rotation.z=Math.PI/2;g.add(w)});return g}
function buildTown(x1,x2,seed,o={}){const r=rngOf(seed);const ex=[];const bb=new THREE.Box3(),sz=new THREE.Vector3();
  root.children.forEach(c=>{bb.setFromObject(c);bb.getSize(sz);if(!isFinite(sz.x)||(!c.userData.exclude&&(sz.x>260||sz.z>260)))return;ex.push(bb.clone().expandByScalar(3))});
  const roadZ=o.roadZ??32,lanes=[roadZ-2.5,roadZ+2.5];ex.push(new THREE.Box3(new THREE.Vector3(-1e4,-1,roadZ-7),new THREE.Vector3(1e4,50,roadZ+7)));
  const free=(x,z,w,d)=>{const b=new THREE.Box3(new THREE.Vector3(x-w/2,0,z-d/2),new THREE.Vector3(x+w/2,9,z+d/2));return !ex.some(e=>e.intersectsBox(b))};
  const take=(x,z,w,d)=>ex.push(new THREE.Box3(new THREE.Vector3(x-w/2,0,z-d/2),new THREE.Vector3(x+w/2,9,z+d/2)));
  const asph=M('#d5dce8',{roughness:.95}),walk=M('#eef1f6'),zeb=M('#ffffff');
  const g=new THREE.Group();
  // side streets
  const streets=[];for(let x=x1+30;x<x2-20;x+=64+Math.floor(r()*20)){[[roadZ+7,roadZ+110],[roadZ-110,roadZ-7]].forEach(([a,b])=>{
      let s=a,e=b;const step=4;let segs=[];let cur=null;for(let z=a;z<=b;z+=step){const ok=free(x,z,9,step);if(ok){if(cur==null)cur=z}else if(cur!=null){segs.push([cur,z-step]);cur=null}}if(cur!=null)segs.push([cur,b]);
      segs.forEach(([za,zb])=>{const touch=Math.abs(za-(roadZ+7))<5||Math.abs(zb-(roadZ-7))<5;if(zb-za<24||!touch)return;const L=zb-za,cz=(za+zb)/2;
        g.add(mesh(new THREE.BoxGeometry(12,.05,L),walk,x,.025,cz,false));g.add(mesh(new THREE.BoxGeometry(8,.06,L),asph,x,.04,cz,false));
        for(let z=za+2;z<zb-2;z+=5)g.add(mesh(new THREE.BoxGeometry(.2,.02,2.4),zeb,x,.08,z,false));streets.push([x,za,zb]);take(x,cz,13,L)})})
    for(let k=-3;k<=3;k++)g.add(mesh(new THREE.BoxGeometry(.6,.02,4),zeb,x+k*1.1,.06,roadZ+0,false))}
  // frontage branches (parcel offices) every ~140 units
  const nb=[];for(let x=x1+50;x<x2-30;x+=120+Math.floor(r()*50)){const z=roadZ+15;const side=r()<.5;const zz=side?z:roadZ-15;for(let dx=0;dx<40;dx+=8){if(free(x+dx,zz,16,12)){const b=makeBranch();b.position.set(x+dx,0,zz);b.rotation.y=side?Math.PI:0;g.add(b);take(x+dx,zz,16,14);nb.push(b);break}}}
  // blocks
  for(let x=x1;x<x2;x+=12)for(let row=0;row<(o.rows??6);row++){[1,-1].forEach(sd=>{const z=roadZ+sd*(14+row*13)+(r()-.5)*2;if(r()<.18)return;const kind=r();
      const w=kind<.45?10:kind<.75?11:12,d=kind<.45?9:10;if(!free(x,z,w,d))return;let b;
      if(row===0&&kind<.35)b=makeShop(r);else if(kind<.5)b=makeHouse(['#fde7d4','#e8eefc','#e9f7ef','#f4f6fb','#fff3d6'][Math.floor(r()*5)],['#e5484d','#2f58db','#475569','#b45309'][Math.floor(r()*4)]);
      else if(kind<.85)b=makeApartment(r);else{b=new THREE.Group();for(let k=0;k<3;k++){const t=makeTree(.8+r()*.6,r);t.position.set((r()-.5)*7,0,(r()-.5)*6);b.add(t)}}
      b.position.set(x,0,z);b.rotation.y=sd>0?Math.PI:0;g.add(b);take(x,z,w,d);
      if(r()<.25&&free(x+6.5,z+sd*-5.5,2.4,4.4)){const c=makeCar(r);c.position.set(x+6.5,0,z-sd*5.5);c.rotation.y=r()<.5?0:Math.PI;g.add(c);take(x+6.5,z-sd*5.5,2.4,4.4)}})}
  // sidewalk trees along main road
  for(let x=x1;x<x2;x+=9)[roadZ+8.5,roadZ-8.5].forEach(z=>{if(r()<.45&&free(x,z,2,2)){const t=makeTree(.7+r()*.3,r);t.position.set(x,0,z);g.add(t);take(x,z,2,2)}});
  g.traverse(m=>{if(m.isMesh)m.castShadow=false});root.add(g);
  // traffic
  const n=o.cars??14;for(let i=0;i<n;i++){const c=(i%5===0)?makeVan():makeCar(r);const dir=o.oneWay?-1:(i%2?1:-1);c.position.set(x1+r()*(x2-x1),0,dir>0?lanes[1]:lanes[0]);root.add(c);
    movers.push({id:'car'+i,type:'car',obj:c,loopRoad:true,speed:dir*(7+r()*5),lo:x1-20,hi:x2+20})}
}
function hero(obj,keys,range,tag,pitch=false){obj.visible=false;root.add(obj);J.heroes.push({obj,keys,range,tag,pitch})}
function keyPos(keys,p,out){if(p<=keys[0][0]){out.set(keys[0][1],keys[0][2],keys[0][3]);return 0}
  for(let i=0;i<keys.length-1;i++){const a=keys[i],b=keys[i+1];if(p<=b[0]){const t=(p-a[0])/(b[0]-a[0]||1);out.set(a[1]+(b[1]-a[1])*t,a[2]+(b[2]-a[2])*t,a[3]+(b[3]-a[3])*t);return i}}
  const l=keys[keys.length-1];out.set(l[1],l[2],l[3]);return keys.length-2}
function buildJourney(){
  if(root){scene.remove(root);root.traverse(o=>{if(o.geometry)o.geometry.dispose()})}
  Object.keys(ents).forEach(k=>delete ents[k]);clickable=[];movers=[];booth=null;dockChips=[];J.heroes=[];
  root=new THREE.Group();scene.add(root);const r=rngOf(99);
  root.add(mesh(new THREE.PlaneGeometry(1800,500),M('#e3e9f3',{roughness:.95}),500,0,0,false).rotateX(-Math.PI/2));
  [[0,26],[38,26]].forEach(([dz])=>{});
  root.add(mesh(new THREE.BoxGeometry(1400,.18,2),M('#f7f9fc'),500,.09,26,false));root.add(mesh(new THREE.BoxGeometry(1400,.18,2),M('#f7f9fc'),500,.09,38,false));
  const road=mesh(new THREE.PlaneGeometry(1400,10),M('#cdd6e4',{roughness:.95}),500,.02,32,false);road.rotation.x=-Math.PI/2;root.add(road);
  for(let x=-200;x<1200;x+=5)root.add(mesh(new THREE.BoxGeometry(2.4,.02,.22),M('#ffffff'),x,.05,32,false));
  const grass=M('#d3eedc',{roughness:1});[[340,-40,170,90],[900,58,260,30],[-60,-10,40,60],[680,-80,120,40]].forEach(([x,z,w,d])=>{const p=mesh(new THREE.PlaneGeometry(w,d),grass,x,.01,z,false);p.rotation.x=-Math.PI/2;root.add(p)});
  buildWarehouseDistrict(0,null);
  buildAirportDistrict(60,{noLink:true,freeStand2:true,freeDock1:true});
  for(let i=0;i<14;i++){const c=new THREE.Group();const n=3+Math.floor(r()*3);for(let k=0;k<n;k++){const s=mesh(new THREE.SphereGeometry(2+r()*2.2,14,10),new THREE.MeshStandardMaterial({color:'#ffffff',roughness:1,transparent:true,opacity:.92}),k*2.6,r()*1.2,(r()-.5)*2,false);c.add(s)}
    c.position.set(300+r()*170,24+r()*20,-80+r()*70);root.add(c)}
  buildAirportDistrict(470,{noLink:true,freeStand2:true,freeDock1:true});
  buildWarehouseDistrict(760,null);
  root.add(mesh(RB(30,.12,14,.3),M('#f1f4f9',{roughness:.9}),808,.03,15,false));
  for(let i=0;i<4;i++){const v=makeVan();v.position.set(800+i*4.6,0,12);root.add(v)}
  root.add(mesh(RB(70,.12,22,.3),M('#f1f4f9',{roughness:.9}),975,.03,13,false));
  const pp=makePickupPoint();pp.position.set(918,0,10);root.add(pp);
  const lk=makeLocker();lk.position.set(944,0,20);root.add(lk);
  [[992,6,'#fde7d4','#e5484d'],[1006,6,'#e8eefc','#2f58db'],[1020,6,'#e9f7ef','#475569'],[992,-8,'#f4f6fb','#2f58db'],[1006,-8,'#fff3d6','#b45309'],[1020,-8,'#e8eefc','#e5484d'],[960,48,'#f4f6fb','#2f58db'],[976,48,'#fde7d4','#475569'],[992,48,'#e9f7ef','#e5484d'],[1008,48,'#e8eefc','#2f58db']].forEach(([x,z,c,rc])=>{const h=makeHouse(c,rc);h.position.set(x,0,z);if(z>40)h.rotation.y=Math.PI;root.add(h)});
  for(let i=0;i<22;i++){const t=makeTree(.8+r()*.5,r);t.position.set(880+r()*170,0,r()<.5?-18+r()*10:56+r()*12);root.add(t)}
  buildDepotCampus(806,-50,4,2,404,{prefix:'SH',kinds:['terminal','hub','vans','branch','terminal','terminal'],link:[722,27]});
  buildTown(-180,1150,77,{roadZ:32,rows:6,cars:18,oneWay:true});
  // heroes = the parcel's vehicles
  hero(makeTruck('#2f5be0'),[[0,8,0,34],[1,42,0,34],[1.6,64,0,34],[1.75,64,0,27],[2,64,0,13.6,1]],[0,2.6],[0,1.95]);
  hero(makePlane(),[[2,168,0,-10],[2.3,168,0,-48],[2.45,190,0,-58],[2.7,280,4,-58],[3,340,34,-58],[3.5,410,40,-58],[3.75,500,8,-58],[3.85,530,0,-58],[3.95,578,0,-48],[4.1,578,0,-10]],[2,4.6],[1.95,4.1],true);
  hero(makeTruck('#f4f6fb'),[[4,474,0,13.6],[4.25,474,0,26],[4.35,480,0,34],[4.85,740,0,34],[4.95,752,0,26],[5,752,0,7.5,1]],[4,5.6],[4.1,5.05]);
  hero(makeVan(),[[5,792,0,18],[5.2,792,0,30],[5.3,800,0,34],[6,862,0,34],[6.6,918,0,34],[6.8,930,0,28],[7,930,0,24]],[5,8.2],[5.05,6.95]);
  hero(makeParcel(),[[7,935,1.4,24],[7.35,943.3,1.6,21.5],[7.6,960,.1,27.5],[8,1007.6,.1,10]],[6.95,8.1],[6.95,8.1]);
  makeDockChips();refreshMarkers();
  if(!J.tag){J.tag=document.createElement('div');J.tag.className='tag sel';labelsEl.appendChild(J.tag)}J.tag.style.display='';
}
const jv=new THREE.Vector3(),jq=new THREE.Vector3(),jr=new THREE.Vector3();
function updateJourney(dt){const st=state;st.jp+=(st.jpT-st.jp)*Math.min(1,dt*3.5);if(Math.abs(st.jpT-st.jp)<.001)st.jp=st.jpT;const p=st.jp;
  const i=Math.min(JA.length-2,Math.floor(p)),f=p-i,s=f*f*(3-2*f),a=JA[i],b=JA[i+1];
  controls.target.set(a[0]+(b[0]-a[0])*s,a[1]+(b[1]-a[1])*s,a[2]+(b[2]-a[2])*s);camera.position.copy(controls.target).addScaledVector(CAMDIR,160);camera.zoom=a[3]+(b[3]-a[3])*s;camera.updateProjectionMatrix();
  let th=null;
  J.heroes.forEach(h=>{const vis=p>=h.range[0]&&p<=h.range[1];h.obj.visible=vis;if(!vis)return;const seg=keyPos(h.keys,p,h.obj.position);
    const p2=Math.min(p+.02,h.keys[h.keys.length-1][0]),p1=Math.max(p-.02,h.keys[0][0]);keyPos(h.keys,p2,jq);keyPos(h.keys,p1,jr);
    const dx=jq.x-jr.x,dz=jq.z-jr.z,dy=jq.y-jr.y,dh=Math.hypot(dx,dz);
    if(dh>.05){let yaw=Math.atan2(dx,dz);if(h.keys[seg+1]&&h.keys[seg+1][4])yaw+=Math.PI;h.obj.rotation.set(h.pitch?-Math.atan2(dy,dh):0,yaw,0,'YXZ')}
    if(p>=h.tag[0]&&p<=h.tag[1])th=h});
  if(J.tag){if(th){const S=JST[Math.round(p)];J.tag.innerHTML=`<span class="tid">#SHP-78570</span>${L2(...S.st)}`;th.obj.getWorldPosition(jv);jv.y+=th.pitch?6:4.5;placeLabel(J.tag,jv,-6)}else J.tag.style.display='none'}
  const stg=Math.round(p);if(stg!==st.stage){st.stage=stg;renderAll()}}
function jStage(){return JST[Math.max(0,state.stage)]}
function renderKPIsJourney(){const S=jStage();$('kpis').innerHTML=S.k.map(([en,uk,v,d],n)=>`<div class="kpi card"><div class="ic">${ic(n===0?S.icon:n===1?'clock':'check','#2563eb',20)}</div><div><div class="l">${L2(en,uk)}</div><div class="v">${v}${d?`<span class="d">${d}</span>`:''}</div><div class="s">${L2('stage ','етап ')+(state.stage+1)+' / 9'}</div></div></div>`).join('')}
function journeyDetail(){const S=jStage(),n=state.stage;
  return `<div data-notr><div class="dh"><div class="thumb" style="background:#eaf1ff">${ic(S.icon,'#2563eb',22)}</div><div><div class="eyebrow">${L2('STAGE','ЕТАП')} ${n+1} / 9</div><div class="dtitle">${L2(...S.t)}</div><div class="dsub">${L2(...S.s)}</div></div></div>
  <div class="sec">${L2('WHAT WE TRACK HERE','ЩО ВІДСТЕЖУЄМО ТУТ')}</div>${S.tr.map(([en,uk])=>`<div style="display:flex;gap:8px;align-items:flex-start;font-size:12px;padding:5px 0">${ic('check','#16a34a',14)}<span>${L2(en,uk)}</span></div>`).join('')}
  <div class="sec">${L2('ALERT RULES','ПРАВИЛА АЛЕРТІВ')}</div>${S.al.map(([en,uk])=>`<div class="alertbox warn" style="margin-top:6px;padding:7px 10px">${ic('warn','#b45309',14)}<span>${L2(en,uk)}</span></div>`).join('')}
  <div style="display:flex;gap:8px;margin-top:14px"><button class="secondary" style="margin:0" data-jstage="${Math.max(0,n-1)}" ${n===0?'disabled':''}>← ${L2('Back','Назад')}</button><button class="primary" style="margin:0" data-jstage="${Math.min(8,n+1)}" ${n===8?'disabled':''}>${L2('Next stage','Наступний етап')} →</button></div></div>`}
function renderOpsJourney(){const T=jStage().tb;const cols=LANG==='uk'?T.cu:T.c;
  $('ops').innerHTML=`<div><div class="tabs"><div class="thumb" style="width:24px;height:24px;border-radius:6px;background:#eaf1ff">${ic('grid','#2563eb',14)}</div><b style="font-size:12px">${L2(...T.n)}</b><div class="spacer"></div><span class="muted" style="font-size:11px">${L2('Dashboard table','Таблиця дашборду')}</span></div>
  <div class="orow" style="font-size:10px;font-weight:700;color:#64748b;letter-spacing:.04em">${cols.map((c,i)=>`<div style="flex:${i===4?1.4:1};min-width:0">${c.toUpperCase()}</div>`).join('')}</div>
  ${T.r.map(r=>`<div class="orow">${r.map((c,i)=>i===4?`<div style="flex:1.4">${pill(L2(c[0],c[1]),c[2])}</div>`:`<div style="flex:1;font-size:11px;${i===0?'font-weight:700':''};white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${LANG==='uk'?(c==='Pickup point'?'Відділення':c==='Parcel locker'||c==='Locker'?'Поштомат':c==='Door'?'Двері':c):c}</div>`).join('')}</div>`).join('')}</div>`}
function renderShipJourney(){const n=state.stage;const icons=['home','truck','plane','plane','plane','home','truck','box','check'];const short=[['WH-04','WH-04'],['Road','Дорога'],['AIR-01','AIR-01'],['Flight','Рейс'],['AIR-02','AIR-02'],['Sorting','Сортування'],['Van','Бус'],['Locker','Поштомат'],['Home','Дім']];
  $('ship').innerHTML=`<div class="track" data-notr><div class="th">${ic('box','#2563eb',18)}${L2('Parcel journey','Подорож посилки')}<span class="r">${ic('chevD','#64748b',12)} ${L2('Scroll on the map to travel','Прокручуй мапу, щоб їхати')}</span></div>
  <div class="stepper"><div class="line" style="left:5.5%;right:5.5%"></div><div class="line done" style="left:5.5%;width:${n/8*89}%"></div>
  ${short.map((sh,i)=>`<button class="step ${i<n?'done':i===n?'current':'todo'}" data-jstage="${i}"><div class="sdot">${ic(icons[i],i<=n?'#fff':'#64748b',13)}</div><div class="sl">${L2(...sh)}</div></button>`).join('')}</div></div>
  <div class="shipcard" data-notr><div class="thumb" style="background:#eaf1ff;width:56px;height:56px">${ic('box','#2563eb',28)}</div><div style="flex:1;min-width:0"><div class="id">#SHP-78570</div><div class="to">${L2('To: Locker L-07 · Riverside','До: поштомат L-07 · Riverside')}</div><div style="margin-top:4px">${pill(L2(...jStage().st),n===8?'success':'info')}</div><div class="meta">${n===8?L2('Picked up · PIN','Отримано · PIN'):L2('ETA tomorrow 15:25','Очікується завтра 15:25')}</div></div></div>`}
renderer.domElement.addEventListener('wheel',e=>{if(state.kind!=='journey')return;e.preventDefault();state.jpT=THREE.MathUtils.clamp(state.jpT+e.deltaY*.0013,0,8);hideHint()},{passive:false});
let jdrag=null;renderer.domElement.addEventListener('pointerdown',e=>{if(state.kind==='journey')jdrag=e.clientY});
addEventListener('pointerup',()=>jdrag=null);
renderer.domElement.addEventListener('pointermove',e=>{if(state.kind!=='journey'||jdrag==null)return;state.jpT=THREE.MathUtils.clamp(state.jpT+(jdrag-e.clientY)*.006,0,8);jdrag=e.clientY});
addEventListener('keydown',e=>{if(state.kind!=='journey'||document.activeElement===q)return;if(['ArrowDown','ArrowRight','PageDown'].includes(e.key)){state.jpT=Math.min(8,Math.round(state.jpT)+1);e.preventDefault()}if(['ArrowUp','ArrowLeft','PageUp'].includes(e.key)){state.jpT=Math.max(0,Math.round(state.jpT)-1);e.preventDefault()}});

/* ================= UI ================= */
const $=id=>document.getElementById(id);
const I={
 box:'<path d="M21 8l-9-5-9 5 9 5 9-5z"/><path d="M3 8v8l9 5 9-5V8"/><path d="M12 13v8"/>',
 truck:'<path d="M1 5h14v11H1z"/><path d="M15 9h4l3 3v4h-7"/><circle cx="6" cy="18" r="2"/><circle cx="18" cy="18" r="2"/>',
 clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
 fork:'<path d="M4 20V6h6l3 6v8"/><path d="M13 12h4V4"/><path d="M17 20h5"/><circle cx="7" cy="20" r="1.5"/>',
 bolt:'<path d="M13 2L4 14h7l-1 8 9-12h-7z"/>',
 home:'<path d="M3 10l9-7 9 7v10a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>',
 target:'<circle cx="12" cy="12" r="7"/><path d="M12 2v4M12 18v4M2 12h4M18 12h4"/>',
 x:'<path d="M18 6L6 18M6 6l12 12"/>',chevR:'<path d="M9 6l6 6-6 6"/>',chevD:'<path d="M6 9l6 6 6-6"/>',check:'<path d="M5 12l5 5L20 7"/>',
 clip:'<rect x="6" y="4" width="12" height="17" rx="2"/><path d="M9 4h6v3H9z"/>',grid:'<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 9h18"/>',
 warn:'<path d="M12 3l10 18H2z"/><path d="M12 10v4M12 18h.01"/>',pin:'<path d="M12 22s7-7 7-12a7 7 0 0 0-14 0c0 5 7 12 7 12z"/><circle cx="12" cy="10" r="2.5"/>',
plane:'<path d="M17.8 19.2L16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z"/>',
 dock:'<path d="M3 21V8l9-5 9 5v13"/><path d="M7 21v-8h10v8"/>'
};
const ic=(k,c='#0f172a',s=16,w=2)=>`<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="${c}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round">${I[k]}</svg>`;
const pill=(t,k)=>`<span class="pill ${k}">${t}</span>`;
function opPill(op){return pill(op,{Loading:'success',Unloading:'success','Loading truck':'success',Charging:'warning','To charger':'info',Moving:'info',Available:'neutral',Reserved:'warning',Completed:'info',Maintenance:'neutral',Docked:'success','At gate':'warning','En route':'info',Docking:'info'}[op]||'neutral')}
function toast(msg,icon='check',c='#4ade80'){if(state&&state.db&&!/^(Saved|CSV ready)/.test(msg)&&icon!=='warn')OPS.log.unshift({t:Date.now(),msg});const t=document.createElement('div');t.className='toast';t.innerHTML=ic(icon,c,16)+msg;$('toasts').appendChild(t);setTimeout(()=>{t.style.transition='opacity .4s';t.style.opacity=0;setTimeout(()=>t.remove(),400)},3200)}

function nextLeg(t){if(t.ship.to.includes('YT 482'))return {label:'AIR-01 · YT 482',short:'YT 482',buf:52};
  const n=parseInt(t.id.replace(/\D/g,''))||0;
  if(t.op==='Loading')return {label:'Route → '+t.ship.to.split(',')[0],short:t.ship.to.split(',')[0],buf:12+n%45};
  return {label:'Put-away · '+state.site.id,short:'Put-away',buf:null}}
function renderTop(){if(state.kind==='journey'){$('siteBtn').innerHTML=`<span class="site-code">${ic('box','#fff',13)}</span><span><div class="site-name">Parcel journey</div><div class="site-meta">#SHP-78570 · 9 stages · scroll to travel</div></span>${ic('chevD','#64748b')}`;return}if(state.kind==='air')return renderTopAir();const s=state.site;const used=state.docks.filter(d=>d.truck).length;
  $('siteBtn').innerHTML=`<span class="site-code">${s.id}</span><span><div class="site-name">${s.name}</div><div class="site-meta">${Math.round(s.stock/s.cap*100)}% full · ${used}/${s.docks} docked</div></span>${ic('chevD','#64748b')}`;
  $('siteMenu').innerHTML='<div class="dd-label">SITES</div>'+SITES.map(x=>`<button class="dd-item ${x.id===s.id?'active':''}" data-site="${x.id}"><span class="site-code" style="${x.id===s.id?'':'background:#e2e8f0;color:#334155'}">${x.id}</span><span style="flex:1"><div class="site-name">${x.name}</div><div class="site-meta">${Math.round(x.stock/x.cap*100)}% full · ${x.docks} docks · on-time ${x.ontime}%</div></span>${x.id===s.id?ic('check','#2563eb'):''}</button>`).join('');
}
function renderSiteMenu(){const cur=state.site.id;const row=x=>`<button class="dd-item ${x.id===cur?'active':''}" data-site="${x.id}"><span class="site-code" style="${x.id===cur?'':'background:#e2e8f0;color:#334155'}">${x.id}</span><span style="flex:1"><div class="site-name">${x.name}</div><div class="site-meta">${x.kind==='journey'?'#SHP-78570 · 9 stages · scroll to travel':x.kind==='air'?x.code+' · '+(x.mode==='load'?'Outbound':'Inbound')+' · on-time '+x.ontime+'%':Math.round(x.stock/x.cap*100)+'% full · '+x.docks+' docks · on-time '+x.ontime+'%'}</div></span>${x.id===cur?ic('check','#2563eb'):''}</button>`;
  $('siteMenu').innerHTML='<div class="dd-label">WAREHOUSES</div>'+SITES.filter(x=>!x.kind||x.kind==='wh').map(row).join('')+'<div class="dd-label">JOURNEY</div>'+SITES.filter(x=>x.kind==='journey').map(row).join('')+'<div class="dd-label">AIR HUBS</div>'+SITES.filter(x=>x.kind==='air').map(row).join('')}
function renderKPIs(){if(state.kind==='journey')return renderKPIsJourney();if(state.kind==='air')return renderKPIsAir();const s=state.site;const on=state.trucks.filter(t=>t.state!=='enroute').length;const inb=state.trucks.filter(t=>t.state==='waiting'||t.state==='enroute'||t.state==='arriving').length;
  const k=[['box','Stock on hand',s.stock.toLocaleString('en-US'),s.dStock,'pallets · '+s.id],['truck','Trucks on site',on,'+'+Math.max(1,on-2),inb+' inbound · '+s.id],['clock','On-time delivery',s.ontime+'%',s.dOn,'last 30 days']];
  $('kpis').innerHTML=k.map(([i,l,v,d,sub])=>`<div class="kpi card"><div class="ic">${ic(i,'#2563eb',20)}</div><div><div class="l">${l}</div><div class="v">${v}<span class="d ${String(d).startsWith('−')?'neg':''}">${String(d).startsWith('−')?'↓':'↑'} ${d}</span></div><div class="s">${sub}</div></div></div>`).join('')}

function kv(k,v,blue){return `<div class="kv"><span class="muted">${k}</span><b style="${blue?'color:#2563eb':''}">${v}</b></div>`}
function head(thumbBg,iconK,iconC,eyebrow,title,sub){return `<div class="dh"><div class="thumb" style="background:${thumbBg}">${ic(iconK,iconC,22)}</div><div><div class="eyebrow">${eyebrow}</div><div class="dtitle">${title}</div><div class="dsub">${sub}</div></div><div class="acts"><button class="act" data-a="focus" title="Locate in scene">${ic('target','#0f172a',14)}</button><button class="act" data-a="close" title="Close">${ic('x','#0f172a',14)}</button></div></div>`}
function batt(b){return `<div class="row-status"><div class="bar ${b<20?'red':b<40?'amber':''}"><i style="width:${b}%"></i></div><span>Battery ${b}%</span></div>`}
function renderDetail(){const el=$('detail');if(state.kind==='journey'){el.classList.remove('hidden');el.innerHTML=journeyDetail();return}if(!selected||!ents[selected]){el.classList.add('hidden');return}el.classList.remove('hidden');
  const e=ents[selected],d=e.data,s=state.site;let h='';
  if(state.kind==='air'){el.innerHTML=detailAir(e);return}
  if(e.type==='warehouse'){const used=state.docks.filter(x=>x.truck).length;
    h=head('#eaf1ff','home','#2563eb','WAREHOUSE · '+s.id,s.name,used+' docked · '+state.trucks.filter(t=>t.state==='waiting').length+' at gate · '+state.pallets.length+' staged')+
    `<div class="row-status">${pill(state.offline?'Offline':'Operational',state.offline?'danger':'success')}<span>${Math.round(s.stock/s.cap*100)}% capacity used</span></div>`+
    `<div class="row-status"><div class="bar blue"><i style="width:${s.stock/s.cap*100}%"></i></div><span>${s.stock.toLocaleString('en-US')} / ${s.cap.toLocaleString('en-US')}</span></div>`+
    kv('Truck bays',used+' / '+s.docks+' busy')+kv('Forklifts',state.fls.length+' · '+state.fls.filter(f=>f.op==='Charging').length+' charging')+kv('Outbound today',(18+s.docks*2)+' trucks')+
    `<div class="sec">INVENTORY</div>`+state.pallets.slice(0,5).map(p=>`<button class="inv" data-sel="${p.id}"><span><div class="n">${p.sku}</div><div class="q">${p.qty.toLocaleString('en-US')} units</div></span>${p.low?pill(p.reorder?'Reorder placed':'Low Stock',p.reorder?'info':'warning'):pill('In Stock','success')}</button>`).join('')}
  else if(e.type==='forklift'){const t=d.truck&&state.trucks.find(x=>x.id===d.truck);
    h=head('#fef3c7','fork','#b45309','FORKLIFT · '+s.id,d.id,d.operator+' · '+d.model)+
    `<div class="row-status">${opPill(d.op==='Loading'?'Loading truck':d.op)}<span>${d.op==='To charger'?'Heading to charger '+d.charger:d.op==='Charging'?'At charger '+d.charger:t?(d.op+' '+t.id+' at '+state.docks[t.dock].id):d.op==='Available'?'Idle near docks':'Moving pallets in staging'}</span></div>`+batt(d.battery)+
    (d.battery<20&&d.op!=='Charging'&&d.op!=='To charger'?`<div class="alertbox bad">${ic('warn','#b91c1c',16)}<span><b>Battery critical.</b> ${d.id} will stop in ~25 min. Send it to a free charger now.</span></div>`:'')+
    kv('Carrying',ents[d.id].carry?'1 pallet':'Empty')+kv('Moves today',d.moves)+kv('Speed',d.speed+' km/h')+kv('Charger',d.charger,true)+kv('Site',s.name)+
    (d.op==='To charger'?'':d.op!=='Charging'?`<button class="primary" data-a="charge" ${freeCharger()<0?'disabled':''}>${ic('bolt','#fff',16)}Send to charger ${freeCharger()>=0?'C'+(freeCharger()+1):'(none free)'}</button>`:'<button class="secondary" data-a="release">Release from charger</button>')}
  else if(e.type==='truck'){const st=d.state;
    h=head('#eaf1ff','truck','#2563eb','TRUCK · '+d.carrier.toUpperCase(),d.id,'Driver '+d.driver+' · '+d.ship.id)+
    `<div class="row-status">${opPill(st==='docked'?d.op:st==='waiting'?'At gate':st==='arriving'?'Docking':'En route')}<span>${st==='docked'?d.op+' '+d.units+'/'+d.total+' pallets at '+state.docks[d.dock].id:st==='waiting'?'Waiting '+d.waitMin+' min · no dock assigned':st==='arriving'?'Heading to '+state.docks[d.dock].id:'Arrives in '+d.eta+' min'}</span></div>`+
    (st==='docked'?`<div class="row-status"><div class="bar"><i style="width:${d.units/d.total*100}%"></i></div><span>${d.units}/${d.total} pallets</span></div>`:'')+
    (st==='waiting'?`<div class="alertbox warn">${ic('warn','#b45309',16)}<span><b>Detention risk.</b> Waiting over 15 min. Assign a free dock to start unloading.</span></div><div class="sec">ASSIGN DOCK</div><div class="docklist">${state.docks.map((dk,i)=>`<button class="dockopt" data-dock="${i}" ${dk.truck?'disabled':''}>${dk.id}${dk.truck?' · busy':''}</button>`).join('')}</div>`:'')+
    kv('Shipment',d.ship.id,true)+kv('Destination',d.ship.to)+kv('Carrier',d.carrier)+kv('Load',d.total+' pallets')+(()=>{const L=nextLeg(d);return `<div class="sec">NEXT LEG</div>`+kv('Next leg',L.label)+(L.buf!=null?kv('Cut-off buffer',`<span style="color:${L.buf<20?'#b45309':'#15803d'}">+${L.buf} min</span>`):'')+(d.ship.id==='#SHP-78570'?`<button class="primary" data-a="track">${ic('box','#fff',16)}Track on journey →</button>`:'')})()}
  else if(e.type==='pallet'){
    h=head('#fdf3e3','box','#b45309','PALLET · '+d.loc.toUpperCase(),d.sku,d.id+' · '+s.id)+
    `<div class="row-status">${d.low?pill(d.reorder?'Reorder placed':'Low Stock',d.reorder?'info':'warning'):pill('In Stock','success')}<span>${d.qty.toLocaleString('en-US')} units on hand</span></div>`+
    (d.low&&!d.reorder?`<div class="alertbox warn">${ic('warn','#b45309',16)}<span><b>Below reorder point.</b> Expected to run out in ~2 shifts.</span></div>`:'')+
    kv('Location',d.loc)+kv('Layers',d.layers)+kv('Reorder point',d.low?'120 units':'—')+kv('Last moved','Today '+hhmm(-37))+
    (d.low?`<button class="primary" data-a="reorder" ${d.reorder?'disabled':''}>${d.reorder?'Replenishment ordered':'Create replenishment order'}</button>`:`<button class="secondary" data-a="pick">Assign pick task</button>`)}
  else if(e.type==='terminal'){const busy=d.doors.filter(x=>x.vehicle&&cdStatus(x)!=='Completed');const free=d.doors.filter(x=>cdStatus(x)==='Available');
    const mix={};d.doors.filter(x=>x.vehicle).forEach(x=>{mix[x.cargo]=(mix[x.cargo]||0)+x.qty});
    h=head('#eaf1ff','home','#2563eb','DEPOT PARK · '+s.id,d.id+' · '+d.name,d.doors.length+' doors · '+busy.length+' busy · '+free.length+' free')+
    `<div class="row-status"><div class="bar blue"><i style="width:${busy.length/d.doors.length*100}%"></i></div><span>${Math.round(busy.length/d.doors.length*100)}% doors in use</span></div>`+
    kv('Handles',d.cargoMix.join(', '))+kv('Inbound now',d.doors.filter(x=>x.vehicle&&x.dir==='Inbound').length+' vehicles')+kv('Outbound now',d.doors.filter(x=>x.vehicle&&x.dir==='Outbound').length+' vehicles')+
    `<div class="sec">CARGO AT DOORS</div>`+Object.entries(mix).map(([k,v])=>kv(k,v.toLocaleString('en-US'))).join('')+
    `<div class="sec">DOORS</div>`+d.doors.map(x=>{const st=cdStatus(x);return `<button class="inv" data-sel="${x.id}"><span><div class="n">${x.label} · ${x.vehicle||'no vehicle'}</div><div class="q">${x.vehicle||st==='Reserved'?x.cargo:'—'}${x.vehicle&&st!=='Completed'?' · '+cdProg(x)+'%':''}</div></span>${opPill(st)}</button>`}).join('')}
  else if(e.type==='tdock'){const st=cdStatus(d),pr=cdProg(d);
    h=head('#eaf1ff','dock','#2563eb','DOCK · '+d.term+' '+d.termName.toUpperCase(),d.term+' · '+d.label,d.vehicle?(d.vehicle+' · '+d.vtype):(st==='Reserved'?'Reserved · vehicle due '+fT(d.sched):'No vehicle at the door'))+
    `<div class="row-status">${opPill(st)}<span>${d.vehicle?d.dir+' · '+d.cargo:st==='Reserved'?'Next: '+d.cargo:'Ready for the next vehicle'}</span></div>`+
    (d.vehicle?`<div class="row-status"><div class="bar ${st==='Completed'?'':'blue'}"><i style="width:${pr}%"></i></div><span>${pr}% ${d.dir==='Outbound'?'loaded':'unloaded'}</span></div>`+
      kv('Cargo',d.cargo)+(d.temp?kv('Temperature',d.temp):'')+kv('Quantity',Math.round(d.qty*pr/100)+' / '+d.qty+' '+d.unit)+kv('Weight',d.weight.toLocaleString('en-US')+' kg')+kv('Shipment',d.ship,true)+kv(d.dir==='Outbound'?'Destination':'Origin',d.dest)+kv('At door since',fT(d.arr))+
      kv('Est. finish',st==='Completed'?'Done · ready to depart':fT(Date.now()+(100-pr)/(d.rate*3)*60000)):'')+
    `<button class="secondary" data-a="openrec" style="margin-top:8px">${ic('list','#0f172a',16)}Open record in Operations</button>`;el.innerHTML=h;return}
  else if(e.type==='charger'){const f=d.fl&&state.fls.find(x=>x.id===d.fl);
    h=head('#dcfce7','bolt','#15803d','CHARGER · '+s.id,d.id,d.power)+
    `<div class="row-status">${pill(f?'In use':'Free',f?'warning':'success')}<span>${f?f.id+' · '+f.battery+'% · full in ~'+Math.max(5,Math.round((100-f.battery)*1.2))+' min':'Ready for next forklift'}</span></div>`+(f?batt(f.battery):'')+
    kv('Sessions today',3+d.slot)+kv('Energy today',(41+d.slot*7)+' kWh')+kv('Zone','Charging bay A')+(f?`<button class="secondary" data-sel="${f.id}">View ${f.id}</button>`:'')}
  if(state.db&&recFor3D(selected))h+=`<button class="secondary" data-a="openrec" style="margin-top:8px">${ic('list','#0f172a',16)}Open record in Operations</button>`;
  el.innerHTML=h}
function freeCharger(){return state.chargers.findIndex(c=>!c.fl)}

const STEPS=['Order Confirmed','Picked','Loaded','In Transit','Unloading'];
function renderShip(){if(state.kind==='journey')return renderShipJourney();if(state.kind==='air'&&!(selected&&ents[selected]?.type==='truck'))return renderShipAir();let t=selected&&ents[selected]?.type==='truck'?ents[selected].data:null;
  if(!t&&selected&&ents[selected]?.type==='forklift'&&ents[selected].data.truck)t=state.trucks.find(x=>x.id===ents[selected].data.truck);
  if(!t)t=state.trucks.find(x=>x.state==='docked'&&x.op==='Unloading')||state.trucks[0];
  const cur=t.ship.step;const times=[-160,-77,-32,-6,13];
  const label=i=>i===4&&t.state==='docked'&&t.op==='Unloading'?'Unloading '+t.units+'/6':i===2&&t.op==='Loading'&&t.state==='docked'?'Loading '+t.units+'/6':i===3&&t.state==='waiting'?'At gate':i===3&&t.state==='arriving'?'Docking':STEPS[i];
  const icons=['clip','box','box','truck','check'];
  $('ship').innerHTML=`<div class="track"><div class="th">${ic('truck','#2563eb',18)}Shipment Tracking<span class="r">${t.id} · ${t.carrier}</span></div>
  <div class="stepper"><div class="line" style="left:10%;right:10%"></div><div class="line done" style="left:10%;width:${cur*20}%"></div>
  ${STEPS.map((_,i)=>`<div class="step ${i<cur?'done':i===cur?'current':'todo'}"><div class="sdot">${ic(icons[i],i<=cur?'#fff':'#64748b',13)}</div><div class="sl">${label(i)}</div><div class="st">${i<cur?hhmm(times[i]):i===cur?(i===4?'ETA '+hhmm(13):'now'):'—'}</div></div>`).join('')}</div></div>
  <button class="shipcard" data-sel="${t.id}"><div class="thumb" style="background:#eaf1ff;width:56px;height:56px">${ic('truck','#2563eb',28)}</div><div style="flex:1;min-width:0"><div class="id">${t.ship.id}</div><div class="to">To: ${t.ship.to}</div><div style="margin-top:4px">${opPill(t.state==='docked'?t.op:t.state==='waiting'?'At gate':t.state==='arriving'?'Docking':'En route')}</div><div class="meta">${t.state==='docked'?state.docks[t.dock].id+' · '+(6-t.units)*4+' min left':t.state==='waiting'?'Gate · waiting '+t.waitMin+' min':t.state==='arriving'?'→ '+state.docks[t.dock].id:'ETA '+t.eta+' min'}</div></div>${ic('chevR','#64748b')}</button>`}

let opsTab='Forklifts';
function renderOps(){if(state.kind==='journey')return renderOpsJourney();if(state.kind==='air')return renderOpsAir();const s=state.site;const tabs=[['Docks',state.docks.filter(d=>d.truck).length+'/'+s.docks],['Forklifts',state.fls.filter(f=>f.op!=='Charging').length+'/'+state.fls.length],['Trucks',state.trucks.length]];
  let rows='';
  if(opsTab==='Forklifts')rows=state.fls.map(f=>{const t=f.truck&&state.trucks.find(x=>x.id===f.truck);return `<button class="orow ${selected===f.id?'sel':''}" data-sel="${f.id}" data-focus="1"><div class="oid"><b>${f.id}</b><small>${s.id}</small></div><div class="od">${f.op==='To charger'?'Heading to '+f.charger:f.op==='Charging'?'Charging at '+f.charger:t?f.op+' '+t.id+' at '+state.docks[t.dock].id:f.op==='Available'?'Idle':'Moving pallets'}</div><div class="op">${opPill(f.op)}</div><div class="opr"><div class="bar ${f.battery<20?'red':f.battery<40?'amber':''}"><i style="width:${f.battery}%"></i></div>${f.battery}%</div>${ic('chevR','#64748b',14)}</button>`}).join('');
  if(opsTab==='Docks')rows=state.docks.map(dk=>{const t=dk.truck&&state.trucks.find(x=>x.id===dk.truck);return `<button class="orow" ${t?`data-sel="${t.id}" data-focus="1"`:''}><div class="oid"><b>${dk.id}</b><small>${s.id}</small></div><div class="od">${t?(t.state==='arriving'?'Reserved · '+t.id+' docking':t.op+' '+t.id):'Free · ready'}</div><div class="op">${t?opPill(t.state==='arriving'?'Docking':t.op):pill('Available','neutral')}</div><div class="opr">${t&&t.state==='docked'?`<div class="bar"><i style="width:${t.units/t.total*100}%"></i></div>${t.units}/${t.total}`:'<span class="muted">—</span>'}</div>${ic('chevR','#64748b',14)}</button>`}).join('');
  if(opsTab==='Trucks')rows=state.trucks.map(t=>`<button class="orow ${selected===t.id?'sel':''}" data-sel="${t.id}" data-focus="1"><div class="oid"><b>${t.id.replace('TRK-','T-')}</b><small>${t.carrier.split(' ')[0]}</small></div><div class="od">${t.state==='docked'?t.op+' at '+state.docks[t.dock].id:t.state==='waiting'?'At gate · '+t.waitMin+' min':t.state==='arriving'?'Docking → '+state.docks[t.dock].id:'En route · ETA '+t.eta+' min'}</div><div class="op">${opPill(t.state==='docked'?'Docked':t.state==='waiting'?'At gate':t.state==='arriving'?'Docking':'En route')}</div><div class="opr">${(()=>{const L=nextLeg(t);return L.buf==null?`<span class="muted">${L.short}</span>`:`<span style="color:${L.buf<20?'#b45309':'#15803d'};white-space:nowrap">→ ${L.short} · +${L.buf}m</span>`})()}</div>${ic('chevR','#64748b',14)}</button>`).join('');
  $('ops').innerHTML=`<div class="tabs"><div class="thumb" style="width:24px;height:24px;border-radius:6px;background:#eaf1ff">${ic('grid','#2563eb',14)}</div><div class="seg">${tabs.map(([n,c])=>`<button class="tab ${opsTab===n?'on':''}" data-tab="${n}">${n} <span>${c}</span></button>`).join('')}</div><div class="spacer"></div><span class="muted" style="font-size:11px">${s.name}</span></div><div class="opsrows">${rows}</div>`}

function renderAlerts(){const al=entAlerts();$('alertMenu').innerHTML='<div class="dd-label">ALERTS · '+state.site.id+'</div>'+(al.length?al.map(a=>`<button class="dd-item" data-sel="${a.id}" data-focus="1"><div class="thumb" style="width:30px;height:30px;border-radius:8px;background:${a.lvl==='bad'?'#fee2e2':'#fef3c7'}">${ic('warn',a.lvl==='bad'?'#b91c1c':'#b45309',15)}</div><span><div style="font-weight:600">${a.title}</div><div class="site-meta">${a.sub}</div></span></button>`).join(''):'<div class="dd-item muted">All clear — no alerts</div>')}
function renderAll(){renderTop();renderSiteMenu();renderRoute();renderKPIs();renderDetail();renderShip();renderOps();refreshMarkers();refreshOps()}

/* ---------- actions ---------- */
function setDoor(dk){const k=dk.openK;if(!dk.door)return;dk.door.scale.y=Math.max(.06,1-k*.94);dk.door.position.y=2.4+2.2*(1-dk.door.scale.y);dk.glow.visible=k>.15}
function stepDoors(dt){if(state.kind!=='wh')return;state.docks.forEach(dk=>{if(!dk.door)return;const t=dk.truck&&state.trucks.find(x=>x.id===dk.truck);
  let want=0;if(t){if(t.state==='docked')want=1;else if(t.state==='arriving'){const e=ents[t.id];want=e&&e.obj.position.z<27&&e.obj.position.x<W/2?1:0}}
  if(Math.abs(dk.openK-want)>.001){dk.openK+=Math.sign(want-dk.openK)*Math.min(Math.abs(want-dk.openK),dt*.55);setDoor(dk)}})}
function assignDock(truckId,di){const t=state.trucks.find(x=>x.id===truckId);const e=ents[truckId];const dk=state.docks[di];if(dk.truck)return;
  t.state='arriving';t.dock=di;dk.truck=t.id;dk.lamp.material=M('#3b82f6',{emissive:'#3b82f6',emissiveIntensity:1});
  const x=dockX(di);const gx=W/2+9;
  // smooth manoeuvre: pull past the dock, swing the nose out, then reverse in a straight line
  const V3=(a,b)=>new THREE.Vector3(a,0,b);
  const fw=new THREE.CatmullRomCurve3([V3(gx,26.5),V3(gx,22.5),V3(gx-3.5,20.2),V3(x+4,20.2),V3(x-3.5,22.4),V3(x-8.5,26.8)],false,'centripetal').getSpacedPoints(46);
  const rv=new THREE.CatmullRomCurve3([V3(x-8.5,26.8),V3(x-4.6,23.6),V3(x-1.2,19.2),V3(x,15.2),V3(x,12)],false,'centripetal').getSpacedPoints(30);
  e.path=[{v:V3(gx+3,30)}].concat(fw.slice(1).map(v=>({v,turn:14})),rv.slice(1).map(v=>({v,rev:true,turn:14,sp:3.6})),[{v:V3(x,9.6),rev:true,turn:20,sp:2.6,snap:true},{v:V3(x,7.5),rev:true,turn:20,sp:1.4,snap:true}]);
  e.speed=9;barrier(true);tween={t:0,dur:1.2,fromT:controls.target.clone(),toT:new THREE.Vector3(x+6,0,14),off:camera.position.clone().sub(controls.target),fromZ:camera.zoom,toZ:1.35};
  e.onArrive=()=>{e.obj.position.set(x,0,7.5);e.obj.rotation.y=0;t.state='docked';t.op='Unloading';t.units=0;t.ship.step=4;barrier(false);dk.lamp.material=M('#f59e0b',{emissive:'#f59e0b',emissiveIntensity:1});toast(t.id+' docked at '+dk.id+' · unloading started');renderAll()};
  toast(dk.id+' assigned to '+t.id+' · gate opening','dock','#93c5fd');renderAll()}
let barrierTarget=0;function barrier(open){barrierTarget=open?Math.PI/2.2:0}
function sendToCharger(fid){const ci=freeCharger();if(ci<0)return;const f=state.fls.find(x=>x.id===fid);const e=ents[fid];
  const t=f.truck;f.prevOp=f.op;f.op='To charger';f.charger='C'+(ci+1);f.slot=ci;state.chargers[ci].fl=f.id;e.loop=null;e.carry=false;
  const sp=chargeSpot(ci);const gp=e.obj.position;e.path=[{v:new THREE.Vector3(gp.x,0,AISLE)},{v:new THREE.Vector3(-W/2-1.8,0,AISLE)},{v:new THREE.Vector3(-W/2-1.8,0,sp.z)},{v:sp.clone(),turn:5}];e.speed=4;
  e.onArrive=()=>{e.obj.rotation.y=-Math.PI/2;f.op='Charging';toast(f.id+' connected to '+f.charger);renderAll()};
  toast(f.id+' heading to charger '+f.charger,'bolt','#fcd34d');
  // reassign idle forklift to its truck
  if(t){const spare=state.fls.find(x=>x.op==='Moving');if(spare){spare.op=f.prevOp;spare.truck=t;spare.dock=f.dock;setForkliftLoop(ents[spare.id],1,false);toast(spare.id+' takes over '+t,'fork','#93c5fd')}}
  f.truck=null;f.dock=null;renderAll()}
function release(fid){const f=state.fls.find(x=>x.id===fid);const c=state.chargers.find(x=>x.fl===fid);if(c)c.fl=null;f.op='Available';f.speed='0';f.truck=null;f.dock=null;
  const e=ents[fid];e.path=[{v:new THREE.Vector3(-W/2-1.8,0,e.obj.position.z),rev:true},{v:new THREE.Vector3(-W/2-1.8,0,AISLE-2)}];e.speed=3;e.onArrive=()=>renderAll();toast(fid+' released · available');renderAll()}

document.addEventListener('click',ev=>{const b=ev.target.closest('button,[data-sel]');
  if(!ev.target.closest('.dropdown')&&!ev.target.closest('#siteBtn')&&!ev.target.closest('#bellBtn')&&!ev.target.closest('#langBtn'))document.querySelectorAll('.dropdown').forEach(d=>{if(!d.contains(ev.target)&&d.id!=='qres')d.classList.remove('open')});
  if(!b)return;
  if(b.dataset.go){travelTo(b.dataset.go);return}
  if(b.dataset.jstage!=null){state.jpT=+b.dataset.jstage;return}
  if(b.dataset.site){travelTo(b.dataset.site);$('siteMenu').classList.remove('open');return}
  if(b.dataset.tab){opsTab=b.dataset.tab;renderOps();return}
  if(b.dataset.dock!=null&&selected){assignDock(selected,+b.dataset.dock);return}
  if(b.dataset.sel){select(b.dataset.sel,true);document.querySelectorAll('.dropdown').forEach(d=>d.classList.remove('open'));return}
  const a=b.dataset.a;if(a==='track'){J.pending=1;travelTo('ROUTE');return}if(a==='risk'){J.pending=7;travelTo('ROUTE');return}if(a==='overview'){const mx=(homeT().x+state.linkX)/2;tween={t:0,dur:1,fromT:controls.target.clone(),toT:new THREE.Vector3(mx,0,-10),off:CAMDIR.clone().multiplyScalar(160),fromZ:camera.zoom,toZ:.3};return}
  if(state.kind==='air'&&a&&airAction(a))return;if(a==='close')select(null);if(a==='focus'&&selected)focusOn(selected);
  if(a==='charge')sendToCharger(selected);if(a==='release')release(selected);
  if(a==='reorder'){const p=ents[selected].data;p.reorder=true;toast('Replenishment order created · '+p.sku+' · 400 units');renderAll()}
  if(a==='pick'){toast('Pick task created for '+ents[selected].data.sku,'clip','#93c5fd')}
  const v=b.dataset.v;if(v==='in')zoomBy(1.3);if(v==='out')zoomBy(1/1.3);if(v==='rl')rotateBy(-Math.PI/4);if(v==='rr')rotateBy(Math.PI/4);if(v==='home'){tween={t:0,dur:.7,fromT:controls.target.clone(),toT:homeT(),off:CAMDIR.clone().multiplyScalar(120),fromZ:camera.zoom,toZ:homeZ()}}
});
$('siteBtn').onclick=e=>{e.stopPropagation();$('alertMenu').classList.remove('open');$('siteMenu').classList.toggle('open')};
$('bellBtn').onclick=e=>{e.stopPropagation();$('siteMenu').classList.remove('open');renderAlerts();$('alertMenu').classList.toggle('open')};
$('liveBtn').onclick=()=>setOffline(!state.offline);$('retry').onclick=()=>{toast('Reconnecting…','clock','#93c5fd');setTimeout(()=>setOffline(false),900)};
function setOffline(v){state.offline=v;document.body.classList.toggle('offline',v);if(v)$('offTxt').textContent='Showing data from '+hhmm(0)+' — values may be outdated.';else toast('Live data restored');renderDetail()}
// search
const q=$('q'),qres=$('qres');
function searchItems(){const items=[];SITES.forEach(s=>items.push({k:'Sites',id:s.id,t:s.id+' · '+s.name,site:s.id}));
  state.trucks.forEach(t=>{items.push({k:'Trucks',id:t.id,t:t.id+' · '+t.carrier});items.push({k:'Shipments',id:t.id,t:t.ship.id+' → '+t.ship.to})});
  state.fls.forEach(f=>items.push({k:'Forklifts',id:f.id,t:f.id+' · '+f.operator}));state.pallets.forEach(p=>items.push({k:'Pallets',id:p.id,t:p.sku+' · '+p.loc}));state.chargers.forEach(c=>items.push({k:'Chargers',id:c.id,t:'Charger '+c.id}));
  if(state.ulds){items.push({k:'Flights',id:state.flight.id,t:state.flight.id+' · '+state.flight.from+' → '+state.flight.to});state.ulds.forEach(u=>items.push({k:'ULDs',id:ents[u.id]?u.id:state.flight.id,t:u.id+' · '+u.pos+' · '+u.ship.id}))}
  return items}
let qList=[];
function renderSearch(){const v=q.value.trim().toLowerCase();if(!v){qres.classList.remove('open');return}
  qList=searchItems().filter(i=>(i.t+' '+tr(i.t)).toLowerCase().includes(v)||i.id.toLowerCase().includes(v)).slice(0,8);
  let last='';qres.innerHTML=qList.length?qList.map((i,n)=>{const h=i.k!==last?`<div class="dd-label">${i.k.toUpperCase()}</div>`:'';last=i.k;return h+`<button class="dd-item ${n===0?'active':''}" ${i.site?`data-site="${i.site}"`:`data-sel="${i.id}"`}>${ic(i.k==='Trucks'||i.k==='Shipments'?'truck':i.k==='Forklifts'?'fork':i.k==='Sites'?'home':i.k==='Chargers'?'bolt':'box','#64748b',15)}${i.t}</button>`}).join(''):'<div class="dd-item muted">No results. Try “FL-11”, “#SHP” or “helmet”</div>';qres.classList.add('open')}
q.addEventListener('input',renderSearch);q.addEventListener('focus',renderSearch);
q.addEventListener('keydown',e=>{if(e.key==='Enter'&&qList[0]){const i=qList[0];i.site?travelTo(i.site):select(i.id,true);q.value='';qres.classList.remove('open');q.blur()}if(e.key==='Escape'){q.value='';qres.classList.remove('open');q.blur()}});
qres.addEventListener('click',()=>{q.value='';qres.classList.remove('open')});
addEventListener('keydown',e=>{if(e.key==='/'&&document.activeElement!==q){e.preventDefault();q.focus()}if(e.key==='Escape'&&document.activeElement!==q)select(null)});
function hideHint(){$('hint').classList.add('gone')}$('hintX').onclick=hideHint;setTimeout(hideHint,14000);

function loadSite(id){const s=SITES.find(x=>x.id===id);const off=state?.offline;if(J.tag)J.tag.style.display='none';state=(s.kind==='journey'?(()=>{const st=genJourney(s);if(J.pending!=null){st.jp=st.jpT=J.pending;J.pending=null}return st})():s.kind==='air'?genAir(s):genSite(s));state.kind=s.kind||'wh';if(state.kind==='air'&&!['Flights','ULDs','Equipment'].includes(opsTab))opsTab='ULDs';if(state.kind==='wh'&&!['Docks','Forklifts','Trucks'].includes(opsTab))opsTab='Forklifts';state.offline=!!off;selected=null;hovered=null;marker=null;hoverMarker=null;build();renderAll();
  tween={t:0,dur:.7,fromT:controls.target.clone(),toT:homeT(),off:CAMDIR.clone().multiplyScalar(120),fromZ:camera.zoom,toZ:homeZ()};
  controls.enabled=state.kind!=='journey';document.body.classList.toggle('journey',state.kind==='journey');if(state.kind==='journey'){tween=null;select(null,false,true)}else select(state.kind==='air'?state.flight.id:s.id,false,true);if(document.readyState==='complete'&&performance.now()>3000)toast('Switched to '+s.id+' · '+s.name,'home','#93c5fd')}

/* ================= LOOP ================= */
const clock=new THREE.Clock();const v3=new THREE.Vector3();
function placeLabel(el,pos,dy=0){v3.copy(pos).project(camera);const x=(v3.x+1)/2*innerWidth,y=(1-v3.y)/2*innerHeight;el.style.left=x+'px';el.style.top=(y+dy)+'px';el.style.display=(v3.z>1||x<-50||x>innerWidth+50)?'none':''}
let tClock=0;
function loop(){const dt=Math.min(clock.getDelta(),.05);
  movers.forEach(e=>stepMover(e,dt));
  stepDoors(dt);
  if(state.kind==='air')stepAir(dt);
  if(state.kind==='journey')updateJourney(dt);
  state.fls.forEach(f=>{const e=ents[f.id];if(e&&e.path&&!movers.includes(e))stepMover(e,dt)});
  state.trucks.forEach(t=>{const e=ents[t.id];if(e&&e.path&&!movers.includes(e))stepMover(e,dt)});
  if(booth){const arm=booth.getObjectByName('arm');arm.rotation.z+=(-barrierTarget-arm.rotation.z)*Math.min(1,dt*3)}
  if(marker){const f=marker.userData.fill;if(f)f.material.opacity=.1+Math.sin(performance.now()/300)*.06}
  stepTween(dt);controls.update();sun.position.copy(controls.target).add(SUNOFF);sun.target.position.copy(controls.target);renderer.render(scene,camera);
  Object.entries(tagEls).forEach(([id,el])=>{const e=ents[id];if(!e)return;if(e.labelPos)v3.copy(e.labelPos);else e.obj.getWorldPosition(v3);v3.y+=e.h;placeLabel(el,v3.clone(),-6)});
  dockChips.forEach(c=>{if(!c.el)return;if(c.minZoom&&camera.zoom<c.minZoom){c.el.style.display='none';return}placeLabel(c.el,c.pos)});
  tClock+=dt;if(tClock>1){tClock=0;if(state.kind==='air')airTick();if(!state.offline)$('clock').textContent='Live '+hhmm(0);
    // simulate progress
    if(!state.offline&&Math.random()<.04){const t=state.trucks.find(x=>x.state==='docked'&&x.units<x.total);if(t){t.units++;if(t.units>=t.total&&t.op==='Unloading'){toast(t.id+' fully unloaded at '+state.docks[t.dock].id)}renderShip();renderOps();if(selected===t.id)renderDetail()}}
    if(!state.offline){const w=state.trucks.find(x=>x.state==='waiting');if(w&&Math.random()<.02){w.waitMin++;refreshMarkers();if(selected===w.id)renderDetail()}}}
  requestAnimationFrame(loop)}

/* ================= OPS PLATFORM: shared data layer, modules, tables, drawers, 3D sync ================= */
Object.assign(I,{chart:'<path d="M3 3v18h18"/><path d="M7 14l4-4 3 3 5-6"/>',dots:'<circle cx="5" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="19" cy="12" r="1.6"/>',
 plus:'<path d="M12 5v14M5 12h14"/>',down:'<path d="M12 4v11M7 10l5 5 5-5"/><path d="M4 20h16"/>',cols:'<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M9 4v16M15 4v16"/>',
 edit:'<path d="M4 20h4L19 9l-4-4L4 16z"/>',expand:'<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/>',list:'<path d="M8 6h13M8 12h13M8 18h13"/><circle cx="4" cy="6" r="1"/><circle cx="4" cy="12" r="1"/><circle cx="4" cy="18" r="1"/>',
 gate:'<path d="M3 21V5M21 21V5"/><path d="M3 9h18"/><path d="M7 9v4M11 9v4M15 9v4"/>',pin:'<path d="M12 22s7-7 7-12a7 7 0 0 0-14 0c0 5 7 12 7 12z"/><circle cx="12" cy="10" r="2.5"/>'});
const MIN=60000;const now0=()=>Date.now();
const CARRIERS=['Northline','Bluepeak','Atlas Haul','Harbor Freight','Riverline Cargo'];
const DRIVERS=['Owen Reyes','Ivy Chen','Sam Doyle','Nina Petrova','Arjun Mehta','Lea Novak'];
const CARGO=['Consumer goods','Packaging materials','Safety equipment','Electronics','Food (ambient)','Spare parts'];
const OPS={open:null,drawer:null,syncing:false,extra:[],ts:{},log:[],loading:false,err:null,ana:{range:'7',from:'',to:''},filt:{}};
const fT=d=>{if(d==null)return '—';const t=new Date(d);const today=new Date().toDateString()===t.toDateString();return (today?'':t.toLocaleDateString('en-GB',{day:'2-digit',month:'short'})+' ')+pad(t.getHours())+':'+pad(t.getMinutes())};
const fDur=m=>{if(m==null||isNaN(m))return '—';m=Math.max(0,Math.round(m));return m>=60?Math.floor(m/60)+' h '+pad(m%60)+' min':m+' min'};
const hx=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
/* ---------- data layer (mock, linked to the 3D scene state) ---------- */
function buildDB(st){const s=st.site,r=rngOf(s.seed*13),N=now0();
  const plate=()=>{const L='ABCEHKMOPTX';return L[Math.floor(r()*11)]+L[Math.floor(r()*11)]+' '+(1000+Math.floor(r()*8999))+' '+L[Math.floor(r()*11)]+L[Math.floor(r()*11)]};
  const db={site:s.id,st,vehicles:[],shipments:[],pallets:[],equipment:[],docks:[],gates:[],tasks:[],zones:[],hist:[],seq:{shp:79300,task:1100,plt:900}};
  db.zones=[{id:'Staging A',cap:4,in3d:true},{id:'Staging B',cap:8,in3d:true},{id:'Dock area',cap:24,in3d:false},{id:'Bulk storage',cap:60,in3d:false},{id:'Quarantine',cap:4,in3d:false}];
  db.gates=[{id:'G1',type:'Entry gate',in3d:true,ov:null,log:[]},{id:'G2',type:'Exit gate',in3d:false,ov:null,log:[]}];
  st.docks.forEach((d,i)=>db.docks.push({id:d.id,idx:i,type:'Dock',in3d:true,ov:null,sched:null,vOv:null,shOv:null,log:[{t:N-(200+i*30)*MIN,msg:'Dock cycle completed · '+CARRIERS[i%5]},{t:N-(420+i*25)*MIN,msg:'Inspection passed'}]}));
  st.trucks.forEach((t,k)=>{const dir=t.op==='Loading'?'Outbound':'Inbound';const arr=t.state==='enroute'?null:N-(22+k*19)*MIN;
    db.vehicles.push({id:t.id,reg:plate(),type:k%3===2?'Box truck 7.5 t':'Tractor + 13.6 m trailer',carrier:t.carrier,driver:t.driver,ref:t,in3d:true,arr,dep:null,shipment:t.ship.id,dockOv:null});
    db.shipments.push({id:t.ship.id,dir,carrier:t.carrier,vehicle:t.id,cargo:CARGO[k%6],qty:t.total,unit:'pallets',eta:t.state==='enroute'?N+t.eta*MIN:N-(30+k*19)*MIN,etd:N+(dir==='Outbound'?45+k*12:80+k*12)*MIN,actual:arr,gate:'G1',dock:t.dock!=null?st.docks[t.dock].id:null,prio:t.state==='waiting'?'Urgent':k===0?'High':'Normal',ov:null,dest:t.ship.to,created:N-(600+k*40)*MIN})});
  [['Scheduled',95,'Inbound'],['Delayed',-18,'Inbound'],['Departed',-45,'Outbound']].forEach(([stt,m,dir],k)=>{const id='TRK-'+(2510+k*37+Math.floor(r()*20));const shid='#SHP-'+(79100+k*37);
    db.vehicles.push({id,reg:plate(),type:'Tractor + 13.6 m trailer',carrier:CARRIERS[(k+2)%5],driver:DRIVERS[k+2],ref:null,in3d:false,status:stt,loc:stt==='Departed'?'Left site via G2':'Off-site',arr:stt==='Departed'?N-190*MIN:null,dep:stt==='Departed'?N+m*MIN:null,shipment:shid,dockOv:null});
    db.shipments.push({id:shid,dir,carrier:CARRIERS[(k+2)%5],vehicle:id,cargo:CARGO[(k+3)%6],qty:4+k*3,unit:'pallets',eta:N+m*MIN,etd:N+(m+90)*MIN,actual:stt==='Departed'?N-190*MIN:null,gate:stt==='Departed'?'G2':'G1',dock:null,prio:stt==='Delayed'?'High':'Normal',ov:stt==='Departed'?'Completed':stt==='Delayed'?'Delayed':'Scheduled',dest:dir==='Outbound'?'Newark, NJ':s.id,created:N-(900+k*60)*MIN})});
  db.shipments.push({id:'#SHP-79205',dir:'Outbound',carrier:'Riverline Cargo',vehicle:null,cargo:null,qty:8,unit:'pallets',eta:N+150*MIN,etd:N+210*MIN,actual:null,gate:'G2',dock:null,prio:'Normal',ov:'Scheduled',dest:'Trenton, NJ',created:N-300*MIN});
  db.shipments.push({id:'#SHP-79188',dir:'Inbound',carrier:'Atlas Haul',vehicle:null,cargo:'Spare parts',qty:3,unit:'pallets',eta:N+60*MIN,etd:N+120*MIN,actual:null,gate:'G1',dock:null,prio:'Low',ov:'Cancelled',dest:s.id,created:N-1300*MIN});
  const occ=st.docks.find(d=>d.truck);const schd=db.shipments.find(x=>x.ov==='Scheduled'&&x.vehicle);if(occ&&schd)schd.dock=occ.id;
  const inb=db.shipments.filter(x=>x.dir==='Inbound'&&!x.ov),outb=db.shipments.filter(x=>x.dir==='Outbound'&&!x.ov);
  st.pallets.forEach((p,i)=>{const sh=inb[i%Math.max(1,inb.length)]||db.shipments[0];
    db.pallets.push({id:p.id,ref:p,in3d:true,shipment:sh.id,desc:p.sku,type:sh.cargo||'General',qty:p.qty,weight:180+Math.floor(r()*620),zone:i<4?'Staging A':'Staging B',pos:(i<4?'A':'B')+'-'+pad(i%4+1),arr:N-(70+i*48)*MIN,status:'In Storage',ov:null})});
  const addP=(sh,status,zone,pos,n)=>{for(let k=0;k<n;k++)db.pallets.push({id:'PLT-'+(db.seq.plt++),ref:null,in3d:false,shipment:sh.id,desc:sh.cargo?sh.cargo+' · lot '+(k+1):'Unspecified',type:sh.cargo||'—',qty:20+Math.floor(r()*80),weight:150+Math.floor(r()*700),zone,pos:pos+'-'+pad(k+1),arr:status==='Expected'?null:N-(30+k*12)*MIN,status,ov:null})};
  outb.forEach(sh=>{const v=st.trucks.find(t=>t.id===sh.vehicle);addP(sh,'In Transit','Dock area',(sh.dock||'DA'),Math.min(3,v?v.units:2))});
  inb.slice(0,2).forEach(sh=>addP(sh,'Received','Dock area',(sh.dock||'DA'),2));
  const sc=db.shipments.find(x=>x.ov==='Scheduled'&&x.vehicle);if(sc)addP(sc,'Expected','—','EXP',3);
  const dp=db.shipments.find(x=>x.ov==='Completed');if(dp)addP(dp,'Dispatched','—','OUT',2);
  addP(inb[0]||db.shipments[0],'Damaged','Quarantine','Q',1);
  for(let k=0;k<5;k++)db.pallets.push({id:'PLT-'+(db.seq.plt++),ref:null,in3d:false,shipment:(inb[k%Math.max(1,inb.length)]||db.shipments[0]).id,desc:CARGO[k%6]+' · bulk',type:CARGO[k%6],qty:40+k*12,weight:300+k*90,zone:'Bulk storage',pos:'R'+(k+1)+'-0'+(k%3+1),arr:N-(1440+k*300)*MIN,status:k===2?'Reserved':'In Storage',ov:null});
  st.fls.forEach(f=>db.equipment.push({id:f.id,type:'Forklift',model:f.model,operator:f.operator==='—'?null:f.operator,ref:f,in3d:true,hours:900+Math.floor(r()*2300),maint:N+(6+Math.floor(r()*40))*1440*MIN,ov:null,mlog:[{t:N-62*1440*MIN,msg:'Scheduled service · brakes, hydraulics'},{t:N-140*1440*MIN,msg:'Battery check'}]}));
  st.chargers.forEach(c=>db.equipment.push({id:c.id,type:'Charging station',model:c.power,operator:null,ref:c,in3d:true,hours:3100+Math.floor(r()*900),maint:N+(20+c.slot*9)*1440*MIN,ov:null,mlog:[{t:N-90*1440*MIN,msg:'Connector replaced'}]}));
  db.equipment.push({id:'RT-01',type:'Reach truck',model:'Jungheinrich ETV 214',operator:null,ref:null,in3d:false,status:'Maintenance',batt:54,loc:'Workshop',hours:4120,maint:N+2*1440*MIN,ov:null,mlog:[{t:N-1*1440*MIN,msg:'Mast sensor fault · in repair'}]});
  db.equipment.push({id:'PJ-02',type:'Electric pallet jack',model:'Linde T20',operator:null,ref:null,in3d:false,status:'Available',batt:77,loc:'Dock area',hours:1630,maint:N+33*1440*MIN,ov:null,mlog:[]});
  db.equipment.push({id:'YT-01',type:'Yard tractor',model:'Kalmar T2',operator:'Arjun Mehta',ref:null,in3d:false,status:'Out of Service',batt:42,fuel:true,loc:'Gate G2 area',hours:6870,maint:N-1*1440*MIN,ov:null,mlog:[{t:N-40*MIN,msg:'Engine warning · stopped near G2'}]});
  let tn=1100;const T=(type,desc,o)=>db.tasks.push(Object.assign({id:'T-'+(tn++),type,desc,shipment:null,vehicle:null,operator:null,prio:'Normal',created:N-(30+db.tasks.length*14)*MIN,due:N+(40+db.tasks.length*20)*MIN,status:'Open',auto:null},o));
  st.trucks.filter(t=>t.state==='docked').forEach(t=>{const fl=st.fls.find(f=>f.truck===t.id);T(t.op==='Loading'?'Load':'Unload',`${t.op} ${t.total} pallets · ${t.id} at ${st.docks[t.dock].id}`,{shipment:t.ship.id,vehicle:t.id,operator:fl?fl.operator:null,status:'In Progress',prio:t.ship.id==='#SHP-78570'?'High':'Normal'})});
  st.trucks.filter(t=>t.state==='waiting').forEach(t=>T('Assign dock',`Assign a free dock to ${t.id} waiting at G1`,{shipment:t.ship.id,vehicle:t.id,prio:'Urgent',auto:'dock:'+t.id}));
  st.fls.filter(f=>f.battery<20).forEach(f=>T('Charge equipment',`Send ${f.id} to a free charger (${f.battery}%)`,{operator:f.operator,prio:'Urgent',auto:'charge:'+f.id}));
  st.pallets.filter(p=>p.low).forEach(p=>T('Replenish',`Replenish ${p.sku} at ${p.loc}`,{prio:'Normal',auto:'reorder:'+p.id}));
  const dmg=db.pallets.find(p=>p.status==='Damaged');if(dmg)T('Inspect damage',`Inspect ${dmg.id} in Quarantine`,{shipment:dmg.shipment,prio:'High',status:'Blocked'});
  T('Complete shipment data','Cargo type and vehicle missing for #SHP-79205',{shipment:'#SHP-79205',prio:'Normal'});
  T('Equipment repair','Tow YT-01 to workshop and diagnose',{operator:'Arjun Mehta',prio:'High',status:'Open'});
  T('Yard check','Hourly safety walk · gates and docks',{operator:'Leo Garcia',prio:'Low',status:'Completed'});
  const hr=rngOf(s.seed*31);const nd=s.docks;
  for(let d=30;d>=1;d--){const arrivals=9+Math.floor(hr()*9);const delayed=Math.round(arrivals*(.04+hr()*.12));
    db.hist.push({day:new Date(N-d*1440*MIN).setHours(12,0,0,0),inb:Math.round(arrivals*(.5+hr()*.15)),outb:6+Math.floor(hr()*9),arrivals,delayed,turn:68+hr()*44,load:34+hr()*22,occ:48+hr()*38,util:52+hr()*34,docks:[...Array(nd)].map(()=>35+hr()*55)})}
  OPS.log=[{t:N-12*MIN,msg:'Check-in completed · '+(st.trucks[0]?.id||'')},{t:N-35*MIN,msg:'Dock assigned · '+(st.docks.find(d=>d.truck)?.id||'D1')},{t:N-58*MIN,msg:'Shipment created · #SHP-79205'},{t:N-95*MIN,msg:'Pallet moved to Quarantine · '+(dmg?dmg.id:'')}];
  return db}
const DB=()=>state&&state.db;
const byId=(arr,id)=>arr.find(x=>x.id===id);
function vStatus(v){if(v.ref){const t=v.ref;return t.state==='docked'?t.op:t.state==='waiting'?'At Gate':t.state==='enroute'?'Approaching':t.state==='arriving'?'On Yard':'On Yard'}return v.status}
function vLoc(v){if(v.ref){const t=v.ref,d=DB().st.docks;return t.state==='docked'?'Dock '+d[t.dock].id:t.state==='waiting'?'Gate G1':t.state==='enroute'?'Approach road':'Yard → '+d[t.dock].id}return v.loc}
function vDock(v){return v.ref&&v.ref.dock!=null?DB().st.docks[v.ref.dock].id:v.dockOv}
function shStatus(s){if(s.ov)return s.ov;const v=s.vehicle&&byId(DB().vehicles,s.vehicle);if(!v)return 'Scheduled';const x=vStatus(v);
  return {Loading:'Loading',Unloading:'Unloading','At Gate':'Waiting',Approaching:'Approaching','On Yard':'Check-in','At Dock':'Arrived',Departed:'Completed',Delayed:'Delayed',Scheduled:'Scheduled'}[x]||'Scheduled'}
function shDock(s){const v=s.vehicle&&byId(DB().vehicles,s.vehicle);return (v&&vDock(v))||s.dock}
function dVehicle(d){const t=DB().st.trucks.find(x=>x.dock===d.idx&&x.state!=='enroute');return t?t.id:d.vOv}
function dStatus(d){if(d.ov)return d.ov;const t=DB().st.trucks.find(x=>x.dock===d.idx&&x.state!=='enroute');if(t)return t.state==='arriving'?'Reserved':t.op;if(d.vOv)return 'Occupied';if(d.sched)return 'Reserved';return 'Available'}
function gStatus(g){if(g.ov)return g.ov;if(g.id==='G1'){const w=DB().st.trucks.find(t=>t.state==='waiting');return w?'Occupied':'Available'}return 'Available'}
function eStatus(e){if(e.ov)return e.ov;if(e.ref){if(e.type==='Charging station')return e.ref.fl?'In Use':'Available';const o=e.ref.op;return o==='Charging'?'Charging':o==='Available'?'Available':'In Use'}return e.status}
function eBatt(e){return e.type==='Charging station'?null:e.ref?e.ref.battery:e.batt}
function eLoc(e){if(e.ref){if(e.type==='Charging station')return 'Charging bay A';const f=e.ref,d=DB().st.docks;return f.op==='Charging'?'Charger '+f.charger:f.op==='To charger'?'→ Charger '+f.charger:f.dock!=null?'Dock '+d[f.dock].id+' lane':'Staging'}return e.loc}
function eOper(e){return e.operator}
function pStatus(p){return p.ov||p.status}
function zoneUse(z){return DB().pallets.filter(p=>p.zone===z&&!['Dispatched','Expected'].includes(pStatus(p))).length}
function shPallets(id){return DB().pallets.filter(p=>p.shipment===id)}
function shTasks(id){return DB().tasks.filter(t=>t.shipment===id)}
const ACTIVE_SH=['Approaching','Arrived','Check-in','Waiting','Loading','Unloading','Delayed'];
function alertsOps(){const db=DB(),a=[];
  db.shipments.forEach(s=>{const st=shStatus(s);if(st==='Delayed')a.push({type:'Delayed Arrival',sev:'bad',title:s.id+' delayed',sub:`${s.carrier} · ETA ${fT(s.eta)}`,t:'shipment',id:s.id});
    if(st==='Scheduled'&&s.dock){const d=byId(db.docks,s.dock);if(d&&['Loading','Unloading','Occupied','Reserved'].includes(dStatus(d)))a.push({type:'Dock Conflict',sev:'warn',title:`${s.dock} double-booked`,sub:`${s.id} scheduled ${fT(s.eta)} while ${s.dock} is ${dStatus(d).toLowerCase()}`,t:'dock',id:s.dock})}
    if(!['Cancelled','Completed'].includes(st)&&(!s.cargo||!s.vehicle))a.push({type:'Missing Shipment Information',sev:'warn',title:s.id+' incomplete',sub:(!s.cargo?'Cargo type':'')+(!s.cargo&&!s.vehicle?' and ':'')+(!s.vehicle?'vehicle':'')+' missing',t:'shipment',id:s.id})});
  db.equipment.forEach(e=>{const st=eStatus(e),b=eBatt(e);if(st==='Out of Service')a.push({type:'Equipment Failure',sev:'bad',title:e.id+' out of service',sub:e.type+' · '+(e.mlog[0]?.msg||''),t:'equipment',id:e.id});
    if(b!=null&&b<20&&!['Charging'].includes(st)&&!(e.ref&&e.ref.op==='To charger'))a.push({type:'Low Battery',sev:'bad',title:`${e.id} battery ${b}%`,sub:e.type+' · '+eLoc(e),t:'equipment',id:e.id})});
  db.zones.forEach(z=>{const u=zoneUse(z.id);if(u/z.cap>=.85)a.push({type:'Storage Capacity Warning',sev:'warn',title:`${z.id} ${Math.round(u/z.cap*100)}% full`,sub:`${u} of ${z.cap} positions used`,t:'zone',id:z.id})});
  return a}
function opsTick(){const db=DB();if(!db)return;let ch=false;
  db.tasks.forEach(t=>{if(!t.auto||['Completed','Cancelled'].includes(t.status))return;const [k,id]=t.auto.split(':');let done=false;
    if(k==='dock'){const tr=db.st.trucks.find(x=>x.id===id);done=tr&&tr.state!=='waiting'}
    if(k==='charge'){const f=db.st.fls.find(x=>x.id===id);done=f&&['Charging','To charger'].includes(f.op)}
    if(k==='reorder'){const p=db.st.pallets.find(x=>x.id===id);done=p&&p.reorder}
    if(done){t.status='Completed';ch=true;OPS.log.unshift({t:now0(),msg:`Task ${t.id} completed automatically · ${t.type}`})}});
  return ch}
/* ---------- reusable table ---------- */
function tsOf(k,def){return OPS.ts[k]||(OPS.ts[k]=Object.assign({q:'',f:{},sort:null,dir:1,page:0,size:10,sel:new Set(),hidden:new Set(),act:null},def||{}))}
function prioHTML(p){const c={Low:'#94a3b8',Normal:'#3b82f6',High:'#f59e0b',Urgent:'#dc2626'}[p]||'#94a3b8';return `<span class="prio"><i style="background:${c}"></i>${p}</span>`}
const STATUS_TONE={Scheduled:'neutral',Approaching:'info',Arrived:'info','Check-in':'info',Waiting:'warning',Loading:'success',Unloading:'success',Completed:'neutral',Delayed:'danger',Cancelled:'neutral',
 'On Yard':'info','At Gate':'warning','At Dock':'info',Departed:'neutral',Expected:'neutral',Received:'info','In Storage':'success',Reserved:'warning','In Transit':'info',Dispatched:'neutral',Damaged:'danger',
 Available:'success','In Use':'info',Charging:'warning',Maintenance:'warning','Out of Service':'danger',Occupied:'info',Blocked:'danger',Open:'neutral','In Progress':'info'};
const sb=s=>pill(s,STATUS_TONE[s]||'neutral');
function applyTable(rows,cfg,ts){let r=rows;const q=ts.q.trim().toLowerCase();
  if(q)r=r.filter(x=>cfg.search(x).toLowerCase().includes(q));
  (cfg.filters||[]).forEach(f=>{const v=ts.f[f.k];if(!v)return;r=r.filter(x=>{const val=f.get(x);if(v.startsWith('@'))return (f.groups[v]||[]).includes(val);return val===v})});
  if(ts.sort){const c=cfg.cols.find(c=>c.k===ts.sort);if(c){const g=c.sv||c.v;r=[...r].sort((a,b)=>{const A=g(a),B=g(b);return (A==null?1:B==null?-1:A>B?1:A<B?-1:0)*ts.dir})}}
  return r}
function tableHTML(key,rows,cfg){const ts=tsOf(key);const all=applyTable(rows,cfg,ts);const pages=Math.max(1,Math.ceil(all.length/ts.size));ts.page=Math.min(ts.page,pages-1);
  const pg=all.slice(ts.page*ts.size,ts.page*ts.size+ts.size);const cols=cfg.cols.filter(c=>!ts.hidden.has(c.k));
  const tb=cfg.toolbar===false?'':`<div class="tt"><div class="ts">${ic('search','#64748b',14)}<input data-tq="${key}" value="${hx(ts.q)}" placeholder="${cfg.ph||'Search'}"></div>
   ${(cfg.filters||[]).map(f=>`<select data-tf="${key}:${f.k}"><option value="">${f.label}: all</option>${Object.keys(f.groups||{}).map(g=>`<option value="${g}" ${ts.f[f.k]===g?'selected':''}>${f.groupLabels[g]}</option>`).join('')}${f.opts.map(o=>`<option ${ts.f[f.k]===o?'selected':''}>${o}</option>`).join('')}</select>`).join('')}
   <div class="spacer"></div><button class="btn" data-tcols="${key}" title="Columns">${ic('cols','#0f172a',14)}Columns</button><button class="btn" data-texp="${key}">${ic('down','#0f172a',14)}Export CSV</button>${cfg.primary?`<button class="btn pri" data-a="${cfg.primary.a}">${ic('plus','#fff',14)}${cfg.primary.label}</button>`:''}</div>`;
  const bulk=ts.sel.size&&cfg.bulk?`<div class="bulk"><b>${ts.sel.size} selected</b><div class="spacer"></div>${cfg.bulk(key)}<button class="btn sm" data-texp="${key}" data-sel-only="1">Export selected</button><button class="btn sm" data-tclr="${key}">Clear</button></div>`:'';
  const allChk=pg.length&&pg.every(r=>ts.sel.has(r.id));
  const head=`<tr>${cfg.bulk?`<th class="cb nosort"><input type="checkbox" data-tall="${key}" ${allChk?'checked':''} aria-label="Select page"></th>`:''}${cols.map(c=>`<th class="${c.nosort?'nosort':''} ${ts.sort===c.k?'sorted':''}" data-tsort="${c.nosort?'':key+':'+c.k}">${c.label}<span class="sa">${ts.sort===c.k?(ts.dir>0?'↑':'↓'):'↕'}</span></th>`).join('')}<th class="nosort" style="width:34px"></th></tr>`;
  const body=pg.length?pg.map(r=>`<tr class="${ts.act===r.id?'rsel':''} ${ts.sel.has(r.id)?'chk':''}" data-row="${cfg.type}:${hx(r.id)}">${cfg.bulk?`<td class="cb"><input type="checkbox" data-tsel="${key}:${hx(r.id)}" ${ts.sel.has(r.id)?'checked':''} aria-label="Select ${hx(r.id)}"></td>`:''}${cols.map(c=>`<td>${c.h?c.h(r):hx(c.v(r))}</td>`).join('')}<td><button class="rowm" data-tmenu="${cfg.type}:${hx(r.id)}" aria-label="Actions">${ic('dots','#64748b',14)}</button></td></tr>`).join('')
    :`<tr><td colspan="${cols.length+2}"><div class="empty"><b>${rows.length?'No records match these filters':'No records yet'}</b>${rows.length?`Try another search or <span class="dlink" data-tclrf="${key}">clear filters</span>.`:''}</div></td></tr>`;
  const foot=cfg.toolbar===false?'':`<div class="tfoot"><span>${all.length?ts.page*ts.size+1:0}–${Math.min(all.length,(ts.page+1)*ts.size)} of ${all.length}</span><select class="fsel" data-tsize="${key}">${[10,20,50].map(n=>`<option ${ts.size===n?'selected':''}>${n}</option>`).join('')}</select><button class="btn sm" data-tpage="${key}:-1" ${ts.page===0?'disabled':''}>‹ Prev</button><span>Page ${ts.page+1} / ${pages}</span><button class="btn sm" data-tpage="${key}:1" ${ts.page>=pages-1?'disabled':''}>Next ›</button></div>`;
  return tb+bulk+`<div class="tbw"><table class="dt"><thead>${head}</thead><tbody>${body}</tbody></table></div>`+foot}
/* ---------- module configs ---------- */
const g3=x=>x.in3d?'<span class="tg3 y" title="Shown in the 3D scene">3D</span>':'<span class="tg3 n" title="Data only — not represented in 3D">data</span>';
function CFG(type){const db=DB();
  if(type==='shipments')return {type:'shipment',rows:()=>db.shipments,ph:'Search ID, vehicle or carrier',search:s=>[s.id,s.vehicle,s.carrier].join(' '),primary:{a:'newship',label:'New shipment'},
    filters:[{k:'status',label:'Status',get:shStatus,opts:['Scheduled','Approaching','Arrived','Check-in','Waiting','Loading','Unloading','Completed','Delayed','Cancelled'],groups:{'@active':ACTIVE_SH},groupLabels:{'@active':'Status: all active'}},
     {k:'dir',label:'Direction',get:s=>s.dir,opts:['Inbound','Outbound']},{k:'prio',label:'Priority',get:s=>s.prio,opts:['Low','Normal','High','Urgent']},
     {k:'date',label:'Date',get:s=>{const d=new Date(s.eta),t=new Date();return d.toDateString()===t.toDateString()?'Today':d>t?'Upcoming':'Earlier'},opts:['Today','Upcoming','Earlier']}],
    cols:[{k:'id',label:'Shipment ID',v:s=>s.id,h:s=>`<span class="idc">${hx(s.id)}</span>`},{k:'dir',label:'Direction',v:s=>s.dir},{k:'carrier',label:'Carrier',v:s=>s.carrier},
     {k:'vehicle',label:'Vehicle',v:s=>s.vehicle||'—',h:s=>s.vehicle?hx(s.vehicle):'<span class="mut">Unassigned</span>'},{k:'cargo',label:'Cargo type',v:s=>s.cargo||'—',h:s=>s.cargo?hx(s.cargo):'<span class="mut">Missing</span>'},
     {k:'qty',label:'Qty',v:s=>s.qty,h:s=>s.qty+' <span class="mut">plt</span>'},{k:'eta',label:'ETA / ETD',v:s=>s.dir==='Inbound'?s.eta:s.etd,h:s=>fT(s.dir==='Inbound'?s.eta:s.etd)},
     {k:'gate',label:'Gate',v:s=>s.gate||'—'},{k:'dock',label:'Dock',v:s=>shDock(s)||'—'},{k:'prio',label:'Priority',v:s=>['Low','Normal','High','Urgent'].indexOf(s.prio),h:s=>prioHTML(s.prio)},{k:'status',label:'Status',v:shStatus,h:s=>sb(shStatus(s))}],
    bulk:k=>`<select class="fsel" data-bulk="${k}:status"><option value="">Set status…</option>${['Scheduled','Approaching','Arrived','Check-in','Waiting','Loading','Unloading','Completed','Delayed','Cancelled'].map(o=>`<option>${o}</option>`).join('')}</select>`,
    menu:s=>[['view','View details'],['edit','Edit shipment'],['locate','Locate in 3D'],['st:Completed','Mark completed'],['st:Cancelled','Cancel shipment',1]]};
  if(type==='vehicles')return {type:'vehicle',rows:()=>db.vehicles,ph:'Search vehicle, plate, carrier or driver',search:v=>[v.id,v.reg,v.carrier,v.driver,v.shipment].join(' '),
    filters:[{k:'status',label:'Status',get:vStatus,opts:['Scheduled','Approaching','On Yard','At Gate','At Dock','Loading','Unloading','Departed','Delayed'],groups:{'@yard':['On Yard','At Gate','At Dock','Loading','Unloading']},groupLabels:{'@yard':'Status: on site'}},{k:'carrier',label:'Carrier',get:v=>v.carrier,opts:CARRIERS}],
    cols:[{k:'id',label:'Vehicle ID',v:v=>v.id,h:v=>`<span class="idc">${hx(v.id)}</span>${g3(v)}`},{k:'reg',label:'Registration',v:v=>v.reg},{k:'type',label:'Type',v:v=>v.type},{k:'carrier',label:'Carrier',v:v=>v.carrier},{k:'driver',label:'Driver',v:v=>v.driver},
     {k:'loc',label:'Location',v:vLoc},{k:'shipment',label:'Shipment',v:v=>v.shipment||'—'},{k:'dock',label:'Dock',v:v=>vDock(v)||'—'},{k:'arr',label:'Arrival',v:v=>v.arr,h:v=>fT(v.arr)},{k:'dep',label:'Departure',v:v=>v.dep,h:v=>fT(v.dep)},{k:'status',label:'Status',v:vStatus,h:v=>sb(vStatus(v))}],
    bulk:()=>'',menu:v=>[['view','View details'],['locate','Locate in 3D'],['assigndock','Assign dock']]};
  if(type==='inventory')return {type:'pallet',rows:()=>db.pallets,ph:'Search pallet or shipment ID',search:p=>[p.id,p.shipment,p.desc].join(' '),
    filters:[{k:'zone',label:'Zone',get:p=>p.zone,opts:db.zones.map(z=>z.id).concat(['—'])},{k:'status',label:'Status',get:pStatus,opts:['Expected','Received','In Storage','Reserved','In Transit','Dispatched','Damaged'],groups:{'@yard':['Received','In Storage','Reserved','Damaged']},groupLabels:{'@yard':'Status: on yard'}}],
    cols:[{k:'id',label:'Pallet ID',v:p=>p.id,h:p=>`<span class="idc">${hx(p.id)}</span>${g3(p)}`},{k:'shipment',label:'Shipment',v:p=>p.shipment},{k:'desc',label:'Cargo description',v:p=>p.desc},{k:'type',label:'Cargo type',v:p=>p.type},
     {k:'qty',label:'Qty',v:p=>p.qty},{k:'weight',label:'Weight',v:p=>p.weight,h:p=>p.weight+' kg'},{k:'zone',label:'Zone',v:p=>p.zone},{k:'pos',label:'Position',v:p=>p.pos},
     {k:'arr',label:'Arrival',v:p=>p.arr,h:p=>fT(p.arr)},{k:'dur',label:'Storage',v:p=>p.arr?now0()-p.arr:-1,h:p=>p.arr?fDur((now0()-p.arr)/MIN):'—'},{k:'status',label:'Status',v:pStatus,h:p=>sb(pStatus(p))}],
    bulk:k=>`<select class="fsel" data-bulk="${k}:zone"><option value="">Move to zone…</option>${db.zones.map(z=>`<option>${z.id}</option>`).join('')}</select>`,menu:p=>[['view','View details'],['locate','Locate in 3D'],['move','Move to zone…']]};
  if(type==='equipment')return {type:'equipment',rows:()=>db.equipment,ph:'Search equipment, model or operator',search:e=>[e.id,e.type,e.model,e.operator].join(' '),
    filters:[{k:'type',label:'Type',get:e=>e.type,opts:[...new Set(db.equipment.map(e=>e.type))]},{k:'status',label:'Status',get:eStatus,opts:['Available','In Use','Charging','Maintenance','Out of Service']}],
    cols:[{k:'id',label:'Equipment ID',v:e=>e.id,h:e=>`<span class="idc">${hx(e.id)}</span>${g3(e)}`},{k:'type',label:'Type',v:e=>e.type},{k:'model',label:'Model',v:e=>e.model},{k:'op',label:'Operator',v:e=>e.operator||'—',h:e=>e.operator?hx(e.operator):'<span class="mut">Unassigned</span>'},
     {k:'loc',label:'Location',v:eLoc},{k:'batt',label:'Battery / fuel',v:e=>eBatt(e)??-1,h:e=>{const b=eBatt(e);return b==null?'<span class="mut">n/a</span>':`<span style="display:inline-flex;align-items:center;gap:6px"><span class="bar ${b<20?'red':b<40?'amber':''}" style="width:46px;height:5px;display:inline-block"><i style="width:${b}%"></i></span>${b}%${e.fuel?' fuel':''}</span>`}},
     {k:'hours',label:'Hours',v:e=>e.hours,h:e=>e.hours.toLocaleString('en-US')+' h'},{k:'maint',label:'Next service',v:e=>e.maint,h:e=>{const od=e.maint<now0();return `<span style="${od?'color:#b91c1c;font-weight:600':''}">${new Date(e.maint).toLocaleDateString('en-GB',{day:'2-digit',month:'short'})}${od?' · overdue':''}</span>`}},{k:'status',label:'Status',v:eStatus,h:e=>sb(eStatus(e))}],
    bulk:()=>'',menu:e=>[['view','View details'],['locate','Locate in 3D'],['eq:Maintenance','Send to maintenance'],['eq:','Return to service']]};
  if(type==='docks'){const rows=()=>db.gates.map(g=>({...g,_g:1})).concat(db.docks,campDoors());
    const X=(d,g,c,m)=>d._g?g(d):d._c?c(d):m(d);
    return {type:'dock',rows,ph:'Search gate, dock, vehicle, cargo or shipment',search:d=>X(d,g=>[g.id,g.type].join(' '),c=>[c.id,c.term,c.vehicle,c.cargo,c.ship].join(' '),m=>[m.id,m.type,dVehicle(m),dShip(m),dCargo(m)].join(' ')),
    filters:[{k:'loc',label:'Location',get:d=>d._c?d.term:'Main building',opts:['Main building'].concat(campTerms())},{k:'type',label:'Type',get:d=>d.type,opts:['Entry gate','Exit gate','Dock','Terminal dock']},{k:'status',label:'Status',get:dStat,opts:['Available','Reserved','Occupied','Loading','Unloading','Completed','Blocked','Maintenance']},{k:'cargo',label:'Cargo',get:d=>X(d,()=>'—',c=>c.vehicle||cdStatus(c)==='Reserved'?c.cargo:'—',dCargo),opts:CAMPUS_CARGO.map(c=>c[0])}],
    cols:[{k:'id',label:'Gate / Dock',v:d=>d.id,h:d=>`<span class="idc">${d._c?d.term+' · '+d.label:d.id}</span>${g3(d)}`},{k:'type',label:'Type',v:d=>d.type},{k:'cargo',label:'Cargo',v:d=>X(d,()=>'—',c=>c.vehicle||cdStatus(c)==='Reserved'?c.cargo:'—',m=>dCargo(m)||'—')},
     {k:'veh',label:'Vehicle',v:d=>X(d,gVeh,c=>c.vehicle||'—',m=>dVehicle(m)||'—')},{k:'sh',label:'Shipment',v:d=>X(d,g=>gVeh(g)!=='—'?byId(db.vehicles,gVeh(g))?.shipment:'—',c=>c.ship||'—',m=>dShip(m)||'—')},
     {k:'sched',label:'Scheduled',v:d=>X(d,()=>null,c=>c.sched||c.arr,dSched),h:d=>X(d,()=>'—',c=>fT(c.sched||c.arr),m=>fT(dSched(m)))},{k:'act',label:'Actual arrival',v:d=>X(d,()=>null,c=>c.arr,dActual),h:d=>X(d,()=>'—',c=>fT(c.arr),m=>fT(dActual(m)))},
     {k:'op',label:'Operation',v:d=>X(d,g=>g.type==='Entry gate'?'Check-in':'Check-out',c=>c.vehicle?(c.dir==='Outbound'?'Loading':'Unloading')+' · '+cdProg(c)+'%':'—',dOp)},{k:'dur',label:'Duration',v:d=>(d._c?(d.arr?(now0()-d.arr)/MIN:null):dDur(d))??-1,h:d=>fDur(d._c?(d.arr?(now0()-d.arr)/MIN:null):dDur(d))},{k:'status',label:'Status',v:dStat,h:d=>sb(dStat(d))}],
    bulk:()=>'',menu:d=>[['view','View details'],['locate','Locate in 3D'],['blk:Blocked','Block'],['blk:Maintenance','Set maintenance'],['blk:','Clear block / maintenance']]}}
  if(type==='tasks')return {type:'task',rows:()=>db.tasks,ph:'Search task, shipment, vehicle or operator',search:t=>[t.id,t.type,t.desc,t.shipment,t.vehicle,t.operator].join(' '),primary:{a:'newtask',label:'New task'},
    filters:[{k:'status',label:'Status',get:t=>t.status,opts:['Open','In Progress','Blocked','Completed','Cancelled'],groups:{'@open':['Open','In Progress','Blocked']},groupLabels:{'@open':'Status: not done'}},{k:'prio',label:'Priority',get:t=>t.prio,opts:['Low','Normal','High','Urgent']}],
    cols:[{k:'id',label:'Task ID',v:t=>t.id,h:t=>`<span class="idc">${t.id}</span>`},{k:'type',label:'Type',v:t=>t.type},{k:'desc',label:'Description',v:t=>t.desc},{k:'sh',label:'Shipment',v:t=>t.shipment||'—'},{k:'veh',label:'Vehicle',v:t=>t.vehicle||'—'},
     {k:'op',label:'Operator',v:t=>t.operator||'—',h:t=>t.operator?hx(t.operator):'<span class="mut">Unassigned</span>'},{k:'prio',label:'Priority',v:t=>['Low','Normal','High','Urgent'].indexOf(t.prio),h:t=>prioHTML(t.prio)},
     {k:'created',label:'Created',v:t=>t.created,h:t=>fT(t.created)},{k:'due',label:'Due',v:t=>t.due,h:t=>{const od=t.due<now0()&&!['Completed','Cancelled'].includes(t.status);return `<span style="${od?'color:#b91c1c;font-weight:600':''}">${fT(t.due)}</span>`}},{k:'status',label:'Status',v:t=>t.status,h:t=>sb(t.status)}],
    bulk:k=>`<select class="fsel" data-bulk="${k}:op"><option value="">Assign to…</option>${OPERATORS.map(o=>`<option>${o}</option>`).join('')}</select><button class="btn sm" data-bulkdo="${k}:complete">Complete</button>`,
    menu:t=>[['view','View details'],['tk:In Progress','Start'],['tk:Completed','Complete'],['tk:Blocked','Mark blocked'],['tk:Cancelled','Cancel',1]]};}
function campDoors(){return (state&&state.campus)?state.campus.doors:[]}
function campTerms(){return (state&&state.campus)?state.campus.terminals.map(t=>t.id):[]}
function dStat(d){return d._g?gStatus(d):d._c?cdStatus(d):dStatus(d)}
function dCargo(d){const t=dTruck(d);if(!t)return null;const s=byId(DB().shipments,t.ship.id);return s&&s.cargo}
function dTruck(d){return DB().st.trucks.find(x=>x.dock===d.idx&&x.state!=='enroute')}
function dShip(d){const t=dTruck(d);if(t)return t.ship.id;if(d.shOv)return d.shOv;const s=DB().shipments.find(x=>x.dock===d.id&&shStatus(x)==='Scheduled');return s?s.id:null}
function dSched(d){const t=dTruck(d);if(t){const s=byId(DB().shipments,t.ship.id);return s?s.eta:null}if(d.sched)return d.sched;const s=DB().shipments.find(x=>x.dock===d.id&&shStatus(x)==='Scheduled');return s?s.eta:null}
function dActual(d){const t=dTruck(d);if(!t)return null;const v=byId(DB().vehicles,t.id);return v?v.arr:null}
function dOp(d){const t=dTruck(d);return t?(t.state==='arriving'?'Docking':t.op):d.vOv?'Occupied':'—'}
function dDur(d){if(d._g){const w=DB().st.trucks.find(t=>t.state==='waiting');return d.id==='G1'&&w?w.waitMin:null}const a=dActual(d);return a?(now0()-a)/MIN:null}
function gVeh(g){if(g.id!=='G1')return '—';const w=DB().st.trucks.find(t=>t.state==='waiting');return w?w.id:'—'}
/* ---------- shell: rail, workspace, drawer, popover, modal ---------- */
const MODS=[['overview','Overview','grid'],['shipments','Shipments','box'],['vehicles','Vehicles','truck'],['inventory','Inventory','list'],['equipment','Equipment','fork'],['docks','Gates & Docks','gate'],['tasks','Tasks & Alerts','warn'],['analytics','Analytics','chart']];
(function mountShell(){const rail=document.createElement('nav');rail.id='rail';rail.className='ui';rail.setAttribute('aria-label','Operations navigation');document.body.appendChild(rail);
  const ws=document.createElement('section');ws.id='ws';ws.className='ui card';ws.setAttribute('aria-live','polite');document.body.appendChild(ws);
  const dw=document.createElement('aside');dw.id='drawer';dw.className='ui card';dw.setAttribute('aria-label','Record details');document.body.appendChild(dw);
  const pop=document.createElement('div');pop.id='pop';document.body.appendChild(pop);
  const md=document.createElement('div');md.id='modal';md.innerHTML='<div class="mc card" role="dialog" aria-modal="true"></div>';document.body.appendChild(md)})();
function renderRail(){const a=DB()?alertsOps().length:0;const openT=DB()?DB().tasks.filter(t=>['Open','In Progress','Blocked'].includes(t.status)).length:0;
  $('rail').innerHTML=`<button class="rbtn ${!OPS.open?'on':''}" data-mod="" title="3D yard view">${ic('pin',!OPS.open?'#2563eb':'#475569',18)}3D Yard</button><div class="rsep"></div>`+
  MODS.map(([k,l,i])=>`<button class="rbtn ${OPS.open===k?'on':''}" data-mod="${k}" title="${l}"><span class="rb">${ic(i,OPS.open===k?'#2563eb':'#475569',18)}${k==='tasks'&&a?`<i>${a}</i>`:''}</span>${l.replace(' & ','<br>& ')}</button>`).join('')}
function openModule(k,preset){if(!DB())return;if(OPS.drawer&&k!==OPS.open){closeDrawer();clearExtra()}OPS.open=k||null;document.body.classList.toggle('ws',!!OPS.open);
  if(preset){const ts=tsOf(k);ts.f=Object.assign({},preset);ts.page=0;ts.q=''}
  if(!OPS.open){closeDrawer();clearExtra();camera.clearViewOffset();camera.updateProjectionMatrix();renderRail();return}
  OPS.loading=true;renderWS();setTimeout(()=>{OPS.loading=false;renderWS()},220);applyOffset();renderRail()}
function applyOffset(){if(!OPS.open){camera.clearViewOffset();camera.updateProjectionMatrix();return}const w=$('ws').getBoundingClientRect().right;const dr=$('drawer').classList.contains('open')?$('drawer').getBoundingClientRect().width+12:0;
  if(innerWidth<1100){camera.clearViewOffset();camera.updateProjectionMatrix();return}
  camera.setViewOffset(innerWidth,innerHeight,-(w-dr)/2,0,innerWidth,innerHeight);camera.updateProjectionMatrix()}
addEventListener('resize',()=>{if(OPS.open)applyOffset()});
const MODSUB={overview:'Operational snapshot of the yard',shipments:'Inbound and outbound shipments',vehicles:'Trucks and trailers on and around the yard',inventory:'Pallets and cargo on the yard',equipment:'Forklifts, chargers and yard equipment',docks:'Entrances and loading / unloading docks',tasks:'Operational tasks and alerts',analytics:'Performance metrics'};
function renderWS(){if(!OPS.open||!DB())return;const m=MODS.find(x=>x[0]===OPS.open);const keepScroll=$('ws').querySelector('.wsb')?.scrollTop||0;const focusQ=document.activeElement?.dataset?.tq;const caret=document.activeElement?.selectionStart;
  let body='';
  if(OPS.loading)body=`<div class="pnl">${[...Array(6)].map(()=>`<div class="skel" style="margin:12px 0;width:${60+Math.random()*40}%"></div>`).join('')}</div>`;
  else{try{body=OPS.open==='overview'?overviewHTML():OPS.open==='analytics'?analyticsHTML():OPS.open==='tasks'?tasksHTML():tableHTML(OPS.open,CFG(OPS.open).rows(),CFG(OPS.open))}
    catch(err){console.error(err);body=`<div class="errbox"><b>Could not load ${m[1]}.</b> ${hx(err.message)}<div style="margin-top:8px"><button class="btn sm" data-mod="${OPS.open}">Retry</button></div></div>`}}
  $('ws').innerHTML=`<div class="wsh"><div class="thumb" style="width:34px;height:34px;background:#eaf1ff">${ic(m[2],'#2563eb',18)}</div><div><h2>${m[1]}</h2><div class="sub">${MODSUB[m[0]]} · ${state.site.id} ${state.site.name}</div></div><div class="spacer"></div><span class="mockbadge" title="No backend is connected">Demo data · not live</span><button class="btn" data-a="fullyard">${ic('expand','#0f172a',14)}Full yard</button><button class="btn" data-mod="" aria-label="Close workspace">${ic('x','#0f172a',14)}</button></div><div class="wsb">${body}</div>`;
  const b=$('ws').querySelector('.wsb');if(b)b.scrollTop=keepScroll;if(focusQ){const i=$('ws').querySelector(`[data-tq="${focusQ}"]`);if(i){i.focus();try{i.setSelectionRange(caret,caret)}catch(e){}}}}
/* ---------- overview ---------- */
function overviewHTML(){const db=DB();const sh=db.shipments;const al=alertsOps();
  const veh=db.vehicles.filter(v=>!['Departed'].includes(vStatus(v)));const act=sh.filter(s=>ACTIVE_SH.includes(shStatus(s)));const onYard=db.pallets.filter(p=>['Received','In Storage','Reserved','Damaged'].includes(pStatus(p)));
  const freeD=db.docks.filter(d=>dStatus(d)==='Available');const actE=db.equipment.filter(e=>eStatus(e)==='In Use');const del=sh.filter(s=>shStatus(s)==='Delayed');
  const K=[['truck','Total vehicles',veh.length,`${db.vehicles.filter(v=>v.in3d).length} in 3D · excl. departed`,'vehicles',{}],['box','Active shipments',act.length,`${sh.length} total today`,'shipments',{status:'@active'}],
    ['list','Pallets on yard',onYard.length,`${db.zones.reduce((a,z)=>a+z.cap,0)} positions`,'inventory',{status:'@yard'}],['dock','Available docks',freeD.length+' / '+db.docks.length,'ready now','docks',{status:'Available'}],
    ['fork','Active equipment',actE.length+' / '+db.equipment.length,'in use now','equipment',{status:'In Use'}],['clock','Delayed shipments',del.length,del.length?'needs attention':'all on schedule','shipments',{status:'Delayed'}]];
  const recent=[...sh].sort((a,b)=>Math.abs(a.eta-now0())-Math.abs(b.eta-now0())).slice(0,6);
  const occD=db.docks.filter(d=>dStatus(d)!=='Available').length;
  return `<div class="kg">${K.map(([i,l,v,s,mod,f],n)=>`<button class="kc ${n===5&&del.length?'warn':''}" data-kpi="${mod}" data-kf='${JSON.stringify(f)}'><div class="kl">${ic(i,'#2563eb',14)}${l}</div><div class="kv">${v}</div><div class="ks">${s} →</div></button>`).join('')}</div>
  <div class="g2"><div><div class="pnl"><h3>Recent shipments<span class="r"><span class="dlink" data-mod="shipments">View all →</span></span></h3>${tableHTML('ov-sh',recent,Object.assign({},CFG('shipments'),{toolbar:false,bulk:null,cols:CFG('shipments').cols.filter(c=>['id','dir','vehicle','eta','dock','status'].includes(c.k))}))}</div>
   <div class="pnl"><h3>Recent activity<span class="r">this session</span></h3>${OPS.log.slice(0,7).map(l=>`<div class="al" style="cursor:default"><div class="ai" style="background:#f1f5f9">${ic('clock','#64748b',13)}</div><div>${hx(l.msg)}<small>${fT(l.t)}</small></div></div>`).join('')}</div></div>
  <div><div class="pnl"><h3>Active alerts<span class="r">${al.length}</span></h3>${al.length?al.slice(0,6).map(alertRow).join(''):'<div class="empty"><b>No active alerts</b></div>'}${al.length>6?`<div class="al"><span class="dlink" data-mod="tasks">+${al.length-6} more →</span></div>`:''}</div>
   <div class="pnl"><h3>Yard occupancy</h3><div class="occ"><span>Docks</span><div class="bar blue"><i style="width:${occD/db.docks.length*100}%"></i></div><b>${occD}/${db.docks.length}</b></div>${campDoors().length?(()=>{const c=campDoors(),u=c.filter(x=>x.vehicle&&cdStatus(x)!=='Completed').length;return `<div class="occ"><span>Depot park doors</span><div class="bar blue"><i style="width:${u/c.length*100}%"></i></div><b>${u}/${c.length}</b></div>`})():''}
   ${db.zones.map(z=>{const u=zoneUse(z.id),p=u/z.cap;return `<div class="occ"><span>${z.id}</span><div class="bar ${p>=.85?'red':p>=.6?'amber':''}"><i style="width:${Math.min(100,p*100)}%"></i></div><b>${u}/${z.cap}</b></div>`}).join('')}</div>
   <div class="pnl"><h3>Quick access</h3><div class="qa">${MODS.slice(1).map(([k,l,i])=>`<button data-mod="${k}">${ic(i,'#2563eb',18)}${l}</button>`).join('')}</div></div></div></div>`}
function alertRow(a){return `<div class="al" data-open="${a.t}:${hx(a.id)}"><div class="ai" style="background:${a.sev==='bad'?'#fee2e2':'#fef3c7'}">${ic('warn',a.sev==='bad'?'#b91c1c':'#b45309',13)}</div><div><b style="font-weight:600">${hx(a.title)}</b><small>${a.type} · ${hx(a.sub)}</small></div></div>`}
function tasksHTML(){const al=alertsOps();return `<div class="pnl"><h3>Active alerts<span class="r">${al.length} · calculated from current records</span></h3>${al.length?al.map(alertRow).join(''):'<div class="empty"><b>No active alerts</b></div>'}</div>`+tableHTML('tasks',CFG('tasks').rows(),CFG('tasks'))}
/* ---------- analytics (from current records + generated demo history) ---------- */
function anaDays(){const db=DB(),R=OPS.ana;const N=now0();let days=db.hist;
  if(R.range==='today')days=[];else if(R.range==='7')days=db.hist.slice(-6);else if(R.range==='30')days=db.hist.slice(-29);
  else{const f=R.from?new Date(R.from).getTime():0,t=R.to?new Date(R.to).getTime()+86399999:N;days=db.hist.filter(d=>d.day>=f&&d.day<=t)}
  const sh=db.shipments.filter(s=>new Date(s.eta).toDateString()===new Date().toDateString());const yardV=db.vehicles.filter(v=>v.arr&&!v.dep);
  const docked=db.st.trucks.filter(t=>t.state==='docked');
  const today={day:N,today:true,inb:sh.filter(s=>s.dir==='Inbound'&&shStatus(s)!=='Cancelled').length,outb:sh.filter(s=>s.dir==='Outbound'&&shStatus(s)!=='Cancelled').length,
    arrivals:db.vehicles.filter(v=>v.arr).length,delayed:db.shipments.filter(s=>shStatus(s)==='Delayed').length,
    turn:yardV.length?yardV.reduce((a,v)=>a+(N-v.arr)/MIN,0)/yardV.length:null,load:docked.length?docked.reduce((a,t)=>a+(N-(byId(db.vehicles,t.id)?.arr||N))/MIN,0)/docked.length:null,
    occ:db.docks.filter(d=>dStatus(d)!=='Available').length/db.docks.length*100,util:db.equipment.filter(e=>eStatus(e)==='In Use').length/db.equipment.filter(e=>!['Maintenance','Out of Service'].includes(eStatus(e))).length*100,
    docks:db.docks.map(d=>dStatus(d)==='Available'?0:100)};
  const inc=R.range!=='custom'||(!R.to||new Date(R.to).toDateString()===new Date().toDateString());
  return inc?days.concat([today]):days}
function avg(a,k){const v=a.map(x=>x[k]).filter(x=>x!=null);return v.length?v.reduce((s,x)=>s+x,0)/v.length:null}
function lineSVG(days){const W=900,H=230,P=34;if(!days.length)return '<div class="empty"><b>No data in this range</b></div>';const mx=Math.max(4,...days.map(d=>Math.max(d.inb,d.outb)));
  const X=i=>P+(days.length===1?(W-2*P)/2:i*(W-2*P)/(days.length-1)),Y=v=>H-P-v/mx*(H-2*P);
  const path=k=>days.map((d,i)=>(i?'L':'M')+X(i).toFixed(1)+' '+Y(d[k]).toFixed(1)).join(' ');
  const lbl=days.map((d,i)=>i%Math.ceil(days.length/7)===0||i===days.length-1?`<text x="${X(i)}" y="${H-10}" text-anchor="middle" font-size="10" fill="#94a3b8">${d.today?'Today':new Date(d.day).toLocaleDateString('en-GB',{day:'2-digit',month:'short'})}</text>`:'').join('');
  return `<svg viewBox="0 0 ${W} ${H}" width="100%" role="img" aria-label="Daily inbound and outbound shipments">${[0,.5,1].map(f=>`<line x1="${P}" x2="${W-P}" y1="${Y(mx*f)}" y2="${Y(mx*f)}" stroke="#eef2f7"/><text x="${P-6}" y="${Y(mx*f)+3}" text-anchor="end" font-size="10" fill="#94a3b8">${Math.round(mx*f)}</text>`).join('')}
   <path d="${path('inb')}" fill="none" stroke="#2563eb" stroke-width="2.2"/><path d="${path('outb')}" fill="none" stroke="#16a34a" stroke-width="2.2" stroke-dasharray="5 3"/>${days.map((d,i)=>`<circle cx="${X(i)}" cy="${Y(d.inb)}" r="2.6" fill="#2563eb"><title>${d.today?'Today':new Date(d.day).toDateString()} · inbound ${d.inb}, outbound ${d.outb}</title></circle>`).join('')}${lbl}</svg>`}
function barSVG(vals,labels){const W=600,H=190,P=40,bw=(W-2*P)/vals.length*.6;
  return `<svg viewBox="0 0 ${W} ${H}" width="100%" role="img" aria-label="Average dock utilization">${[0,50,100].map(v=>`<line x1="${P}" x2="${W-P}" y1="${H-P-v/100*(H-2*P)}" y2="${H-P-v/100*(H-2*P)}" stroke="#eef2f7"/><text x="${P-5}" y="${H-P-v/100*(H-2*P)+3}" text-anchor="end" font-size="10" fill="#94a3b8">${v}%</text>`).join('')}
   ${vals.map((v,i)=>{const x=P+(i+.5)*(W-2*P)/vals.length-bw/2,h=v/100*(H-2*P);return `<rect x="${x}" y="${H-P-h}" width="${bw}" height="${h}" rx="4" fill="${v>=85?'#f59e0b':'#2563eb'}"><title>${labels[i]} · ${Math.round(v)}%</title></rect><text x="${x+bw/2}" y="${H-P-h-5}" text-anchor="middle" font-size="10" fill="#0f172a" font-weight="600">${Math.round(v)}%</text><text x="${x+bw/2}" y="${H-8}" text-anchor="middle" font-size="10" fill="#64748b">${labels[i]}</text>`}).join('')}</svg>`}
function donutSVG(counts){const tot=Object.values(counts).reduce((a,b)=>a+b,0);const C={Scheduled:'#94a3b8',Approaching:'#60a5fa',Arrived:'#3b82f6','Check-in':'#1d4ed8',Waiting:'#f59e0b',Loading:'#16a34a',Unloading:'#22c55e',Completed:'#cbd5e1',Delayed:'#dc2626',Cancelled:'#e2e8f0'};
  let off=0;const r=54,c=2*Math.PI*r;const segs=Object.entries(counts).filter(([,n])=>n).map(([k,n])=>{const len=n/tot*c;const s=`<circle r="${r}" cx="80" cy="80" fill="none" stroke="${C[k]}" stroke-width="22" stroke-dasharray="${len} ${c-len}" stroke-dashoffset="${-off}" transform="rotate(-90 80 80)"><title>${k}: ${n}</title></circle>`;off+=len;return s}).join('');
  return `<div style="display:flex;gap:14px;align-items:center"><svg viewBox="0 0 160 160" width="150" role="img" aria-label="Shipments by status">${segs}<text x="80" y="78" text-anchor="middle" font-size="22" font-weight="700">${tot}</text><text x="80" y="96" text-anchor="middle" font-size="10" fill="#64748b">shipments</text></svg>
   <div class="legend" style="flex-direction:column;gap:5px">${Object.entries(counts).filter(([,n])=>n).map(([k,n])=>`<span><i style="background:${C[k]}"></i>${k} · ${n}</span>`).join('')}</div></div>`}
function analyticsHTML(){const db=DB(),R=OPS.ana;const days=anaDays();
  const arr=days.reduce((a,d)=>a+d.arrivals,0),del=days.reduce((a,d)=>a+d.delayed,0);
  const K=[['Avg vehicle turnaround',fDur(avg(days,'turn'))],['Avg loading / unloading',fDur(avg(days,'load'))],['On-time arrival rate',arr?Math.round((arr-del)/arr*1000)/10+'%':'—'],['Yard occupancy rate',avg(days,'occ')!=null?Math.round(avg(days,'occ'))+'%':'—'],['Equipment utilization',avg(days,'util')!=null?Math.round(avg(days,'util'))+'%':'—'],['Delayed shipments',String(del)]];
  const dockAvg=db.docks.map((d,i)=>avg(days.map(x=>({v:x.docks[i]})),'v')||0);
  const counts={};['Scheduled','Approaching','Arrived','Check-in','Waiting','Loading','Unloading','Completed','Delayed','Cancelled'].forEach(k=>counts[k]=0);db.shipments.forEach(s=>counts[shStatus(s)]++);
  return `<div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:12px"><div class="seg2">${[['today','Today'],['7','Last 7 days'],['30','Last 30 days'],['custom','Custom range']].map(([k,l])=>`<button class="${R.range===k?'on':''}" data-ana="${k}">${l}</button>`).join('')}</div>
   ${R.range==='custom'?`<input type="date" class="fsel" data-anaf="from" value="${R.from}"> → <input type="date" class="fsel" data-anaf="to" value="${R.to}">`:''}<div class="spacer"></div><span class="muted" style="font-size:11px">${days.length} day${days.length===1?'':'s'} · today from current records, earlier days from generated demo history</span></div>
   <div class="kg">${K.map(([l,v])=>`<div class="kc" style="cursor:default"><div class="kl">${l}</div><div class="kv">${v}</div></div>`).join('')}</div>
   <div class="pnl"><h3>Daily inbound / outbound volume<span class="r legend"><span><i style="background:#2563eb"></i>Inbound</span><span><i style="background:#16a34a"></i>Outbound</span></span></h3>${lineSVG(days)}</div>
   <div class="g2"><div class="pnl"><h3>Dock utilization<span class="r">average over range</span></h3>${barSVG(dockAvg,db.docks.map(d=>d.id))}</div><div class="pnl"><h3>Shipment statuses<span class="r">current records</span></h3>${donutSVG(counts)}</div></div>`}
/* ---------- drawer ---------- */
const TT={shipment:'SHIPMENT',vehicle:'VEHICLE',pallet:'PALLET',equipment:'EQUIPMENT',dock:'GATE / DOCK',task:'TASK',zone:'ZONE'};
function recFor3D(id){const db=DB();if(!db||!id)return null;if(byId(db.vehicles,id))return {t:'vehicle',id};if(byId(db.equipment,id))return {t:'equipment',id};if(byId(db.pallets,id))return {t:'pallet',id};if(ents[id]&&ents[id].type==='tdock')return {t:'dock',id};if(ents[id]&&ents[id].type==='terminal')return {t:'terminal',id};if(id===db.site)return {t:'overview'};return null}
function getRec(t,id){const db=DB();return t==='shipment'?byId(db.shipments,id):t==='vehicle'?byId(db.vehicles,id):t==='pallet'?byId(db.pallets,id):t==='equipment'?byId(db.equipment,id):t==='dock'?(byId(db.docks,id)||(byId(db.gates,id)&&{...byId(db.gates,id),_g:1})||byId(campDoors(),id)):t==='task'?byId(db.tasks,id):t==='zone'?byId(db.zones,id):null}
function openDrawer(t,id,locate=true){if(t==='zone'){openModule('inventory',{zone:id});return}if(t==='terminal'){openModule('docks',{loc:id});return}if(t==='overview'){openModule('overview');return}
  if(!OPS.open)openModule({shipment:'shipments',vehicle:'vehicles',pallet:'inventory',equipment:'equipment',dock:'docks',task:'tasks'}[t]);
  OPS.drawer={t,id};const key={shipment:'shipments',vehicle:'vehicles',pallet:'inventory',equipment:'equipment',dock:'docks',task:'tasks'}[t];if(OPS.ts[key])OPS.ts[key].act=id;
  renderDrawer();if(locate)locateRec(t,id,true);renderWS();applyOffset();setTimeout(applyOffset,230)}
function closeDrawer(){OPS.drawer=null;$('drawer').classList.remove('open');document.body.classList.remove('dr');Object.values(OPS.ts).forEach(ts=>ts.act=null);applyOffset()}
const link=(t,id,txt)=>id?`<span class="dlink" data-open="${t}:${hx(id)}">${hx(txt||id)}</span>`:'<span class="mut">—</span>';
const sel=(name,opts,cur,ph)=>`<select class="fsel" data-dset="${name}"><option value="">${ph||'—'}</option>${opts.map(o=>{const [v,l]=Array.isArray(o)?o:[o,o];return `<option value="${hx(v)}" ${v===cur?'selected':''}>${hx(l)}</option>`}).join('')}</select>`;
const frow=(k,v)=>`<div class="frow"><span class="muted">${k}</span><span style="text-align:right">${v}</span></div>`;
function actLog(ids){return OPS.log.filter(l=>ids.some(i=>i&&l.msg.includes(i))).slice(0,6)}
function logHTML(ids){const L=actLog(ids);return L.length?L.map(l=>`<div class="tl"><div class="ti d">${hx(l.msg)}<small>${fT(l.t)}</small></div></div>`).join(''):'<div class="muted" style="font-size:12px">No activity recorded in this session yet.</div>'}
function renderDrawer(){const D=OPS.drawer;const el=$('drawer');if(!D||!DB()){el.classList.remove('open');return}const r=getRec(D.t,D.id);if(!r){closeDrawer();return}
  const db=DB();let title=r.id,status='',body='',foot='';
  if(D.t==='shipment'){const st=shStatus(r),v=r.vehicle&&byId(db.vehicles,r.vehicle),dk=shDock(r);status=st;
    const steps=r.dir==='Inbound'?['Scheduled','Approaching','Arrived','Check-in','Unloading','Completed']:['Scheduled','Arrived','Check-in','Loading','Completed'];const map={Waiting:'Check-in',Delayed:'Approaching',Cancelled:'Scheduled'};const ci=steps.indexOf(map[st]||st);
    const freeV=db.vehicles.filter(x=>!x.shipment||x.id===r.vehicle||vStatus(x)==='Scheduled').map(x=>[x.id,x.id+' · '+x.carrier]);
    body=`<div class="dsec">OVERVIEW</div>${frow('Direction',r.dir)}${frow('Priority',sel('prio',['Low','Normal','High','Urgent'],r.prio))}${frow('Status',sel('shstatus',['Scheduled','Approaching','Arrived','Check-in','Waiting','Loading','Unloading','Completed','Delayed','Cancelled'],st))}
     ${frow(r.dir==='Inbound'?'Origin → site':'Destination',hx(r.dest||'—'))}${frow('ETA',fT(r.eta))}${frow('ETD',fT(r.etd))}${frow('Actual arrival',fT(r.actual))}
     <div class="dsec">CARRIER & VEHICLE</div>${frow('Carrier',hx(r.carrier))}${frow('Vehicle',v?link('vehicle',v.id,v.id+' · '+v.reg):'<span class="mut">Unassigned</span>')}${frow('Assign vehicle',sel('shveh',freeV,r.vehicle,'Select vehicle'))}${v?frow('Driver',hx(v.driver)):''}
     <div class="dsec">CARGO</div>${frow('Cargo type',r.cargo?hx(r.cargo):'<span style="color:#b45309">Missing</span>')}${frow('Quantity',r.qty+' pallets')}${frow('Pallets in records',shPallets(r.id).length)}
     <div class="dsec">GATE & DOCK</div>${frow('Gate',link('dock',r.gate))}${frow('Dock',dk?link('dock',dk):'<span class="mut">Not assigned</span>')}${frow('Assign dock',sel('shdock',db.docks.map(d=>[d.id,d.id+' · '+dStatus(d)]),r.dock||dk,'Select dock'))}
     <div class="dsec">OPERATIONAL TIMELINE</div><div class="tl">${steps.map((s,i)=>`<div class="ti ${i<ci?'d':i===ci?'c':''}">${s}${i===ci?` <span class="pill ${STATUS_TONE[st]||'neutral'}" style="margin-left:4px">${st}</span>`:''}<small>${i===0?fT(r.created):i===ci?'current':''}</small></div>`).join('')}</div>
     <div class="dsec">RELATED PALLETS</div>${shPallets(r.id).slice(0,6).map(p=>`<div class="mini" data-open="pallet:${p.id}"><span><b>${p.id}</b> · ${hx(p.zone)}</span>${sb(pStatus(p))}</div>`).join('')||'<div class="muted" style="font-size:12px">No pallets linked.</div>'}
     <div class="dsec">RELATED TASKS</div>${shTasks(r.id).map(t=>`<div class="mini" data-open="task:${t.id}"><span><b>${t.id}</b> · ${hx(t.type)}</span>${sb(t.status)}</div>`).join('')||'<div class="muted" style="font-size:12px">No tasks.</div>'}
     <div class="dsec">ACTIVITY HISTORY</div>${logHTML([r.id,r.vehicle])}`;
    foot=`<button class="btn" data-a="editship">${ic('edit','#0f172a',14)}Edit</button><button class="btn" data-a="locate">${ic('target','#0f172a',14)}Locate in 3D</button>`}
  if(D.t==='vehicle'){const st=vStatus(r);status=st;const sh=r.shipment&&byId(db.shipments,r.shipment);
    body=`${r.in3d?'':'<div class="dnote">Data-only record: this vehicle is not on site, so it is not drawn in the 3D scene.</div>'}<div class="dsec">VEHICLE</div>${frow('Registration',r.reg)}${frow('Type',r.type)}${frow('Carrier',r.carrier)}${frow('Driver',r.driver)}
     <div class="dsec">LOCATION</div>${frow('Current location',hx(vLoc(r)))}${frow('Dock',vDock(r)?link('dock',vDock(r)):'—')}${frow('Arrival',fT(r.arr))}${frow('Departure',fT(r.dep))}${r.ref&&r.ref.state==='waiting'?frow('Waiting at gate',r.ref.waitMin+' min'):''}
     <div class="dsec">ASSIGNMENT</div>${frow('Shipment',sh?link('shipment',sh.id):'—')}${frow('Assign shipment',sel('vship',db.shipments.filter(s=>!s.vehicle||s.id===r.shipment).map(s=>[s.id,s.id+' · '+s.dir]),r.shipment,'Select shipment'))}
     ${frow('Assign dock',sel('vdock',db.docks.map(d=>[d.id,d.id+' · '+dStatus(d)]),vDock(r),'Select dock'))}
     <div class="dsec">ACTIVITY HISTORY</div>${logHTML([r.id])}`;
    foot=`<button class="btn" data-a="locate" ${r.in3d?'':'disabled'}>${ic('target','#0f172a',14)}Locate in 3D</button>`}
  if(D.t==='pallet'){const st=pStatus(r);status=st;
    body=`${r.in3d?'':'<div class="dnote">Data-only record: shown in tables, not drawn as a separate 3D object.</div>'}<div class="dsec">CARGO</div>${frow('Description',hx(r.desc))}${frow('Cargo type',hx(r.type))}${frow('Quantity',r.qty+' units')}${frow('Weight',r.weight+' kg')}${frow('Shipment',link('shipment',r.shipment))}
     <div class="dsec">LOCATION</div>${frow('Zone',link('zone',r.zone))}${frow('Position',r.pos)}${frow('Move to zone',sel('pzone',db.zones.map(z=>[z.id,`${z.id} · ${zoneUse(z.id)}/${z.cap}`]),r.zone,'Select zone'))}${frow('Arrival',fT(r.arr))}${frow('Storage duration',r.arr?fDur((now0()-r.arr)/MIN):'—')}
     ${frow('Status',sel('pstatus',['Expected','Received','In Storage','Reserved','In Transit','Dispatched','Damaged'],st))}<div class="dsec">ACTIVITY HISTORY</div>${logHTML([r.id])}`;
    foot=`<button class="btn" data-a="locate" ${r.in3d?'':'disabled'}>${ic('target','#0f172a',14)}Locate in 3D</button>`}
  if(D.t==='equipment'){const st=eStatus(r),b=eBatt(r);status=st;const util=r.in3d?(st==='In Use'?'In use now':'Idle now'):'—';
    body=`${r.in3d?'':'<div class="dnote">Data-only record: this equipment is not drawn in the 3D scene.</div>'}<div class="dsec">EQUIPMENT</div>${frow('Type',r.type)}${frow('Model',hx(r.model))}${frow('Location',hx(eLoc(r)))}
     ${b!=null?`<div class="row-status"><div class="bar ${b<20?'red':b<40?'amber':''}"><i style="width:${b}%"></i></div><span>${r.fuel?'Fuel':'Battery'} ${b}%</span></div>`:''}${frow('Working hours',r.hours.toLocaleString('en-US')+' h')}${frow('Utilization',util+(r.in3d&&r.ref.moves!=null?' · '+r.ref.moves+' moves today':''))}
     ${r.type!=='Charging station'?frow('Operator',sel('eop',OPERATORS,r.operator,'Unassigned')):''}${frow('Status override',sel('estatus',['Maintenance','Out of Service'],r.ov,'None (live)'))}
     <div class="dsec">MAINTENANCE</div>${frow('Next service',new Date(r.maint).toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'}))}${r.mlog.map(m=>`<div class="tl"><div class="ti d">${hx(m.msg)}<small>${new Date(m.t).toLocaleDateString('en-GB',{day:'2-digit',month:'short'})}</small></div></div>`).join('')||'<div class="muted" style="font-size:12px">No maintenance records.</div>'}
     <div class="dsec">ACTIVITY HISTORY</div>${logHTML([r.id])}`;
    foot=`<button class="btn" data-a="locate" ${r.in3d?'':'disabled'}>${ic('target','#0f172a',14)}Locate in 3D</button>${r.in3d&&r.type==='Forklift'&&r.ref.op!=='Charging'&&r.ref.op!=='To charger'?`<button class="btn" data-a="eqcharge">${ic('bolt','#0f172a',14)}Send to charger</button>`:''}`}
  if(D.t==='dock'&&r._c){const st=cdStatus(r),pr=cdProg(r);status=st;title=r.term+' · '+r.label;
    body=`<div class="dsec">DOOR</div>${frow('Terminal',r.term+' · '+r.termName)}${frow('Direction',r.vehicle?r.dir:'—')}${frow('Status override',sel('cstatus',['Blocked','Maintenance'],r.ov,'None (live)'))}
     <div class="dsec">VEHICLE</div>${frow('Vehicle',r.vehicle?hx(r.vehicle+' · '+r.vtype):'<span class="mut">None</span>')}${frow('Arrived',fT(r.arr))}${frow('At door',r.arr?fDur((now0()-r.arr)/MIN):'—')}${r.sched?frow('Next vehicle due',fT(r.sched)):''}
     <div class="dsec">CARGO</div>${frow('Cargo type',hx(r.cargo))}${r.temp?frow('Temperature',r.temp):''}${frow('Quantity',r.vehicle?Math.round(r.qty*pr/100)+' / '+r.qty+' '+r.unit:r.qty+' '+r.unit+' planned')}${frow('Weight',r.weight.toLocaleString('en-US')+' kg')}${frow('Shipment',r.ship||'—')}${frow(r.dir==='Outbound'?'Destination':'Origin',hx(r.dest))}
     ${r.vehicle?`<div class="row-status"><div class="bar ${st==='Completed'?'':'blue'}"><i style="width:${pr}%"></i></div><span>${pr}% ${r.dir==='Outbound'?'loaded':'unloaded'}</span></div>`:''}
     <div class="dsec">ACTIVITY HISTORY</div>${logHTML([r.id])}`;
    foot=`<button class="btn" data-a="locate">${ic('target','#0f172a',14)}Locate in 3D</button>${r.vehicle&&st==='Completed'?`<button class="btn pri" data-a="cdrelease">Release vehicle</button>`:''}`}
  else if(D.t==='dock'){if(r._g){status=gStatus(r);const v=gVeh(r);body=`<div class="dsec">GATE</div>${frow('Type',r.type)}${frow('Vehicle at gate',v!=='—'?link('vehicle',v):'—')}${frow('Waiting time',fDur(dDur(r)))}${frow('Status override',sel('gstatus',['Blocked','Maintenance'],r.ov,'None (live)'))}${r.in3d?'':'<div class="dnote">Data-only record: G2 is not drawn in the 3D scene.</div>'}<div class="dsec">ACTIVITY HISTORY</div>${logHTML([r.id])}`}
    else{const st=dStatus(r);status=st;const vid=dVehicle(r),shid=dShip(r);
    body=`<div class="dsec">OCCUPANCY</div>${frow('Vehicle',vid?link('vehicle',vid):'—')}${frow('Shipment',shid?link('shipment',shid):'—')}${frow('Operation',dOp(r))}${frow('Scheduled',fT(dSched(r)))}${frow('Actual arrival',fT(dActual(r)))}${frow('Current duration',fDur(dDur(r)))}
     <div class="dsec">ASSIGN & SCHEDULE</div>${dTruck(r)?'<div class="muted" style="font-size:12px">Occupied by a vehicle on site. Release it before re-assigning.</div>':frow('Assign vehicle',sel('dveh',db.vehicles.filter(v=>!vDock(v)||vDock(v)===r.id).map(v=>[v.id,v.id+' · '+vStatus(v)]),r.vOv||'','Select vehicle'))+frow('Assign shipment',sel('dsh',db.shipments.filter(s=>!['Completed','Cancelled'].includes(shStatus(s))).map(s=>[s.id,s.id+' · '+s.dir]),r.shOv||'','Select shipment'))}
     ${frow('Schedule slot',`<input type="datetime-local" class="fsel" data-dset="dsched" value="${r.sched?new Date(r.sched-new Date().getTimezoneOffset()*MIN).toISOString().slice(0,16):''}">`)}${frow('Status override',sel('dstatus',['Blocked','Maintenance'],r.ov,'None (live)'))}
     <div class="dsec">OPERATIONAL HISTORY</div>${r.log.concat(actLog([r.id])).sort((a,b)=>b.t-a.t).slice(0,6).map(l=>`<div class="tl"><div class="ti d">${hx(l.msg)}<small>${fT(l.t)}</small></div></div>`).join('')}`}
    foot=`<button class="btn" data-a="locate" ${r.in3d?'':'disabled'}>${ic('target','#0f172a',14)}Locate in 3D</button>`}
  if(D.t==='task'){status=r.status;title=r.id+' · '+r.type;
    body=`<div class="dsec">TASK</div>${frow('Description',hx(r.desc))}${frow('Priority',sel('tprio',['Low','Normal','High','Urgent'],r.prio))}${frow('Shipment',link('shipment',r.shipment))}${frow('Vehicle',link('vehicle',r.vehicle))}${frow('Operator',sel('top',OPERATORS,r.operator,'Unassigned'))}${frow('Created',fT(r.created))}${frow('Due',fT(r.due))}${r.auto?'<div class="dnote" style="background:#eff6ff;border-color:#bfdbfe;color:#1e40af">Completes automatically when the yard action is done in 3D or in the record.</div>':''}
     <div class="dsec">ACTIVITY HISTORY</div>${logHTML([r.id])}`;
    foot=['In Progress','Completed','Blocked','Cancelled'].map(s=>`<button class="btn ${s==='Completed'?'pri':''}" data-tkset="${s}" ${r.status===s?'disabled':''}>${s==='In Progress'?'Start':s==='Completed'?'Complete':s==='Blocked'?'Block':'Cancel'}</button>`).join('')}
  el.innerHTML=`<div class="dwh"><div style="display:flex;align-items:flex-start;gap:8px"><div style="flex:1;min-width:0"><div class="eyebrow">${TT[D.t]}${r.type&&D.t!=='task'&&D.t!=='pallet'?' · '+hx(r.type).toUpperCase():''}</div><div class="dtitle" style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${hx(title)}</div><div style="margin-top:6px;display:flex;gap:6px;align-items:center">${sb(status)}${r.in3d!=null?g3(r):''}</div></div><button class="act" data-a="closedrawer" aria-label="Close details">${ic('x','#0f172a',14)}</button></div></div><div class="dwb">${body}</div><div class="dwf">${foot}</div>`;
  el.classList.add('open');document.body.classList.add('dr')}
/* ---------- 3D sync ---------- */
function clearExtra(){OPS.extra.forEach(m=>m.parent&&m.parent.remove(m));OPS.extra=[]}
function dockMarker(id){const d=byId(DB().docks,id);if(!d)return;const m=makeMarker(6.2,15.5,'#f59e0b');m.position.set(dockX(d.idx),0,7.6);root.add(m);OPS.extra.push(m)}
function locateRec(t,id,quiet){const db=DB();if(!db)return;clearExtra();const r=getRec(t,id);if(!r)return;
  const sel3=(eid,focus=true)=>{OPS.syncing=true;select(eid,focus,true);OPS.syncing=false};
  if(t==='vehicle'||t==='equipment'||t==='pallet'){if(r.in3d&&ents[id]){sel3(id)}else if(!quiet)toast(id+' is a data-only record — not in the 3D scene','warn','#fcd34d');else sel3(null,false);return}
  if(t==='dock'){if(r._c){sel3(id);return}if(r._g){if(r.id==='G1'&&booth){sel3(null,false);const p=booth.position;tween={t:0,dur:.7,fromT:controls.target.clone(),toT:new THREE.Vector3(p.x,0,p.z),off:camera.position.clone().sub(controls.target),fromZ:camera.zoom,toZ:1.6};const m=makeMarker(10,8,'#f59e0b');m.position.set(p.x-2,0,p.z+1);root.add(m);OPS.extra.push(m)}else if(!quiet)toast(id+' is not drawn in the 3D scene','warn','#fcd34d');return}
    const tr=dTruck(r);sel3(tr?tr.id:null,!!tr);dockMarker(id);if(!tr){const x=dockX(r.idx);tween={t:0,dur:.7,fromT:controls.target.clone(),toT:new THREE.Vector3(x,0,6),off:camera.position.clone().sub(controls.target),fromZ:camera.zoom,toZ:1.5}}return}
  if(t==='shipment'){const v=r.vehicle&&byId(db.vehicles,r.vehicle);if(v&&v.in3d&&ents[v.id])sel3(v.id);else sel3(null,false);const dk=shDock(r);if(dk)dockMarker(dk);
    shPallets(r.id).forEach(p=>{if(p.in3d&&ents[p.id]){const m=attachMarker(p.id);if(m)OPS.extra.push(m)}});
    if(!(v&&v.in3d)&&!quiet)toast(r.id+' has no vehicle on site · showing dock and pallets where available','warn','#fcd34d');return}
  if(t==='task'){if(r.vehicle&&ents[r.vehicle])sel3(r.vehicle)}}
function on3DSelect(id){if(OPS.syncing||!DB()||!OPS.open)return;const rec=recFor3D(id);if(!rec)return;if(rec.t==='overview'){return}clearExtra();openDrawer(rec.t,rec.id,false)}
/* ---------- actions & events ---------- */
function logA(msg){OPS.log.unshift({t:now0(),msg})}
function refreshOps(){if(!DB()){if(OPS.open){OPS.open=null;document.body.classList.remove('ws');closeDrawer()}document.body.classList.remove('ops-on');return}
  document.body.classList.add('ops-on');opsTick();renderRail();if(OPS.open&&!OPS.loading){renderWS();if(OPS.drawer)renderDrawer()}}
function setShipStatus(s,v){s.ov=v||null;logA(`Status changed · ${s.id} → ${v}`)}
function dset(name,val){const D=OPS.drawer,db=DB();const r=getRec(D.t,D.id);if(!r)return;
  if(name==='prio'){r.prio=val;logA(`Priority set · ${r.id} → ${val}`)}
  if(name==='shstatus'){setShipStatus(r,val)}
  if(name==='shveh'){const old=r.vehicle&&byId(db.vehicles,r.vehicle);if(old&&old.shipment===r.id)old.shipment=null;r.vehicle=val||null;const nv=val&&byId(db.vehicles,val);if(nv){const prev=nv.shipment&&byId(db.shipments,nv.shipment);if(prev&&prev!==r)prev.vehicle=null;nv.shipment=r.id}logA(`Vehicle assigned · ${r.id} → ${val||'none'}`)}
  if(name==='shdock'){r.dock=val||null;logA(`Dock assigned · ${r.id} → ${val||'none'}`);const v=r.vehicle&&byId(db.vehicles,r.vehicle);if(v&&v.ref&&v.ref.state==='waiting'&&val){const d=byId(db.docks,val);if(d&&dStatus(d)==='Available'){assignDock(v.id,d.idx);return}}}
  if(name==='vship'){const old=r.shipment&&byId(db.shipments,r.shipment);if(old)old.vehicle=null;r.shipment=val||null;const s=val&&byId(db.shipments,val);if(s)s.vehicle=r.id;logA(`Shipment assigned · ${r.id} → ${val||'none'}`)}
  if(name==='vdock'){const d=val&&byId(db.docks,val);if(r.ref&&r.ref.state==='waiting'&&d){if(dStatus(d)!=='Available'){toast(val+' is not available','warn','#fcd34d');refreshOps();return}assignDock(r.id,d.idx);return}
    if(r.ref&&r.ref.dock!=null){toast(r.id+' is already at '+vDock(r)+' in the 3D yard','warn','#fcd34d');refreshOps();return}r.dockOv=val||null;if(d)d.vOv=r.id;logA(`Dock assigned · ${r.id} → ${val||'none'}`)}
  if(name==='pzone'){const z=byId(db.zones,val);if(z&&zoneUse(z.id)>=z.cap&&r.zone!==z.id)toast(`${z.id} is full — moved anyway (over capacity)`,'warn','#fcd34d');r.zone=val||r.zone;r.pos=(val||'').split(' ').map(w=>w[0]).join('').toUpperCase()+'-'+pad(zoneUse(val));logA(`Pallet moved · ${r.id} → ${val}`)}
  if(name==='pstatus'){r.ov=val||null;logA(`Status changed · ${r.id} → ${val}`)}
  if(name==='eop'){r.operator=val||null;logA(`Operator assigned · ${r.id} → ${val||'none'}`)}
  if(name==='estatus'){r.ov=val||null;logA(`Status changed · ${r.id} → ${val||'live'}`)}
  if(name==='gstatus'){const g=byId(db.gates,r.id);g.ov=val||null;logA(`Gate status · ${r.id} → ${val||'live'}`)}
  if(name==='dveh'){const d=byId(db.docks,r.id);const old=d.vOv&&byId(db.vehicles,d.vOv);if(old)old.dockOv=null;d.vOv=val||null;const v=val&&byId(db.vehicles,val);if(v){if(v.ref&&v.ref.state==='waiting'){d.vOv=null;assignDock(v.id,d.idx);return}v.dockOv=d.id}logA(`Vehicle assigned · ${d.id} → ${val||'none'}`)}
  if(name==='dsh'){const d=byId(db.docks,r.id);d.shOv=val||null;const s=val&&byId(db.shipments,val);if(s)s.dock=d.id;logA(`Shipment assigned · ${d.id} → ${val||'none'}`)}
  if(name==='dsched'){const d=byId(db.docks,r.id);d.sched=val?new Date(val).getTime():null;logA(`Dock scheduled · ${d.id} → ${val?fT(d.sched):'cleared'}`)}
  if(name==='cstatus'){const c=byId(campDoors(),r.id);c.ov=val||null;logA(`Dock status · ${c.term} ${c.label} → ${val||'live'}`)}
  if(name==='dstatus'){const d=byId(db.docks,r.id);d.ov=val||null;logA(`Dock status · ${d.id} → ${val||'live'}`)}
  if(name==='tprio'){r.prio=val;logA(`Priority set · ${r.id} → ${val}`)}
  if(name==='top'){r.operator=val||null;logA(`Task assigned · ${r.id} → ${val||'none'}`)}
  toast('Saved','check','#4ade80');renderAll()}
function exportCSV(key,selOnly){const cfg=key==='ov-sh'?CFG('shipments'):CFG(key);const ts=tsOf(key);let rows=applyTable(cfg.rows(),cfg,ts);if(selOnly)rows=cfg.rows().filter(r=>ts.sel.has(r.id));
  const cols=cfg.cols.filter(c=>!ts.hidden.has(c.k));const q=v=>{v=v==null?'':String(v);return /[",\n]/.test(v)?'"'+v.replace(/"/g,'""')+'"':v};
  const val=(c,r)=>{const v=c.v(r);return ['eta','arr','dep','created','due','sched','act','maint'].includes(c.k)&&typeof v==='number'?new Date(v).toISOString():v};
  const csv=[cols.map(c=>c.label).join(',')].concat(rows.map(r=>cols.map(c=>q(val(c,r))).join(','))).join('\n');
  try{const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv'}));a.download=`yard-twin-${key}-${new Date().toISOString().slice(0,10)}.csv`;document.body.appendChild(a);a.click();a.remove()}catch(e){}
  try{navigator.clipboard.writeText(csv).catch(()=>{})}catch(e){}toast(`CSV ready · ${rows.length} rows (downloaded; also copied to clipboard)`,'down','#93c5fd')}
function showPop(html,anchor){const p=$('pop');p.innerHTML=html;p.classList.add('open');const r=anchor.getBoundingClientRect();const w=p.offsetWidth,h=p.offsetHeight;p.style.left=Math.max(8,Math.min(innerWidth-w-8,r.right-w))+'px';p.style.top=(r.bottom+h+8>innerHeight?r.top-h-4:r.bottom+4)+'px'}
function hidePop(){$('pop').classList.remove('open')}
function shipForm(s){const db=DB(),n=!s;s=s||{dir:'Inbound',carrier:CARRIERS[0],vehicle:'',cargo:CARGO[0],qty:6,eta:now0()+120*MIN,gate:'G1',dock:'',prio:'Normal'};
  const dt=v=>v?new Date(v-new Date().getTimezoneOffset()*MIN).toISOString().slice(0,16):'';
  const o=(arr,cur)=>arr.map(x=>{const [v,l]=Array.isArray(x)?x:[x,x];return `<option value="${hx(v)}" ${v===cur?'selected':''}>${hx(l)}</option>`}).join('');
  $('modal').firstChild.innerHTML=`<div style="display:flex;align-items:center"><b style="font-size:16px">${n?'New shipment':'Edit '+hx(s.id)}</b><div class="spacer"></div><button class="act" data-a="closemodal" aria-label="Close">${ic('x','#0f172a',14)}</button></div>
   <form id="shf"><div class="fg"><label>Direction<select name="dir">${o(['Inbound','Outbound'],s.dir)}</select></label><label>Carrier<select name="carrier">${o(CARRIERS,s.carrier)}</select></label>
   <label>Vehicle<select name="vehicle"><option value="">Unassigned</option>${o(db.vehicles.filter(v=>!v.shipment||v.id===s.vehicle).map(v=>[v.id,v.id+' · '+v.carrier]),s.vehicle)}</select></label><label>Cargo type<select name="cargo"><option value="">— missing —</option>${o(CARGO,s.cargo)}</select></label>
   <label>Quantity (pallets)<input name="qty" type="number" min="1" max="60" required value="${s.qty}"></label><label>${'ETA / ETD'}<input name="eta" type="datetime-local" required value="${dt(s.eta)}"></label>
   <label>Gate<select name="gate">${o(['G1','G2'],s.gate)}</select></label><label>Dock<select name="dock"><option value="">Not assigned</option>${o(db.docks.map(d=>[d.id,d.id+' · '+dStatus(d)]),s.dock)}</select></label>
   <label>Priority<select name="prio">${o(['Low','Normal','High','Urgent'],s.prio)}</select></label>${n?'':`<label>Status<select name="status">${o(['Scheduled','Approaching','Arrived','Check-in','Waiting','Loading','Unloading','Completed','Delayed','Cancelled'],shStatus(s))}</select></label>`}</div>
   <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:16px"><button type="button" class="btn" data-a="closemodal">Cancel</button><button class="btn pri" type="submit">${n?'Create shipment':'Save changes'}</button></div></form>`;
  $('modal').classList.add('open');$('shf').onsubmit=e=>{e.preventDefault();const f=Object.fromEntries(new FormData(e.target));const eta=new Date(f.eta).getTime();if(isNaN(eta)){toast('Enter a valid date','warn','#fcd34d');return}
    let rec=s;if(n){rec={id:'#SHP-'+(db.seq.shp++),actual:null,created:now0(),ov:'Scheduled',unit:'pallets',dest:f.dir==='Inbound'?db.site:'—'};db.shipments.unshift(rec)}
    const oldV=rec.vehicle;Object.assign(rec,{dir:f.dir,carrier:f.carrier,cargo:f.cargo||null,qty:+f.qty,eta,etd:eta+90*MIN,gate:f.gate,dock:f.dock||null,prio:f.prio});
    if(f.vehicle!==(oldV||'')){if(oldV){const ov=byId(db.vehicles,oldV);if(ov)ov.shipment=null}rec.vehicle=f.vehicle||null;if(f.vehicle)byId(db.vehicles,f.vehicle).shipment=rec.id}
    if(!n&&f.status&&f.status!==shStatus(rec))rec.ov=f.status;
    logA(`${n?'Shipment created':'Shipment edited'} · ${rec.id}`);$('modal').classList.remove('open');toast(n?rec.id+' created':rec.id+' saved');openDrawer('shipment',rec.id,false);renderAll()}}
function taskForm(){const db=DB();$('modal').firstChild.innerHTML=`<div style="display:flex;align-items:center"><b style="font-size:16px">New task</b><div class="spacer"></div><button class="act" data-a="closemodal" aria-label="Close">${ic('x','#0f172a',14)}</button></div>
  <form id="tkf"><div class="fg"><label>Type<select name="type">${['Unload','Load','Move pallets','Inspect damage','Charge equipment','Yard check','Other'].map(x=>`<option>${x}</option>`).join('')}</select></label><label>Priority<select name="prio">${['Low','Normal','High','Urgent'].map(x=>`<option ${x==='Normal'?'selected':''}>${x}</option>`).join('')}</select></label>
  <label class="full">Description<input name="desc" required placeholder="What needs to be done"></label><label>Shipment<select name="shipment"><option value="">—</option>${db.shipments.map(s=>`<option>${s.id}</option>`).join('')}</select></label><label>Vehicle<select name="vehicle"><option value="">—</option>${db.vehicles.map(v=>`<option>${v.id}</option>`).join('')}</select></label>
  <label>Operator<select name="operator"><option value="">Unassigned</option>${OPERATORS.map(o=>`<option>${o}</option>`).join('')}</select></label><label>Due in (min)<input name="due" type="number" min="5" value="60"></label></div>
  <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:16px"><button type="button" class="btn" data-a="closemodal">Cancel</button><button class="btn pri" type="submit">Create task</button></div></form>`;
  $('modal').classList.add('open');$('tkf').onsubmit=e=>{e.preventDefault();const f=Object.fromEntries(new FormData(e.target));const id='T-'+(1100+db.tasks.length+50);
    db.tasks.unshift({id,type:f.type,desc:f.desc,shipment:f.shipment||null,vehicle:f.vehicle||null,operator:f.operator||null,prio:f.prio,created:now0(),due:now0()+(+f.due||60)*MIN,status:'Open',auto:null});logA(`Task created · ${id}`);$('modal').classList.remove('open');toast(id+' created');openDrawer('task',id,false);renderAll()}}
function menuAct(t,id,a){const db=DB(),r=getRec(t,id);if(!r)return;hidePop();
  if(a==='view')return openDrawer(t,id);if(a==='locate'){openDrawer(t,id);return}
  if(a==='edit')return shipForm(r);if(a.startsWith('st:')){setShipStatus(r,a.slice(3));toast(r.id+' → '+a.slice(3));renderAll();return}
  if(a==='assigndock'||a==='move'){openDrawer(t,id);return}
  if(a.startsWith('eq:')){r.ov=a.slice(3)||null;logA(`Status changed · ${r.id} → ${r.ov||'live'}`);toast(r.id+' · '+(r.ov||'returned to service'));renderAll();return}
  if(a.startsWith('blk:')){const tgt=r._g?byId(db.gates,r.id):r._c?r:byId(db.docks,r.id);if(!r._g&&!r._c&&dTruck(r)&&a!=='blk:'){toast(r.id+' is occupied — cannot block now','warn','#fcd34d');return}tgt.ov=a.slice(4)||null;logA(`Status changed · ${r.id} → ${tgt.ov||'live'}`);toast(r.id+' · '+(tgt.ov||'cleared'));renderAll();return}
  if(a.startsWith('tk:')){r.status=a.slice(3);logA(`Task ${r.status.toLowerCase()} · ${r.id}`);toast(r.id+' · '+r.status);renderAll();return}}
document.addEventListener('click',ev=>{const tg=ev.target;
  if(!tg.closest('#pop')&&!tg.closest('[data-tmenu]')&&!tg.closest('[data-tcols]'))hidePop();
  const b=tg.closest('[data-mod],[data-kpi],[data-open],[data-row],[data-tsort],[data-tpage],[data-tmenu],[data-tcols],[data-texp],[data-tclr],[data-tclrf],[data-ana],[data-tkset],[data-bulkdo],[data-popact],[data-a]');if(!b)return;
  if(tg.matches('input[type=checkbox],select,input')&&!b.matches('[data-a]'))return;
  const d=b.dataset;
  if(d.mod!=null&&!d.row){ev.stopPropagation();if(d.mod===''){openModule(null);return}openModule(d.mod);return}
  if(d.kpi){openModule(d.kpi,JSON.parse(d.kf||'{}'));return}
  if(d.open){const [t,...rest]=d.open.split(':');openDrawer(t,rest.join(':'));return}
  if(d.row){const [t,...rest]=d.row.split(':');openDrawer(t,rest.join(':'));return}
  if(d.tsort){const [k,c]=d.tsort.split(':');const ts=tsOf(k);if(ts.sort===c)ts.dir*=-1;else{ts.sort=c;ts.dir=1}renderWS();return}
  if(d.tpage){const [k,s]=d.tpage.split(':');tsOf(k).page+=+s;renderWS();return}
  if(d.tclr){tsOf(d.tclr).sel.clear();renderWS();return}
  if(d.tclrf){const ts=tsOf(d.tclrf);ts.f={};ts.q='';renderWS();return}
  if(d.texp){exportCSV(d.texp,!!d.selOnly);return}
  if(d.tcols){const cfg=CFG(d.tcols),ts=tsOf(d.tcols);showPop(cfg.cols.map(c=>`<label><input type="checkbox" data-tcol="${d.tcols}:${c.k}" ${ts.hidden.has(c.k)?'':'checked'} ${c.k==='id'?'disabled':''}> ${c.label}</label>`).join(''),b);return}
  if(d.tmenu){const [t,...rest]=d.tmenu.split(':');const id=rest.join(':');const key={shipment:'shipments',vehicle:'vehicles',pallet:'inventory',equipment:'equipment',dock:'docks',task:'tasks'}[t];const r=getRec(t,id);
    showPop(CFG(key).menu(r).map(([a,l,dng])=>`<button data-popact="${t}|${hx(id)}|${a}" class="${dng?'dng':''}">${l}</button>`).join(''),b);return}
  if(d.popact){const [t,id,a]=d.popact.split('|');menuAct(t,id,a);return}
  if(d.ana){OPS.ana.range=d.ana;renderWS();return}
  if(d.tkset){const r=getRec('task',OPS.drawer.id);r.status=d.tkset;logA(`Task ${d.tkset.toLowerCase()} · ${r.id}`);toast(r.id+' · '+d.tkset);renderAll();return}
  if(d.bulkdo){const [k]=d.bulkdo.split(':');const ts=tsOf(k);DB().tasks.filter(t=>ts.sel.has(t.id)).forEach(t=>{t.status='Completed';logA(`Task completed · ${t.id}`)});toast(ts.sel.size+' tasks completed');ts.sel.clear();renderAll();return}
  const a=d.a;if(!a)return;
  if(a==='fullyard'){closeDrawer();clearExtra();OPS.syncing=true;select(null,false,true);OPS.syncing=false;tween={t:0,dur:.7,fromT:controls.target.clone(),toT:homeT(),off:CAMDIR.clone().multiplyScalar(120),fromZ:camera.zoom,toZ:homeZ()*.82};renderWS();return}
  if(a==='closedrawer'){closeDrawer();clearExtra();renderWS();return}
  if(a==='locate'&&OPS.drawer){locateRec(OPS.drawer.t,OPS.drawer.id);return}
  if(a==='newship'){shipForm(null);return}if(a==='editship'){shipForm(getRec('shipment',OPS.drawer.id));return}if(a==='newtask'){taskForm();return}
  if(a==='closemodal'){$('modal').classList.remove('open');return}
  if(a==='cdrelease'){const c=byId(campDoors(),OPS.drawer.id);logA(`Vehicle departed · ${c.vehicle} from ${c.term} ${c.label}`);toast(`${c.vehicle} departed · ${c.term} ${c.label} is free`);c.vehicle=null;c.base='Available';c.ship=null;c.arr=null;renderAll();return}
  if(a==='eqcharge'){const e=getRec('equipment',OPS.drawer.id);if(freeCharger()<0){toast('No free charger','warn','#fcd34d');return}sendToCharger(e.id);return}
  if(a==='openrec'){const rec=recFor3D(selected);if(rec)openDrawer(rec.t,rec.id,false);else openModule('overview');return}},true);
document.addEventListener('input',ev=>{const t=ev.target;if(t.dataset.tq){const ts=tsOf(t.dataset.tq);ts.q=t.value;ts.page=0;renderWS()}});
document.addEventListener('change',ev=>{const t=ev.target,d=t.dataset;
  if(d.tf){const [k,f]=d.tf.split(':');const ts=tsOf(k);ts.f[f]=t.value;ts.page=0;renderWS()}
  if(d.tsize){const ts=tsOf(d.tsize);ts.size=+t.value;ts.page=0;renderWS()}
  if(d.tsel){const [k,...rest]=d.tsel.split(':');const id=rest.join(':');const ts=tsOf(k);t.checked?ts.sel.add(id):ts.sel.delete(id);renderWS()}
  if(d.tall){const k=d.tall,cfg=CFG(k),ts=tsOf(k);const all=applyTable(cfg.rows(),cfg,ts).slice(ts.page*ts.size,ts.page*ts.size+ts.size);all.forEach(r=>t.checked?ts.sel.add(r.id):ts.sel.delete(r.id));renderWS()}
  if(d.tcol){const [k,c]=d.tcol.split(':');const ts=tsOf(k);t.checked?ts.hidden.delete(c):ts.hidden.add(c);renderWS()}
  if(d.bulk){const [k,f]=d.bulk.split(':');const ts=tsOf(k),db=DB();const v=t.value;if(!v)return;
    if(f==='status')db.shipments.filter(s=>ts.sel.has(s.id)).forEach(s=>setShipStatus(s,v));
    if(f==='zone')db.pallets.filter(p=>ts.sel.has(p.id)).forEach(p=>{p.zone=v;logA(`Pallet moved · ${p.id} → ${v}`)});
    if(f==='op')db.tasks.filter(x=>ts.sel.has(x.id)).forEach(x=>{x.operator=v;logA(`Task assigned · ${x.id} → ${v}`)});
    toast(`${ts.sel.size} records updated`);ts.sel.clear();renderAll()}
  if(d.anaf){OPS.ana[d.anaf]=t.value;renderWS()}
  if(d.dset){dset(d.dset,t.value)}});
addEventListener('keydown',e=>{if(e.key==='Escape'){if($('modal').classList.contains('open'))$('modal').classList.remove('open');else if($('pop').classList.contains('open'))hidePop();else if(OPS.drawer){closeDrawer();renderWS()}}});

setInterval(()=>{refreshChips();if(!DB())return;const ch=opsTick();renderRail();const ae=document.activeElement;const busy=ae&&(ae.closest('#ws,#drawer,#modal')&&ae.matches('input,select'));if(OPS.open&&!OPS.loading&&!busy&&!$('pop').classList.contains('open')&&!$('modal').classList.contains('open')){if(!$('ws').matches(':hover'))renderWS();if(OPS.drawer&&!$('drawer').matches(':hover'))renderDrawer()}},4000);

/* ================= I18N (EN / УКР) ================= */
const UK={
'pcs':'шт.','Next leg':'Наступний етап','NEXT LEG':'НАСТУПНИЙ ЕТАП','Cut-off buffer':'Запас до cut-off','Track on journey':'Відстежити в подорожі','Downstream':'Далі по маршруту','locker L-03 almost full':'поштомат L-03 майже повний','Put-away':'Розміщення','Route →':'Маршрут →','On time':'Вчасно','days':'дн.','2 d 4 h':'2 д 4 год','1 d':'1 д','22 h':'22 год','−2 h':'−2 год','2 h 10 min':'2 год 10 хв','2 h 14 min':'2 год 14 хв','Parcel journey':'Подорож посилки','JOURNEY':'ПОДОРОЖ','Journey':'Подорож','stages':'етапів','scroll to travel':'прокручуй, щоб їхати','open →':'відкрити →','Whole road':'Вся дорога','Flights':'Рейси','ULDs':'ULD','Equipment':'Техніка','FLIGHT':'РЕЙС','Cut-off':'Cut-off','ULDs ready':'ULD готові','on board':'на борту','On-time departures':'Вчасні вильоти',
'departs':'виліт','Arrived':'Прибув','ULDs unloaded':'ULD вивантажено','still on board':'ще на борту','Trucks dispatched':'Вантажівок відправлено',
'Received at hub':'Прийнято в хабі','Built into ULD':'Зібрано в ULD','At stand':'На стоянці','Loaded on aircraft':'У літаку','Departed':'Вилетів',
'Unloaded':'Вивантажено','Broken down':'Розформовано','On truck':'У вантажівці','Delivered':'Доставлено','Staged':'Готовий до відправки',
'Freighter':'Вантажний літак','Stand':'Стоянка','HOLD MAP · MAIN DECK':'СХЕМА ТРЮМУ · ГОЛОВНА ПАЛУБА','On board':'На борту','Next':'Наступна','Empty':'Порожньо',
'Payload':'Корисне навантаження','Center of gravity':'Центр ваги','safe':'безпечно','Main deck positions':'Позиції головної палуби','Parcels on board':'Посилок на борту',
'Departure':'Виліт','Close flight & request pushback':'Закрити рейс і запросити буксирування','Close flight':'Закрити рейс','positions left':'позицій лишилось','Flight closed':'Рейс закрито',
'Release aircraft':'Звільнити літак','Aircraft released':'Літак звільнено','ULDs on board':'ULD на борту','Pushback requested':'Буксирування запитано','Cut-off in':'Cut-off через',
'Building':'Збирається','Ready':'Готовий','To aircraft':'До літака','Next flight':'Наступним рейсом','Breakdown':'Розформування','Released':'Звільнено','Closed':'Закрито',
'CONTAINER':'КОНТЕЙНЕР','parcels':'посилок','Weight':'Вага','Volume':'Об’єм','Position':'Позиція','Flight':'Рейс','Prioritize build':'Пріоритетне збирання',
'Offload to next flight':'Перенести на наступний рейс','Not built yet.':'Ще не зібрано.','prioritize to make the flight.':'признач пріоритет, щоб встигнути на рейс.',
'Build in progress':'Збирання триває','reserved':'зарезервовано','Staged · waiting for tug':'Готовий · чекає на тягач','Being broken down for trucks':'Розформовується для вантажівок',
'Damage check.':'Перевірка пошкоджень.','Corner dent reported — inspect before release.':'Повідомлено про вм’ятину — огляньте перед відправкою.','Mark inspected':'Позначити як оглянутий',
'Damage check':'Перевірка пошкоджень','Corner dent reported':'Повідомлено про вм’ятину','Cut-off risk':'Ризик cut-off','Not built':'Не зібрано',
'TUG · AIRSIDE':'ТЯГАЧ · ПЕРОН','Train of 3 dollies':'Потяг із 3 візків','Heading to stand':'Прямує до стоянки','Returning to terminal':'Повертається до терміналу',
'Bringing ULDs to Stand 3':'Везе ULD до стоянки 3','Empty dollies to Stand 3':'Порожні візки до стоянки 3','Empty dollies back':'Порожні візки назад','Bringing ULDs to breakdown':'Везе ULD на розформування',
'ULDs on train':'ULD на візках','Trips today':'Рейсів сьогодні','Apron':'Перон','HIGH LOADER':'ПІДЙОМНИК','main deck door':'двері головної палуби',
'Receiving':'Приймає','Lifting':'Підйом','Transferring':'Передача','Lowering':'Опускання','Waiting for next ULD':'Чекає на наступний ULD','Lift height':'Висота підйому',
'Max load':'Макс. вантаж','Cycles today':'Циклів сьогодні','Operator':'Оператор','High loader':'Підйомник','cycles':'циклів','dollies':'візки',
'AIR CARGO HUB':'АВІАВАНТАЖНИЙ ХАБ','truck docks':'доки для вантажівок','active':'активна','Outbound wave':'Хвиля відправлення','Inbound wave':'Хвиля прибуття',
'Flights today':'Рейсів сьогодні','ULDs in process':'ULD в обробці','Parcels today':'Посилок сьогодні','Next departure':'Наступний виліт','FLIGHTS':'РЕЙСИ',
'Departs':'Виліт','Scheduled':'За розкладом','In use':'Зайнята','Outbound':'Відправлення','Inbound':'Прибуття','WAREHOUSES':'СКЛАДИ','AIR HUBS':'АВІАХАБИ',
'Route':'Маршрут','Driving to':'Їдемо до','Flying':'Летимо','Switching to':'Перемикаємось на','via':'через','by truck':'вантажівкою','Destination':'Пункт призначення',
'built':'зібрано','staged for Stand 3':'готовий до стоянки 3','moved to':'перенесено на','inspected':'оглянуто','released to breakdown':'передано на розформування',
'closed':'закрито','pushback requested':'буксирування запитано','released':'звільнено','ready for next rotation':'готовий до наступного рейсу','All ULDs on board':'Усі ULD на борту',
'ready to close':'готовий до закриття','fully unloaded':'повністю вивантажено','ready to release':'можна звільнити','loaded':'завантажено','only':'лишився тільки','is left — not built yet':'— ще не зібраний',
'TAIL':'ХВІСТ','NOSE →':'НІС →','Building':'Збирається','FLIGHTS':'РЕЙСИ','ULDS':'ULD','Unloading':'Розвантаження',
'Search sites, trucks, forklifts, pallets, shipments...':'Пошук складів, вантажівок, навантажувачів, палет, відвантажень...',
'Click any forklift, truck, pallet or charger · drag to pan · right-drag to rotate · scroll to zoom':'Клікни на навантажувач, вантажівку, палету чи зарядку · тягни — зсув · права кнопка — поворот · коліщатко — масштаб',
'Got it':'Зрозуміло','Connection lost.':'Зв’язок втрачено.','Showing data from':'Дані станом на','values may be outdated.':'значення можуть бути застарілими.',
'Reconnect':'Підключитися','Loading 3D yard…':'Завантаження 3D-майданчика…','Operations Manager':'Операційна менеджерка',
'Zoom in':'Наблизити','Zoom out':'Віддалити','Rotate left':'Повернути ліворуч','Rotate right':'Повернути праворуч','Reset view':'Скинути вигляд',
'Locate in scene':'Показати на сцені','Close':'Закрити','Alerts':'Сповіщення','Toggle connection (demo of offline state)':'Перемкнути зв’язок (демо офлайн-стану)',
'Stock on hand':'Залишок на складі','Trucks on site':'Вантажівки на місці','On-time delivery':'Вчасні доставки','last 30 days':'за 30 днів','inbound':'прибуває',
'full':'заповнено','docked':'в доках','docks':'доків','on-time':'вчасно','SITES':'СКЛАДИ','ALERTS':'СПОВІЩЕННЯ','All clear — no alerts':'Усе гаразд — сповіщень немає',
'Will stop within ~25 min':'Зупиниться приблизно за 25 хв','battery':'заряд','waiting at gate':'чекає на в’їзді','No dock assigned':'Док не призначено',
'Low stock':'Низький залишок','units left':'од. залишилось','Battery':'Заряд','Waiting':'Чекає',
'Heading to charger':'Прямує до зарядки','Heading to':'Прямує до','Charging at':'Заряджається на','Charging':'Заряджається','Loading truck':'Завантажує вантажівку','Unloading truck':'Розвантажує вантажівку',
'Available':'Вільний','Moving pallets in staging':'Переміщує палети в зоні відвантаження','Moving pallets':'Переміщує палети','Waiting at gate':'Чекає на в’їзді','Docking':'Заїжджає в док',
'En route':'В дорозі','Free · ready':'Вільний · готовий','Free':'Вільна','Loading':'Завантаження','Unloading':'Розвантаження','To charger':'До зарядки','Moving':'Рух',
'Docked':'У доці','At gate':'На в’їзді','Operational':'Працює','Offline':'Офлайн','Low Stock':'Мало','In Stock':'В наявності','Reorder placed':'Дозамовлено','In use':'Зайнята',
'WAREHOUSE':'СКЛАД','at gate':'на в’їзді','staged':'у зоні відвантаження','capacity used':'місткості зайнято','Truck bays':'Доки','busy':'зайнято','Forklifts':'Навантажувачі',
'charging':'на зарядці','Outbound today':'Відвантажень сьогодні','trucks':'вантажівок','INVENTORY':'ЗАЛИШКИ','units on hand':'од. в наявності','units':'од.','FORKLIFT':'НАВАНТАЖУВАЧ',
'At charger':'На зарядці','Idle near docks':'Очікує біля доків','Battery critical.':'Критичний заряд.',
'will stop in ~25 min. Send it to a free charger now.':'зупиниться приблизно за 25 хв. Відправ його на вільну зарядку.',
'Carrying':'Вантаж','1 pallet':'1 палета','Empty':'Порожньо','Moves today':'Рейсів сьогодні','Speed':'Швидкість','km/h':'км/год','Charger':'Зарядка','Site':'Склад',
'Send to charger':'Відправити на зарядку','(none free)':'(немає вільних)','Release from charger':'Відключити від зарядки','TRUCK':'ВАНТАЖІВКА','Driver':'Водій',
'pallets at':'палет у','min · no dock assigned':'хв · док не призначено','Arrives in':'Прибуде через','Detention risk.':'Ризик штрафу за простій.',
'Waiting over 15 min. Assign a free dock to start unloading.':'Чекає понад 15 хв. Признач вільний док, щоб почати розвантаження.',
'ASSIGN DOCK':'ПРИЗНАЧИТИ ДОК','Shipment Tracking':'Відстеження відвантаження','Shipment':'Відвантаження','Destination':'Пункт призначення','Carrier':'Перевізник','Load':'Вантаж',
'PALLET':'ПАЛЕТА','STAGING':'ЗОНА','Staging':'Зона','Below reorder point.':'Нижче точки дозамовлення.','Expected to run out in ~2 shifts.':'Закінчиться приблизно за 2 зміни.',
'Location':'Місце','Layers':'Ярусів','Reorder point':'Точка дозамовлення','Last moved':'Останнє переміщення','Today':'Сьогодні','Replenishment ordered':'Дозамовлення створено',
'Create replenishment order':'Створити дозамовлення','Assign pick task':'Призначити відбір','CHARGER':'ЗАРЯДКА','Ready for next forklift':'Готова до наступного навантажувача',
'full in ~':'повний через ~','Sessions today':'Сесій сьогодні','Energy today':'Енергія сьогодні','Zone':'Зона','Charging bay A':'Зарядна зона A','Open':'Відкрити',
'Order Confirmed':'Замовлення підтверджено','Picked':'Зібрано','Loaded':'Завантажено','In Transit':'В дорозі','now':'зараз','To:':'До:','min left':'хв залишилось',
'Gate':'В’їзд','waiting':'чекає','ETA':'Прибуття','Docks':'Доки','Trucks':'Вантажівки','Idle':'Очікує','Reserved':'Зарезервовано','docking':'заїжджає',
'docked at':'став у','unloading started':'розвантаження почалось','assigned to':'призначено для','gate opening':'шлагбаум відкривається','connected to':'підключено до',
'heading to charger':'прямує до зарядки','takes over':'підхоплює','released':'відключено','available':'вільний','Replenishment order created':'Створено дозамовлення',
'Pick task created for':'Створено завдання на відбір:','Reconnecting…':'Підключення…','Live data restored':'Дані знову в реальному часі','Switched to':'Перемкнено на',
'fully unloaded at':'повністю розвантажено в','Live':'Наживо','Sites':'Склади','Shipments':'Відвантаження','Pallets':'Палети','Chargers':'Зарядки',
'TRUCKS':'ВАНТАЖІВКИ','SHIPMENTS':'ВІДВАНТАЖЕННЯ','FORKLIFTS':'НАВАНТАЖУВАЧІ','PALLETS':'ПАЛЕТИ','CHARGERS':'ЗАРЯДКИ',
'No results. Try “FL-11”, “#SHP” or “helmet”':'Нічого не знайдено. Спробуй «FL-11», «#SHP» або «каски»',
'Cardboard Box':'Картонні коробки','Plastic Container':'Пластикові контейнери','Safety Helmet':'Захисні каски','Packing Tape':'Пакувальна стрічка','Shrink Wrap':'Стретч-плівка',
'Label Rolls':'Рулони етикеток','Pallet Wrap':'Палетна плівка','Foam Inserts':'Пінні вставки','pallets':'палет','pallet':'палета','min':'хв','at':'у','to':'до',
};
const esc=x=>x.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
Object.assign(UK,{'3D Yard':'3D двір','Overview':'Огляд','Shipments':'Відправлення','Vehicles':'Транспорт','Inventory':'Склад','Equipment':'Техніка','Gates & Docks':'Ворота і доки','Tasks & Alerts':'Задачі й алерти','Analytics':'Аналітика','Demo data · not live':'Демо-дані · не наживо','Full yard':'Весь двір','Columns':'Колонки','Export CSV':'Експорт CSV','Export selected':'Експорт вибраних','New shipment':'Нове відправлення','New task':'Нова задача','Clear':'Скинути','Search ID, vehicle or carrier':'Пошук ID, авто чи перевізника','Status: all':'Статус: усі','Direction: all':'Напрям: усі','Priority: all':'Пріоритет: усі','Date: all':'Дата: усі','Type: all':'Тип: усі','Zone: all':'Зона: усі','Carrier: all':'Перевізник: усі','Status: all active':'Статус: усі активні','Status: on site':'Статус: на майданчику','Status: on yard':'Статус: на дворі','Status: not done':'Статус: не виконані','Shipment ID':'ID відправлення','Direction':'Напрям','Carrier':'Перевізник','Vehicle':'Транспорт','Cargo type':'Тип вантажу','Qty':'К-сть','ETA / ETD':'ETA / ETD','Gate':'Ворота','Dock':'Док','Priority':'Пріоритет','Status':'Статус','Vehicle ID':'ID авто','Registration':'Номер','Driver':'Водій','Location':'Розташування','Shipment':'Відправлення','Arrival':'Прибуття','Departure':'Відʼїзд','Pallet ID':'ID палети','Cargo description':'Опис вантажу','Weight':'Вага','Zone':'Зона','Position':'Позиція','Storage':'Зберігання','Equipment ID':'ID техніки','Model':'Модель','Operator':'Оператор','Battery / fuel':'Батарея / паливо','Hours':'Мотогодини','Next service':'Наступне ТО','Gate / Dock':'Ворота / док','Scheduled':'Заплановано','Actual arrival':'Фактичне прибуття','Operation':'Операція','Duration':'Тривалість','Task ID':'ID задачі','Description':'Опис','Created':'Створено','Due':'Термін','Inbound':'Вхідне','Outbound':'Вихідне','Approaching':'Наближається','Check-in':'Реєстрація','Waiting':'Очікує','Completed':'Завершено','Delayed':'Затримка','Cancelled':'Скасовано','On Yard':'На дворі','At Gate':'Біля воріт','At Dock':'У доку','Expected':'Очікується','Received':'Прийнято','In Storage':'На зберіганні','Reserved':'Зарезервовано','In Transit':'У дорозі','Dispatched':'Відвантажено','Damaged':'Пошкоджено','In Use':'Працює','Maintenance':'Обслуговування','Out of Service':'Не працює','Occupied':'Зайнятий','Blocked':'Заблоковано','Open':'Відкрита','In Progress':'В роботі','Low':'Низький','Normal':'Звичайний','High':'Високий','Urgent':'Терміново','Unassigned':'Не призначено','Missing':'Відсутнє','Total vehicles':'Усього авто','Active shipments':'Активні відправлення','Pallets on yard':'Палет на дворі','Available docks':'Вільні доки','Active equipment':'Активна техніка','Delayed shipments':'Затримані відправлення','Recent shipments':'Останні відправлення','Recent activity':'Остання активність','Active alerts':'Активні алерти','Yard occupancy':'Заповненість двору','Quick access':'Швидкий доступ','View all →':'Усі →','this session':'ця сесія','No active alerts':'Немає активних алертів','Today':'Сьогодні','Last 7 days':'Останні 7 днів','Last 30 days':'Останні 30 днів','Custom range':'Свій період','Avg vehicle turnaround':'Сер. час обороту авто','Avg loading / unloading':'Сер. завантаження / розвантаження','On-time arrival rate':'Прибуття вчасно','Yard occupancy rate':'Заповненість двору','Equipment utilization':'Завантаженість техніки','Daily inbound / outbound volume':'Щоденний обсяг вхід / вихід','Dock utilization':'Завантаженість доків','Shipment statuses':'Статуси відправлень','average over range':'середнє за період','current records':'поточні записи','shipments':'відправлень','OVERVIEW':'ОГЛЯД','CARRIER & VEHICLE':'ПЕРЕВІЗНИК І АВТО','CARGO':'ВАНТАЖ','GATE & DOCK':'ВОРОТА І ДОК','OPERATIONAL TIMELINE':'ОПЕРАЦІЙНА ХРОНОЛОГІЯ','RELATED PALLETS':'ПОВʼЯЗАНІ ПАЛЕТИ','RELATED TASKS':'ПОВʼЯЗАНІ ЗАДАЧІ','ACTIVITY HISTORY':'ІСТОРІЯ ДІЙ','VEHICLE':'ТРАНСПОРТ','LOCATION':'РОЗТАШУВАННЯ','ASSIGNMENT':'ПРИЗНАЧЕННЯ','EQUIPMENT':'ТЕХНІКА','MAINTENANCE':'ОБСЛУГОВУВАННЯ','OCCUPANCY':'ЗАЙНЯТІСТЬ','ASSIGN & SCHEDULE':'ПРИЗНАЧЕННЯ І РОЗКЛАД','OPERATIONAL HISTORY':'ІСТОРІЯ ОПЕРАЦІЙ','TASK':'ЗАДАЧА','GATE':'ВОРОТА','Assign vehicle':'Призначити авто','Assign dock':'Призначити док','Assign shipment':'Призначити відправлення','Move to zone':'Перемістити в зону','Status override':'Ручний статус','None (live)':'Немає (з двору)','Edit':'Редагувати','Locate in 3D':'Показати в 3D','Open record in Operations':'Відкрити запис в Операціях','View details':'Деталі','Edit shipment':'Редагувати відправлення','Mark completed':'Позначити завершеним','Cancel shipment':'Скасувати відправлення','Send to maintenance':'На обслуговування','Return to service':'Повернути в роботу','Block':'Заблокувати','Set maintenance':'Обслуговування','Clear block / maintenance':'Зняти блок / ТО','Start':'Почати','Complete':'Завершити','Mark blocked':'Позначити заблокованою','Cancel':'Скасувати','Create shipment':'Створити відправлення','Save changes':'Зберегти','Create task':'Створити задачу','No records match these filters':'Немає записів за цими фільтрами','clear filters':'скинути фільтри','No records yet':'Записів ще немає','Data-only record: this vehicle is not on site, so it is not drawn in the 3D scene.':'Запис лише в даних: авто не на майданчику, тому його немає в 3D-сцені.','Prev':'Назад','Next':'Далі','Page':'Сторінка','selected':'вибрано','Gates':'Ворота','& Docks':'і доки','Tasks':'Задачі','& Alerts':'й алерти','SHIPMENT':'ВІДПРАВЛЕННЯ','PALLET':'ПАЛЕТА','GATE / DOCK':'ВОРОТА / ДОК','Quantity':'Кількість','Pallets in records':'Палет у записах','positions':'позицій','ready now':'вільні зараз','in use now':'працюють зараз','needs attention':'потребує уваги','all on schedule':'усе за графіком','total today':'усього сьогодні','in 3D':'у 3D','excl. departed':'без тих, що поїхали','Dock area':'Зона доків','Bulk storage':'Масове зберігання','Quarantine':'Карантин','Staging A':'Зона A','Staging B':'Зона B','Delayed Arrival':'Затримка прибуття','Dock Conflict':'Конфлікт доку','Equipment Failure':'Збій техніки','Low Battery':'Низький заряд','Storage Capacity Warning':'Переповнення зони','Missing Shipment Information':'Неповні дані відправлення','Destination':'Пункт призначення','Origin → site':'Звідки → склад','Shipment created':'Створено відправлення','Dock assigned':'Призначено док','Check-in completed':'Реєстрацію завершено','Pallet moved to':'Палету переміщено в','Terminal dock':'Док терміналу','Cargo terminal':'Вантажний термінал','Parcel hub':'Посилковий хаб','DEPOT PARK':'СКЛАДСЬКЕ МІСТЕЧКО','Depot park doors':'Двері складського містечка','CARGO AT DOORS':'ВАНТАЖ БІЛЯ ДВЕРЕЙ','DOORS':'ДВЕРІ','DOOR':'ДВЕРІ','Handles':'Обробляє','Inbound now':'Вхідних зараз','Outbound now':'Вихідних зараз','doors in use':'дверей зайнято','doors busy':'дверей зайнято','no vehicle':'без авто','No vehicle at the door':'Біля дверей немає авто','Ready for the next vehicle':'Готово до наступного авто','Next:':'Далі:','loaded':'завантажено','unloaded':'розвантажено','Temperature':'Температура','At door since':'Біля дверей з','Est. finish':'Орієнтовне завершення','Done · ready to depart':'Готово · можна відʼїжджати','Release vehicle':'Відпустити авто','Next vehicle due':'Наступне авто о','Terminal':'Термінал','Arrived':'Прибуло','At door':'Біля дверей','Location: all':'Розташування: усі','Cargo: all':'Вантаж: усі','Main building':'Головна будівля','Cargo':'Вантаж','E-commerce parcels':'Посилки e-commerce','Pallets · electronics':'Палети · електроніка','Pharma · cold chain':'Фарма · холодовий ланцюг','Food · ambient':'Продукти · кімнатна t°','Furniture · oversize':'Меблі · негабарит','Documents':'Документи','Returns':'Повернення','Auto parts':'Автозапчастини','Textiles':'Текстиль','Van 3.5 t':'Бус 3,5 т','Tractor + trailer':'Тягач з причепом','planned':'заплановано','vehicles':'авто','Vehicle departed':'Авто поїхало','is free':'вільний'});
const RULES=Object.keys(UK).sort((a,b)=>b.length-a.length).map(k=>[new RegExp('(?<![A-Za-z])'+esc(k)+'(?![A-Za-z])','g'),UK[k]]);
let LANG='en';try{LANG=localStorage.getItem('yt-lang')||'en'}catch(e){}
function tr(str){if(LANG==='en'||!str||!/[A-Za-z]/.test(str))return str;let r=str;for(const [re,v] of RULES)r=r.replace(re,v);return r}
const ORIG=new WeakMap(),LAST=new WeakMap();
function trText(n){const v=n.nodeValue;if(!ORIG.has(n)||v!==LAST.get(n))ORIG.set(n,v);const nv=tr(ORIG.get(n));LAST.set(n,nv);if(nv!==v)n.nodeValue=nv}
function trAttrs(el){for(const a of ['placeholder','title','aria-label']){if(!el.hasAttribute(a))continue;const k='o'+a.replace('-','');if(!el.dataset[k])el.dataset[k]=el.getAttribute(a);el.setAttribute(a,tr(el.dataset[k]))}}
function trTree(root){if(root.nodeType===3){if(!root.parentElement?.closest('[data-notr],script,style'))trText(root);return}
  if(root.nodeType!==1||root.closest('[data-notr]')||root.tagName==='SCRIPT'||root.tagName==='STYLE')return;
  trAttrs(root);root.querySelectorAll('[placeholder],[title],[aria-label]').forEach(el=>{if(!el.closest('[data-notr]'))trAttrs(el)});
  const w=document.createTreeWalker(root,NodeFilter.SHOW_TEXT,{acceptNode:n=>n.parentElement.closest('[data-notr],script,style')?NodeFilter.FILTER_REJECT:NodeFilter.FILTER_ACCEPT});
  let n;while(n=w.nextNode())trText(n)}
new MutationObserver(ms=>{for(const m of ms){if(m.type==='characterData'){if(m.target.nodeValue!==LAST.get(m.target))trTree(m.target)}else m.addedNodes.forEach(trTree)}}).observe(document.body,{childList:true,subtree:true,characterData:true});
function setLang(l){LANG=l;try{localStorage.setItem('yt-lang',l)}catch(e){}document.documentElement.lang=l==='uk'?'uk':'en';
  $('langCode').textContent=l==='uk'?'УКР':'EN';$('chk-en').innerHTML=l==='en'?ic('check','#2563eb'):'';$('chk-uk').innerHTML=l==='uk'?ic('check','#2563eb'):'';
  trTree(document.body);if(state&&state.kind==='journey')renderAll();document.title=l==='uk'?'Yard Twin — 3D-прототип складських операцій':'Yard Twin — 3D warehouse ops prototype'}
$('langBtn').onclick=e=>{e.stopPropagation();$('siteMenu').classList.remove('open');$('alertMenu').classList.remove('open');$('langMenu').classList.toggle('open')};
$('langMenu').addEventListener('click',e=>{const b=e.target.closest('[data-lang]');if(!b)return;setLang(b.dataset.lang);$('langMenu').classList.remove('open');toast(b.dataset.lang==='uk'?'Мову змінено на українську':'Language set to English','check','#4ade80')});
setLang(LANG);
loadSite('WH-04');
$('loading').classList.add('done');
loop();
