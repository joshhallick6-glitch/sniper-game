const {
    MAX_HEALTH,
    MAX_AMMO,
} = require('./constants');

class Player {
    constructor(id, username) {
        this.id = id;
        this.username = username;
        this.health = MAX_HEALTH;
        this.position = { x: 0, y: 1, z: 0 };
        this.rotation = { x: 0, y: 0, z: 0 };
        this.kills = 0;
        this.deaths = 0;
        this.ammo = MAX_AMMO;
        this.isAlive = true;
        this.lastShotTime = 0;
        this.isReloading = false;
    }

    /**
     * Reset player to default state for respawn.
     * Preserves id, username, kills, and deaths.
     */
    reset() {
        this.health = MAX_HEALTH;
        this.ammo = MAX_AMMO;
        this.isAlive = true;
        this.lastShotTime = 0;
        this.isReloading = false;
    }

    /**
     * Apply damage to the player.
     * @param {number} amount - Damage to deal.
     * @returns {boolean} True if the player was killed by this damage.
     */
    takeDamage(amount) {
        if (!this.isAlive) {
            return false;
        }

        this.health -= amount;

        if (this.health <= 0) {
            this.health = 0;
            this.isAlive = false;
            return true;
        }

        return false;
    }

    /**
     * Return a plain object representing the player state,
     * safe for JSON serialization and network transmission.
     */
    getState() {
        return {
            id: this.id,
            username: this.username,
            position: this.position,
            rotation: this.rotation,
            health: this.health,
            kills: this.kills,
            deaths: this.deaths,
            ammo: this.ammo,
            isAlive: this.isAlive,
        };
    }
}

module.exports = Player;
