(() => {
  const canvas = document.querySelector('#portfolio-world');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;

  const W = 960, H = 540, T = 32;
  const keys = new Set();
  const pad = new Set();
  let scene = 'outdoor';
  let paused = false;
  let dialogue = null;
  let dialogueIndex = 0;
  let interactionTarget = null;
  let lastTime = performance.now();
  let camera = { x: 0, y: 0 };

  const storageKey = 'rashad-portfolio-world-v2';
  let save = { discovered: [], visitedInterior: false, doorOpened: false };
  try { const raw = JSON.parse(localStorage.getItem(storageKey) || 'null'); if (raw?.version === 2) save = { ...save, ...raw }; } catch {}

  const player = { x: 480, y: 270, dir: 'south', moving: false, anim: 0, radius: 10 };

  const outdoorBounds = { w: 960, h: 640 };
  const indoorBounds = { w: 640, h: 480 };
  const collisions = {
    outdoor: [
      [0,0,960,32],[0,608,960,32],[0,0,32,640],[928,0,32,640],
      [120,130,220,150],[560,118,250,160],[240,430,180,100],[650,420,170,100]
    ],
    indoor: [[0,0,640,32],[0,448,640,32],[0,0,32,480],[608,0,32,480],[96,96,448,20]]
  };
  const npc = { x: 430, y: 246, dir: 'south', anim: 0, name: 'Mira', role: 'Studio Guide' };
  const objects = {
    outdoor: [
      { id:'studio-door', type:'door', x:580, y:278, w:64, h:30, name:'Enter Developer Studio' },
      { id:'academic-sign', type:'sign', x:330, y:280, w:52, h:44, name:'Academic Quarter' },
      { id:'project-terminal', type:'terminal', x:720, y:470, w:44, h:36, name:'Project Exhibition' },
      { id:'library-door', type:'door', x:300, y:492, w:62, h:24, name:'Library Notice' }
    ],
    indoor: [{ id:'interior-exit', type:'exit', x:304,y:420,w:64,h:32,name:'Return to courtyard' },{id:'workbench',type:'inspect',x:320,y:180,w:96,h:58,name:'Inspect workbench'}]
  };

  const profile = fetch('public/data/profile.json').then(r=>r.ok?r.json():null).catch(()=>null);
  let projectData = null;
  fetch('public/data/projects.json').then(r=>r.ok?r.json():[]).then(d=>projectData=d).catch(()=>projectData=[]);

  function persist() { localStorage.setItem(storageKey, JSON.stringify({ version:2, ...save })); }
  function clamp(v,a,b){ return Math.max(a,Math.min(b,v)); }

  function collides(x,y,r=10) {
    const list = collisions[scene === 'outdoor' ? 'outdoor' : 'indoor'];
    return list.some(([rx,ry,rw,rh]) => x+r>rx && x-r<rx+rw && y+r>ry && y-r<ry+rh);
  }

  function moveEntity(entity, dx, dy, dt) {
    const oldX=entity.x, oldY=entity.y;
    const nx=entity.x+dx*dt, ny=entity.y;
    if(!collides(nx,ny,entity.radius)) entity.x=nx;
    const vx=entity.x, vy=entity.y+dy*dt;
    if(!collides(vx,vy,entity.radius)) entity.y=vy;
    entity.moving=Math.abs(entity.x-oldX)+Math.abs(entity.y-oldY)>0.01;
  }

  function update(dt) {
    if(paused || dialogue) return;
    let x=0,y=0;
    if(keys.has('ArrowLeft')||keys.has('KeyA')||pad.has('left')) x--;
    if(keys.has('ArrowRight')||keys.has('KeyD')||pad.has('right')) x++;
    if(keys.has('ArrowUp')||keys.has('KeyW')||pad.has('up')) y--;
    if(keys.has('ArrowDown')||keys.has('KeyS')||pad.has('down')) y++;
    if(x||y){
      const len=Math.hypot(x,y); x/=len; y/=len;
      if(Math.abs(x)>Math.abs(y)) player.dir=x>0?'east':'west'; else player.dir=y>0?'south':'north';
      const running=keys.has('ShiftLeft')||keys.has('ShiftRight');
      moveEntity(player,x*(running?150:95),y*(running?150:95),dt);
      if(player.moving) player.anim+=dt*(running?10:7); else player.anim=0;
    }else player.moving=false;

    npc.anim+=dt*0.8;
    const target=objects[scene];
    interactionTarget=null;
    let nearest=Infinity;
    for(const o of target){
      const cx=o.x+o.w/2, cy=o.y+o.h/2;
      const d=Math.hypot(player.x-cx,player.y-cy);
      if(d<72&&d<nearest){ nearest=d; interactionTarget=o; }
    }
    const npcD=Math.hypot(player.x-npc.x,player.y-npc.y);
    if(scene==='outdoor'&&npcD<58&&npcD<nearest) interactionTarget={id:'guide',type:'npc',name:'Talk to Mira'};

    const prompt=document.querySelector('#interaction-prompt');
    if(prompt) prompt.hidden=!interactionTarget;
  }

  function rect(x,y,w,h,color){ctx.fillStyle=color;ctx.fillRect(Math.round(x),Math.round(y),Math.round(w),Math.round(h));}
  function outlineRect(x,y,w,h,color){ctx.strokeStyle=color;ctx.lineWidth=2;ctx.strokeRect(Math.round(x)+1,Math.round(y)+1,Math.round(w)-2,Math.round(h)-2);}

  function drawGround() {
    rect(0,0,W,H,'#6F8062');
    for(let y=32;y<H;y+=32){
      for(let x=32;x<W;x+=32){
        const n=(x*17+y*31)%96;
        rect(x,y,32,32,(n<18?'#758765':n<36?'#697A5D':'#71835F'));
        if(n===41){rect(x+8,y+20,2,2,'#A9B58C');rect(x+22,y+11,2,2,'#A9B58C');}
      }
    }
    ctx.strokeStyle='rgba(242,231,196,.22)';ctx.lineWidth=2;
    ctx.beginPath();ctx.moveTo(480,32);ctx.lineTo(480,608);ctx.moveTo(32,320);ctx.lineTo(928,320);ctx.stroke();
  }

  function drawHouse(x,y,w,h,purpose) {
    rect(x,y+h-12,w,18,'#4F493C');
    rect(x+12,y+18,w-24,h-30,'#BDAF91');outlineRect(x+12,y+18,w-24,h-30,'#504A3C');
    rect(x,y,w,34,purpose==='studio'?'#9A5541':'#806F52');
    for(let i=0;i<w;i+=16){rect(x+i,y,10,34,i%32?'#A86450':'#895947');outlineRect(x+i,y,10,34,'#674C3F');}
    rect(x+w/2-24,y+h-58,48,58,'#4F594A');outlineRect(x+w/2-24,y+h-58,48,58,'#3C4438');
    rect(x+w/2-18,y+h-52,36,52,'#65735E');rect(x+w/2-12,y+h-44,24,8,'#D9AE65');
    rect(x+34,y+64,44,34,'#718F8A');outlineRect(x+34,y+64,44,34,'#4F625F');
    rect(x+w-78,y+64,44,34,'#718F8A');outlineRect(x+w-78,y+64,44,34,'#4F625F');
    rect(x+w/2-3,y+4,6,30,'#5F4F40');
  }

  function drawTree(x,y) {
    rect(x-7,y+24,14,25,'#65513C');rect(x-10,y+28,20,5,'#7A6248');
    rect(x-20,y-4,40,36,'#426551');rect(x-14,y-14,28,16,'#527A62');rect(x-8,y-20,16,10,'#65866C');
    rect(x-24,y+8,12,20,'#3D5B47');rect(x+12,y+12,12,18,'#4D6B53');
    rect(x-15,y-6,5,5,'#81906A');rect(x+7,y+4,4,4,'#81906A');
  }

  function drawFountain(x,y) {
    rect(x-42,y-12,84,44,'#A8A080');outlineRect(x-42,y-12,84,44,'#4E594A');
    rect(x-34,y-6,68,28,'#71939A');rect(x-28,y,56,16,'#84AAB0');
    rect(x-8,y-28,16,28,'#A8A080');rect(x-13,y-32,26,8,'#C4B999');
  }

  function drawPlayer(entity, cameraOffsetX, cameraOffsetY) {
    const sx=Math.round(entity.x-cameraOffsetX), sy=Math.round(entity.y-cameraOffsetY);
    const walking=entity.moving?Math.floor(entity.anim)%4:0;
    rect(sx-12,sy-18,24,30,'#252C28');
    rect(sx-9,sy-14,18,17,'#BD7356');
    rect(sx-7,sy-22,14,10,'#4B3429');rect(sx-5,sy-20,10,3,'#7A5542');
    rect(sx-8,sy-5,16,17,'#426551');
    rect(sx-10,sy+12,7,12,walking===1?'#252C28':'#59605A');rect(sx+3,sy+12,7,12,walking===3?'#252C28':'#59605A');
    rect(sx-13,sy+1,5,14,'#D9AE65');rect(sx+8,sy+1,5,14,'#D9AE65');
    if(entity.dir==='east') rect(sx+8,sy-16,3,3,'#252C28');
    if(entity.dir==='west') rect(sx-11,sy-16,3,3,'#252C28');
  }

  function drawNPC(entity) {
    const sx=Math.round(entity.x-camera.x), sy=Math.round(entity.y-camera.y);
    rect(sx-12,sy-16,24,28,'#252C28');rect(sx-9,sy-12,18,16,'#D0A46C');
    rect(sx-8,sy-20,16,9,'#5A493A');rect(sx-6,sy-18,12,3,'#8C7459');
    rect(sx-8,sy+2,16,14,'#81906A');rect(sx-10,sy+14,7,8,'#4A4E44');rect(sx+3,sy+14,7,8,'#4A4E44');
  }

  function drawOutdoor() {
    drawGround();
    drawFountain(480,150);
    drawHouse(120,130,220,150,'academic');drawHouse(560,118,250,160,'studio');
    drawHouse(240,430,180,100,'library');
    [[80,180],[95,240],[410,100],[430,410],[850,160],[870,330],[520,520],[780,390],[430,520],[180,380]].forEach(p=>drawTree(p[0],p[1]));
    rect(720,455,110,58,'#BDAF91');outlineRect(720,455,110,58,'#504A3C');rect(738,470,74,28,'#426551');rect(747,478,56,12,'#A5C4A8');
    drawNPC(npc);drawPlayer(player,camera.x,camera.y);
  }

  function drawIndoor() {
    rect(0,0,640,480,'#CBBE9F');
    for(let y=32;y<448;y+=32)for(let x=32;x<608;x+=32)rect(x,y,32,32,(x+y)%64?'#CFC4A7':'#C5BA9A');
    rect(32,32,576,64,'#A95C46');outlineRect(32,32,576,64,'#66473C');
    for(let i=48;i<600;i+=48){rect(i,46,32,38,'#CFC4A7');outlineRect(i,46,32,38,'#66473C');}
    rect(96,96,448,20,'#6F604A');
    rect(120,116,400,24,'#A8B4FA');for(let i=132;i<500;i+=42)rect(i,120,24,16,'#252C28');
    rect(210,210,220,86,'#806F52');outlineRect(210,210,220,86,'#504A3C');
    rect(230,224,180,58,'#D9AE65');rect(242,232,156,42,'#252C28');rect(258,244,124,18,'#426551');
    rect(304,420,64,28,'#65735E');outlineRect(304,420,64,28,'#252C28');
    drawPlayer(player,camera.x,camera.y);
  }

  function render() {
    ctx.save();
    const bounds=scene==='outdoor'?outdoorBounds:indoorBounds;
    const scale=Math.max(.75,Math.min(1.4,canvas.clientWidth/960));
    camera.x=clamp(player.x-W/(2*scale),0,Math.max(0,bounds.w-W/scale));
    camera.y=clamp(player.y-H/(2*scale),0,Math.max(0,bounds.h-H/scale));
    ctx.clearRect(0,0,W,H);
    if(scene==='outdoor') drawOutdoor(); else drawIndoor();
    ctx.restore();
  }

  function updateLocation() {
    const name=document.querySelector('#location-name');
    if(scene==='indoor'){name.textContent='Developer Studio · Interior';return;}
    if(player.x<350&&player.y<330) name.textContent='Academic Quarter';
    else if(player.x>540&&player.y<320) name.textContent='Developer Studio';
    else if(player.x<380&&player.y>390) name.textContent='Library';
    else name.textContent='Arrival Plaza';
  }

  function openDialogue(name,lines) {
    dialogue={name,lines};dialogueIndex=0;paused=true;
    const box=document.querySelector('#dialogue-box');box.hidden=false;
    document.querySelector('#dialogue-name').textContent=name;
    document.querySelector('#dialogue-text').textContent=lines[0];
    document.querySelector('#dialogue-advance').focus();
  }
  function advanceDialogue(){
    if(!dialogue)return;
    dialogueIndex++;
    if(dialogueIndex>=dialogue.lines.length){closeDialogue();return;}
    document.querySelector('#dialogue-text').textContent=dialogue.lines[dialogueIndex];
  }
  function closeDialogue(){dialogue=null;paused=false;document.querySelector('#dialogue-box').hidden=true;canvas.focus();}

  function interact(){
    if(paused&&!dialogue)return;
    if(dialogue){advanceDialogue();return;}
    if(interactionTarget?.type==='npc'){
      openDialogue('Mira · Studio Guide',['Welcome to the Learning Quarter. Walk with WASD or the arrow keys.','You can enter the Developer Studio, visit the library, or open the map.','Press Escape at any time to pause or open the text alternative.']);
      return;
    }
    if(interactionTarget?.id==='studio-door'||interactionTarget?.id==='interior-exit'){
      scene=scene==='outdoor'?'indoor':'outdoor';paused=false;
      if(scene==='indoor'){player.x=320;player.y=390;save.visitedInterior=true;persist();}
      else {player.x=580;player.y=330;}
      return;
    }
    if(interactionTarget?.id==='workbench'){
      openDialogue('Developer Workbench',['This station represents the technical projects behind the portfolio.','Repository names and descriptions come from the synchronized GitHub project data.']);
      return;
    }
    if(interactionTarget?.id==='academic-sign') openDialogue('Academic Quarter',['This district represents education and learning.','Verified qualifications and experiences can be maintained in the profile content source.']);
    if(interactionTarget?.id==='project-terminal') openDialogue('Project Exhibition',['Project 1, Hour of Code, and Robotics remain available directly through Projects.','The terminal can later browse every synchronized repository.']);
    if(interactionTarget?.id==='library-door') openDialogue('Library',['Published Markdown articles appear in this archive.','Draft articles remain excluded from the public website.']);
  }

  function toggleText(){
    const panel=document.querySelector('#text-view');const open=panel.hidden;
    panel.hidden=!open;document.querySelector('#text-view-toggle').setAttribute('aria-expanded',String(open));paused=open;
    if(open)document.querySelector('#text-view-close').focus();
  }
  function toggleMap(){const panel=document.querySelector('#world-map');panel.hidden=!panel.hidden;paused=!panel.hidden;}
  function togglePause(){const panel=document.querySelector('#pause-menu');panel.hidden=!panel.hidden;paused=!panel.hidden;}

  profile.then(p=>{if(!p)return;document.querySelector('#text-biography').textContent=p.extendedBiography||'';document.querySelector('#text-skills').innerHTML=(p.technicalSkills||[]).map(s=>`<span class="skill-chip">${s}</span>`).join('');});

  window.addEventListener('keydown',e=>{
    if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space'].includes(e.code))e.preventDefault();
    keys.add(e.code);
    if(!e.repeat&&(e.code==='KeyE'||e.code==='Space'))interact();
    if(!e.repeat&&e.code==='Enter'&&dialogue)advanceDialogue();
    if(!e.repeat&&e.code==='Escape'){
      if(dialogue)closeDialogue();else togglePause();
    }
    if(!e.repeat&&e.code==='KeyM')toggleMap();
  });
  window.addEventListener('keyup',e=>keys.delete(e.code));
  window.addEventListener('blur',()=>{keys.clear();pad.clear();});
  document.addEventListener('visibilitychange',()=>{if(document.hidden){keys.clear();pad.clear();}});

  document.querySelector('#dialogue-advance').addEventListener('click',advanceDialogue);
  document.querySelector('#text-view-toggle').addEventListener('click',toggleText);
  document.querySelector('#text-view-close').addEventListener('click',toggleText);
  document.querySelector('#map-toggle').addEventListener('click',toggleMap);
  document.querySelector('#world-map-close').addEventListener('click',toggleMap);
  document.querySelector('#pause-toggle').addEventListener('click',togglePause);
  document.querySelector('#pause-resume').addEventListener('click',togglePause);
  document.querySelector('#pause-text').addEventListener('click',()=>{togglePause();toggleText();});
  document.querySelector('#pause-reset').addEventListener('click',()=>{if(confirm('Reset world progress?')){localStorage.removeItem(storageKey);location.reload();}});
  document.querySelectorAll('[data-map-region]').forEach(b=>b.addEventListener('click',()=>{
    const map={arrival:[480,270],academic:[300,240],studio:[650,240],library:[300,490]};const p=map[b.dataset.mapRegion];scene='outdoor';player.x=p[0];player.y=p[1];toggleMap();
  }));
  document.querySelectorAll('[data-pad]').forEach(b=>{const dir=b.dataset.pad;const start=e=>{e.prevent;pad.add(dir)};b.addEventListener('pointerdown',e=>{e.preventDefault();pad.add(dir);});b.addEventListener('pointerup',()=>pad.delete(dir));b.addEventListener('pointercancel',()=>pad.delete(dir));});
  document.querySelector('[data-mobile-interact]').addEventListener('click',interact);

  function loop(time){const dt=Math.min((time-lastTime)/1000,.05);lastTime=time;if(!paused)update(dt);updateLocation();render();requestAnimationFrame(loop);}
  canvas.focus();requestAnimationFrame(loop);
})();
