// ---------- spiral binder rings ----------
(function(){
  const b = document.getElementById('binder');
  if(!b) return;
  const count = Math.ceil(window.innerHeight/50)+2;
  for(let i=0;i<count;i++){ const r=document.createElement('div'); r.className='ring'; b.appendChild(r); }
})();

function closeMobile(){ document.getElementById('navlinks').classList.remove('open'); }

function setVeg(btn, type){
  document.querySelectorAll('.veg-toggle button').forEach(b=>b.classList.remove('active'));
  btn.classList.add('active');
}
function pickVegType(type){
  document.getElementById('vegPillReg').classList.toggle('checked', type==='veg');
  document.getElementById('nonvegPillReg').classList.toggle('checked', type==='nonveg');
  document.getElementById('bothPillReg')?.classList.toggle('checked', type==='both');
}

function toast(msg){
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(window._toastTimer);
  window._toastTimer = setTimeout(()=>t.classList.remove('show'), 3200);
}

function submitRegister(e){
  e.preventDefault();
  document.getElementById('successBox').style.display='flex';
  toast('Registration received — welcome to TiffinX!');
  setTimeout(()=>{ showPortal('dashboard'); }, 1400);
  return false;
}

function subscribeNewsletter(e){
  e.preventDefault();
  toast('Subscribed! Watch your inbox & WhatsApp 🥗');
  e.target.reset();
  return false;
}

function showPortal(which){
  document.querySelectorAll('.portal-tab').forEach(t=>t.classList.remove('active'));
  document.querySelectorAll('.portal-panel').forEach(p=>p.classList.remove('active'));
  if(which==='register'){
    document.getElementById('tabRegister').classList.add('active');
    document.getElementById('panel-register').classList.add('active');
  } else {
    document.getElementById('tabDashboard').classList.add('active');
    document.getElementById('panel-dashboard').classList.add('active');
  }
}

// ---------- delivery timeline demo ----------
let deliveryStage = 0;
const stages = ['tls1','tls2','tls3'];
function renderTimeline(){
  stages.forEach((id,i)=>{
    const el = document.getElementById(id);
    if(!el) return;
    el.classList.remove('done','current');
    if(i < deliveryStage) el.classList.add('done');
    else if(i === deliveryStage) el.classList.add('current');
  });
  const fill = document.getElementById('tlFill');
  if(fill) fill.style.width = (deliveryStage/2*100)+'%';
}
window.setDeliveryStage = function(stage){
  deliveryStage = Math.max(0, Math.min(2, stage));
  renderTimeline();
};

// ---------- rough.js trust icons ----------
function buildTrustIcons(){
  const icons = { ic1: 'shield', ic2:'hat', ic3:'leaf', ic4:'eye' };
  Object.keys(icons).forEach(id=>{
    const el = document.getElementById(id);
    if(!el) return;
    const svgNS = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(svgNS,'svg');
    svg.setAttribute('viewBox','0 0 44 44'); svg.setAttribute('width','44'); svg.setAttribute('height','44');
    el.appendChild(svg);
    const rc = rough.svg(svg);
    let node;
    if(icons[id]==='shield'){
      node = rc.path('M22 4 L38 10 V22 C38 32 30 38 22 40 C14 38 6 32 6 22 V10 Z', {stroke:'#3D7226', strokeWidth:2, roughness:1.6, fill:'#5FA83D', fillStyle:'hachure', fillWeight:1.4});
    } else if(icons[id]==='hat'){
      node = rc.rectangle(8,26,28,8,{stroke:'#C06F1B',strokeWidth:2,roughness:1.6,fill:'#E38A2E',fillStyle:'hachure'});
    } else if(icons[id]==='leaf'){
      node = rc.circle(22,22,28,{stroke:'#3D7226',strokeWidth:2,roughness:1.8,fill:'#5FA83D',fillStyle:'hachure'});
    } else {
      node = rc.ellipse(22,22,34,20,{stroke:'#262B33',strokeWidth:2,roughness:1.6,fill:'#FBF7EC',fillStyle:'hachure'});
    }
    svg.appendChild(node);
  });
}

// ---------- hand-drawn tiffin box illustration ----------
function buildTiffinArt(){
  const canvas = document.getElementById('tiffinArt');
  if(!canvas) return;
  const rc = rough.canvas(canvas);
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0,0,520,480);
  rc.curve([[150,60],[145,40],[160,25],[155,5]], {stroke:'#9AA0A8', strokeWidth:2, roughness:2.2});
  rc.curve([[200,60],[195,38],[212,22],[206,2]], {stroke:'#9AA0A8', strokeWidth:2, roughness:2.2});
  rc.curve([[250,60],[245,40],[262,25],[256,5]], {stroke:'#9AA0A8', strokeWidth:2, roughness:2.2});
  const colors = ['#5FA83D','#E38A2E','#5FA83D'];
  for(let i=0;i<3;i++){
    const y = 90 + i*110;
    rc.rectangle(120, y, 220, 100, {stroke:'#262B33', strokeWidth:3, roughness:1.5, fill:colors[i], fillStyle:'hachure', fillWeight:2});
    rc.line(120, y+8, 340, y+8, {stroke:'#262B33', strokeWidth:1.4, roughness:1.8});
  }
  rc.path('M180 90 C180 40 280 40 280 90', {stroke:'#262B33', strokeWidth:4, roughness:1.6});
  rc.rectangle(110, 410, 240, 22, {stroke:'#262B33', strokeWidth:3, roughness:1.8, fill:'#262B33', fillStyle:'solid'});
  ctx.strokeStyle = '#E38A2E'; ctx.lineWidth = 2;
  function sparkle(x,y,s){ ctx.beginPath(); ctx.moveTo(x-s,y); ctx.lineTo(x+s,y); ctx.moveTo(x,y-s); ctx.lineTo(x,y+s); ctx.stroke(); }
  sparkle(80,80,8); sparkle(400,140,10); sparkle(360,320,7);
}

// ---------- sketch enhancement: circle highlight behind hero accent word ----------
function buildCircleMark(){
  const holder = document.getElementById('circleMarkHolder');
  if(!holder) return;
  const svgNS='http://www.w3.org/2000/svg';
  const svg = document.createElementNS(svgNS,'svg');
  svg.setAttribute('viewBox','0 0 320 90');
  svg.setAttribute('preserveAspectRatio','none');
  svg.style.width='100%'; svg.style.height='100%';
  holder.appendChild(svg);
  const rc = rough.svg(svg);
  const node = rc.ellipse(160,45,300,80,{stroke:'#E38A2E', strokeWidth:3.4, roughness:2.6, fill:'none'});
  svg.appendChild(node);
}

// ---------- sketch enhancement: wavy scribble underline under section titles ----------
function buildScribbleUnderlines(){
  document.querySelectorAll('.scribble-under').forEach(holder=>{
    const svgNS='http://www.w3.org/2000/svg';
    const svg = document.createElementNS(svgNS,'svg');
    svg.setAttribute('viewBox','0 0 200 14');
    svg.setAttribute('preserveAspectRatio','none');
    svg.style.width='100%'; svg.style.height='100%';
    holder.appendChild(svg);
    const rc = rough.svg(svg);
    const node = rc.path('M2 8 Q30 2 60 8 T120 8 T180 8 T198 6', {stroke:'#5FA83D', strokeWidth:3, roughness:2.2, fill:'none'});
    svg.appendChild(node);
  });
}

// ---------- sketch enhancement: torn-paper wavy dividers between sections ----------
function buildTornDividers(){
  document.querySelectorAll('.torn-divider').forEach(holder=>{
    const flip = holder.dataset.flip === 'true';
    const color = holder.dataset.color || '#FBF7EC';
    const svgNS='http://www.w3.org/2000/svg';
    const svg = document.createElementNS(svgNS,'svg');
    svg.setAttribute('viewBox','0 0 1200 34');
    svg.setAttribute('preserveAspectRatio','none');
    let d = 'M0 6 ';
    for(let x=0; x<=1200; x+=40){
      const y = 6 + (Math.sin(x/40) * 5) + (Math.random()*4-2);
      d += `L${x} ${y.toFixed(1)} `;
    }
    d += 'L1200 34 L0 34 Z';
    const path = document.createElementNS(svgNS,'path');
    path.setAttribute('d', d);
    path.setAttribute('fill', color);
    if(flip){ svg.style.transform = 'scaleY(-1)'; }
    svg.appendChild(path);
    holder.appendChild(svg);
  });
}

// ---------- init ----------
window.addEventListener('DOMContentLoaded', function(){
  buildTrustIcons();
  buildTiffinArt();
  buildCircleMark();
  buildScribbleUnderlines();
  buildTornDividers();
  renderTimeline();
});
