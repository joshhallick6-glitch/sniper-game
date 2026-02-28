// ============================================
// SNIPER ELITE ONLINE - Lobby Client Logic
// ============================================

(function () {
    'use strict';

    // --- DOM References ---
    const els = {
        usernameInput:   document.getElementById('username-input'),
        btnCreate:       document.getElementById('btn-create'),
        btnJoin:         document.getElementById('btn-join'),
        btnConfirmJoin:  document.getElementById('btn-confirm-join'),
        btnBack:         document.getElementById('btn-back'),
        actionButtons:   document.getElementById('action-buttons'),
        joinSection:     document.getElementById('join-section'),
        roomCodeInput:   document.getElementById('room-code-input'),
        roomDisplay:     document.getElementById('room-display'),
        roomCodeValue:   document.getElementById('room-code-value'),
        statusArea:      document.getElementById('status-area'),
        statusText:      document.getElementById('status-text'),
        playerList:      document.getElementById('player-list'),
        player1Name:     document.getElementById('player-1-name'),
        player2:         document.getElementById('player-2'),
        player2Name:     document.getElementById('player-2-name'),
        connBadge:       document.getElementById('connection-badge'),
        connText:        document.getElementById('conn-text'),
    };

    // --- State ---
    let currentRoom = null;
    let username = '';

    // --- Socket.io Connection ---
    const socket = io({
        reconnection: true,
        reconnectionAttempts: 10,
        reconnectionDelay: 1000,
    });

    // =====================
    // Connection Management
    // =====================

    socket.on('connect', function () {
        setConnectionStatus(true);
    });

    socket.on('disconnect', function () {
        setConnectionStatus(false);
        showStatus('Disconnected from server. Reconnecting...', 'error');
    });

    socket.on('reconnect', function () {
        setConnectionStatus(true);
        showStatus('Reconnected to server.', 'connected');
    });

    socket.on('connect_error', function () {
        setConnectionStatus(false);
    });

    function setConnectionStatus(online) {
        if (online) {
            els.connBadge.classList.add('online');
            els.connText.textContent = 'CONNECTED';
        } else {
            els.connBadge.classList.remove('online');
            els.connText.textContent = 'OFFLINE';
        }
    }

    // =====================
    // UI Helpers
    // =====================

    function show(el) {
        el.classList.remove('hidden');
        el.classList.add('fade-in');
    }

    function hide(el) {
        el.classList.add('hidden');
        el.classList.remove('fade-in');
    }

    function showStatus(message, type) {
        show(els.statusArea);
        els.statusText.textContent = message;
        els.statusArea.classList.remove('connected', 'error');
        if (type) {
            els.statusArea.classList.add(type);
        }
    }

    function getUsername() {
        const val = els.usernameInput.value.trim();
        if (!val) {
            els.usernameInput.focus();
            els.usernameInput.classList.add('shake');
            setTimeout(function () {
                els.usernameInput.classList.remove('shake');
            }, 500);
            showStatus('Enter a callsign to continue.', 'error');
            return null;
        }
        return val;
    }

    function lockUI() {
        els.usernameInput.disabled = true;
        els.btnCreate.disabled = true;
        els.btnJoin.disabled = true;
        els.btnConfirmJoin.disabled = true;
    }

    function showPlayerList(myName) {
        els.player1Name.textContent = myName;
        show(els.playerList);
    }

    // =====================
    // Button Handlers
    // =====================

    // CREATE GAME
    els.btnCreate.addEventListener('click', function () {
        username = getUsername();
        if (!username) return;

        lockUI();
        showStatus('Creating room...', null);
        socket.emit('room:create', { username: username });
    });

    // JOIN GAME (show room code input)
    els.btnJoin.addEventListener('click', function () {
        username = getUsername();
        if (!username) return;

        hide(els.actionButtons);
        show(els.joinSection);
        els.roomCodeInput.focus();
    });

    // BACK button (return to main buttons)
    els.btnBack.addEventListener('click', function () {
        hide(els.joinSection);
        show(els.actionButtons);
    });

    // CONFIRM JOIN (submit room code)
    els.btnConfirmJoin.addEventListener('click', function () {
        submitJoin();
    });

    // Enter key on room code input
    els.roomCodeInput.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') {
            submitJoin();
        }
    });

    // Auto-uppercase room code input
    els.roomCodeInput.addEventListener('input', function () {
        this.value = this.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
    });

    // Enter key on username input (focus next action)
    els.usernameInput.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') {
            els.btnCreate.focus();
        }
    });

    function submitJoin() {
        var code = els.roomCodeInput.value.trim().toUpperCase();
        if (code.length < 4) {
            els.roomCodeInput.focus();
            showStatus('Enter a 4-character room code.', 'error');
            return;
        }

        lockUI();
        showStatus('Joining room ' + code + '...', null);
        socket.emit('room:join', { roomCode: code, username: username });
    }

    // =====================
    // Server Event Handlers
    // =====================

    // Room created successfully
    socket.on('room:created', function (data) {
        currentRoom = data.roomCode;

        hide(els.actionButtons);
        hide(els.joinSection);

        // Show room code
        els.roomCodeValue.textContent = data.roomCode;
        show(els.roomDisplay);

        // Show player list with self
        showPlayerList(username);

        showStatus('Waiting for opponent...', null);
    });

    // Joined room successfully
    socket.on('room:joined', function (data) {
        currentRoom = data.roomCode;

        hide(els.actionButtons);
        hide(els.joinSection);

        // Show player list with self
        showPlayerList(username);

        showStatus('Joined room ' + data.roomCode + '. Waiting for game to start...', 'connected');
    });

    // Error from server
    socket.on('room:error', function (data) {
        showStatus(data.message || 'An error occurred.', 'error');
        // Re-enable UI so they can try again
        els.usernameInput.disabled = false;
        els.btnCreate.disabled = false;
        els.btnJoin.disabled = false;
        els.btnConfirmJoin.disabled = false;
    });

    // Another player joined the room
    socket.on('player:joined', function (data) {
        // Update player 2 slot
        els.player2.classList.remove('waiting');
        els.player2.classList.add('joined');
        els.player2Name.textContent = data.username || 'Opponent';

        // Hide waiting dots, show ready
        var dots = els.player2.querySelector('.player-status-dots');
        if (dots) dots.style.display = 'none';
        var ready = document.createElement('span');
        ready.className = 'player-ready';
        ready.textContent = 'READY';
        els.player2.appendChild(ready);

        showStatus('Opponent joined! Starting game...', 'connected');
    });

    // Game starting - redirect to game page
    socket.on('game:start', function (data) {
        showStatus('DEPLOYING...', 'connected');

        // Brief delay for dramatic effect, then redirect
        setTimeout(function () {
            var roomCode = currentRoom || '';
            var params = new URLSearchParams({
                room: roomCode,
                username: username,
            });
            window.location.href = '/game.html?' + params.toString();
        }, 800);
    });

    // =====================
    // Inline Shake Animation
    // (injected via JS to avoid extra CSS dependency)
    // =====================
    var shakeStyle = document.createElement('style');
    shakeStyle.textContent = [
        '@keyframes shake {',
        '  0%, 100% { transform: translateX(0); }',
        '  20% { transform: translateX(-6px); }',
        '  40% { transform: translateX(6px); }',
        '  60% { transform: translateX(-4px); }',
        '  80% { transform: translateX(4px); }',
        '}',
        '.shake { animation: shake 0.4s ease; }',
    ].join('\n');
    document.head.appendChild(shakeStyle);

})();
