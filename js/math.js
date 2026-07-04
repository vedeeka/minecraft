import { SEED } from './constants.js';

export function ihash(x, z, s) {
  let h = (s ^ Math.imul(x, 374761393) ^ Math.imul(z, 668265263)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177) | 0;
  return ((h ^ (h >>> 16)) & 0xffffff) / 0xffffff;
}

export function smoothN(x, z, s) {
  let xi = Math.floor(x), zi = Math.floor(z);
  let xf = x - xi, zf = z - zi;
  let u = xf * xf * (3 - 2 * xf), v = zf * zf * (3 - 2 * zf);
  return (ihash(xi, zi, s) * (1 - u) + ihash(xi + 1, zi, s) * u) * (1 - v)
       + (ihash(xi, zi + 1, s) * (1 - u) + ihash(xi + 1, zi + 1, s) * u) * v;
}

export function fbm(x, z, s) {
  let v = 0, a = 1, f = 1, m = 0;
  for (let i = 0; i < 5; i++) {
    v += smoothN(x * f, z * f, s + i * 37) * a;
    m += a;
    a *= .5;
    f *= 2.1;
  }
  return v / m;
}

export function ihash3(x, y, z, s) {
  let hs = (s ^ Math.imul(y, 2654435761)) | 0;
  return ihash(x, z, hs);
}

export function smoothN3(x, y, z, s) {
  let xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z);
  let xf = x - xi, yf = y - yi, zf = z - zi;
  let u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf), w = zf * zf * (3 - 2 * zf);
  const lerp = (a, b, t) => a + (b - a) * t;

  let c000 = ihash3(xi, yi, zi, s),     c100 = ihash3(xi + 1, yi, zi, s);
  let c010 = ihash3(xi, yi + 1, zi, s),   c110 = ihash3(xi + 1, yi + 1, zi, s);
  let c001 = ihash3(xi, yi, zi + 1, s),   c101 = ihash3(xi + 1, yi, zi + 1, s);
  let c011 = ihash3(xi, yi + 1, zi + 1, s), c111 = ihash3(xi + 1, yi + 1, zi + 1, s);

  let x00 = lerp(c000, c100, u), x10 = lerp(c010, c110, u);
  let x01 = lerp(c001, c101, u), x11 = lerp(c011, c111, u);
  let y0 = lerp(x00, x10, v),   y1 = lerp(x01, x11, v);
  return lerp(y0, y1, w);
}

// Matrix operations (column-major)
export function m4() { return new Float32Array(16); }

export function ident(m) {
  m.fill(0); m[0] = m[5] = m[10] = m[15] = 1;
  return m;
}

export function mul(a, b, o) {
  for (let c = 0; c < 4; c++) {
    for (let r = 0; r < 4; r++) {
      let s = 0;
      for (let k = 0; k < 4; k++) s += a[k * 4 + r] * b[c * 4 + k];
      o[c * 4 + r] = s;
    }
  }
  return o;
}

export function perspective(fovy, asp, near, far, o) {
  ident(o);
  let f = 1 / Math.tan(fovy / 2);
  o[0] = f / asp; o[5] = f;
  o[10] = (far + near) / (near - far); o[11] = -1;
  o[14] = (2 * far * near) / (near - far); o[15] = 0;
  return o;
}

export function fpvMatrix(ex, ey, ez, yaw, pitch, o) {
  let cy = Math.cos(yaw), sy = Math.sin(yaw);
  let cp = Math.cos(pitch), sp = Math.sin(pitch);
  let rx = cy,     ry = 0,    rz = -sy;
  let ux = sy * sp, uy = cp,   uz = cy * sp;
  let fx = sy * cp, fy = -sp,  fz = cy * cp;
  ident(o);
  o[0] = rx; o[4] = ry; o[8] = rz;
  o[1] = ux; o[5] = uy; o[9] = uz;
  o[2] = fx; o[6] = fy; o[10] = fz;
  o[12] = -(rx * ex + ry * ey + rz * ez);
  o[13] = -(ux * ex + uy * ey + uz * ez);
  o[14] = -(fx * ex + fy * ey + fz * ez);
  return o;
}