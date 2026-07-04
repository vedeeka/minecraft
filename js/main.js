import { player, game, entities } from './state.js';
import { PREGEN } from './constants.js';
import { getChunk } from './world.js';
import { K, spawnPlayer, placeBlock, tickMining, eyeHeight } from './player.js';
import { tickPhysics, lastJumpPressTime, setLastJumpPressTime } from './physics.js';
import { render, canvas } from './renderer.js';
import { buildHotbar, openInv, closeInv, updateDbg, msgTimer, setMsgTimer, showMsg } from './ui.js';

let mouseLeft = false;
let lastWPressTime = -999;
let wDoubleSprint = false;

// Attack handling function: checks for targets in the player's direct line of sight
function attackHostile() {
  let cy = Math.cos(player.yaw), sy = Math.sin(player.yaw);
  let cp = Math.cos(player.pitch), sp = Math.sin(player.pitch);
  let fwdX = -sy * cp, fwdY = -sp, fwdZ = -cy * cp; // Match direction vectors
  
  let ox = player.x, oy = player.y + eyeHeight(), oz = player.z;

  for (let i = entities.length - 1; i >= 0; i--) {
    let ent = entities[i];
    let ex = ent.x - ox, ey = (ent.y + 0.9) - oy, ez = ent.z - oz;
    let dist = Math.sqrt(ex*ex + ey*ey + ez*ez);
    if (dist > 4.2) continue; 

    // Projection calculation
    let dot = ex * fwdX + ey * fwdY + ez * fwdZ;
    let projX = fwdX * dot, projY = fwdY * dot, projZ = fwdZ * dot;
    let perpX = ex - projX, perpY = ey - projY, perpZ = ez - projZ;
    let distToRay = Math.sqrt(perpX*perpX + perpY*perpY + perpZ*perpZ);

    if (distToRay < 0.8 && dot > 0) {
      ent.hp -= 4;
      ent.hurtTime = game.time;
      // Knockback application
      ent.vx = fwdX * 8;
      ent.vz = fwdZ * 8;
      ent.vy = 3.5;
      showMsg("Hit Zombie!");

      if (ent.hp <= 0) {
        entities.splice(i, 1);
        showMsg("Zombie Slain!");
      }
      return true; 
    }
  }
  return false;
}

window.addEventListener('keydown', e => {
  let firstPress = !K[e.code];
  K[e.code] = true;
  if (firstPress) {
    if (e.code === 'KeyW') {
      if (game.time - lastWPressTime < 0.3) wDoubleSprint = true;
      lastWPressTime = game.time;
    }
    if (e.code === 'Space') setLastJumpPressTime(game.time);
  }
  if (!game.running) return;
  if (e.code === 'Escape') {
    if (game.invOpen) { closeInv(); return; }
    game.paused = !game.paused;
    document.getElementById('pause').style.display = game.paused ? 'flex' : 'none';
    if (game.paused) document.exitPointerLock();
    else canvas.requestPointerLock();
  }
  if (e.code === 'KeyE' && !game.paused) {
    if (game.invOpen) closeInv();
    else openInv();
  }
  if (e.code === 'KeyF') player.flying = !player.flying;
  if (e.code.startsWith('Digit')) {
    let n = +e.code[5] - 1;
    if (n >= 0 && n <= 8) { player.selSlot = n; buildHotbar(); }
  }
});

window.addEventListener('keyup', e => {
  K[e.code] = false;
  if (e.code === 'KeyW') wDoubleSprint = false;
});

canvas.addEventListener('mousedown', e => {
  if (document.pointerLockElement !== canvas) return;
  if (e.button === 0) { 
    mouseLeft = true; 
    // Trigger combat attack; if no hostile is in crosshair, standard mining occurs
    let hit = attackHostile();
    if (hit) {
      mouseLeft = false; // Prevent immediate block breaks on hit
    }
  }
  if (e.button === 2) placeBlock();
});

canvas.addEventListener('mouseup', e => {
  if (e.button === 0) { mouseLeft = false; }
});

canvas.addEventListener('contextmenu', e => e.preventDefault());

canvas.addEventListener('wheel', e => {
  player.selSlot = (player.selSlot + (e.deltaY > 0 ? 1 : -1) + 9) % 9;
  buildHotbar();
}, { passive: true });

canvas.addEventListener('mousemove', e => {
  if (document.pointerLockElement !== canvas) return;
  // Subtracted instead of added to fix inverted horizontal mouse movement
  player.yaw -= e.movementX * game.mouseSens;
  player.pitch += e.movementY * game.mouseSens * (game.invertY ? 1 : -1);
  player.pitch = Math.max(-Math.PI / 2 + 0.01, Math.min(Math.PI / 2 - 0.01, player.pitch));
});

canvas.addEventListener('click', () => {
  if (!game.running || game.paused || game.invOpen) return;
  canvas.requestPointerLock();
});

document.addEventListener('pointerlockchange', () => {
  if (document.pointerLockElement !== canvas && game.running && !game.invOpen && !game.paused) {
    game.paused = true;
    document.getElementById('pause').style.display = 'flex';
  }
});

const sensSlider = document.getElementById('sensSlider');
const sensVal = document.getElementById('sensVal');
sensSlider.addEventListener('input', () => {
  let mult = +sensSlider.value;
  game.mouseSens = 0.0015 * mult;
  sensVal.textContent = mult.toFixed(2) + 'x';
});

document.getElementById('invertYChk').addEventListener('change', e => {
  game.invertY = e.target.checked;
});

document.getElementById('playbtn').onclick = () => {
  document.getElementById('overlay').style.display = 'none';
  document.getElementById('hud').style.display = 'flex';
  document.getElementById('crosshair').style.display = 'block';
  document.getElementById('outline').style.display = 'block';
  document.getElementById('dbg').style.display = 'block';
  document.getElementById('statusbar').style.display = 'block';

  game.running = true;

  showMsg('Generating world…');
  requestAnimationFrame(() => {
    for (let dx = -PREGEN; dx <= PREGEN; dx++) {
      for (let dz = -PREGEN; dz <= PREGEN; dz++) {
        getChunk(dx, dz);
      }
    }
    spawnPlayer();
    buildHotbar();
    canvas.requestPointerLock();
    showMsg('Mine: LMB · Attack: Target & LMB · Place: RMB · Fly: F');
  });
};

document.getElementById('resumebtn').onclick = () => {
  game.paused = false;
  document.getElementById('pause').style.display = 'none';
  canvas.requestPointerLock();
};

let lastT = 0;
function loop(now) {
  let dt = Math.min((now - lastT) / 1000, 0.05);
  lastT = now;
  if (game.running && !game.paused && !game.invOpen) {
    tickPhysics(dt, wDoubleSprint);
    tickMining(dt, mouseLeft);
    if (msgTimer > 0) {
      setMsgTimer(msgTimer - dt);
      if (msgTimer <= 0) document.getElementById('notice').style.opacity = 0;
    }
  }
  if (game.running) render();
  if (game.running && !game.paused) updateDbg();
  requestAnimationFrame(loop);
}

requestAnimationFrame(loop);