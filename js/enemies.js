import { player, game, entities } from './state.js';
import { getBlock, surfHeight } from './world.js';
import { WATER, LAVA, WH } from './constants.js';
import { showMsg } from './ui.js';
import { spawnPlayer } from './player.js';
import { buildHotbar } from './ui.js';

const GRAVITY = -20;
const JUMP_VY = 7.2;
const WALK_SPEED = 2.6;
const AGGRO_RANGE = 20;
const ATTACK_RANGE = 1.15;
const ATTACK_DAMAGE = 2;
const ATTACK_COOLDOWN = 1.0;
const MAX_ENTITIES = 10;
const DESPAWN_DIST = 48;
const W = 0.3, H = 1.8; 

let spawnTimer = 0.5; 

function solidAt(x, y, z) {
  let b = getBlock(Math.floor(x), Math.floor(y), Math.floor(z));
  return b && b !== WATER && b !== LAVA;
}

function collides(ent) {
  let x0 = Math.floor(ent.x - W), x1 = Math.floor(ent.x + W);
  let z0 = Math.floor(ent.z - W), z1 = Math.floor(ent.z + W);
  let y0 = Math.floor(ent.y), y1 = Math.floor(ent.y + H);
  for (let x = x0; x <= x1; x++)
    for (let y = y0; y <= y1; y++)
      for (let z = z0; z <= z1; z++)
        if (solidAt(x, y, z)) return true;
  return false;
}

function moveAxis(ent, axis, amount) {
  ent[axis] += amount;
  if (collides(ent)) {
    ent[axis] -= amount;
    if (axis === 'y') {
      if (amount < 0) ent.onGround = true;
      ent.vy = 0;
    }
    return true; 
  }
  if (axis === 'y' && amount < 0) ent.onGround = false;
  return false;
}

function spawnEnemy() {
  let ang = Math.random() * Math.PI * 2;
  let r = 16 + Math.random() * 12;
  let wx = Math.floor(player.x + Math.cos(ang) * r);
  let wz = Math.floor(player.z + Math.sin(ang) * r);
  let surf = surfHeight(wx, wz);
  surf = Math.max(1, Math.min(WH - 12, surf));
  entities.push({
    x: wx + 0.5, y: surf + 1, z: wz + 0.5,
    vx: 0, vy: 0, vz: 0,
    hp: 20, hurtTime: -999,
    onGround: false,
    attackCooldown: 0,
    wanderTimer: 0, wanderDX: 0, wanderDZ: 0,
  });
}

export function tickEnemies(dt) {
  spawnTimer -= dt;
  if (spawnTimer <= 0 && entities.length < MAX_ENTITIES) {
    spawnEnemy();
    spawnTimer = 3 + Math.random() * 3;
  }

  for (let i = entities.length - 1; i >= 0; i--) {
    let ent = entities[i];

    // Despawn when too far from the player
    let pdx = ent.x - player.x, pdz = ent.z - player.z;
    let pdist = Math.sqrt(pdx * pdx + pdz * pdz);
    if (pdist > DESPAWN_DIST) { entities.splice(i, 1); continue; }

    let recentlyHurt = game.time - ent.hurtTime < 0.3;

    if (!recentlyHurt) {
      if (pdist < AGGRO_RANGE && pdist > 0.05) {
        let dirx = pdx / pdist, dirz = pdz / pdist;
        ent.vx = -dirx * WALK_SPEED;
        ent.vz = -dirz * WALK_SPEED;
      } else {
        // Idle wandering algorithm
        ent.wanderTimer -= dt;
        if (ent.wanderTimer <= 0) {
          ent.wanderTimer = 1.5 + Math.random() * 2;
          if (Math.random() < 0.4) {
            let a = Math.random() * Math.PI * 2;
            ent.wanderDX = Math.cos(a) * WALK_SPEED * 0.4;
            ent.wanderDZ = Math.sin(a) * WALK_SPEED * 0.4;
          } else {
            ent.wanderDX = 0; ent.wanderDZ = 0;
          }
        }
        ent.vx = ent.wanderDX;
        ent.vz = ent.wanderDZ;
      }
    }

    ent.vy += GRAVITY * dt;
    if (ent.vy < -30) ent.vy = -30;

    // Steps up blocks or jumps automatically if path is blocked
    let blockedX = moveAxis(ent, 'x', ent.vx * dt);
    let blockedZ = moveAxis(ent, 'z', ent.vz * dt);
    if ((blockedX || blockedZ) && ent.onGround) ent.vy = JUMP_VY;

    moveAxis(ent, 'y', ent.vy * dt);

    if (ent.y < -10) { entities.splice(i, 1); continue; }

    // Inflict contact damage to player
    ent.attackCooldown -= dt;
    let edx = player.x - ent.x, edz = player.z - ent.z, edy = (player.y + 0.9) - (ent.y + 0.9);
    let edist = Math.sqrt(edx * edx + edy * edy + edz * edz);
    if (edist < ATTACK_RANGE && ent.attackCooldown <= 0) {
      ent.attackCooldown = ATTACK_COOLDOWN;
      player.health -= ATTACK_DAMAGE;
      player.lastHurtTime = game.time;
      player.vx += (edx / (edist || 1)) * -4;
      player.vz += (edz / (edist || 1)) * -4;
      player.vy = 3;
      showMsg('Zombie hit you!');
      buildHotbar();
      
      if (player.health <= 0) {
        player.health = 20;
        spawnPlayer();
        buildHotbar();
        showMsg('You died... respawned.');
      }
    }
  }
}