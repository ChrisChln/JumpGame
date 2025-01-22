
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
canvas.width = 600;
canvas.height = 400;

const audioManager = {
  backgroundMusic: new Audio("audio/sea.mp3"),
  chargeSound: new Audio("audio/charge.mp3"),
  jumpSound: new Audio("audio/jump.mp3"),

  init() {
    this.backgroundMusic.loop = true;
    this.backgroundMusic.volume = 0.3;
    this.jumpSound.volume = 0.5;

    this.backgroundMusic.addEventListener('error', (e) => {
      console.error('背景音乐加载失败:', e);
    });

    this.chargeSound.addEventListener('error', (e) => {
      console.error('蓄力音效加载失败:', e);
    });

    this.jumpSound.addEventListener('error', (e) => {
      console.error('跳跃音效加载失败:', e);
    });
  },

  async startBackgroundMusic() {
    try {
      await this.backgroundMusic.play();
    } catch (error) {
      console.log('需要用户交互才能播放音乐:', error);
    }
  },

  playJumpSound() {
    try {
      this.jumpSound.currentTime = 0;
      this.jumpSound.play();
    } catch (error) {
      console.log('跳跃音效播放失败:', error);
    }
  }
};


audioManager.init();

let gameState = {
  isStarted: false,
  isGameOver: false
};
function showStartScreen() {
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);

  ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const centerX = canvas.width / 2;
  const centerY = canvas.height / 2;


  ctx.fillStyle = "white";
  ctx.font = "36px Arial";
  ctx.textAlign = "center";
  ctx.fillText("Jumping over sea", centerX, centerY - 60);


  ctx.font = "24px Arial";
  ctx.fillText("Hold to jump!", centerX, centerY);


  ctx.font = "18px Arial";
  ctx.fillText("Click to start game", centerX, centerY + 60);

  ctx.restore();
}

const PLATFORM_WIDTH = {
  MIN: 50,
  MAX: 120
};

const PLATFORM_GAP = {
  MIN: 150,
  MAX: 300
};

const MIN_DISTANCE = 1;
const MAX_DISTANCE = 100;

let pressTime = 0;
let isGameOver = false;
let score = 0;
let isCharging = false;
let chargeStartTime = 0;

const INITIAL_PLATFORM = { x: 100, y: 320, width: 100 };
const player = {
  x: INITIAL_PLATFORM.x + INITIAL_PLATFORM.width / 2,
  y: 300,
  size: 20,
  color: "#00796b",
  vx: 0,
  vy: 0,
  isJumping: false,
  squashFactor: 1
};

let platforms = [
  INITIAL_PLATFORM,
  generateTargetPlatform(INITIAL_PLATFORM.x)
];

let camera = {
  x: 0,
  y: 0,
  targetX: 0,
  targetY: 0
};

function generateTargetPlatform(lastPlatformX) {
  const platformWidth = Math.random() * (PLATFORM_WIDTH.MAX - PLATFORM_WIDTH.MIN) + PLATFORM_WIDTH.MIN;
  const gap = Math.random() * (PLATFORM_GAP.MAX - PLATFORM_GAP.MIN) + PLATFORM_GAP.MIN;
  const x = lastPlatformX + gap;
  return { x: Math.round(x), y: 320, width: Math.round(platformWidth) };
}

function drawScore() {
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = "#000";
  ctx.font = "20px Arial";
  ctx.fillText(`Score:  ${score}`, 20, 30);
  ctx.restore();
}

const playerImage = new Image();
playerImage.src = "image/file.png";

function drawPlayer() {
  ctx.save();
  ctx.translate(player.x - camera.x, player.y - camera.y);
  ctx.scale(1, player.squashFactor);

  const imageWidth = player.size * 3;
  const imageHeight = player.size * 2 * player.squashFactor; // 根据形变调整高度
  ctx.drawImage(
    playerImage,
    -imageWidth / 2,
    -imageHeight / 2,
    imageWidth,
    imageHeight
  );

  ctx.restore();
}


function updatePlayerSquash() {
  if (isCharging) {
    // 计算已蓄力时间
    const chargeDuration = (Date.now() - chargeStartTime) / 1000;
    // 让蓄力时间稍微延长一点
    player.squashFactor = Math.max(0.7, 1 - (chargeDuration * 0.3)); // 调整0.3来延长蓄力时间
  } else {
    // 不在蓄力状态时逐渐恢复原形
    player.squashFactor += (1 - player.squashFactor) * 0.2;
  }
}

function drawPlatforms() {
  platforms.forEach(platform => {
    // 创建阴影
    ctx.save();
    ctx.shadowColor = "rgba(0, 0, 0, 0.5)";
    ctx.shadowOffsetX = 2;
    ctx.shadowOffsetY = 2;
    ctx.shadowBlur = 4;

    const gradient = ctx.createLinearGradient(platform.x - camera.x, platform.y - camera.y, platform.x - camera.x, platform.y + 10 - camera.y);
    gradient.addColorStop(0, "#8d6e63");
    gradient.addColorStop(1, "#3e2723");

    ctx.fillStyle = gradient;
    ctx.fillRect(platform.x - camera.x, platform.y - camera.y, platform.width, 10);

    ctx.restore();
  });
}



function calculateLandingScore(playerX, platformX, platformWidth) {
  const platformCenter = platformX + platformWidth / 2;
  const tolerance = platformWidth * 0.2;

  if (Math.abs(playerX - platformCenter) <= tolerance) {
    return 2;
  }
  return 1;
}

function showPointsEarned(points) {
  const displayX = player.x - camera.x;
  const displayY = Math.max(60, player.y - camera.y - 60);

  ctx.fillStyle = points === 2 ? "#4CAF50" : "#2196F3";
  ctx.font = "bold 24px Arial";
  ctx.textAlign = "center";
  ctx.fillText(`+${points}`, displayX, displayY);
  ctx.textAlign = "left";
}

function updatePlayer() {
  if (player.isJumping) {
    player.x += player.vx * 0.05;
    player.y += player.vy * 0.05;

    const gravity = 1.5;
    player.vy += gravity;

    platforms.forEach(platform => {
      if (
        player.x + player.size > platform.x &&
        player.x - player.size < platform.x + platform.width &&
        player.y + player.size > platform.y &&
        player.y + player.size < platform.y + 10
      ) {
        player.y = platform.y - player.size;
        player.vy = 0;
        player.isJumping = false;

        if (platform !== platforms[0]) {
          const pointsEarned = calculateLandingScore(player.x, platform.x, platform.width);
          score += pointsEarned;
          showPointsEarned(pointsEarned);

          platforms.push(generateTargetPlatform(platform.x));
          platforms.shift();
        }
      }
    });

    if (player.y > canvas.height) {
      gameState.isGameOver = true;
      showGameOver();
    }
  }
}


function showGameOver() {
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);


  ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const centerX = canvas.width / 2;
  const centerY = canvas.height / 2;


  ctx.fillStyle = "white";
  ctx.font = "36px Arial";
  ctx.textAlign = "center";
  ctx.fillText(`You jump ${score} points！`, centerX, centerY - 40);


  ctx.font = "18px Arial";
  ctx.fillText("Click to restart！", centerX, centerY + 50);

  ctx.restore();

  canvas.addEventListener("click", restartGame, { once: true });
}

function updateCamera() {
  camera.targetX = player.x - canvas.width / 3;


  camera.x += (camera.targetX - camera.x) * 0.1;


  camera.x = Math.max(0, camera.x);

}

function restartGame() {
  gameState.isGameOver = false;
  gameState.isStarted = true;
  score = 0;

  player.x = INITIAL_PLATFORM.x + INITIAL_PLATFORM.width / 2;
  player.y = INITIAL_PLATFORM.y - player.size;
  player.vx = 0;
  player.vy = 0;
  player.isJumping = false;
  player.squashFactor = 1;
  isCharging = false;
  pressTime = 0;
  chargeStartTime = 0;

  camera.x = 0;
  camera.y = 0;
  camera.targetX = 0;
  camera.targetY = 0;

  platforms = [INITIAL_PLATFORM, generateTargetPlatform(INITIAL_PLATFORM.x)];

  requestAnimationFrame(gameLoop);
}


// 在用户首次点击时开始播放背景音乐
canvas.addEventListener('click', () => {
  audioManager.startBackgroundMusic();
}, { once: true }); // once: true 确保只绑定一次

// 删除重复的事件监听器，只保留这一组
canvas.addEventListener("mousedown", (e) => {
  // 如果游戏还未开始，则启动游戏
  if (!gameState.isStarted) {
    gameState.isStarted = true;
    // 开始播放背景音乐
    audioManager.startBackgroundMusic();
    return;
  }

  if (!gameState.isGameOver && !player.isJumping) {
    pressTime = Date.now();
    chargeStartTime = Date.now();
    isCharging = true;

    // 播放蓄力音效
    audioManager.chargeSound.currentTime = 0;
    audioManager.chargeSound.play().catch(e => console.log('蓄力音效播放失败:', e));
  }
});

canvas.addEventListener("mouseup", () => {
  if (!gameState.isGameOver && !player.isJumping) {
    const holdTime = (Date.now() - pressTime) / 1000;
    let jumpDistance = holdTime * 200;

    jumpDistance = Math.max(MIN_DISTANCE, Math.min(jumpDistance, MAX_DISTANCE));

    player.vx = jumpDistance;
    player.vy = -jumpDistance * 0.4;
    player.isJumping = true;
    isCharging = false;

    // 停止蓄力音效
    audioManager.chargeSound.pause();
    audioManager.chargeSound.currentTime = 0;

    // 播放跳跃音效
    audioManager.playJumpSound();
  }
});

// 在用户首次点击时开始播放背景音乐（保留这个）
canvas.addEventListener('click', () => {
  audioManager.startBackgroundMusic();
}, { once: true });

function gameLoop() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  if (!gameState.isStarted) {
    showStartScreen();
    return requestAnimationFrame(gameLoop);
  }

  if (!gameState.isGameOver) {
    updatePlayer();
    updatePlayerSquash();
    updateCamera();
    drawPlatforms();
    drawPlayer();
    drawScore();
    requestAnimationFrame(gameLoop);
  } else {
    showGameOver();
  }
}
// 启动游戏循环
gameLoop();