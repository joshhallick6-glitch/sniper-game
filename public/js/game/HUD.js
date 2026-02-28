// ========================================
// HUD
// Manages all on-screen UI elements:
// health, ammo, kills, kill feed, scope,
// hit markers, death screen, etc.
// ========================================

export class HUD {
    constructor() {
        // Cache all DOM element references
        this.elements = {
            // Health
            healthFill: document.getElementById('health-fill'),
            healthText: document.getElementById('health-text'),

            // Ammo
            ammoCurrent: document.getElementById('ammo-current'),
            ammoMax: document.getElementById('ammo-max'),
            reloadIndicator: document.getElementById('reload-indicator'),

            // Kill counter
            kills: document.getElementById('kills'),
            deaths: document.getElementById('deaths'),

            // Kill feed
            killFeed: document.getElementById('kill-feed'),

            // Hit marker
            hitMarker: document.getElementById('hit-marker'),

            // Crosshair
            crosshair: document.getElementById('crosshair'),

            // Scope overlay
            scopeOverlay: document.getElementById('scope-overlay'),

            // Death screen
            deathScreen: document.getElementById('death-screen'),
            killerName: document.getElementById('killer-name'),
            respawnCountdown: document.getElementById('respawn-countdown'),

            // Click to play
            clickToPlay: document.getElementById('click-to-play'),
        };

        // Hit marker timeout reference
        this._hitMarkerTimeout = null;

        // Death screen countdown interval
        this._respawnInterval = null;
    }

    /**
     * Update the health bar display.
     * @param {number} health - Current health
     * @param {number} maxHealth - Maximum health
     */
    updateHealth(health, maxHealth) {
        const pct = Math.max(0, Math.min(100, (health / maxHealth) * 100));
        this.elements.healthFill.style.width = pct + '%';
        this.elements.healthText.textContent = Math.round(health);

        // Color shift: green at full health, red at low health
        if (pct > 60) {
            this.elements.healthFill.style.background = 'linear-gradient(to right, #44cc44, #66ff66)';
        } else if (pct > 30) {
            this.elements.healthFill.style.background = 'linear-gradient(to right, #cccc44, #ffff66)';
        } else {
            this.elements.healthFill.style.background = 'linear-gradient(to right, #cc4444, #ff6666)';
        }
    }

    /**
     * Update the ammo counter display.
     * @param {number} current - Current ammo
     * @param {number} max - Max ammo capacity
     */
    updateAmmo(current, max) {
        this.elements.ammoCurrent.textContent = current;
        this.elements.ammoMax.textContent = max;

        // Flash red when low or empty
        if (current === 0) {
            this.elements.ammoCurrent.style.color = '#ff4444';
        } else if (current <= 2) {
            this.elements.ammoCurrent.style.color = '#ffcc00';
        } else {
            this.elements.ammoCurrent.style.color = '#fff';
        }
    }

    /**
     * Show or hide the reload indicator.
     * @param {boolean} reloading
     */
    setReloading(reloading) {
        if (reloading) {
            this.elements.reloadIndicator.classList.remove('hidden');
        } else {
            this.elements.reloadIndicator.classList.add('hidden');
        }
    }

    /**
     * Update the kill/death counter.
     * @param {number} kills
     * @param {number} deaths
     */
    updateKills(kills, deaths) {
        this.elements.kills.textContent = kills;
        this.elements.deaths.textContent = deaths;
    }

    /**
     * Add a message to the kill feed. Auto-removes after 5 seconds.
     * @param {string} message - Kill feed text (e.g. "Player1 killed Player2")
     */
    addKillFeedMessage(message) {
        const msgEl = document.createElement('div');
        msgEl.className = 'kill-feed-message';
        msgEl.textContent = message;
        this.elements.killFeed.appendChild(msgEl);

        // Remove after animation completes (5s)
        setTimeout(() => {
            if (msgEl.parentNode) {
                msgEl.parentNode.removeChild(msgEl);
            }
        }, 5000);

        // Limit feed to 5 messages
        while (this.elements.killFeed.children.length > 5) {
            this.elements.killFeed.removeChild(this.elements.killFeed.firstChild);
        }
    }

    /**
     * Flash the hit marker for 200ms.
     */
    showHitMarker() {
        // Clear any existing timeout
        if (this._hitMarkerTimeout) {
            clearTimeout(this._hitMarkerTimeout);
        }

        // Show and animate
        this.elements.hitMarker.classList.add('show');

        this._hitMarkerTimeout = setTimeout(() => {
            this.elements.hitMarker.classList.remove('show');
            this._hitMarkerTimeout = null;
        }, 200);
    }

    /**
     * Show the death screen with killer name and respawn countdown.
     * @param {string} killerName - Name of the player who killed us
     * @param {number} respawnTime - Seconds until respawn
     */
    showDeathScreen(killerName, respawnTime) {
        this.elements.killerName.textContent = killerName || 'Unknown';
        this.elements.respawnCountdown.textContent = respawnTime;
        this.elements.deathScreen.classList.remove('hidden');

        // Hide crosshair during death
        this.elements.crosshair.style.display = 'none';

        // Countdown timer
        let remaining = respawnTime;
        if (this._respawnInterval) {
            clearInterval(this._respawnInterval);
        }
        this._respawnInterval = setInterval(() => {
            remaining--;
            this.elements.respawnCountdown.textContent = Math.max(0, remaining);
            if (remaining <= 0) {
                clearInterval(this._respawnInterval);
                this._respawnInterval = null;
            }
        }, 1000);
    }

    /**
     * Hide the death screen.
     */
    hideDeathScreen() {
        this.elements.deathScreen.classList.add('hidden');
        this.elements.crosshair.style.display = '';

        if (this._respawnInterval) {
            clearInterval(this._respawnInterval);
            this._respawnInterval = null;
        }
    }

    /**
     * Toggle scope overlay visibility.
     * @param {boolean} scoped - Whether the player is scoped in
     */
    setScoped(scoped) {
        if (scoped) {
            this.elements.scopeOverlay.classList.add('scoped');
            this.elements.crosshair.style.display = 'none';
        } else {
            this.elements.scopeOverlay.classList.remove('scoped');
            this.elements.crosshair.style.display = '';
        }
    }

    /**
     * Show the "Click to Play" overlay.
     */
    showClickToPlay() {
        this.elements.clickToPlay.style.display = 'flex';
    }

    /**
     * Hide the "Click to Play" overlay.
     */
    hideClickToPlay() {
        this.elements.clickToPlay.style.display = 'none';
    }
}
