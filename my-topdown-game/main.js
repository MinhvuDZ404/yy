// === A. KHỞI TẠO CANVAS & TÀI NGUYÊN ===
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
ctx.imageSmoothingEnabled = false; // Tắt làm mịn ảnh pixel

// Tải tài nguyên hình ảnh
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
        // Tạo ảnh fallback nếu không tìm thấy file PNG
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

// Nạp các assets
loadImage('grass', 'assets/environment/grass.png', '#48a048', 64, 64);
loadImage('tree', 'assets/environment/tree.png', '#2E8B57', 64, 96);
loadImage('player', 'assets/sprites/player_walk.png', '#00aaff', 256, 128);

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

// === C. ĐỐI TƯỢNG GAME (PLAYER & TREES) ===
const PLAYER_SPEED = 150; // Pixel / giây
const FRAME_DURATION = 1000 / 8; // 8 FPS = 125ms mỗi frame

const player = {
    x: 384,
    y: 284,
    width: 32,
    height: 32,
    // Hitbox ở chân nhân vật
    hitbox: { offsetX: 6, offsetY: 18, width: 20, height: 14 },
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
    const deltaTime = (currentTime - lastTime) / 1000; // Đổi sang giây
    lastTime = currentTime;

    update(deltaTime);
    render();

    requestAnimationFrame(gameLoop);
}

// === F. CẬP NHẬT LOGIC (UPDATE) ===
function update(dt) {
    let dx = 0;
    let dy = 0;

    // Phím bấm
    if (keys['a'] || keys['arrowleft']) { dx -= 1; player.direction = 1; }
    if (keys['d'] || keys['arrowright']) { dx += 1; player.direction = 2; }
    if (keys['w'] || keys['arrowup']) { dy -= 1; player.direction = 3; }
    if (keys['s'] || keys['arrowdown']) { dy += 1; player.direction = 0; }

    player.isMoving = dx !== 0 || dy !== 0;

    // Chuẩn hóa đường chéo
    if (dx !== 0 && dy !== 0) {
        dx *= 0.7071;
        dy *= 0.7071;
    }

    // Tách riêng di chuyển X và Y để nhân vật có thể trượt theo viền tường/cây
    if (dx !== 0) {
        player.x += dx * PLAYER_SPEED * dt;
        // Giới hạn khung màn hình
        player.x = Math.max(0, Math.min(canvas.width - player.width, player.x));
        
        // Kiểm tra va chạm cây theo chiều X
        const playerBox = getHitbox(player);
        trees.forEach(tree => {
            if (checkAABB(playerBox, getHitbox(tree))) {
                player.x -= dx * PLAYER_SPEED * dt; // Revert X
            }
        });
    }

    if (dy !== 0) {
        player.y += dy * PLAYER_SPEED * dt;
        // Giới hạn khung màn hình
        player.y = Math.max(0, Math.min(canvas.height - player.height, player.y));

        // Kiểm tra va chạm cây theo chiều Y
        const playerBox = getHitbox(player);
        trees.forEach(tree => {
            if (checkAABB(playerBox, getHitbox(tree))) {
                player.y -= dy * PLAYER_SPEED * dt; // Revert Y
            }
        });
    }

    // Tính toán Frame Animation 8 FPS
    if (player.isMoving) {
        player.animTimer += dt * 1000;
        if (player.animTimer >= FRAME_DURATION) {
            player.frameIndex = (player.frameIndex + 1) % 8; // Chuyển sang frame 0..7
            player.animTimer = 0;
        }
    } else {
        player.frameIndex = 0; // Đứng yên ở frame đầu
        player.animTimer = 0;
    }
}

// === G. VẼ MÀN HÌNH (RENDER & Y-SORTING) ===
function render() {
    // 1. Clear màn hình
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 2. Vẽ nền Cỏ (Tiling)
    const grassAsset = images['grass'];
    for (let x = 0; x < canvas.width; x += 64) {
        for (let y = 0; y < canvas.height; y += 64) {
            ctx.drawImage(grassAsset.img, x, y, 64, 64);
        }
    }

    // 3. Gom danh sách cần vẽ để sắp xếp thứ tự hiển thị (Y-Sorting)
    const renderList = [];

    // Thêm Cây vào danh sách
    trees.forEach(tree => {
        renderList.push({
            type: 'tree',
            ySort: tree.y + tree.hitbox.offsetY + tree.hitbox.height, // Căn theo chân gốc cây
            draw: () => {
                ctx.drawImage(images['tree'].img, tree.x, tree.y, tree.width, tree.height);
            }
        });
    });

    // Thêm Player vào danh sách
    renderList.push({
        type: 'player',
        ySort: player.y + player.hitbox.offsetY + player.hitbox.height, // Căn theo bàn chân
        draw: () => {
            if (images['player'].loaded) {
                // Vẽ Sprite Sheet thật: Crop từ frameIndex và direction
                const srcX = player.frameIndex * 32;
                const srcY = player.direction * 32;
                ctx.drawImage(
                    images['player'].img,
                    srcX, srcY, 32, 32,       // Tọa độ cắt ảnh gốc
                    player.x, player.y, 32, 32 // Tọa độ vẽ lên Canvas
                );
            } else {
                // Khối vẽ tạm nếu thiếu PNG
                ctx.fillStyle = '#00aaff';
                ctx.fillRect(player.x, player.y, player.width, player.height);
                ctx.fillStyle = '#ffffff';
                ctx.fillText(`Dir: ${player.direction}`, player.x, player.y - 5);
            }
        }
    });

    // Sắp xếp thứ tự vẽ: Entity nào có chân ở phía dưới (Y cao hơn) sẽ vẽ sau (đè lên trên)
    renderList.sort((a, b) => a.ySort - b.ySort);

    // Vẽ toàn bộ Entity đã được sắp xếp
    renderList.forEach(item => item.draw());
}