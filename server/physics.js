/**
 * Server-side hit validation using ray-AABB intersection.
 */

/**
 * Check if a ray from the shooter hits the target's bounding box.
 *
 * The AABB is centered at targetPos with:
 *   half-width  = PLAYER_RADIUS
 *   half-depth  = PLAYER_RADIUS
 *   height      = PLAYER_HEIGHT, bottom at targetPos.y - PLAYER_HEIGHT/2
 *
 * A headshot is registered when the hit point lands in the upper 30% of the box.
 *
 * @param {{ x: number, y: number, z: number }} shooterPos  - Ray origin.
 * @param {{ x: number, y: number, z: number }} direction   - Normalized ray direction.
 * @param {{ x: number, y: number, z: number }} targetPos   - Center of the target.
 * @param {object} constants - Shared game constants (PLAYER_HEIGHT, PLAYER_RADIUS).
 * @returns {{ hit: boolean, headshot: boolean, distance: number }}
 */
function checkHit(shooterPos, direction, targetPos, constants) {
    const { PLAYER_HEIGHT, PLAYER_RADIUS } = constants;

    // Build AABB bounds around the target
    const halfHeight = PLAYER_HEIGHT / 2;

    const minX = targetPos.x - PLAYER_RADIUS;
    const maxX = targetPos.x + PLAYER_RADIUS;
    const minY = targetPos.y - halfHeight;
    const maxY = targetPos.y + halfHeight;
    const minZ = targetPos.z - PLAYER_RADIUS;
    const maxZ = targetPos.z + PLAYER_RADIUS;

    // Ray-AABB slab intersection (Kay-Kajiya algorithm)
    let tMin = -Infinity;
    let tMax = Infinity;

    // --- X axis ---
    if (Math.abs(direction.x) < 1e-8) {
        // Ray is parallel to the X slabs
        if (shooterPos.x < minX || shooterPos.x > maxX) {
            return { hit: false, headshot: false, distance: 0 };
        }
    } else {
        const invD = 1.0 / direction.x;
        let t1 = (minX - shooterPos.x) * invD;
        let t2 = (maxX - shooterPos.x) * invD;
        if (t1 > t2) { const tmp = t1; t1 = t2; t2 = tmp; }
        tMin = Math.max(tMin, t1);
        tMax = Math.min(tMax, t2);
        if (tMin > tMax) {
            return { hit: false, headshot: false, distance: 0 };
        }
    }

    // --- Y axis ---
    if (Math.abs(direction.y) < 1e-8) {
        if (shooterPos.y < minY || shooterPos.y > maxY) {
            return { hit: false, headshot: false, distance: 0 };
        }
    } else {
        const invD = 1.0 / direction.y;
        let t1 = (minY - shooterPos.y) * invD;
        let t2 = (maxY - shooterPos.y) * invD;
        if (t1 > t2) { const tmp = t1; t1 = t2; t2 = tmp; }
        tMin = Math.max(tMin, t1);
        tMax = Math.min(tMax, t2);
        if (tMin > tMax) {
            return { hit: false, headshot: false, distance: 0 };
        }
    }

    // --- Z axis ---
    if (Math.abs(direction.z) < 1e-8) {
        if (shooterPos.z < minZ || shooterPos.z > maxZ) {
            return { hit: false, headshot: false, distance: 0 };
        }
    } else {
        const invD = 1.0 / direction.z;
        let t1 = (minZ - shooterPos.z) * invD;
        let t2 = (maxZ - shooterPos.z) * invD;
        if (t1 > t2) { const tmp = t1; t1 = t2; t2 = tmp; }
        tMin = Math.max(tMin, t1);
        tMax = Math.min(tMax, t2);
        if (tMin > tMax) {
            return { hit: false, headshot: false, distance: 0 };
        }
    }

    // The ray must hit in the forward direction (tMax > 0)
    if (tMax < 0) {
        return { hit: false, headshot: false, distance: 0 };
    }

    // Use the nearest positive t value as the entry point
    const tHit = tMin >= 0 ? tMin : tMax;
    const distance = tHit;

    // Determine hit point Y to check for headshot (upper 30% of the box)
    const hitY = shooterPos.y + direction.y * tHit;
    const headshotThreshold = maxY - PLAYER_HEIGHT * 0.3;
    const headshot = hitY >= headshotThreshold;

    return { hit: true, headshot, distance };
}

module.exports = { checkHit };
