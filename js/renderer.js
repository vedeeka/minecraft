import { player, entities } from './state.js';
import { CHUNK, WH, WATER, LAVA, BD, RD } from './constants.js';
import { perspective, fpvMatrix, m4 } from './math.js';
import { getChunk, getBlock } from './world.js';
import { eyeHeight, raycast, miningTarget, miningProg } from './player.js';

export const canvas = document.getElementById('c');
export const gl = canvas.getContext('webgl', { antialias: false }) || canvas.getContext('experimental-webgl');
gl.getExtension('OES_element_index_uint');

const VS = `
attribute vec3 aP;
attribute vec3 aN;
attribute vec4 aC;

uniform mat4 uP;
uniform mat4 uV;
uniform vec3 uEye;

uniform int uIsEntity;
uniform vec3 uOffset;
uniform vec3 uScale;
uniform vec4 uColor;

varying vec4 vC;
varying float vFog;

void main(){
  vec3 p = aP;
  if(uIsEntity == 1) {
    p = (aP * uScale) + uOffset;
  }
  
  vec4 wp=vec4(p, 1.0);
  gl_Position=uP*uV*wp;
  
  if(uIsEntity == 1) {
    // Lambertian lighting based on normals
    float l = clamp(dot(aN, normalize(vec3(0.3, 1.0, 0.4))), 0.4, 1.0);
    vC = vec4(uColor.rgb * l, uColor.a);
  } else {
    vC = aC;
  }
  
  float d=length(p-uEye);
  vFog=clamp((d-38.0)/28.0,0.0,1.0);
}`;

const FS = `
precision mediump float;
varying vec4 vC;
varying float vFog;
void main(){
  vec3 fog=vec3(0.55,0.72,0.88);
  vec3 col=mix(vC.rgb,fog,vFog);
  gl_FragColor=vec4(col,vC.a);
}`;

function mkShader(t, src) {
  let s = gl.createShader(t);
  gl.shaderSource(s, src); gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) console.error(gl.getShaderInfoLog(s));
  return s;
}

const prog = gl.createProgram();
gl.attachShader(prog, mkShader(gl.VERTEX_SHADER, VS));
gl.attachShader(prog, mkShader(gl.FRAGMENT_SHADER, FS));
gl.linkProgram(prog);
if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) console.error(gl.getProgramInfoLog(prog));
gl.useProgram(prog);

const LOC = {
  aP: gl.getAttribLocation(prog, 'aP'),
  aN: gl.getAttribLocation(prog, 'aN'),
  aC: gl.getAttribLocation(prog, 'aC'),
  uP: gl.getUniformLocation(prog, 'uP'),
  uV: gl.getUniformLocation(prog, 'uV'),
  uEye: gl.getUniformLocation(prog, 'uEye'),
  uIsEntity: gl.getUniformLocation(prog, 'uIsEntity'),
  uOffset: gl.getUniformLocation(prog, 'uOffset'),
  uScale: gl.getUniformLocation(prog, 'uScale'),
  uColor: gl.getUniformLocation(prog, 'uColor'),
};

gl.enable(gl.DEPTH_TEST);
gl.enable(gl.CULL_FACE);
gl.cullFace(gl.BACK);
gl.enable(gl.BLEND);
gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

const FDEF = [
  { n: [0,1,0],  v: [[0,1,0],[0,1,1],[1,1,1],[1,1,0]], L: 1.00, t: 'top' },
  { n: [0,-1,0], v: [[0,0,1],[0,0,0],[1,0,0],[1,0,1]], L: 0.50, t: 'bot' },
  { n: [0,0,1],  v: [[1,1,1],[0,1,1],[0,0,1],[1,0,1]], L: 0.80, t: 'side' },
  { n: [0,0,-1], v: [[0,1,0],[1,1,0],[1,0,0],[0,0,0]], L: 0.80, t: 'side' },
  { n: [1,0,0],  v: [[1,1,0],[1,1,1],[1,0,1],[1,0,0]], L: 0.60, t: 'side' },
  { n: [-1,0,0], v: [[0,1,1],[0,1,0],[0,0,0],[0,0,1]], L: 0.60, t: 'side' },
];
const FDIR = [[0,1,0],[0,-1,0],[0,0,1],[0,0,-1],[1,0,0],[-1,0,0]];
const STRIDE = 10;

function buildMesh(cx, cz) {
  let floats = [], indices = [];
  let chunk = getChunk(cx, cz);
  let vi = 0;
  for (let y = 0; y < WH; y++) {
    for (let lz = 0; lz < CHUNK; lz++) {
      for (let lx = 0; lx < CHUNK; lx++) {
        let bid = chunk[(y * CHUNK + lz) * CHUNK + lx];
        if (!bid) continue;
        let def = BD[bid]; if (!def) continue;
        let wx = cx * CHUNK + lx, wz = cz * CHUNK + lz;
        let alpha = def.a || 1;

        for (let fi = 0; fi < 6; fi++) {
          let fd = FDEF[fi], nd = FDIR[fi];
          let nx = wx + nd[0], ny = y + nd[1], nz = wz + nd[2];
          let nb = getBlock(nx, ny, nz);
          let nbDef = BD[nb];
          let show = !nb ||
            (bid !== WATER && nb === WATER) ||
            (bid !== LAVA && nb === LAVA) ||
            (nbDef && nbDef.a && nbDef.a < 0.99 && nb !== bid);
          if (!show) continue;

          let col = fd.t === 'top' ? def.t : fd.t === 'bot' ? def.b : def.s;
          let L = fd.L;
          let r = col[0] / 255 * L, g = col[1] / 255 * L, b2 = col[2] / 255 * L;

          fd.v.forEach(([vx, vy, vz]) => {
            floats.push(wx + vx, y + vy, wz + vz, ...fd.n, r, g, b2, alpha);
          });
          let base = vi;
          indices.push(base, base + 1, base + 2, base, base + 2, base + 3);
          vi += 4;
        }
      }
    }
  }
  return { floats: new Float32Array(floats), indices: new Uint32Array(indices), count: indices.length };
}

import { dirtyMeshes } from './world.js';
let meshCache = {};

export function getMesh(cx, cz) {
  let k = cx + '|' + cz;
  if (dirtyMeshes[k]) { delete meshCache[k]; delete dirtyMeshes[k]; }
  if (!meshCache[k]) {
    let m = buildMesh(cx, cz);
    if (!m.count) { meshCache[k] = null; return null; }
    let vb = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vb);
    gl.bufferData(gl.ARRAY_BUFFER, m.floats, gl.STATIC_DRAW);
    let ib = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ib);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, m.indices, gl.STATIC_DRAW);
    meshCache[k] = { vb, ib, count: m.count };
  }
  return meshCache[k];
}

export function resize() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  gl.viewport(0, 0, canvas.width, canvas.height);
}
window.addEventListener('resize', resize);
resize();

// Static buffers for dynamic cubic models (Zombies)
let modelVb = null, modelIb = null;
function initModelBuffer() {
  let vertices = new Float32Array([
    // Top
    -0.5, 1.8, -0.5,  0,1,0,  0,0,0,1,
     0.5, 1.8, -0.5,  0,1,0,  0,0,0,1,
     0.5, 1.8,  0.5,  0,1,0,  0,0,0,1,
    -0.5, 1.8,  0.5,  0,1,0,  0,0,0,1,
    // Bottom
    -0.5, 0.0, -0.5,  0,-1,0, 0,0,0,1,
     0.5, 0.0, -0.5,  0,-1,0, 0,0,0,1,
     0.5, 0.0,  0.5,  0,-1,0, 0,0,0,1,
    -0.5, 0.0,  0.5,  0,-1,0, 0,0,0,1,
    // Front
    -0.5, 0.0,  0.5,  0,0,1,  0,0,0,1,
     0.5, 0.0,  0.5,  0,0,1,  0,0,0,1,
     0.5, 1.8,  0.5,  0,0,1,  0,0,0,1,
    -0.5, 1.8,  0.5,  0,0,1,  0,0,0,1,
    // Back
    -0.5, 0.0, -0.5,  0,0,-1, 0,0,0,1,
     0.5, 0.0, -0.5,  0,0,-1, 0,0,0,1,
     0.5, 1.8, -0.5,  0,0,-1, 0,0,0,1,
    -0.5, 1.8, -0.5,  0,0,-1, 0,0,0,1,
    // Right
     0.5, 0.0, -0.5,  1,0,0,  0,0,0,1,
     0.5, 0.0,  0.5,  1,0,0,  0,0,0,1,
     0.5, 1.8,  0.5,  1,0,0,  0,0,0,1,
     0.5, 1.8, -0.5,  1,0,0,  0,0,0,1,
    // Left
    -0.5, 0.0, -0.5, -1,0,0,  0,0,0,1,
    -0.5, 0.0,  0.5, -1,0,0,  0,0,0,1,
    -0.5, 1.8,  0.5, -1,0,0,  0,0,0,1,
    -0.5, 1.8, -0.5, -1,0,0,  0,0,0,1,
  ]);
  let indices = new Uint32Array([
    0,1,2, 0,2,3,
    4,5,6, 4,6,7,
    8,9,10, 8,10,11,
    12,13,14, 12,14,15,
    16,17,18, 16,18,19,
    20,21,22, 20,22,23
  ]);
  modelVb = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, modelVb);
  gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);
  modelIb = gl.createBuffer();
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, modelIb);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW);
}
initModelBuffer();

const PROJ = m4(), VIEW = m4();

function drawMeshes() {
  let floatSize = 4;
  let stride = STRIDE * floatSize;
  let cx = Math.floor(player.x / CHUNK), cz = Math.floor(player.z / CHUNK);
  
  gl.uniform1i(LOC.uIsEntity, 0); // Rendering world meshes
  for (let dcx = -RD; dcx <= RD; dcx++) {
    for (let dcz = -RD; dcz <= RD; dcz++) {
      let mesh = getMesh(cx + dcx, cz + dcz);
      if (!mesh) continue;
      gl.bindBuffer(gl.ARRAY_BUFFER, mesh.vb);
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, mesh.ib);
      gl.enableVertexAttribArray(LOC.aP);
      gl.vertexAttribPointer(LOC.aP, 3, gl.FLOAT, false, stride, 0);
      gl.enableVertexAttribArray(LOC.aN);
      gl.vertexAttribPointer(LOC.aN, 3, gl.FLOAT, false, stride, 12);
      gl.enableVertexAttribArray(LOC.aC);
      gl.vertexAttribPointer(LOC.aC, 4, gl.FLOAT, false, stride, 24);
      gl.drawElements(gl.TRIANGLES, mesh.count, gl.UNSIGNED_INT, 0);
    }
  }

  // --- Dynamic Hostiles Pass ---
  if (entities.length > 0) {
    gl.uniform1i(LOC.uIsEntity, 1);
    gl.bindBuffer(gl.ARRAY_BUFFER, modelVb);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, modelIb);
    gl.enableVertexAttribArray(LOC.aP);
    gl.vertexAttribPointer(LOC.aP, 3, gl.FLOAT, false, stride, 0);
    gl.enableVertexAttribArray(LOC.aN);
    gl.vertexAttribPointer(LOC.aN, 3, gl.FLOAT, false, stride, 12);
    gl.enableVertexAttribArray(LOC.aC);
    gl.vertexAttribPointer(LOC.aC, 4, gl.FLOAT, false, stride, 24);

    for (let i = 0; i < entities.length; i++) {
      let ent = entities[i];
      // Flashes bright crimson on damage strike
      let isHurt = (game.time - ent.hurtTime < 0.25);
      let col = isHurt ? [1.0, 0.2, 0.2, 1.0] : [0.25, 0.55, 0.25, 1.0];

      gl.uniform3f(LOC.uOffset, ent.x, ent.y, ent.z);
      gl.uniform3f(LOC.uScale, 0.65, 1.0, 0.65);
      gl.uniform4f(LOC.uColor, col[0], col[1], col[2], col[3]);

      gl.drawElements(gl.TRIANGLES, 36, gl.UNSIGNED_INT, 0);
    }
  }
}

export function render() {
  gl.clearColor(0.52, 0.70, 0.87, 1);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  perspective(Math.PI / 3 * player.fovMul, canvas.width / canvas.height, 0.05, 300, PROJ);
  fpvMatrix(player.x, player.y + eyeHeight(), player.z, player.yaw, player.pitch, VIEW);

  gl.uniformMatrix4fv(LOC.uP, false, PROJ);
  gl.uniformMatrix4fv(LOC.uV, false, VIEW);
  gl.uniform3f(LOC.uEye, player.x, player.y + eyeHeight(), player.z);

  gl.depthMask(true);
  drawMeshes();

  drawTargetOutline();
}

const oc = document.getElementById('outline');
const o2 = oc.getContext('2d');
function resizeOutline() { oc.width = window.innerWidth; oc.height = window.innerHeight; }
window.addEventListener('resize', resizeOutline);
resizeOutline();

function projectPoint(wx, wy, wz) {
  let vx2 = VIEW[0]*wx + VIEW[4]*wy + VIEW[8]*wz + VIEW[12];
  let vy2 = VIEW[1]*wx + VIEW[5]*wy + VIEW[9]*wz + VIEW[13];
  let vz2 = VIEW[2]*wx + VIEW[6]*wy + VIEW[10]*wz + VIEW[14];
  let vw2 = VIEW[3]*wx + VIEW[7]*wy + VIEW[11]*wz + VIEW[15];

  let cx2 = PROJ[0]*vx2 + PROJ[4]*vy2 + PROJ[8]*vz2 + PROJ[12]*vw2;
  let cy2 = PROJ[1]*vx2 + PROJ[5]*vy2 + PROJ[13]*vw2 + PROJ[9]*vz2; 
  let cw = PROJ[3]*vx2 + PROJ[7]*vy2 + PROJ[11]*vz2 + PROJ[15]*vw2;
  if (cw <= 0) return null;
  let ndcx = cx2 / cw, ndcy = cy2 / cw;
  return [(ndcx + 1) * 0.5 * canvas.width, (1 - ndcy) * 0.5 * canvas.height];
}

export function drawTargetOutline() {
  o2.clearRect(0, 0, oc.width, oc.height);
  let ray = raycast();
  if (!ray) return;
  let { bx, by, bz } = ray;
  const EDGES = [
    [0,0,0,1,0,0],[1,0,0,1,1,0],[1,1,0,0,1,0],[0,1,0,0,0,0],
    [0,0,1,1,0,1],[1,0,1,1,1,1],[1,1,1,0,1,1],[0,1,1,0,0,1],
    [0,0,0,0,0,1],[1,0,0,1,0,1],[1,1,0,1,1,1],[0,1,0,0,1,1],
  ];
  o2.strokeStyle = 'rgba(0,0,0,0.7)';
  o2.lineWidth = 2;
  for (let [x1, y1, z1, x2, y2, z2] of EDGES) {
    let p1 = projectPoint(bx + x1, by + y1, bz + z1);
    let p2 = projectPoint(bx + x2, by + y2, bz + z2);
    if (!p1 || !p2) continue;
    o2.beginPath();
    o2.moveTo(p1[0], p1[1]);
    o2.lineTo(p2[0], p2[1]);
    o2.stroke();
  }

  if (miningTarget && miningProg > 0) {
    let w = 120, h = 6;
    let sx = canvas.width / 2 - w / 2, sy = canvas.height / 2 + 24;
    o2.fillStyle = 'rgba(0,0,0,0.5)';
    o2.fillRect(sx, sy, w, h);
    o2.fillStyle = '#fff';
    o2.fillRect(sx, sy, w * miningProg, h);
  }
}