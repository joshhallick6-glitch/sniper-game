import * as THREE from 'three';
import { MAP_SIZE } from './constants.js';

// ========================================
// MAP BUILDER
// Constructs the game world geometry,
// returns collider boxes for physics
// ========================================

// Material palette
const MATERIALS = {
    ground: new THREE.MeshStandardMaterial({ color: 0x4a5d23, roughness: 0.9, metalness: 0.0 }),
    building: new THREE.MeshStandardMaterial({ color: 0x808080, roughness: 0.8, metalness: 0.1 }),
    wall: new THREE.MeshStandardMaterial({ color: 0xa0522d, roughness: 0.85, metalness: 0.05 }),
    crate: new THREE.MeshStandardMaterial({ color: 0x8B4513, roughness: 0.9, metalness: 0.0 }),
    platform: new THREE.MeshStandardMaterial({ color: 0x696969, roughness: 0.7, metalness: 0.2 }),
    ramp: new THREE.MeshStandardMaterial({ color: 0x5a5a5a, roughness: 0.75, metalness: 0.15 }),
    sandbag: new THREE.MeshStandardMaterial({ color: 0xc2b280, roughness: 0.95, metalness: 0.0 }),
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
