import * as THREE from 'three';
import { PLAYER_HEIGHT } from './constants.js';

// ========================================
// REMOTE PLAYER
// Visual representation of another player.
// Handles server state interpolation for
// smooth movement rendering.
// ========================================

export class RemotePlayer {
    constructor(scene) {
        this.scene = scene;

        // Interpolation states
        this.prevState = { position: { x: 0, y: 0, z: 0 }, rotation: { x: 0, y: 0 } };
        this.currState = { position: { x: 0, y: 0, z: 0 }, rotation: { x: 0, y: 0 } };
        this.interpProgress = 1; // 0..1, starts fully interpolated

        // Build the player model
        this.group = new THREE.Group();
        this._buildModel();

        // Initially hidden until we get first state update
        this.group.visible = false;
        this.scene.add(this.group);

        // Track if this player is alive
        this.alive = true;
    }

    /**
     * Build a simple humanoid model from basic geometries.
     */
    _buildModel() {
        // Body material (red / enemy color)
        const bodyMat = new THREE.MeshStandardMaterial({
            color: 0xcc3333,
            roughness: 0.6,
            metalness: 0.2
        });
        const headMat = new THREE.MeshStandardMaterial({
            color: 0xaa2222,
            roughness: 0.5,
            metalness: 0.2
        });
        const gunMat = new THREE.MeshStandardMaterial({
            color: 0x2a2a2a,
            roughness: 0.3,
            metalness: 0.8
        });

        // Body (torso)
        const bodyGeo = new THREE.BoxGeometry(0.6, 1.0, 0.4);
        this.body = new THREE.Mesh(bodyGeo, bodyMat);
        this.body.position.y = 0.7; // waist height
        this.body.castShadow = true;
        this.group.add(this.body);

        // Legs (simple boxes below body)
        const legGeo = new THREE.BoxGeometry(0.2, 0.7, 0.25);
        const leftLeg = new THREE.Mesh(legGeo, bodyMat);
        leftLeg.position.set(-0.15, 0.05, 0);
        leftLeg.castShadow = true;
        this.group.add(leftLeg);

        const rightLeg = new THREE.Mesh(legGeo, bodyMat);
        rightLeg.position.set(0.15, 0.05, 0);
        rightLeg.castShadow = true;
        this.group.add(rightLeg);

        // Head (sphere on top)
        const headGeo = new THREE.SphereGeometry(0.2, 8, 8);
        this.head = new THREE.Mesh(headGeo, headMat);
        this.head.position.y = 1.4;
        this.head.castShadow = true;
        this.group.add(this.head);

        // Arms
        const armGeo = new THREE.BoxGeometry(0.15, 0.7, 0.2);
        const leftArm = new THREE.Mesh(armGeo, bodyMat);
        leftArm.position.set(-0.4, 0.75, 0);
        leftArm.castShadow = true;
        this.group.add(leftArm);

        const rightArm = new THREE.Mesh(armGeo, bodyMat);
        rightArm.position.set(0.4, 0.75, 0.1);
        rightArm.rotation.x = -0.3; // aiming forward
        rightArm.castShadow = true;
        this.group.add(rightArm);

        // Gun (thin box extending forward from right hand)
        const gunGeo = new THREE.BoxGeometry(0.06, 0.06, 0.5);
        this.gun = new THREE.Mesh(gunGeo, gunMat);
        this.gun.position.set(0.4, 0.8, -0.25);
        this.gun.castShadow = true;
        this.group.add(this.gun);
    }

    /**
     * Called when new state arrives from the server.
     * @param {{ position: {x,y,z}, rotation: {x,y}, alive: boolean }} state
     */
    updateFromServer(state) {
        // Shift current to previous
        this.prevState = {
            position: { ...this.currState.position },
            rotation: { ...this.currState.rotation }
        };

        // Set new current state
        this.currState = {
            position: { ...state.position },
            rotation: { ...state.rotation }
        };

        // Reset interpolation progress
        this.interpProgress = 0;

        // Update alive state (server sends isAlive)
        if (state.isAlive !== undefined) {
            this.alive = state.isAlive;
            this.group.visible = this.alive;
        } else {
            this.group.visible = true;
        }
    }

    /**
     * Smoothly interpolate between previous and current server states.
     * @param {number} delta - Time since last frame in seconds
     * @param {number} tickInterval - Server tick interval in ms (e.g. 50)
     */
    interpolate(delta, tickInterval) {
        if (!this.group.visible) return;

        // Advance interpolation
        this.interpProgress += (delta * 1000) / tickInterval;
        const t = Math.min(this.interpProgress, 1);

        // Lerp position
        const px = this.prevState.position.x + (this.currState.position.x - this.prevState.position.x) * t;
        const py = this.prevState.position.y + (this.currState.position.y - this.prevState.position.y) * t;
        const pz = this.prevState.position.z + (this.currState.position.z - this.prevState.position.z) * t;
        this.group.position.set(px, py - PLAYER_HEIGHT / 2, pz);

        // Lerp rotation (only yaw for the body)
        const ry = this._lerpAngle(this.prevState.rotation.y, this.currState.rotation.y, t);
        this.group.rotation.y = ry;

        // Tilt head based on pitch
        const rx = this.prevState.rotation.x + (this.currState.rotation.x - this.prevState.rotation.x) * t;
        if (this.head) {
            this.head.rotation.x = rx;
        }
    }

    /**
     * Lerp between two angles, handling wrap-around.
     */
    _lerpAngle(a, b, t) {
        let diff = b - a;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        return a + diff * t;
    }

    /**
     * Show or hide this remote player.
     */
    setVisible(visible) {
        this.group.visible = visible;
    }

    /**
     * Get the current interpolated world position.
     */
    getPosition() {
        return {
            x: this.group.position.x,
            y: this.group.position.y + PLAYER_HEIGHT / 2,
            z: this.group.position.z
        };
    }

    /**
     * Remove from scene and clean up geometries.
     */
    dispose() {
        this.scene.remove(this.group);
        this.group.traverse((child) => {
            if (child.geometry) child.geometry.dispose();
            if (child.material) child.material.dispose();
        });
    }
}
