// Stage 6 regression: town, NPCs, shops, travel, save v2. Real mouse clicks + key presses
// (player is teleported next to NPCs/portal; no manual play).
const {chromium}=require('playwright-core');const URL=process.argv[2]||'http://127.0.0.1:8792/';const SHOT=process.argv[3];
let fails=0;const ok=(c,m)=>{console.log((c?'PASS ':'FAIL ')+m);if(!c)fails++;};
(async()=>{const b=await chromium.launch({executablePath:'/usr/bin/google-chrome',args:['--use-gl=swiftshader','--enable-unsafe-swiftshader']});
const p=await b.newPage({viewport:{width:1280,height:720}});const errs=[];p.on('pageerror',e=>errs.push(e.message));p.on('console',m=>m.type()==='error'&&errs.push(m.text()));
const G=(f,a)=>p.evaluate(f,a);const W=ms=>p.waitForTimeout(ms);const key=async k=>{await p.keyboard.press(k);await W(250);};
const click=async sel=>{const el=await p.waitForSelector(sel,{state:'visible',timeout:5000});const bb=await el.boundingBox();await p.mouse.move(bb.x+bb.width/2,bb.y+bb.height/2,{steps:3});await p.mouse.click(bb.x+bb.width/2,bb.y+bb.height/2);await W(300);};
const mbtn=async t=>click(`#modal button:text-is("${t}")`);
await p.goto(URL);await p.waitForFunction(()=>!document.querySelector('#start').disabled,null,{timeout:120000});await G(()=>localStorage.clear());await p.reload();await p.waitForFunction(()=>!document.querySelector('#start').disabled,null,{timeout:120000});
await key('Enter');await W(1500);
ok(await G(()=>__game.inTown()&&__game.npcs().length===3),'new character starts in town with 3 NPCs');
// J/K/L disabled in town
const mp0=await G(()=>__game.P.mp);await key('k');await key('l');await key('j');
ok(await G(()=>__game.enemies().length===0&&!__game.P.clones.length),'no enemies / no casts in town');
if(SHOT){await G(()=>{__game.P.pos.set(56,0,58);});await W(1200);await p.screenshot({path:SHOT+'/screenshot-town.png'});}
const near=async id=>{await G(id=>{const n=__game.TOWN.npcs.find(n=>n.id===id);__game.P.pos.set(n.x+1.6,0,n.z+1.2);},id);await W(600);};
// ---- blacksmith ----
await near('smith');ok(await G(()=>!document.querySelector('#prompt').classList.contains('hidden')&&/E/.test(document.querySelector('#prompt').textContent)),'"E to talk" prompt near smith');
await key('e');ok(await G(()=>__game.shopOpen()==='smith'),'E opens blacksmith');
ok(await G(()=>/Kunai|Weapon|Dmg|Damage/.test(document.querySelector('.sdet').textContent)&&document.querySelector('.sdet table')),'smith detail pane auto-selects weapon');
await G(()=>{__game.P.gold=10;__game.ui();});await key('Enter');
ok(await G(()=>/Not enough gold/.test(document.querySelector('#toast').textContent)&&!__game.P.eq.weapon.up),'upgrade blocked when unaffordable');
await G(()=>{__game.P.gold=100000;__game.ui();});
for(let r=1;r<=3;r++){await click('#sact');await mbtn('Upgrade');}
const w=await G(()=>({n:__game.P.eq.weapon.name,up:__game.P.eq.weapon.up,d:__game.P.eq.weapon.dmg,o:__game.P.eq.weapon.orig.dmg}));
ok(w.up===3&&/\+3$/.test(w.n)&&w.d[1]>w.o[1],'3 upgrades via mouse: '+w.n+' '+w.o+' -> '+w.d);
await click('#sact');ok(await G(()=>/maximum/.test(document.querySelector('#toast').textContent)&&__game.P.eq.weapon.up===3),'max rank blocks 4th upgrade');
// unique + set preserved
const us=await G(()=>{const g=__game;let u=g.makeItem(10,0,4);while(!u.fx)u=g.makeItem(10,0,4);u.base=g.BASES.find(b=>b.s==='weapon')?u.base:u.base;g.P.eq.amulet=null;let s=g.makeItem(10,0,3);const slot=u.base.s==='ring'?'ring1':u.base.s;while((s.base.s==='ring'?'ring2':s.base.s)===slot)s=g.makeItem(10,0,3);g.P.eq[slot]=u;const s2=s.base.s==='ring'?'ring2':s.base.s;if(s2!==slot)g.P.eq[s2]=s;g.recalc();const a=g.doUpgrade(slot),c=s2!==slot?g.doUpgrade(s2):'ok';return {a,c,ufx:g.P.eq[slot].fx,ur:g.P.eq[slot].r,un:g.P.eq[slot].name,sset:g.P.eq[s2].set,sr:g.P.eq[s2].r,uorig:u.fx};});
ok(us.a==='ok'&&us.ufx&&us.ufx===us.uorig&&us.ur===4&&us.sset&&us.sr===3,'unique fx/rarity and set membership preserved: '+JSON.stringify(us));
await key('Escape');ok(await G(()=>!__game.shopOpen()),'Esc closes shop');
// ---- trader ----
await near('trader');await key('e');ok(await G(()=>__game.shopOpen()==='trader'),'E opens trader');
const st=await G(()=>__game.merchStock().map(i=>({r:i.r,p:i.price,v:i.value,il:i.il})));
ok(st.length>=8&&st.length<=10&&st.every(i=>i.r<=2)&&st.every(i=>Math.abs(i.p/i.v-4.5)<0.1),`stock ${st.length} items, rarities ${st.map(i=>i.r)}, price=4.5x value`);
if(SHOT){await click('.srow[data-r="1"]');await W(300);await p.screenshot({path:SHOT+'/screenshot-merchant.png'});}
await G(()=>{__game.P.gold=0;__game.ui();__game.openShop('trader');});await click('.srow[data-r="0"]');await click('#sact');
ok(await G(()=>/Not enough/.test(document.querySelector('#toast').textContent)&&__game.merchStock().length===9),'buy blocked when unaffordable');
await G(()=>{__game.P.gold=3000;__game.ui();__game.openShop('trader');});const inv0=await G(()=>__game.P.inv.length);
await click('.srow[data-r="0"]');await click('#sact');if(await G(()=>!document.querySelector('#modal').classList.contains('hidden')))await mbtn('Buy');
const after=await G(()=>({inv:__game.P.inv.length,st:__game.merchStock().length,g:__game.P.gold}));ok(after.inv===inv0+1&&after.st===8&&after.g<3000,'buy via mouse: item in bag, stock 8, gold '+after.g);
// sell tab via keyboard
await key('ArrowRight');ok(await G(()=>__game.shopState.col===1),'Right arrow -> Sell tab');
const g1=await G(()=>__game.P.gold),sv=await G(()=>__game.P.inv[0].value),rr=await G(()=>__game.P.inv[0].r);await key('Enter');if(rr>=2){await key('ArrowLeft');await key('Enter');}
ok(await G(g1=>__game.P.gold===g1,g1+sv)&&await G(()=>__game.P.inv.length)===inv0,'sell via Enter returns sell value '+sv);
// full bag
const sp=await G(()=>{const g=__game;for(let t=0;t<400;t++)g.placeInv(g.makeItem(1,0,0));g.openShop('trader');g.shopState.col=0;return g.buyItem(0);});ok(sp==='space','buy with full bag -> no room');
await G(()=>{__game.P.inv=[];});await key('Escape');
// ---- alchemist ----
await G(()=>{__game.P.belt=[null,null,null,'mp'];__game.P.gold=1000;__game.ui();});await near('alch');await key('e');ok(await G(()=>__game.shopOpen()==='alch'),'E opens potion merchant');
await click('.qty button[data-q="1"]');await click('.qty button[data-q="1"]');await click('.qty button[data-q="1"]');await click('.qty button[data-q="1"]');
ok(await G(()=>document.querySelector('.qty b').textContent==='3'),'quantity selector caps at free belt slots (3)');
const pp=await G(()=>__game.potPrice('hp'));await click('#sact');if(await G(()=>!document.querySelector('#modal').classList.contains('hidden')))await mbtn('Buy');
ok(await G(pp=>JSON.stringify(__game.P.belt)==='["hp","hp","hp","mp"]'&&__game.P.gold===1000-3*pp,pp),'bought 3 hp potions, gold deducted 3x'+pp);
await click('#sact');ok(await G(()=>/Belt is full/.test(document.querySelector('#toast').textContent)),'belt full blocks purchase');
await G(()=>{__game.P.belt[0]=null;__game.P.gold=5;__game.ui();__game.openShop('alch');});await key('Enter');ok(await G(()=>/Not enough/.test(document.querySelector('#toast').textContent)&&__game.P.belt[0]===null),'potion unaffordable blocked');
await key('Escape');await G(()=>{__game.P.gold=500;__game.P.belt=['hp','hp','mp','mp'];});
// ---- save in town, reload, continue ----
const pre=await G(()=>JSON.stringify(__game.coreState()));await key('Escape');await click('#pmenu .vi:has-text("Save Game"), #pmenu div:has-text("Save Game")').catch(async()=>{});
await G(()=>{if(__game.isPaused()){}});await key('Escape');await G(()=>__game.saveGame());
await p.reload();await p.waitForFunction(()=>!document.querySelector('#start').disabled,null,{timeout:120000});
ok(await G(()=>/Sanctuary/.test(document.querySelector('#tmenu').textContent)),'title Continue shows Sanctuary');
await key('Enter');await W(1500);
const post=await G(()=>({t:__game.inTown(),c:JSON.stringify(__game.coreState())}));const A=JSON.parse(pre),B=JSON.parse(post.c);
ok(post.t&&B.gold===A.gold&&Object.keys(A.eq).every(k=>JSON.stringify(A.eq[k]||null)===JSON.stringify(B.eq[k]||null))&&B.stock.length===A.stock.length&&B.inv.length===A.inv.length,'reload+Continue restores town, gold, +3 weapon, stock '+JSON.stringify([Object.keys(A.eq).filter(k=>JSON.stringify(A.eq[k])!==JSON.stringify(B.eq[k])).map(k=>[JSON.stringify(A.eq[k]),JSON.stringify(B.eq[k])]),post.t,A.gold,B.gold,B.eq.weapon&&B.eq.weapon.up,A.stock.length,B.stock.length,A.inv.length,B.inv.length]));
// ---- travel ----
await G(()=>{__game.P.pos.set(__game.TOWN.portal[0],0,__game.TOWN.portal[1]);});await W(800);
ok(await G(()=>/Floor 1/.test(document.querySelector('#modal').textContent)),'town portal offers Enter Floor 1');
await mbtn('Enter Floor 1');await W(800);ok(await G(()=>!__game.inTown()&&__game.depth()===1&&__game.enemies().length>0),'entered floor 1 dungeon');
const ch=await G(()=>{const g=__game,c=g.chests()[0];if(!c)return null;g.openChest(c);return {n:g.chests().length,gold:g.P.gold};});
await G(()=>{__game.enemies().forEach(e=>{e.awake=false;e.g.position.set(1e3,0,1e3)})});
await key('Escape');await click('#pmenu >> text=Return to Town');await W(800);ok(await G(()=>__game.inTown()),'pause -> Return to Town');
const stock2=await G(()=>__game.merchStock().map(i=>i.name).join());ok(stock2!==B.stock.map(i=>i.name).join(),'merchant stock refreshed on return');
await G(()=>{__game.P.pos.set(__game.TOWN.portal[0],0,__game.TOWN.portal[1]);});await W(800);await mbtn('Enter Floor 1');await W(800);
if(ch)ok(await G(()=>{const c=__game.chests()[0];return c.opened&&!c.g.visible;}),'same floor re-entered: opened chest stays opened (no re-farm)');
// safety: enemy nearby blocks return
await G(()=>{const e=__game.enemies()[0];e.awake=true;e.hp=50;e.g.position.copy(__game.P.pos).add(new __game.V(3,0,0));});await key('Escape');await click('#pmenu >> text=Return to Town');
ok(await G(()=>!__game.inTown()&&/enemies nearby/.test(document.querySelector('#toast').textContent)),'Return to Town blocked with enemy near');await key('Escape');
// dungeon portal: descend then return
await G(()=>{__game.enemies().forEach(e=>{e.awake=false;e.g.position.set(1e3,0,1e3)});__game.P.pos.copy(__game.stairs().position);});await W(800);
await mbtn('Descend to Floor 2');await W(800);ok(await G(()=>__game.depth()===2&&__game.P.deepest===2),'descended to floor 2, deepest 2');
const sv2=await G(()=>JSON.parse(localStorage.getItem('ashen_save_v1')));ok(sv2.state.depth===2&&sv2.state.loc==='dungeon','autosaved on transition');
await G(()=>{__game.enemies().forEach(e=>{e.awake=false;e.g.position.set(1e3,0,1e3)});__game.P.pos.copy(__game.stairs().position);});await W(800);await mbtn('Return to Town');await W(800);
await G(()=>{__game.P.pos.set(__game.TOWN.portal[0],0,__game.TOWN.portal[1]);});await W(800);
ok(await G(()=>/Floor 2/.test(document.querySelector('#modal').textContent)&&/Floor 1/.test(document.querySelector('#modal').textContent)),'town portal offers deepest (2) and floor 1');await mbtn('Cancel');
// death -> town
await G(()=>{__game.P.pos.set(60,0,60);});await W(500);await G(()=>{__game.P.pos.set(__game.TOWN.portal[0],0,__game.TOWN.portal[1]);});await W(800);await mbtn('Enter Floor 2');await W(800);
await G(()=>{__game.P.grace=0;__game.hurt(1e6);});await W(2500);await G(()=>document.querySelector('#death button')?.click());await key('Enter');await W(1200);
ok(await G(()=>__game.inTown()&&!__game.P.dead),'death respawns in town');
// dupes: save, count items, reload, continue
const ids=await G(()=>{__game.saveGame();const s=__game.coreState();const all=[...s.inv,...Object.values(s.eq).filter(Boolean)].map(i=>i.id);return {n:all.length,u:new Set(all).size};});ok(ids.n===ids.u,'no duplicate item ids ('+ids.n+')');
// v1 migration
await G(()=>{const s=JSON.parse(localStorage.getItem('ashen_save_v1'));const st=s.state;delete st.loc;delete st.deepest;delete st.floorState;delete st.stock;st.depth=3;s.v=1;s.summary={floor:3,level:st.lvl,gold:st.gold};localStorage.setItem('ashen_save_v1',JSON.stringify(s));});
await p.reload();await p.waitForFunction(()=>!document.querySelector('#start').disabled,null,{timeout:120000});await key('Enter');await W(1500);
const mg=await G(()=>({t:__game.inTown(),d:__game.depth(),dp:__game.P.deepest,v:JSON.parse(localStorage.getItem('ashen_save_v1')).v}));ok(!mg.t&&mg.d===3&&mg.dp===3&&mg.v===2,'v1 save migrated -> floor 3, deepest 3, re-saved as v2');
const fe=errs.filter(e=>!/blob:/.test(e)||true);ok(errs.length===0,'console/page errors: '+JSON.stringify(errs));
await b.close();console.log(fails?`${fails} FAILED`:'ALL PASS');process.exit(fails?1:0);})();
