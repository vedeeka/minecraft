# MinecraftClone

A modular, lightweight 3D sandbox exploration game built from scratch using vanilla HTML5, CSS3, WebGL, and JavaScript ES modules. It features infinite procedural world generation, realistic climate-driven biomes, and a modern glassmorphic user interface.

---
## Demo

![Minecarft Demo](images/img1.png)
![Minecarft Demo](images/img2.png)
----

## Features

- **Procedural World Generation**: Utilizes fractional Brownian motion (FBM) and value noise to generate infinite terrain complete with continental mountain ranges, shorelines, and meandering river channels.
- **Biomes & Climate**: Integrates temperature and moisture simulation models to form distinct biomes (forests, plains, savanna, deserts, taiga, tundra, snowy mountains, beaches, and oceans).
- **Seamless Chunk Boundaries**: Implements a deterministic $7 \times 7$ column decoration pass (Poisson-disc distribution) so that large structures (such as trees and cacti) generate smoothly across chunk borders without visual shearing.
- **Dual-Pass WebGL Renderer**: Splitting rendering into solid (opaque) and alpha (transparent) passes resolves traditional depth-buffer sorting conflicts, allowing semi-transparent water, glass, and leaves to blend cleanly over the terrain.
- **Optimized Performance**: Noise algorithms and linear interpolation helpers are optimized as static, allocation-free functions to prevent garbage collection spikes in performance-critical loops.
- **Skeuomorphic Glassmorphism UI**: Uses high-performance CSS backdrop filters (`backdrop-filter: blur`), inset border shadows, custom SVG health vectors, and clean typography to present an immersive interface.

---

## Directory Structure

```text
mineclone/
├── index.html          # Main HTML structure and UI overlays
├── style.css           # Modern gaming UI stylesheets and screen vignette
└── js/
    ├── constants.js    # Voxel ID maps and world configuration variables
    ├── math.js         # Noise algorithms, matrices, and math utility helpers
    ├── state.js        # Global game state and player records
    ├── world.js        # Terrain generation, climate math, and chunk storage
    ├── player.js       # Raycasting, inventory, mining/placing actions
    ├── physics.js      # Player movement, AABB collisions, and swimming
    ├── renderer.js     # WebGL shaders, buffer management, and drawing cycles
    └── ui.js           # Hotbar rendering, debug panels, and vector HUD elements

```
## License

Free to use, modify, and distribute — for personal projects, no attribution required. 
