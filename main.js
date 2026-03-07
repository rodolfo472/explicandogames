import nipplejs from "nipplejs";

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d', {alpha:false});
const DPR = Math.max(1, window.devicePixelRatio || 1);
canvas.width = 960;
canvas.height = 540;

const startScreen = document.getElementById('startScreen');
const playBtn = document.getElementById('playBtn');
const hud = document.getElementById('hud');
const levelText = document.getElementById('levelText');
const swordCountEl = document.getElementById('swordCount');
const gameOverEl = document.getElementById('gameOver');
const retryBtn = document.getElementById('retryBtn');
const mobileControls = document.getElementById('mobileControls');
const leftBtn = document.getElementById('leftBtn');
const rightBtn = document.getElementById('rightBtn');
const jumpBtn = document.getElementById('jumpBtn');

let isMobile = /Mobi|Android|iPhone|iPad/.test(navigator.userAgent);
let useTouchControls = false;
let keyboardActive = false;

function detectDevice() {
  if (isMobile) {
    // Wait for first touch to enable on-screen controls
    const onFirstTouch = () => {
      useTouchControls = true;
      mobileControls.classList.remove('hidden');
      window.removeEventListener('touchstart', onFirstTouch, {once:true});
    };
    window.addEventListener('touchstart', onFirstTouch, {once:true});
  } else {
    // Wait for any key to enable keyboard controls
    const onFirstKey = () => {
      keyboardActive = true;
      window.removeEventListener('keydown', onFirstKey, {once:true});
    };
    window.addEventListener('keydown', onFirstKey, {once:true});
  }
}
detectDevice();

/* -----------------------------
   Simple pixel art tile system
   ----------------------------- */

const TILE = 16; // logical pixel size for drawing tiles (pixel art scale)
const SCALE = 3; // render scale (we will scale sprites when drawing)
const GRAVITY = 1200;
const JUMP_V = -560; // slightly stronger jump for livelier feel
const MOVE_SPEED = 220; // a bit faster
const ACCEL = 2200; // horizontal acceleration (px/s^2)
const FRICTION = 0.85; // ground friction factor applied when no input

const levels = [
  // 7 levels incremental difficulty (can be expanded to 10)
  // Each level: width, height (in tiles), player start, platforms array, traps array, items
  // platforms: {x,y,w,h}
  // traps types: 'spikes' (visible), 'disappear' (floor that vanishes when stepped), 'hiddenSpike' (invisible until activated), 'fake' (looks like platform but not solid), 'pop' (appears after stepping on certain tile)
  // items: {x,y,type}
  {
    w:60,h:34,
    player:{x:4*TILE,y:28*TILE},
    platforms:[
      {x:0,y:30,w:60,h:4},
      {x:6,y:24,w:6,h:1},
      {x:16,y:20,w:6,h:1},
      {x:28,y:16,w:8,h:1},
      {x:44,y:22,w:6,h:1}
    ],
    traps:[
      {type:'spikes',x:12,y:30,w:2},
      {type:'disappear',x:20,y:30,w:3},
      {type:'fake',x:34,y:29,w:2},
    ],
    items:[
      {x:30*TILE,y:15*TILE,type:'sword'}
    ]
  },
  {
    w:70,h:38,
    player:{x:3*TILE,y:30*TILE},
    platforms:[
      {x:0,y:34,w:70,h:4},
      {x:8,y:28,w:4,h:1},
      {x:18,y:24,w:6,h:1},
      {x:30,y:20,w:5,h:1},
      {x:40,y:18,w:6,h:1},
      {x:54,y:22,w:8,h:1},
    ],
    traps:[
      {type:'hiddenSpike',x:22,y:24,w:2},
      {type:'disappear',x:32,y:20,w:2},
      {type:'pop',x:46,y:17,w:1}
    ],
    items:[
      {x:55*TILE,y:21*TILE,type:'sword'}
    ]
  },
  {
    w:80,h:40,
    player:{x:2*TILE,y:32*TILE},
    platforms:[
      {x:0,y:36,w:80,h:4},
      {x:10,y:30,w:5,h:1},
      {x:20,y:26,w:6,h:1},
      {x:32,y:22,w:4,h:1},
      {x:42,y:18,w:6,h:1},
      {x:56,y:20,w:6,h:1}
    ],
    traps:[
      {type:'fake',x:22,y:25,w:2},
      {type:'hiddenSpike',x:33,y:22,w:1},
      {type:'disappear',x:58,y:36,w:3}
    ],
    items:[
      {x:44*TILE,y:17*TILE,type:'sword'}
    ]
  },
  {
    w:90,h:42,
    player:{x:4*TILE,y:32*TILE},
    platforms:[
      {x:0,y:38,w:90,h:4},
      {x:12,y:32,w:6,h:1},
      {x:24,y:28,w:6,h:1},
      {x:36,y:24,w:6,h:1},
      {x:48,y:20,w:6,h:1},
      {x:60,y:16,w:6,h:1},
      {x:72,y:22,w:6,h:1}
    ],
    traps:[
      {type:'pop',x:25,y:27,w:1},
      {type:'hiddenSpike',x:49,y:20,w:2},
      {type:'disappear',x:62,y:38,w:2}
    ],
    items:[
      {x:70*TILE,y:21*TILE,type:'sword'}
    ]
  },
  {
    w:100,h:44,
    player:{x:3*TILE,y:34*TILE},
    platforms:[
      {x:0,y:40,w:100,h:4},
      {x:14,y:34,w:5,h:1},
      {x:26,y:30,w:5,h:1},
      {x:38,y:26,w:5,h:1},
      {x:50,y:22,w:5,h:1},
      {x:62,y:18,w:5,h:1},
      {x:74,y:24,w:6,h:1},
      {x:88,y:28,w:6,h:1}
    ],
    traps:[
      {type:'fake',x:30,y:29,w:2},
      {type:'hiddenSpike',x:52,y:21,w:2},
      {type:'pop',x:80,y:27,w:1}
    ],
    items:[
      {x:92*TILE,y:27*TILE,type:'sword'}
    ]
  },
  // two harder bonus levels
  {
    w:120,h:48,
    player:{x:4*TILE,y:38*TILE},
    platforms:[
      {x:0,y:44,w:120,h:4},
      {x:10,y:38,w:4,h:1},
      {x:22,y:34,w:4,h:1},
      {x:34,y:30,w:4,h:1},
      {x:46,y:26,w:4,h:1},
      {x:58,y:22,w:4,h:1},
      {x:70,y:18,w:6,h:1},
      {x:86,y:20,w:6,h:1},
      {x:100,y:24,w:4,h:1}
    ],
    traps:[
      {type:'hiddenSpike',x:24,y:34,w:1},
      {type:'disappear',x:36,y:30,w:2},
      {type:'fake',x:60,y:21,w:2},
      {type:'pop',x:74,y:17,w:1}
    ],
    items:[
      {x:102*TILE,y:23*TILE,type:'sword'}
    ]
  },
  {
    w:140,h:54,
    player:{x:6*TILE,y:40*TILE},
    platforms:[
      {x:0,y:50,w:140,h:4},
      {x:14,y:44,w:5,h:1},
      {x:30,y:40,w:5,h:1},
      {x:46,y:36,w:5,h:1},
      {x:62,y:32,w:5,h:1},
      {x:78,y:28,w:5,h:1},
      {x:94,y:24,w:5,h:1},
      {x:110,y:20,w:6,h:1}
    ],
    traps:[
      {type:'hiddenSpike',x:32,y:39,w:2},
      {type:'disappear',x:48,y:36,w:3},
      {type:'fake',x:66,y:31,w:2},
      {type:'pop',x:86,y:27,w:1},
      {type:'spikes',x:120,y:50,w:3}
    ],
    items:[
      {x:116*TILE,y:19*TILE,type:'sword'}
    ]
  }
];

let levelIndex = 0;
let state = null;

/* ------------- Player & physics ------------- */

function createStateForLevel(idx){
  const L = JSON.parse(JSON.stringify(levels[idx]));
  const player = {
    x: L.player.x, y: L.player.y, w:12, h:14,
    vx:0, vy:0, onGround:false, facing:1,
    alive:true, swords:0
  };
  // init trap states
  L.traps.forEach(t => {
    if(t.type==='disappear') t.timer = null, t.hidden=false;
    if(t.type==='pop') t.timer = 0, t.active=false;
    if(t.type==='hiddenSpike') t.revealed = false;
    if(t.type==='fake') t.fake = true;
  });
  L.items = L.items || [];
  return {level:L,player,camX:0,camY:0,elapsed:0};
}

/* ------------ Input handling -------------- */

const input = {left:false,right:false,jump:false};
function setupControls(){
  // keyboard
  window.addEventListener('keydown',e=>{
    if(!keyboardActive && !isMobile) keyboardActive = true;
    if(!keyboardActive) return;
    if(e.code==='KeyA' || e.code==='ArrowLeft') input.left = true;
    if(e.code==='KeyD' || e.code==='ArrowRight') input.right = true;
    if(e.code==='Space') input.jump = true;
  });
  window.addEventListener('keyup',e=>{
    if(e.code==='KeyA' || e.code==='ArrowLeft') input.left = false;
    if(e.code==='KeyD' || e.code==='ArrowRight') input.right = false;
    if(e.code==='Space') input.jump = false;
  });

  // mobile touch buttons
  leftBtn.addEventListener('touchstart',e=>{e.preventDefault();useTouchControls=true;input.left=true});
  leftBtn.addEventListener('touchend',e=>{e.preventDefault();input.left=false});
  rightBtn.addEventListener('touchstart',e=>{e.preventDefault();useTouchControls=true;input.right=true});
  rightBtn.addEventListener('touchend',e=>{e.preventDefault();input.right=false});
  jumpBtn.addEventListener('touchstart',e=>{e.preventDefault();useTouchControls=true;input.jump=true});
  jumpBtn.addEventListener('touchend',e=>{e.preventDefault();input.jump=false});

  // nipple joystick for mobile (optional)
  if(isMobile){
    const joyzone = document.createElement('div');
    joyzone.style.position='absolute';
    joyzone.style.left='18px';
    joyzone.style.bottom='18px';
    joyzone.style.width='120px';
    joyzone.style.height='120px';
    joyzone.style.zIndex='2';
    joyzone.style.touchAction='none';
    document.body.appendChild(joyzone);
    const manager = nipplejs.create({zone:joyzone,mode:'static',position:{left:'60px',top:'60px'},color:'rgba(255,255,255,0.15)'});
    manager.on('move', (evt, data) => {
      const angle = data.angle ? data.angle.radian : 0;
      const dist = data.distance || 0;
      input.left = false; input.right = false;
      if(dist>10){
        if(Math.cos(angle)>0) input.right = true;
        else input.left = true;
      }
    });
    manager.on('end', ()=>{ input.left=false; input.right=false; });
  }
}
setupControls();

/* --------------- Collision helpers -------------- */

function rectIntersect(a,b){
  return !(a.x+a.w<=b.x || a.x>=b.x+b.w || a.y+a.h<=b.y || a.y>=b.y+b.h);
}

/* --------------- Game loop & logic --------------- */

function startLevel(idx){
  levelIndex = idx;
  state = createStateForLevel(idx);
  startScreen.classList.add('hidden');
  hud.classList.remove('hidden');
  gameOverEl.classList.add('hidden');
  // show mobile left/right controls and separate jump button when touch controls are enabled
  const showMobile = (isMobile && useTouchControls);
  mobileControls.classList.toggle('hidden', !showMobile);
  jumpBtn.classList.toggle('hidden', !showMobile);
  levelText.textContent = `Level ${idx+1}`;
  swordCountEl.textContent = `Espada: ${state.player.swords}`;
}

function restartLevel(){
  startLevel(levelIndex);
}

function nextLevel(){
  if(levelIndex < levels.length-1) levelIndex++;
  startLevel(levelIndex);
}

/* trap collision & behavior */
function checkTraps(player, lvl){
  // convert player rect to tiles for checking
  for(const t of lvl.traps){
    const trapRect = {x:t.x*TILE, y:t.y*TILE, w:(t.w||1)*TILE, h:TILE};

    // visible spike tiles always lethal
    if(t.type==='spikes'){
      if(rectIntersect(player,trapRect)) return 'death';
    }

    // disappear floors: only affect solidity/falling, not lethal
    if(t.type==='disappear'){
      if(t.hidden) continue;
      if(rectIntersect(player,trapRect)){
        // stepping on vanish floor: start timer
        t.timer = t.timer===null ? 0 : t.timer;
        t.timer += dt;
        if(t.timer>0.25){
          t.hidden = true; // disappears
        }
      } else {
        t.timer = null;
      }
      // no lethal effect here
    }

    // hidden spikes are spikes too: reveal on proximity and then become lethal
    if(t.type==='hiddenSpike'){
      const revealZone = {x:(t.x-1)*TILE,y:(t.y-1)*TILE,w:3*TILE,h:3*TILE};
      if(rectIntersect(player,revealZone)) t.revealed = true;
      if(t.revealed && rectIntersect(player,trapRect)) return 'death';
    }

    // fake platforms should not kill; they just are non-solid (player will fall)
    if(t.type==='fake'){
      // no lethal effect; physics handles falling through
    }

    // pop platforms: appear after a delay but are non-lethal (they only act as platforms)
    if(t.type==='pop'){
      const triggerZone = {x:(t.x-2)*TILE,y:(t.y-2)*TILE,w:5*TILE,h:5*TILE};
      if(rectIntersect(player,triggerZone)){
        t.active = true;
        t.timer += dt;
        // pop becomes solid after timer but does not kill
      } else {
        t.active = false;
        t.timer = 0;
      }
    }
  }
  return 'alive';
}

/* item collection */
function checkItems(player, lvl){
  for(let i=lvl.items.length-1;i>=0;i--){
    const it = lvl.items[i];
    const rect = {x:it.x, y:it.y, w:12, h:12};
    if(rectIntersect(player,rect)){
      if(it.type==='sword'){
        player.swords++;
        lvl.items.splice(i,1);
        // small effect: grant temporary invulnerability or score (not implemented)
      }
    }
  }
}

/* platform collision with floor/platforms */
function resolveCollisions(player, lvl){
  player.onGround = false;
  // treat each platform block as rect
  for(const p of lvl.platforms){
    // if platform has been removed under the type disappear trap, we handle via traps array removing collision:
    const platRect = {x:p.x*TILE, y:p.y*TILE, w:p.w*TILE, h:p.h*TILE};

    // Determine if this platform area overlaps any visible spikes; if so treat that overlapping area as non-solid
    let overlapsVisibleSpike = false;
    for(const t of lvl.traps){
      if(t.type === 'spikes' && !t.hidden){
        const spikeRect = {x:t.x*TILE, y:t.y*TILE, w:(t.w||1)*TILE, h:TILE};
        // if spike sits exactly on top of this platform area (or overlaps horizontally and same y)
        if(!(spikeRect.x + spikeRect.w <= platRect.x || spikeRect.x >= platRect.x + platRect.w) &&
           spikeRect.y === platRect.y){
          overlapsVisibleSpike = true;
          break;
        }
      }
    }

    if(player.vy >= 0){ // only check platform collision when moving down (basic)
      const foot = {x:player.x, y:player.y+player.h, w:player.w, h:2};
      // if platform overlaps visible spike and foot intersects that spike region, skip making it solid so spikes can kill
      if(rectIntersect(foot, platRect)){
        if(overlapsVisibleSpike){
          // check if foot intersects the spike area specifically; if so, do not treat as ground
          let footOnSpikeArea = false;
          for(const t of lvl.traps){
            if(t.type === 'spikes' && !t.hidden){
              const spikeRect = {x:t.x*TILE, y:t.y*TILE, w:(t.w||1)*TILE, h:TILE};
              if(rectIntersect(foot, spikeRect)){
                footOnSpikeArea = true;
                break;
              }
            }
          }
          if(!footOnSpikeArea){
            player.y = platRect.y - player.h;
            player.vy = 0;
            player.onGround = true;
          }
        } else {
          player.y = platRect.y - player.h;
          player.vy = 0;
          player.onGround = true;
        }
      }
    }
    // side collisions (basic)
    const playerRect = {x:player.x, y:player.y, w:player.w, h:player.h};
    if(rectIntersect(playerRect, platRect)){
      // basic resolution push out upwards if inside, but avoid pushing up if overlapping visible spikes
      if(player.vy > 0){
        let insideSpike = false;
        for(const t of lvl.traps){
          if(t.type === 'spikes' && !t.hidden){
            const spikeRect = {x:t.x*TILE, y:t.y*TILE, w:(t.w||1)*TILE, h:TILE};
            if(rectIntersect(playerRect, spikeRect)){
              insideSpike = true;
              break;
            }
          }
        }
        if(!insideSpike){
          player.y = platRect.y - player.h;
          player.vy = 0;
          player.onGround = true;
        }
      } else if(player.vy < 0){
        player.y = platRect.y + platRect.h;
        player.vy = 0;
      }
    }
  }
}

/* main update */
let lastTime = performance.now();
let running=false;
let dt=0;

function update(now){
  dt = Math.min(1/30, (now - lastTime)/1000);
  lastTime = now;
  if(!state){ requestAnimationFrame(update); return; }
  const p = state.player;
  const lvl = state.level;
  state.elapsed += dt;

  // input -> velocity
  let target = 0;
  if((keyboardActive && (input.left || input.right)) || (useTouchControls && (input.left||input.right))){
    if(input.left) target = -MOVE_SPEED;
    else if(input.right) target = MOVE_SPEED;
  }
  // smoother horizontal movement with acceleration and friction
  if(target !== 0){
    if(p.vx < target){
      p.vx = Math.min(target, p.vx + ACCEL * dt);
    } else if(p.vx > target){
      p.vx = Math.max(target, p.vx - ACCEL * dt);
    }
  } else {
    // apply friction when no horizontal input and on ground
    if(p.onGround){
      p.vx *= Math.pow(FRICTION, dt * 60);
      if(Math.abs(p.vx) < 1) p.vx = 0;
    } else {
      // mild air control
      if(p.vx < target) p.vx = Math.min(target, p.vx + (ACCEL*0.35) * dt);
      if(p.vx > target) p.vx = Math.max(target, p.vx - (ACCEL*0.35) * dt);
    }
  }

  if(input.jump && p.onGround){
    p.vy = JUMP_V;
    p.onGround = false;
  }

  // physics
  p.vy += GRAVITY * dt;
  p.x += p.vx * dt;
  p.y += p.vy * dt;

  // world bounds
  if(p.x < 0) p.x = 0;
  if(p.x + p.w > lvl.w*TILE) p.x = lvl.w*TILE - p.w;
  if(p.y > lvl.h*TILE + 200){ // fell off map
    playerDie();
  }

  // collisions
  resolveCollisions(p,lvl);

  // traps
  const trapResult = checkTraps(p,lvl);
  if(trapResult === 'death') playerDie();

  // items
  checkItems(p,lvl);

  // camera follow
  state.camX = Math.max(0, Math.min((lvl.w*TILE)-canvas.width, p.x - canvas.width/2 + p.w/2));
  state.camY = Math.max(0, Math.min((lvl.h*TILE)-canvas.height, p.y - canvas.height/2 + p.h/2));

  render();

  if(running) requestAnimationFrame(update);
}

function playerDie(){
  state.player.alive = false;
  gameOverEl.classList.remove('hidden');
  running = false;
}

/* ------------ Rendering (pixel art) ------------- */

function drawTileRect(x,y,w,h,color){
  ctx.fillStyle = color;
  ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
}

function render(){
  // clear (light blue background)
  ctx.fillStyle = '#cfefff';
  ctx.fillRect(0,0,canvas.width,canvas.height);

  const camX = Math.floor(state.camX);
  const camY = Math.floor(state.camY);

  // draw platforms
  for(const p of state.level.platforms){
    drawTileRect(p.x*TILE - camX, p.y*TILE - camY, p.w*TILE, p.h*TILE, '#dfe6e9');
    // simple shading lines
    ctx.fillStyle = 'rgba(0,0,0,0.06)';
    ctx.fillRect(p.x*TILE - camX, p.y*TILE - camY, p.w*TILE, 2);
  }

  // draw traps
  for(const t of state.level.traps){
    const x = t.x*TILE - camX;
    const y = t.y*TILE - camY;
    const w = (t.w||1)*TILE;
    if(t.type==='spikes'){
      // visible spikes
      ctx.fillStyle = '#ff6666';
      for(let i=0;i<w;i++){
        ctx.beginPath();
        ctx.moveTo(x+i*TILE, y+TILE);
        ctx.lineTo(x+i*TILE + TILE/2, y);
        ctx.lineTo(x+i*TILE + TILE, y+TILE);
        ctx.closePath();
        ctx.fill();
      }
    } else if(t.type==='disappear'){
      if(!t.hidden){
        ctx.fillStyle = '#ffeaa7';
        ctx.fillRect(x,y,w,TILE);
      }
    } else if(t.type==='hiddenSpike'){
      if(t.revealed){
        ctx.fillStyle = '#ff8b94';
        for(let i=0;i<w;i++){
          ctx.beginPath();
          ctx.moveTo(x+i*TILE, y+TILE);
          ctx.lineTo(x+i*TILE + TILE/2, y);
          ctx.lineTo(x+i*TILE + TILE, y+TILE);
          ctx.closePath();
          ctx.fill();
        }
      }
    } else if(t.type==='fake'){
      // draw same as platform but faint
      ctx.fillStyle = 'rgba(223,230,233,0.35)';
      ctx.fillRect(x,y,w,TILE);
    } else if(t.type==='pop'){
      if(t.timer>0.25){
        ctx.fillStyle = '#b2bec3';
        ctx.fillRect(x,y,w,TILE);
      } else {
        // subtle marker (hidden until pops)
      }
    }
  }

  // draw items (sword)
  for(const it of state.level.items){
    if(it.type==='sword'){
      drawSword(it.x - camX, it.y - camY);
    }
  }

  // draw player (small black pixel-art man)
  const p = state.player;
  const px = Math.round(p.x - camX);
  const py = Math.round(p.y - camY);

  // body rectangle base (torso)
  ctx.fillStyle = '#0b0b0b'; // dark skin / body color
  ctx.fillRect(px, py, p.w, p.h);

  // head (slightly above body)
  ctx.fillStyle = '#0b0b0b';
  ctx.fillRect(px+2, py-6, 8, 6);

  // shirt (a subtle dark gray)
  ctx.fillStyle = '#222425';
  ctx.fillRect(px+1, py+2, p.w-2, 6);

  // arms (small rectangles)
  ctx.fillStyle = '#0b0b0b';
  ctx.fillRect(px-2, py+4, 3, 6);
  ctx.fillRect(px + p.w-1, py+4, 3, 6);

  // legs (split)
  ctx.fillStyle = '#111214';
  ctx.fillRect(px+1, py+10, 4, 6);
  ctx.fillRect(px+7, py+10, 4, 6);

  // simple eyes (tiny highlights)
  ctx.fillStyle = '#fff';
  ctx.fillRect(px+3, py-4, 1, 1);
  ctx.fillRect(px+8, py-4, 1, 1);

  // small mouth
  ctx.fillStyle = '#6b6b6b';
  ctx.fillRect(px+5, py-2, 2, 1);

  // sword on player if has sword (visual)
  if(p.swords>0){
    drawMinimport nipplejs from "nipplejs";

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d', {alpha:false});
const DPR = Math.max(1, window.devicePixelRatio || 1);
canvas.width = 960;
canvas.height = 540;

const startScreen = document.getElementById('startScreen');
const playBtn = document.getElementById('playBtn');
const hud = document.getElementById('hud');
const levelText = document.getElementById('levelText');
const swordCountEl = document.getElementById('swordCount');
const gameOverEl = document.getElementById('gameOver');
const retryBtn = document.getElementById('retryBtn');
const mobileControls = document.getElementById('mobileControls');
const leftBtn = document.getElementById('leftBtn');
const rightBtn = document.getElementById('rightBtn');
const jumpBtn = document.getElementById('jumpBtn');

let isMobile = /Mobi|Android|iPhone|iPad/.test(navigator.userAgent);
let useTouchControls = false;
let keyboardActive = false;

function detectDevice() {
  if (isMobile) {
    // Wait for first touch to enable on-screen controls
    const onFirstTouch = () => {
      useTouchControls = true;
      mobileControls.classList.remove('hidden');
      window.removeEventListener('touchstart', onFirstTouch, {once:true});
    };
    window.addEventListener('touchstart', onFirstTouch, {once:true});
  } else {
    // Wait for any key to enable keyboard controls
    const onFirstKey = () => {
      keyboardActive = true;
      window.removeEventListener('keydown', onFirstKey, {once:true});
    };
    window.addEventListener('keydown', onFirstKey, {once:true});
  }
}
detectDevice();

/* -----------------------------
   Simple pixel art tile system
   ----------------------------- */

const TILE = 16; // logical pixel size for drawing tiles (pixel art scale)
const SCALE = 3; // render scale (we will scale sprites when drawing)
const GRAVITY = 1200;
const JUMP_V = -560; // slightly stronger jump for livelier feel
const MOVE_SPEED = 220; // a bit faster
const ACCEL = 2200; // horizontal acceleration (px/s^2)
const FRICTION = 0.85; // ground friction factor applied when no input

const levels = [
  // 7 levels incremental difficulty (can be expanded to 10)
  // Each level: width, height (in tiles), player start, platforms array, traps array, items
  // platforms: {x,y,w,h}
  // traps types: 'spikes' (visible), 'disappear' (floor that vanishes when stepped), 'hiddenSpike' (invisible until activated), 'fake' (looks like platform but not solid), 'pop' (appears after stepping on certain tile)
  // items: {x,y,type}
  {
    w:60,h:34,
    player:{x:4*TILE,y:28*TILE},
    platforms:[
      {x:0,y:30,w:60,h:4},
      {x:6,y:24,w:6,h:1},
      {x:16,y:20,w:6,h:1},
      {x:28,y:16,w:8,h:1},
      {x:44,y:22,w:6,h:1}
    ],
    traps:[
      {type:'spikes',x:12,y:30,w:2},
      {type:'disappear',x:20,y:30,w:3},
      {type:'fake',x:34,y:29,w:2},
    ],
    items:[
      {x:30*TILE,y:15*TILE,type:'sword'}
    ]
  },
  {
    w:70,h:38,
    player:{x:3*TILE,y:30*TILE},
    platforms:[
      {x:0,y:34,w:70,h:4},
      {x:8,y:28,w:4,h:1},
      {x:18,y:24,w:6,h:1},
      {x:30,y:20,w:5,h:1},
      {x:40,y:18,w:6,h:1},
      {x:54,y:22,w:8,h:1},
    ],
    traps:[
      {type:'hiddenSpike',x:22,y:24,w:2},
      {type:'disappear',x:32,y:20,w:2},
      {type:'pop',x:46,y:17,w:1}
    ],
    items:[
      {x:55*TILE,y:21*TILE,type:'sword'}
    ]
  },
  {
    w:80,h:40,
    player:{x:2*TILE,y:32*TILE},
    platforms:[
      {x:0,y:36,w:80,h:4},
      {x:10,y:30,w:5,h:1},
      {x:20,y:26,w:6,h:1},
      {x:32,y:22,w:4,h:1},
      {x:42,y:18,w:6,h:1},
      {x:56,y:20,w:6,h:1}
    ],
    traps:[
      {type:'fake',x:22,y:25,w:2},
      {type:'hiddenSpike',x:33,y:22,w:1},
      {type:'disappear',x:58,y:36,w:3}
    ],
    items:[
      {x:44*TILE,y:17*TILE,type:'sword'}
    ]
  },
  {
    w:90,h:42,
    player:{x:4*TILE,y:32*TILE},
    platforms:[
      {x:0,y:38,w:90,h:4},
      {x:12,y:32,w:6,h:1},
      {x:24,y:28,w:6,h:1},
      {x:36,y:24,w:6,h:1},
      {x:48,y:20,w:6,h:1},
      {x:60,y:16,w:6,h:1},
      {x:72,y:22,w:6,h:1}
    ],
    traps:[
      {type:'pop',x:25,y:27,w:1},
      {type:'hiddenSpike',x:49,y:20,w:2},
      {type:'disappear',x:62,y:38,w:2}
    ],
    items:[
      {x:70*TILE,y:21*TILE,type:'sword'}
    ]
  },
  {
    w:100,h:44,
    player:{x:3*TILE,y:34*TILE},
    platforms:[
      {x:0,y:40,w:100,h:4},
      {x:14,y:34,w:5,h:1},
      {x:26,y:30,w:5,h:1},
      {x:38,y:26,w:5,h:1},
      {x:50,y:22,w:5,h:1},
      {x:62,y:18,w:5,h:1},
      {x:74,y:24,w:6,h:1},
      {x:88,y:28,w:6,h:1}
    ],
    traps:[
      {type:'fake',x:30,y:29,w:2},
      {type:'hiddenSpike',x:52,y:21,w:2},
      {type:'pop',x:80,y:27,w:1}
    ],
    items:[
      {x:92*TILE,y:27*TILE,type:'sword'}
    ]
  },
  // two harder bonus levels
  {
    w:120,h:48,
    player:{x:4*TILE,y:38*TILE},
    platforms:[
      {x:0,y:44,w:120,h:4},
      {x:10,y:38,w:4,h:1},
      {x:22,y:34,w:4,h:1},
      {x:34,y:30,w:4,h:1},
      {x:46,y:26,w:4,h:1},
      {x:58,y:22,w:4,h:1},
      {x:70,y:18,w:6,h:1},
      {x:86,y:20,w:6,h:1},
      {x:100,y:24,w:4,h:1}
    ],
    traps:[
      {type:'hiddenSpike',x:24,y:34,w:1},
      {type:'disappear',x:36,y:30,w:2},
      {type:'fake',x:60,y:21,w:2},
      {type:'pop',x:74,y:17,w:1}
    ],
    items:[
      {x:102*TILE,y:23*TILE,type:'sword'}
    ]
  },
  {
    w:140,h:54,
    player:{x:6*TILE,y:40*TILE},
    platforms:[
      {x:0,y:50,w:140,h:4},
      {x:14,y:44,w:5,h:1},
      {x:30,y:40,w:5,h:1},
      {x:46,y:36,w:5,h:1},
      {x:62,y:32,w:5,h:1},
      {x:78,y:28,w:5,h:1},
      {x:94,y:24,w:5,h:1},
      {x:110,y:20,w:6,h:1}
    ],
    traps:[
      {type:'hiddenSpike',x:32,y:39,w:2},
      {type:'disappear',x:48,y:36,w:3},
      {type:'fake',x:66,y:31,w:2},
      {type:'pop',x:86,y:27,w:1},
      {type:'spikes',x:120,y:50,w:3}
    ],
    items:[
      {x:116*TILE,y:19*TILE,type:'sword'}
    ]
  }
];

let levelIndex = 0;
let state = null;

/* ------------- Player & physics ------------- */

function createStateForLevel(idx){
  const L = JSON.parse(JSON.stringify(levels[idx]));
  const player = {
    x: L.player.x, y: L.player.y, w:12, h:14,
    vx:0, vy:0, onGround:false, facing:1,
    alive:true, swords:0
  };
  // init trap states
  L.traps.forEach(t => {
    if(t.type==='disappear') t.timer = null, t.hidden=false;
    if(t.type==='pop') t.timer = 0, t.active=false;
    if(t.type==='hiddenSpike') t.revealed = false;
    if(t.type==='fake') t.fake = true;
  });
  L.items = L.items || [];
  return {level:L,player,camX:0,camY:0,elapsed:0};
}

/* ------------ Input handling -------------- */

const input = {left:false,right:false,jump:false};
function setupControls(){
  // keyboard
  window.addEventListener('keydown',e=>{
    if(!keyboardActive && !isMobile) keyboardActive = true;
    if(!keyboardActive) return;
    if(e.code==='KeyA' || e.code==='ArrowLeft') input.left = true;
    if(e.code==='KeyD' || e.code==='ArrowRight') input.right = true;
    if(e.code==='Space') input.jump = true;
  });
  window.addEventListener('keyup',e=>{
    if(e.code==='KeyA' || e.code==='ArrowLeft') input.left = false;
    if(e.code==='KeyD' || e.code==='ArrowRight') input.right = false;
    if(e.code==='Space') input.jump = false;
  });

  // mobile touch buttons
  leftBtn.addEventListener('touchstart',e=>{e.preventDefault();useTouchControls=true;input.left=true});
  leftBtn.addEventListener('touchend',e=>{e.preventDefault();input.left=false});
  rightBtn.addEventListener('touchstart',e=>{e.preventDefault();useTouchControls=true;input.right=true});
  rightBtn.addEventListener('touchend',e=>{e.preventDefault();input.right=false});
  jumpBtn.addEventListener('touchstart',e=>{e.preventDefault();useTouchControls=true;input.jump=true});
  jumpBtn.addEventListener('touchend',e=>{e.preventDefault();input.jump=false});

  // nipple joystick for mobile (optional)
  if(isMobile){
    const joyzone = document.createElement('div');
    joyzone.style.position='absolute';
    joyzone.style.left='18px';
    joyzone.style.bottom='18px';
    joyzone.style.width='120px';
    joyzone.style.height='120px';
    joyzone.style.zIndex='2';
    joyzone.style.touchAction='none';
    document.body.appendChild(joyzone);
    const manager = nipplejs.create({zone:joyzone,mode:'static',position:{left:'60px',top:'60px'},color:'rgba(255,255,255,0.15)'});
    manager.on('move', (evt, data) => {
      const angle = data.angle ? data.angle.radian : 0;
      const dist = data.distance || 0;
      input.left = false; input.right = false;
      if(dist>10){
        if(Math.cos(angle)>0) input.right = true;
        else input.left = true;
      }
    });
    manager.on('end', ()=>{ input.left=false; input.right=false; });
  }
}
setupControls();

/* --------------- Collision helpers -------------- */

function rectIntersect(a,b){
  return !(a.x+a.w<=b.x || a.x>=b.x+b.w || a.y+a.h<=b.y || a.y>=b.y+b.h);
}

/* --------------- Game loop & logic --------------- */

function startLevel(idx){
  levelIndex = idx;
  state = createStateForLevel(idx);
  startScreen.classList.add('hidden');
  hud.classList.remove('hidden');
  gameOverEl.classList.add('hidden');
  // show mobile left/right controls and separate jump button when touch controls are enabled
  const showMobile = (isMobile && useTouchControls);
  mobileControls.classList.toggle('hidden', !showMobile);
  jumpBtn.classList.toggle('hidden', !showMobile);
  levelText.textContent = `Level ${idx+1}`;
  swordCountEl.textContent = `Espada: ${state.player.swords}`;
}

function restartLevel(){
  startLevel(levelIndex);
}

function nextLevel(){
  if(levelIndex < levels.length-1) levelIndex++;
  startLevel(levelIndex);
}

/* trap collision & behavior */
function checkTraps(player, lvl){
  // convert player rect to tiles for checking
  for(const t of lvl.traps){
    const trapRect = {x:t.x*TILE, y:t.y*TILE, w:(t.w||1)*TILE, h:TILE};

    // visible spike tiles always lethal
    if(t.type==='spikes'){
      if(rectIntersect(player,trapRect)) return 'death';
    }

    // disappear floors: only affect solidity/falling, not lethal
    if(t.type==='disappear'){
      if(t.hidden) continue;
      if(rectIntersect(player,trapRect)){
        // stepping on vanish floor: start timer
        t.timer = t.timer===null ? 0 : t.timer;
        t.timer += dt;
        if(t.timer>0.25){
          t.hidden = true; // disappears
        }
      } else {
        t.timer = null;
      }
      // no lethal effect here
    }

    // hidden spikes are spikes too: reveal on proximity and then become lethal
    if(t.type==='hiddenSpike'){
      const revealZone = {x:(t.x-1)*TILE,y:(t.y-1)*TILE,w:3*TILE,h:3*TILE};
      if(rectIntersect(player,revealZone)) t.revealed = true;
      if(t.revealed && rectIntersect(player,trapRect)) return 'death';
    }

    // fake platforms should not kill; they just are non-solid (player will fall)
    if(t.type==='fake'){
      // no lethal effect; physics handles falling through
    }

    // pop platforms: appear after a delay but are non-lethal (they only act as platforms)
    if(t.type==='pop'){
      const triggerZone = {x:(t.x-2)*TILE,y:(t.y-2)*TILE,w:5*TILE,h:5*TILE};
      if(rectIntersect(player,triggerZone)){
        t.active = true;
        t.timer += dt;
        // pop becomes solid after timer but does not kill
      } else {
        t.active = false;
        t.timer = 0;
      }
    }
  }
  return 'alive';
}

/* item collection */
function checkItems(player, lvl){
  for(let i=lvl.items.length-1;i>=0;i--){
    const it = lvl.items[i];
    const rect = {x:it.x, y:it.y, w:12, h:12};
    if(rectIntersect(player,rect)){
      if(it.type==='sword'){
        player.swords++;
        lvl.items.splice(i,1);
        // small effect: grant temporary invulnerability or score (not implemented)
      }
    }
  }
}

/* platform collision with floor/platforms */
function resolveCollisions(player, lvl){
  player.onGround = false;
  // treat each platform block as rect
  for(const p of lvl.platforms){
    // if platform has been removed under the type disappear trap, we handle via traps array removing collision:
    const platRect = {x:p.x*TILE, y:p.y*TILE, w:p.w*TILE, h:p.h*TILE};

    // Determine if this platform area overlaps any visible spikes; if so treat that overlapping area as non-solid
    let overlapsVisibleSpike = false;
    for(const t of lvl.traps){
      if(t.type === 'spikes' && !t.hidden){
        const spikeRect = {x:t.x*TILE, y:t.y*TILE, w:(t.w||1)*TILE, h:TILE};
        // if spike sits exactly on top of this platform area (or overlaps horizontally and same y)
        if(!(spikeRect.x + spikeRect.w <= platRect.x || spikeRect.x >= platRect.x + platRect.w) &&
           spikeRect.y === platRect.y){
          overlapsVisibleSpike = true;
          break;
        }
      }
    }

    if(player.vy >= 0){ // only check platform collision when moving down (basic)
      const foot = {x:player.x, y:player.y+player.h, w:player.w, h:2};
      // if platform overlaps visible spike and foot intersects that spike region, skip making it solid so spikes can kill
      if(rectIntersect(foot, platRect)){
        if(overlapsVisibleSpike){
          // check if foot intersects the spike area specifically; if so, do not treat as ground
          let footOnSpikeArea = false;
          for(const t of lvl.traps){
            if(t.type === 'spikes' && !t.hidden){
              const spikeRect = {x:t.x*TILE, y:t.y*TILE, w:(t.w||1)*TILE, h:TILE};
              if(rectIntersect(foot, spikeRect)){
                footOnSpikeArea = true;
                break;
              }
            }
          }
          if(!footOnSpikeArea){
            player.y = platRect.y - player.h;
            player.vy = 0;
            player.onGround = true;
          }
        } else {
          player.y = platRect.y - player.h;
          player.vy = 0;
          player.onGround = true;
        }
      }
    }
    // side collisions (basic)
    const playerRect = {x:player.x, y:player.y, w:player.w, h:player.h};
    if(rectIntersect(playerRect, platRect)){
      // basic resolution push out upwards if inside, but avoid pushing up if overlapping visible spikes
      if(player.vy > 0){
        let insideSpike = false;
        for(const t of lvl.traps){
          if(t.type === 'spikes' && !t.hidden){
            const spikeRect = {x:t.x*TILE, y:t.y*TILE, w:(t.w||1)*TILE, h:TILE};
            if(rectIntersect(playerRect, spikeRect)){
              insideSpike = true;
              break;
            }
          }
        }
        if(!insideSpike){
          player.y = platRect.y - player.h;
          player.vy = 0;
          player.onGround = true;
        }
      } else if(player.vy < 0){
        player.y = platRect.y + platRect.h;
        player.vy = 0;
      }
    }
  }
}

/* main update */
let lastTime = performance.now();
let running=false;
let dt=0;

function update(now){
  dt = Math.min(1/30, (now - lastTime)/1000);
  lastTime = now;
  if(!state){ requestAnimationFrame(update); return; }
  const p = state.player;
  const lvl = state.level;
  state.elapsed += dt;

  // input -> velocity
  let target = 0;
  if((keyboardActive && (input.left || input.right)) || (useTouchControls && (input.left||input.right))){
    if(input.left) target = -MOVE_SPEED;
    else if(input.right) target = MOVE_SPEED;
  }
  // smoother horizontal movement with acceleration and friction
  if(target !== 0){
    if(p.vx < target){
      p.vx = Math.min(target, p.vx + ACCEL * dt);
    } else if(p.vx > target){
      p.vx = Math.max(target, p.vx - ACCEL * dt);
    }
  } else {
    // apply friction when no horizontal input and on ground
    if(p.onGround){
      p.vx *= Math.pow(FRICTION, dt * 60);
      if(Math.abs(p.vx) < 1) p.vx = 0;
    } else {
      // mild air control
      if(p.vx < target) p.vx = Math.min(target, p.vx + (ACCEL*0.35) * dt);
      if(p.vx > target) p.vx = Math.max(target, p.vx - (ACCEL*0.35) * dt);
    }
  }

  if(input.jump && p.onGround){
    p.vy = JUMP_V;
    p.onGround = false;
  }

  // physics
  p.vy += GRAVITY * dt;
  p.x += p.vx * dt;
  p.y += p.vy * dt;

  // world bounds
  if(p.x < 0) p.x = 0;
  if(p.x + p.w > lvl.w*TILE) p.x = lvl.w*TILE - p.w;
  if(p.y > lvl.h*TILE + 200){ // fell off map
    playerDie();
  }

  // collisions
  resolveCollisions(p,lvl);

  // traps
  const trapResult = checkTraps(p,lvl);
  if(trapResult === 'death') playerDie();

  // items
  checkItems(p,lvl);

  // camera follow
  state.camX = Math.max(0, Math.min((lvl.w*TILE)-canvas.width, p.x - canvas.width/2 + p.w/2));
  state.camY = Math.max(0, Math.min((lvl.h*TILE)-canvas.height, p.y - canvas.height/2 + p.h/2));

  render();

  if(running) requestAnimationFrame(update);
}

function playerDie(){
  state.player.alive = false;
  gameOverEl.classList.remove('hidden');
  running = false;
}

/* ------------ Rendering (pixel art) ------------- */

function drawTileRect(x,y,w,h,color){
  ctx.fillStyle = color;
  ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
}

function render(){
  // clear (light blue background)
  ctx.fillStyle = '#cfefff';
  ctx.fillRect(0,0,canvas.width,canvas.height);

  const camX = Math.floor(state.camX);
  const camY = Math.floor(state.camY);

  // draw platforms
  for(const p of state.level.platforms){
    drawTileRect(p.x*TILE - camX, p.y*TILE - camY, p.w*TILE, p.h*TILE, '#dfe6e9');
    // simple shading lines
    ctx.fillStyle = 'rgba(0,0,0,0.06)';
    ctx.fillRect(p.x*TILE - camX, p.y*TILE - camY, p.w*TILE, 2);
  }

  // draw traps
  for(const t of state.level.traps){
    const x = t.x*TILE - camX;
    const y = t.y*TILE - camY;
    const w = (t.w||1)*TILE;
    if(t.type==='spikes'){
      // visible spikes
      ctx.fillStyle = '#ff6666';
      for(let i=0;i<w;i++){
        ctx.beginPath();
        ctx.moveTo(x+i*TILE, y+TILE);
        ctx.lineTo(x+i*TILE + TILE/2, y);
        ctx.lineTo(x+i*TILE + TILE, y+TILE);
        ctx.closePath();
        ctx.fill();
      }
    } else if(t.type==='disappear'){
      if(!t.hidden){
        ctx.fillStyle = '#ffeaa7';
        ctx.fillRect(x,y,w,TILE);
      }
    } else if(t.type==='hiddenSpike'){
      if(t.revealed){
        ctx.fillStyle = '#ff8b94';
        for(let i=0;i<w;i++){
          ctx.beginPath();
          ctx.moveTo(x+i*TILE, y+TILE);
          ctx.lineTo(x+i*TILE + TILE/2, y);
          ctx.lineTo(x+i*TILE + TILE, y+TILE);
          ctx.closePath();
          ctx.fill();
        }
      }
    } else if(t.type==='fake'){
      // draw same as platform but faint
      ctx.fillStyle = 'rgba(223,230,233,0.35)';
      ctx.fillRect(x,y,w,TILE);
    } else if(t.type==='pop'){
      if(t.timer>0.25){
        ctx.fillStyle = '#b2bec3';
        ctx.fillRect(x,y,w,TILE);
      } else {
        // subtle marker (hidden until pops)
      }
    }
  }

  // draw items (sword)
  for(const it of state.level.items){
    if(it.type==='sword'){
      drawSword(it.x - camX, it.y - camY);
    }
  }

  // draw player (small black pixel-art man)
  const p = state.player;
  const px = Math.round(p.x - camX);
  const py = Math.round(p.y - camY);

  // body rectangle base (torso)
  ctx.fillStyle = '#0b0b0b'; // dark skin / body color
  ctx.fillRect(px, py, p.w, p.h);

  // head (slightly above body)
  ctx.fillStyle = '#0b0b0b';
  ctx.fillRect(px+2, py-6, 8, 6);

  // shirt (a subtle dark gray)
  ctx.fillStyle = '#222425';
  ctx.fillRect(px+1, py+2, p.w-2, 6);

  // arms (small rectangles)
  ctx.fillStyle = '#0b0b0b';
  ctx.fillRect(px-2, py+4, 3, 6);
  ctx.fillRect(px + p.w-1, py+4, 3, 6);

  // legs (split)
  ctx.fillStyle = '#111214';
  ctx.fillRect(px+1, py+10, 4, 6);
  ctx.fillRect(px+7, py+10, 4, 6);

  // simple eyes (tiny highlights)
  ctx.fillStyle = '#fff';
  ctx.fillRect(px+3, py-4, 1, 1);
  ctx.fillRect(px+8, py-4, 1, 1);

  // small mouth
  ctx.fillStyle = '#6b6b6b';
  ctx.fillRect(px+5, py-2, 2, 1);

  // sword on player if has sword (visual)
  if(p.swords>0){
    drawMin
