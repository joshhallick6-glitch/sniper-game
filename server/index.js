const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');
const path = require('path');
const GameManager = require('./GameManager');

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
    cors: { origin: '*' }
});

app.use(express.static(path.join(__dirname, '..', 'public')));

const gameManager = new GameManager(io);

io.on('connection', (socket) => {
    console.log(`Player connected: ${socket.id}`);
    gameManager.handleConnection(socket);
});

const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => {
    console.log(`Sniper Game server running on http://localhost:${PORT}`);
});
