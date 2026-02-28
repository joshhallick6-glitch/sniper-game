const Player = require('./Player');
const { checkHit } = require('./physics');
const {
    TICK_RATE,
    BODY_DAMAGE,
    HEADSHOT_DAMAGE,
    RESPAWN_TIME,
    MAX_AMMO,
    RELOAD_TIME,
    SHOT_COOLDOWN,
    PLAYER_HEIGHT,
    PLAYER_RADIUS,
    SPAWN_POINTS,
} = require('./constants');

class GameRoom {
    constructor(roomCode, io) {
        this.roomCode = roomCode;
        this.io = io;
        this.players = new Map();   // socketId -> Player
        this.sockets = new Map();   // socketId -> socket ref
        this.running = false;
        this.gameLoopInterval = null;
        this._cleanupTimer = null;
        this.onEmpty = null; // callback set by GameManager
    }

    // ----------------------------------------------------------------
    // Player management
    // ----------------------------------------------------------------

    /**
     * Add a player to the room. Starts the game once 2 players are present.
     */
    addPlayer(socket, username) {
        if (this.players.size >= 2) {
            socket.emit('room:error', { message: 'Room is full' });
            return;
        }

        // Cancel any pending cleanup timer (player reconnected after redirect)
        if (this._cleanupTimer) {
            clearTimeout(this._cleanupTimer);
            this._cleanupTimer = null;
        }

        const player = new Player(socket.id, username);
        this.players.set(socket.id, player);
        this.sockets.set(socket.id, socket);

        socket.join(this.roomCode);

        // Wire up event handlers
        socket.on('player:update', (data) => this.handlePlayerUpdate(socket.id, data));
        socket.on('player:shoot', (data) => this.handlePlayerShoot(socket.id, data));
        socket.on('player:reload', () => this.handlePlayerReload(socket.id));
        socket.on('disconnect', () => this.removePlayer(socket.id));

        console.log(`[Room ${this.roomCode}] Player "${username}" (${socket.id}) joined. Players: ${this.players.size}`);

        socket.emit('room:joined', {
            roomCode: this.roomCode,
            playerId: socket.id,
        });

        // Notify others
        socket.to(this.roomCode).emit('player:joined', {
            id: socket.id,
            username,
        });

        if (this.players.size === 2) {
            this.startGame();
        }
    }

    /**
     * Remove a player from the room. Stops the game if the room is empty.
     */
    removePlayer(socketId) {
        const player = this.players.get(socketId);
        if (!player) return;

        this.players.delete(socketId);
        this.sockets.delete(socketId);

        console.log(`[Room ${this.roomCode}] Player "${player.username}" (${socketId}) left. Players: ${this.players.size}`);

        this.io.to(this.roomCode).emit('player:disconnected', { playerId: socketId, username: player.username });

        if (this.players.size === 0) {
            this.stopGame();
            // Grace period: keep room alive for 15 seconds for page redirect reconnections
            this._cleanupTimer = setTimeout(() => {
                if (this.players.size === 0 && this.onEmpty) {
                    this.onEmpty(this.roomCode);
                }
            }, 15000);
        } else if (this.running) {
            // Opponent left mid-game -- stop the loop, wait for possible reconnect
            this.stopGame();
            this.io.to(this.roomCode).emit('game:over', { reason: 'opponent_left' });
        }
    }

    // ----------------------------------------------------------------
    // Game lifecycle
    // ----------------------------------------------------------------

    startGame() {
        if (this.running) return;

        console.log(`[Room ${this.roomCode}] Starting game`);

        // Assign spawn points
        const playerIds = [...this.players.keys()];
        playerIds.forEach((id, index) => {
            const player = this.players.get(id);
            const spawn = SPAWN_POINTS[index % SPAWN_POINTS.length];
            player.position = { ...spawn };
        });

        this.running = true;

        // Build player list for clients
        const playerStates = [];
        this.players.forEach((p) => playerStates.push(p.getState()));

        this.io.to(this.roomCode).emit('game:start', { players: playerStates });

        this.startGameLoop();
    }

    stopGame() {
        if (this.gameLoopInterval) {
            clearInterval(this.gameLoopInterval);
            this.gameLoopInterval = null;
        }
        this.running = false;
        console.log(`[Room ${this.roomCode}] Game stopped`);
    }

    // ----------------------------------------------------------------
    // Game loop
    // ----------------------------------------------------------------

    startGameLoop() {
        const intervalMs = 1000 / TICK_RATE;
        this.gameLoopInterval = setInterval(() => {
            this.broadcastState();
        }, intervalMs);
    }

    broadcastState() {
        const states = {};
        this.players.forEach((player) => {
            states[player.id] = player.getState();
        });

        this.io.to(this.roomCode).emit('game:state', {
            players: states,
            timestamp: Date.now(),
        });
    }

    // ----------------------------------------------------------------
    // Event handlers
    // ----------------------------------------------------------------

    /**
     * Handle position/rotation updates from a client.
     */
    handlePlayerUpdate(socketId, data) {
        const player = this.players.get(socketId);
        if (!player || !player.isAlive) return;

        if (data.position) {
            player.position = {
                x: data.position.x,
                y: data.position.y,
                z: data.position.z,
            };
        }
        if (data.rotation) {
            player.rotation = {
                x: data.rotation.x,
                y: data.rotation.y,
                z: data.rotation.z,
            };
        }
    }

    /**
     * Handle a shot fired by a player.
     * Validates cooldown, ammo, reload state, then ray-tests against all other players.
     */
    handlePlayerShoot(socketId, data) {
        const shooter = this.players.get(socketId);
        if (!shooter || !shooter.isAlive) return;

        // Prevent shooting while reloading
        if (shooter.isReloading) {
            const socket = this.sockets.get(socketId);
            if (socket) socket.emit('shoot:denied', { reason: 'reloading' });
            return;
        }

        // Enforce shot cooldown
        const now = Date.now();
        if (now - shooter.lastShotTime < SHOT_COOLDOWN) {
            const socket = this.sockets.get(socketId);
            if (socket) socket.emit('shoot:denied', { reason: 'cooldown' });
            return;
        }

        // Check ammo
        if (shooter.ammo <= 0) {
            const socket = this.sockets.get(socketId);
            if (socket) socket.emit('shoot:denied', { reason: 'no_ammo' });
            return;
        }

        // Consume ammo and record shot time
        shooter.ammo -= 1;
        shooter.lastShotTime = now;

        const origin = data.origin || shooter.position;
        const direction = data.direction;

        if (!direction) return;

        // Normalize direction
        const len = Math.sqrt(
            direction.x * direction.x +
            direction.y * direction.y +
            direction.z * direction.z
        );
        if (len === 0) return;
        const dir = {
            x: direction.x / len,
            y: direction.y / len,
            z: direction.z / len,
        };

        const constants = { PLAYER_HEIGHT, PLAYER_RADIUS };

        let hitResult = null;
        let hitPlayer = null;

        // Test ray against every other living player
        this.players.forEach((target, targetId) => {
            if (targetId === socketId) return;
            if (!target.isAlive) return;

            const result = checkHit(origin, dir, target.position, constants);
            if (result.hit) {
                // Take the closest hit
                if (!hitResult || result.distance < hitResult.distance) {
                    hitResult = result;
                    hitPlayer = target;
                }
            }
        });

        if (hitResult && hitPlayer) {
            const damage = hitResult.headshot ? HEADSHOT_DAMAGE : BODY_DAMAGE;
            const killed = hitPlayer.takeDamage(damage);

            console.log(
                `[Room ${this.roomCode}] ${shooter.username} hit ${hitPlayer.username}` +
                ` for ${damage} dmg${hitResult.headshot ? ' (HEADSHOT)' : ''}` +
                ` at distance ${hitResult.distance.toFixed(1)}`
            );

            // Notify shooter that hit was confirmed
            const shooterSocket = this.sockets.get(socketId);
            if (shooterSocket) {
                shooterSocket.emit('hit:confirmed', {
                    targetId: hitPlayer.id,
                    damage,
                    headshot: hitResult.headshot,
                });
            }

            if (killed) {
                this.handlePlayerDeath(hitPlayer, shooter, hitResult.headshot);
            }
        } else {
            // Shot missed -- let the shooter know
            const socket = this.sockets.get(socketId);
            if (socket) socket.emit('shoot:miss');
        }
    }

    /**
     * Handle reload request.
     */
    handlePlayerReload(socketId) {
        const player = this.players.get(socketId);
        if (!player || !player.isAlive) return;
        if (player.isReloading) return;
        if (player.ammo === MAX_AMMO) return;

        player.isReloading = true;

        console.log(`[Room ${this.roomCode}] ${player.username} is reloading`);

        this.io.to(this.roomCode).emit('player:reloading', { id: socketId });

        setTimeout(() => {
            // Player may have disconnected or died during reload
            const p = this.players.get(socketId);
            if (!p) return;

            p.ammo = MAX_AMMO;
            p.isReloading = false;

            console.log(`[Room ${this.roomCode}] ${p.username} finished reloading`);

            this.io.to(this.roomCode).emit('player:reloaded', {
                id: socketId,
                ammo: p.ammo,
            });
        }, RELOAD_TIME);
    }

    /**
     * Process a player death: update stats, notify clients, schedule respawn.
     */
    handlePlayerDeath(victim, killer, headshot) {
        victim.deaths += 1;
        killer.kills += 1;

        console.log(
            `[Room ${this.roomCode}] ${killer.username} killed ${victim.username}` +
            `${headshot ? ' with a headshot' : ''} | K/D: ${killer.kills}/${killer.deaths} vs ${victim.kills}/${victim.deaths}`
        );

        this.io.to(this.roomCode).emit('player:killed', {
            killerId: killer.id,
            killerName: killer.username,
            victimId: victim.id,
            victimName: victim.username,
            headshot,
            killerKills: killer.kills,
            victimDeaths: victim.deaths,
        });

        // Notify victim specifically
        const victimSocket = this.sockets.get(victim.id);
        if (victimSocket) {
            victimSocket.emit('player:died', {
                killerName: killer.username,
                respawnTime: Math.ceil(RESPAWN_TIME / 1000),
            });
        }

        // Schedule respawn
        setTimeout(() => {
            this.respawnPlayer(victim.id);
        }, RESPAWN_TIME);
    }

    /**
     * Respawn a player at a fresh spawn point.
     */
    respawnPlayer(playerId) {
        const player = this.players.get(playerId);
        if (!player) return;

        player.reset();
        const spawn = this.getSpawnPoint(playerId);
        player.position = { ...spawn };

        console.log(`[Room ${this.roomCode}] ${player.username} respawned`);

        // Notify the respawned player specifically
        const playerSocket = this.sockets.get(playerId);
        if (playerSocket) {
            playerSocket.emit('player:respawned', {
                id: playerId,
                position: player.position,
                health: player.health,
            });
        }
    }

    /**
     * Pick the spawn point farthest from the other player.
     * If no other player exists, pick the first spawn.
     */
    getSpawnPoint(avoidPlayerId) {
        let otherPos = null;

        this.players.forEach((player, id) => {
            if (id !== avoidPlayerId) {
                otherPos = player.position;
            }
        });

        if (!otherPos) {
            return SPAWN_POINTS[0];
        }

        let bestSpawn = SPAWN_POINTS[0];
        let bestDist = -1;

        for (const spawn of SPAWN_POINTS) {
            const dx = spawn.x - otherPos.x;
            const dy = spawn.y - otherPos.y;
            const dz = spawn.z - otherPos.z;
            const dist = dx * dx + dy * dy + dz * dz; // squared is fine for comparison
            if (dist > bestDist) {
                bestDist = dist;
                bestSpawn = spawn;
            }
        }

        return bestSpawn;
    }
}

module.exports = GameRoom;
