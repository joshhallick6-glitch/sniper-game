import { SceneManager } from './SceneManager.js';
import { InputManager } from './InputManager.js';
import { PlayerController } from './PlayerController.js';
import { MapBuilder } from './MapBuilder.js';
import { WeaponSystem } from './WeaponSystem.js';
import { NetworkManager } from './NetworkManager.js';
import { RemotePlayer } from './RemotePlayer.js';
import { HUD } from './HUD.js';
import { MAX_AMMO, NETWORK_SEND_RATE } from './constants.js';

// ========================================
// MAIN GAME ENTRY POINT
// Initializes all systems, wires up events,
// and runs the game loop.
// ========================================

// ---- Parse URL parameters ----
const urlParams = new URLSearchParams(window.location.search);
const roomCode = urlParams.get('room') || 'default';
const username = urlParams.get('username') || 'Player';

// ---- Game state ----
let isAlive = true;
let localKills = 0;
let localDeaths = 0;
let localHealth = 100;
const maxHealth = 100;

// Remote players map: socketId -> RemotePlayer
const remotePlayers = new Map();

// ---- Initialize engine systems ----
const canvas = document.getElementById('game-canvas');
const sceneManager = new SceneManager(canvas);
const camera = sceneManager.getCamera();
const scene = sceneManager.getScene();

const inputManager = new InputManager();
const mapBuilder = new MapBuilder(scene);
const colliders = mapBuilder.build();

const playerController = new PlayerController(camera, scene, colliders);
const weaponSystem = new WeaponSystem(camera, scene);
const hud = new HUD();
const networkManager = new NetworkManager(roomCode, username);

// ---- Initial HUD state ----
hud.updateHealth(localHealth, maxHealth);
hud.updateAmmo(MAX_AMMO, MAX_AMMO);
hud.updateKills(localKills, localDeaths);
hud.showClickToPlay();

// ---- Click to play: lock pointer and start ----
const clickToPlayEl = document.getElementById('click-to-play');
clickToPlayEl.addEventListener('click', () => {
    playerController.lock();
});

// When pointer lock is acquired, hide the overlay
playerController.getControls().addEventListener('lock', () => {
    hud.hideClickToPlay();
});

// When pointer lock is lost (e.g., user presses Escape), show overlay
playerController.getControls().addEventListener('unlock', () => {
    if (isAlive) {
        hud.showClickToPlay();
    }
});

// ---- Network event handlers ----

/**
 * game:state - Server sends the authoritative game state each tick.
 * Contains all player positions, health, alive status, etc.
 */
networkManager.on('game:state', (state) => {
    if (!state || !state.players) return;

    const myId = networkManager.getSocketId();

    for (const [playerId, playerData] of Object.entries(state.players)) {
        if (playerId === myId) {
            // Update local state from server (authoritative health, kills, deaths)
            if (playerData.health !== undefined) {
                localHealth = playerData.health;
                hud.updateHealth(localHealth, maxHealth);
            }
            if (playerData.kills !== undefined) {
                localKills = playerData.kills;
            }
            if (playerData.deaths !== undefined) {
                localDeaths = playerData.deaths;
            }
            hud.updateKills(localKills, localDeaths);
            continue;
        }

        // Remote player update
        if (!remotePlayers.has(playerId)) {
            // Create new remote player representation
            const remote = new RemotePlayer(scene);
            remotePlayers.set(playerId, remote);
        }

        const remote = remotePlayers.get(playerId);
        remote.updateFromServer(playerData);
    }

    // Remove remote players no longer in server state
    for (const [playerId, remote] of remotePlayers) {
        if (!state.players[playerId]) {
            remote.dispose();
            remotePlayers.delete(playerId);
        }
    }
});

/**
 * hit:confirmed - Our shot hit someone.
 */
networkManager.on('hit:confirmed', (data) => {
    hud.showHitMarker();
});

/**
 * player:killed - Someone was killed (kill feed event).
 */
networkManager.on('player:killed', (data) => {
    const killer = data.killerName || 'Unknown';
    const victim = data.victimName || 'Unknown';
    hud.addKillFeedMessage(`${killer} eliminated ${victim}`);
});

/**
 * player:died - The local player has died.
 */
networkManager.on('player:died', (data) => {
    isAlive = false;
    const killerName = data.killerName || 'Unknown';
    const respawnTime = data.respawnTime || 5;
    hud.showDeathScreen(killerName, respawnTime);
    playerController.unlock();
});

/**
 * player:respawned - The local player respawns.
 */
networkManager.on('player:respawned', (data) => {
    isAlive = true;
    localHealth = maxHealth;
    hud.hideDeathScreen();
    hud.updateHealth(localHealth, maxHealth);

    // Teleport to spawn position
    if (data.position) {
        playerController.setPosition(data.position);
    }

    // Reset weapon
    weaponSystem.ammo = MAX_AMMO;
    hud.updateAmmo(MAX_AMMO, MAX_AMMO);

    // Re-lock pointer
    playerController.lock();
});

/**
 * player:disconnected - An opponent left the game.
 */
networkManager.on('player:disconnected', (data) => {
    const playerId = data.playerId;
    if (remotePlayers.has(playerId)) {
        remotePlayers.get(playerId).dispose();
        remotePlayers.delete(playerId);
    }

    const playerName = data.username || 'A player';
    hud.addKillFeedMessage(`${playerName} disconnected`);
});

/**
 * game:start - The game has begun (all players connected).
 */
networkManager.on('game:start', (data) => {
    hud.addKillFeedMessage('Game started!');

    // Find our spawn position from the players list
    if (data && data.players) {
        const myId = networkManager.getSocketId();
        for (const player of data.players) {
            if (player.id === myId && player.position) {
                playerController.setPosition(player.position);
                break;
            }
        }
    }
});

/**
 * game:over - Game ended (opponent left, etc.)
 */
networkManager.on('game:over', (data) => {
    hud.addKillFeedMessage('Game over - opponent left');
    setTimeout(() => {
        window.location.href = '/';
    }, 3000);
});

/**
 * connect_error - Connection failed.
 */
networkManager.on('connect_error', (err) => {
    console.error('Connection error:', err);
    hud.addKillFeedMessage('Connection error - check server');
});

// ---- Game Loop ----
let lastTime = performance.now();

function gameLoop(currentTime) {
    requestAnimationFrame(gameLoop);

    const delta = Math.min((currentTime - lastTime) / 1000, 0.1); // Cap delta to 100ms
    lastTime = currentTime;

    // ---- Update game systems ----
    if (playerController.isLocked() && isAlive) {
        // Process input
        inputManager.update();

        // Move player
        playerController.update(delta, inputManager, weaponSystem.isScoped());

        // Update weapon (scope, recoil recovery, sway)
        const weaponState = weaponSystem.update(delta, inputManager);

        // Handle shooting
        if (weaponState.wantsToShoot) {
            const shotData = weaponSystem.shoot();
            networkManager.sendShoot(shotData.origin, shotData.direction);
            hud.updateAmmo(weaponSystem.getAmmo(), MAX_AMMO);
        }

        // Handle reload (R key)
        if (inputManager.isKeyDown('KeyR') && !weaponSystem.isReloading()) {
            weaponSystem.reload();
            networkManager.sendReload();
        }

        // Update HUD ammo display
        hud.updateAmmo(weaponSystem.getAmmo(), MAX_AMMO);
        hud.setReloading(weaponSystem.isReloading());
        hud.setScoped(weaponSystem.isScoped());

        // Send position to server
        networkManager.sendPlayerUpdate(
            playerController.getPosition(),
            playerController.getRotation()
        );
    }

    // Interpolate remote players (always, even if we're dead, so we can spectate)
    const tickInterval = NETWORK_SEND_RATE;
    for (const [, remote] of remotePlayers) {
        remote.interpolate(delta, tickInterval);
    }

    // Render
    sceneManager.render();
}

// Start the loop
requestAnimationFrame(gameLoop);
