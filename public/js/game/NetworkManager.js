import { NETWORK_SEND_RATE } from './constants.js';

// ========================================
// NETWORK MANAGER
// Handles Socket.io communication with
// the game server. Throttles position
// updates to NETWORK_SEND_RATE.
// ========================================

export class NetworkManager {
    /**
     * @param {string} roomCode - Room to join
     * @param {string} username - Player display name
     */
    constructor(roomCode, username) {
        this.roomCode = roomCode;
        this.username = username;

        // Event callback registry
        this._callbacks = new Map();

        // Throttle state for position updates
        this._lastSendTime = 0;

        // Connect to Socket.io server
        // Socket.io client is loaded as a global script
        this.socket = io({
            query: {
                room: roomCode,
                username: username
            }
        });

        // Wire up server event forwarding
        this._setupEventForwarding();
    }

    /**
     * Register server event handlers to forward into our callback map.
     */
    _setupEventForwarding() {
        const events = [
            'game:state',
            'hit:confirmed',
            'player:hit',
            'player:killed',
            'player:died',
            'player:respawned',
            'player:disconnected',
            'game:start',
            'game:over',
            'connect',
            'disconnect',
            'connect_error'
        ];

        for (const event of events) {
            this.socket.on(event, (data) => {
                const callbacks = this._callbacks.get(event);
                if (callbacks) {
                    for (const cb of callbacks) {
                        cb(data);
                    }
                }
            });
        }
    }

    /**
     * Send player position and rotation to the server.
     * Throttled to NETWORK_SEND_RATE (default 50ms = 20 updates/sec).
     * @param {{ x: number, y: number, z: number }} position
     * @param {{ x: number, y: number }} rotation
     */
    sendPlayerUpdate(position, rotation) {
        const now = performance.now();
        if (now - this._lastSendTime < NETWORK_SEND_RATE) return;

        this._lastSendTime = now;
        this.socket.emit('player:update', { position, rotation });
    }

    /**
     * Notify server that the player fired a shot.
     * @param {{ x: number, y: number, z: number }} origin
     * @param {{ x: number, y: number, z: number }} direction
     */
    sendShoot(origin, direction) {
        this.socket.emit('player:shoot', {
            origin,
            direction,
            timestamp: Date.now()
        });
    }

    /**
     * Notify server that the player is reloading.
     */
    sendReload() {
        this.socket.emit('player:reload');
    }

    /**
     * Register a callback for a server event.
     * @param {string} event - Event name
     * @param {Function} callback - Handler function
     */
    on(event, callback) {
        if (!this._callbacks.has(event)) {
            this._callbacks.set(event, []);
        }
        this._callbacks.get(event).push(callback);
    }

    /**
     * Get the socket ID (player's network identity).
     */
    getSocketId() {
        return this.socket.id;
    }

    /**
     * Disconnect from the server.
     */
    disconnect() {
        this.socket.disconnect();
    }
}
