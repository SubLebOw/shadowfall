// Pre-Stage-7 polish regression: brute charge lane/lock/dodge, tooltips, death penalty + reload exploit, formatting, sell buttons, rarity colours.
const {chromium}=require('playwright-core');const URL=process.argv[2]||'http://127.0.0.1:8792/';const SHOT=process.argv[3];let fails=0;const ok=(c,m)=>{console.log((c?'PASS ':'FAIL ')+m);if(!c)fails++;};
(async()=>{const b=await chromium.launch({executablePath:'/usr/bin/google-chrome',args:['--use-gl=swiftshader','--enable-unsafe-swiftshader']});const p=await b.newPage({viewport:{width:1280,height:720}});const errs=[];p.on('pageerror',e=>errs.push(e.message));p.on('console',m=>m.type()==='error'&&errs.push(m.text()));
const G=(f,a)=>p.evaluate(f,a),W=ms=>p.waitForTimeout(ms);const key=async k=>{await p.keyboard.press(k);await W(250);};
const box=async s=>{const e=await p.$(s);return e&&await e.boundingBox();};const mclick=async s=>{const bb=await box(s);await p.mouse.move(bb.x+bb.width/2,bb.y+bb.height/2,{steps:3});await p.mouse.click(bb.x+bb.width/2,bb.y+bb.height/2);await W(300);};
const over=(a,b)=>a&&b&&a.x<b.x+b.width&&b.x<a.x+a.width&&a.y<b.y+b.height&&b.y<a.y+a.height;const tipVis=()=>G(()=>!document.querySelector('#tip').classList.contains('hidden'));
await p.goto(URL);await p.waitForFunction(()=>!document.querySelector('#start').disabled,null,{timeout:120000});await G(()=>localStorage.clear());await p.reload();await p.waitForFunction(()=>!document.querySelector('#start').disabled,null,{timeout:120000});await key('Enter');await W(1500);
// ---------- 1 brute charge ----------
await G(()=>{__game.enterDungeon(3);});await W(800);
const trials=[];for(let t=0;t<5;t++){
 const setup=await G(()=>{const g=__game,P=g.P;g.enemies().forEach(e=>{e.awake=false;e.hp=0;e.g.position.set(1e3,0,1e3);});P.grace=0;P.hp=1e5;g.S.maxhp=1e5;
  // find open straight lane of 9m
  const gr=g.grid();for(let i=0;i<56;i++)for(let j=0;j<56;j++){if(!gr[i][j])continue;const x=i*2+1,z=j*2+1;let okk=true;for(let a=-6;a<=10&&okk;a+=0.5)for(let s=-2;s<=2&&okk;s+=1)if(!g.free(x+a,z+s,0.45))okk=false;if(okk){P.pos.set(x+3.5,0,z);return {x,z};}}return null;});
 if(!setup){ok(false,'no open area');break;}
 await G(({x,z})=>{const g=__game;g.spawnFull(x-3.5,z,false,[],g.ETYPES[2]);const e=g.enemies()[g.enemies().length-1];e.awake=true;e.chT=0;e.cd=0;window.__br=e;},setup);
 // wait for locked phase while recording lane direction
 let lk=null;for(let k=0;k<80&&!lk;k++){await W(40);lk=await G(()=>{const e=window.__br;if(e.charging&&e.locked){const L=e.chargeLine;return {dir:[e.dashDir.x,e.dashDir.z],laneRot:L.rotation.z,col:L.material.color.getHexString(),start:[e.g.position.x,e.g.position.z],laneMid:[L.position.x,L.position.z],laneLen:L.scale.x};}return null;});}
 if(!lk){trials.push({err:'never locked'});continue;}
 const laneDir=[Math.cos(-lk.laneRot),Math.sin(-lk.laneRot)];const laneOk=Math.abs(laneDir[0]*lk.dir[0]+laneDir[1]*lk.dir[1]-1)<1e-3;
 // sidestep perpendicular with held keys
 const perp=[-lk.dir[1],lk.dir[0]];const f=-(perp[0]+perp[1])/2,r=(perp[0]-perp[1])/2;const ks=[];if(t<4&&Math.abs(f)>0.2)ks.push(f>0?'w':'s');if(t<4&&Math.abs(r)>0.2)ks.push(r>0?'d':'a');
 const hp0=await G(()=>__game.P.hp);for(const k of ks)await p.keyboard.down(k);
 const path=[];for(let k=0;k<45;k++){await W(30);const s=await G(()=>{const e=window.__br;return {x:e.g.position.x,z:e.g.position.z,dash:e.dash,hit:e.dashHit,charging:e.charging,locked:e.locked,dir:[e.dashDir.x,e.dashDir.z]};});path.push(s);if(k>5&&s.dash<=0&&!s.charging)break;}
 for(const k of ks)await p.keyboard.up(k);
 const hp1=await G(()=>__game.P.hp);let dev=0,along=0,dirChange=0;for(const s of path){const dx=s.x-lk.start[0],dz=s.z-lk.start[1];dev=Math.max(dev,Math.abs(dx*perp[0]+dz*perp[1]));along=Math.max(along,dx*lk.dir[0]+dz*lk.dir[1]);dirChange=Math.max(dirChange,Math.hypot(s.dir[0]-lk.dir[0],s.dir[1]-lk.dir[1]));}
 trials.push({laneOk,col:lk.col,dev:+dev.toFixed(3),along:+along.toFixed(2),laneLen:lk.laneLen,dirChange:+dirChange.toFixed(4),hit:path.some(s=>s.hit),dmg:hp0-hp1});
 await G(()=>{window.__br.hp=0;window.__br.g.position.set(1e3,0,1e3);});}
console.log(JSON.stringify(trials));const ctrl=trials.pop();
ok(trials.length===4&&trials.every(t=>t.laneOk&&t.col==='ffd020'),'lane drawn exactly along locked dash vector, yellow when locked');
ok(trials.every(t=>t.dev<0.15&&t.dirChange<1e-6),'brute path stays on locked lane (max lateral dev '+Math.max(...trials.map(t=>t.dev))+'m), no re-aim after lock');
ok(trials.every(t=>!t.hit&&t.dmg===0),'sidestep during locked phase -> charge misses (4/4)');
ok(trials.every(t=>t.along>4),'brute actually dashed along lane (dist '+trials.map(t=>t.along)+')');
// control: standing still gets hit
ok(ctrl&&ctrl.hit&&ctrl.dmg>0,'control: standing still on lane -> charge hits ('+(ctrl&&ctrl.dmg)+' dmg)');
// ---------- back to town; inventory tooltips ----------
await G(()=>{__game.P.hp=__game.S.maxhp;__game.enterTown(true);const g=__game;g.P.inv=[];for(const r of [0,1,1,2,3,4])g.placeInv(g.makeItem(20,0,r));g.P.gold=1000;g.ui();});await W(500);
await key('Tab');ok(await G(()=>!document.querySelector('#inv').classList.contains('hidden')),'Tab opens inventory');
const it0=await box('#grid .it');await p.mouse.move(it0.x+it0.width/2,it0.y+it0.height/2,{steps:4});await W(250);ok(await tipVis(),'hover shows tooltip');
const tb=await box('#tip');ok(!over(tb,await box('#sellall'))&&!over(tb,await box('#sellbag'))&&!over(tb,await box('#inv')),'tooltip placed outside panel, not over buttons');
await p.mouse.move(it0.x+it0.width/2,it0.y-120,{steps:3});await W(150);ok(!await tipVis(),'mouseleave hides tooltip immediately');
await p.mouse.move(5,5,{steps:3});await W(200);ok(!await tipVis(),'tooltip not stuck after moving away');
if(SHOT){await p.mouse.move(it0.x+it0.width/2,it0.y+it0.height/2,{steps:3});await W(300);await p.screenshot({path:SHOT+'/screenshot-inventory.png'});}
await mclick('#grid .it');ok(await G(()=>!!document.querySelector('#ctx')),'click opens action menu');ok(await tipVis(),'details pinned while menu open');
await p.mouse.move(640,700,{steps:3});await W(200);ok(await tipVis(),'pinned tooltip stays when mouse leaves item');
ok(!over(await box('#tip'),await box('#ctx')),'pinned tooltip does not cover action menu');
await mclick('#ctx .opt[data-o="cancel"]');ok(await G(()=>!document.querySelector('#ctx')&&(document.querySelector('#tip').classList.contains('hidden')||(document.activeTip&&document.activeTip.matches(':hover')))),'closing menu (mouse Cancel) clears pinned tooltip');
await p.mouse.move(5,400,{steps:2});await mclick('#grid .it');await key('Escape');ok(await G(()=>!document.querySelector('#ctx'))&&!await tipVis(),'closing menu (Esc) clears pinned tooltip');
await key('ArrowRight');ok(await tipVis(),'keyboard selection shows tooltip');await p.mouse.move(700,300,{steps:2});
// ---------- formatting ----------
await key('c');const ch=await G(()=>document.querySelector('#char').innerText);ok(!/\d\.\d{3,}/.test(ch)&&/Crit chance\s*\d+\.\d%/.test(ch)&&/Life steal\s*\d+\.\d%/.test(ch),'char sheet: clean rounding, 1-decimal %');
const fmt=await G(()=>{const g=__game;let bad=[];for(let n=0;n<200;n++){const a=g.makeItem(5+n%30,0,n%5),c=g.makeItem(5+n%30,0,n%5);a.base=c.base;const t=document.createElement('div');t.innerHTML=g.tipHtml?g.tipHtml(a,c):'';if(/\d\.\d{2,}/.test(t.textContent))bad.push(t.textContent);}return bad.slice(0,2);});ok(fmt.length===0,'item tooltips/comparisons: no long decimals '+JSON.stringify(fmt));
await key('c');await key('Tab');
// ---------- rarity colours ----------
const cols=await G(()=>{const o={};document.querySelectorAll('#grid .it').forEach(e=>{const r=e.className.match(/r(\d)/)[1];o[r]=getComputedStyle(e).borderTopColor;});return o;});
ok(cols[0]==='rgb(138, 138, 138)'&&cols[1]==='rgb(79, 140, 255)'&&cols[2]==='rgb(255, 225, 74)'&&cols[3]==='rgb(61, 220, 90)'&&cols[4]==='rgb(255, 106, 0)','rarity border colours '+JSON.stringify(cols));
const nm=await G(()=>{const s=document.createElement('span');s.className='r4';document.body.appendChild(s);const c=getComputedStyle(s).color;s.remove();return c;});ok(nm==='rgb(255, 106, 0)','unique name colour #ff6a00');
const an=await G(()=>getComputedStyle(document.querySelector('#grid .it.r4')).animationName);ok(/upulse/.test(an),'unique border pulses ('+an+')');
// ---------- sell buttons ----------
await G(()=>{__game.ui();});const eq0=await G(()=>JSON.stringify(Object.keys(__game.P.eq).map(k=>__game.P.eq[k]&&__game.P.eq[k].id)));const g0=await G(()=>__game.P.gold);
const bb=await box('#sellbag');await p.mouse.dblclick(bb.x+bb.width/2,bb.y+bb.height/2);await W(300);
const d1=await G(()=>({n:document.querySelectorAll('#dlg').length,t:document.querySelector('#dlg')&&document.querySelector('#dlg').innerText,def:document.querySelector('#dlg button.on')&&document.querySelector('#dlg button.on').textContent}));
ok(d1.n===1,'double-click Sell Entire -> exactly one dialog');ok(/all 6/.test(d1.t)&&/1 Rare/.test(d1.t)&&/1 Set/.test(d1.t)&&/1 Unique/.test(d1.t)&&/gold/.test(d1.t),'confirm lists count, gold and Rare/Set/Unique warning');ok(d1.def==='Cancel','Cancel is default');
if(SHOT)await p.screenshot({path:SHOT+'/screenshot-sell-entire.png'});
await key('Enter');ok(await G(()=>!document.querySelector('#dlg')&&__game.P.inv.length===6),'Enter on default Cancel keeps items');
await mclick('#sellbag');await mclick('#dlg button[data-d="0"]');ok(await G(()=>!document.querySelector('#dlg')&&__game.P.inv.length===6),'mouse Cancel keeps items');
const tot=await G(()=>__game.P.inv.reduce((a,i)=>a+i.value,0));await mclick('#sellbag');await mclick('#dlg button[data-d="1"]');
ok(await G(([g0,tot,eq0])=>__game.P.inv.length===0&&__game.P.gold===g0+tot&&JSON.stringify(Object.keys(__game.P.eq).map(k=>__game.P.eq[k]&&__game.P.eq[k].id))===eq0,[g0,tot,eq0]),'mouse Confirm sells whole backpack (+'+tot+'g), equipped untouched');
await G(()=>{const g=__game;for(const r of [0,1,2,4])g.placeInv(g.makeItem(10,0,r));g.ui();});await mclick('#sellall');await mclick('#dlg button[data-d="1"]');ok(await G(()=>__game.P.inv.length===2&&__game.P.inv.every(i=>i.r>=2)),'Sell Normal & Magic still keeps Rare/Unique');
await mclick('#sellbag');await mclick('#sellbag');ok(await G(()=>document.querySelectorAll('#dlg').length<=1),'repeated clicks never stack dialogs');await G(()=>document.querySelector('#dlg')&&document.querySelector('#dlg button[data-d="1"]').click());
await key('Tab');
// ---------- shops: no stray tooltip ----------
await G(()=>__game.openShop('trader'));await W(300);ok(!await tipVis(),'merchant: no stray floating tooltip');await G(()=>__game.openShop('smith'));await W(300);ok(!await tipVis()&&await G(()=>!!document.querySelector('.sdet table')),'blacksmith: detail shown, no stray tooltip');await key('Escape');
// ---------- death ----------
const kept=await G(()=>{const g=__game,P=g.P;P.gold=1000;P.xp=37;g.enterDungeon(2);return JSON.stringify({lvl:P.lvl,xp:P.xp,eq:Object.keys(P.eq).sort(),inv:P.inv.map(i=>i.id),sk:P.skills,str:P.str,deep:P.deepest});});await W(500);
await G(()=>{__game.P.grace=0;__game.hurt(1e7);});await W(1500);
const dd=await G(()=>({vis:!document.querySelector('#death').classList.contains('hidden'),txt:document.querySelector('#death').innerText,g:__game.P.gold,save:JSON.parse(localStorage.getItem('ashen_save_v1')).state}));
ok(dd.vis&&/You Have Fallen/i.test(dd.txt)&&/Respawn in Town/i.test(dd.txt),'death screen shown');ok(dd.g===900&&/100 gold/.test(dd.txt),'10% gold deducted (1000 -> 900)');ok(dd.save.gold===900&&dd.save.dead===true&&dd.save.loc==='town','penalty saved immediately (save gold 900, dead flag, loc town)');
if(SHOT)await p.screenshot({path:SHOT+'/screenshot-death.png'});
// reload exploit
await p.reload();await p.waitForFunction(()=>!document.querySelector('#start').disabled,null,{timeout:120000});await key('Enter');await W(1500);
const rl=await G(()=>({t:__game.inTown(),g:__game.P.gold,dead:__game.P.dead}));ok(rl.t&&rl.g===900&&!rl.dead,'reload after death: in town, gold 900 (not avoided, not doubled)');
const k2=await G(()=>{const P=__game.P;return JSON.stringify({lvl:P.lvl,xp:P.xp,eq:Object.keys(P.eq).sort(),inv:P.inv.map(i=>i.id),sk:P.skills,str:P.str,deep:P.deepest});});ok(k2===kept,'level/XP/items/skills/attributes/deepest preserved');
// mouse respawn
await G(()=>{__game.enterDungeon(2);});await W(400);await G(()=>{__game.P.grace=0;__game.hurt(1e7);});await W(1500);await mclick('#respawn');await W(800);
ok(await G(()=>__game.inTown()&&!__game.P.dead&&__game.P.gold===810&&__game.P.hp===__game.S.maxhp),'Respawn button (mouse): town, full life, gold 810');
// keyboard respawn
await G(()=>{__game.enterDungeon(2);});await W(400);await G(()=>{__game.P.grace=0;__game.hurt(1e7);});await W(1500);await key('Enter');await W(800);
ok(await G(()=>__game.inTown()&&!__game.P.dead&&__game.P.gold===729),'Respawn via Enter: town, gold 729');
const fl=await G(()=>{__game.enterDungeon(2);return __game.enemies().filter(e=>e.hp>0).length;});ok(fl>5,'floor encounters reset on return ('+fl+' enemies)');
ok(errs.length===0,'console/page errors: '+JSON.stringify(errs));await b.close();console.log(fails?fails+' FAILED':'ALL PASS');process.exit(fails?1:0);})();
