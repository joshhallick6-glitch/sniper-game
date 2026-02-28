import * as THREE from 'three';
import { DEFAULT_FOV } from './constants.js';

// ========================================
// SCENE MANAGER
// Handles renderer, camera, scene, lighting
// ========================================

export class SceneManager {
    constructor(canvas) {
        // Renderer
        this.renderer = new THREE.WebGLRenderer({
            canvas: canvas,
            antialias: true
        });
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.0;

        // Camera
        this.camera = new THREE.PerspectiveCamera(
            DEFAULT_FOV,
            window.innerWidth / window.innerHeight,
            0.1,
            500
        );
        this.camera.position.set(0, 1.0, 0);

        // Scene
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x87CEEB);

        // Camera must be in the scene tree so its children (e.g. gun model) are rendered
        this.scene.add(this.camera);

        // Fog for distance fade
        this.scene.fog = new THREE.FogExp2(0x87CEEB, 0.008);

        // Lighting setup
        this._setupLighting();

        // Handle window resize
        this._onResize = this._onResize.bind(this);
        window.addEventListener('resize', this._onResize);
    }

    _setupLighting() {
        // Directional light (sun) with shadows
        this.sunLight = new THREE.DirectionalLight(0xffffff, 1.0);
        this.sunLight.position.set(50, 80, 50);
        this.sunLight.castShadow = true;
        this.sunLight.shadow.mapSize.width = 2048;
        this.sunLight.shadow.mapSize.height = 2048;
        this.sunLight.shadow.camera.near = 0.5;
        this.sunLight.shadow.camera.far = 200;
        this.sunLight.shadow.camera.left = -60;
        this.sunLight.shadow.camera.right = 60;
        this.sunLight.shadow.camera.top = 60;
        this.sunLight.shadow.camera.bottom = -60;
        this.sunLight.shadow.bias = -0.001;
        this.scene.add(this.sunLight);

        // Ambient light for base illumination
        this.ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
        this.scene.add(this.ambientLight);

        // Hemisphere light for sky/ground color variation
        this.hemiLight = new THREE.HemisphereLight(0x87CEEB, 0x8B7355, 0.3);
        this.scene.add(this.hemiLight);
    }

    _onResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    render() {
        this.renderer.render(this.scene, this.camera);
    }

    getCamera() {
        return this.camera;
    }

    getScene() {
        return this.scene;
    }

    getRenderer() {
        return this.renderer;
    }

    dispose() {
        window.removeEventListener('resize', this._onResize);
        this.renderer.dispose();
    }
}
