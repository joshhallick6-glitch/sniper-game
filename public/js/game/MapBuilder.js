import * as THREE from 'three';
import { MAP_SIZE } from './constants.js';

// ========================================
// MAP BUILDER
// Constructs the game world geometry,
// returns collider boxes for physics
// ========================================

// ---- Procedural Canvas Texture Generators ----

/**
 * Create a THREE.CanvasTexture from a drawing function.
 * @param {number} width - Canvas width in pixels
 * @param {number} height - Canvas height in pixels
 * @param {Function} drawFn - function(ctx, width, height) that draws the pattern
 * @param {number} repeatX - Texture repeat in U direction
 * @param {number} repeatY - Texture repeat in V direction
 * @returns {THREE.CanvasTexture}
 */
function createCanvasTexture(width, height, drawFn, repeatX = 1, repeatY = 1) {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    drawFn(ctx, width, height);
    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(repeatX, repeatY);
    return texture;
}

/** Seeded-ish random helper for texture variation */
function rand(min, max) {
    return Math.random() * (max - min) + min;
}

function randInt(min, max) {
    return Math.floor(rand(min, max + 1));
}

// --- Ground texture: olive/grass with natural variation ---
function drawGroundTexture(ctx, w, h) {
    // Base olive-green fill
    ctx.fillStyle = '#4a5d23';
    ctx.fillRect(0, 0, w, h);

    // Large soft patches of color variation
    for (let i = 0; i < 30; i++) {
        const px = rand(0, w);
        const py = rand(0, h);
        const radius = rand(20, 80);
        const gradient = ctx.createRadialGradient(px, py, 0, px, py, radius);
        const shade = randInt(60, 100);
        const green = randInt(80, 130);
        gradient.addColorStop(0, `rgba(${shade}, ${green}, ${randInt(20, 50)}, 0.3)`);
        gradient.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, w, h);
    }

    // Many small darker green dots
    for (let i = 0; i < 800; i++) {
        const x = rand(0, w);
        const y = rand(0, h);
        const size = rand(1, 4);
        ctx.fillStyle = `rgba(${randInt(30, 60)}, ${randInt(50, 80)}, ${randInt(10, 30)}, ${rand(0.3, 0.7)})`;
        ctx.fillRect(x, y, size, size);
    }

    // Lighter green highlights
    for (let i = 0; i < 400; i++) {
        const x = rand(0, w);
        const y = rand(0, h);
        const size = rand(1, 3);
        ctx.fillStyle = `rgba(${randInt(80, 120)}, ${randInt(110, 160)}, ${randInt(30, 60)}, ${rand(0.2, 0.5)})`;
        ctx.fillRect(x, y, size, size);
    }

    // Tiny brown specks (dirt)
    for (let i = 0; i < 150; i++) {
        const x = rand(0, w);
        const y = rand(0, h);
        const size = rand(1, 3);
        ctx.fillStyle = `rgba(${randInt(80, 120)}, ${randInt(60, 80)}, ${randInt(20, 40)}, ${rand(0.3, 0.6)})`;
        ctx.fillRect(x, y, size, size);
    }

    // Very fine grass-like strokes
    ctx.lineWidth = 1;
    for (let i = 0; i < 300; i++) {
        const x = rand(0, w);
        const y = rand(0, h);
        ctx.strokeStyle = `rgba(${randInt(50, 80)}, ${randInt(70, 110)}, ${randInt(15, 40)}, ${rand(0.15, 0.35)})`;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + rand(-3, 3), y + rand(-6, -1));
        ctx.stroke();
    }
}

// --- Building texture: gray concrete with panels and cracks ---
function drawBuildingTexture(ctx, w, h) {
    // Base gray
    ctx.fillStyle = '#808080';
    ctx.fillRect(0, 0, w, h);

    // Subtle random noise across entire surface
    for (let i = 0; i < 2000; i++) {
        const x = rand(0, w);
        const y = rand(0, h);
        const val = randInt(100, 150);
        ctx.fillStyle = `rgba(${val}, ${val}, ${val}, ${rand(0.05, 0.15)})`;
        ctx.fillRect(x, y, rand(1, 3), rand(1, 3));
    }

    // Panel rectangles (lighter and darker patches)
    for (let i = 0; i < 12; i++) {
        const px = rand(0, w - 40);
        const py = rand(0, h - 30);
        const pw = rand(30, 80);
        const ph = rand(20, 60);
        const val = randInt(115, 145);
        ctx.fillStyle = `rgba(${val}, ${val}, ${val}, ${rand(0.15, 0.3)})`;
        ctx.fillRect(px, py, pw, ph);
    }

    // Darker panel patches
    for (let i = 0; i < 8; i++) {
        const px = rand(0, w - 30);
        const py = rand(0, h - 20);
        const pw = rand(20, 60);
        const ph = rand(15, 40);
        const val = randInt(70, 95);
        ctx.fillStyle = `rgba(${val}, ${val}, ${val}, ${rand(0.1, 0.25)})`;
        ctx.fillRect(px, py, pw, ph);
    }

    // Thin darker cracks
    ctx.strokeStyle = 'rgba(60, 60, 60, 0.3)';
    ctx.lineWidth = 1;
    for (let i = 0; i < 8; i++) {
        ctx.beginPath();
        let cx = rand(0, w);
        let cy = rand(0, h);
        ctx.moveTo(cx, cy);
        const segments = randInt(3, 7);
        for (let s = 0; s < segments; s++) {
            cx += rand(-15, 15);
            cy += rand(5, 20);
            ctx.lineTo(cx, cy);
        }
        ctx.stroke();
    }

    // Stain/water marks
    for (let i = 0; i < 5; i++) {
        const sx = rand(0, w);
        const sy = rand(0, h);
        const gradient = ctx.createRadialGradient(sx, sy, 0, sx, sy, rand(10, 30));
        gradient.addColorStop(0, 'rgba(70, 70, 65, 0.15)');
        gradient.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, w, h);
    }
}

// --- Wall texture: brick pattern with mortar lines ---
function drawWallTexture(ctx, w, h) {
    // Mortar base color
    ctx.fillStyle = '#b0a898';
    ctx.fillRect(0, 0, w, h);

    const brickH = 16;
    const brickW = 32;
    const mortarSize = 2;
    const brickColors = ['#8B4513', '#7A3B10', '#9C5424', '#6E3410', '#A0522D', '#8A4820', '#7E4018'];

    const rows = Math.ceil(h / (brickH + mortarSize));
    const cols = Math.ceil(w / (brickW + mortarSize)) + 1;

    for (let row = 0; row < rows; row++) {
        const offsetX = (row % 2 === 0) ? 0 : -(brickW / 2 + mortarSize / 2);
        const y = row * (brickH + mortarSize);

        for (let col = 0; col < cols; col++) {
            const x = col * (brickW + mortarSize) + offsetX;

            // Base brick color with variation
            const baseColor = brickColors[randInt(0, brickColors.length - 1)];
            ctx.fillStyle = baseColor;
            ctx.fillRect(x, y, brickW, brickH);

            // Subtle color variation within each brick
            for (let v = 0; v < 5; v++) {
                const vx = x + rand(0, brickW - 5);
                const vy = y + rand(0, brickH - 3);
                const val = randInt(80, 140);
                ctx.fillStyle = `rgba(${val}, ${Math.floor(val * 0.6)}, ${Math.floor(val * 0.3)}, ${rand(0.05, 0.15)})`;
                ctx.fillRect(vx, vy, rand(3, 10), rand(2, 5));
            }

            // Fine noise on brick surface
            for (let n = 0; n < 8; n++) {
                const nx = x + rand(0, brickW);
                const ny = y + rand(0, brickH);
                ctx.fillStyle = `rgba(0, 0, 0, ${rand(0.03, 0.1)})`;
                ctx.fillRect(nx, ny, 1, 1);
            }
        }
    }

    // Redraw mortar lines on top to clean up any overlap
    ctx.fillStyle = '#b0a898';
    for (let row = 0; row <= rows; row++) {
        const y = row * (brickH + mortarSize) - mortarSize / 2;
        ctx.fillRect(0, y, w, mortarSize);
    }
    for (let row = 0; row < rows; row++) {
        const offsetX = (row % 2 === 0) ? 0 : -(brickW / 2 + mortarSize / 2);
        const y = row * (brickH + mortarSize);
        for (let col = 0; col <= cols; col++) {
            const x = col * (brickW + mortarSize) + offsetX - mortarSize / 2;
            ctx.fillRect(x, y, mortarSize, brickH);
        }
    }
}

// --- Crate texture: wood planks with grain ---
function drawCrateTexture(ctx, w, h) {
    // Base wood color
    ctx.fillStyle = '#8B4513';
    ctx.fillRect(0, 0, w, h);

    const plankCount = 6;
    const plankW = w / plankCount;
    const plankColors = ['#7A3B10', '#8B4513', '#9C5424', '#6E3410', '#845020', '#7E4218'];

    // Draw vertical planks
    for (let i = 0; i < plankCount; i++) {
        const x = i * plankW;
        ctx.fillStyle = plankColors[i % plankColors.length];
        ctx.fillRect(x, 0, plankW, h);

        // Vertical grain lines within each plank
        for (let g = 0; g < 8; g++) {
            const gx = x + rand(2, plankW - 2);
            ctx.strokeStyle = `rgba(${randInt(40, 80)}, ${randInt(20, 50)}, ${randInt(5, 20)}, ${rand(0.15, 0.4)})`;
            ctx.lineWidth = rand(0.5, 1.5);
            ctx.beginPath();
            let gy = rand(0, h * 0.2);
            ctx.moveTo(gx, gy);
            while (gy < h) {
                gy += rand(5, 20);
                ctx.lineTo(gx + rand(-1.5, 1.5), gy);
            }
            ctx.stroke();
        }

        // Divider line between planks
        ctx.fillStyle = 'rgba(40, 20, 5, 0.5)';
        ctx.fillRect(x, 0, 1.5, h);
    }

    // Horizontal plank divisions (2-3 cross boards)
    const crossBoards = [h * 0.15, h * 0.5, h * 0.85];
    for (const cy of crossBoards) {
        ctx.fillStyle = `rgb(${randInt(90, 110)}, ${randInt(50, 70)}, ${randInt(15, 30)})`;
        ctx.fillRect(0, cy - 6, w, 12);
        // Edge lines
        ctx.fillStyle = 'rgba(30, 15, 5, 0.6)';
        ctx.fillRect(0, cy - 6, w, 1.5);
        ctx.fillRect(0, cy + 5, w, 1.5);
        // Grain on cross board
        for (let g = 0; g < 12; g++) {
            const gx = rand(0, w);
            ctx.strokeStyle = `rgba(50, 30, 10, ${rand(0.15, 0.3)})`;
            ctx.lineWidth = 0.7;
            ctx.beginPath();
            ctx.moveTo(gx, cy - 5);
            ctx.lineTo(gx + rand(-2, 2), cy + 5);
            ctx.stroke();
        }
    }

    // Wood knots
    for (let k = 0; k < 4; k++) {
        const kx = rand(10, w - 10);
        const ky = rand(10, h - 10);
        const kr = rand(3, 7);
        const gradient = ctx.createRadialGradient(kx, ky, 0, kx, ky, kr);
        gradient.addColorStop(0, 'rgba(50, 25, 8, 0.6)');
        gradient.addColorStop(0.5, 'rgba(70, 35, 12, 0.3)');
        gradient.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.ellipse(kx, ky, kr, kr * 1.3, rand(0, Math.PI), 0, Math.PI * 2);
        ctx.fill();
    }

    // Fine noise
    for (let i = 0; i < 500; i++) {
        const nx = rand(0, w);
        const ny = rand(0, h);
        ctx.fillStyle = `rgba(${randInt(30, 70)}, ${randInt(15, 40)}, ${randInt(5, 15)}, ${rand(0.03, 0.1)})`;
        ctx.fillRect(nx, ny, 1, 1);
    }
}

// --- Platform texture: diamond plate metal ---
function drawPlatformTexture(ctx, w, h) {
    // Base gray metal
    ctx.fillStyle = '#696969';
    ctx.fillRect(0, 0, w, h);

    // Subtle metallic gradient sheen
    const sheen = ctx.createLinearGradient(0, 0, w, h);
    sheen.addColorStop(0, 'rgba(130, 130, 130, 0.15)');
    sheen.addColorStop(0.5, 'rgba(80, 80, 80, 0.1)');
    sheen.addColorStop(1, 'rgba(120, 120, 120, 0.15)');
    ctx.fillStyle = sheen;
    ctx.fillRect(0, 0, w, h);

    // Diamond pattern grid
    const diamondSpacing = 16;
    const diamondSize = 5;

    for (let row = 0; row < Math.ceil(h / diamondSpacing) + 1; row++) {
        for (let col = 0; col < Math.ceil(w / diamondSpacing) + 1; col++) {
            const offsetX = (row % 2 === 0) ? 0 : diamondSpacing / 2;
            const cx = col * diamondSpacing + offsetX;
            const cy = row * diamondSpacing;

            // Raised diamond shape
            ctx.fillStyle = 'rgba(140, 140, 140, 0.5)';
            ctx.beginPath();
            ctx.moveTo(cx, cy - diamondSize);
            ctx.lineTo(cx + diamondSize, cy);
            ctx.lineTo(cx, cy + diamondSize);
            ctx.lineTo(cx - diamondSize, cy);
            ctx.closePath();
            ctx.fill();

            // Highlight on top-left edges
            ctx.strokeStyle = 'rgba(180, 180, 180, 0.4)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(cx - diamondSize, cy);
            ctx.lineTo(cx, cy - diamondSize);
            ctx.lineTo(cx + diamondSize, cy);
            ctx.stroke();

            // Shadow on bottom-right edges
            ctx.strokeStyle = 'rgba(40, 40, 40, 0.3)';
            ctx.beginPath();
            ctx.moveTo(cx + diamondSize, cy);
            ctx.lineTo(cx, cy + diamondSize);
            ctx.lineTo(cx - diamondSize, cy);
            ctx.stroke();
        }
    }

    // Surface scratches
    for (let i = 0; i < 15; i++) {
        ctx.strokeStyle = `rgba(${randInt(100, 160)}, ${randInt(100, 160)}, ${randInt(100, 160)}, ${rand(0.1, 0.25)})`;
        ctx.lineWidth = rand(0.3, 1);
        ctx.beginPath();
        const sx = rand(0, w);
        const sy = rand(0, h);
        ctx.moveTo(sx, sy);
        ctx.lineTo(sx + rand(-30, 30), sy + rand(-30, 30));
        ctx.stroke();
    }

    // Fine noise for metallic grain
    for (let i = 0; i < 800; i++) {
        const nx = rand(0, w);
        const ny = rand(0, h);
        const val = randInt(80, 130);
        ctx.fillStyle = `rgba(${val}, ${val}, ${val}, ${rand(0.04, 0.1)})`;
        ctx.fillRect(nx, ny, 1, 1);
    }
}

// --- Ramp texture: anti-slip tread with ridges ---
function drawRampTexture(ctx, w, h) {
    // Dark gray base
    ctx.fillStyle = '#5a5a5a';
    ctx.fillRect(0, 0, w, h);

    // Horizontal ridges/grooves across the surface
    const ridgeSpacing = 8;
    const ridgeHeight = 3;

    for (let y = 0; y < h; y += ridgeSpacing) {
        // Ridge top (lighter)
        ctx.fillStyle = 'rgba(120, 120, 120, 0.4)';
        ctx.fillRect(0, y, w, ridgeHeight);

        // Ridge highlight edge
        ctx.fillStyle = 'rgba(150, 150, 150, 0.3)';
        ctx.fillRect(0, y, w, 1);

        // Ridge shadow edge
        ctx.fillStyle = 'rgba(30, 30, 30, 0.35)';
        ctx.fillRect(0, y + ridgeHeight, w, 1);
    }

    // Cross-hatched anti-slip pattern overlay
    ctx.strokeStyle = 'rgba(90, 90, 90, 0.25)';
    ctx.lineWidth = 1.5;
    const hatchSpacing = 12;
    // Diagonal lines one direction
    for (let i = -h; i < w + h; i += hatchSpacing) {
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(i + h, h);
        ctx.stroke();
    }
    // Diagonal lines other direction
    for (let i = -h; i < w + h; i += hatchSpacing) {
        ctx.beginPath();
        ctx.moveTo(i, h);
        ctx.lineTo(i + h, 0);
        ctx.stroke();
    }

    // Subtle wear marks
    for (let i = 0; i < 10; i++) {
        const wx = rand(0, w);
        const wy = rand(0, h);
        const gradient = ctx.createRadialGradient(wx, wy, 0, wx, wy, rand(8, 25));
        gradient.addColorStop(0, 'rgba(80, 80, 80, 0.2)');
        gradient.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, w, h);
    }

    // Fine noise
    for (let i = 0; i < 600; i++) {
        const nx = rand(0, w);
        const ny = rand(0, h);
        const val = randInt(50, 100);
        ctx.fillStyle = `rgba(${val}, ${val}, ${val}, ${rand(0.05, 0.12)})`;
        ctx.fillRect(nx, ny, 1, 1);
    }
}

// --- Sandbag texture: burlap weave ---
function drawSandbagTexture(ctx, w, h) {
    // Tan base
    ctx.fillStyle = '#c2b280';
    ctx.fillRect(0, 0, w, h);

    // Subtle color variation patches
    for (let i = 0; i < 15; i++) {
        const px = rand(0, w);
        const py = rand(0, h);
        const gradient = ctx.createRadialGradient(px, py, 0, px, py, rand(10, 30));
        gradient.addColorStop(0, `rgba(${randInt(170, 210)}, ${randInt(155, 195)}, ${randInt(100, 140)}, 0.2)`);
        gradient.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, w, h);
    }

    // Horizontal weave lines
    const weaveSpacing = 4;
    ctx.lineWidth = 1;
    for (let y = 0; y < h; y += weaveSpacing) {
        ctx.strokeStyle = `rgba(${randInt(140, 170)}, ${randInt(125, 155)}, ${randInt(80, 110)}, ${rand(0.3, 0.5)})`;
        ctx.beginPath();
        ctx.moveTo(0, y);
        // Slightly wavy line
        for (let x = 0; x < w; x += 8) {
            ctx.lineTo(x, y + rand(-0.5, 0.5));
        }
        ctx.stroke();
    }

    // Vertical weave lines
    for (let x = 0; x < w; x += weaveSpacing) {
        ctx.strokeStyle = `rgba(${randInt(140, 170)}, ${randInt(125, 155)}, ${randInt(80, 110)}, ${rand(0.3, 0.5)})`;
        ctx.beginPath();
        ctx.moveTo(x, 0);
        for (let y = 0; y < h; y += 8) {
            ctx.lineTo(x + rand(-0.5, 0.5), y);
        }
        ctx.stroke();
    }

    // Crosshatch intersections (slightly darker at crossings)
    for (let y = 0; y < h; y += weaveSpacing) {
        for (let x = 0; x < w; x += weaveSpacing) {
            ctx.fillStyle = `rgba(${randInt(120, 150)}, ${randInt(110, 140)}, ${randInt(70, 100)}, ${rand(0.08, 0.18)})`;
            ctx.fillRect(x - 1, y - 1, 2, 2);
        }
    }

    // Fine noise for fabric texture
    for (let i = 0; i < 400; i++) {
        const nx = rand(0, w);
        const ny = rand(0, h);
        ctx.fillStyle = `rgba(${randInt(100, 160)}, ${randInt(90, 140)}, ${randInt(60, 100)}, ${rand(0.05, 0.15)})`;
        ctx.fillRect(nx, ny, 1, 1);
    }
}

// ---- Generate textures and build material palette ----
const TEXTURES = {
    ground:   createCanvasTexture(512, 512, drawGroundTexture, 16, 16),
    building: createCanvasTexture(256, 256, drawBuildingTexture, 4, 4),
    wall:     createCanvasTexture(256, 256, drawWallTexture, 2, 2),
    crate:    createCanvasTexture(256, 256, drawCrateTexture, 1, 1),
    platform: createCanvasTexture(256, 256, drawPlatformTexture, 3, 3),
    ramp:     createCanvasTexture(256, 256, drawRampTexture, 2, 2),
    sandbag:  createCanvasTexture(128, 128, drawSandbagTexture, 2, 2),
};

// Material palette (now with procedural canvas textures)
const MATERIALS = {
    ground:   new THREE.MeshStandardMaterial({ map: TEXTURES.ground,   roughness: 0.9,  metalness: 0.0  }),
    building: new THREE.MeshStandardMaterial({ map: TEXTURES.building, roughness: 0.8,  metalness: 0.1  }),
    wall:     new THREE.MeshStandardMaterial({ map: TEXTURES.wall,     roughness: 0.85, metalness: 0.05 }),
    crate:    new THREE.MeshStandardMaterial({ map: TEXTURES.crate,    roughness: 0.9,  metalness: 0.0  }),
    platform: new THREE.MeshStandardMaterial({ map: TEXTURES.platform, roughness: 0.7,  metalness: 0.2  }),
    ramp:     new THREE.MeshStandardMaterial({ map: TEXTURES.ramp,     roughness: 0.75, metalness: 0.15 }),
    sandbag:  new THREE.MeshStandardMaterial({ map: TEXTURES.sandbag,  roughness: 0.95, metalness: 0.0  }),
};

export class MapBuilder {
    constructor(scene) {
        this.scene = scene;
        this.colliders = [];
    }

    /**
     * Build the entire map and return array of THREE.Box3 colliders.
     */
    build() {
        this._buildGround();
        this._buildBuildings();
        this._buildLowWalls();
        this._buildCrates();
        this._buildSandbags();
        this._buildPlatforms();

        return this.colliders;
    }

    // ---- Helper: create a box mesh, add to scene, and optionally add a collider ----
    _createBox(width, height, depth, material, x, y, z, addCollider = true) {
        const geometry = new THREE.BoxGeometry(width, height, depth);
        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.set(x, y, z);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        this.scene.add(mesh);

        if (addCollider) {
            const box = new THREE.Box3().setFromObject(mesh);
            this.colliders.push(box);
        }

        return mesh;
    }

    // ---- Ground ----
    _buildGround() {
        const geometry = new THREE.PlaneGeometry(MAP_SIZE, MAP_SIZE);
        const mesh = new THREE.Mesh(geometry, MATERIALS.ground);
        mesh.rotation.x = -Math.PI / 2;
        mesh.position.y = 0;
        mesh.receiveShadow = true;
        this.scene.add(mesh);
    }

    // ---- Buildings (4-6 structures around map edges) ----
    _buildBuildings() {
        // Building 1: NW corner - tall L-shaped building
        this._buildBuildingNW();

        // Building 2: NE corner - two-story block
        this._buildBuildingNE();

        // Building 3: SW corner - watchtower-style
        this._buildBuildingSW();

        // Building 4: SE corner - wide warehouse
        this._buildBuildingSE();

        // Building 5: North center - sniper perch
        this._buildBuildingNorth();

        // Building 6: South center - bunker
        this._buildBuildingSouth();
    }

    _buildBuildingNW() {
        const bx = -35, bz = -35;
        // Main block
        this._createBox(8, 10, 6, MATERIALS.building, bx, 5, bz);
        // Wing extending east
        this._createBox(6, 8, 4, MATERIALS.building, bx + 7, 4, bz);
        // Window opening - leave gap on south wall by building with walls on either side
        this._createBox(3, 4, 0.5, MATERIALS.building, bx - 2.5, 6, bz + 3);
        this._createBox(3, 4, 0.5, MATERIALS.building, bx + 2.5, 6, bz + 3);
    }

    _buildBuildingNE() {
        const bx = 35, bz = -30;
        // Ground floor
        this._createBox(10, 6, 8, MATERIALS.building, bx, 3, bz);
        // Second floor (smaller footprint)
        this._createBox(8, 6, 6, MATERIALS.building, bx, 9, bz);
        // Window slit on west face
        this._createBox(0.5, 2, 2, MATERIALS.building, bx - 5.25, 9, bz - 1.5);
        this._createBox(0.5, 2, 2, MATERIALS.building, bx - 5.25, 9, bz + 1.5);
    }

    _buildBuildingSW() {
        const bx = -38, bz = 32;
        // Base
        this._createBox(6, 4, 6, MATERIALS.building, bx, 2, bz);
        // Tower section
        this._createBox(4, 8, 4, MATERIALS.building, bx, 8, bz);
        // Top platform overhang
        this._createBox(6, 0.5, 6, MATERIALS.platform, bx, 12.25, bz);
    }

    _buildBuildingSE() {
        const bx = 32, bz = 35;
        // Wide warehouse
        this._createBox(14, 7, 10, MATERIALS.building, bx, 3.5, bz);
        // Window openings (gaps in front wall)
        this._createBox(3, 3, 0.5, MATERIALS.building, bx - 4, 5.5, bz - 5.25);
        this._createBox(3, 3, 0.5, MATERIALS.building, bx + 4, 5.5, bz - 5.25);
    }

    _buildBuildingNorth() {
        const bx = 0, bz = -42;
        // Elevated sniper nest
        this._createBox(5, 12, 5, MATERIALS.building, bx, 6, bz);
        // Observation slit all around at top
        this._createBox(5.5, 0.5, 5.5, MATERIALS.platform, bx, 12.25, bz);
    }

    _buildBuildingSouth() {
        const bx = 5, bz = 40;
        // Low bunker
        this._createBox(10, 3, 8, MATERIALS.building, bx, 1.5, bz);
        // Roof (slightly larger)
        this._createBox(11, 0.5, 9, MATERIALS.platform, bx, 3.25, bz);
    }

    // ---- Low walls for ground cover ----
    _buildLowWalls() {
        const wallH = 1.2;
        const wallD = 0.4;

        // Scattered cover walls
        this._createBox(5, wallH, wallD, MATERIALS.wall, -10, wallH / 2, -5);
        this._createBox(6, wallH, wallD, MATERIALS.wall, 8, wallH / 2, 10);
        this._createBox(wallD, wallH, 4, MATERIALS.wall, -15, wallH / 2, 12);
        this._createBox(4, wallH, wallD, MATERIALS.wall, 20, wallH / 2, -15);
        this._createBox(wallD, wallH, 5, MATERIALS.wall, -5, wallH / 2, -20);
        this._createBox(3, wallH, wallD, MATERIALS.wall, 15, wallH / 2, 25);

        // Cross-shaped cover in center
        this._createBox(6, wallH, wallD, MATERIALS.wall, 0, wallH / 2, 0);
        this._createBox(wallD, wallH, 6, MATERIALS.wall, 0, wallH / 2, 0);

        // Additional walls for variety
        this._createBox(4, wallH, wallD, MATERIALS.wall, -22, wallH / 2, -25);
        this._createBox(wallD, wallH, 3.5, MATERIALS.wall, 25, wallH / 2, 5);
        this._createBox(5, wallH, wallD, MATERIALS.wall, -8, wallH / 2, 28);
        this._createBox(3, wallH, wallD, MATERIALS.wall, 12, wallH / 2, -30);
    }

    // ---- Crates (small boxes in groups) ----
    _buildCrates() {
        const crateGroups = [
            { x: -5, z: 15 },
            { x: 18, z: -8 },
            { x: -20, z: -10 },
            { x: 10, z: 20 },
            { x: -15, z: 30 },
            { x: 25, z: -25 },
        ];

        for (const group of crateGroups) {
            // 2-4 crates per group in a cluster
            this._createBox(1, 1, 1, MATERIALS.crate, group.x, 0.5, group.z);
            this._createBox(1, 1, 1, MATERIALS.crate, group.x + 1.1, 0.5, group.z);
            this._createBox(1, 1, 1, MATERIALS.crate, group.x + 0.5, 1.5, group.z); // stacked
            if (Math.abs(group.x) > 10) {
                // Extra crate for perimeter groups
                this._createBox(1, 1, 1, MATERIALS.crate, group.x, 0.5, group.z + 1.1);
            }
        }
    }

    // ---- Sandbag positions (low curved cover, approximated with boxes) ----
    _buildSandbags() {
        const sbH = 0.8;
        const sbD = 0.6;

        // Sandbag arc #1 (near center-west)
        this._createBox(2, sbH, sbD, MATERIALS.sandbag, -12, sbH / 2, 3);
        this._createBox(1.5, sbH, sbD * 1.2, MATERIALS.sandbag, -13.2, sbH / 2, 3.8);
        this._createBox(1.5, sbH, sbD * 1.2, MATERIALS.sandbag, -10.8, sbH / 2, 3.8);

        // Sandbag arc #2 (near center-east)
        this._createBox(2, sbH, sbD, MATERIALS.sandbag, 14, sbH / 2, -3);
        this._createBox(1.5, sbH, sbD * 1.2, MATERIALS.sandbag, 15.2, sbH / 2, -3.8);
        this._createBox(1.5, sbH, sbD * 1.2, MATERIALS.sandbag, 12.8, sbH / 2, -3.8);

        // Sandbag line #3 (south area)
        this._createBox(3, sbH, sbD, MATERIALS.sandbag, 0, sbH / 2, 18);
        this._createBox(1, sbH * 1.2, sbD, MATERIALS.sandbag, -1.8, sbH * 0.6, 18);
        this._createBox(1, sbH * 1.2, sbD, MATERIALS.sandbag, 1.8, sbH * 0.6, 18);

        // Sandbag position #4 (north area)
        this._createBox(2.5, sbH, sbD, MATERIALS.sandbag, -5, sbH / 2, -30);
        this._createBox(sbD, sbH, 1.5, MATERIALS.sandbag, -6.3, sbH / 2, -29.5);
    }

    // ---- Elevated platforms with ramps ----
    _buildPlatforms() {
        // Platform 1: east side
        const p1x = 25, p1z = 15;
        const p1h = 3;

        // Platform surface
        this._createBox(6, 0.5, 6, MATERIALS.platform, p1x, p1h, p1z);
        // Support pillars
        this._createBox(0.5, p1h, 0.5, MATERIALS.platform, p1x - 2.75, p1h / 2, p1z - 2.75);
        this._createBox(0.5, p1h, 0.5, MATERIALS.platform, p1x + 2.75, p1h / 2, p1z - 2.75);
        this._createBox(0.5, p1h, 0.5, MATERIALS.platform, p1x - 2.75, p1h / 2, p1z + 2.75);
        this._createBox(0.5, p1h, 0.5, MATERIALS.platform, p1x + 2.75, p1h / 2, p1z + 2.75);
        // Guard wall on platform
        this._createBox(6, 0.8, 0.3, MATERIALS.wall, p1x, p1h + 0.65, p1z - 2.85);

        // Ramp going up to platform (angled box)
        this._buildRamp(p1x, 0, p1z + 5, p1x, p1h, p1z + 3, 2, 6);

        // Platform 2: west side
        const p2x = -28, p2z = 0;
        const p2h = 2.5;

        // Platform surface
        this._createBox(5, 0.5, 5, MATERIALS.platform, p2x, p2h, p2z);
        // Support pillars
        this._createBox(0.5, p2h, 0.5, MATERIALS.platform, p2x - 2.25, p2h / 2, p2z - 2.25);
        this._createBox(0.5, p2h, 0.5, MATERIALS.platform, p2x + 2.25, p2h / 2, p2z - 2.25);
        this._createBox(0.5, p2h, 0.5, MATERIALS.platform, p2x - 2.25, p2h / 2, p2z + 2.25);
        this._createBox(0.5, p2h, 0.5, MATERIALS.platform, p2x + 2.25, p2h / 2, p2z + 2.25);
        // Guard walls
        this._createBox(5, 0.8, 0.3, MATERIALS.wall, p2x, p2h + 0.65, p2z + 2.35);
        this._createBox(0.3, 0.8, 5, MATERIALS.wall, p2x + 2.35, p2h + 0.65, p2z);

        // Ramp going up from the east side
        this._buildRamp(p2x + 5, 0, p2z, p2x + 2.5, p2h, p2z, 2, 5);
    }

    /**
     * Build a ramp from ground position to elevated position.
     * Approximated as a series of stacking thin boxes (steps).
     */
    _buildRamp(startX, startY, startZ, endX, endY, endZ, width, steps) {
        const dx = (endX - startX) / steps;
        const dy = (endY - startY) / steps;
        const dz = (endZ - startZ) / steps;
        const stepLength = Math.sqrt(dx * dx + dz * dz) * 1.2; // slight overlap

        for (let i = 0; i < steps; i++) {
            const x = startX + dx * (i + 0.5);
            const y = startY + dy * (i + 0.5);
            const z = startZ + dz * (i + 0.5);
            const stepHeight = dy;

            this._createBox(
                Math.abs(dx) > Math.abs(dz) ? stepLength : width,
                Math.max(stepHeight, 0.3),
                Math.abs(dz) > Math.abs(dx) ? stepLength : width,
                MATERIALS.ramp,
                x, y, z
            );
        }
    }
}
