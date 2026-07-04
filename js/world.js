import { CHUNK, WH, SEA, SEED, AIR, STONE, WATER, LOG, LEAVES, BEDROCK, SAND, DIRT, GRASS, SNOW, COAL, IRON, GOLD, DIAMOND, LAVA, CACTUS } from './constants.js';
import { fbm, smoothN, ihash, smoothN3 } from './math.js';

export let chunks = {};
export let dirtyMeshes = {};

export function ckey(cx, cz) { return cx + '|' + cz; }
export function bidx(lx, y, lz) { return (y * CHUNK + lz) * CHUNK + lx; }

export function surfHeight(wx, wz) {
  let h = fbm(wx * .022, wz * .022, SEED);
  let mtn = fbm(wx * .009, wz * .009, SEED + 713);
  let ridge = Math.pow(mtn, 1.7) * 36;
  return Math.round(SEA - 3 + h * 18 + ridge);
}

export function biomeAt(wx, wz) {
  let t = smoothN(wx * .006, wz * .006, SEED + 300);
  let el = surfHeight(wx, wz);
  if (el > SEA + 24) return 'mountain';
  if (t < 0.28) return 'desert';
  if (t > 0.74) return 'tundra';
  return 'plains';
}

function treeAt(wx, wz) {
  let b = biomeAt(wx, wz);
  let dens = (b === 'desert') ? .965 : .908;
  return ihash(wx, wz, SEED + 5151) > dens && (wx * 11 + wz * 7 + wx * wz) % 5 !== 0;
}

export function genChunk(cx, cz) {
  let d = new Uint8Array(CHUNK * CHUNK * WH);
  for (let lx = 0; lx < CHUNK; lx++) {
    for (let lz = 0; lz < CHUNK; lz++) {
      let wx = cx * CHUNK + lx, wz = cz * CHUNK + lz;
      let surf = Math.max(1, Math.min(WH - 12, surfHeight(wx, wz)));
      let bio = biomeAt(wx, wz);
      let bedrockH = 1 + Math.floor(ihash(wx, wz, SEED + 77) * 3);
      let isBeach = bio !== 'desert' && surf <= SEA + 2 && surf >= SEA - 2;

      for (let y = 0; y < WH; y++) {
        let id = AIR;
        if (y < bedrockH) {
          id = BEDROCK;
        } else if (y < surf - 4) {
          let r1 = ihash(wx, wz * 13 + y * 7, SEED + 33);
          let r2 = ihash(wx * 7 + y, wz, SEED + 44);
          if (r1 > .977 && y < 20) id = DIAMOND;
          else if (r1 > .952 && y < 36) id = GOLD;
          else if (r1 > .91) id = IRON;
          else if (r2 > .86) id = COAL;
          else id = STONE;

          if (y >= bedrockH + 3 && y < surf - 6) {
            let cn = smoothN3(wx * .085, y * .11, wz * .085, SEED + 900);
            if (cn > .715) id = (y < 9) ? LAVA : AIR;
          }
        } else if (y < surf) {
          id = isBeach ? SAND : ((bio === 'desert') ? SAND : DIRT);
        } else if (y === surf) {
          if (isBeach) id = SAND;
          else if (bio === 'desert') id = SAND;
          else if (bio === 'mountain' && surf > SEA + 22) id = SNOW;
          else id = GRASS;
        } else if (y > surf && y <= SEA) {
          id = WATER;
        }
        d[bidx(lx, y, lz)] = id;
      }

      if (treeAt(wx, wz) && surf > SEA && !isBeach) {
        if (bio === 'desert') {
          let ch = 2 + Math.floor(ihash(wx, wz, SEED + 61) * 3);
          let ty = surf + 1;
          for (let i = 0; i < ch && ty + i < WH; i++) d[bidx(lx, ty + i, lz)] = CACTUS;
        } else if (bio === 'tundra' || bio === 'mountain') {
          let th = 5 + Math.floor(ihash(wx, wz, SEED + 22) * 3);
          let ty = surf + 1;
          for (let i = 0; i < th && ty + i < WH; i++) d[bidx(lx, ty + i, lz)] = LOG;
          let top = ty + th;
          let levels = [2, 1, 1, 0];
          for (let li = 0; li < levels.length; li++) {
            let r = levels[li];
            let ly = top - (levels.length - 1) + li;
            if (ly < 0 || ly >= WH) continue;
            for (let dx2 = -r; dx2 <= r; dx2++) {
              for (let dz2 = -r; dz2 <= r; dz2++) {
                if (r > 0 && Math.abs(dx2) === r && Math.abs(dz2) === r) continue;
                let nlx = lx + dx2, nlz = lz + dz2;
                if (nlx < 0 || nlx >= CHUNK || nlz < 0 || nlz >= CHUNK) continue;
                if (d[bidx(nlx, ly, nlz)] === AIR) d[bidx(nlx, ly, nlz)] = LEAVES;
              }
            }
          }
        } else {
          let th = 4 + Math.floor(ihash(wx, wz, SEED + 22) * 3);
          let ty = surf + 1;
          for (let i = 0; i < th && ty + i < WH; i++) d[bidx(lx, ty + i, lz)] = LOG;
          let top = ty + th;
          for (let dy = -2; dy <= 2; dy++) {
            for (let dx2 = -2; dx2 <= 2; dx2++) {
              for (let dz2 = -2; dz2 <= 2; dz2++) {
                if (dx2 === 0 && dz2 === 0 && dy < 0) continue;
                if (Math.sqrt(dx2 * dx2 + dy * dy * 0.6 + dz2 * dz2) > 2.1) continue;
                let nlx = lx + dx2, nly = top + dy - 1, nlz = lz + dz2;
                if (nlx < 0 || nlx >= CHUNK || nlz < 0 || nlz >= CHUNK) continue;
                if (nly < 0 || nly >= WH) continue;
                if (d[bidx(nlx, nly, nlz)] === AIR) d[bidx(nlx, nly, nlz)] = LEAVES;
              }
            }
          }
        }
      }
    }
  }
  return d;
}

export function getChunk(cx, cz) {
  let k = ckey(cx, cz);
  if (!chunks[k]) chunks[k] = genChunk(cx, cz);
  return chunks[k];
}

export function getBlock(wx, wy, wz) {
  if (wy < 0) return BEDROCK;
  if (wy >= WH) return AIR;
  let cx = Math.floor(wx / CHUNK), cz = Math.floor(wz / CHUNK);
  let lx = ((wx % CHUNK) + CHUNK) % CHUNK, lz = ((wz % CHUNK) + CHUNK) % CHUNK;
  return getChunk(cx, cz)[bidx(lx, wy, lz)];
}

export function setBlock(wx, wy, wz, id) {
  if (wy < 0 || wy >= WH) return;
  let cx = Math.floor(wx / CHUNK), cz = Math.floor(wz / CHUNK);
  let lx = ((wx % CHUNK) + CHUNK) % CHUNK, lz = ((wz % CHUNK) + CHUNK) % CHUNK;
  getChunk(cx, cz)[bidx(lx, wy, lz)] = id;
  dirtyMeshes[ckey(cx, cz)] = true;
  if (lx === 0) dirtyMeshes[ckey(cx - 1, cz)] = true;
  if (lx === CHUNK - 1) dirtyMeshes[ckey(cx + 1, cz)] = true;
  if (lz === 0) dirtyMeshes[ckey(cx, cz - 1)] = true;
  if (lz === CHUNK - 1) dirtyMeshes[ckey(cx, cz + 1)] = true;
}