import { GRASS, DIRT, STONE, LOG, PLANKS, COBBLE, SAND, GLASS, CRAFTING } from './constants.js';

export const game = {
  running: false,
  paused: false,
  invOpen: false,
  time: 0,
  mouseSens: 0.0015,
  invertY: false,
};

export const player = {
  x: 8,
  y: 70,
  z: 8,
  vx: 0,
  vy: 0,
  vz: 0,
  yaw: 0,
  pitch: 0,
  onGround: false,
  flying: false,
  health: 20,
  selSlot: 0,
  inventory: new Array(36).fill(null),
  isSprinting: false,
  isSneaking: false,
  isSwimming: false,
  fovMul: 1,
  lastHurtTime: 0, // Records hostile strike timestamp
};

export const entities = []; // Dynamic AI entity pool

// Populate starter items
[
  [GRASS, 64], [DIRT, 64], [STONE, 64], [LOG, 32], [PLANKS, 32],
  [COBBLE, 64], [SAND, 32], [GLASS, 16], [CRAFTING, 1]
].forEach(([id, n], i) => {
  player.inventory[i] = { id, n };
});