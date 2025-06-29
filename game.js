// == UI helpers ==
const ui = document.getElementById('ui');
function showMenu(html) {
  ui.innerHTML = html;
  ui.querySelector('.menu-screen')?.focus();
  ui.style.display = '';
}
function hideMenu() { ui.innerHTML = ''; ui.style.display = 'none'; }

// == Game data ==
const LEVELS = [
  {
    name: "Neon City",
    bg: "linear-gradient(135deg, #232526 0%, #6ee2f5 100%)",
    gravity: 0.6,
    speed: 4.2,
    fog: false
  },
  {
    name: "Cyber Desert",
    bg: "linear-gradient(135deg, #fceabb 0%, #f8b500 100%)",
    gravity: 0.48,
    speed: 4.6,
    fog: false
  },
  {
    name: "Frozen Neon Wasteland",
    bg: "linear-gradient(135deg, #a1c4fd 0%, #c2e9fb 100%)",
    gravity: 0.34,
    speed: 4.1,
    fog: true
  }
];
const SKINS = [
  {name:"Classic", colors:["#ffe066","#6ee2f5","#ff6ec7"]},
  {name:"Blue",    colors:["#6ee2f5","#9f6eff","#23243a"]},
  {name:"Purple",  colors:["#9f6eff","#ffe066","#23243a"]},
  {name:"Pink",    colors:["#ff6ec7","#ffe066","#6ee2f5"]},
];
const UPGRADE_COSTS = { doubleJump: 500, shield: 300, boost: 400 };
const SKIN_COSTS =   [0, 200, 200, 200];
const MODIFIERS = [
  {name:"Магнит", key:"magnet", descr:"Монеты тянутся, но скорость +30%", icon:"🧲"},
  {name:"Ускорение", key:"fast", descr:"Всё быстрее", icon:"⏱"},
  {name:"Туман", key:"fog", descr:"Плохая видимость", icon:"🌫️"}
];

// == LocalStorage ==
function loadGameData() {
  return {
    upgrades: JSON.parse(localStorage.getItem('pr_upgrades')||'{}'),
    coinsSaved: parseInt(localStorage.getItem('pr_coins')||'0',10),
    skin: parseInt(localStorage.getItem('pr_skin')||'0',10),
    bestScores: JSON.parse(localStorage.getItem('pr_bestScores')||'[]'),
    deaths: parseInt(localStorage.getItem('pr_deaths')||'0',10)
  };
}
function saveGameData(state) {
  localStorage.setItem('pr_upgrades',JSON.stringify(state.upgrades));
  localStorage.setItem('pr_coins',state.coinsSaved);
  localStorage.setItem('pr_skin',state.skin);
  localStorage.setItem('pr_bestScores',JSON.stringify(state.bestScores));
  localStorage.setItem('pr_deaths',state.deaths);
}

// == Main/Game state ==
let state = {};
let canvas = document.getElementById('game');
let ctx = canvas.getContext('2d');
let scoreEl = document.getElementById('score');
let restartBtn = document.getElementById('restart');

function mainMenu() {
  state = Object.assign({
    curLevel:0, modifiers:{}, music:null
  }, loadGameData());
  showMenu(`
  <div class="menu-screen" tabindex="0">
    <button id="playBtn">Играть</button>
    <button id="modifBtn">Модификаторы</button>
    <button id="storeBtn">Магазин</button>
    <button id="scoresBtn">Рекорды</button>
  </div>
  `);
  document.getElementById('playBtn').onclick = ()=>{ chooseLevel(); };
  document.getElementById('modifBtn').onclick = ()=>{ chooseModifiers(); };
  document.getElementById('storeBtn').onclick = ()=>{ storeMenu(); };
  document.getElementById('scoresBtn').onclick = ()=>{ scoresMenu(); };
}

function chooseModifiers() {
  let html = `<div class="menu-screen"><h2>Модификаторы</h2>
    <div class="modif-list">
      ${MODIFIERS.map((m,i)=>`
        <button class="modif${state.modifiers[m.key]?' selected':''}" data-k="${m.key}">
          ${m.icon} ${m.name}
          <span style="font-size:0.8em;color:#fff6;">${m.descr}</span>
        </button>
      `).join('')}
    </div>
    <button id="modifBack">Назад</button>
  </div>`;
  showMenu(html);
  MODIFIERS.forEach((m,i)=>{
    ui.querySelector(`.modif[data-k="${m.key}"]`).onclick = ()=>{
      state.modifiers[m.key] = !state.modifiers[m.key];
      chooseModifiers();
    };
  });
  document.getElementById('modifBack').onclick = ()=>{ mainMenu(); };
}

function chooseLevel() {
  let html = `<div class="menu-screen"><h2>Выбери уровень</h2>
    ${LEVELS.map((lvl,i)=>`<button class="level" data-i="${i}">${lvl.name}</button>`).join('')}
    <button id="lvlBack">Назад</button>
  </div>`;
  showMenu(html);
  LEVELS.forEach((lvl,i)=>{
    ui.querySelector(`.level[data-i="${i}"]`).onclick = ()=>{
      state.curLevel=i;
      hideMenu();
      startGame();
    };
  });
  document.getElementById('lvlBack').onclick = ()=>{ mainMenu(); };
}

function storeMenu() {
  let html = `<div class="menu-screen">
    <h2>Магазин апгрейдов</h2>
    <div id="coinsBalance">Монет: <span id="coinsStore">${state.coinsSaved}</span></div>
    <div class="upgrade-list">
      <button class="upgrade"${state.upgrades.doubleJump?' disabled':''} data-upgrade="doubleJump">🌀 Двойной прыжок <span>500</span></button>
      <button class="upgrade"${state.upgrades.shield?' disabled':''} data-upgrade="shield">🛡 Щит <span>300</span></button>
      <button class="upgrade"${state.upgrades.boost?' disabled':''} data-upgrade="boost">💨 Ускорение <span>400</span></button>
    </div>
    <div class="skin-list">
      <h3>Скины</h3>
      ${SKINS.map((s,i)=>`
        <button class="skin${state.skin==i?' selected':''}" data-skin="${i}"${i>0&&state.coinsSaved<SKIN_COSTS[i]&&state.skin!=i?' disabled':''}>${s.name} ${i==0?'':'<span>'+SKIN_COSTS[i]+'</span>'}</button>
      `).join('')}
    </div>
    <button id="storeBackBtn">Назад</button>
  </div>`;
  showMenu(html);
  // Upgrades
  Array.from(ui.querySelectorAll('.upgrade')).forEach(btn=>{
    let k = btn.dataset.upgrade;
    btn.onclick = ()=>{
      if(state.upgrades[k]||state.coinsSaved<UPGRADE_COSTS[k]) return;
      state.upgrades[k]=true;
      state.coinsSaved-=UPGRADE_COSTS[k];
      saveGameData(state);
      storeMenu();
    };
  });
  // Skins
  Array.from(ui.querySelectorAll('.skin')).forEach((btn,i)=>{
    btn.onclick = ()=>{
      if(state.skin==i) return;
      if(i>0&&!state.upgrades['skin'+i]&&state.coinsSaved>=SKIN_COSTS[i]) {
        state.coinsSaved-=SKIN_COSTS[i];
      }
      state.skin=i;
      saveGameData(state);
      storeMenu();
    };
  });
  document.getElementById('storeBackBtn').onclick = ()=>{ mainMenu(); };
}

function scoresMenu() {
  let arr = state.bestScores.slice().sort((a,b)=>b.score-a.score).slice(0,5);
  let html = `<div class="menu-screen"><h2>Рекорды</h2>
    <ol id="scoresList">
      ${arr.length?arr.map(s=>{
        let d = new Date(s.date);
        let dstr = d.toLocaleDateString();
        return `<li>🏆 <b>${s.score}</b> | 💰 ${s.coins} | 😵 ${s.deaths||0} | <small>${dstr}</small></li>`;
      }).join(''):'<li>Нет рекордов</li>'}
    </ol>
    <button id="scoresBackBtn">Назад</button>
  </div>`;
  showMenu(html);
  document.getElementById('scoresBackBtn').onclick = ()=>{ mainMenu(); };
}

// == Игра ==
let player, obstacles, coins, afterimages, particles, score, coinsCollected, deaths, canDoubleJump, doubleJumped, shield, boost, boostTimer, lastObstacleTime, lastCoinTime, gameOverAnim, lastTime, coinAnimAngle, bgWaveTime, glitchPhase, fog, magnet, fast, curLevel;

function startGame() {
  curLevel = state.curLevel || 0;
  let lvl = LEVELS[curLevel];
  player = {
    x: 60, y: canvas.height-80, vy: 0, width: 38, height: 38,
    grounded: true, stretch: 1, stretchVel: 0, color: ctx.createLinearGradient(0, 0, 0, 38), neon: 1
  };
  for(let i=0;i<3;i++) player.color.addColorStop(i/2, SKINS[state.skin||0].colors[i]);
  obstacles = [];
  coins = [];
  afterimages = [];
  particles = [];
  score = 0;
  coinsCollected = 0;
  canDoubleJump = !!state.upgrades.doubleJump;
  doubleJumped = false;
  shield = !!state.upgrades.shield;
  boost = !!state.upgrades.boost;
  boostTimer = 0;
  fog = !!state.modifiers.fog || lvl.fog;
  magnet = !!state.modifiers.magnet;
  fast = !!state.modifiers.fast;
  lastObstacleTime = Date.now();
  lastCoinTime = Date.now();
  gameOverAnim = 0;
  lastTime = performance.now();
  coinAnimAngle = 0;
  bgWaveTime = 0;
  glitchPhase = 0;
  scoreEl.textContent = `Счёт: 0 | 💰 0 | LVL: ${lvl.name}`;
  hideMenu();
  restartBtn.style.display = 'none';
  requestAnimationFrame(gameLoop);
}

function gameLoop(now) {
  let lvl = LEVELS[curLevel];
  let dt = Math.min((now - lastTime) / 16.66, 2.2) * (fast?1.33:1);
  lastTime = now;
  coinAnimAngle += 0.05 * dt;
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  drawBGWave(now);

  if(fog) {
    ctx.save();
    ctx.globalAlpha = 0.17;
    ctx.fillStyle = `#fff`;
    ctx.filter = 'blur(13px)';
    ctx.fillRect(0,0,canvas.width,canvas.height);
    ctx.restore();
    ctx.filter = 'none';
  }

  drawGround();
  for (let obs of obstacles) drawObstacle(obs);
  for (let coin of coins) drawCoin(coin);
  updateAfterimages();
  drawPlayer();
  drawParticles();

  if(score>0 && score%100===0 && !window._bossTriggered) {
    window._bossTriggered=true;
    spawnBossEvent();
  }
  if(score%100===1) window._bossTriggered=false;

  if (!gameOverAnim) {
    updatePlayer(dt);
    updateObstacles(dt);
    updateCoins(dt);
    updateParticles(dt);
    checkCollision();
    let obsInt = (boost?1200*0.7:1200) / (fast?1.3:1);
    if (Date.now() - lastObstacleTime > obsInt) {
      spawnObstacle();
      lastObstacleTime = Date.now();
    }
    if (Date.now() - lastCoinTime > 900) {
      spawnCoin();
      lastCoinTime = Date.now();
    }
    if(score>0 && score%60===0&&curLevel<LEVELS.length-1) {
      curLevel++;
      startGame();
      return;
    }
    if(boostTimer>0) {
      boostTimer-=dt;
      if(boostTimer<=0) boost=false;
    }
    scoreEl.textContent = `Счёт: ${score} | 💰 ${coinsCollected} | LVL: ${LEVELS[curLevel].name}`;
    requestAnimationFrame(gameLoop);
  } else {
    if (gameOverAnim < 1) gameOverAnim += 0.04 * dt;
    glitchPhase += 0.08*dt;
    drawGlitchText('Игра окончена!', canvas.height / 2 - 10, now+glitchPhase*1000);
    ctx.save();
    ctx.globalAlpha = Math.min(1, gameOverAnim);
    ctx.font = '18px Arial';
    ctx.fillStyle = "#fffbe0";
    ctx.shadowColor = "#6ee2f5";
    ctx.shadowBlur = 14;
    ctx.fillText('Счёт: ' + score, canvas.width / 2, canvas.height / 2 + 33);
    ctx.fillText('Монет: ' + coinsCollected, canvas.width / 2, canvas.height / 2 + 57);
    ctx.restore();
    restartBtn.style.display = 'inline-block';
  }
}

function spawnBossEvent() {
  let boss = {
    type:'drone',
    x:canvas.width+60, y:canvas.height-200,
    width:72, height:60,
    amplitude:40, freq:0.005,
    baseY:canvas.height-180,
    spawnTime:performance.now(),
    boss:true
  };
  obstacles.push(boss);
}

function spawnObstacle() {
  let t = Math.random();
  let type;
  if(t<0.25) type='drone';
  else if(t<0.45) type='laser';
  else if(t<0.6) type='platform';
  else type='block';
  if(type==='drone') {
    let amp = 18+Math.random()*28, freq = 0.015+Math.random()*0.01;
    obstacles.push({type, x:canvas.width,
      y:canvas.height-30-36-Math.random()*60,
      width:34, height:28,
      amplitude:amp, freq,
      baseY:canvas.height-30-60,
      spawnTime:performance.now()
    });
  }
  else if(type==='laser') {
    obstacles.push({type, x:canvas.width,
      y:canvas.height-30-12-Math.random()*90,
      width:44, height:7,
      on: Math.random()>0.5, timer:0, spawnTime:performance.now()
    });
  }
  else if(type==='platform') {
    obstacles.push({type, x:canvas.width,
      y:canvas.height-30-36-Math.random()*40,
      width:44, height:18,
      collapsing:false, touched:false, timer:0,
      spawnTime:performance.now()
    });
  }
  else {
    const height = 30 + Math.floor(Math.random() * 24);
    obstacles.push({type, x: canvas.width,
      y: canvas.height - 30 - height,
      width: 28 + Math.floor(Math.random() * 16),
      height: height,
      spawnTime: performance.now()
    });
  }
}
function updateObstacles(dt) {
  let spd = (boost?LEVELS[curLevel].speed*1.3:LEVELS[curLevel].speed) * (fast?1.3:1);
  for (let obs of obstacles) {
    obs.x -= spd * dt;
    if(obs.type==='drone') obs.y = obs.baseY + Math.sin(Date.now()*obs.freq+obs.x/50)*obs.amplitude;
    if(obs.type==='laser') {
      obs.timer+=dt;
      if(obs.timer>45) { obs.on=!obs.on; obs.timer=0;}
    }
    if(obs.type==='platform'&&obs.collapsing) {
      obs.y+=6*dt;
      obs.timer+=dt;
    }
  }
  while (obstacles.length > 0 && obstacles[0].x + obstacles[0].width < 0) {
    obstacles.shift();
    score++;
  }
}
function spawnCoin() {
  const r = 13;
  const y = canvas.height - 30 - r * 2 - Math.random() * 70;
  coins.push({
    x: canvas.width,
    y: y,
    r: r,
    animPhase: Math.random() * Math.PI * 2
  });
}
function updateCoins(dt) {
  let spd = (boost?LEVELS[curLevel].speed*1.2:LEVELS[curLevel].speed) * (fast?1.3:1);
  for (let coin of coins) {
    coin.x -= spd * dt;
    coin.animPhase += 0.05 * dt;
    if(magnet && Math.abs(player.x-coin.x)<140 && Math.abs(player.y-coin.y)<140) {
      let dx=(player.x-coin.x)/18, dy=(player.y-coin.y)/18;
      coin.x += dx; coin.y += dy;
    }
  }
  for (let i = coins.length - 1; i >= 0; i--) {
    const coin = coins[i];
    const cx = coin.x + coin.r, cy = coin.y + coin.r;
    if (
      cx > player.x && cx < player.x + player.width &&
      cy > player.y && cy < player.y + player.height
    ) {
      coins.splice(i, 1);
      coinsCollected++;
      state.coinsSaved++;
      spawnParticle(cx, cy, '#ffe066', 14, 4, 3.1);
      saveGameData(state);
    } else if (coin.x + coin.r * 2 < 0) {
      coins.splice(i, 1);
    }
  }
}
function updateParticles(dt) {
  for (let p of particles) {
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vx *= 0.98;
    p.vy *= 0.98;
    p.a -= 0.022 * dt * 1.3;
  }
  particles = particles.filter(p => p.a > 0.04);
}
function updateAfterimages() {
  if(!player.grounded && Math.random()<0.32) {
    afterimages.push({
      x: player.x,
      y: player.y,
      w: player.width,
      h: player.height,
      sx: 1.11-Math.random()*0.22,
      sy: 1.07-Math.random()*0.13,
      color: "rgba(110,226,245,0.19)",
      alpha: 0.32
    });
  }
  for(let img of afterimages) img.alpha *= 0.88;
  afterimages = afterimages.filter(a => a.alpha>0.02);
}
function updatePlayer(dt) {
  let lvl = LEVELS[curLevel];
  let grav = lvl.gravity * (boost?0.75:1);
  player.vy += grav * dt;
  player.y += player.vy * dt;
  if (player.y + player.height > canvas.height - 30) {
    if (!player.grounded) {
      spawnParticle(player.x + player.width/2, canvas.height-32, '#6ee2f5', 12, 3.8, 2.5);
      player.stretchVel = -0.13;
      doubleJumped = false;
    }
    player.y = canvas.height - 30 - player.height;
    player.vy = 0;
    player.grounded = true;
  } else {
    player.grounded = false;
  }
  for(let obs of obstacles){
    if(obs.type==='platform'&&!obs.collapsing&&!obs.touched
      &&player.x+player.width>obs.x&&player.x<obs.x+obs.width
      &&player.y+player.height>obs.y&&player.y+player.height<obs.y+obs.height+20
      &&player.vy>=0
    ){
      player.y = obs.y-player.height;
      player.vy = 0;
      player.grounded = true;
      obs.touched = true;
      setTimeout(()=>{obs.collapsing=true;},300);
    }
  }
  if (!player.grounded) {
    player.stretchVel += ((1.19 - player.stretch) * 0.19);
  } else {
    player.stretchVel += ((0.91 - player.stretch) * 0.18);
  }
  player.stretchVel *= 0.62;
  player.stretch += player.stretchVel;
  player.stretch = Math.max(0.8, Math.min(1.16, player.stretch));
}
function spawnParticle(x, y, color, n = 8, rad=3, speed=2) {
  for (let i = 0; i < n; i++) {
    let angle = Math.random() * Math.PI * 2;
    let s = speed * (0.7 + Math.random()*0.5);
    particles.push({
      x, y,
      r: rad * (0.7 + Math.random()*0.5),
      vx: Math.cos(angle) * s,
      vy: Math.sin(angle) * s,
      a: 1,
      c: color
    });
  }
}
function drawBGWave(now) {
  bgWaveTime += 0.016;
  ctx.save();
  ctx.globalAlpha = 0.17;
  for(let i=0;i<3;i++){
    let grad = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    grad.addColorStop(0, i===0 ? "#6ee2f5" : i===1 ? "#ff6ec7" : "#ffe066");
    grad.addColorStop(1, "#181c2c");
    ctx.beginPath();
    ctx.moveTo(0, 160+Math.sin(bgWaveTime*1.2+i)*24 + i*30);
    for(let x=0;x<=canvas.width;x+=8){
      ctx.lineTo(
        x,
        160+Math.sin(bgWaveTime*1.3+(x/45)+i*2)*16 + i*30
      );
    }
    ctx.lineTo(canvas.width, canvas.height);
    ctx.lineTo(0, canvas.height);
    ctx.closePath();
    ctx.fillStyle = grad;
    ctx.filter = 'blur(7px)';
    ctx.fill();
  }
  ctx.restore();
  ctx.filter = 'none';
}
function drawAfterimages() {
  for(let a of afterimages){
    ctx.save();
    ctx.globalAlpha = a.alpha;
    ctx.translate(a.x + a.w/2, a.y + a.h/2);
    ctx.scale(a.sx, a.sy);
    ctx.beginPath();
    ctx.roundRect(-a.w/2, -a.h/2, a.w, a.h, 10);
    ctx.fillStyle = a.color;
    ctx.shadowColor = a.color;
    ctx.shadowBlur = 16;
    ctx.fill();
    ctx.restore();
  }
}
function drawPlayer() {
  drawAfterimages();
  ctx.save();
  ctx.translate(player.x + player.width / 2, player.y + player.height / 2);
  ctx.scale(1.12 - player.stretch, player.stretch);
  ctx.save();
  ctx.shadowColor = "#6ee2f5";
  ctx.shadowBlur = 18 * player.neon;
  ctx.globalAlpha = 0.19 + 0.12 * player.neon;
  ctx.beginPath();
  ctx.ellipse(0, 0, player.width/1.57, player.height/1.52, 0, 0, Math.PI*2);
  ctx.fillStyle = "#6ee2f5";
  ctx.fill();
  ctx.restore();
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(-player.width/2, -player.height/2, player.width, player.height, 10);
  ctx.fillStyle = player.color;
  ctx.shadowColor = "#fffbe0";
  ctx.shadowBlur = 9 * player.neon;
  ctx.strokeStyle = "#fff";
  ctx.lineWidth = 2.2;
  ctx.fill();
  ctx.stroke();
  ctx.restore();
  ctx.beginPath();
  ctx.arc(-9, -5, 3.1, 0, Math.PI * 2);
  ctx.arc(9, -5, 3.1, 0, Math.PI * 2);
  ctx.fillStyle = '#23243a';
  ctx.fill();
  ctx.save();
  ctx.lineWidth = 1.3;
  ctx.strokeStyle = "#23243a";
  ctx.beginPath();
  ctx.arc(0, 7, 8, Math.PI*0.18, Math.PI*0.82);
  ctx.stroke();
  ctx.restore();
  ctx.save();
  ctx.globalAlpha = 0.18;
  ctx.scale(1.52, 0.5);
  ctx.beginPath();
  ctx.arc(0, player.height * 0.9, player.width * 0.4, 0, Math.PI * 2);
  ctx.fillStyle = "#000";
  ctx.fill();
  ctx.restore();
  ctx.restore();
}
function drawObstacle(obs) {
  ctx.save();
  let appear = Math.min(1, (performance.now() - obs.spawnTime) / 180);
  ctx.globalAlpha = appear * 0.97;
  ctx.translate(obs.x + obs.width/2, obs.y + obs.height/2);
  if(obs.type==='drone' || obs.boss) {
    ctx.save();
    ctx.rotate(Math.sin(Date.now()/400+obs.x/90)*0.2);
    ctx.fillStyle = "#6ee2f5";
    ctx.shadowColor = "#6ee2f5";
    ctx.shadowBlur = obs.boss?28:10;
    ctx.beginPath();
    ctx.ellipse(0,0,obs.width/2,obs.height/2,0,0,Math.PI*2);
    ctx.fill();
    ctx.restore();
    ctx.beginPath();
    ctx.arc(0,0,obs.width/2-6,0,Math.PI*2);
    ctx.fillStyle = "#181c2c";
    ctx.fill();
  } else if(obs.type==='laser') {
    ctx.save();
    ctx.globalAlpha *= obs.on?1:0.3;
    ctx.shadowColor = "#ff6ec7";
    ctx.shadowBlur = 15;
    ctx.fillStyle = "#ff6ec7";
    ctx.fillRect(-obs.width/2, -obs.height/8, obs.width, obs.height/4);
    ctx.restore();
  } else if(obs.type==='platform') {
    ctx.save();
    ctx.shadowColor = "#ffe066";
    ctx.shadowBlur = 13;
    ctx.fillStyle = "#ffe066";
    ctx.beginPath();
    ctx.roundRect(-obs.width/2, -obs.height/2, obs.width, obs.height, 7);
    ctx.fill();
    ctx.restore();
    ctx.beginPath();
    ctx.roundRect(-obs.width/2, -obs.height/2, obs.width, obs.height, 7);
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 2;
    ctx.stroke();
  } else {
    let grad = ctx.createLinearGradient(-obs.width/2, -obs.height/2, obs.width/2, obs.height/2);
    grad.addColorStop(0, "#fff2");
    grad.addColorStop(0.3, "#ffe06699");
    grad.addColorStop(0.7, "#6ee2f5cc");
    grad.addColorStop(1, "#ff6ec7cc");
    ctx.lineWidth = 2.8;
    ctx.beginPath();
    ctx.roundRect(-obs.width/2, -obs.height/2, obs.width, obs.height, 13);
    ctx.fillStyle = grad;
    ctx.shadowColor = "#ff6ec7";
    ctx.shadowBlur = 13;
    ctx.fill();
    ctx.strokeStyle = "#6ee2f5";
    ctx.globalAlpha = appear;
    ctx.stroke();
  }
  ctx.restore();
}
function drawCoin(coin) {
  ctx.save();
  ctx.translate(coin.x + coin.r, coin.y + coin.r);
  let spin = Math.sin(coin.animPhase + coinAnimAngle) * 0.89;
  ctx.rotate(coin.animPhase*0.5);
  ctx.scale(1 - Math.abs(spin)*0.55, 1);
  ctx.save();
  ctx.shadowColor = "#ffe066";
  ctx.shadowBlur = 12;
  ctx.beginPath();
  ctx.arc(0, 0, coin.r, 0, Math.PI * 2);
  ctx.lineWidth = 6;
  ctx.strokeStyle = "#ff6ec7";
  ctx.stroke();
  ctx.restore();
  let g = ctx.createRadialGradient(0,0,coin.r*0.2, 0,0,coin.r*0.82);
  g.addColorStop(0, "#fffbe0");
  g.addColorStop(0.17, "#ffe066");
  g.addColorStop(0.75, "#6ee2f5");
  g.addColorStop(1, "#23243a");
  ctx.beginPath();
  ctx.arc(0, 0, coin.r*0.75, 0, Math.PI*2);
  ctx.fillStyle = g;
  ctx.globalAlpha = 0.97;
  ctx.fill();
  ctx.restore();
}
function drawParticles() {
  for (let p of particles) {
    ctx.save();
    ctx.globalAlpha = p.a;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
    let grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r);
    grad.addColorStop(0, p.c);
    grad.addColorStop(1, "#fff0");
    ctx.fillStyle = grad;
    ctx.shadowColor = p.c;
    ctx.shadowBlur = 8;
    ctx.fill();
    ctx.restore();
  }
}
function drawGround() {
  ctx.save();
  let g = ctx.createLinearGradient(0, canvas.height-30, 0, canvas.height);
  g.addColorStop(0, '#b0ffe0');
  g.addColorStop(0.4, '#70a34a');
  g.addColorStop(1, '#4e4376');
  ctx.fillStyle = g;
  ctx.globalAlpha = 0.96;
  ctx.fillRect(0, canvas.height - 30, canvas.width, 30);
  ctx.restore();
}
function drawGlitchText(txt, y, now) {
  let baseX = canvas.width / 2;
  for(let i=0; i<5; i++){
    let dx = (Math.random()-0.5)*6*(1-gameOverAnim);
    let dy = (Math.random()-0.5)*6*(1-gameOverAnim);
    ctx.save();
    ctx.globalAlpha = 0.24 + 0.15*i;
    ctx.shadowColor = i%2 ? "#ff6ec7" : "#6ee2f5";
    ctx.shadowBlur = 18-i*3;
    ctx.font = "30px Arial Black, Arial, sans-serif";
    ctx.textAlign = "center";
    ctx.fillStyle = i%2 ? "#ff6ec7" : "#6ee2f5";
    ctx.fillText(txt, baseX+dx, y+dy);
    ctx.restore();
  }
  ctx.save();
  ctx.globalAlpha = 1;
  ctx.font = "30px Arial Black, Arial, sans-serif";
  ctx.textAlign = "center";
  ctx.shadowColor = "#ffe066";
  ctx.shadowBlur = 22;
  ctx.fillStyle = "#ffe066";
  ctx.fillText(txt, baseX, y);
  ctx.restore();
}
document.addEventListener('mousedown', (e) => {
  if(!player) return;
  if(e.button!==0||gameOverAnim) return;
  if(player.grounded) {
    player.vy = -10*(boost?1.25:1);
    player.stretchVel = 0.19;
    player.neon = 1.3;
    spawnParticle(player.x + player.width/2, player.y + player.height, '#6ee2f5', 13, 4, 2.7);
  } else if(canDoubleJump && !doubleJumped) {
    player.vy = -10*(boost?1.1:1);
    doubleJumped = true;
    player.stretchVel = 0.18;
    spawnParticle(player.x + player.width/2, player.y + player.height, '#ffe066', 12, 4, 2.3);
  }
});
document.addEventListener('keydown', (e)=>{
  if(!player || gameOverAnim) return;
  if(e.code==='Space') {
    if(player.grounded) {
      player.vy = -10*(boost?1.25:1);
      player.stretchVel = 0.19;
      player.neon = 1.3;
      spawnParticle(player.x + player.width/2, player.y + player.height, '#6ee2f5', 13, 4, 2.7);
    } else if(canDoubleJump && !doubleJumped) {
      player.vy = -10*(boost?1.1:1);
      doubleJumped = true;
      player.stretchVel = 0.18;
      spawnParticle(player.x + player.width/2, player.y + player.height, '#ffe066', 12, 4, 2.3);
    }
  }
});
restartBtn.onclick = ()=>{
  if(state && typeof mainMenu === 'function') mainMenu();
  restartBtn.style.display='none';
  gameOverAnim=0;
};
mainMenu();
function hideMenu() {
  ui.innerHTML = '';
  ui.style.display = 'none';
}

// ... остальной код ...

document.addEventListener('mousedown', (e) => {
  if(!player) return;
  if(e.button!==0||gameOverAnim) return;
  if(player.grounded) {
    player.vy = -13;
    player.stretchVel = 0.19;
    player.neon = 1.3;
  }
});
function checkCollision() {
  for (let obs of obstacles) {
    // платформы не опасны
    if(obs.type==='platform') continue;
    // лазер не всегда опасен
    if(obs.type==='laser' && !obs.on) continue;
    if (
      player.x < obs.x + obs.width &&
      player.x + player.width > obs.x &&
      player.y < obs.y + obs.height &&
      player.y + player.height > obs.y
    ) {
      if(shield) {
        shield = false;
        spawnParticle(player.x + player.width / 2, player.y + player.height / 2, '#ffe066', 24, 6, 3.1);
        obstacles.splice(obstacles.indexOf(obs),1);
        return;
      }
      state.deaths = (state.deaths||0)+1;
      state.bestScores.push({score,coins:coinsCollected,deaths:state.deaths,date:Date.now()});
      saveGameData(state);
      gameOverAnim = 0.01;
      spawnParticle(player.x + player.width / 2, player.y + player.height / 2, '#ff6ec7', 24, 5, 3.1);
      return;
    }
  }
}