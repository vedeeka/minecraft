import { player, game } from './state.js';
import { BD } from './constants.js';
import { raycast, eyeHeight } from './player.js';
import { biomeAt } from './world.js';
import { canvas } from './renderer.js';

// SVG Assets for Crisp Red and Dark Hearts
const heartFull = `<svg class="hrt" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="M16 28.5L4.8 17.1C1.8 14.1 1.8 9.2 4.8 6.2C7.8 3.2 12.7 3.2 15.7 6.2L16 6.5L16.3 6.2C19.3 3.2 24.2 3.2 27.2 6.2C30.2 9.2 30.2 14.1 27.2 17.1L16 28.5Z" fill="#ff2d55" stroke="#4a000d" stroke-width="2.5" stroke-linejoin="round"/>
</svg>`;

const heartEmpty = `<svg class="hrt" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="M16 28.5L4.8 17.1C1.8 14.1 1.8 9.2 4.8 6.2C7.8 3.2 12.7 3.2 15.7 6.2L16 6.5L16.3 6.2C19.3 3.2 24.2 3.2 27.2 6.2C30.2 9.2 30.2 14.1 27.2 17.1L16 28.5Z" fill="rgba(255,255,255,0.05)" stroke="rgba(255,255,255,0.3)" stroke-width="2.5" stroke-linejoin="round"/>
</svg>`;

export function blockIcon(id) {
  let def = BD[id]; if (!def) return null;
  let cv = document.createElement('canvas');
  cv.width = cv.height = 32;
  let c = cv.getContext('2d');
  let t = def.t, s = def.s, a = def.a || 1;
  c.globalAlpha = Math.min(1, a + 0.2);
  c.fillStyle = `rgb(${t[0]},${t[1]},${t[2]})`;
  c.beginPath(); c.moveTo(16, 2); c.lineTo(30, 10); c.lineTo(16, 18); c.lineTo(2, 10); c.closePath(); c.fill();
  c.fillStyle = `rgb(${Math.floor(s[0] * .78)},${Math.floor(s[1] * .78)},${Math.floor(s[2] * .78)})`;
  c.fillRect(2, 10, 14, 14);
  c.fillStyle = `rgb(${Math.floor(s[0] * .58)},${Math.floor(s[1] * .58)},${Math.floor(s[2] * .58)})`;
  c.fillRect(16, 10, 14, 14);
  return cv;
}

export function buildHotbar() {
  let hb = document.getElementById('hotbar');
  hb.innerHTML = '';
  for (let i = 0; i < 9; i++) {
    let d = document.createElement('div');
    d.className = 'hs' + (i === player.selSlot ? ' active' : '');
    let item = player.inventory[i];
    if (item) {
      let ic = blockIcon(item.id);
      if (ic) d.appendChild(ic);
      if (item.n > 1) {
        let s = document.createElement('span');
        s.className = 'cnt';
        s.textContent = item.n;
        d.appendChild(s);
      }
    }
    hb.appendChild(d);
  }
  let hp = document.getElementById('hp');
  hp.innerHTML = '';
  for (let i = 0; i < 10; i++) {
    let s = document.createElement('span');
    s.className = 'hrt';
    s.innerHTML = i * 2 < player.health ? heartFull : heartEmpty;
    hp.appendChild(s);
  }
}

export function openInv() {
  game.invOpen = true;
  document.exitPointerLock();
  document.getElementById('inv').style.display = 'flex';
  buildInvGrid();
}

export function closeInv() {
  game.invOpen = false;
  document.getElementById('inv').style.display = 'none';
  canvas.requestPointerLock();
}

export function buildInvGrid() {
  let g = document.getElementById('inv-grid');
  g.innerHTML = '';
  let row1 = document.createElement('div'); row1.className = 'inv-row';
  let rows = [document.createElement('div'), document.createElement('div'), document.createElement('div')];
  rows.forEach(r => r.className = 'inv-row');
  for (let i = 0; i < 36; i++) {
    let sl = document.createElement('div'); sl.className = 'is';
    let item = player.inventory[i];
    if (item) {
      let ic = blockIcon(item.id); if (ic) sl.appendChild(ic);
      if (item.n > 1) {
        let s = document.createElement('span'); s.className = 'cnt'; s.textContent = item.n; sl.appendChild(s);
      }
      let def = BD[item.id]; sl.title = def ? def.n : '';
    }
    sl.onclick = () => { player.selSlot = i % 9; buildHotbar(); };
    if (i < 9) row1.appendChild(sl);
    else rows[Math.floor((i - 9) / 9)].appendChild(sl);
  }
  let sep = document.createElement('div'); sep.className = 'inv-sep';
  g.appendChild(rows[0]); g.appendChild(rows[1]); g.appendChild(rows[2]);
  g.appendChild(sep); g.appendChild(row1);
}

document.getElementById('inv-close').onclick = closeInv;

export function updateDbg() {
  let ray = raycast();
  let bn = ray ? (BD[ray.block] || { n: '?' }).n : '—';
  let bio = biomeAt(Math.floor(player.x), Math.floor(player.z));
  document.getElementById('dbg').innerHTML =
    `X ${player.x.toFixed(2)} Y ${(player.y + eyeHeight()).toFixed(2)} Z ${player.z.toFixed(2)}<br>` +
    `Yaw ${(player.yaw * 180 / Math.PI).toFixed(1)}° Pitch ${(player.pitch * 180 / Math.PI).toFixed(1)}°<br>` +
    `Biome: ${bio} | Looking: ${bn}<br>` +
    `onGround:${player.onGround} | Slot:${player.selSlot + 1}`;
  let state = player.flying ? '✈ FLYING' : player.isSwimming ? '〜 SWIMMING' : player.isSneaking ? '⬇ SNEAKING' : player.isSprinting ? '⚡ SPRINTING' : '⬛ Walking';
  document.getElementById('statusbar').textContent = state;
}

export let msgTimer = 0;
export function setMsgTimer(val) { msgTimer = val; }

export function showMsg(txt) {
  let m = document.getElementById('notice');
  m.textContent = txt; m.style.opacity = 1; msgTimer = 3;
}