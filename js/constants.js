export const AIR = 0, GRASS = 1, DIRT = 2, STONE = 3, SAND = 4, WATER = 5,
             LOG = 6, LEAVES = 7, PLANKS = 8, GLASS = 9, GRAVEL = 10,
             COAL = 11, IRON = 12, GOLD = 13, DIAMOND = 14, SNOW = 15,
             BEDROCK = 16, COBBLE = 17, CRAFTING = 18, LAVA = 19,
             OBSIDIAN = 20, CACTUS = 21;

export const BD = {
  [GRASS]:    { n: 'Grass',          t: [88,172,56],   s: [100,155,68], b: [134,96,67],  h: 1 },
  [DIRT]:     { n: 'Dirt',           t: [134,96,67],   s: [134,96,67],  b: [134,96,67],  h: 1 },
  [STONE]:    { n: 'Stone',          t: [120,120,120], s: [120,120,120],b: [120,120,120],h: 4 },
  [SAND]:     { n: 'Sand',           t: [219,207,137], s: [214,202,132],b: [219,207,137],h: 1 },
  [WATER]:    { n: 'Water',          t: [40,100,200],  s: [36,90,185],  b: [36,90,185],  h: -1, a: .65 },
  [LOG]:      { n: 'Oak Log',        t: [110,85,48],   s: [72,52,28],   b: [110,85,48],  h: 2 },
  [LEAVES]:   { n: 'Leaves',         t: [52,128,40],   s: [48,118,36],  b: [52,128,40],  h: 1, a: .85 },
  [PLANKS]:   { n: 'Planks',         t: [162,130,78],  s: [158,125,72], b: [162,130,78], h: 2 },
  [GLASS]:    { n: 'Glass',          t: [165,222,238], s: [160,218,234],b: [165,222,238],h: 1, a: .28 },
  [GRAVEL]:   { n: 'Gravel',         t: [128,118,110], s: [124,114,106],b: [128,118,110],h: 1 },
  [COAL]:     { n: 'Coal Ore',       t: [95,95,95],    s: [95,95,95],   b: [95,95,95],   h: 4 },
  [IRON]:     { n: 'Iron Ore',       t: [188,158,128], s: [185,155,125],b: [188,158,128],h: 4 },
  [GOLD]:     { n: 'Gold Ore',       t: [225,188,55],  s: [220,183,50], b: [225,188,55], h: 4 },
  [DIAMOND]:  { n: 'Diamond',        t: [55,202,210],  s: [50,196,205], b: [55,202,210], h: 6 },
  [SNOW]:     { n: 'Snow',           t: [240,248,255], s: [238,245,252],b: [240,248,255],h: 1 },
  [BEDROCK]:  { n: 'Bedrock',        t: [38,38,38],    s: [38,38,38],   b: [38,38,38],   h: 9999 },
  [COBBLE]:   { n: 'Cobblestone',    t: [108,108,108], s: [104,104,104],b: [108,108,108],h: 3 },
  [CRAFTING]: { n: 'Crafting Table', t: [158,102,38],  s: [148,92,32],  b: [162,130,78], h: 2 },
  [LAVA]:     { n: 'Lava',           t: [222,78,8],    s: [218,72,4],   b: [222,78,8],   h: -1 },
  [OBSIDIAN]: { n: 'Obsidian',       t: [20,12,36],    s: [18,10,32],   b: [20,12,36],   h: 50 },
  [CACTUS]:   { n: 'Cactus',         t: [60,135,60],   s: [54,122,54],  b: [60,135,60],  h: 1.5 },
};


export const CHUNK = 16, WH = 96, SEA = 42;


export const SEED = (Math.random() * 0xfffff) | 0;


// Render and Pre-generation settings
export const RD = 4;      // Render distance in chunks
export const PREGEN = 2;  // Warm-up radius on spawn