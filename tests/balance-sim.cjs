// Balance sim: weak/average/strong gear across floors 1-10. Uses the game's own item/stat code.
const {chromium}=require('playwright-core');(async()=>{const b=await chromium.launch({executablePath:'/usr/bin/google-chrome',args:['--use-gl=swiftshader','--enable-unsafe-swiftshader']});const p=await b.newPage();
await p.goto(process.argv[2]||'http://127.0.0.1:8792/');await p.waitForFunction(()=>!document.querySelector('#start').disabled,null,{timeout:120000});await p.keyboard.press('Enter');await p.waitForTimeout(1500);
const OV=JSON.parse(process.argv[3]||'{}');const r=await p.evaluate((OV)=>{const g=__game;Object.assign(g.BAL,OV);const P=g.P,S=g.S;const LV={1:1,2:3,3:5,4:7,5:9,6:10,7:11,8:13,9:15,10:17};
const SL=['amulet','head','ring1','weapon','chest','gloves','ring2','belt','boots'];
const mk=(il,r,slot)=>{const want=slot.startsWith('ring')?'ring':slot;for(let t=0;t<500;t++){const it=g.makeItem(il,0,r);if(it.base.s===want)return it;}return null;};
const tiers={weak:{r:[0,0,0,1,0,0,0,0,0],up:0,ilo:-4},average:{r:[1,1,1,1,1,1,1,1,1],up:0,ilo:-2},strong:{r:[2,2,2,2,2,1,2,2,2],up:2,ilo:0}};
const out={};for(const tn in tiers){out[tn]=[];const T=tiers[tn];for(let d=1;d<=10;d++){const L=LV[d];let acc={hit:0,dps:0,lo:0,hi:0,crit:0,aps:0,ar:0,hp:0,ll:0,mit:0};const N=24;
  for(let n=0;n<N;n++){P.lvl=L;P.str=15+Math.round((L-1)*5*0.2);P.dex=25+Math.round((L-1)*5*0.5);P.vit=15+Math.round((L-1)*5*0.3);P.ene=12;
   const sp=L;P.skills={shuriken:Math.min(20,1+Math.ceil(sp*0.5)),step:1,fifth:1,clone:1,smoke:0,venom:0,evasion:L>=6?Math.floor(sp*0.15):0,flurry:0,mastery:L>=6?Math.floor(sp*0.25):0,storm:0,fury:0,umbral:0,legion:0};
   P.eq={};const il=Math.max(1,d*2+L+T.ilo);SL.forEach((s,i)=>{let it=mk(il,T.r[i],s);if(it&&T.up&&(s==='weapon'||s==='chest')){for(let u=0;u<T.up;u++)it=g.upgraded(it);}if(it)P.eq[s]=it;});
   g.depthSet(d);g.recalc();const e=g.expHit?g.expHit():null;const mult=g.BAL?1+g.BAL.shurRank*P.skills.shuriken:(1+0.15*P.skills.shuriken);const base=(S.dmin+S.dmax)/2*(1+S.edEff/100)*(1+S.critEff*0.0075)*mult;const hit=e??base;
   acc.hit+=hit;acc.dps+=hit*S.aps;acc.lo+=S.dmin*(1+(S.edEff??S.ed)/100);acc.hi+=S.dmax*(1+(S.edEff??S.ed)/100);acc.crit+=S.critEff??S.crit;acc.aps+=S.aps;acc.ar+=S.armor;acc.hp+=S.maxhp;acc.ll+=S.ll;acc.mit+=g.mitig();}
  for(const k in acc)acc[k]/=N;const cfg=g.floorCfg(d);const hpm=cfg.hp,dm=cfg.dmg;const row={floor:d,lvl:L,dmg:`${Math.round(acc.lo)}-${Math.round(acc.hi)}`,aps:+acc.aps.toFixed(2),crit:+acc.crit.toFixed(1),def:Math.round(acc.ar),life:Math.round(acc.hp),ll:+acc.ll.toFixed(1)};
  const hk=(t,ch)=>{const i=g.ETYPES.indexOf(t);const bh=g.BAL?g.BAL.hpBase[i]:t.hp;const cm=g.BAL?g.BAL.champHp[t.kind]:3.2;return +(bh*hpm*(ch?cm:1)/acc.hit).toFixed(1);};const [G,A,B]=g.ETYPES;row.ghoul=hk(G);row.archer=hk(A);row.brute=hk(B);row.champGhoul=hk(G,1);row.champBrute=hk(B,1);
  // time-to-die: standing in melee of 3 ghouls + 1 brute, no dodging/potions, life steal applied with cap
  const edps=((G.dmg[0]+G.dmg[1])/2/G.rate*3+(B.dmg[0]+B.dmg[1])/2/B.rate)*dm*(1-acc.mit)*(1-(P.skills.evasion*4)/100);const heal=g.llHealRate?g.llHealRate(acc.dps,acc.ll,acc.hp):acc.dps*acc.ll/100;
  row.packDps=Math.round(edps);row.llHeal=Math.round(heal);row.ttd=edps>heal?+(acc.hp/(edps-heal)).toFixed(1):'∞';out[tn].push(row);}}
return out;},OV);for(const k in r){console.log('== '+k);console.table(r[k]);}await b.close();})();
