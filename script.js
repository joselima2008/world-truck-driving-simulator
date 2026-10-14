const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const scoreEl = document.getElementById('score');
const speedEl = document.getElementById('speed');
const overlay = document.getElementById('overlay');
const startButton = document.getElementById('startButton');
const statusTitle = document.getElementById('statusTitle');
const statusText = document.getElementById('statusText');

const road = {
  x: 225,
  width: 450,
  laneCount: 3,
  laneWidth: 150,
  scroll: 0,
};

const state = {
  running: false,
  score: 0,
  speed: 260,
  lastTime: 0,
  spawnTimer: 0.8,
  distance: 0,
};

const player = {
  x: canvas.width / 2,
  y: canvas.height - 135,
  width: 78,
  height: 120,
  baseSpeed: 340,
};

const keys = {
  left: false,
  right: false,
};

const obstacles = [];

function resetGame() {
  state.running = true;
  state.score = 0;
  state.speed = 260;
  state.distance = 0;
  state.spawnTimer = 0.6;
  player.x = canvas.width / 2;
  road.scroll = 0;
  obstacles.length = 0;
  overlay.classList.remove('visible');
}

function endGame() {
  state.running = false;
  statusTitle.textContent = 'Acidente!';
  statusText.textContent = `Você fez ${Math.floor(state.score)} pontos. Pressione o botão para tentar de novo.`;
  overlay.classList.add('visible');
}

function spawnObstacle() {
  const lane = Math.floor(Math.random() * road.laneCount);
  const laneCenter = road.x + (lane + 0.5) * road.laneWidth;
  const truck = {
    x: laneCenter,
    y: -140,
    width: 72,
    height: 118,
    speed: 100 + Math.random() * 110,
    passed: false,
    color: Math.random() > 0.5 ? '#f94144' : '#4cc9f0',
  };
  obstacles.push(truck);
}

function update(dt) {
  if (!state.running) {
    return;
  }

  state.speed = Math.min(620, state.speed + dt * 10);
  state.distance += dt * state.speed * 0.35;
  state.score += dt * 12;

  if (keys.left) {
    player.x -= player.baseSpeed * dt;
  }

  if (keys.right) {
    player.x += player.baseSpeed * dt;
  }

  player.x = Math.max(road.x + 36, Math.min(player.x, road.x + road.width - 36));

  road.scroll += state.speed * dt;
  state.spawnTimer -= dt;

  if (state.spawnTimer <= 0) {
    spawnObstacle();
    state.spawnTimer = Math.max(0.7, 1.6 - state.speed / 500);
  }

  for (let i = obstacles.length - 1; i >= 0; i -= 1) {
    const obstacle = obstacles[i];
    obstacle.y += (state.speed + obstacle.speed) * dt;

    if (!obstacle.passed && obstacle.y > player.y + player.height + 20) {
      obstacle.passed = true;
      state.score += 15;
    }

    if (obstacle.y > canvas.height + 180) {
      obstacles.splice(i, 1);
      continue;
    }

    if (rectsIntersect(player.x - player.width / 2, player.y - player.height / 2, player.width, player.height, obstacle.x - obstacle.width / 2, obstacle.y - obstacle.height / 2, obstacle.width, obstacle.height)) {
      endGame();
      break;
    }
  }

  scoreEl.textContent = Math.floor(state.score).toString();
  speedEl.textContent = `${Math.floor(state.speed * 0.9)} km/h`;
}

function rectsIntersect(ax, ay, aw, ah, bx, by, bw, bh) {
  return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
}

function drawCloud(x, y, scale) {
  ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
  ctx.beginPath();
  ctx.arc(x, y, 18 * scale, 0, Math.PI * 2);
  ctx.arc(x + 20 * scale, y - 8 * scale, 16 * scale, 0, Math.PI * 2);
  ctx.arc(x - 18 * scale, y - 6 * scale, 15 * scale, 0, Math.PI * 2);
  ctx.arc(x + 8 * scale, y + 12 * scale, 15 * scale, 0, Math.PI * 2);
  ctx.arc(x - 8 * scale, y + 10 * scale, 16 * scale, 0, Math.PI * 2);
  ctx.fill();
}

function drawMountainRange(color, baseOffset, peakHeight, opacity) {
  ctx.beginPath();
  ctx.moveTo(0, canvas.height);

  for (let i = 0; i <= 10; i += 1) {
    const x = (i / 10) * canvas.width;
    const sinValue = Math.sin((i + baseOffset) * 0.9);
    const height = peakHeight + sinValue * 34;
    ctx.lineTo(x, canvas.height - height);
  }

  ctx.lineTo(canvas.width, canvas.height);
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.globalAlpha = opacity;
  ctx.fill();
  ctx.globalAlpha = 1;
}

function drawSky() {
  const skyGradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
  skyGradient.addColorStop(0, '#76c3ff');
  skyGradient.addColorStop(0.28, '#bfe5ff');
  skyGradient.addColorStop(0.55, '#dfeefc');
  skyGradient.addColorStop(1, '#edf7ff');
  ctx.fillStyle = skyGradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const sunX = canvas.width * 0.78;
  const sunY = 104;
  ctx.beginPath();
  ctx.fillStyle = 'rgba(255, 206, 104, 0.3)';
  ctx.arc(sunX, sunY, 68, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.fillStyle = '#ffd166';
  ctx.arc(sunX, sunY, 26, 0, Math.PI * 2);
  ctx.fill();

  drawMountainRange('#8ba7ba', 0.8, 110, 0.9);
  drawMountainRange('#6b8192', 1.9, 150, 0.75);

  for (let i = 0; i < 7; i += 1) {
    drawCloud(80 + i * 120 + ((state.distance * 0.15) % 120), 55 + (i % 3) * 18, 1 + (i % 2) * 0.25);
  }
}

function drawGrass() {
  const grassGradient = ctx.createLinearGradient(0, 120, 0, canvas.height);
  grassGradient.addColorStop(0, '#2aa85a');
  grassGradient.addColorStop(0.22, '#1c7f47');
  grassGradient.addColorStop(1, '#0d5c31');
  ctx.fillStyle = grassGradient;
  ctx.fillRect(0, 120, canvas.width, canvas.height - 120);

  ctx.fillStyle = '#f0f8d9';
  for (let i = 0; i < 140; i += 1) {
    const x = ((i * 54 + road.scroll * 0.36) % (canvas.width + 70)) - 30;
    const y = 134 + (i % 8) * 34;
    ctx.fillRect(x, y, 7, 18);
  }

  for (let i = 0; i < 20; i += 1) {
    const x = ((i * 96 - road.scroll * 0.2) % (canvas.width + 120)) - 50;
    const y = 135 + (i % 5) * 26;
    ctx.fillStyle = '#2b8b4a';
    ctx.fillRect(x, y + 12, 8, 16);
    ctx.fillStyle = '#4cba67';
    ctx.beginPath();
    ctx.arc(x + 4, y, 12, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawRoad() {
  ctx.fillStyle = '#2d343b';
  ctx.fillRect(road.x, 120, road.width, canvas.height - 120);

  ctx.fillStyle = '#59626c';
  ctx.fillRect(road.x - 18, 120, 18, canvas.height - 120);
  ctx.fillRect(road.x + road.width, 120, 18, canvas.height - 120);

  ctx.fillStyle = '#d7dde5';
  for (let i = 0; i < 26; i += 1) {
    const y = ((i * 70 + road.scroll) % (canvas.height + 120)) - 60;
    ctx.fillRect(road.x - 8, y, 6, 40);
    ctx.fillRect(road.x + road.width + 2, y, 6, 40);
  }

  ctx.strokeStyle = '#f4f7fa';
  ctx.lineWidth = 5;
  ctx.setLineDash([28, 22]);
  ctx.beginPath();
  ctx.moveTo(road.x + road.laneWidth, 120);
  ctx.lineTo(road.x + road.laneWidth, canvas.height);
  ctx.moveTo(road.x + road.laneWidth * 2, 120);
  ctx.lineTo(road.x + road.laneWidth * 2, canvas.height);
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.fillStyle = '#dfe6ec';
  for (let i = 0; i < 20; i += 1) {
    const y = ((i * 74 + road.scroll * 1.1) % (canvas.height + 150)) - 60;
    ctx.fillRect(road.x + road.width / 2 - 3, y, 6, 36);
  }
}

function drawTruck(x, y, width, height, color) {
  ctx.save();
  ctx.translate(x, y);

  ctx.fillStyle = 'rgba(0, 0, 0, 0.22)';
  ctx.beginPath();
  ctx.ellipse(0, height * 0.46, width * 0.36, height * 0.12, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = color;
  ctx.fillRect(-width / 2, -height / 2, width, height * 0.72);

  ctx.fillStyle = '#0f172a';
  ctx.fillRect(-width * 0.18, -height * 0.18, width * 0.36, height * 0.18);

  ctx.fillStyle = '#f8d9a0';
  ctx.fillRect(-width * 0.18, -height * 0.28, width * 0.36, height * 0.22);

  ctx.fillStyle = '#9fd7ff';
  ctx.fillRect(-width * 0.15, -height * 0.24, width * 0.28, height * 0.12);

  ctx.fillStyle = '#4a362a';
  ctx.fillRect(-width * 0.26, -height * 0.42, width * 0.12, height * 0.16);
  ctx.fillRect(width * 0.14, -height * 0.42, width * 0.12, height * 0.16);

  ctx.fillStyle = '#f9f9f9';
  ctx.fillRect(-width * 0.14, -height * 0.38, width * 0.08, height * 0.08);
  ctx.fillRect(width * 0.06, -height * 0.38, width * 0.08, height * 0.08);

  ctx.fillStyle = '#ffd166';
  ctx.fillRect(-width * 0.12, -height * 0.5, width * 0.06, height * 0.08);
  ctx.fillRect(width * 0.06, -height * 0.5, width * 0.06, height * 0.08);

  ctx.fillStyle = '#14191f';
  const wheelOffset = width * 0.22;
  const wheelY = height * 0.2;
  const wheelRadius = width * 0.12;
  for (const wheelX of [-wheelOffset, wheelOffset]) {
    ctx.fillRect(wheelX - wheelRadius * 0.6, wheelY - wheelRadius, wheelRadius * 1.2, wheelRadius * 2);
    ctx.fillStyle = '#d9dfe7';
    ctx.fillRect(wheelX - wheelRadius * 0.22, wheelY - wheelRadius * 0.62, wheelRadius * 0.44, wheelRadius * 1.24);
    ctx.fillStyle = '#14191f';
  }

  ctx.fillStyle = 'rgba(255, 255, 255, 0.26)';
  ctx.fillRect(-width * 0.22, -height * 0.06, width * 0.44, height * 0.1);

  ctx.restore();
}

function drawPlayer() {
  drawTruck(player.x, player.y, player.width, player.height, '#f9b233');
}

function drawObstacles() {
  obstacles.forEach((obstacle) => {
    drawTruck(obstacle.x, obstacle.y, obstacle.width, obstacle.height, obstacle.color);
  });
}

function draw() {
  drawSky();
  drawGrass();
  drawRoad();
  drawObstacles();
  drawPlayer();
}

function loop(timestamp) {
  const dt = Math.min((timestamp - state.lastTime) / 1000 || 0.016, 0.033);
  state.lastTime = timestamp;

  update(dt);
  draw();

  requestAnimationFrame(loop);
}

window.addEventListener('keydown', (event) => {
  const key = event.key.toLowerCase();

  if (key === 'a' || key === 'arrowleft') {
    keys.left = true;
  }

  if (key === 'd' || key === 'arrowright') {
    keys.right = true;
  }

  if (event.code === 'Space' && !state.running) {
    resetGame();
  }
});

window.addEventListener('keyup', (event) => {
  const key = event.key.toLowerCase();

  if (key === 'a' || key === 'arrowleft') {
    keys.left = false;
  }

  if (key === 'd' || key === 'arrowright') {
    keys.right = false;
  }
});

startButton.addEventListener('click', () => {
  resetGame();
});

scoreEl.textContent = '0';
speedEl.textContent = '0 km/h';
statusTitle.textContent = 'Prepare o caminhão';
statusText.textContent = 'Use A/D ou as setas para desviar dos veículos e manter a estrada segura.';
requestAnimationFrame(loop);
