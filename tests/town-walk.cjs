// Real held-WASD walking in town: spawn -> each NPC -> portal. Path planned on the walk grid (BFS), steered only with key presses.
// Scenarios: new character, v2 save in town, v2 save in dungeon (then portal back), v1 save (migrated).
const {chromium}=require('playwright-core');const URL=process.argv[2]||'http://127.0.0.1:8792/';let fails=0;const ok=(c,m)=>{console.log((c?'PASS ':'FAIL ')+m);if(!c)fails++;};
(async()=>{const b=await chromium.launch({executablePath:'/usr/bin/google-chrome',args:['--use-gl=swiftshader','--enable-unsafe-swiftshader']});const p=await b.newPage({viewport:{width:1280,height:720}});const errs=[];p.on('pageerror',e=>errs.push(e.message));p.on('console',m=>m.type()==='error'&&errs.push(m.text()));
const G=(f,a)=>p.evaluate(f,a),W=ms=>p.waitForTimeout(ms);
const boot=async(save)=>{await p.goto(URL);await G(s=>{localStorage.clear();if(s)localStorage.setItem('ashen_save_v1',s);},save);await p.reload();await p.waitForFunction(()=>!document.querySelector('#start').disabled,null,{timeout:120000});await p.keyboard.press('Enter');await W(2000);};
const path=(tx,tz)=>G(([tx,tz])=>{const g=__game.grid(),P=__game.P,T=2,N=g.length;const s=[Math.floor(P.pos.x/T),Math.floor(P.pos.z/T)];const key=(i,j)=>i*N+j;const prev=new Map([[key(...s),null]]);const q=[s];let end=null;
  const tgt=[Math.floor(tx/T),Math.floor(tz/T)];while(q.length){const [i,j]=q.shift();if(Math.abs(i-tgt[0])+Math.abs(j-tgt[1])<=1){end=[i,j];break;}for(const [a,c] of [[1,0],[-1,0],[0,1],[0,-1]]){const ni=i+a,nj=j+c;if(ni<0||nj<0||ni>=N||nj>=N||!g[ni][nj]||prev.has(key(ni,nj)))continue;prev.set(key(ni,nj),[i,j]);q.push([ni,nj]);}}
  if(!end)return null;const out=[];let c=end;while(c){out.unshift([c[0]*T+1,c[1]*T+1]);c=prev.get(key(...c));}return out;},[tx,tz]);
const held=new Set();const setKeys=async want=>{for(const k of [...held])if(!want.has(k)){await p.keyboard.up(k);held.delete(k);}for(const k of want)if(!held.has(k)){await p.keyboard.down(k);held.add(k);}};
const walkTo=async(tx,tz,reach)=>{const wp=await path(tx,tz);if(!wp)return {ok:false,why:'no path'};wp.push([tx,tz]);let i=1,t0=Date.now(),moved=0,last=null;
  while(Date.now()-t0<90000){const [x,z]=await G(()=>[__game.P.pos.x,__game.P.pos.z]);if(last)moved+=Math.hypot(x-last[0],z-last[1]);last=[x,z];if(Math.hypot(x-tx,z-tz)<reach){await setKeys(new Set());return {ok:true,moved:+moved.toFixed(1)};}
    while(i<wp.length-1&&Math.hypot(x-wp[i][0],z-wp[i][1])<0.8)i++;const [wx,wz]=wp[i];const dx=wx-x,dz=wz-z;const f=-(dx+dz)/2,r=(dx-dz)/2,m=Math.max(Math.abs(f),Math.abs(r));const want=new Set();
    if(Math.abs(f)>m*0.4)want.add(f>0?'w':'s');if(Math.abs(r)>m*0.4)want.add(r>0?'d':'a');await setKeys(want);await W(60);}
  await setKeys(new Set());return {ok:false,why:'timeout',moved};};
const tour=async(label)=>{const st=await G(()=>({t:__game.inTown(),x:__game.P.pos.x,z:__game.P.pos.z}));ok(st.t,label+': in town at spawn '+st.x.toFixed(1)+','+st.z.toFixed(1));
  // raw displacement from a single held key
  const a=await G(()=>[__game.P.pos.x,__game.P.pos.z]);await p.keyboard.down('s');await W(700);await p.keyboard.up('s');const c=await G(()=>[__game.P.pos.x,__game.P.pos.z]);ok(Math.hypot(c[0]-a[0],c[1]-a[1])>0.4,label+': holding S moves Nyx '+Math.hypot(c[0]-a[0],c[1]-a[1]).toFixed(2)+'m');
  for(const id of ['smith','trader','alch']){const n=await G(id=>__game.TOWN.npcs.find(n=>n.id===id),id);const r=await walkTo(n.x,n.z,2.2);await W(300);const pr=await G(()=>!document.querySelector('#prompt').classList.contains('hidden'));
    await p.keyboard.press('e');await W(300);const op=await G(()=>__game.shopOpen());ok(r.ok&&pr&&op===id,`${label}: walked (WASD) ${r.moved||0}m to ${n.n}, prompt+E opens shop ${JSON.stringify(r)}`);await p.keyboard.press('Escape');await W(200);}
  const po=await G(()=>__game.TOWN.portal);const r=await walkTo(po[0],po[1],1.1);await W(500);const md=await G(()=>!document.querySelector('#modal').classList.contains('hidden')&&/Descend/.test(document.querySelector('#modal').textContent));
  ok(r.ok&&md,`${label}: walked to portal ${r.moved||0}m, portal dialog opened`);if(md){await p.keyboard.press('Escape');await W(200);}};
await boot(null);await tour('new character');
await G(()=>__game.saveGame());const v2town=await G(()=>localStorage.getItem('ashen_save_v1'));
await boot(v2town);await tour('v2 save (town)');
// v2 dungeon save -> load in dungeon -> check dungeon WASD -> pause Return to Town -> tour
const v2d=JSON.parse(v2town);v2d.state.loc='dungeon';v2d.state.depth=2;v2d.state.deepest=2;v2d.summary.loc='dungeon';await boot(JSON.stringify(v2d));
const a=await G(()=>({t:__game.inTown(),p:[__game.P.pos.x,__game.P.pos.z]}));await G(()=>__game.enemies().forEach(e=>{e.awake=false;e.g.position.set(1e3,0,1e3);}));
let mv=0;for(const k of ['w','d','s','a']){const q0=await G(()=>[__game.P.pos.x,__game.P.pos.z]);await p.keyboard.down(k);await W(500);await p.keyboard.up(k);const q1=await G(()=>[__game.P.pos.x,__game.P.pos.z]);mv=Math.max(mv,Math.hypot(q1[0]-q0[0],q1[1]-q0[1]));}
ok(!a.t&&mv>0.3,'v2 save (dungeon): loads in dungeon and WASD moves '+mv.toFixed(2)+'m');
await p.keyboard.press('Escape');await W(300);await p.click('#pmenu >> text=Return to Town');await W(1000);await tour('after dungeon -> town');
const v1=JSON.parse(v2town);const s1=v1.state;delete s1.loc;delete s1.deepest;delete s1.floorState;delete s1.stock;s1.depth=1;v1.v=1;v1.summary={floor:1,level:s1.lvl,gold:s1.gold};await boot(JSON.stringify(v1));
const m=await G(()=>({t:__game.inTown(),d:__game.depth()}));ok(!m.t&&m.d===1,'v1 save migrates and loads (floor 1)');await G(()=>__game.enemies().forEach(e=>{e.awake=false;e.g.position.set(1e3,0,1e3);}));
await p.keyboard.press('Escape');await W(300);await p.click('#pmenu >> text=Return to Town');await W(1000);await tour('v1 save -> town');
ok(errs.length===0,'console/page errors: '+JSON.stringify(errs));await b.close();console.log(fails?fails+' FAILED':'ALL PASS');process.exit(fails?1:0);})();
