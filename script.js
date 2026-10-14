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

function drawSky() {
  ctx.fillStyle = '#8bc3ff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = '#d8edf7';
  ctx.fillRect(0, 0, canvas.width, 120);

  ctx.fillStyle = '#a7d7ff';
  for (let i = 0; i < 20; i += 1) {
    const x = (i * 83 + (state.distance * 0.4)) % (canvas.width + 80) - 40;
    const y = 70 + (i % 5) * 18;
    ctx.beginPath();
    ctx.arc(x, y, 10, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawGrass() {
  ctx.fillStyle = '#1a7d3e';
  ctx.fillRect(0, 120, canvas.width, canvas.height - 120);

  ctx.fillStyle = '#2aa85a';
  ctx.fillRect(0, 120, canvas.width, 16);

  for (let i = 0; i < 120; i += 1) {
    const x = (i * 48 + road.scroll * 0.25) % (canvas.width + 80) - 40;
    const y = 130 + (i % 6) * 35;
    ctx.fillStyle = '#e6f7ce';
    ctx.fillRect(x, y, 8, 12);
  }
}

function drawRoad() {
  ctx.fillStyle = '#2f353d';
  ctx.fillRect(road.x, 120, road.width, canvas.height - 120);

  ctx.fillStyle = '#4e5863';
  ctx.fillRect(road.x - 14, 120, 14, canvas.height - 120);
  ctx.fillRect(road.x + road.width, 120, 14, canvas.height - 120);

  ctx.strokeStyle = '#f4f7fa';
  ctx.lineWidth = 6;
  ctx.setLineDash([30, 24]);
  ctx.beginPath();
  ctx.moveTo(road.x + road.laneWidth, 120);
  ctx.lineTo(road.x + road.laneWidth, canvas.height);
  ctx.moveTo(road.x + road.laneWidth * 2, 120);
  ctx.lineTo(road.x + road.laneWidth * 2, canvas.height);
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.fillStyle = '#d8dfe8';
  for (let i = 0; i < 20; i += 1) {
    const y = ((i * 70 + road.scroll) % (canvas.height + 80)) - 40;
    ctx.fillRect(road.x + road.width / 2 - 3, y, 6, 40);
  }
}

function drawTruck(x, y, width, height, color) {
  ctx.fillStyle = color;
  ctx.fillRect(x - width / 2, y - height / 2, width, height * 0.7);

  ctx.fillStyle = '#e8d39a';
  ctx.fillRect(x - width * 0.2, y - height * 0.35, width * 0.4, height * 0.25);

  ctx.fillStyle = '#4a362a';
  ctx.fillRect(x - width * 0.28, y - height * 0.46, width * 0.14, height * 0.18);
  ctx.fillRect(x + width * 0.14, y - height * 0.46, width * 0.14, height * 0.18);

  ctx.fillStyle = '#1d1d1d';
  ctx.fillRect(x - width * 0.32, y + height * 0.2, width * 0.14, height * 0.18);
  ctx.fillRect(x + width * 0.18, y + height * 0.2, width * 0.14, height * 0.18);

  ctx.fillStyle = '#f5f5f5';
  ctx.fillRect(x - width * 0.2, y - height * 0.42, width * 0.1, height * 0.1);
  ctx.fillRect(x + width * 0.1, y - height * 0.42, width * 0.1, height * 0.1);
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
