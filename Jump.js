const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
canvas.width = 600;
canvas.height = 400;

const PLATFORM_GAP = {
  MIN: 150,
  MAX: 300
};

const MIN_DISTANCE = 1;  
const MAX_DISTANCE = 100;

let pressTime = 0;
let isGameOver = false;
let score = 0;
let isCharging = false; // 添加蓄力状态
let chargeStartTime = 0; // 蓄力开始时间

const INITIAL_PLATFORM = { x: 100, y: 320, width: 100 };
const player = {
  x: INITIAL_PLATFORM.x + INITIAL_PLATFORM.width / 2,
  y: 300,
  size: 20,
  color: "#00796b",
  vx: 0,
  vy: 0,
  isJumping: false,
  squashFactor: 1 // 添加形变系数
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
  const platformWidth = 100;
  const gap = Math.random() * (PLATFORM_GAP.MAX - PLATFORM_GAP.MIN) + PLATFORM_GAP.MIN;
  const x = lastPlatformX + gap;
  return { x: Math.round(x), y: 320, width: platformWidth };
}

function drawScore() {
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = "#000";
  ctx.font = "20px Arial";
  ctx.fillText(`分数:  ${score}`, 20, 30);
  ctx.restore();
}

// 定义玩家的图片
const playerImage = new Image();
playerImage.src = "image/Character1.png"; // 替换为你的图片路径

function drawPlayer() {
  // 保存当前状态
  ctx.save();
  
  // 移动到玩家位置
  ctx.translate(player.x - camera.x, player.y - camera.y);
  
  // 应用形变
  ctx.scale(1, player.squashFactor);

  // 绘制图片
  const imageWidth = player.size * 2; // 图片的宽度，根据玩家大小调整
  const imageHeight = player.size * 2 * player.squashFactor; // 根据形变调整高度
  ctx.drawImage(
    playerImage, 
    -imageWidth / 2, // 图片的左上角 X 坐标
    -imageHeight / 2, // 图片的左上角 Y 坐标
    imageWidth, // 图片宽度
    imageHeight // 图片高度
  );

  // 恢复状态
  ctx.restore();
}


// 更新玩家形变
function updatePlayerSquash() {
  if (isCharging) {
    // 计算已蓄力时间
    const chargeDuration = (Date.now() - chargeStartTime) / 1000;
    // 根据蓄力时间计算压缩程度，最多压缩到0.7倍高度
    player.squashFactor = Math.max(0.7, 1 - chargeDuration * 0.5);
  } else {
    // 不在蓄力状态时逐渐恢复原形
    player.squashFactor += (1 - player.squashFactor) * 0.2;
  }
}

function drawPlatforms() {
  ctx.fillStyle = "#8d6e63";
  platforms.forEach(platform => {
    ctx.fillRect(platform.x - camera.x, platform.y - camera.y, platform.width, 10);
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
  
      // 增加重力加速度
      const gravity = 1.5; // 调大这个值
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
        isGameOver = true;
        showGameOver();
      }
    }
  }
  

function showGameOver() {
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  
  // 画一个半透明的遮罩层，防止背景被遮挡
  ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  const centerX = canvas.width / 2;
  const centerY = canvas.height / 2;
  
  // 游戏结束提示文字
  ctx.fillStyle = "white";
  ctx.font = "36px Arial";
  ctx.textAlign = "center";
  ctx.fillText(`哇塞宝宝真棒！你跳了${score}分`, centerX, centerY - 40);
  
  // 重新开始的提示文字
  ctx.font = "18px Arial";
  ctx.fillText("点击屏幕重新开始吧！", centerX, centerY + 50);
  
  ctx.restore();
  
  // 绑定点击事件来重新开始游戏
  canvas.addEventListener("click", restartGame, { once: true });
}

function updateCamera() {
  camera.targetX = player.x - canvas.width / 3;
  camera.targetY = player.y - canvas.height / 2;

  camera.x += (camera.targetX - camera.x) * 0.1;
  camera.y += (camera.targetY - camera.y) * 0.1;

  camera.x = Math.max(0, camera.x);
  camera.y = Math.max(0, camera.y);
}

function restartGame() {
    // 重置游戏状态
    isGameOver = false;      // 标记游戏状态为进行中
    score = 0;               // 重置分数
  
    // 重置玩家位置
    player.x = INITIAL_PLATFORM.x + INITIAL_PLATFORM.width / 2;
    player.y = INITIAL_PLATFORM.y - player.size;
    player.vx = 0;
    player.vy = 0;
    player.isJumping = false;
    player.squashFactor = 1; // 重置形变
    isCharging = false;      // 重置充能状态
    pressTime = 0;           // 重置按下时间
    chargeStartTime = 0;     // 重置充能开始时间
  
    // 重置相机位置
    camera.x = 0;
    camera.y = 0;
    camera.targetX = 0;
    camera.targetY = 0;
  
    // 重新生成平台
    platforms = [INITIAL_PLATFORM, generateTargetPlatform(INITIAL_PLATFORM.x)];
  
    // 重新开始游戏循环
    requestAnimationFrame(gameLoop);
  }

canvas.addEventListener("mousedown", () => {
  if (!isGameOver && !player.isJumping) {
    pressTime = Date.now();
    chargeStartTime = Date.now();
    isCharging = true;
  }
});

canvas.addEventListener("mouseup", () => {
  if (!isGameOver && !player.isJumping) {
    const holdTime = (Date.now() - pressTime) / 1000;
    let jumpDistance = holdTime * 200;

    jumpDistance = Math.max(MIN_DISTANCE, Math.min(jumpDistance, MAX_DISTANCE));

    player.vx = jumpDistance;
    player.vy = -jumpDistance * 0.5;
    player.isJumping = true;
    isCharging = false;
  }
});

function gameLoop() {
  if (!isGameOver) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    updatePlayer();
    updatePlayerSquash(); // 更新形变
    updateCamera();
    drawPlatforms();
    drawPlayer();
    drawScore();
    requestAnimationFrame(gameLoop);
  } else {
    showGameOver(); // 显示游戏结束画面
  }
}

// 启动游戏循环
gameLoop();
