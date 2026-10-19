import * as THREE from 'three';
const $=s=>document.querySelector(s);
const R=(a,b)=>a+Math.random()*(b-a), RI=(a,b)=>Math.floor(R(a,b+1)), pick=a=>a[Math.floor(Math.random()*a.length)];
// ---------- renderer / scene ----------
const renderer=new THREE.WebGLRenderer({antialias:true});
renderer.setSize(innerWidth,innerHeight);renderer.setPixelRatio(Math.min(devicePixelRatio,2));
renderer.shadowMap.enabled=true;document.body.prepend(renderer.domElement);
const scene=new THREE.Scene();scene.background=new THREE.Color(0x050403);scene.fog=new THREE.Fog(0x050403,18,42);
const camera=new THREE.PerspectiveCamera(45,innerWidth/innerHeight,0.1,200);
const CAMOFF=new THREE.Vector3(14,20,14);
scene.add(new THREE.HemisphereLight(0x443355,0x110805,0.6));
const moon=new THREE.DirectionalLight(0x6677aa,0.5);moon.position.set(10,30,5);scene.add(moon);
const torch=new THREE.PointLight(0xffaa66,40,22,1.6);torch.castShadow=true;scene.add(torch);
addEventListener('resize',()=>{renderer.setSize(innerWidth,innerHeight);camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();});
// ---------- dungeon ----------
const T=2,N=56;let grid,levelGroup,stairs,depth=1;
function walk(x,z){const i=Math.floor(x/T),j=Math.floor(z/T);return i>=0&&j>=0&&i<N&&j<N&&grid[i][j]>0;}
function free(x,z,r=0.35){return walk(x-r,z-r)&&walk(x+r,z-r)&&walk(x-r,z+r)&&walk(x+r,z+r);}
function buildDungeon(){
  if(levelGroup)scene.remove(levelGroup);levelGroup=new THREE.Group();scene.add(levelGroup);
  grid=Array.from({length:N},()=>new Array(N).fill(0));const rooms=[];
  for(let t=0;t<200&&rooms.length<11;t++){const w=RI(5,10),h=RI(5,10),x=RI(1,N-w-2),y=RI(1,N-h-2);
    if(rooms.some(r=>x<r.x+r.w+2&&x+w+2>r.x&&y<r.y+r.h+2&&y+h+2>r.y))continue;rooms.push({x,y,w,h,cx:x+(w>>1),cy:y+(h>>1)});}
  rooms.forEach(r=>{for(let i=r.x;i<r.x+r.w;i++)for(let j=r.y;j<r.y+r.h;j++)grid[i][j]=1;});
  for(let k=1;k<rooms.length;k++){let a=rooms[k-1],b=rooms[k],x=a.cx,y=a.cy;
    while(x!==b.cx){grid[x][y]=grid[x][y]||2;grid[x][y+1]=grid[x][y+1]||2;x+=Math.sign(b.cx-x);}
    while(y!==b.cy){grid[x][y]=grid[x][y]||2;grid[x+1][y]=grid[x+1][y]||2;y+=Math.sign(b.cy-y);}}
  const floors=[],walls=[];
  for(let i=0;i<N;i++)for(let j=0;j<N;j++){if(grid[i][j])floors.push([i,j]);else{let adj=false;
    for(let a=-1;a<=1;a++)for(let b=-1;b<=1;b++){const u=i+a,v=j+b;if(u>=0&&v>=0&&u<N&&v<N&&grid[u][v])adj=true;}if(adj)walls.push([i,j]);}}
  const m=new THREE.Matrix4(),c=new THREE.Color();
  const fl=new THREE.InstancedMesh(new THREE.BoxGeometry(T*0.98,0.2,T*0.98),new THREE.MeshStandardMaterial({color:0xffffff,roughness:0.95}),floors.length);
  floors.forEach(([i,j],k)=>{m.makeTranslation(i*T+1,-0.1,j*T+1);fl.setMatrixAt(k,m);const g=R(0.12,0.2);fl.setColorAt(k,c.setRGB(g*1.1,g,g*0.85));});
  fl.receiveShadow=true;levelGroup.add(fl);
  const wl=new THREE.InstancedMesh(new THREE.BoxGeometry(T,3.2,T),new THREE.MeshStandardMaterial({color:0xffffff,roughness:1}),walls.length);
  walls.forEach(([i,j],k)=>{m.makeTranslation(i*T+1,1.6,j*T+1);wl.setMatrixAt(k,m);const g=R(0.16,0.26);wl.setColorAt(k,c.setRGB(g,g*0.9,g*0.8));});
  wl.castShadow=wl.receiveShadow=true;levelGroup.add(wl);
  // braziers
  rooms.forEach((r,k)=>{if(k%2)return;const b=new THREE.Group();
    const p=new THREE.Mesh(new THREE.CylinderGeometry(0.3,0.4,1,8),new THREE.MeshStandardMaterial({color:0x333333}));p.position.y=0.5;b.add(p);
    const f=new THREE.Mesh(new THREE.ConeGeometry(0.3,0.6,6),new THREE.MeshBasicMaterial({color:0xff6a10}));f.position.y=1.3;b.add(f);
    const l=new THREE.PointLight(0xff5510,25,14,1.8);l.position.y=1.8;b.add(l);b.position.set((r.x+0.5)*T+0.5,0,(r.y+0.5)*T+0.5);levelGroup.add(b);fires.push(f);});
  // stairs in last room
  const L=rooms[rooms.length-1];stairs=new THREE.Mesh(new THREE.CylinderGeometry(1,1,0.1,24),new THREE.MeshBasicMaterial({color:0x5522aa}));
  stairs.position.set(L.cx*T+1,0.06,L.cy*T+1);levelGroup.add(stairs);const sl=new THREE.PointLight(0x8844ff,20,10);sl.position.set(stairs.position.x,2,stairs.position.z);levelGroup.add(sl);
  return rooms;
}
const fires=[];
// ---------- data ----------
const RAR=['Normal','Magic','Rare','Set','Unique'];
const BASES=[
 {n:'Kunai',s:'weapon',ic:'🗡️',w:1,h:2,dmg:[2,5]},{n:'Tanto',s:'weapon',ic:'🔪',w:1,h:2,dmg:[3,7]},{n:'Katana',s:'weapon',ic:'⚔️',w:1,h:3,dmg:[5,11]},{n:'Tessen Fan',s:'weapon',ic:'🪭',w:2,h:2,dmg:[4,9]},
 {n:'Hood',s:'head',ic:'🪖',w:2,h:2,ar:4},{n:'Mask',s:'head',ic:'👺',w:2,h:2,ar:3},{n:'Shinobi Garb',s:'chest',ic:'🥋',w:2,h:3,ar:10},{n:'Chain Vest',s:'chest',ic:'🦺',w:2,h:3,ar:16},
 {n:'Wraps',s:'gloves',ic:'🧤',w:2,h:2,ar:2},{n:'Tabi Boots',s:'boots',ic:'🥾',w:2,h:2,ar:3},{n:'Sash',s:'belt',ic:'🎗️',w:2,h:1,ar:2},
 {n:'Ring',s:'ring',ic:'💍',w:1,h:1},{n:'Amulet',s:'amulet',ic:'📿',w:1,h:1}];
const AFF={str:['Strength','+{v} to Strength',1,4],dex:['Dexterity','+{v} to Dexterity',1,4],vit:['Vitality','+{v} to Vitality',1,4],ene:['Energy','+{v} to Energy',1,4],
 life:['Life','+{v} to Life',3,8],mana:['Mana','+{v} to Mana',2,6],ed:['Enhanced Damage','+{v}% Enhanced Damage',4,10],mind:['Min Damage','+{v} to Minimum Damage',1,2],maxd:['Max Damage','+{v} to Maximum Damage',1,3],
 ias:['Attack Speed','+{v}% Increased Attack Speed',3,6],ll:['Life Steal','{v}% Life Stolen per Hit',1,1],armor:['Armor','+{v} Defense',3,8],ms:['Run Speed','+{v}% Faster Run/Walk',3,5],
 mf:['Magic Find','{v}% Better Chance of Getting Magic Items',4,8],gf:['Gold Find','{v}% Extra Gold from Monsters',6,12],regen:['Regen','Replenish Life +{v}',1,2],crit:['Crit','+{v}% Critical Strike Chance',1,3]};
const PRE={str:'Brutal',dex:'Swift',vit:'Hale',ene:'Mystic',life:'Vital',mana:'Lucid',ed:'Cruel',mind:'Sharp',maxd:'Jagged',armor:'Sturdy',ms:'Fleet',crit:'Deadly'};
const SUF={ias:'of Haste',ll:'of the Leech',mf:'of Fortune',gf:'of Greed',regen:'of Renewal',str:'of Might',dex:'of Skill',vit:'of Life',ene:'of the Mind',armor:'of Warding',life:'of the Whale'};
const RNAME1=['Grim','Dusk','Blood','Night','Ash','Raven','Doom','Storm','Bone','Wraith'],RNAME2=['Bite','Veil','Shroud','Grasp','Song','Fang','Coil','Mark','Edge','Ward'];
const SET={name:'Umbral Regalia',pieces:{head:'Umbral Hood',chest:'Umbral Garb',gloves:'Umbral Wraps',boots:'Umbral Tabi',ring:'Umbral Seal'},
 bonus:{2:{dex:10,ms:10},3:{ed:30,life:30},5:{ias:25,crit:10,ll:4}},own:{dex:6,life:15,armor:10}};
const UNIQ=[{n:'Whisper of the Void',b:'Katana',a:{ed:120,ias:20,ll:5,dex:10}},{n:'Crimson Fang',b:'Kunai',a:{ed:90,crit:10,maxd:6}},
 {n:'Hollow Crown',b:'Mask',a:{life:40,mf:40,ene:15}},{n:'Ashen Step',b:'Tabi Boots',a:{ms:30,dex:12,regen:4}},{n:'Eye of Nightfall',b:'Amulet',a:{str:10,dex:10,vit:10,ene:10,crit:5}},{n:'Ironsilk Shroud',b:'Chain Vest',a:{armor:80,vit:25,life:30}}];
let uid=1;
function scaleAff(k,il){const a=AFF[k];return Math.max(1,Math.round(R(a[2],a[3])*(1+il*0.18)));}
function makeItem(il,mf=0,forced){
  let r=forced??0;if(forced==null){const x=Math.random()*100/(1+mf/100);r=x<1.2?4:x<3?3:x<12?2:x<40?1:0;}
  let base=pick(BASES),it={id:uid++,r,il,a:{},base};
  if(r===4){const u=pick(UNIQ);base=BASES.find(b=>b.n===u.b);it.base=base;it.name=u.n;for(const k in u.a)it.a[k]=Math.round(u.a[k]*(1+il*0.05));}
  else if(r===3){const sl=pick(Object.keys(SET.pieces));base=BASES.find(b=>b.s===sl);it.base=base;it.name=SET.pieces[sl];it.set=true;Object.assign(it.a,SET.own);}
  else{const keys=Object.keys(AFF).sort(()=>Math.random()-.5),n=r===1?RI(1,2):r===2?RI(3,6):0;let p=null,s=null;
    for(let i=0;i<n;i++){const k=keys[i];it.a[k]=scaleAff(k,il);if(!p&&PRE[k])p=PRE[k];else if(!s&&SUF[k])s=SUF[k];}
    it.name=r===2?pick(RNAME1)+' '+pick(RNAME2):r===1?[p,base.n,s].filter(Boolean).join(' '):base.n;}
  const f=1+il*0.15;if(base.dmg)it.dmg=[Math.round(base.dmg[0]*f),Math.round(base.dmg[1]*f)];if(base.ar)it.ar=Math.round(base.ar*f);
  if(r===0&&base.dmg&&Math.random()<.3){it.dmg[1]+=2;}
  it.value=Math.round((5+il*3)*(1+r*r*1.5));return it;}
// ---------- player ----------
const P={lvl:1,xp:0,str:15,dex:25,vit:15,ene:12,pts:0,sp:1,gold:0,hp:1,mp:1,pos:new THREE.Vector3(),target:null,atkTarget:null,atkCd:0,attacks:0,
 eq:{},inv:[],belt:[],skills:{shuriken:1,step:1,fifth:1,clone:1,smoke:0,venom:0,evasion:0,flurry:0,mastery:0},cds:{},clones:[],cloneT:0,dead:false};
P.belt=['hp','hp','mp','mp'];
const SK={
 shuriken:{n:'Shuriken Spread',ic:'✴️',key:'LMB',t:1,d:r=>`Throw 3 shurikens in a spread. +${15*r}% damage.`},
 step:{n:'Shadow Step',ic:'🌑',key:'Q',t:1,mana:8,cd:r=>Math.max(1.5,5-r*0.3),d:r=>`Teleport behind the nearest enemy and strike for ${150+40*r}% damage.`},
 fifth:{n:'Fifth Star',ic:'⭐',t:1,pass:1,d:r=>`Passive: every 5th attack fires ${r} extra shuriken(s).`},
 smoke:{n:'Smoke Bomb',ic:'💨',key:'W',t:2,mana:12,cd:r=>8,req:'step',d:r=>`Blinds & stuns nearby enemies for ${(1.5+r*0.25).toFixed(1)}s and deals ${80+30*r}% damage.`},
 venom:{n:'Venom Edge',ic:'🧪',t:2,pass:1,req:'shuriken',d:r=>`Passive: hits poison for ${10*r}% weapon damage per second (3s).`},
 evasion:{n:'Evasion',ic:'🌀',t:2,pass:1,req:'fifth',d:r=>`Passive: ${Math.min(40,4*r)}% chance to dodge attacks.`},
 flurry:{n:'Blade Flurry',ic:'🌪️',key:'E',t:3,mana:15,cd:r=>3,req:'smoke',d:r=>`Spin, slashing all nearby enemies for ${200+50*r}% damage.`},
 clone:{n:'Shadow Clone',ic:'👥',key:'R',t:1,mana:25,cd:r=>Math.max(15,30-r),d:r=>`Summon two shadow ninjas that copy your attacks for ${10+Math.floor(r/2)}s at ${50+10*r}% damage.`},
 mastery:{n:'Shadow Mastery',ic:'🗡️',t:3,pass:1,req:'clone',d:r=>`Passive: +${3*r}% critical chance and +${5*r}% damage.`}};
const TIERLVL={1:1,2:6,3:12};
function stat(k){let v=0;for(const s in P.eq){const it=P.eq[s];if(it&&it.a[k])v+=it.a[k];}
  const n=Object.values(P.eq).filter(i=>i&&i.set).length;for(const t in SET.bonus)if(n>=t&&SET.bonus[t][k])v+=SET.bonus[t][k];return v;}
const S={};
function recalc(){S.str=P.str+stat('str');S.dex=P.dex+stat('dex');S.vit=P.vit+stat('vit');S.ene=P.ene+stat('ene');
  S.maxhp=40+S.vit*3+P.lvl*3+stat('life');S.maxmp=15+S.ene*2+P.lvl*1.5+stat('mana');
  const w=P.eq.weapon;S.dmin=(w?w.dmg[0]:1)+stat('mind');S.dmax=Math.max(S.dmin,(w?w.dmg[1]:3)+stat('maxd'));
  S.ed=stat('ed')+S.str*0.75+S.dex*0.75+P.skills.mastery*5;S.ias=stat('ias');S.crit=5+S.dex*0.1+stat('crit')+P.skills.mastery*3;
  S.armor=Object.values(P.eq).reduce((a,i)=>a+(i&&i.ar||0),0)+stat('armor')+Math.floor(S.dex/4);S.ll=stat('ll');S.ms=stat('ms');S.mf=stat('mf');S.gf=stat('gf');S.regen=stat('regen');
  S.dodge=Math.min(40,P.skills.evasion*4);S.aps=1.7*(1+S.ias/100);}
function rollDmg(mult=1){let d=R(S.dmin,S.dmax)*(1+S.ed/100)*mult;const c=Math.random()*100<S.crit;if(c)d*=2;return{d:Math.round(d),c};}
const xpNeed=l=>Math.round(100*Math.pow(l,1.6));
// ---------- meshes ----------
function ninjaMesh(shadow){const g=new THREE.Group();const op=shadow?{transparent:true,opacity:0.55}:{};
  const dark=new THREE.MeshStandardMaterial({color:shadow?0x220044:0x15151c,roughness:0.7,...op});
  const body=new THREE.Mesh(new THREE.CapsuleGeometry(0.35,0.7,4,10),dark);body.position.y=0.85;body.castShadow=true;g.add(body);
  const head=new THREE.Mesh(new THREE.SphereGeometry(0.28,12,10),dark);head.position.y=1.65;g.add(head);
  const scarf=new THREE.Mesh(new THREE.TorusGeometry(0.26,0.07,6,12),new THREE.MeshStandardMaterial({color:shadow?0x6611aa:0xaa1010,...op}));scarf.rotation.x=Math.PI/2;scarf.position.y=1.42;g.add(scarf);
  const tail=new THREE.Mesh(new THREE.BoxGeometry(0.1,0.05,0.6),scarf.material);tail.position.set(0,1.42,-0.4);g.add(tail);
  const eyes=new THREE.Mesh(new THREE.BoxGeometry(0.3,0.05,0.05),new THREE.MeshBasicMaterial({color:shadow?0xbb66ff:0x66ddff}));eyes.position.set(0,1.68,0.25);g.add(eyes);
  const blade=new THREE.Mesh(new THREE.BoxGeometry(0.05,0.05,0.9),new THREE.MeshStandardMaterial({color:0x999aa8,metalness:0.8,roughness:0.3}));blade.position.set(0.25,1.4,-0.3);blade.rotation.x=0.6;g.add(blade);
  return g;}
const pMesh=ninjaMesh(false);scene.add(pMesh);
const ring=new THREE.Mesh(new THREE.RingGeometry(0.3,0.42,24),new THREE.MeshBasicMaterial({color:0xffcc66,transparent:true,opacity:0.7,side:2}));ring.rotation.x=-Math.PI/2;ring.visible=false;scene.add(ring);
const shurikenGeo=(()=>{const s=new THREE.Shape();for(let i=0;i<8;i++){const a=i/8*Math.PI*2,r=i%2?0.08:0.28;s[i?'lineTo':'moveTo'](Math.cos(a)*r,Math.sin(a)*r);}return new THREE.ExtrudeGeometry(s,{depth:0.03,bevelEnabled:false});})();
const shurikenMat=new THREE.MeshStandardMaterial({color:0xccccdd,metalness:0.9,roughness:0.2,emissive:0x222233});
// ---------- enemies ----------
const ETYPES=[{n:'Ghoul',c:0x556644,hp:22,dmg:[2,5],sp:2.6,xp:14,r:0.4,h:1.4,range:1.3,rate:1.2},
 {n:'Bone Archer',c:0xbbbb99,hp:16,dmg:[2,4],sp:2.2,xp:16,r:0.35,h:1.6,range:9,rate:1.8,ranged:1},
 {n:'Gloom Brute',c:0x553344,hp:60,dmg:[5,10],sp:1.9,xp:40,r:0.65,h:2.2,range:1.8,rate:1.6}];
let enemies=[],projs=[],eprojs=[],drops=[],fx=[];
function spawnEnemy(x,z,champ){const t=pick(depth<2?ETYPES.slice(0,2):ETYPES),sc=1+(depth-1)*0.35;
  const g=new THREE.Group(),mat=new THREE.MeshStandardMaterial({color:t.c,roughness:0.9,emissive:champ?0x112266:0});
  const b=new THREE.Mesh(new THREE.CapsuleGeometry(t.r,t.h-t.r*2,4,8),mat);b.position.y=t.h/2;b.castShadow=true;g.add(b);
  const e=new THREE.Mesh(new THREE.BoxGeometry(t.r,0.06,0.06),new THREE.MeshBasicMaterial({color:champ?0x4488ff:0xff2200}));e.position.set(0,t.h*0.82,t.r*0.85);g.add(e);
  const arm=new THREE.Mesh(new THREE.BoxGeometry(0.12,0.12,0.7),mat);arm.position.set(t.r,t.h*0.6,0.3);g.add(arm);
  if(champ)g.scale.setScalar(1.25);g.position.set(x,0,z);scene.add(g);
  const en={t,g,b,champ,hp:t.hp*sc*(champ?2.5:1),maxhp:t.hp*sc*(champ?2.5:1),dmg:t.dmg.map(v=>v*sc*(champ?1.4:1)),cd:R(0,1),stun:0,poison:0,awake:false,name:(champ?'Champion ':'')+t.n};
  b.userData.en=en;enemies.push(en);}
function clearLevel(){[...enemies.map(e=>e.g),...projs.map(p=>p.m),...eprojs.map(p=>p.m),...fx.map(f=>f.m)].forEach(m=>scene.remove(m));drops.forEach(d=>{scene.remove(d.m);d.el.remove();});
  enemies=[];projs=[];eprojs=[];drops=[];fx=[];fires.length=0;}
function newLevel(){clearLevel();const rooms=buildDungeon();const s=rooms[0];P.pos.set(s.cx*T+1,0,s.cy*T+1);P.target=null;P.atkTarget=null;
  rooms.slice(1).forEach((r,k)=>{const n=RI(2,4)+Math.floor(depth/2);const champ=Math.random()<0.25;for(let i=0;i<n;i++){const x=(r.x+R(0.5,r.w-0.5))*T,z=(r.y+R(0.5,r.h-0.5))*T;if(free(x,z,0.5))spawnEnemy(x,z,champ&&i<3);}});
  msg(`Depth ${depth}`);}
// ---------- helpers ----------
const dmgNums=[];
function popText(pos,txt,col){const el=document.createElement('div');el.className='dmg';el.textContent=txt;el.style.color=col;$('#labels').appendChild(el);dmgNums.push({el,p:pos.clone().setY(2.2),t:1});}
let msgT=0;function msg(t){$('#msg').textContent=t;msgT=2.5;}
function hitEnemy(en,d,c,src){if(en.hp<=0)return;en.hp-=d;en.awake=true;popText(en.g.position,d+(c?'!':''),c?'#ff0':'#fff');
  if(P.skills.venom&&src!=='poison')en.poison=3,en.pdps=(S.dmin+S.dmax)/2*0.1*P.skills.venom;
  if(S.ll&&src!=='poison')P.hp=Math.min(S.maxhp,P.hp+d*S.ll/100);
  en.b.material.emissive.setHex(0x661111);setTimeout(()=>en.b&&en.b.material.emissive.setHex(en.champ?0x112266:0),80);
  if(en.hp<=0)killEnemy(en);}
function killEnemy(en){scene.remove(en.g);enemies=enemies.filter(e=>e!==en);gainXp(Math.round(en.t.xp*(1+(depth-1)*0.4)*(en.champ?3:1)));
  const p=en.g.position,il=depth*2+P.lvl;
  if(Math.random()<0.55)dropGold(p,Math.round(R(3,10)*il*(1+S.gf/100)));
  const n=en.champ?RI(1,3):Math.random()<0.35?1:0;for(let i=0;i<n;i++)dropItem(p,makeItem(il,S.mf+(en.champ?100:0)));
  if(Math.random()<0.15)dropItem(p,{id:uid++,potion:Math.random()<.6?'hp':'mp'});}
function gainXp(x){P.xp+=x;while(P.xp>=xpNeed(P.lvl)){P.xp-=xpNeed(P.lvl);P.lvl++;P.pts+=5;P.sp+=1;recalc();P.hp=S.maxhp;P.mp=S.maxmp;msg(`Level ${P.lvl}! +5 attribute, +1 skill point`);
  const f=new THREE.Mesh(new THREE.CylinderGeometry(1,1,6,16,1,true),new THREE.MeshBasicMaterial({color:0xffdd88,transparent:true,opacity:0.4,side:2}));f.position.copy(P.pos).setY(3);scene.add(f);fx.push({m:f,t:1});}ui();}
function dropGold(p,v){const m=new THREE.Mesh(new THREE.CylinderGeometry(0.18,0.18,0.08,10),new THREE.MeshStandardMaterial({color:0xffcc33,metalness:1,roughness:0.3,emissive:0x332200}));
  m.position.set(p.x+R(-.6,.6),0.05,p.z+R(-.6,.6));scene.add(m);const el=document.createElement('div');el.className='lbl';el.style.color='#ddc060';el.textContent=v+' Gold';$('#labels').appendChild(el);drops.push({m,el,gold:v});}
function itemName(it){return it.potion?(it.potion==='hp'?'Healing Potion':'Mana Potion'):it.name;}
function dropItem(p,it){const col=it.potion?(it.potion==='hp'?0xff2222:0x2244ff):[0xdddddd,0x6f8cff,0xffff00,0x22ff22,0xc8a050][it.r];
  const m=new THREE.Mesh(it.potion?new THREE.SphereGeometry(0.15,8,8):new THREE.BoxGeometry(0.4,0.12,0.5),new THREE.MeshStandardMaterial({color:col,emissive:col,emissiveIntensity:0.4}));
  m.position.set(p.x+R(-.8,.8),0.1,p.z+R(-.8,.8));m.rotation.y=R(0,6);scene.add(m);
  if(!it.potion&&it.r>=3){const l=new THREE.PointLight(col,6,4);l.position.y=0.8;m.add(l);}
  const el=document.createElement('div');el.className='lbl '+(it.potion?'':'r'+it.r);el.style.color=it.potion?(it.potion==='hp'?'#f66':'#68f'):'';el.textContent=itemName(it);
  $('#labels').appendChild(el);const d={m,el,item:it};el.onclick=e=>{e.stopPropagation();P.target=m.position.clone();P.pickup=d;P.atkTarget=null;};el.onmouseenter=()=>!it.potion&&showTip(it,el);el.onmouseleave=hideTip;drops.push(d);}
function tryPickup(d){if(d.gold){P.gold+=d.gold;}else if(d.item.potion){const i=P.belt.indexOf(null);if(i<0){msg('Belt full');return false;}P.belt[i]=d.item.potion;}
  else if(!placeInv(d.item)){msg('Inventory full');return false;}scene.remove(d.m);d.el.remove();drops=drops.filter(x=>x!==d);ui();return true;}
// inventory grid 10x4
const GW=10,GH=4;
function fits(it,x,y,ign){if(x<0||y<0||x+it.base.w>GW||y+it.base.h>GH)return false;
  return !P.inv.some(o=>o!==ign&&x<o.x+o.base.w&&x+it.base.w>o.x&&y<o.y+o.base.h&&y+it.base.h>o.y);}
function placeInv(it){for(let x=0;x<GW;x++)for(let y=0;y<GH;y++)if(fits(it,x,y)){it.x=x;it.y=y;P.inv.push(it);return true;}return false;}
function equip(it){let slot=it.base.s;if(slot==='ring')slot=!P.eq.ring1?'ring1':!P.eq.ring2?'ring2':'ring1';
  P.inv=P.inv.filter(o=>o!==it);const old=P.eq[slot];P.eq[slot]=it;if(old&&!placeInv(old)){P.eq[slot]=old;P.inv.push(it);msg('No room');}recalc();ui();}
function unequip(slot){const it=P.eq[slot];if(!it)return;if(placeInv(it)){delete P.eq[slot];recalc();ui();}else msg('Inventory full');}
// ---------- tooltip ----------
function tipHtml(it,cmp){let h=`<div class="n r${it.r}">${it.name}</div><div class="r${it.r}">${it.r===0?'':RAR[it.r]+' '}${it.base.n}</div>`;
  if(it.dmg)h+=`<div>Damage: ${it.dmg[0]} to ${it.dmg[1]}</div>`;if(it.ar)h+=`<div>Defense: ${it.ar}</div>`;h+=`<div class="g">Item Level ${it.il}</div>`;
  for(const k in it.a)h+=`<div class="${it.set?'s':'a'}">${AFF[k][1].replace('{v}',it.a[k])}</div>`;
  if(it.set){h+=`<br><div class="s">${SET.name}</div>`;const n=Object.values(P.eq).filter(i=>i&&i.set).length;
    for(const t in SET.bonus)h+=`<div class="${n>=t?'s':'g'}">(${t} items) ${Object.entries(SET.bonus[t]).map(([k,v])=>AFF[k][1].replace('{v}',v)).join(', ')}</div>`;}
  h+=`<div class="g">Sell value: ${it.value} gold</div>`;if(cmp)h+=`<div class="g">${cmp}</div>`;return h;}
function showTip(it,el,cmp){const t=$('#tip');t.innerHTML=tipHtml(it,cmp);t.classList.remove('hidden');const r=el.getBoundingClientRect();
  t.style.left=Math.max(4,Math.min(innerWidth-310,r.left))+'px';t.style.top=Math.max(4,r.top-t.offsetHeight-8)+'px';}
function hideTip(){$('#tip').classList.add('hidden');}
// ---------- UI ----------
const SLOTS=[['head','Head'],['amulet','Amulet'],['weapon','Weapon'],['chest','Chest'],['gloves','Gloves'],['belt','Belt'],['boots','Boots'],['ring1','Ring'],['ring2','Ring']];
function ui(){recalc();
  $('#belt').innerHTML=P.belt.map((p,i)=>`<div class="slot"><b>${i+1}</b>${p?(p==='hp'?'🧪':'🫙'):''}</div>`).join('');
  $('#skills').innerHTML=['shuriken','step','smoke','flurry','clone'].map(k=>`<div class="slot" title="${SK[k].n}" style="${P.skills[k]?'':'opacity:.3'}"><b>${SK[k].key}</b>${SK[k].ic}<i>${P.skills[k]||''}</i><div class="cd" id="cd_${k}"></div></div>`).join('');
  const c=$('#char');c.innerHTML=`<h2>Nyx — Shadow Ninja</h2><div class="row"><span>Level</span><span>${P.lvl}</span></div><div class="row"><span>Experience</span><span>${P.xp} / ${xpNeed(P.lvl)}</span></div><div class="row"><span>Gold</span><span>${P.gold}</span></div>
   <div class="row"><span>Stat points</span><span>${P.pts}</span></div>`+[['str','Strength'],['dex','Dexterity'],['vit','Vitality'],['ene','Energy']].map(([k,n])=>`<div class="row"><span>${n}</span><span>${S[k]}${P.pts?`<button class="plus" data-a="${k}">+</button>`:''}</span></div>`).join('')+
   `<br><div class="row"><span>Damage</span><span>${Math.round(S.dmin*(1+S.ed/100))}-${Math.round(S.dmax*(1+S.ed/100))}</span></div><div class="row"><span>Attacks / sec</span><span>${S.aps.toFixed(2)}</span></div><div class="row"><span>Crit chance</span><span>${S.crit.toFixed(1)}%</span></div>
   <div class="row"><span>Defense</span><span>${S.armor}</span></div><div class="row"><span>Life</span><span>${Math.round(S.maxhp)}</span></div><div class="row"><span>Mana</span><span>${Math.round(S.maxmp)}</span></div><div class="row"><span>Life steal</span><span>${S.ll}%</span></div><div class="row"><span>Magic find</span><span>${S.mf}%</span></div><div class="row"><span>Dodge</span><span>${S.dodge}%</span></div>`;
  c.querySelectorAll('[data-a]').forEach(b=>b.onclick=()=>{P[b.dataset.a]++;P.pts--;ui();});
  const tr=$('#tree');let th=`<h2>Skill Tree — ${P.sp} point(s)</h2>`;
  for(const t of [1,2,3]){th+=`<div style="color:#998;margin-top:6px">Tier ${t} (level ${TIERLVL[t]})</div>`;for(const k in SK){const s=SK[k];if(s.t!==t)continue;const r=P.skills[k];
    const ok=P.lvl>=TIERLVL[t]&&(!s.req||P.skills[s.req]>0);th+=`<div class="tnode ${ok?'':'locked'}"><h4><span>${s.ic} ${s.n}${s.key?' ['+s.key+']':''}</span><span>${r}/20 ${ok&&P.sp&&r<20?`<button class="plus" data-s="${k}">+</button>`:''}</span></h4><p>${s.d(Math.max(1,r))}</p>${s.req?`<p style="color:#776">Requires ${SK[s.req].n}</p>`:''}</div>`;}}
  tr.innerHTML=th;tr.querySelectorAll('[data-s]').forEach(b=>b.onclick=()=>{P.skills[b.dataset.s]++;P.sp--;ui();});
  const inv=$('#inv');inv.innerHTML=`<h2>Inventory</h2><div id="equip">${SLOTS.map(([s,n])=>{const it=P.eq[s];return `<div class="eq ${it?'r'+it.r:''}" data-e="${s}">${it?`<span class="ic">${it.base.ic}</span>`:n}</div>`}).join('')}</div>
   <div id="grid">${P.inv.map(it=>`<div class="it r${it.r}" data-i="${it.id}" style="left:${it.x*39}px;top:${it.y*39}px;width:${it.base.w*39-1}px;height:${it.base.h*39-1}px">${it.base.ic}</div>`).join('')}</div>
   <p class="small">Click item to equip · Right-click to sell · Click equipped to remove · Gold: ${P.gold}</p>`;
  inv.querySelectorAll('[data-e]').forEach(el=>{const s=el.dataset.e;el.onclick=()=>{hideTip();unequip(s);};el.onmouseenter=()=>P.eq[s]&&showTip(P.eq[s],el);el.onmouseleave=hideTip;});
  inv.querySelectorAll('[data-i]').forEach(el=>{const it=P.inv.find(i=>i.id==el.dataset.i);el.onclick=()=>{hideTip();equip(it);};
    el.oncontextmenu=e=>{e.preventDefault();hideTip();P.inv=P.inv.filter(i=>i!==it);P.gold+=it.value;ui();};
    el.onmouseenter=()=>{const s=it.base.s==='ring'?'ring1':it.base.s,cur=P.eq[s];showTip(it,el,cur?'Currently equipped: '+cur.name:'');};el.onmouseleave=hideTip;});}
function toggle(id){if(id==='char')$('#tree').classList.add('hidden');if(id==='tree')$('#char').classList.add('hidden');$('#'+id).classList.toggle('hidden');hideTip();}
document.querySelectorAll('#btns button').forEach(b=>b.onclick=()=>toggle(b.dataset.p));
// ---------- input ----------
const mouse=new THREE.Vector2(),ray=new THREE.Raycaster(),plane=new THREE.Plane(new THREE.Vector3(0,1,0),0);let mdown=false,shift=false,hoverEn=null,mouseWorld=new THREE.Vector3();
function updMouse(e){mouse.set(e.clientX/innerWidth*2-1,-e.clientY/innerHeight*2+1);ray.setFromCamera(mouse,camera);
  const hits=ray.intersectObjects(enemies.map(e=>e.b));hoverEn=hits.length?hits[0].object.userData.en:null;ray.ray.intersectPlane(plane,mouseWorld);}
renderer.domElement.addEventListener('mousemove',updMouse);
renderer.domElement.addEventListener('contextmenu',e=>e.preventDefault());
renderer.domElement.addEventListener('mousedown',e=>{updMouse(e);if(e.button===2){cast('step');return;}mdown=true;P.pickup=null;
  if(hoverEn){P.atkTarget=hoverEn;P.target=null;}else if(shift){P.atkTarget=null;P.target=null;attackAt(mouseWorld);}else{P.atkTarget=null;P.target=mouseWorld.clone();}});
addEventListener('mouseup',()=>mdown=false);
addEventListener('keydown',e=>{if(e.key==='Shift')shift=true;const k=e.key.toLowerCase();
  if(k==='q')cast('step');if(k==='w')cast('smoke');if(k==='e')cast('flurry');if(k==='r')cast('clone');
  if('1234'.includes(k)&&k)drink(+k-1);if(k==='i')toggle('inv');if(k==='c')toggle('char');if(k==='t'||k==='s')toggle('tree');if(k==='escape')['inv','char','tree'].forEach(i=>$('#'+i).classList.add('hidden'));});
addEventListener('keyup',e=>{if(e.key==='Shift')shift=false;});
function drink(i){const p=P.belt[i];if(!p)return;if(p==='hp')P.hpPot=(P.hpPot||0)+S.maxhp*0.5;else P.mp=Math.min(S.maxmp,P.mp+S.maxmp*0.5);P.belt[i]=null;
  const j=P.belt.indexOf(null);ui();}
// ---------- combat ----------
function faceTo(p){pMesh.rotation.y=Math.atan2(p.x-P.pos.x,p.z-P.pos.z);}
function throwFan(from,dir,mult,count){const sh=[];const n=count;for(let i=0;i<n;i++){const a=(i-(n-1)/2)*0.22;const d=dir.clone().applyAxisAngle(new THREE.Vector3(0,1,0),a);
  const m=new THREE.Mesh(shurikenGeo,shurikenMat);m.rotation.x=-Math.PI/2;m.position.copy(from).setY(1.2);scene.add(m);projs.push({m,v:d.multiplyScalar(18),t:0.7,mult,hit:new Set()});}}
function attackAt(p){if(P.atkCd>0)return;P.atkCd=1/S.aps;faceTo(p);P.attacks++;let n=3;if(P.attacks%5===0){n+=P.skills.fifth;popText(P.pos,'★','#fc6');}
  const mult=1+0.15*P.skills.shuriken;const dir=new THREE.Vector3(p.x-P.pos.x,0,p.z-P.pos.z).normalize();throwFan(P.pos,dir,mult,n);
  if(P.cloneT>0)P.clones.forEach(c=>{const cd=new THREE.Vector3(p.x-c.position.x,0,p.z-c.position.z).normalize();c.rotation.y=Math.atan2(cd.x,cd.z);throwFan(c.position,cd,mult*(0.5+0.1*P.skills.clone),n);});}
function nearest(maxD=14){let b=null,bd=maxD;enemies.forEach(e=>{const d=e.g.position.distanceTo(P.pos);if(d<bd){bd=d;b=e;}});return b;}
function burst(p,col,rad){const m=new THREE.Mesh(new THREE.SphereGeometry(rad,16,12),new THREE.MeshBasicMaterial({color:col,transparent:true,opacity:0.5}));m.position.copy(p).setY(0.8);scene.add(m);fx.push({m,t:0.5,grow:1});}
function cast(k){const r=P.skills[k];if(!r||P.dead)return;const s=SK[k];if((P.cds[k]||0)>0)return;if(P.mp<s.mana){msg('Not enough mana');return;}
  if(k==='step'){const en=hoverEn||nearest();if(!en){msg('No target');return;}const ep=en.g.position,back=new THREE.Vector3(ep.x-P.pos.x,0,ep.z-P.pos.z).normalize();
    const np=ep.clone().add(back.multiplyScalar(1.2));burst(P.pos,0x220044,0.8);if(free(np.x,np.z))P.pos.copy(np);else P.pos.copy(ep).add(back.multiplyScalar(-0.9));
    faceTo(ep);burst(P.pos,0x6611aa,0.8);const {d,c}=rollDmg((150+40*r)/100);hitEnemy(en,d,c);P.target=null;}
  if(k==='smoke'){burst(P.pos,0x777777,4);enemies.forEach(e=>{if(e.g.position.distanceTo(P.pos)<4.5){e.stun=1.5+r*0.25;const {d,c}=rollDmg((80+30*r)/100);hitEnemy(e,d,c);}});}
  if(k==='flurry'){burst(P.pos,0xaaaacc,3);pMesh.userData.spin=0.4;enemies.slice().forEach(e=>{if(e.g.position.distanceTo(P.pos)<3.2){const {d,c}=rollDmg((200+50*r)/100);hitEnemy(e,d,c);}});}
  if(k==='clone'){P.clones.forEach(c=>scene.remove(c));P.clones=[0,1].map(i=>{const c=ninjaMesh(true);scene.add(c);return c;});P.cloneT=10+Math.floor(r/2);burst(P.pos,0x440088,1.5);msg('Shadow Clone!');}
  P.mp-=s.mana;P.cds[k]=s.cd(r);}
function hurtPlayer(d){if(P.dead)return;if(Math.random()*100<S.dodge){popText(P.pos,'Dodge','#9cf');return;}d=Math.max(1,Math.round(d*100/(100+S.armor)));P.hp-=d;popText(P.pos,d,'#f44');
  if(P.hp<=0){P.dead=true;P.hp=0;msg('You have died. Respawning...');const lost=Math.floor(P.gold*0.2);P.gold-=lost;setTimeout(()=>{P.dead=false;recalc();P.hp=S.maxhp;P.mp=S.maxmp;newLevel();ui();},2500);}}
// ---------- loop ----------
const clock=new THREE.Clock();const v3=new THREE.Vector3();
function moveToward(pos,tgt,sp,dt,r){const d=v3.set(tgt.x-pos.x,0,tgt.z-pos.z);const L=d.length();if(L<0.05)return true;d.multiplyScalar(Math.min(L,sp*dt)/L);
  if(free(pos.x+d.x,pos.z,r))pos.x+=d.x;if(free(pos.x,pos.z+d.z,r))pos.z+=d.z;return L<0.15;}
function project(p,el,yoff=0){v3.copy(p);v3.y+=yoff;v3.project(camera);if(v3.z>1){el.style.display='none';return;}el.style.display='';el.style.left=(v3.x+1)/2*innerWidth+'px';el.style.top=(1-v3.y)/2*innerHeight+'px';}
let running=false;
function tick(){requestAnimationFrame(tick);const dt=Math.min(clock.getDelta(),0.05);if(!running){renderer.render(scene,camera);return;}const t=clock.elapsedTime;
  recalc();if(!P.dead){P.mp=Math.min(S.maxmp,P.mp+(1+S.ene*0.03)*dt);P.hp=Math.min(S.maxhp,P.hp+S.regen*dt*0.5);
    if(P.hpPot>0){const h=Math.min(P.hpPot,S.maxhp*0.25*dt);P.hp=Math.min(S.maxhp,P.hp+h);P.hpPot-=h;}}
  P.atkCd-=dt;for(const k in P.cds)P.cds[k]-=dt;
  if(mdown&&!P.dead&&!P.atkTarget){if(hoverEn)P.atkTarget=hoverEn;else if(shift)attackAt(mouseWorld);else P.target=mouseWorld.clone();}
  const spd=6*(1+S.ms/100);let moving=false;
  if(!P.dead){if(P.atkTarget){if(P.atkTarget.hp<=0||!enemies.includes(P.atkTarget))P.atkTarget=null;else{const ep=P.atkTarget.g.position;
      if(ep.distanceTo(P.pos)>10){moveToward(P.pos,ep,spd,dt,0.35);moving=true;faceTo(ep);}else{attackAt(ep);if(!mdown&&P.atkCd>0.9/S.aps)P.atkTarget=null;}}}
    else if(P.target){moving=!moveToward(P.pos,P.target,spd,dt,0.35);faceTo(P.target);if(!moving)P.target=null;
      if(P.pickup&&P.pickup.m.position.distanceTo(P.pos)<1.2){tryPickup(P.pickup);P.pickup=null;P.target=null;}}}
  // auto gold / potion pickup
  drops.slice().forEach(d=>{if((d.gold)&&d.m.position.distanceTo(P.pos)<1)tryPickup(d);});
  if(stairs&&P.pos.distanceTo(stairs.position)<1&&!P.dead){depth++;newLevel();ui();}
  pMesh.position.copy(P.pos);pMesh.position.y=moving?Math.abs(Math.sin(t*12))*0.12:0;if(pMesh.userData.spin>0){pMesh.userData.spin-=dt;pMesh.rotation.y+=dt*30;}
  ring.visible=!!P.target;if(P.target)ring.position.set(P.target.x,0.03,P.target.z);
  torch.position.set(P.pos.x,4,P.pos.z);camera.position.copy(P.pos).add(CAMOFF);camera.lookAt(P.pos);
  // clones
  if(P.cloneT>0){P.cloneT-=dt;P.clones.forEach((c,i)=>{const a=pMesh.rotation.y+(i?2.2:-2.2);c.position.lerp(v3.set(P.pos.x+Math.sin(a)*1.6,0,P.pos.z+Math.cos(a)*1.6),0.15);});
    if(P.cloneT<=0){P.clones.forEach(c=>scene.remove(c));P.clones=[];}}
  // projectiles
  projs=projs.filter(p=>{p.t-=dt;p.m.position.addScaledVector(p.v,dt);p.m.rotation.z+=dt*25;
    if(!walk(p.m.position.x,p.m.position.z))p.t=0;
    for(const e of enemies){if(!p.hit.has(e)&&e.g.position.distanceTo(v3.copy(p.m.position).setY(0))<e.t.r+0.35){p.hit.add(e);const {d,c}=rollDmg(p.mult);hitEnemy(e,d,c);p.t=0;break;}}
    if(p.t<=0){scene.remove(p.m);return false;}return true;});
  eprojs=eprojs.filter(p=>{p.t-=dt;p.m.position.addScaledVector(p.v,dt);if(!walk(p.m.position.x,p.m.position.z))p.t=0;
    if(v3.copy(p.m.position).setY(0).distanceTo(P.pos)<0.5){hurtPlayer(p.d);p.t=0;}if(p.t<=0){scene.remove(p.m);return false;}return true;});
  // enemies
  enemies.slice().forEach(e=>{const ep=e.g.position,d=ep.distanceTo(P.pos);if(e.poison>0){e.poison-=dt;e.pacc=(e.pacc||0)+e.pdps*dt;if(e.pacc>=1){const x=Math.floor(e.pacc);e.pacc-=x;hitEnemy(e,x,false,'poison');if(e.hp<=0)return;}}
    if(d<13)e.awake=true;if(!e.awake||P.dead)return;e.cd-=dt;if(e.stun>0){e.stun-=dt;e.g.rotation.z=Math.sin(t*10)*0.1;return;}e.g.rotation.z=0;
    e.g.rotation.y=Math.atan2(P.pos.x-ep.x,P.pos.z-ep.z);
    if(d>e.t.range*(e.champ?1.25:1)){moveToward(ep,P.pos,e.t.sp*(e.champ?1.2:1),dt,e.t.r*0.8);ep.y=Math.abs(Math.sin(t*8+e.hp))*0.08;}
    else if(e.cd<=0){e.cd=e.t.rate;const dm=R(e.dmg[0],e.dmg[1]);
      if(e.t.ranged){const m=new THREE.Mesh(new THREE.ConeGeometry(0.05,0.6,4),new THREE.MeshBasicMaterial({color:0xddddaa}));m.position.copy(ep).setY(1.2);
        const dir=new THREE.Vector3(P.pos.x-ep.x,0,P.pos.z-ep.z).normalize();m.lookAt(m.position.clone().add(dir));m.rotateX(Math.PI/2);scene.add(m);eprojs.push({m,v:dir.multiplyScalar(11),t:1.2,d:dm});}
      else{hurtPlayer(dm);e.g.position.addScaledVector(v3.set(P.pos.x-ep.x,0,P.pos.z-ep.z).normalize(),0.0);}}
    // separation
    enemies.forEach(o=>{if(o!==e){const dd=ep.distanceTo(o.g.position);if(dd<e.t.r+o.t.r&&dd>0.001){v3.subVectors(ep,o.g.position).setY(0).multiplyScalar(0.02/dd);if(free(ep.x+v3.x,ep.z+v3.z,e.t.r*0.8))ep.add(v3);}}});});
  fx=fx.filter(f=>{f.t-=dt;f.m.material.opacity=Math.max(0,f.t);if(f.grow)f.m.scale.multiplyScalar(1+dt*2);if(f.t<=0){scene.remove(f.m);return false;}return true;});
  fires.forEach((f,i)=>f.scale.y=1+Math.sin(t*15+i)*0.2);drops.forEach(d=>{if(d.item)d.m.rotation.y+=dt;});
  // overlays
  drops.forEach(d=>project(d.m.position,d.el,0.6));
  for(let i=dmgNums.length-1;i>=0;i--){const n=dmgNums[i];n.t-=dt;n.p.y+=dt*1.5;project(n.p,n.el);n.el.style.opacity=n.t;if(n.t<=0){n.el.remove();dmgNums.splice(i,1);}}
  $('#hpOrb .fill').style.height=(P.hp/S.maxhp*100)+'%';$('#hpOrb span').textContent=`${Math.ceil(P.hp)}/${Math.round(S.maxhp)}`;
  $('#mpOrb .fill').style.height=(P.mp/S.maxmp*100)+'%';$('#mpOrb span').textContent=`${Math.floor(P.mp)}/${Math.round(S.maxmp)}`;
  $('#xpbar .fill').style.width=(P.xp/xpNeed(P.lvl)*100)+'%';
  for(const k of ['step','smoke','flurry','clone']){const el=document.getElementById('cd_'+k);if(el)el.style.height=Math.max(0,(P.cds[k]||0)/SK[k].cd(P.skills[k]||1)*100)+'%';}
  const he=hoverEn;$('#topinfo').innerHTML=he?`<span style="color:${he.champ?'#68f':'#eee'}">${he.name}</span> — ${Math.ceil(he.hp)}/${Math.ceil(he.maxhp)}`:`Depth ${depth} · Level ${P.lvl} · ${P.gold} gold · ${enemies.length} foes${P.pts||P.sp?` · <span style="color:#fc6">${P.pts} stat / ${P.sp} skill pts</span>`:''}`;
  if(msgT>0){msgT-=dt;if(msgT<=0)$('#msg').textContent='';}
  renderer.render(scene,camera);}
// ---------- start ----------
recalc();P.eq.weapon=makeItem(1,0,0);P.eq.weapon.base=BASES[0];P.eq.weapon.name='Kunai';P.eq.weapon.dmg=[2,5];recalc();P.hp=S.maxhp;P.mp=S.maxmp;
newLevel();ui();tick();
$('#start').onclick=()=>{$('#title').remove();running=true;clock.getDelta();};
window.__game={P,enemies:()=>enemies,cast,attackAt,start:()=>$('#start').click(),makeItem,placeInv,ui,dropItem};
