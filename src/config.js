export const AXES = 6;

export const PRESETS = {
  ability: { labels: ["agility", "defense", "health", "speed", "strength", "wisdom"], values: [9, 4, 6, 9, 8, 7] },
  vibe: { labels: ["deep", "edgy", "flowy", "moody", "playful", "soft"], values: [6, 9, 7, 5, 8, 4] },
};

export const NOTES = {
  ability: "Track your ability with your face. Slide each skill up and watch your expression stretch to match.",
  vibe: "Track your mood with your face. Slide each feeling up and watch your expression stretch to match.",
};

// Landing gallery. Put image files in public/gallery/ and list them here,
// e.g. ["gallery/01.jpg", "gallery/02.jpg"]. While the list is empty,
// the gallery shows warped versions of the demo face.
export const GALLERY_IMAGES = [];

// Value sets used to render the demo gallery tiles.
export const DEMO_TILE_SETS = [
  [10, 10, 10, 10, 10, 10], [10, 3, 3, 10, 3, 3], [3, 10, 3, 3, 10, 3], [9, 6, 10, 4, 8, 7],
  [2, 2, 10, 2, 2, 10], [10, 4, 7, 9, 3, 8], [6, 10, 6, 10, 6, 10], [3, 3, 3, 10, 3, 3],
];

export const asset = (path) => import.meta.env.BASE_URL + path.replace(/^\//, "");
