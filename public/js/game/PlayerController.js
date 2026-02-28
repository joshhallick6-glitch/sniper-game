import * as THREE from 'three';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';
import {
    PLAYER_SPEED,
    SPRINT_MULTIPLIER,
    PLAYER_HEIGHT,
    MAP_SIZE
} from './constants.js';

// ========================================
// PLAYER CONTROLLER
// First-person movement with pointer lock,
// collision detection, and map clamping
// ========================================

export class PlayerController {
    constructor(camera, scene, mapColliders) {
        this.camera = camera;
        this.scene = scene;
        this.mapColliders = mapColliders || [];

        // Pointer lock controls handle mouse look
        this.controls = new PointerLockControls(camera, document.body);

        // Movement vectors
        this.velocity = new THREE.Vector3();
        this.direction = new THREE.Vector3();
        this.moveForward = false;
        this.moveBackward = false;
        this.moveLeft = false;
        this.moveRight = false;
        this.sprinting = false;

        // Temp vectors for collision checks
        this._playerBox = new THREE.Box3();
        this._playerSize = new THREE.Vector3(0.5, PLAYER_HEIGHT, 0.5);
        this._prevPosition = new THREE.Vector3();
    }

    /**
     * Update player position based on input.
     * @param {number} delta - Time since last frame in seconds
     * @param {InputManager} input - Input manager instance
     * @param {boolean} isScoped - Whether the player is currently scoped in
     */
    update(delta, input, isScoped) {
        if (!this.controls.isLocked) return;

        // Read input
        this.moveForward = input.isKeyDown('KeyW');
        this.moveBackward = input.isKeyDown('KeyS');
        this.moveLeft = input.isKeyDown('KeyA');
        this.moveRight = input.isKeyDown('KeyD');
        this.sprinting = input.isKeyDown('ShiftLeft') || input.isKeyDown('ShiftRight');

        // Calculate speed
        let speed = PLAYER_SPEED;
        if (this.sprinting && !isScoped) {
            speed *= SPRINT_MULTIPLIER;
        }
        if (isScoped) {
            speed *= 0.5; // Slower movement when scoped
        }

        // Save previous position for collision rollback
        this._prevPosition.copy(this.camera.position);

        // Compute movement direction relative to camera facing
        this.direction.set(0, 0, 0);

        if (this.moveForward) {
            this.direction.z -= 1;
        }
        if (this.moveBackward) {
            this.direction.z += 1;
        }
        if (this.moveLeft) {
            this.direction.x -= 1;
        }
        if (this.moveRight) {
            this.direction.x += 1;
        }

        if (this.direction.lengthSq() > 0) {
            this.direction.normalize();
        }

        // Apply movement using PointerLockControls methods
        // moveForward/moveRight move along camera's facing direction
        if (this.direction.z !== 0) {
            this.controls.moveForward(-this.direction.z * speed * delta);
        }
        if (this.direction.x !== 0) {
            this.controls.moveRight(this.direction.x * speed * delta);
        }

        // Clamp to ground (no jumping/falling)
        this.camera.position.y = PLAYER_HEIGHT / 2;

        // Clamp to map boundaries
        const halfMap = MAP_SIZE / 2 - 1;
        this.camera.position.x = Math.max(-halfMap, Math.min(halfMap, this.camera.position.x));
        this.camera.position.z = Math.max(-halfMap, Math.min(halfMap, this.camera.position.z));

        // Collision detection against map objects
        this._checkCollisions();
    }

    /**
     * Simple AABB collision: if the player overlaps any collider, revert position.
     */
    _checkCollisions() {
        // Build player bounding box at current position
        const pos = this.camera.position;
        this._playerBox.setFromCenterAndSize(
            new THREE.Vector3(pos.x, PLAYER_HEIGHT / 2, pos.z),
            this._playerSize
        );

        for (let i = 0; i < this.mapColliders.length; i++) {
            if (this._playerBox.intersectsBox(this.mapColliders[i])) {
                // Collision detected -- try to slide along each axis separately

                // Try reverting X only
                const testPos = new THREE.Vector3(
                    this._prevPosition.x,
                    PLAYER_HEIGHT / 2,
                    pos.z
                );
                const testBox = new THREE.Box3().setFromCenterAndSize(testPos, this._playerSize);

                if (!testBox.intersectsBox(this.mapColliders[i])) {
                    // Sliding along Z is fine, revert X
                    this.camera.position.x = this._prevPosition.x;
                    return;
                }

                // Try reverting Z only
                testPos.set(pos.x, PLAYER_HEIGHT / 2, this._prevPosition.z);
                testBox.setFromCenterAndSize(testPos, this._playerSize);

                if (!testBox.intersectsBox(this.mapColliders[i])) {
                    // Sliding along X is fine, revert Z
                    this.camera.position.z = this._prevPosition.z;
                    return;
                }

                // Both axes cause collision -- full revert
                this.camera.position.x = this._prevPosition.x;
                this.camera.position.z = this._prevPosition.z;
                return;
            }
        }
    }

    /**
     * Get current world position.
     */
    getPosition() {
        return {
            x: this.camera.position.x,
            y: this.camera.position.y,
            z: this.camera.position.z
        };
    }

    /**
     * Get current camera rotation (euler angles).
     */
    getRotation() {
        return {
            x: this.camera.rotation.x,
            y: this.camera.rotation.y
        };
    }

    /**
     * Teleport player to a position.
     */
    setPosition(pos) {
        this.camera.position.set(pos.x, pos.y || PLAYER_HEIGHT / 2, pos.z);
    }

    /**
     * Lock pointer (start controlling).
     */
    lock() {
        this.controls.lock();
    }

    /**
     * Unlock pointer.
     */
    unlock() {
        this.controls.unlock();
    }

    /**
     * Check if pointer is locked.
     */
    isLocked() {
        return this.controls.isLocked;
    }

    /**
     * Get the underlying PointerLockControls instance.
     */
    getControls() {
        return this.controls;
    }

    dispose() {
        this.controls.dispose();
    }
}
