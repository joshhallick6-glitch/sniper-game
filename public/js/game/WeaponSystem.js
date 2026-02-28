import * as THREE from 'three';
import {
    MAX_AMMO,
    SHOT_COOLDOWN,
    RELOAD_TIME,
    SCOPE_FOV,
    DEFAULT_FOV,
    FOV_LERP_SPEED,
    SCOPE_SWAY_AMOUNT,
    RECOIL_AMOUNT,
    RECOIL_RECOVERY_SPEED
} from './constants.js';

// ========================================
// WEAPON SYSTEM
// Handles shooting, scoping, reloading,
// gun model, recoil, and visual effects
// ========================================

export class WeaponSystem {
    constructor(camera, scene) {
        this.camera = camera;
        this.scene = scene;

        // Ammo state
        this.ammo = MAX_AMMO;
        this._isReloading = false;
        this.lastShotTime = 0;

        // Scope state
        this._isScoped = false;
        this._prevRightMouse = false;

        // Recoil tracking
        this.recoilOffset = 0;

        // Scope sway timer
        this.swayTime = 0;

        // Tracer lines to clean up
        this._tracers = [];

        // Build the gun model and attach to camera
        this._buildGunModel();
    }

    /**
     * Create a simple gun model from box geometries.
     * Attached as a child of the camera so it moves with the view.
     */
    _buildGunModel() {
        this.gunGroup = new THREE.Group();

        // Gun materials
        const metalMat = new THREE.MeshStandardMaterial({
            color: 0x2a2a2a,
            roughness: 0.3,
            metalness: 0.8
        });
        const woodMat = new THREE.MeshStandardMaterial({
            color: 0x5c3a1e,
            roughness: 0.8,
            metalness: 0.1
        });

        // Barrel
        const barrelGeo = new THREE.BoxGeometry(0.03, 0.03, 0.6);
        const barrel = new THREE.Mesh(barrelGeo, metalMat);
        barrel.position.set(0, 0, -0.35);
        this.gunGroup.add(barrel);

        // Receiver / body
        const bodyGeo = new THREE.BoxGeometry(0.05, 0.06, 0.25);
        const body = new THREE.Mesh(bodyGeo, metalMat);
        body.position.set(0, -0.01, -0.05);
        this.gunGroup.add(body);

        // Stock
        const stockGeo = new THREE.BoxGeometry(0.04, 0.08, 0.2);
        const stock = new THREE.Mesh(stockGeo, woodMat);
        stock.position.set(0, -0.02, 0.15);
        this.gunGroup.add(stock);

        // Scope (on top of receiver)
        const scopeGeo = new THREE.BoxGeometry(0.025, 0.035, 0.15);
        const scope = new THREE.Mesh(scopeGeo, metalMat);
        scope.position.set(0, 0.04, -0.08);
        this.gunGroup.add(scope);

        // Magazine
        const magGeo = new THREE.BoxGeometry(0.03, 0.08, 0.04);
        const mag = new THREE.Mesh(magGeo, metalMat);
        mag.position.set(0, -0.06, 0);
        this.gunGroup.add(mag);

        // Position gun in bottom-right of view
        this.gunGroup.position.set(0.25, -0.2, -0.4);
        this.gunGroup.rotation.set(0, 0, 0);

        // Store default position for animations
        this._gunDefaultPos = this.gunGroup.position.clone();
        this._gunDefaultRot = this.gunGroup.rotation.clone();

        // Barrel tip position (for muzzle flash)
        this._barrelTip = new THREE.Vector3(0.25, -0.2, -0.95);

        this.camera.add(this.gunGroup);
    }

    /**
     * Update weapon state each frame.
     * @param {number} delta - Time since last frame in seconds
     * @param {InputManager} input - Input manager
     * @returns {{ wantsToShoot: boolean }}
     */
    update(delta, input) {
        // ---- Scope toggle (right mouse button) ----
        const rightDown = input.isMouseDown(2);
        if (rightDown && !this._prevRightMouse) {
            this._isScoped = !this._isScoped;
        }
        this._prevRightMouse = rightDown;

        // Lerp FOV
        const targetFov = this._isScoped ? SCOPE_FOV : DEFAULT_FOV;
        this.camera.fov += (targetFov - this.camera.fov) * FOV_LERP_SPEED * delta;
        this.camera.updateProjectionMatrix();

        // Hide gun model when scoped
        this.gunGroup.visible = !this._isScoped;

        // ---- Scope sway ----
        if (this._isScoped) {
            this.swayTime += delta;
            const swayX = Math.sin(this.swayTime * 1.5) * SCOPE_SWAY_AMOUNT;
            const swayY = Math.cos(this.swayTime * 1.1) * SCOPE_SWAY_AMOUNT * 0.7;
            this.camera.rotation.x += swayX;
            this.camera.rotation.y += swayY;
        }

        // ---- Recoil recovery ----
        if (this.recoilOffset > 0) {
            const recovery = RECOIL_RECOVERY_SPEED * delta;
            this.recoilOffset = Math.max(0, this.recoilOffset - recovery);
            // Gradually return camera pitch
            this.camera.rotation.x += recovery * 0.5;
        }

        // ---- Check if player wants to shoot ----
        const wantsToShoot = input.isMouseDown(0) && this.canShoot();

        // ---- Clean up expired tracers ----
        const now = performance.now();
        this._tracers = this._tracers.filter(t => {
            if (now - t.time > 200) {
                this.scene.remove(t.line);
                t.line.geometry.dispose();
                t.line.material.dispose();
                return false;
            }
            return true;
        });

        return { wantsToShoot };
    }

    /**
     * Fire the weapon. Returns shot origin and direction.
     */
    shoot() {
        this.ammo--;
        this.lastShotTime = performance.now();

        // Apply recoil (kick camera up)
        this.camera.rotation.x += RECOIL_AMOUNT;
        this.recoilOffset += RECOIL_AMOUNT;

        // Gun kick animation
        this._animateGunKick();

        // Muzzle flash
        this._createMuzzleFlash();

        // Tracer line
        this._createTracer();

        // Get shot ray data
        const origin = this.camera.position.clone();
        const direction = new THREE.Vector3();
        this.camera.getWorldDirection(direction);

        return {
            origin: { x: origin.x, y: origin.y, z: origin.z },
            direction: { x: direction.x, y: direction.y, z: direction.z }
        };
    }

    /**
     * Begin reload sequence.
     */
    reload() {
        if (this._isReloading || this.ammo === MAX_AMMO) return;

        this._isReloading = true;

        // Animate gun down
        this._animateReload();

        // After RELOAD_TIME, restore ammo
        setTimeout(() => {
            this.ammo = MAX_AMMO;
            this._isReloading = false;
        }, RELOAD_TIME);
    }

    /**
     * Check if the weapon can fire.
     */
    canShoot() {
        if (this.ammo <= 0) return false;
        if (this._isReloading) return false;
        if (performance.now() - this.lastShotTime < SHOT_COOLDOWN) return false;
        return true;
    }

    /**
     * Whether the player is currently looking through scope.
     */
    isScoped() {
        return this._isScoped;
    }

    /**
     * Current ammo count.
     */
    getAmmo() {
        return this.ammo;
    }

    /**
     * Whether currently reloading.
     */
    isReloading() {
        return this._isReloading;
    }

    // ---- Visual effects ----

    _animateGunKick() {
        // Quick kick back and return
        const startZ = this._gunDefaultPos.z;
        this.gunGroup.position.z = startZ + 0.08;
        this.gunGroup.rotation.x = -0.1;

        // Animate back over 150ms using a simple timeout chain
        setTimeout(() => {
            this.gunGroup.position.z = startZ + 0.04;
            this.gunGroup.rotation.x = -0.05;
        }, 50);
        setTimeout(() => {
            this.gunGroup.position.z = startZ;
            this.gunGroup.rotation.x = this._gunDefaultRot.x;
        }, 150);
    }

    _animateReload() {
        const startY = this._gunDefaultPos.y;

        // Move gun down
        setTimeout(() => {
            this.gunGroup.position.y = startY - 0.3;
            this.gunGroup.rotation.x = 0.3;
        }, 100);

        // Hold down
        // Move gun back up near end of reload
        setTimeout(() => {
            this.gunGroup.position.y = startY - 0.15;
            this.gunGroup.rotation.x = 0.15;
        }, RELOAD_TIME - 500);

        setTimeout(() => {
            this.gunGroup.position.y = startY;
            this.gunGroup.rotation.x = this._gunDefaultRot.x;
        }, RELOAD_TIME);
    }

    _createMuzzleFlash() {
        // Brief point light at barrel tip
        const flash = new THREE.PointLight(0xffaa00, 3, 8);
        const worldPos = new THREE.Vector3();
        this.camera.localToWorld(this._barrelTip.clone());
        flash.position.copy(this.camera.position);
        this.scene.add(flash);

        // Remove after a short time
        setTimeout(() => {
            this.scene.remove(flash);
            flash.dispose();
        }, 60);
    }

    _createTracer() {
        const origin = this.camera.position.clone();
        const direction = new THREE.Vector3();
        this.camera.getWorldDirection(direction);

        // Tracer end point (far distance along direction)
        const end = origin.clone().add(direction.multiplyScalar(200));

        const geometry = new THREE.BufferGeometry().setFromPoints([origin, end]);
        const material = new THREE.LineBasicMaterial({
            color: 0xffff88,
            transparent: true,
            opacity: 0.6
        });
        const line = new THREE.Line(geometry, material);
        this.scene.add(line);

        this._tracers.push({ line, time: performance.now() });
    }
}
