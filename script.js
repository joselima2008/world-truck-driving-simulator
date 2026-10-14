(function () {
  var W = 400, H = 700;
  var ROAD_L = 50, ROAD_W = 300, LANES = 3, LANE_W = ROAD_W / LANES;
  var LANE_SPEED = [190, 160, 130];
  var cv = document.getElementById('cv');
  var ctx = cv.getContext('2d');
  var wrap = document.getElementById('wrap');
  var stage = document.getElementById('stage');
  var ovStart = document.getElementById('ovStart');
  var ovOver = document.getElementById('ovOver');
  var hScore = document.getElementById('hScore');
  var hSpeed = document.getElementById('hSpeed');
  var hPassed = document.getElementById('hPassed');
  var hBest = document.getElementById('hBest');

  var best = 0;
  try { best = parseInt(localStorage.getItem('truck-sim-best') || '0', 10) || 0; } catch (e) {}
  hBest.textContent = best;

  function fit() {
    var r = wrap.getBoundingClientRect();
    var availW = Math.max(160, r.width - 4), availH = Math.max(280, r.height - 4);
    var s = Math.min(availW / W, availH / H);
    var w = Math.floor(W * s), h = Math.floor(H * s);
    stage.style.width = w + 'px';
    stage.style.height = h + 'px';
    var d = Math.min(window.devicePixelRatio || 1, 2);
    cv.width = Math.round(w * d);
    cv.height = Math.round(h * d);
    ctx.setTransform(cv.width / W, 0, 0, cv.height / H, 0, 0);
  }
  window.addEventListener('resize', fit);
  fit();

  /* ---------- estado ---------- */
  var state = 'ready'; // ready | play | crash | over
  var player, trucks, scenery, particles;
  var t, speed, scroll, spawnTimer, treeAcc, passed, crashTimer, shake;
  var COLORS = ['#3b82c4', '#d9a441', '#5fa36b', '#8e6bbf', '#c9ced4', '#b8483f', '#4fb0a8'];

  function reset() {
    player = { x: ROAD_L + ROAD_W / 2, y: H - 130, w: 40, h: 96, vx: 0 };
    trucks = []; scenery = []; particles = [];
    t = 0; speed = 300; scroll = 0; spawnTimer = 0.4; treeAcc = 0;
    passed = 0; crashTimer = 0; shake = 0;
    for (var y = 0; y < H; y += 70) addTree(y);
  }

  function addTree(y) {
    var left = Math.random() < 0.5;
    scenery.push({
      x: left ? 8 + Math.random() * 30 : W - 8 - Math.random() * 30,
      y: y, r: 9 + Math.random() * 9, tone: Math.random()
    });
  }

  /* ---------- entrada ---------- */
  var keys = { left: false, right: false };
  var touchDir = 0;
  function setKey(e, down) {
    var k = e.key;
    if (k === 'ArrowLeft' || k === 'a' || k === 'A') { keys.left = down; e.preventDefault(); }
    else if (k === 'ArrowRight' || k === 'd' || k === 'D') { keys.right = down; e.preventDefault(); }
    else if (down && (k === ' ' || k === 'Enter')) {
      e.preventDefault();
      if (state === 'ready' || state === 'over') start();
    }
  }
  window.addEventListener('keydown', function (e) { setKey(e, true); });
  window.addEventListener('keyup', function (e) { setKey(e, false); });
  function pointerDir(e) {
    var r = stage.getBoundingClientRect();
    touchDir = (e.clientX - r.left) < r.width / 2 ? -1 : 1;
  }
  stage.addEventListener('pointerdown', function (e) {
    if (e.target.tagName === 'BUTTON') return;
    pointerDir(e);
  });
  stage.addEventListener('pointermove', function (e) { if (touchDir !== 0) pointerDir(e); });
  window.addEventListener('pointerup', function () { touchDir = 0; });
  window.addEventListener('pointercancel', function () { touchDir = 0; });
  window.addEventListener('blur', function () { keys.left = keys.right = false; touchDir = 0; });
  document.getElementById('btnStart').addEventListener('click', start);
  document.getElementById('btnRestart').addEventListener('click', start);

  function start() {
    reset();
    state = 'play';
    ovStart.hidden = true;
    ovOver.hidden = true;
  }

  /* ---------- lógica ---------- */
  function laneX(l) { return ROAD_L + LANE_W * (l + 0.5); }

  function trySpawn() {
    var sy = -140;
    for (var tries = 0; tries < 8; tries++) {
      var lane = Math.floor(Math.random() * LANES);
      var x = laneX(lane) + (Math.random() - 0.5) * 20;
      var blocked = false, others = {};
      for (var i = 0; i < trucks.length; i++) {
        var o = trucks[i];
        if (o.lane === lane && o.y < 330) { blocked = true; break; }
        if (o.lane !== lane && Math.abs(o.y - sy) < 230) others[o.lane] = true;
      }
      if (blocked) continue;
      if (Object.keys(others).length >= 2) continue;
      var h = 90 + Math.floor(Math.random() * 45);
      trucks.push({
        x: x, y: sy, w: 40, h: h, lane: lane, v: LANE_SPEED[lane],
        color: COLORS[Math.floor(Math.random() * COLORS.length)], passed: false
      });
      return;
    }
  }

  function steer(dt) {
    var dir = (keys.right ? 1 : 0) - (keys.left ? 1 : 0);
    if (touchDir !== 0) dir = touchDir;
    var target = dir * 290;
    player.vx += (target - player.vx) * Math.min(1, dt * 10);
    player.x += player.vx * dt;
    var minX = ROAD_L + 24, maxX = ROAD_L + ROAD_W - 24;
    if (player.x < minX) { player.x = minX; player.vx = 0; }
    if (player.x > maxX) { player.x = maxX; player.vx = 0; }
  }

  function crash(other) {
    state = 'crash';
    crashTimer = 0.9;
    shake = 0.5;
    var px = (player.x + other.x) / 2, py = (player.y + other.y) / 2;
    for (var i = 0; i < 28; i++) {
      var a = Math.random() * Math.PI * 2, sp = 60 + Math.random() * 260;
      particles.push({ x: px, y: py, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 0.5 + Math.random() * 0.5, c: Math.random() < 0.5 ? '#f5c842' : '#ff5a36' });
    }
    var score = Math.floor(t * 10);
    if (score > best) {
      best = score;
      try { localStorage.setItem('truck-sim-best', String(best)); } catch (e) {}
      hBest.textContent = best;
    }
  }

  function showOver() {
    state = 'over';
    var score = Math.floor(t * 10);
    document.getElementById('fScore').textContent = score;
    var secs = Math.floor(t);
    document.getElementById('fInfo').textContent =
      secs + ' s na pista, ' + passed + (passed === 1 ? ' ultrapassagem. ' : ' ultrapassagens. ') +
      (score >= best && score > 0 ? 'Novo recorde!' : 'Recorde: ' + best + '.');
    ovOver.hidden = false;
  }

  function update(dt) {
    var i;
    if (state === 'play') {
      t += dt;
      speed = 300 + Math.min(t * 5, 300);
      steer(dt);
      scroll += speed * dt;
      spawnTimer -= dt;
      if (spawnTimer <= 0) {
        trySpawn();
        var gap = Math.max(190, 330 - t * 2.2);
        var rel = speed - 160;
        spawnTimer = (gap / rel) * (0.75 + Math.random() * 0.5);
      }
      for (i = trucks.length - 1; i >= 0; i--) {
        var tr = trucks[i];
        tr.y += (speed - tr.v) * dt;
        if (!tr.passed && tr.y - tr.h / 2 > player.y + player.h / 2) { tr.passed = true; passed++; }
        if (tr.y - tr.h / 2 > H + 40) trucks.splice(i, 1);
      }
      for (i = 0; i < trucks.length; i++) {
        var o = trucks[i];
        var dx = Math.abs(player.x - o.x), dy = Math.abs(player.y - o.y);
        if (dx < (player.w - 8) / 2 + (o.w - 4) / 2 && dy < (player.h - 12) / 2 + (o.h - 6) / 2) { crash(o); break; }
      }
    } else if (state === 'ready') {
      speed = 220;
      scroll += speed * dt;
    } else if (state === 'crash') {
      crashTimer -= dt;
      if (crashTimer <= 0) showOver();
    }
    if (state === 'play' || state === 'ready') {
      for (i = scenery.length - 1; i >= 0; i--) {
        scenery[i].y += speed * dt;
        if (scenery[i].y > H + 40) scenery.splice(i, 1);
      }
      treeAcc += speed * dt;
      if (treeAcc > 80) { treeAcc = 0; addTree(-30); }
    }
    for (i = particles.length - 1; i >= 0; i--) {
      var p = particles[i];
      p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt;
      if (p.life <= 0) particles.splice(i, 1);
    }
    if (shake > 0) shake = Math.max(0, shake - dt);

    hScore.textContent = Math.floor(t * 10);
    hSpeed.textContent = state === 'play' ? Math.round(speed * 0.3) : (state === 'ready' ? 0 : hSpeed.textContent);
    hPassed.textContent = passed;
  }

  /* ---------- desenho ---------- */
  function rr(x, y, w, h, r) {
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(x, y, w, h, r);
    else ctx.rect(x, y, w, h);
  }

  function drawTruck(x, y, w, h, color, isPlayer, tilt) {
    ctx.save();
    ctx.translate(x, y);
    if (tilt) ctx.rotate(tilt);
    var x0 = -w / 2, y0 = -h / 2;
    var cabH = Math.min(30, h * 0.27);
    ctx.fillStyle = 'rgba(0,0,0,0.28)';
    rr(x0 + 4, y0 + 6, w, h, 6); ctx.fill();
    // rodas
    ctx.fillStyle = '#0c0e10';
    var wy = [y0 + 6, y0 + h * 0.7, y0 + h * 0.7 + 17];
    for (var i = 0; i < wy.length; i++) {
      ctx.fillRect(x0 - 3, wy[i], 5, 15);
      ctx.fillRect(x0 + w - 2, wy[i], 5, 15);
    }
    // carreta
    ctx.fillStyle = color;
    rr(x0, y0 + cabH + 4, w, h - cabH - 4, 4); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.14)';
    ctx.fillRect(x0 + 4, y0 + cabH + 8, w - 8, h - cabH - 12);
    ctx.strokeStyle = 'rgba(0,0,0,0.22)';
    ctx.lineWidth = 1;
    for (var ry = y0 + cabH + 22; ry < y0 + h - 6; ry += 16) {
      ctx.beginPath(); ctx.moveTo(x0 + 3, ry); ctx.lineTo(x0 + w - 3, ry); ctx.stroke();
    }
    // engate
    ctx.fillStyle = '#16191c';
    ctx.fillRect(-4, y0 + cabH - 1, 8, 7);
    // cabine
    ctx.fillStyle = color;
    rr(x0 + 1, y0, w - 2, cabH, 6); ctx.fill();
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    rr(x0 + 1, y0, w - 2, cabH, 6); ctx.fill();
    ctx.fillStyle = '#0f2233';
    rr(x0 + 6, y0 + 4, w - 12, 9, 2); ctx.fill();
    ctx.fillStyle = 'rgba(160,210,255,0.35)';
    ctx.fillRect(x0 + 8, y0 + 5, w - 16, 2);
    // luzes
    ctx.fillStyle = '#b3261e';
    ctx.fillRect(x0 + 2, y0 + h - 3, 7, 3);
    ctx.fillRect(x0 + w - 9, y0 + h - 3, 7, 3);
    if (isPlayer) {
      ctx.fillStyle = '#fff3b0';
      ctx.fillRect(x0 + 3, y0 - 1, 7, 3);
      ctx.fillRect(x0 + w - 10, y0 - 1, 7, 3);
    }
    ctx.restore();
  }

  function drawScene() {
    // grama com faixas
    var stripe = 80, off = scroll % (stripe * 2);
    ctx.fillStyle = '#3d7a38';
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#448540';
    for (var y = -stripe * 2 + off; y < H; y += stripe * 2) {
      ctx.fillRect(0, y, W, stripe);
    }
    // acostamento e asfalto
    ctx.fillStyle = '#6b6f73';
    ctx.fillRect(ROAD_L - 6, 0, ROAD_W + 12, H);
    ctx.fillStyle = '#2b2f33';
    ctx.fillRect(ROAD_L, 0, ROAD_W, H);
    ctx.fillStyle = '#31363a';
    for (var y2 = -stripe * 2 + off; y2 < H; y2 += stripe * 2) {
      ctx.fillRect(ROAD_L, y2 + stripe, ROAD_W, stripe);
    }
    // bordas
    ctx.fillStyle = '#e9edf0';
    ctx.fillRect(ROAD_L + 3, 0, 3, H);
    ctx.fillRect(ROAD_L + ROAD_W - 6, 0, 3, H);
    // faixas tracejadas
    ctx.fillStyle = '#f5c842';
    var dash = 80, doff = scroll % dash;
    for (var l = 1; l < LANES; l++) {
      var lx = ROAD_L + LANE_W * l - 2;
      for (var dy = -dash + doff; dy < H; dy += dash) ctx.fillRect(lx, dy, 4, 40);
    }
    // árvores
    for (var i = 0; i < scenery.length; i++) {
      var s = scenery[i];
      ctx.fillStyle = 'rgba(0,0,0,0.22)';
      ctx.beginPath(); ctx.arc(s.x + 3, s.y + 4, s.r, 0, 6.2832); ctx.fill();
      ctx.fillStyle = s.tone < 0.5 ? '#2a5e2a' : '#336b30';
      ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, 6.2832); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.10)';
      ctx.beginPath(); ctx.arc(s.x - s.r * 0.3, s.y - s.r * 0.3, s.r * 0.5, 0, 6.2832); ctx.fill();
    }
  }

  function draw() {
    ctx.save();
    if (shake > 0) ctx.translate((Math.random() - 0.5) * 12 * shake, (Math.random() - 0.5) * 12 * shake);
    drawScene();
    for (var i = 0; i < trucks.length; i++) {
      var o = trucks[i];
      drawTruck(o.x, o.y, o.w, o.h, o.color, false, 0);
    }
    if (state !== 'over') {
      drawTruck(player.x, player.y, player.w, player.h, '#ff5a36', true, state === 'crash' ? 0.2 : player.vx / 290 * 0.1);
    }
    for (var j = 0; j < particles.length; j++) {
      var p = particles[j];
      ctx.globalAlpha = Math.max(0, p.life * 1.6);
      ctx.fillStyle = p.c;
      ctx.fillRect(p.x - 2, p.y - 2, 4, 4);
    }
    ctx.globalAlpha = 1;
    ctx.restore();
    if (state === 'crash' || state === 'over') {
      ctx.fillStyle = 'rgba(255,60,30,' + (state === 'crash' ? 0.12 : 0) + ')';
      ctx.fillRect(0, 0, W, H);
    }
  }

  /* ---------- loop ---------- */
  reset();
  var last = 0;
  function frame(ts) {
    var dt = Math.min(0.05, (ts - last) / 1000 || 0);
    last = ts;
    update(dt);
    draw();
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
})();