// === A. KHỞI TẠO CANVAS & TÀI NGUYÊN ===
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
ctx.imageSmoothingEnabled = false; // Giữ pixel art nét căng khi phóng to

const images = {};
let loadedImagesCount = 0;
const totalImages = 3;

function loadImage(key, src, fallbackColor, width, height) {
    const img = new Image();
    img.src = src;
    img.onload = () => {
        images[key] = { img, loaded: true };
        checkAllLoaded();
    };
    img.onerror = () => {
        const fallbackCanvas = document.createElement('canvas');
        fallbackCanvas.width = width;
        fallbackCanvas.height = height;
        const fCtx = fallbackCanvas.getContext('2d');
        fCtx.fillStyle = fallbackColor;
        fCtx.fillRect(0, 0, width, height);
        images[key] = { img: fallbackCanvas, loaded: false };
        checkAllLoaded();
    };
}

// Nạp các assets (Lưu ý Player giờ là 512x256 px cho chuẩn 64x64 px)
loadImage('grass', 'assets/environment/grass.png', '#48a048', 64, 64);
loadImage('tree', 'assets/environment/tree.png', '#2E8B57', 64, 96);
loadImage('player', 'assets/sprites/player_walk.png', '#00aaff', 512, 256);

function checkAllLoaded() {
    loadedImagesCount++;
    if (loadedImagesCount === totalImages) {
        requestAnimationFrame(gameLoop);
    }
}

// === B. ĐIỀU KHIỂN BÀN PHÍM ===
const keys = {};
window.addEventListener('keydown', e => keys[e.key.toLowerCase()] = true);
window.addEventListener('keyup', e => keys[e.key.toLowerCase()] = false);

// === C. ĐỐI TƯỢNG GAME (PLAYER 64x64 PX & TREES) ===
const PLAYER_SPEED = 180; // Tăng nhẹ tốc độ di chuyển cho hợp kích thước mới
const FRAME_DURATION = 1000 / 8; // 8 FPS = 125ms / frame

const player = {
    x: 368,
    y: 268,
    width: 64,  // Nâng lên 64px
    height: 64, // Nâng lên 64px
    // Hitbox bàn chân mới cho kích thước 64x64 px
    hitbox: { offsetX: 16, offsetY: 40, width: 32, height: 20 },
    direction: 0, // 0: Down, 1: Left, 2: Right, 3: Up
    frameIndex: 0,
    animTimer: 0,
    isMoving: false
};

const trees = [
    { x: 150, y: 100, width: 64, height: 96, hitbox: { offsetX: 16, offsetY: 70, width: 32, height: 20 } },
    { x: 550, y: 150, width: 64, height: 96, hitbox: { offsetX: 16, offsetY: 70, width: 32, height: 20 } },
    { x: 300, y: 350, width: 64, height: 96, hitbox: { offsetX: 16, offsetY: 70, width: 32, height: 20 } },
    { x: 500, y: 400, width: 64, height: 96, hitbox: { offsetX: 16, offsetY: 70, width: 32, height: 20 } }
];

// === D. XỬ LÝ VA CHẠM AABB ===
function getHitbox(obj) {
    return {
        x: obj.x + obj.hitbox.offsetX,
        y: obj.y + obj.hitbox.offsetY,
        width: obj.hitbox.width,
        height: obj.hitbox.height
    };
}

function checkAABB(rect1, rect2) {
    return (
        rect1.x < rect2.x + rect2.width &&
        rect1.x + rect1.width > rect2.x &&
        rect1.y < rect2.y + rect2.height &&
        rect1.y + rect1.height > rect2.y
    );
}

// === E. GAME LOOP TRUYỀN THỐNG ===
let lastTime = performance.now();

function gameLoop(currentTime) {
    const deltaTime = (currentTime - lastTime) / 1000;
    lastTime = currentTime;

    update(deltaTime);
    render();

    requestAnimationFrame(gameLoop);
}

// === F. CẬP NHẬT LOGIC (UPDATE) ===
function update(dt) {
    let dx = 0;
    let dy = 0;

    if (keys['a'] || keys['arrowleft']) { dx -= 1; player.direction = 1; }
    if (keys['d'] || keys['arrowright']) { dx += 1; player.direction = 2; }
    if (keys['w'] || keys['arrowup']) { dy -= 1; player.direction = 3; }
    if (keys['s'] || keys['arrowdown']) { dy += 1; player.direction = 0; }

    player.isMoving = dx !== 0 || dy !== 0;

    if (dx !== 0 && dy !== 0) {
        dx *= 0.7071;
        dy *= 0.7071;
    }

    if (dx !== 0) {
        player.x += dx * PLAYER_SPEED * dt;
        player.x = Math.max(0, Math.min(canvas.width - player.width, player.x));
        
        const playerBox = getHitbox(player);
        trees.forEach(tree => {
            if (checkAABB(playerBox, getHitbox(tree))) {
                player.x -= dx * PLAYER_SPEED * dt;
            }
        });
    }

    if (dy !== 0) {
        player.y += dy * PLAYER_SPEED * dt;
        player.y = Math.max(0, Math.min(canvas.height - player.height, player.y));

        const playerBox = getHitbox(player);
        trees.forEach(tree => {
            if (checkAABB(playerBox, getHitbox(tree))) {
                player.y -= dy * PLAYER_SPEED * dt;
            }
        });
    }

    // Animation 8 FPS
    if (player.isMoving) {
        player.animTimer += dt * 1000;
        if (player.animTimer >= FRAME_DURATION) {
            player.frameIndex = (player.frameIndex + 1) % 8;
            player.animTimer = 0;
        }
    } else {
        player.frameIndex = 0;
        player.animTimer = 0;
    }
}

// === G. VẼ MÀN HÌNH (RENDER 64x64 PX & Y-SORTING) ===
function render() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Vẽ nền cỏ
    const grassAsset = images['grass'];
    for (let x = 0; x < canvas.width; x += 64) {
        for (let y = 0; y < canvas.height; y += 64) {
            ctx.drawImage(grassAsset.img, x, y, 64, 64);
        }
    }

    const renderList = [];

    // Thêm Cây
    trees.forEach(tree => {
        renderList.push({
            type: 'tree',
            ySort: tree.y + tree.hitbox.offsetY + tree.hitbox.height,
            draw: () => {
                ctx.drawImage(images['tree'].img, tree.x, tree.y, tree.width, tree.height);
            }
        });
    });

    // Thêm Player (Cắt frame 64x64 px)
    renderList.push({
        type: 'player',
        ySort: player.y + player.hitbox.offsetY + player.hitbox.height,
        draw: () => {
            if (images['player'].loaded) {
                // Crop từ Sprite Sheet 64x64 px (Ô cắt rộng 64px, cao 64px)
                const srcX = player.frameIndex * 64;
                const srcY = player.direction * 64;
                ctx.drawImage(
                    images['player'].img,
                    srcX, srcY, 64, 64,        // Crop 64x64 px từ tệp gốc
                    player.x, player.y, 64, 64 // Vẽ 64x64 px lên màn hình
                );
            } else {
                ctx.fillStyle = '#00aaff';
                ctx.fillRect(player.x, player.y, player.width, player.height);
            }
        }
    });

    // Sắp xếp độ sâu Y-Sorting
    renderList.sort((a, b) => a.ySort - b.ySort);
    renderList.forEach(item => item.draw());
}