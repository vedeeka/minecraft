import { player, game } from './state.js';
import { AIR, WATER, LAVA, BD } from './constants.js';
import { getBlock } from './world.js';
import { K, eyeHeight } from './player.js';

const G = -28, JUMPV = 9, SPD = 5.2, FSPD = 12;
const PW = 0.3, PH = 1.8;
const COYOTE = 0.12, JBUFFER = 0.12;

let lastGroundedTime = -999;
export let lastJumpPressTime = -999;
export function setLastJumpPressTime(val) { lastJumpPressTime = val; }

function ctrlDown() { return K.ControlLeft || K.ControlRight; }
function shiftDown() { return K.ShiftLeft || K.ShiftRight; }

export function isSolid(bx, by, bz) {
  let b = getBlock(bx, by, bz);
  if (!b || b === WATER || b === LAVA || b === AIR) return false;
  let d = BD[b];
  if (!d) return false;
  return true;
}

export function aabbSolid(x, y, z) {
  let x0 = Math.floor(x - PW), x1 = Math.floor(x + PW);
  let y0 = Math.floor(y),     y1 = Math.floor(y + PH - 0.001);
  let z0 = Math.floor(z - PW), z1 = Math.floor(z + PW);
  for (let bx = x0; bx <= x1; bx++)
    for (let by = y0; by <= y1; by++)
      for (let bz = z0; bz <= z1; bz++)
        if (isSolid(bx, by, bz)) return true;
  return false;
}

export function inWaterAt(x, y, z) {
  return getBlock(Math.floor(x), Math.floor(y), Math.floor(z)) === WATER;
}

function hasGroundEdge(x, y, z) {
  let y0 = Math.floor(y - 0.05);
  return isSolid(Math.floor(x - PW), y0, Math.floor(z - PW)) ||
         isSolid(Math.floor(x + PW), y0, Math.floor(z - PW)) ||
         isSolid(Math.floor(x - PW), y0, Math.floor(z + PW)) ||
         isSolid(Math.floor(x + PW), y0, Math.floor(z + PW));
}

export function tickPhysics(dt, wDoubleSprint) {
  if (game.invOpen || game.paused) return;
  game.time += dt;

  let swimming = !player.flying && inWaterAt(player.x, player.y + 0.9, player.z);
  player.isSwimming = swimming;
  let sneaking = !player.flying && shiftDown() && player.onGround && !swimming;
  player.isSneaking = sneaking;
  let movingFwd = K.KeyW || K.ArrowUp;
  let sprinting = !player.flying && !sneaking && movingFwd && (ctrlDown() || wDoubleSprint);
  player.isSprinting = sprinting;

  let targetFov = sprinting ? 1.09 : (swimming ? 0.97 : 1);
  player.fovMul += (targetFov - player.fovMul) * Math.min(1, dt * 8);

  let sp = player.flying ? FSPD : SPD;
  if (sprinting) sp *= 1.6;
  if (sneaking)  sp *= 0.4;
  if (swimming)  sp *= 0.6;

  // Horizontal movement: yaw only (no pitch influence on WASD)
  let cy = Math.cos(player.yaw), sy = Math.sin(player.yaw);
  let mx = 0, mz = 0;
  
  // Directional sign fixes applied below
  if (K.KeyW || K.ArrowUp)    { mx -= sy; mz -= cy; } // Move forward
  if (K.KeyS || K.ArrowDown)  { mx += sy; mz += cy; } // Move backward
  if (K.KeyA || K.ArrowLeft)  { mx += cy; mz -= sy; } // Strafe left
  if (K.KeyD || K.ArrowRight) { mx -= cy; mz += sy; } // Strafe right
  
  let ml = Math.sqrt(mx * mx + mz * mz);
  if (ml > 0) { mx /= ml; mz /= ml; }

  if (player.flying) {
    player.vx = mx * sp; player.vz = mz * sp;
    player.vy = (K.Space ? 1 : shiftDown() ? -1 : 0) * sp;
    player.x += player.vx * dt; player.y += player.vy * dt; player.z += player.vz * dt;
    player.onGround = false;
    return;
  }

  player.vx = mx * sp; player.vz = mz * sp;

  if (swimming) {
    player.vy += G * 0.22 * dt;
    if (player.vy < -3.2) player.vy = -3.2;
    if (K.Space) player.vy = Math.min(player.vy + 14 * dt, 3.2);
    else if (shiftDown()) player.vy = Math.max(player.vy - 14 * dt, -3.2);
    else player.vy *= Math.max(0, 1 - dt * 1.5);
  } else {
    player.vy += G * dt;
    if (player.vy < -60) player.vy = -60;
  }

  if (player.onGround) lastGroundedTime = game.time;
  let canInstantJump = !swimming && player.onGround && K.Space;
  let canBufferedJump = !swimming && !canInstantJump &&
    (game.time - lastGroundedTime < COYOTE) && (game.time - lastJumpPressTime < JBUFFER);

  if (canInstantJump || canBufferedJump) {
    player.vy = JUMPV;
    player.onGround = false;
    lastJumpPressTime = -999;
    lastGroundedTime = -999;
  }

  // Move X
  let dirX = player.vx, nx = player.x + player.vx * dt;
  if (sneaking && dirX !== 0 && !hasGroundEdge(nx, player.y, player.z)) {
    // Avoid stepping off edges
  } else if (!aabbSolid(nx, player.y, player.z)) {
    player.x = nx;
  } else if (player.onGround && !aabbSolid(nx, Math.floor(player.y) + 1.0, player.z)) {
    player.x = nx; player.y = Math.floor(player.y) + 1.0; player.vy = Math.max(player.vy, 0);
  } else {
    if (dirX > 0) player.x = Math.floor(player.x + PW) - PW - 0.001;
    else if (dirX < 0) player.x = Math.floor(player.x - PW) + 1 + PW + 0.001;
    player.vx = 0;
  }

  // Move Z
  let dirZ = player.vz, nz = player.z + player.vz * dt;
  if (sneaking && dirZ !== 0 && !hasGroundEdge(player.x, player.y, nz)) {
    // Avoid stepping off edges
  } else if (!aabbSolid(player.x, player.y, nz)) {
    player.z = nz;
  } else if (player.onGround && !aabbSolid(player.x, Math.floor(player.y) + 1.0, nz)) {
    player.z = nz; player.y = Math.floor(player.y) + 1.0; player.vy = Math.max(player.vy, 0);
  } else {
    if (dirZ > 0) player.z = Math.floor(player.z + PW) - PW - 0.001;
    else if (dirZ < 0) player.z = Math.floor(player.z - PW) + 1 + PW + 0.001;
    player.vz = 0;
  }

  // Move Y
  let ny = player.y + player.vy * dt;
  if (player.vy < 0) {
    if (!aabbSolid(player.x, ny, player.z)) {
      player.y = ny;
      player.onGround = false;
    } else {
      player.y = Math.floor(ny) + 1.0;
      player.vy = 0;
      player.onGround = true;
    }
  } else {
    if (!aabbSolid(player.x, ny, player.z)) {
      player.y = ny;
    } else {
      player.y = Math.ceil(player.y + PH) - PH - 0.001;
      player.vy = 0;
    }
    player.onGround = false;
  }

  if (aabbSolid(player.x, player.y, player.z)) {
    player.y = Math.floor(player.y) + 1.0;
    player.vy = 0; player.onGround = true;
  }
}