const GameRoom = require('./GameRoom');

class GameManager {
    constructor(io) {
        this.io = io;
        this.rooms = new Map(); // roomCode -> GameRoom
    }

    /**
     * Set up event handlers on a newly connected socket.
     * Handles both lobby connections and game-page reconnections.
     */
    handleConnection(socket) {
        console.log(`[GameManager] New connection: ${socket.id}`);

        // Check if this is a game-page connection (has room and username in query params)
        const queryRoom = socket.handshake.query.room;
        const queryUsername = socket.handshake.query.username;

        if (queryRoom && queryUsername && queryRoom !== 'default') {
            this._handleGamePageConnection(socket, queryRoom, queryUsername);
            return;
        }

        // Otherwise, this is a lobby connection
        this._handleLobbyConnection(socket);
    }

    /**
     * Handle a game-page connection: find or create the room and add the player.
     */
    _handleGamePageConnection(socket, roomCode, username) {
        const code = roomCode.toUpperCase();
        console.log(`[GameManager] Game page connection: "${username}" for room "${code}"`);

        let room = this.rooms.get(code);
        if (!room) {
            // Room was cleaned up during redirect - recreate it
            room = new GameRoom(code, this.io);
            room.onEmpty = (rc) => this.removeRoom(rc);
            this.rooms.set(code, room);
            console.log(`[GameManager] Recreated room "${code}" for game page`);
        }

        room.addPlayer(socket, username);
    }

    /**
     * Handle a lobby connection: set up create/join event handlers.
     */
    _handleLobbyConnection(socket) {
        socket.on('room:create', ({ username }) => {
            if (!username || typeof username !== 'string') {
                socket.emit('room:error', { message: 'Username is required' });
                return;
            }

            const roomCode = this.generateRoomCode();
            const room = new GameRoom(roomCode, this.io);
            room.onEmpty = (rc) => this.removeRoom(rc);
            this.rooms.set(roomCode, room);

            console.log(`[GameManager] Room "${roomCode}" created by "${username}"`);

            room.addPlayer(socket, username);

            socket.emit('room:created', { roomCode });
        });

        socket.on('room:join', ({ roomCode, username }) => {
            if (!username || typeof username !== 'string') {
                socket.emit('room:error', { message: 'Username is required' });
                return;
            }

            if (!roomCode || typeof roomCode !== 'string') {
                socket.emit('room:error', { message: 'Room code is required' });
                return;
            }

            const code = roomCode.toUpperCase();
            const room = this.rooms.get(code);

            if (!room) {
                socket.emit('room:error', { message: 'Room not found' });
                console.log(`[GameManager] Join failed: room "${code}" not found`);
                return;
            }

            if (room.players.size >= 2) {
                socket.emit('room:error', { message: 'Room is full' });
                console.log(`[GameManager] Join failed: room "${code}" is full`);
                return;
            }

            console.log(`[GameManager] "${username}" joining room "${code}"`);
            room.addPlayer(socket, username);
        });
    }

    /**
     * Generate a random 4-character uppercase alphanumeric room code.
     */
    generateRoomCode() {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let code;
        do {
            code = '';
            for (let i = 0; i < 4; i++) {
                code += chars.charAt(Math.floor(Math.random() * chars.length));
            }
        } while (this.rooms.has(code));
        return code;
    }

    /**
     * Remove a room from the manager.
     */
    removeRoom(roomCode) {
        const room = this.rooms.get(roomCode);
        if (room) {
            room.stopGame();
            this.rooms.delete(roomCode);
            console.log(`[GameManager] Room "${roomCode}" removed`);
        }
    }
}

module.exports = GameManager;
