"use strict";
let ED=blankLevel('UNNAMED'), edCurId=null;
let edCamX=-2*B, edVT=0, edZoom=18, edInit=false;
let edMode='build', edCat=0, edPage=0, edItem='b0';
let edSel=[], edLayer=-1, activeStart=0;
let edTrail=[], edDeath=null;
let undoS=[], redoS=[], ptr=null, edHover=null, spaceHeld=false, pv=null, valClip=null;
const EDO=(function(){
  const o={swipe:false, rotate:false, free:true, snap:true};
  try{ Object.assign(o, JSON.parse(localStorage.getItem('jd_edopts')||'{}')); }catch(e){}
  return o;
})();
function saveEdo(){ try{ localStorage.setItem('jd_edopts', JSON.stringify(EDO)); }catch(e){} }
let clip=(function(){ try{ return JSON.parse(localStorage.getItem('jd_clip')||'null'); }catch(e){ return null; } })();

// ---------- palette ----------
const BLOCK_NAMES=['CLASSIC','BRICK','TECH','LINES','PLATE','GRID','HATCH','STUDS'];
const DECO_NAMES=['DECO SPIKE','CHAIN','PULSE RING','CRYSTALS','ARROW','OUTLINE','CIRCLE','STAR','PIPE','DOTS','WAVE LINE','DIAMOND',
  'CLOUD','BOLT','HEART','PLUS','TRIANGLE','HEXAGON','GEAR','PILLAR','CHEVRONS','SQUARE','DOME','GRASS','LIGHT BEAM','SPARKLE','GLOW','TORCH'];
function mk(k, base){ return function(gx,gy){ const o=Object.assign({}, base); o.gx=gx+(base.gx||0); o.gy=gy+(base.gy||0); o._k=k; return o; }; }
const CATS=[
  {name:'BLOCKS', items:[]},
  {name:'SOLID', items:[]},
  {name:'SLOPES', items:[]},
  {name:'SPIKES', items:[]},
  {name:'SAWS', items:[]},
  {name:'ORBS & PADS', items:[]},
  {name:'PORTALS', items:[]},
  {name:'SPEED', items:[]},
  {name:'DECO', items:[]},
  {name:'DECO 2', items:[]},
  {name:'TRIGGERS', items:[]},
  {name:'SPECIAL', items:[]}
];
function addItem(ci, id, name, k, base){ CATS[ci].items.push({id:id, name:name, k:k, make:mk(k,base)}); }
BLOCK_NAMES.forEach(function(n,t){ addItem(0,'b'+t,n+' BLOCK','blocks',{w:1,h:1,t:t}); });
addItem(0,'bslab','HALF SLAB (bottom)','blocks',{w:1,h:0.5,t:0});
addItem(0,'bslabt','HALF SLAB (top)','blocks',{gy:0.5,w:1,h:0.5,t:0});
addItem(0,'bsmall','SMALL BLOCK','blocks',{gx:0.25,w:0.5,h:0.5,t:0});
addItem(0,'bthin','THIN PILLAR','blocks',{gx:0.375,w:0.25,h:1,t:0});
addItem(0,'bwide','2x2 BLOCK','blocks',{w:2,h:2,t:0});
addItem(1,'sol','SOLID COLOR BLOCK (color channel 1 by default)','blocks',{w:1,h:1,t:8});
addItem(1,'solslab','SOLID HALF SLAB','blocks',{w:1,h:0.5,t:8});
addItem(1,'solslabt','SOLID HALF SLAB (top)','blocks',{gy:0.5,w:1,h:0.5,t:8});
addItem(1,'solsmall','SOLID SMALL','blocks',{gx:0.25,w:0.5,h:0.5,t:8});
addItem(1,'glass','GLASS BLOCK (solid, see-through)','blocks',{w:1,h:1,t:9});
addItem(1,'glassslab','GLASS HALF SLAB','blocks',{w:1,h:0.5,t:9});
['FLOOR RAMP /','FLOOR RAMP \\ (tall side kills)','CEILING RAMP','CEILING RAMP (tall side kills)'].forEach(function(n,o){
  addItem(2,'sl'+o,n,'slopes',{o:o});
});
['BIG FLOOR RAMP /','BIG FLOOR RAMP \\','BIG CEILING RAMP','BIG CEILING RAMP 2'].forEach(function(n,o){
  addItem(2,'slb'+o,n,'slopes',{gx:0.5,gy:0.5,o:o,sc:2});
});
addItem(3,'spike','SPIKE','spikes',{r:0,sz:0});
addItem(3,'shalf','HALF SPIKE','spikes',{r:0,sz:1});
addItem(3,'smini','MINI SPIKE','spikes',{r:0,sz:2});
addItem(3,'stiny','TINY SPIKE','spikes',{r:0,sz:3});
addItem(3,'spiked','CEILING SPIKE','spikes',{r:1,sz:0});
addItem(3,'spiker','SIDE SPIKE (right)','spikes',{r:2,sz:0});
addItem(3,'spikel','SIDE SPIKE (left)','spikes',{r:3,sz:0});
addItem(3,'shalfd','CEILING HALF SPIKE','spikes',{r:1,sz:1});
[['saw',0,[0,1,2]],['gear',1,[0,1,2]],['shur',2,[0,1]]].forEach(function(g){
  g[2].forEach(function(sz){
    addItem(4,g[0]+sz,['SAWBLADE','GEAR SAW','SHURIKEN'][g[1]]+' '+['BIG','MEDIUM','SMALL'][sz],'saws',{k:g[1],sz:sz});
  });
});
addItem(5,'orby','YELLOW ORB - tap for a full jump','orbs',{k:'y'});
addItem(5,'orbp','PINK ORB - small jump','orbs',{k:'p'});
addItem(5,'orbr','RED ORB - huge jump','orbs',{k:'r'});
addItem(5,'orbb','BLUE ORB - flips gravity','orbs',{k:'b'});
addItem(5,'orbk','BLACK ORB - slams you down','orbs',{k:'k'});
addItem(5,'orbd','DASH ORB - hold to dash in its arrow direction (rotate it to aim)','orbs',{k:'d'});
addItem(5,'pady','YELLOW PAD','pads',{k:'y'});
addItem(5,'padp','PINK PAD','pads',{k:'p'});
addItem(5,'padb','BLUE PAD - flips gravity','pads',{k:'b'});
addItem(5,'padyc','YELLOW PAD (ceiling)','pads',{k:'y',r:1});
[['pcube','cube','CUBE PORTAL'],['pship','ship','SHIP PORTAL'],['pball','ball','BALL PORTAL'],['pufo','ufo','UFO PORTAL'],
 ['pwave','wave','WAVE PORTAL'],['pgdown','gdown','GRAVITY DOWN'],['pgup','gup','GRAVITY UP'],
 ['pmini','mini','MINI PORTAL - shrinks you + your hitbox'],['pbig','big','NORMAL SIZE PORTAL']].forEach(function(p){
  addItem(6,p[0],p[2],'portals',{m:p[1]});
});
['0.5x','1x','2x','3x','4x'].forEach(function(n,t){ addItem(7,'s'+t,n+' SPEED','speeds',{t:t}); });
for(let k=0;k<=11;k++) addItem(8,'d'+k,DECO_NAMES[k],'decos',{k:k,z:3});
for(let k=12;k<=DECO_MAX;k++) addItem(9,'d'+k,DECO_NAMES[k],'decos',{k:k,z:3});
addItem(9,'dtext','TEXT - edit it with EDIT SPECIAL','decos',{k:DECO_TEXT,tx:'TEXT',z:6});
addItem(10,'tmove','MOVE TRIGGER - slides a group','triggers',{type:'move',g:1,dx:4,dy:0,dur:0.5,ease:1});
addItem(10,'tcolor','COLOR TRIGGER - fades a color channel','triggers',{type:'color',ch:CH_BG,col:[200,40,120],dur:0.6});
addItem(10,'talpha','ALPHA TRIGGER - fades a group in/out','triggers',{type:'alpha',g:1,a:0,dur:0.5});
addItem(11,'start','START POSITION - playtest spawns here ([ and ] switch)','starts',{});
const ITEM_BY_ID={};
CATS.forEach(function(c){ c.items.forEach(function(it){ ITEM_BY_ID[it.id]=it; }); });

// ---------- geometry ----------
const DRAWFN={spikes:drawSpike, blocks:drawBlock, portals:drawPortal, speeds:drawSpeed, orbs:drawOrb,
              pads:drawPad, decos:drawDecoObj, slopes:drawSlope, saws:drawSaw};
function drawOne(o){
  if(o._k==='triggers') drawTrigger(o);
  else if(o._k==='starts') drawStart(o,true,0);
  else drawWrapped(o, DRAWFN[o._k], false);
}
function totalRot(o){ return (o.rot||0) + (o._k==='portals' ? (o.r||0)*90 : 0); }
function objBox(o){
  const pv=pivotOf(o), sc=(o._k==='triggers'||o._k==='starts')?1:(o.sc||1);
  let hw=0.5, hh=0.5;
  switch(o._k){
    case 'blocks': hw=o.w/2; hh=o.h/2; break;
    case 'portals': hw=0.55; hh=1.6; break;
    case 'speeds': hw=0.5; hh=0.8; break;
    case 'saws': hw=hh=SAW_R[o.sz||0]; break;
    case 'decos': if(o.k===DECO_TEXT){ hw=Math.max(0.5,(o.tx||'').length*0.2); } break;
  }
  if(o._k==='decos' && o.k===DECO_TEXT) return {cx:pv[0]-0.5+hw*sc, cy:pv[1], hw:hw*sc, hh:hh*sc, rot:o.rot||0};
  return {cx:pv[0], cy:pv[1], hw:hw*sc, hh:hh*sc, rot:(o._k==='triggers'||o._k==='starts')?0:totalRot(o)};
}
function boxAABB(b){
  const r=b.rot*Math.PI/180, c=Math.abs(Math.cos(r)), s=Math.abs(Math.sin(r));
  const ex=c*b.hw+s*b.hh, ey=s*b.hw+c*b.hh;
  return {x0:b.cx-ex, x1:b.cx+ex, y0:b.cy-ey, y1:b.cy+ey};
}
function hitsPoint(o, fx, fy){
  const b=objBox(o), r=b.rot*Math.PI/180, dx=fx-b.cx, dy=fy-b.cy;
  const lx=dx*Math.cos(r)-dy*Math.sin(r), ly=dx*Math.sin(r)+dy*Math.cos(r);
  return Math.abs(lx)<=Math.max(b.hw,0.3) && Math.abs(ly)<=Math.max(b.hh,0.3);
}
const RANK={slopes:1,speeds:2,portals:3,blocks:4,spikes:5,saws:6,pads:7,orbs:8,triggers:9,starts:11};
function rankOf(o){ if(o._k==='decos') return (o.z!=null?o.z:2)>=5?10:0; return RANK[o._k]||0; }
function eachObj(fn){ KINDS.forEach(function(k){ (ED[k]||[]).forEach(function(o){ fn(o); }); }); }
function layerOk(o){ return edLayer<0 || (o.el|0)===edLayer; }
function hitsAt(fx,fy){
  const out=[];
  eachObj(function(o){ if(layerOk(o) && hitsPoint(o,fx,fy)) out.push(o); });
  out.sort(function(a,b){
    const d=rankOf(b)-rankOf(a); if(d) return d;
    const ba=objBox(a), bb=objBox(b); return ba.hw*ba.hh - bb.hw*bb.hh;
  });
  return out;
}
function selCenter(list){
  if(list.length===1){ const b=objBox(list[0]); return [b.cx,b.cy]; }
  let x0=1e9,x1=-1e9,y0=1e9,y1=-1e9;
  list.forEach(function(o){ const a=boxAABB(objBox(o)); x0=Math.min(x0,a.x0); x1=Math.max(x1,a.x1); y0=Math.min(y0,a.y0); y1=Math.max(y1,a.y1); });
  let cx=(x0+x1)/2, cy=(y0+y1)/2;
  if(EDO.snap){ cx=Math.floor(cx)+0.5; cy=Math.floor(cy)+0.5; }
  return [cx,cy];
}
function rnd4(v){ return Math.round(v*10000)/10000; }
function setCenter(o, cx, cy){
  const p=pivotOf(o);
  o.gx=rnd4(o.gx+cx-p[0]); o.gy=rnd4(o.gy+cy-p[1]);
}
function normRot(r){ r=((r%360)+540)%360-180; if(Math.abs(r)<1e-6) r=0; return rnd4(r===-180?180:r); }
const SLOPE_CW={0:1,1:3,3:2,2:0};

// ---------- selection edits ----------
function rotateObjs(list, deg, pv){
  const r=deg*Math.PI/180, c=Math.cos(r), s=Math.sin(r);
  const quarter=Math.abs(deg%90)<1e-6;
  list.forEach(function(o){
    const p=pivotOf(o), dx=p[0]-pv[0], dy=p[1]-pv[1];
    setCenter(o, pv[0]+dx*c+dy*s, pv[1]-dx*s+dy*c);
    if(o._k==='triggers' || o._k==='starts') return;
    if(o._k==='slopes'){
      if(!quarter) return;
      let n=((Math.round(deg/90)%4)+4)%4, v=o.o||0;
      while(n--) v=SLOPE_CW[v];
      o.o=v; return;
    }
    o.rot=normRot((o.rot||0)+deg);
    if(!o.rot) delete o.rot;
  });
}
function flipObjs(list, axisX, pv){
  list.forEach(function(o){
    const p=pivotOf(o);
    if(axisX) setCenter(o, 2*pv[0]-p[0], p[1]); else setCenter(o, p[0], 2*pv[1]-p[1]);
    if(o._k==='triggers' || o._k==='starts') return;
    if(o.rot){ o.rot=normRot(-o.rot); if(!o.rot) delete o.rot; }
    if(o._k==='spikes'){ o.r = axisX ? ({0:0,1:1,2:3,3:2})[o.r||0] : ({0:1,1:0,2:2,3:3})[o.r||0]; }
    else if(o._k==='slopes'){ o.o = axisX ? ({0:1,1:0,2:3,3:2})[o.o||0] : ({0:2,2:0,1:3,3:1})[o.o||0]; }
    else if(o._k==='pads' && !axisX){ o.r=(o.r|0)?0:1; }
    else if(axisX){ if(o.fx) delete o.fx; else o.fx=1; }
    else { if(o.fy) delete o.fy; else o.fy=1; }
  });
}
function scaleObjs(list, f, pv){
  list.forEach(function(o){
    if(o._k==='triggers' || o._k==='starts') return;
    const nsc=Math.max(0.1, Math.min(8, Math.round((o.sc||1)*f*100)/100));
    const real=nsc/(o.sc||1);
    if(list.length>1){ const p=pivotOf(o); setCenter(o, pv[0]+(p[0]-pv[0])*real, pv[1]+(p[1]-pv[1])*real); }
    if(nsc===1) delete o.sc; else o.sc=nsc;
  });
}
function needSel(){ if(!edSel.length){ edToast('Select something first (EDIT mode, tap an object)'); return false; } return true; }
function edAct(fn){ if(!needSel()) return; pushUndo(); fn(); saveDraft(); }
function moveSel(dx,dy){ edAct(function(){ edSel.forEach(function(o){ o.gx=rnd4(o.gx+dx); o.gy=rnd4(o.gy+dy); }); }); }
function rotSel(deg){ edAct(function(){ rotateObjs(edSel, deg, selCenter(edSel)); }); }
function flipSel(ax){ edAct(function(){ flipObjs(edSel, ax, selCenter(edSel)); }); }
function scaleSel(f){ edAct(function(){ scaleObjs(edSel, f, selCenter(edSel)); }); }
function deleteSel(){
  if(!edSel.length) return;
  pushUndo();
  const set=new Set(edSel);
  KINDS.forEach(function(k){ ED[k]=ED[k].filter(function(o){ return !set.has(o); }); });
  fixStart();
  const n=edSel.length; edSel=[]; saveDraft(); edToast('Deleted '+n);
}
function fixStart(){ if(activeStart>=ED.starts.length) activeStart=Math.max(0,ED.starts.length-1); }

// ---------- undo / clipboard ----------
function pushUndo(){
  undoS.push(JSON.stringify(packLevel(ED)));
  if(undoS.length>200) undoS.shift();
  redoS=[];
}
function loadSnap(s){ ED=unpackLevel(JSON.parse(s)); edSel=[]; fixStart(); }
function undo(){
  if(!undoS.length){ edToast('Nothing to undo'); return; }
  redoS.push(JSON.stringify(packLevel(ED))); loadSnap(undoS.pop()); saveDraft(true);
}
function redo(){
  if(!redoS.length){ edToast('Nothing to redo'); return; }
  undoS.push(JSON.stringify(packLevel(ED))); loadSnap(redoS.pop()); saveDraft(true);
}
function copySel(){
  if(!needSel()) return;
  clip=edSel.map(function(o){ return {k:o._k, d:packObj(o)}; });
  try{ localStorage.setItem('jd_clip', JSON.stringify(clip)); }catch(e){}
  edToast('Copied '+clip.length+' object'+(clip.length===1?'':'s'));
}
function clipObjs(){ return (clip||[]).map(function(c){ return normObj(c.k, c.d); }).filter(Boolean); }
function pasteAt(cell){
  const objs=clipObjs();
  if(!objs.length){ edToast('Nothing copied yet'); return; }
  let x0=1e9,y0=1e9,x1=-1e9;
  objs.forEach(function(o){ const a=boxAABB(objBox(o)); x0=Math.min(x0,a.x0); y0=Math.min(y0,a.y0); x1=Math.max(x1,a.x1); });
  let dx=0, dy=0;
  if(cell){ dx=cell.gx-Math.floor(x0+1e-6); dy=cell.gy-Math.floor(y0+1e-6); }
  else if(x1*B<edCamX || x0*B>edCamX+W){ dx=Math.floor((edCamX+W*0.35)/B)-Math.floor(x0); }
  pushUndo();
  objs.forEach(function(o){ o.gx=rnd4(o.gx+dx); o.gy=rnd4(o.gy+dy); ED[o._k].push(o); });
  edSel=objs; saveDraft();
  edToast('Pasted '+objs.length);
}
function duplicateSel(){
  if(!needSel()) return;
  const saved=clip; copySel(); pasteAt(null); clip=saved||clip;
  try{ localStorage.setItem('jd_clip', JSON.stringify(clip)); }catch(e){}
  edToast('Duplicated - drag or use the move buttons');
}
function copyValues(){
  if(!needSel()) return;
  const o=edSel[0];
  valClip={rot:o.rot||0, sc:o.sc||1, c:o.c||0, g:o._k==='triggers'?0:(o.g||0), el:o.el||0, z:o.z, fx:o.fx||0, fy:o.fy||0};
  edToast('Copied rotation, scale, color, group and layer');
}
function pasteState(){
  if(!valClip){ edToast('Use COPY VALUES first'); return; }
  edAct(function(){ edSel.forEach(function(o){
    if(o._k!=='triggers' && o._k!=='starts'){
      if(o._k!=='slopes'){ if(valClip.rot) o.rot=valClip.rot; else delete o.rot; }
      if(valClip.sc!==1) o.sc=valClip.sc; else delete o.sc;
      if(valClip.g) o.g=valClip.g; else delete o.g;
      if(valClip.fx) o.fx=1; else delete o.fx;
      if(valClip.fy) o.fy=1; else delete o.fy;
    }
    if(valClip.c) o.c=valClip.c; else delete o.c;
    if(valClip.el) o.el=valClip.el; else delete o.el;
    if(o._k==='decos' && valClip.z!=null) o.z=valClip.z;
  }); });
}
function pasteColor(){
  if(!valClip){ edToast('Use COPY VALUES first'); return; }
  edAct(function(){ edSel.forEach(function(o){ if(valClip.c) o.c=valClip.c; else delete o.c; }); });
}

// ---------- placing / deleting ----------
function sameObj(a,b){ return JSON.stringify(packObj(a))===JSON.stringify(packObj(b)); }
function placeAt(gx,gy){
  const it=ITEM_BY_ID[edItem]; if(!it) return;
  if(gy<-4 || gy>500) return;
  const raw=it.make(gx,gy);
  if(edLayer>0) raw.el=edLayer;
  const o=normObj(it.k, raw); if(!o) return;
  if(ED[it.k].some(function(x){ return sameObj(x,o); })) return;
  ED[it.k].push(o);
  if(it.k==='starts'){ activeStart=ED.starts.length-1; edToast('Start '+ED.starts.length+' is now active for playtests'); }
  else if(it.k==='triggers' && !EDO.swipe) edToast('Trigger placed - EDIT SPECIAL sets it up');
  edSel=[o];
}
function eraseTop(fx,fy){
  const h=hitsAt(fx,fy); if(!h.length) return false;
  const o=h[0];
  ED[o._k]=ED[o._k].filter(function(x){ return x!==o; });
  edSel=edSel.filter(function(x){ return x!==o; });
  fixStart();
  return true;
}
function saveDraft(keepSel){
  ED.name=(ED.name||'UNNAMED').toUpperCase().slice(0,20);
  const ls=getMyLevels();
  for(let i=0;i<ls.length;i++){
    if(ls[i].id===edCurId){ ls[i].name=ED.name; ls[i].d=packLevel(ED); break; }
  }
  setMyLevels(ls);
  if(!keepSel) edSel=edSel.filter(function(o){ return ED[o._k] && ED[o._k].indexOf(o)>=0; });
  refreshEdUI();
}

// ---------- DOM ----------
let edBuilt=false;
const IC={
  undo:'<svg viewBox="0 0 24 24"><path d="M9 7 L4 12 L9 17 M4 12 H15 a5 5 0 0 1 0 10 H12" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  redo:'<svg viewBox="0 0 24 24"><path d="M15 7 L20 12 L15 17 M20 12 H9 a5 5 0 0 0 0 10 H12" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  trash:'<svg viewBox="0 0 24 24"><path d="M5 7 H19 M9 7 V4 H15 V7 M7 7 L8 21 H16 L17 7 M10.5 10 V18 M13.5 10 V18" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  gear:'<svg viewBox="0 0 24 24"><path d="M12 2 l1.6 2.6 3-.8 .8 3 2.6 1.6 -1.3 2.8 1.3 2.8 -2.6 1.6 -.8 3 -3-.8 L12 22 l-1.6-2.6 -3 .8 -.8-3 L4 15.6 5.3 12.8 4 10 l2.6-1.6 .8-3 3 .8 z" fill="#fff" stroke="#123" stroke-width="1.2"/><circle cx="12" cy="12" r="3.6" fill="#3bb04a" stroke="#123" stroke-width="1.2"/></svg>',
  pause:'<svg viewBox="0 0 24 24"><rect x="6" y="4" width="4.5" height="16" rx="1.2" fill="#fff"/><rect x="13.5" y="4" width="4.5" height="16" rx="1.2" fill="#fff"/></svg>',
  music:'<svg viewBox="0 0 24 24"><path d="M9 18 V5 L19 3 V16" fill="none" stroke="#fff" stroke-width="2.4" stroke-linejoin="round"/><circle cx="6.5" cy="18" r="2.8" fill="#fff"/><circle cx="16.5" cy="16" r="2.8" fill="#fff"/></svg>',
  stop:'<svg viewBox="0 0 24 24"><rect x="6" y="6" width="12" height="12" rx="2" fill="#fff"/></svg>',
  play:'<svg viewBox="0 0 24 24"><path d="M7 4 V20 L20 12 Z" fill="#fff" stroke="#123" stroke-width="1.2" stroke-linejoin="round"/></svg>',
  zin:'<svg viewBox="0 0 24 24"><circle cx="10" cy="10" r="6.5" fill="none" stroke="#fff" stroke-width="2.6"/><path d="M15 15 L21 21 M7 10 H13 M10 7 V13" stroke="#fff" stroke-width="2.6" stroke-linecap="round"/></svg>',
  zout:'<svg viewBox="0 0 24 24"><circle cx="10" cy="10" r="6.5" fill="none" stroke="#fff" stroke-width="2.6"/><path d="M15 15 L21 21 M7 10 H13" stroke="#fff" stroke-width="2.6" stroke-linecap="round"/></svg>',
  color:'<svg viewBox="0 0 24 24"><circle cx="9" cy="9" r="5.5" fill="#e33" stroke="#111"/><circle cx="15" cy="9" r="5.5" fill="#2c3" stroke="#111" fill-opacity=".85"/><circle cx="12" cy="15" r="5.5" fill="#36f" stroke="#111" fill-opacity=".85"/></svg>'
};
const PANEL=[
  ['COPY','purple',copySel],
  ['PASTE','cyan',function(){ pasteAt(null); }],
  ['COPY + PASTE','tan',duplicateSel],
  ['EDIT SPECIAL','teal',function(){ openObjModal(true); }],
  ['EDIT GROUP','rose',openGroupModal],
  ['EDIT OBJECT','blue',function(){ openObjModal(false); }],
  ['COPY VALUES','violet',copyValues],
  ['PASTE STATE','green',pasteState],
  ['PASTE COLOR','sky',pasteColor],
  ['@color','dark',openColorModal],
  ['GO TO LAYER','slate',function(){ if(!needSel()) return; edLayer=edSel[0].el|0; refreshEdUI(); }],
  ['DE- SELECT','lime',function(){ edSel=[]; refreshEdUI(); }]
];
const EDIT_ACTS=[
  ['↑','1',function(){ moveSel(0,1); }], ['↓','1',function(){ moveSel(0,-1); }],
  ['←','1',function(){ moveSel(-1,0); }], ['→','1',function(){ moveSel(1,0); }],
  ['↑','½',function(){ moveSel(0,0.5); }], ['↓','½',function(){ moveSel(0,-0.5); }],
  ['←','½',function(){ moveSel(-0.5,0); }], ['→','½',function(){ moveSel(0.5,0); }],
  ['↑','0.1',function(){ moveSel(0,0.1); }], ['↓','0.1',function(){ moveSel(0,-0.1); }],
  ['←','0.1',function(){ moveSel(-0.1,0); }], ['→','0.1',function(){ moveSel(0.1,0); }],
  ['↑','5',function(){ moveSel(0,5); }], ['↓','5',function(){ moveSel(0,-5); }],
  ['←','5',function(){ moveSel(-5,0); }], ['→','5',function(){ moveSel(5,0); }],
  ['↻','90°',function(){ rotSel(90); }], ['↺','90°',function(){ rotSel(-90); }],
  ['↻','45°',function(){ rotSel(45); }], ['↺','45°',function(){ rotSel(-45); }],
  ['↻','15°',function(){ rotSel(15); }], ['↺','15°',function(){ rotSel(-15); }],
  ['⇆','FLIP X',function(){ flipSel(true); }], ['⇅','FLIP Y',function(){ flipSel(false); }],
  ['+','SCALE',function(){ scaleSel(1.25); }], ['−','SCALE',function(){ scaleSel(0.8); }],
  ['+','SCALE .1',function(){ scaleSel(1.1); }], ['−','SCALE .1',function(){ scaleSel(1/1.1); }],
  ['1x','RESET',function(){ edAct(function(){ edSel.forEach(function(o){ delete o.sc; }); }); }],
  ['0°','NO ROT',function(){ edAct(function(){ edSel.forEach(function(o){ delete o.rot; }); }); }],
  ['°','TYPE ROT',function(){ if(!needSel()) return; const v=window.prompt('Rotate the selection by how many degrees? (clockwise, can be negative)','30'); if(v!==null && isFinite(+v)) rotSel(+v); }],
  ['×','TYPE SCALE',function(){ if(!needSel()) return; const v=window.prompt('Set scale for the selection (0.1 - 8)', ''+(edSel[0].sc||1)); if(v!==null && +v>0) edAct(function(){ scaleObjs(edSel, 1, selCenter(edSel)); edSel.forEach(function(o){ if(o._k!=='triggers'&&o._k!=='starts'){ const s=Math.max(0.1,Math.min(8,+v)); if(s===1) delete o.sc; else o.sc=s; } }); }); }],
  ['❐','DUPE →',function(){ if(!needSel()) return; let x0=1e9,x1=-1e9; edSel.forEach(function(o){ const a=boxAABB(objBox(o)); x0=Math.min(x0,a.x0); x1=Math.max(x1,a.x1); }); const w=Math.max(1,Math.round(x1-x0)); duplicateSel(); moveSel(w,0); }],
  ['▣','ALL LAYER',function(){ edSel=[]; eachObj(function(o){ if(layerOk(o)) edSel.push(o); }); refreshEdUI(); edToast('Selected '+edSel.length); }],
  ['✕','DELETE',deleteSel]
];
function buildEditorDOM(){
  if(edBuilt) return; edBuilt=true;
  editorEl.innerHTML=
    '<div class="edtl"><button class="cbtn" id="eUndo" title="Undo (Ctrl+Z)">'+IC.undo+'</button>'
    +'<button class="cbtn" id="eRedo" title="Redo (Ctrl+Y)">'+IC.redo+'</button>'
    +'<button class="cbtn gray" id="eTrash" title="Delete selected (Del)">'+IC.trash+'</button></div>'
    +'<div class="edtm"><input type="range" id="eScroll" min="-120" max="3000" step="1" title="Scroll the level"></div>'
    +'<div class="edtr"><button class="cbtn" id="eGear" title="Level settings: song, background, colors, start">'+IC.gear+'</button>'
    +'<button class="cbtn" id="ePause" title="Menu (Esc)">'+IC.pause+'</button></div>'
    +'<div class="edlft"><button class="cbtn" id="eMusic" title="Music preview - plays the song with a line that follows speed portals">'+IC.music+'</button>'
    +'<button class="cbtn" id="ePlay" title="Playtest (Enter) - stop any time, dying drops you back here">'+IC.play+'</button>'
    +'<button class="cbtn sm" id="eZin" title="Zoom in">'+IC.zin+'</button>'
    +'<button class="cbtn sm" id="eZout" title="Zoom out">'+IC.zout+'</button></div>'
    +'<div class="edrt"><div class="edpanel" id="ePanel"></div>'
    +'<div class="edlayer"><button class="larr" id="eLprev">&#9664;</button><span id="eLnum">ALL</span><button class="larr" id="eLnext">&#9654;</button></div></div>'
    +'<div id="edinfo"></div>'
    +'<div class="edbot">'
      +'<div class="edmodes"><button class="mode" data-m="build">BUILD</button><button class="mode" data-m="edit">EDIT</button><button class="mode" data-m="delete">DELETE</button></div>'
      +'<div class="edmid"><div class="edtabs" id="eTabs"></div>'
        +'<div class="edpal"><button class="parr" id="ePrev">&#9664;</button><div class="edcells" id="eCells"></div><button class="parr" id="eNext">&#9654;</button></div>'
        +'<div class="eddots" id="eDots"></div></div>'
      +'<div class="edtog"><button class="tog" data-t="swipe">SWIPE</button><button class="tog" data-t="rotate">ROTATE</button>'
        +'<button class="tog" data-t="free">FREE MOVE</button><button class="tog" data-t="snap">SNAP</button></div>'
    +'</div>'
    +'<div id="edmodal" class="hidden"><div class="edmbox" id="edmbox"></div></div>';
  const panel=$('ePanel');
  PANEL.forEach(function(p){
    const b=document.createElement('button');
    b.className='pbtn '+p[1];
    b.innerHTML=p[0]==='@color'?IC.color:p[0].replace(' ','<br>');
    b.addEventListener('click', function(e){ e.stopPropagation(); p[2](); });
    panel.appendChild(b);
  });
  function on(id, fn){ $(id).addEventListener('click', function(e){ e.stopPropagation(); fn(e); }); }
  on('eUndo', undo); on('eRedo', redo); on('eTrash', deleteSel);
  on('eGear', openSettings); on('ePause', openEdMenu);
  on('eMusic', function(){ if(pv) stopPreview(); else startPreview(); });
  on('ePlay', startEdTest);
  on('eZin', function(){ zoomBy(1/1.25); }); on('eZout', function(){ zoomBy(1.25); });
  on('eLprev', function(){ edLayer=Math.max(-1,edLayer-1); refreshEdUI(); });
  on('eLnext', function(){ edLayer=Math.min(99,edLayer+1); refreshEdUI(); });
  on('ePrev', function(){ edPage--; buildPalette(); });
  on('eNext', function(){ edPage++; buildPalette(); });
  editorEl.querySelectorAll('.mode').forEach(function(b){
    b.addEventListener('click', function(e){ e.stopPropagation(); setEdMode(b.dataset.m); });
  });
  editorEl.querySelectorAll('.tog').forEach(function(b){
    b.addEventListener('click', function(e){ e.stopPropagation(); EDO[b.dataset.t]=!EDO[b.dataset.t]; saveEdo(); refreshEdUI(); });
  });
  const sc=$('eScroll');
  sc.addEventListener('input', function(){ edCamX=(+sc.value)*B/10; stopPreview(); });
  sc.addEventListener('pointerdown', function(e){ e.stopPropagation(); });
  $('edmodal').addEventListener('pointerdown', function(e){ if(e.target.id==='edmodal') closeModal(); });
  window.addEventListener('resize', function(){ if(state==='edit') buildPalette(); });
}
function setEdMode(m){ edMode=m; edPage=0; buildPalette(); refreshEdUI(); }
function buildTabs(){
  const tabs=$('eTabs'); tabs.innerHTML='';
  if(edMode!=='build'){ tabs.classList.add('hidden'); return; }
  tabs.classList.remove('hidden');
  CATS.forEach(function(c,i){
    const b=document.createElement('button');
    b.className='etab'+(i===edCat?' on':'');
    b.title=c.name;
    const img=document.createElement('img'); img.src=iconFor(c.items[Math.min(c.items.length-1, i===4?0:(i===9?12:0))]); img.alt='';
    b.appendChild(img);
    b.addEventListener('click', function(e){ e.stopPropagation(); edCat=i; edPage=0; buildPalette(); });
    tabs.appendChild(b);
  });
}
const iconCache={};
function iconFor(it){
  if(iconCache[it.id]) return iconCache[it.id];
  const size=64;
  const o=normObj(it.k, it.make(0,0));
  const b=boxAABB(objBox(o));
  const ext=Math.max(b.x1-b.x0, b.y1-b.y0, 1);
  const k=Math.min(size*0.78/(ext*B), 1.1);
  const svLayer=edLayer, svCam=camX, svOff=groupOff;
  edLayer=-1; camX=0; groupOff={};
  loadChannels(ED.cc);
  if(it.k==='blocks' && o.t===8) chCur[1]=[120,190,255];
  ctx.save();
  ctx.setTransform(1,0,0,1,0,0); ctx.clearRect(0,0,size,size);
  const cxw=(b.x0+b.x1)/2*B, cyw=groundY-(b.y0+b.y1)/2*B;
  ctx.setTransform(k,0,0,k, size/2-k*cxw, size/2-k*cyw);
  const svW=W; if(W<size*4) W=size*40;
  drawOne(o);
  W=svW;
  ctx.restore();
  const c=document.createElement('canvas'); c.width=size; c.height=size;
  c.getContext('2d').drawImage(cv,0,0,size,size,0,0,size,size);
  ctx.save(); ctx.setTransform(1,0,0,1,0,0); ctx.clearRect(0,0,size,size); ctx.restore();
  edLayer=svLayer; camX=svCam; groupOff=svOff;
  iconCache[it.id]=c.toDataURL();
  return iconCache[it.id];
}
function buildPalette(){
  if(!edBuilt) return;
  buildTabs();
  const cells=$('eCells'), dots=$('eDots');
  cells.innerHTML=''; dots.innerHTML='';
  const cw=cells.clientWidth||600;
  const cols=Math.max(3, Math.floor((cw+6)/58));
  const per=cols*3;
  let list;
  if(edMode==='build') list=CATS[edCat].items;
  else if(edMode==='edit') list=EDIT_ACTS;
  else list=null;
  if(!list){
    cells.innerHTML='<div class="delhint">Tap objects to delete them.<br>Turn on SWIPE to erase by dragging.<br>Layer arrows limit it to one layer.</div>'
      +'<button class="pbtn red wide" id="eDelSel">DELETE SELECTED</button>';
    $('eDelSel').addEventListener('click', function(e){ e.stopPropagation(); deleteSel(); });
    return;
  }
  const pages=Math.max(1, Math.ceil(list.length/per));
  edPage=((edPage%pages)+pages)%pages;
  cells.style.gridTemplateColumns='repeat('+cols+', 52px)';
  list.slice(edPage*per, edPage*per+per).forEach(function(it){
    const b=document.createElement('button');
    if(edMode==='build'){
      b.className='pcell'+(it.id===edItem?' on':'');
      b.title=it.name;
      const img=document.createElement('img'); img.src=iconFor(it); img.alt='';
      b.appendChild(img);
      b.addEventListener('click', function(e){ e.stopPropagation(); edItem=it.id; buildPalette(); edHint(it.name); });
    } else {
      b.className='pcell act';
      b.innerHTML='<b>'+it[0]+'</b><small>'+it[1]+'</small>';
      b.addEventListener('click', function(e){ e.stopPropagation(); it[2](); });
    }
    cells.appendChild(b);
  });
  for(let i=0;i<pages;i++){
    const d=document.createElement('span'); d.className='dot'+(i===edPage?' on':'');
    dots.appendChild(d);
  }
  $('ePrev').style.visibility=$('eNext').style.visibility=(pages>1?'visible':'hidden');
}
function refreshEdUI(){
  if(!edBuilt || state!=='edit') return;
  editorEl.querySelectorAll('.mode').forEach(function(b){ b.classList.toggle('on', b.dataset.m===edMode); });
  editorEl.querySelectorAll('.tog').forEach(function(b){ b.classList.toggle('on', !!EDO[b.dataset.t]); });
  $('eLnum').textContent=edLayer<0?'ALL':(''+edLayer);
  $('eMusic').innerHTML=pv?IC.stop:IC.music;
  $('eMusic').classList.toggle('active', !!pv);
  $('eUndo').classList.toggle('dim', !undoS.length);
  $('eRedo').classList.toggle('dim', !redoS.length);
  $('eTrash').classList.toggle('dim', !edSel.length);
  const sc=$('eScroll'); sc.max=''+Math.max(300,(maxGx(ED)+40)*10);
  edHint();
}
let hintMsg='', hintT=0;
function edHint(msg){
  if(msg){ hintMsg=msg; hintT=performance.now(); }
  const el=$('edinfo'); if(!el) return;
  let base = edSel.length ? (edSel.length+' selected') : '';
  if(edMode==='build' && !edSel.length) base=(ITEM_BY_ID[edItem]||{}).name||'';
  const fresh=hintMsg && performance.now()-hintT<3500;
  el.textContent=fresh?hintMsg:base;
}
function edToast(m){ edHint(m); }
function zoomBy(f, sx, sy){
  if(sx==null){ sx=SW/2; sy=SH/2; }
  setView(edZoom, edVT);
  const wx=edCamX+sx/Z, wy=edVT+sy/Z;
  edZoom=Math.max(4, Math.min(60, edZoom*f));
  setView(edZoom, 0);
  edCamX=wx-sx/Z; edVT=wy-sy/Z;
  clampCam();
}
function clampCam(){
  edCamX=Math.max(-20*B, edCamX);
  edVT=Math.max(groundY-520*B, Math.min(groundY+4*B, edVT));
}

// ---------- enter / leave ----------
function enterEditor(id){
  const ls=getMyLevels();
  let entry=null;
  for(let i=0;i<ls.length;i++) if(ls[i].id===id){ entry=ls[i]; break; }
  if(!entry){ showMyLevels(); return; }
  if(edCurId!==id || !edInit){ edCamX=-3*B; edInit=true; undoS=[]; redoS=[]; edTrail=[]; edDeath=null; edLayer=-1; }
  edCurId=id;
  ED=unpackLevel(entry.d);
  edSel=[]; activeStart=0;
  buildEditorDOM();
  resumeEditor();
  resetEdCamY();
}
function resetEdCamY(){
  setView(edZoom, 0);
  const panelPx=Math.min(250, Math.max(160, SH*0.28));
  edVT=groundY-(SH-panelPx-1.3*B*Z)/Z;
  clampCam();
}
function resumeEditor(){
  state='edit'; paused=false; practice=false;
  hideAllScreens();
  editorEl.classList.remove('hidden');
  musicStop(); pv=null;
  groupOff={}; groupAlpha={};
  loadChannels(ED.cc);
  P.dead=false; particles.length=0; shake=0;
  curL=MENU_L;
  buildPalette(); refreshEdUI();
}
function exitEditor(){
  stopPreview(); closeModal(); saveDraft(); showMyLevels();
}

// ---------- playtest / preview ----------
function startEdTest(){
  stopPreview(); closeModal(); saveDraft();
  if(objCount(ED)<1){ edToast('Place something first'); return; }
  const st=ED.starts;
  spawnStart = st.length ? st[activeStart % st.length] : null;
  edTrail=[]; edDeath=null;
  initAudio();
  startPlay(prepLevel(ED),'edtest');
}
function endEdTest(died){
  edDeath = died ? {x:deathX, y:deathY} : null;
  const px=P.x;
  resumeEditor();
  if(px < edCamX+W*0.1 || px > edCamX+W*0.85) edCamX=px-W*0.45;
  if(died) edToast('You died here - the green line is your path');
}
function startPreview(){
  initAudio(); closeModal();
  setSong(ED.song); songOffset=+ED.mo||0;
  setView(edZoom, edVT);
  const x0=Math.max(0, edCamX+W*0.12);
  const t0=timeAtX(ED, x0);
  musicSeek(t0);
  pv={t0:t0};
  refreshEdUI();
}
function stopPreview(){
  if(!pv) return;
  pv=null; musicStop(); refreshEdUI();
}
function previewT(){
  if(isFileTrack(TR)){
    if(songAudio && !songAudio.paused && songAudio.readyState>=2) return songAudio.currentTime/1 - songOffset;
    return pv.t0;
  }
  return musicNow();
}

// ---------- pointer ----------
function toGrid(sx,sy){
  const wx=edCamX+sx/Z, wy=edVT+sy/Z;
  return {fx:wx/B, fy:(groundY-wy)/B, wx:wx, wy:wy};
}
cv.addEventListener('contextmenu', function(e){ if(state==='edit') e.preventDefault(); });
cv.addEventListener('pointerdown', function(e){
  if(state!=='edit' || modalOpen()) return;
  e.preventDefault();
  setView(edZoom, edVT);
  if(pv) stopPreview();
  const g=toGrid(e.clientX, e.clientY);
  const cell={gx:Math.floor(g.fx), gy:Math.floor(g.fy)};
  ptr={sx:e.clientX, sy:e.clientY, lx:e.clientX, ly:e.clientY, moved:false, act:null, g0:g, cell:cell, last:cell.gx+'_'+cell.gy, undone:false};
  try{ cv.setPointerCapture(e.pointerId); }catch(err){}
  if(e.button===1 || e.button===2 || spaceHeld){ ptr.act='pan'; return; }
  if(edMode==='build'){
    if(EDO.swipe){ pushUndo(); ptr.undone=true; ptr.act='paint'; placeAt(cell.gx, cell.gy); refreshEdUI(); }
    else ptr.act='tapplace';
  } else if(edMode==='edit'){
    const hits=hitsAt(g.fx, g.fy);
    ptr.hits=hits;
    if(EDO.rotate && edSel.length){
      ptr.act='rot'; ptr.pv=selCenter(edSel);
      ptr.a0=Math.atan2(g.wy-(groundY-ptr.pv[1]*B), g.wx-ptr.pv[0]*B);
      ptr.orig=edSel.map(function(o){ return JSON.stringify(o); });
    } else if(hits.some(function(o){ return edSel.indexOf(o)>=0; }) && EDO.free){
      ptr.act='drag'; ptr.orig=edSel.map(function(o){ return [o.gx,o.gy]; });
    } else if(EDO.swipe || e.shiftKey){
      ptr.act='box'; ptr.add=e.shiftKey;
    } else ptr.act='tapsel';
    ptr.shift=e.shiftKey;
  } else {
    if(EDO.swipe){ pushUndo(); ptr.undone=true; ptr.act='erase'; eraseTop(g.fx,g.fy); }
    else ptr.act='tapdel';
  }
});
cv.addEventListener('pointermove', function(e){
  if(state!=='edit') return;
  setView(edZoom, edVT);
  const g=toGrid(e.clientX, e.clientY);
  edHover=g;
  if(!ptr) return;
  if(Math.hypot(e.clientX-ptr.sx, e.clientY-ptr.sy)>7) ptr.moved=true;
  if(ptr.moved){
    if(ptr.act==='tapplace' || ptr.act==='tapdel') ptr.act='pan';
    else if(ptr.act==='tapsel'){
      if(ptr.hits.length && EDO.free){ edSel=[ptr.hits[0]]; ptr.act='drag'; ptr.orig=[[edSel[0].gx,edSel[0].gy]]; }
      else ptr.act='pan';
    }
  }
  switch(ptr.act){
    case 'pan':
      edCamX-=(e.clientX-ptr.lx)/Z; edVT-=(e.clientY-ptr.ly)/Z; clampCam(); break;
    case 'paint': {
      const cell={gx:Math.floor(g.fx), gy:Math.floor(g.fy)}, key=cell.gx+'_'+cell.gy;
      if(key!==ptr.last){ ptr.last=key; placeAt(cell.gx, cell.gy); }
      break;
    }
    case 'erase': eraseTop(g.fx,g.fy); break;
    case 'drag': {
      let dx=g.fx-ptr.g0.fx, dy=g.fy-ptr.g0.fy;
      if(EDO.snap){ dx=Math.round(dx); dy=Math.round(dy); }
      else { dx=Math.round(dx*20)/20; dy=Math.round(dy*20)/20; }
      if(!ptr.undone && (dx||dy)){ pushUndo(); ptr.undone=true; }
      edSel.forEach(function(o,i){ o.gx=rnd4(ptr.orig[i][0]+dx); o.gy=rnd4(ptr.orig[i][1]+dy); });
      break;
    }
    case 'rot': {
      const a=Math.atan2(g.wy-(groundY-ptr.pv[1]*B), g.wx-ptr.pv[0]*B);
      let d=(a-ptr.a0)*180/Math.PI;
      d = e.shiftKey ? Math.round(d) : Math.round(d/15)*15;
      if(!ptr.undone && d){ pushUndo(); ptr.undone=true; }
      edSel.forEach(function(o,i){
        const src=JSON.parse(ptr.orig[i]);
        Object.keys(o).forEach(function(k){ if(k!=='_k' && !(k in src)) delete o[k]; });
        Object.assign(o, src);
      });
      if(d) rotateObjs(edSel, d, ptr.pv);
      edHint('Rotate '+d+'°'+(e.shiftKey?'':' (hold Shift for 1° steps)'));
      break;
    }
  }
  ptr.lx=e.clientX; ptr.ly=e.clientY; ptr.gl=g;
});
window.addEventListener('pointerup', function(){
  if(!ptr || state!=='edit'){ ptr=null; return; }
  const p=ptr; ptr=null;
  const g=p.gl||p.g0;
  switch(p.act){
    case 'tapplace':
      pushUndo(); placeAt(p.cell.gx, p.cell.gy); saveDraft(); break;
    case 'tapdel':
      pushUndo(); if(eraseTop(p.g0.fx,p.g0.fy)) saveDraft(); else undoS.pop(); break;
    case 'tapsel': {
      const hits=p.hits;
      if(!hits.length){ if(!p.shift) edSel=[]; refreshEdUI(); break; }
      if(p.shift){
        const i=edSel.indexOf(hits[0]);
        if(i>=0) edSel.splice(i,1); else edSel.push(hits[0]);
      } else if(edSel.length===1 && hits.indexOf(edSel[0])>=0){
        edSel=[hits[(hits.indexOf(edSel[0])+1)%hits.length]];
        if(hits.length>1) edHint('Picked '+(hits.indexOf(edSel[0])+1)+'/'+hits.length+' stacked here - tap again to cycle');
      } else edSel=[hits[0]];
      refreshEdUI();
      break;
    }
    case 'box': {
      const x0=Math.min(p.g0.fx,g.fx), x1=Math.max(p.g0.fx,g.fx), y0=Math.min(p.g0.fy,g.fy), y1=Math.max(p.g0.fy,g.fy);
      const found=[];
      eachObj(function(o){
        if(!layerOk(o)) return;
        const a=boxAABB(objBox(o));
        if(a.x1>x0 && a.x0<x1 && a.y1>y0 && a.y0<y1) found.push(o);
      });
      if(p.add) found.forEach(function(o){ if(edSel.indexOf(o)<0) edSel.push(o); });
      else edSel=found;
      refreshEdUI();
      break;
    }
    case 'paint': case 'erase': case 'drag': case 'rot':
      if(p.undone) saveDraft(); break;
  }
});
window.addEventListener('wheel', function(e){
  if(state!=='edit' || modalOpen()) return;
  setView(edZoom, edVT);
  if(e.ctrlKey){ zoomBy(e.deltaY>0?1.12:1/1.12, e.clientX, e.clientY); return; }
  if(e.shiftKey){ edVT+=(e.deltaY||e.deltaX)/Z; }
  else { edCamX+=((e.deltaY||0)+(e.deltaX||0))/Z; }
  clampCam();
}, {passive:true});
document.addEventListener('wheel', function(e){ if(state==='edit' && e.ctrlKey) e.preventDefault(); }, {passive:false});

// ---------- keyboard ----------
function edKey(e){
  if(modalOpen()){ if(e.code==='Escape'){ e.preventDefault(); closeModal(); } return; }
  if(isTyping(e)) return;
  const ctrl=e.ctrlKey||e.metaKey, k=e.code;
  let handled=true;
  if(ctrl && k==='KeyZ'){ if(e.shiftKey) redo(); else undo(); }
  else if(ctrl && k==='KeyY') redo();
  else if(ctrl && k==='KeyC') copySel();
  else if(ctrl && k==='KeyV') pasteAt(edHover?{gx:Math.floor(edHover.fx), gy:Math.max(0,Math.floor(edHover.fy))}:null);
  else if(ctrl && k==='KeyD') duplicateSel();
  else if(ctrl && k==='KeyA'){ edSel=[]; eachObj(function(o){ if(layerOk(o)) edSel.push(o); }); refreshEdUI(); }
  else if(ctrl && k==='KeyS'){ saveDraft(); edToast('Saved'); }
  else if(k==='Delete' || k==='Backspace') deleteSel();
  else if(k==='Digit1') setEdMode('build');
  else if(k==='Digit2') setEdMode('edit');
  else if(k==='Digit3') setEdMode('delete');
  else if(k==='Enter' || k==='NumpadEnter') startEdTest();
  else if(k==='Space'){ if(!e.repeat){ spaceHeld=true; } }
  else if(k==='Escape'){ if(ptr) ptr=null; else if(edSel.length){ edSel=[]; refreshEdUI(); } else openEdMenu(); }
  else if(k==='BracketLeft' || k==='BracketRight') cycleStart(k==='BracketRight'?1:-1);
  else if(k==='Equal' || k==='NumpadAdd') zoomBy(1/1.25);
  else if(k==='Minus' || k==='NumpadSubtract') zoomBy(1.25);
  else if(k==='KeyQ' || k==='KeyE'){ if(edSel.length) rotSel((k==='KeyE'?1:-1)*(e.shiftKey?45:90)); }
  else if(k==='KeyW'||k==='KeyA'||k==='KeyS'||k==='KeyD'||k==='ArrowUp'||k==='ArrowDown'||k==='ArrowLeft'||k==='ArrowRight'){
    const d=e.shiftKey?0.1:(e.altKey?0.5:1);
    const dx=(k==='KeyA'||k==='ArrowLeft')?-d:(k==='KeyD'||k==='ArrowRight')?d:0;
    const dy=(k==='KeyW'||k==='ArrowUp')?d:(k==='KeyS'||k==='ArrowDown')?-d:0;
    if(edSel.length) moveSel(dx,dy);
    else { setView(edZoom,edVT); edCamX+=dx*B*4; edVT-=dy*B*2; clampCam(); }
  }
  else handled=false;
  if(handled) e.preventDefault();
}
window.addEventListener('keyup', function(e){ if(e.code==='Space') spaceHeld=false; });
function cycleStart(dir){
  const n=ED.starts.length;
  if(!n){ edToast('No start positions yet - SPECIAL tab has them'); return; }
  activeStart=((activeStart+dir)%n+n)%n;
  const s=ED.starts[activeStart];
  setView(edZoom,edVT);
  edCamX=s.gx*B-W*0.4;
  edToast('Start '+(activeStart+1)+' / '+n+' is active for playtests');
}

// ---------- modals ----------
function modalOpen(){ const m=$('edmodal'); return !!m && !m.classList.contains('hidden'); }
let modalClose=null;
function openModal(title, html, onClose){
  closeModal();
  const box=$('edmbox');
  box.innerHTML='<div class="mtitle">'+title+'</div><button class="mclose" id="mClose">&#10005;</button><div class="mbody">'+html+'</div>';
  $('edmodal').classList.remove('hidden');
  $('mClose').addEventListener('click', function(e){ e.stopPropagation(); closeModal(); });
  modalClose=onClose||null;
  return box;
}
function closeModal(){
  const m=$('edmodal'); if(!m || m.classList.contains('hidden')) return;
  m.classList.add('hidden');
  const f=modalClose; modalClose=null;
  if(f) f();
  refreshEdUI();
}
function chOptions(sel, withDefault){
  let s=withDefault?'<option value="0">DEFAULT</option>':'';
  [CH_BG,CH_G,CH_LINE,CH_OBJ].forEach(function(c){ s+='<option value="'+c+'"'+(sel===c?' selected':'')+'>'+CH_NAMES[c]+'</option>'; });
  for(let i=1;i<=99;i++) s+='<option value="'+i+'"'+(sel===i?' selected':'')+'>CHANNEL '+i+'</option>';
  return s;
}
function commonVal(list, f){
  const v=f(list[0]);
  for(let i=1;i<list.length;i++) if(JSON.stringify(f(list[i]))!==JSON.stringify(v)) return undefined;
  return v;
}
function fieldRow(label, input){ return '<label class="frow"><span>'+label+'</span>'+input+'</label>'; }
function numIn(id, v, step, extra){ return '<input type="number" id="'+id+'" step="'+(step||1)+'" value="'+(v===undefined?'':v)+'" placeholder="mixed" '+(extra||'')+'>'; }
function openObjModal(special){
  if(!needSel()) return;
  const S=edSel, kinds={}; S.forEach(function(o){ kinds[o._k]=1; });
  const oneKind=Object.keys(kinds).length===1 ? S[0]._k : null;
  const plain=S.filter(function(o){ return o._k!=='triggers' && o._k!=='starts'; });
  let h='';
  if(!special){
    if(S.length===1){
      h+=fieldRow('X (blocks)', numIn('fX', S[0].gx, 0.1));
      h+=fieldRow('Y (blocks)', numIn('fY', S[0].gy, 0.1));
    }
    if(plain.length){
      h+=fieldRow('ROTATION °', numIn('fRot', commonVal(plain,function(o){return o.rot||0;}), 1));
      h+=fieldRow('SCALE', numIn('fSc', commonVal(plain,function(o){return o.sc||1;}), 0.05, 'min="0.1" max="8"'));
      const cg=commonVal(plain,function(o){return o.g||0;});
      h+=fieldRow('GROUP', numIn('fG', cg, 1, 'min="0"'));
    }
    const cc=commonVal(S,function(o){return o.c||0;});
    h+=fieldRow('COLOR', '<select id="fC">'+(cc===undefined?'<option value="">mixed</option>':'')+chOptions(cc,true)+'</select>');
    h+=fieldRow('EDITOR LAYER', numIn('fEl', commonVal(S,function(o){return o.el||0;}), 1, 'min="0" max="99"'));
    if(oneKind==='decos') h+=fieldRow('Z LAYER (0-4 behind, 5-10 in front)', numIn('fZ', commonVal(S,function(o){return o.z!=null?o.z:2;}), 1, 'min="0" max="10"'));
  }
  const o=S[0];
  if(oneKind==='triggers' && commonVal(S,function(x){return x.type;})){
    const t=o.type;
    if(t==='move'){
      h+=fieldRow('TARGET GROUP', numIn('tG', commonVal(S,function(x){return x.g;}), 1, 'min="0"'));
      h+=fieldRow('MOVE X (blocks)', numIn('tDx', commonVal(S,function(x){return x.dx;}), 0.5));
      h+=fieldRow('MOVE Y (blocks)', numIn('tDy', commonVal(S,function(x){return x.dy;}), 0.5));
      const d=commonVal(S,function(x){return x.dur;});
      h+=fieldRow('TIME (s, -1 = old smooth)', numIn('tDur', d, 0.1, 'min="-1"'));
      const e=commonVal(S,function(x){return x.ease|0;});
      h+=fieldRow('EASING', '<select id="tEase">'+['LINEAR','EASE IN-OUT','EASE OUT','EASE IN'].map(function(n,i){ return '<option value="'+i+'"'+(e===i?' selected':'')+'>'+n+'</option>'; }).join('')+'</select>');
    } else if(t==='color'){
      const ch=commonVal(S,function(x){return x.ch;});
      h+=fieldRow('CHANNEL', '<select id="tCh">'+chOptions(ch,false)+'</select>');
      h+=fieldRow('COLOR', '<input type="color" id="tCol" value="'+arrToHex(o.col)+'">');
      h+=fieldRow('FADE TIME (s)', numIn('tDur', commonVal(S,function(x){return x.dur;}), 0.1, 'min="0"'));
    } else if(t==='alpha'){
      h+=fieldRow('TARGET GROUP', numIn('tG', commonVal(S,function(x){return x.g;}), 1, 'min="0"'));
      h+=fieldRow('OPACITY (0-1)', numIn('tA', commonVal(S,function(x){return x.a;}), 0.05, 'min="0" max="1"'));
      h+=fieldRow('FADE TIME (s)', numIn('tDur', commonVal(S,function(x){return x.dur;}), 0.1, 'min="0"'));
    }
  } else if(oneKind==='decos' && S.every(function(x){ return x.k===DECO_TEXT; })){
    h+=fieldRow('TEXT', '<input type="text" id="tTx" maxlength="60" value="'+escHtml(S.length===1?o.tx:'')+'">');
  } else if(oneKind==='blocks' && S.length===1){
    h+=fieldRow('WIDTH (blocks)', numIn('tW', o.w, 0.5, 'min="0.05"'));
    h+=fieldRow('HEIGHT (blocks)', numIn('tH', o.h, 0.5, 'min="0.05"'));
    h+=fieldRow('STYLE', '<select id="tT">'+BLOCK_NAMES.concat(['SOLID COLOR','GLASS']).map(function(n,i){ return '<option value="'+i+'"'+(o.t===i?' selected':'')+'>'+n+'</option>'; }).join('')+'</select>');
  } else if(oneKind==='orbs'){
    const k=commonVal(S,function(x){return x.k;});
    h+=fieldRow('ORB TYPE', '<select id="tOk">'+[['y','YELLOW'],['p','PINK'],['r','RED'],['b','BLUE'],['k','BLACK'],['d','DASH']].map(function(p){ return '<option value="'+p[0]+'"'+(k===p[0]?' selected':'')+'>'+p[1]+'</option>'; }).join('')+'</select>');
    if(special) h+='<div class="mhint">Dash orbs dash in the direction they point - rotate them up to 70° up or down.</div>';
  } else if(oneKind==='portals'){
    const m=commonVal(S,function(x){return x.m;});
    h+=fieldRow('PORTAL', '<select id="tPm">'+PORTAL_MODES.map(function(p){ return '<option value="'+p+'"'+(m===p?' selected':'')+'>'+p.toUpperCase()+'</option>'; }).join('')+'</select>');
  } else if(special){
    h+='<div class="mhint">Nothing special to edit here. Special settings exist for triggers, text, orbs, portals and blocks.</div>';
  }
  if(!h){ edToast('Nothing to edit'); return; }
  openModal(special?'EDIT SPECIAL':'EDIT OBJECT'+(S.length>1?' ('+S.length+')':''), h);
  let undone=false;
  function mut(fn){ return function(){ if(!undone){ pushUndo(); undone=true; } fn(this); saveDraft(); }; }
  function bind(id, ev, fn){ const el=$(id); if(el) el.addEventListener(ev, mut(fn)); }
  function numv(el){ return el.value===''?null:+el.value; }
  bind('fX','change',function(el){ const v=numv(el); if(v!=null && isFinite(v)) S[0].gx=rnd4(v); });
  bind('fY','change',function(el){ const v=numv(el); if(v!=null && isFinite(v)) S[0].gy=rnd4(v); });
  bind('fRot','change',function(el){ const v=numv(el); if(v==null) return; plain.forEach(function(x){ if(x._k==='slopes') return; const r=normRot(v); if(r) x.rot=r; else delete x.rot; }); });
  bind('fSc','change',function(el){ const v=numv(el); if(v==null||!(v>0)) return; plain.forEach(function(x){ const s=Math.max(0.1,Math.min(8,v)); if(s===1) delete x.sc; else x.sc=s; }); });
  bind('fG','change',function(el){ const v=numv(el); if(v==null) return; plain.forEach(function(x){ const g=Math.max(0,v|0); if(g) x.g=g; else delete x.g; }); });
  bind('fC','change',function(el){ if(el.value==='') return; const c=+el.value; S.forEach(function(x){ if(c) x.c=c; else delete x.c; }); });
  bind('fEl','change',function(el){ const v=numv(el); if(v==null) return; S.forEach(function(x){ const l=Math.max(0,Math.min(99,v|0)); if(l) x.el=l; else delete x.el; }); });
  bind('fZ','change',function(el){ const v=numv(el); if(v==null) return; S.forEach(function(x){ x.z=Math.max(0,Math.min(10,v|0)); }); });
  bind('tG','change',function(el){ const v=numv(el); if(v==null) return; S.forEach(function(x){ x.g=Math.max(0,v|0); }); });
  bind('tDx','change',function(el){ const v=numv(el); if(v==null) return; S.forEach(function(x){ x.dx=v; }); });
  bind('tDy','change',function(el){ const v=numv(el); if(v==null) return; S.forEach(function(x){ x.dy=v; }); });
  bind('tDur','change',function(el){ const v=numv(el); if(v==null) return; S.forEach(function(x){ x.dur=Math.max(x.type==='move'?-1:0, Math.min(60,v)); }); });
  bind('tEase','change',function(el){ S.forEach(function(x){ x.ease=+el.value; }); });
  bind('tCh','change',function(el){ S.forEach(function(x){ x.ch=chanNorm(+el.value); }); });
  bind('tCol','input',function(el){ S.forEach(function(x){ x.col=hexToArr(el.value); }); });
  bind('tA','change',function(el){ const v=numv(el); if(v==null) return; S.forEach(function(x){ x.a=Math.max(0,Math.min(1,v)); }); });
  bind('tTx','input',function(el){ S.forEach(function(x){ x.tx=el.value.slice(0,60); }); });
  bind('tW','change',function(el){ const v=numv(el); if(v>0) S[0].w=Math.min(500,v); });
  bind('tH','change',function(el){ const v=numv(el); if(v>0) S[0].h=Math.min(500,v); });
  bind('tT','change',function(el){ S[0].t=+el.value; });
  bind('tOk','change',function(el){ S.forEach(function(x){ x.k=el.value; }); });
  bind('tPm','change',function(el){ S.forEach(function(x){ x.m=el.value; }); });
}
function nextFreeGroup(){
  const used={};
  eachObj(function(o){ if(o.g) used[o.g]=1; });
  let g=1; while(used[g]) g++;
  return g;
}
function openGroupModal(){
  if(!needSel()) return;
  const plain=edSel.filter(function(o){ return o._k!=='triggers' && o._k!=='starts'; });
  if(!plain.length){ edToast('Triggers target groups - set that in EDIT SPECIAL'); return; }
  const cg=commonVal(plain,function(o){return o.g||0;});
  openModal('EDIT GROUP', fieldRow('GROUP ID', numIn('gId', cg, 1, 'min="0"'))
    +'<div class="mrowb"><button class="pbtn green" id="gNext">NEXT FREE ('+nextFreeGroup()+')</button><button class="pbtn red" id="gClear">REMOVE GROUP</button></div>'
    +'<div class="mhint">Move and alpha triggers act on every object in their target group.</div>');
  function setG(g){ pushUndo(); plain.forEach(function(o){ if(g) o.g=g; else delete o.g; }); saveDraft(); }
  $('gId').addEventListener('change', function(){ setG(Math.max(0,(+this.value)|0)); });
  $('gNext').addEventListener('click', function(e){ e.stopPropagation(); const g=nextFreeGroup(); setG(g); $('gId').value=g; edToast('Group '+g); });
  $('gClear').addEventListener('click', function(e){ e.stopPropagation(); setG(0); $('gId').value=0; });
}
function openColorModal(){
  const chans=[CH_BG,CH_G,CH_LINE,CH_OBJ];
  for(let i=1;i<=24;i++) chans.push(i);
  let h='<div class="mhint">These are the starting colors. Color triggers can fade them during the level.'
    +(edSel.length?' Tap USE to put the '+edSel.length+' selected object(s) on a channel.':' Select objects first to assign them.')+'</div><div class="chgrid">';
  chans.forEach(function(c){
    const col=ED.cc[c]||[255,255,255];
    h+='<div class="chrow"><span>'+(CH_NAMES[c]||('CH '+c))+'</span><input type="color" data-ch="'+c+'" value="'+arrToHex(col)+'">'
      +(edSel.length?'<button class="pbtn sky small" data-use="'+c+'">USE</button>':'')+'</div>';
  });
  h+='</div>'+fieldRow('OTHER CHANNEL (25-99)', numIn('chMore', '', 1, 'min="25" max="99"'))
    +(edSel.length?'<div class="mrowb"><button class="pbtn sky" id="chMoreUse">USE IT</button><button class="pbtn gray" id="chDefault">BACK TO DEFAULT</button></div>':'');
  openModal('COLOR CHANNELS', h);
  let undone=false;
  function u(){ if(!undone){ pushUndo(); undone=true; } }
  $('edmbox').querySelectorAll('input[data-ch]').forEach(function(inp){
    inp.addEventListener('input', function(){ u(); ED.cc[+inp.dataset.ch]=hexToArr(inp.value); saveDraft(true); });
  });
  $('edmbox').querySelectorAll('button[data-use]').forEach(function(b){
    b.addEventListener('click', function(e){ e.stopPropagation(); u(); const c=+b.dataset.use; edSel.forEach(function(o){ o.c=c; }); saveDraft(true); edToast('Now on '+(CH_NAMES[c]||('channel '+c))); });
  });
  if($('chMoreUse')){
    $('chMoreUse').addEventListener('click', function(e){ e.stopPropagation(); const c=(+$('chMore').value)|0; if(c<1||c>99) return; u(); edSel.forEach(function(o){ o.c=c; }); saveDraft(true); edToast('Now on channel '+c); });
    $('chDefault').addEventListener('click', function(e){ e.stopPropagation(); u(); edSel.forEach(function(o){ delete o.c; }); saveDraft(true); edToast('Back to default colors'); });
  }
}
function openEdMenu(){
  stopPreview();
  const n=ED.starts.length;
  const h='<div class="mcol">'
    +'<button class="pbtn green wide" id="mResume">RESUME</button>'
    +'<button class="pbtn green wide" id="mSavePlay">SAVE &amp; PLAY (attempts + practice)</button>'
    +'<button class="pbtn blue wide" id="mUpload">UPLOAD</button>'
    +'<button class="pbtn blue wide" id="mCode">COPY LEVEL CODE</button>'
    +'<button class="pbtn blue wide" id="mImport">IMPORT CODE INTO THIS LEVEL</button>'
    +(n?'<div class="mrowb"><button class="pbtn gray" id="mSp">&#9664;</button><span class="mstart">START POS '+(activeStart+1)+' / '+n+'</span><button class="pbtn gray" id="mSn">&#9654;</button></div>':'')
    +'<button class="pbtn red wide" id="mClear">CLEAR LEVEL</button>'
    +'<button class="pbtn tan wide" id="mExit">SAVE &amp; EXIT</button>'
    +'</div><details class="mkeys"><summary>KEYBOARD SHORTCUTS</summary>'
    +'1/2/3 build / edit / delete &middot; Enter playtest &middot; Ctrl+Z / Ctrl+Y undo / redo<br>'
    +'Ctrl+C copy &middot; Ctrl+V paste at mouse &middot; Ctrl+D duplicate &middot; Ctrl+A select all &middot; Del delete<br>'
    +'WASD / arrows move 1 block (Shift 0.1, Alt 0.5) &middot; Q / E rotate 90 (Shift 45)<br>'
    +'Wheel scroll &middot; Shift+wheel up/down &middot; Ctrl+wheel zoom &middot; Space or right-drag pans<br>'
    +'[ and ] switch start position &middot; Shift+tap adds to selection &middot; Shift+drag box-selects</details>';
  openModal('EDITOR', h);
  function on(id, fn){ const el=$(id); if(el) el.addEventListener('click', function(e){ e.stopPropagation(); fn(); }); }
  on('mResume', closeModal);
  on('mSavePlay', function(){
    closeModal(); saveDraft();
    if(objCount(ED)<1){ edToast('Place something first'); return; }
    const st=ED.starts; spawnStart=st.length?st[activeStart%st.length]:null;
    initAudio(); startPlay(prepLevel(ED),'test');
  });
  on('mUpload', function(){
    saveDraft();
    if(objCount(ED)<3){ edToast('Add at least 3 objects first!'); return; }
    const ups=getUploads();
    ups.unshift({id:Date.now().toString(36), name:ED.name, d:packLevel(ED), date:Date.now()});
    setUploads(ups);
    toast('Uploaded! Find it under LEVELS on the main menu');
  });
  on('mCode', function(){ saveDraft(); copyText(levelCode(ED), 'Level code copied!'); });
  on('mImport', function(){
    const code=window.prompt('Paste a level code - it REPLACES this level (undo works):');
    if(!code) return;
    const d=decodeLevel(code);
    if(!d){ toast('Invalid level code'); return; }
    pushUndo(); const nm=ED.name; ED=d; ED.name=nm; edSel=[]; fixStart(); saveDraft(); closeModal(); toast('Imported');
  });
  on('mSp', function(){ cycleStart(-1); openEdMenu(); });
  on('mSn', function(){ cycleStart(1); openEdMenu(); });
  on('mClear', function(){
    if(!window.confirm('Clear every object in this level? (undo still works)')) return;
    pushUndo(); KINDS.forEach(function(k){ ED[k]=[]; }); edSel=[]; activeStart=0; saveDraft(); closeModal();
  });
  on('mExit', exitEditor);
}

// ---------- level settings (gear) ----------
const SPEED_NAMES=['0.5x','1x','2x','3x','4x'];
function songLabel(s){
  if(s.t==='ng') return 'NEWGROUNDS #'+s.id+(s.n?' - '+s.n:'');
  if(s.t==='c') return 'MY FILE - '+(s.n||'song');
  if(s.t==='f') return 'FOLDER FILE - '+s.p;
  return 'BUILT-IN - '+TRACKS[s.i|0].name;
}
function openSettings(){
  stopPreview();
  const s=ED.song, tab=s.t||'b';
  let h='';
  h+=fieldRow('LEVEL NAME', '<input type="text" id="sName" maxlength="20" value="'+escHtml(ED.name)+'">');
  h+='<div class="msec">SONG</div><div class="songnow" id="sNow">'+escHtml(songLabel(s))+'</div>';
  h+='<div class="stabs">'+[['b','BUILT-IN'],['ng','NEWGROUNDS'],['c','MY FILES'],['f','GAME FOLDER']].map(function(t){
      return '<button class="stab'+(tab===t[0]?' on':'')+'" data-st="'+t[0]+'">'+t[1]+'</button>'; }).join('')+'</div>';
  h+='<div class="spane" data-p="b">'+fieldRow('TRACK','<select id="sTrack">'+TRACKS.map(function(t,i){ return '<option value="'+i+'"'+(s.t==='b'&&s.i===i?' selected':'')+'>'+escHtml(t.name)+'</option>'; }).join('')+'</select>')+'</div>';
  h+='<div class="spane" data-p="ng">'
    +fieldRow('SONG ID OR LINK','<input type="text" id="sNgId" placeholder="e.g. 467339" value="'+(s.t==='ng'?s.id:'')+'">')
    +fieldRow('NAME (optional)','<input type="text" id="sNgName" maxlength="48" value="'+escHtml(s.t==='ng'?(s.n||''):'')+'">')
    +'<div class="mrowb"><button class="pbtn green" id="sNgLoad">LOAD &amp; USE</button>'
    +'<a class="pbtn blue" href="https://www.newgrounds.com/audio" target="_blank" rel="noopener noreferrer">BROWSE NEWGROUNDS &#8599;</a></div>'
    +'<div class="mhint" id="sNgStat">Find a song on Newgrounds, copy the number from its link (newgrounds.com/audio/listen/<b>NUMBER</b>) and paste it here. Songs whose artist disabled downloads won\'t load.</div>'
    +'<div class="ngfeat">'+NG_FEATURED.map(function(f){ return '<button class="pbtn sky small" data-ng="'+f.id+'" data-n="'+escHtml(f.n)+'">'+escHtml(f.n)+' <i>'+escHtml(f.a)+'</i></button>'; }).join('')+'</div>'
    +'</div>';
  h+='<div class="spane" data-p="c"><div class="mrowb"><button class="pbtn green" id="sPick">ADD AN MP3 FROM THIS PC</button></div>'
    +'<div class="mhint">Stored in this browser only - other devices and shared level codes won\'t have the file.</div><div class="ngfeat" id="sMine"></div></div>';
  h+='<div class="spane" data-p="f">'+fieldRow('FILE NAME','<input type="text" id="sFile" placeholder="mysong.mp3" value="'+escHtml(s.t==='f'?s.p:'')+'">')
    +'<div class="mrowb"><button class="pbtn green" id="sFileUse">USE</button></div>'
    +'<div class="mhint">Put an mp3 next to index.html. Best choice for main levels - it works for everyone who gets the game folder.</div></div>';
  h+=fieldRow('VOLUME (whole game)', '<input type="range" id="sVol" min="0" max="100" step="1" value="'+Math.round(OPT.vol*100)+'">');
  h+=fieldRow('START OFFSET (s)', '<input type="number" id="sOff" min="0" step="0.1" value="'+(+ED.mo||0)+'">');
  h+='<div class="mrowb"><button class="pbtn green" id="sPrev">&#9654; PREVIEW SONG</button></div>';
  h+='<div class="msec">LOOK</div>';
  h+=fieldRow('BACKGROUND','<select id="sBg">'+BG_NAMES.map(function(n,i){ return '<option value="'+i+'"'+((ED.bg|0)===i?' selected':'')+'>'+n+'</option>'; }).join('')+'</select>');
  h+=fieldRow('GROUND','<select id="sGr">'+GR_NAMES.map(function(n,i){ return '<option value="'+i+'"'+((ED.gr|0)===i?' selected':'')+'>'+n+'</option>'; }).join('')+'</select>');
  [[CH_BG,'BG COLOR'],[CH_G,'GROUND COLOR'],[CH_LINE,'LINE COLOR'],[CH_OBJ,'OBJECT COLOR']].forEach(function(c){
    h+=fieldRow(c[1],'<input type="color" data-cc="'+c[0]+'" value="'+arrToHex(ED.cc[c[0]])+'">');
  });
  h+='<div class="msec">START</div>';
  h+=fieldRow('GAMEMODE','<select id="sMode">'+MODE_NAMES.map(function(m){ return '<option value="'+m+'"'+(ED.sm===m?' selected':'')+'>'+m.toUpperCase()+'</option>'; }).join('')+'</select>');
  h+=fieldRow('SPEED','<select id="sSpd">'+SPEED_NAMES.map(function(n,i){ return '<option value="'+i+'"'+((ED.ss!=null?ED.ss:1)===i?' selected':'')+'>'+n+'</option>'; }).join('')+'</select>');
  h+=fieldRow('START MINI','<input type="checkbox" id="sMini"'+(ED.smi?' checked':'')+'>');
  h+=fieldRow('START UPSIDE DOWN','<input type="checkbox" id="sGrav"'+(ED.sgd?' checked':'')+'>');
  openModal('LEVEL SETTINGS', h, function(){ if(settingsPreview){ settingsPreview=false; musicStop(); } });
  const box=$('edmbox');
  function showTab(t){
    box.querySelectorAll('.stab').forEach(function(b){ b.classList.toggle('on', b.dataset.st===t); });
    box.querySelectorAll('.spane').forEach(function(p){ p.classList.toggle('hidden', p.dataset.p!==t); });
    if(t==='c') listMine();
  }
  box.querySelectorAll('.stab').forEach(function(b){ b.addEventListener('click', function(e){ e.stopPropagation(); showTab(b.dataset.st); }); });
  showTab(tab);
  let undone=false;
  function u(){ if(!undone){ pushUndo(); undone=true; } }
  function setSongD(sd){
    u(); ED.song=songNorm(sd); saveDraft(true);
    $('sNow').textContent=songLabel(ED.song);
    if(settingsPreview) playSettingsPreview();
  }
  $('sName').addEventListener('input', function(){ u(); ED.name=(this.value||'UNNAMED').toUpperCase().slice(0,20); saveDraft(true); });
  $('sTrack').addEventListener('change', function(){ setSongD({t:'b', i:+this.value}); });
  function loadNg(idText, name){
    const m=(''+idText).match(/(\d{2,10})/);
    if(!m){ $('sNgStat').textContent='That doesn\'t look like a song ID.'; return; }
    const id=+m[1], stat=$('sNgStat');
    stat.textContent='Loading Newgrounds #'+id+'...';
    ngCheck(id, function(ok, msg){
      stat.textContent=msg;
      if(!ok){
        const a=document.createElement('a');
        a.className='pbtn blue small'; a.target='_blank'; a.rel='noopener noreferrer';
        a.href='https://www.newgrounds.com/audio/listen/'+id;
        a.textContent='OPEN SONG PAGE ↗';
        stat.appendChild(document.createElement('br')); stat.appendChild(a);
      }
      if(ok){ setSongD({t:'ng', id:id, n:name||''}); $('sNgId').value=id; }
    });
  }
  $('sNgLoad').addEventListener('click', function(e){ e.stopPropagation(); loadNg($('sNgId').value, $('sNgName').value.trim()); });
  box.querySelectorAll('[data-ng]').forEach(function(b){
    b.addEventListener('click', function(e){ e.stopPropagation(); $('sNgName').value=b.dataset.n; loadNg(b.dataset.ng, b.dataset.n); });
  });
  $('sNgName').addEventListener('change', function(){ if(ED.song.t==='ng'){ u(); ED.song.n=this.value.trim().slice(0,48); saveDraft(true); $('sNow').textContent=songLabel(ED.song); } });
  $('sPick').addEventListener('click', function(e){
    e.stopPropagation();
    const inp=document.createElement('input'); inp.type='file'; inp.accept='audio/*,.mp3,.ogg,.wav,.m4a';
    inp.addEventListener('change', function(){
      const f=inp.files&&inp.files[0]; if(!f) return;
      const key='c'+hashStr(f.name+'|'+f.size+'|'+f.lastModified).toString(36);
      idbPut(key, {name:f.name, blob:f}).then(function(){
        setSongD({t:'c', k:key, n:f.name.replace(/\.[^.]+$/,'').slice(0,60)});
        listMine(); edToast('Song saved in this browser');
      }).catch(function(){ edToast('Could not store the file (browser storage blocked?)'); });
    });
    inp.click();
  });
  function listMine(){
    idbAll().then(function(all){
      const el=$('sMine'); if(!el) return;
      el.innerHTML=all.length?'':'<div class="mhint">No songs added yet.</div>';
      all.forEach(function(sg){
        const b=document.createElement('button');
        b.className='pbtn sky small'+(ED.song.t==='c'&&ED.song.k===sg.k?' on':'');
        b.textContent=(''+sg.n).slice(0,40);
        b.addEventListener('click', function(e){ e.stopPropagation(); setSongD({t:'c', k:sg.k, n:(''+sg.n).replace(/\.[^.]+$/,'')}); listMine(); });
        el.appendChild(b);
      });
    }).catch(function(){});
  }
  $('sFileUse').addEventListener('click', function(e){
    e.stopPropagation();
    const p=$('sFile').value.trim();
    const sn=songNorm({t:'f', p:p});
    if(sn.t!=='f'){ edToast('Use a plain file name like mysong.mp3'); return; }
    setSongD(sn);
  });
  $('sOff').addEventListener('change', function(){ u(); ED.mo=Math.max(0, +this.value||0); saveDraft(true); if(settingsPreview) playSettingsPreview(); });
  $('sPrev').addEventListener('click', function(e){
    e.stopPropagation();
    if(settingsPreview){ settingsPreview=false; musicStop(); this.innerHTML='&#9654; PREVIEW SONG'; }
    else { settingsPreview=true; playSettingsPreview(); this.innerHTML='&#9632; STOP PREVIEW'; }
  });
  $('sVol').addEventListener('input', function(){ setVolume((+this.value||0)/100); });
  $('sBg').addEventListener('change', function(){ u(); ED.bg=+this.value; saveDraft(true); });
  $('sGr').addEventListener('change', function(){ u(); ED.gr=+this.value; saveDraft(true); });
  box.querySelectorAll('input[data-cc]').forEach(function(inp){
    inp.addEventListener('input', function(){ u(); ED.cc[+inp.dataset.cc]=hexToArr(inp.value); saveDraft(true); });
  });
  $('sMode').addEventListener('change', function(){ u(); ED.sm=this.value; saveDraft(true); });
  $('sSpd').addEventListener('change', function(){ u(); ED.ss=+this.value; saveDraft(true); });
  $('sMini').addEventListener('change', function(){ u(); ED.smi=this.checked?1:0; saveDraft(true); });
  $('sGrav').addEventListener('change', function(){ u(); ED.sgd=this.checked?1:0; saveDraft(true); });
}
let settingsPreview=false;
function playSettingsPreview(){
  initAudio(); setSong(ED.song); songOffset=+ED.mo||0; musicSeek(0);
}
function ngCheck(id, cb){
  const a=audioFor(ngURL(id));
  let done=false;
  function fin(ok,msg){ if(done) return; done=true; clearTimeout(tm); a.removeEventListener('loadedmetadata',onMeta); a.removeEventListener('error',onErr); cb(ok,msg); }
  function onMeta(){
    if(a.duration && a.duration<11) fin(false,'Newgrounds only sent its 10-second hotlink preview. Open the game from the folder or its own site and try again.');
    else fin(true,'Loaded Newgrounds #'+id+(a.duration?(' ('+Math.floor(a.duration/60)+':'+('0'+Math.floor(a.duration%60)).slice(-2)+')'):'')+' - it\'s now the level song.');
  }
  const why=' Open the song page: if it says NG Guard, Newgrounds is blocking your connection for a while. You can always download the mp3 there and add it under MY FILES or GAME FOLDER instead.';
  function onErr(){ fin(false,'Couldn\'t load #'+id+'. The ID may be wrong or the artist turned off downloads.'+why); }
  const tm=setTimeout(function(){ fin(false,'Newgrounds didn\'t answer.'+why); }, 9000);
  if(a.readyState>=1 && a.duration){ onMeta(); return; }
  a.addEventListener('loadedmetadata', onMeta);
  a.addEventListener('error', onErr);
  if(a.error){ try{ a.load(); }catch(e){} }
}

// ---------- rendering ----------
function renderEditor(){
  setView(edZoom, edVT);
  camX=edCamX;
  if(pv){
    const t=previewT(), x=xAtTime(ED, t);
    pv.x=x;
    if(x > edCamX+W*0.7){ edCamX=x-W*0.3; camX=edCamX; }
    if(x > (maxGx(ED)+12)*B) stopPreview();
  }
  groupOff={}; groupAlpha={};
  loadChannels(ED.cc);
  applyView();
  pulse*=0.93;
  if(AC){ while(kickTimes.length && kickTimes[0] <= AC.currentTime){ pulse=1; kickTimes.shift(); } }
  drawBackground(ED);
  drawGround(ED);

  const top=VT, x0=Math.floor(camX/B)*B-camX;
  ctx.strokeStyle='rgba(255,255,255,0.10)'; ctx.lineWidth=1/Math.max(0.5,Z);
  for(let x=x0; x<W; x+=B) line(x, top, x, groundY);
  for(let y=groundY; y>top; y-=B) line(0, y, W, y);
  ctx.strokeStyle='rgba(255,102,255,0.45)'; ctx.lineWidth=2;
  ctx.setLineDash([8,8]); line(0, ceilingY(), W, ceilingY()); ctx.setLineDash([]);

  const sx0=-camX;
  ctx.fillStyle='rgba(108,255,92,0.7)'; ctx.fillRect(sx0-2,top,4,groundY-top);
  const endX=(maxGx(ED)+10)*B-camX;
  ctx.fillStyle='rgba(255,255,255,0.7)'; ctx.fillRect(endX-2,top,4,groundY-top);
  ctx.font='bold 16px Arial'; ctx.textAlign='left'; ctx.textBaseline='alphabetic';
  ctx.fillStyle='#9f9'; ctx.fillText('START', sx0+8, ceilingY()-8);
  ctx.fillStyle='#fff'; ctx.fillText('END', endX+8, ceilingY()-8);

  drawLevelObjects(ED, false);
  ED.starts.forEach(function(s,i){ drawStart(s, i===activeStart, i); });

  drawTrail(edTrail, 0.7);
  if(edDeath){
    const dx=edDeath.x-camX, dy=edDeath.y, r=B*0.3;
    ctx.strokeStyle='#ff4b4b'; ctx.lineWidth=5; ctx.lineCap='round';
    line(dx-r,dy-r,dx+r,dy+r); line(dx+r,dy-r,dx-r,dy+r); ctx.lineCap='butt';
  }

  ctx.lineWidth=2.5;
  edSel.forEach(function(o){
    const b=objBox(o), px=b.cx*B-camX, py=groundY-b.cy*B;
    ctx.save(); ctx.translate(px,py); if(b.rot) ctx.rotate(b.rot*Math.PI/180);
    ctx.fillStyle='rgba(80,255,120,0.18)'; ctx.fillRect(-b.hw*B,-b.hh*B,b.hw*2*B,b.hh*2*B);
    ctx.strokeStyle='rgba(90,255,120,0.95)'; ctx.strokeRect(-b.hw*B,-b.hh*B,b.hw*2*B,b.hh*2*B);
    ctx.restore();
  });

  if(edMode==='build' && edHover && !ptr && !modalOpen()){
    const it=ITEM_BY_ID[edItem];
    if(it){
      const gx=Math.floor(edHover.fx), gy=Math.floor(edHover.fy);
      ctx.strokeStyle='rgba(255,255,255,0.6)'; ctx.lineWidth=2;
      ctx.strokeRect(gx*B-camX, groundY-(gy+1)*B, B, B);
      const o=normObj(it.k, it.make(gx,gy));
      ctx.save(); ctx.globalAlpha=0.4; drawOne(o); ctx.restore();
    }
  } else if(edMode==='delete' && edHover){
    const h=hitsAt(edHover.fx, edHover.fy);
    if(h.length){
      const b=objBox(h[0]);
      ctx.save(); ctx.translate(b.cx*B-camX, groundY-b.cy*B); if(b.rot) ctx.rotate(b.rot*Math.PI/180);
      ctx.strokeStyle='rgba(255,80,80,0.95)'; ctx.lineWidth=3; ctx.strokeRect(-b.hw*B,-b.hh*B,b.hw*2*B,b.hh*2*B);
      ctx.restore();
    }
  }
  if(EDO.rotate && edMode==='edit' && edSel.length){
    const pvc=(ptr&&ptr.act==='rot')?ptr.pv:selCenter(edSel), px=pvc[0]*B-camX, py=groundY-pvc[1]*B;
    ctx.strokeStyle='rgba(255,225,77,0.9)'; ctx.lineWidth=2; ctx.setLineDash([6,5]);
    ctx.beginPath(); ctx.arc(px,py,B*1.2,0,Math.PI*2); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle='#ffe14d'; ctx.beginPath(); ctx.arc(px,py,5,0,Math.PI*2); ctx.fill();
  }
  if(ptr && ptr.act==='box' && ptr.gl){
    const a=ptr.g0, b=ptr.gl;
    const x=Math.min(a.fx,b.fx)*B-camX, y=groundY-Math.max(a.fy,b.fy)*B, w=Math.abs(a.fx-b.fx)*B, h=Math.abs(a.fy-b.fy)*B;
    ctx.setLineDash([8,6]); ctx.lineWidth=2;
    ctx.fillStyle='rgba(90,255,120,0.12)'; ctx.strokeStyle='rgba(90,255,120,0.9)';
    ctx.fillRect(x,y,w,h); ctx.strokeRect(x,y,w,h); ctx.setLineDash([]);
  }
  if(pv && pv.x!=null){
    const lx=pv.x+B/2-camX;
    ctx.fillStyle='rgba(120,255,140,0.95)'; ctx.fillRect(lx-2,top,4,groundY-top);
    ctx.fillStyle='rgba(120,255,140,0.25)'; ctx.fillRect(lx-10,top,20,groundY-top);
  }

  hudView();
  const sc=$('eScroll');
  if(sc && document.activeElement!==sc) sc.value=''+Math.round(edCamX/B*10);
  if(hintMsg && performance.now()-hintT>3600){ hintMsg=''; edHint(); }
}
