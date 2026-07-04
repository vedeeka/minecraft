import { player, game } from './state.js';
import { AIR, WATER, LAVA, BD, WH } from './constants.js';
import { getBlock, setBlock, surfHeight } from './world.js';
import { buildHotbar, showMsg } from './ui.js';

export const K = {};
export let miningTarget = null;
export let miningProg = 0;

export function eyeHeight() {
  return player.isSneaking ? 1.40 : 1.62;
}

export function spawnPlayer() {
  let s = surfHeight(8, 8);
  s = Math.max(1, Math.min(WH - 12, s));
  player.x = 8.5;
  player.y = s + 2;
  player.z = 8.5;
  player.vy = 0;
  player.onGround = false;
}

export function raycast() {
  let cy = Math.cos(player.yaw), sy = Math.sin(player.yaw);
  let cp = Math.cos(player.pitch), sp = Math.sin(player.pitch);
  let dx = sy * cp, dy = -sp, dz = cy * cp;

  let ox = player.x, oy = player.y + eyeHeight(), oz = player.z;
  const MAXD = 6, STEP = 0.05;
  let lbx, lby, lbz;

  for (let t = STEP; t < MAXD; t += STEP) {
    let bx = Math.floor(ox + dx * t);
    let by = Math.floor(oy + dy * t);
    let bz = Math.floor(oz + dz * t);
    let b = getBlock(bx, by, bz);
    if (b && b !== WATER && b !== LAVA) {
      let face = lbx !== undefined ? [lbx - bx, lby - by, lbz - bz] : [0, 1, 0];
      return { bx, by, bz, block: b, face };
    }
    lbx = bx; lby = by; lbz = bz;
  }
  return null;
}

export function placeBlock() {
  let ray = raycast();
  if (!ray || !ray.face) return;
  let wx = ray.bx + ray.face[0], wy = ray.by + ray.face[1], wz = ray.bz + ray.face[2];
  if (Math.abs(wx + 0.5 - player.x) < 0.7 && (wy >= player.y - 0.2 && wy <= player.y + 1.9) && Math.abs(wz + 0.5 - player.z) < 0.7) return;
  let item = player.inventory[player.selSlot];
  if (!item || !item.n) return;
  setBlock(wx, wy, wz, item.id);
  item.n--;
  if (item.n <= 0) player.inventory[player.selSlot] = null;
  buildHotbar();
}

export function tickMining(dt, mouseLeft) {
  if (!mouseLeft || game.invOpen || game.paused) {
    miningTarget = null;
    miningProg = 0;
    return;
  }
  let ray = raycast();
  if (!ray) {
    miningTarget = null;
    miningProg = 0;
    return;
  }
  if (!miningTarget || miningTarget.bx !== ray.bx || miningTarget.by !== ray.by || miningTarget.bz !== ray.bz) {
    miningTarget = ray;
    miningProg = 0;
  }
  let def = BD[ray.block];
  let hard = def ? def.h : 2;
  if (hard < 0) {
    miningTarget = null;
    return;
  }
  miningProg += dt / (hard * 0.38 + 0.18);
  if (miningProg >= 1) {
    addItem(ray.block, 1);
    setBlock(ray.bx, ray.by, ray.bz, AIR);
    miningTarget = null;
    miningProg = 0;
    buildHotbar();
    showMsg('+1 ' + (def ? def.n : 'Block'));
  }
}

export function addItem(id, count) {
  for (let i = 0; i < 36; i++) {
    if (player.inventory[i] && player.inventory[i].id === id && player.inventory[i].n < 64) {
      player.inventory[i].n = Math.min(64, player.inventory[i].n + count);
      return;
    }
  }
  for (let i = 0; i < 36; i++) {
    if (!player.inventory[i]) {
      player.inventory[i] = { id, n: count };
      return;
    }
  }
}