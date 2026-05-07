const canvas = document.querySelector("#game");
const ctx = canvas.getContext("2d");

const W = canvas.width;
const H = canvas.height;
let WORLD_W = 5600;
const GROUND_Y = 438;
const WATER_Y = 414;
const WATER = { x: 1480, w: 820 };
const HERO_FRAME = { w: 150, h: 180, displayW: 107, displayH: 128, anchorX: 74, anchorY: 178 };

ctx.imageSmoothingEnabled = true;
ctx.imageSmoothingQuality = "high";

const imagePaths = {
  world: "assets/river-world.png",
  hero: "assets/hero.png",
  ghost: "assets/ghost.png",
  boat: "assets/boat.png",
  items: "assets/items.png",
  village: "assets/village-props.png",
  transport: "assets/transport-props.png",
};

const keys = new Set();
const pressed = new Set();
const images = {};
const customImageObjectUrls = {};
let sprites;
let camera = 0;
let lastTime = 0;
let gameState = "loading";
let clearTimer = 0;
let levelTransitionPending = false;
let clearSubtitle = "";

const editorEls = {
  toggle: document.querySelector("#editor-toggle"),
  status: document.querySelector("#editor-status"),
  panel: document.querySelector("#editor-panel"),
  tabs: Array.from(document.querySelectorAll("[data-editor-tab]")),
  tabPanels: Array.from(document.querySelectorAll("[data-editor-panel]")),
  type: document.querySelector("#asset-type"),
  asset: document.querySelector("#asset-id"),
  add: document.querySelector("#add-asset"),
  duplicate: document.querySelector("#duplicate-asset"),
  delete: document.querySelector("#delete-asset"),
  deleteAssetClass: document.querySelector("#delete-asset-class"),
  openAssetModal: document.querySelector("#open-asset-modal"),
  assetModal: document.querySelector("#asset-modal"),
  closeAssetModal: document.querySelector("#close-asset-modal"),
  newAssetId: document.querySelector("#new-asset-id"),
  newUploadedAssetId: document.querySelector("#new-uploaded-asset-id"),
  newAssetType: document.querySelector("#new-asset-type"),
  newAssetFiles: document.querySelector("#new-asset-files"),
  createUploadedAssets: document.querySelector("#create-uploaded-assets"),
  spriteSource: document.querySelector("#sprite-source"),
  spriteX: document.querySelector("#sprite-x"),
  spriteY: document.querySelector("#sprite-y"),
  spriteW: document.querySelector("#sprite-w"),
  spriteH: document.querySelector("#sprite-h"),
  spriteTolerance: document.querySelector("#sprite-tolerance"),
  spriteUpload: document.querySelector("#sprite-upload"),
  spritePreview: document.querySelector("#sprite-preview"),
  updateSprite: document.querySelector("#update-sprite"),
  createAsset: document.querySelector("#create-asset"),
  x: document.querySelector("#edit-x"),
  y: document.querySelector("#edit-y"),
  w: document.querySelector("#edit-w"),
  h: document.querySelector("#edit-h"),
  alpha: document.querySelector("#edit-alpha"),
  parallax: document.querySelector("#edit-parallax"),
  camera: document.querySelector("#camera-slider"),
  width: document.querySelector("#level-width"),
  waterX: document.querySelector("#water-x"),
  waterW: document.querySelector("#water-w"),
  soundEditor: document.querySelector("#sound-editor"),
  levelSelect: document.querySelector("#level-select"),
  levelName: document.querySelector("#level-name"),
  newLevel: document.querySelector("#new-level"),
  deleteLevel: document.querySelector("#delete-level"),
  save: document.querySelector("#save-level"),
  load: document.querySelector("#load-level"),
  reset: document.querySelector("#reset-level"),
  export: document.querySelector("#export-level"),
  import: document.querySelector("#import-level"),
  json: document.querySelector("#level-json"),
};

const editor = {
  active: false,
  activeTab: "assets",
  selected: null,
  dragging: false,
  dragStart: null,
  pendingUpload: null,
  pendingUploadFile: null,
  pendingImage: null,
  currentLevel: "Level 1",
};

const STORAGE_KEY = "river-lantern-level-v1";
const LEVELS_KEY = "river-lantern-levels-v2";
const DELETED_ASSETS_KEY = "river-lantern-deleted-assets-v1";
const SOUND_SETTINGS_KEY = "river-lantern-sound-settings-v1";
const SOUND_DEFAULTS_VERSION_KEY = "river-lantern-sound-defaults-v3";
const SOUND_DB_NAME = "river-lantern-audio";
const SOUND_DB_STORE = "files";
const ASSET_DB_NAME = "river-lantern-assets";
const ASSET_DB_STORE = "sprites";
const LEVEL_DEFAULTS_VERSION_KEY = "river-lantern-level-defaults-v15";
const LEVEL_DEFAULTS_VERSION = "15";
const REMOVED_BUILT_IN_ASSETS = new Set(["stoneBlock", "crateBlock", "mossPlatform", "rickshaw", "tinHouse", "bridge", "lanternItem", "cashBundle", "coinPile", "coinNote", "thatchHouse"]);
const DOUBLE_TAP_JUMP_WINDOW = 0.28;
const LEVEL_CLEAR_DELAY = 1.35;
const COLLECTIBLE_VARIANTS = [
  "crystal",
];
const CONTEXTUAL_COLLECTIBLE_COUNT = 1;
const CRYSTAL_FLOAT_GAP = 76;
const TREE_PROP_IDS = ["palmTall", "palmGroup", "bananaWide", "bananaFruit", "bananaGroup", "bambooA", "bambooB", "bambooGroup"];
const GHOST_SPAWN = {
  minDelay: 6.5,
  maxDelay: 11.5,
  maxAmbient: 2,
  maxNearby: 2,
  minDistance: 390,
  maxDistance: 880,
  minSpacing: 270,
  despawnDistance: 1320,
};

const soundDefinitions = {
  music: {
    label: "Background music",
    path: "assets/sound/background_music.mp3",
    volume: 0.14,
    speed: 1,
    loop: true,
  },
  ambient: {
    label: "Ambient crickets",
    path: "assets/sound/ambient_white_noise_crickets.mp3",
    volume: 0.01,
    speed: 0.5,
    loop: true,
    seamless: true,
    fade: 0.18,
  },
  walking: {
    label: "Walking",
    path: "assets/sound/walking_sound.mp3",
    volume: 0.32,
    speed: 1,
    loop: true,
  },
  boat: {
    label: "Boat water",
    path: "assets/sound/boat_water_sound.mp3",
    volume: 0.38,
    speed: 1,
    loop: true,
    seamless: true,
    fade: 0.32,
  },
  collectible: {
    label: "Collectible",
    path: "assets/sound/collectible_sound.mp3",
    volume: 0.52,
    speed: 1,
    loop: false,
  },
  ghostDestroy: {
    label: "Ghost destroy",
    path: "assets/sound/ghost_destroy_sound.mp3",
    volume: 0.58,
    speed: 1,
    loop: false,
  },
};

const soundSettings = {};
const soundRuntime = {};
let audioUnlocked = false;
let audioReady = false;
let audioDbPromise = null;
let assetDbPromise = null;
let audioContext = null;
let autosaveTimer = 0;

const player = {
  x: 120,
  y: GROUND_Y,
  vx: 0,
  vy: 0,
  facing: 1,
  hp: 3,
  score: 0,
  onGround: true,
  onBoat: false,
  invuln: 0,
  attack: 0,
  checkpoint: 120,
  lastJumpTap: -1,
  jumpBoosted: false,
  boatIndex: -1,
};

const boat = {
  id: "boat",
  x: WATER.x + 28,
  y: WATER_Y + 18,
  vx: 0,
  minX: WATER.x - 8,
  maxX: WATER.x + 360,
  spawnX: WATER.x + 28,
};

let boats = [
  boat,
  { id: "boat", x: WATER.x + 470, y: WATER_Y + 18, vx: 0, minX: WATER.x + 420, maxX: WATER.x + 780, spawnX: WATER.x + 470 },
];

const ghost = {
  id: "ghost",
  x: 740,
  y: GROUND_Y - 48,
  vx: 42,
  alive: true,
  gone: 0,
  minX: 610,
  maxX: 1020,
  spawnX: 740,
};

let ghosts = [
  ghost,
  { id: "ghost", x: 2140, y: GROUND_Y - 48, vx: -36, alive: true, gone: 0, minX: 1900, maxX: 2370, spawnX: 2140 },
  { id: "ghost", x: 3620, y: GROUND_Y - 54, vx: 46, alive: true, gone: 0, minX: 3370, maxX: 3910, spawnX: 3620 },
];
let ambientGhosts = [];
let ghostSpawnTimer = randomGhostDelay();

const defaultCollectiblePositions = [
  [310, 366], [440, 332], [572, 294], [720, 356], [860, 320], [1010, 366],
  [1280, 318], [1430, 354], [1685, 326], [1885, 286], [2075, 342], [2290, 292],
  [2520, 350], [2745, 318], [2970, 282], [3185, 348], [3460, 306], [3700, 354],
  [3955, 294], [4230, 350], [4540, 316], [4875, 338], [5210, 304],
];
let collectibles = [];

const crop = {
  bgScene: { x: 17, y: 15, w: 850, h: 512 },
  moon: { x: 1792, y: 18, w: 126, h: 126 },
  trees: [
    { x: 890, y: 35, w: 108, h: 126 },
    { x: 1000, y: 38, w: 116, h: 116 },
    { x: 1112, y: 40, w: 105, h: 126 },
  ],
  grass: [
    { x: 900, y: 475, w: 92, h: 42 },
    { x: 1015, y: 458, w: 120, h: 54 },
    { x: 1136, y: 455, w: 108, h: 58 },
  ],
  heroRun: [
    { x: 700, y: 392, w: 124, h: 174, ox: 13, oy: 3 },
    { x: 825, y: 392, w: 130, h: 174, ox: 10, oy: 3 },
    { x: 1003, y: 392, w: 121, h: 174, ox: 15, oy: 3 },
    { x: 1129, y: 392, w: 110, h: 174, ox: 20, oy: 3 },
  ],
  heroIdle: { x: 130, y: 388, w: 106, h: 180, ox: 22, oy: 0 },
  ghostMove: [
    { x: 25, y: 472, w: 264, h: 286 },
    { x: 303, y: 472, w: 274, h: 286 },
    { x: 591, y: 472, w: 271, h: 286 },
    { x: 876, y: 472, w: 267, h: 286 },
    { x: 1157, y: 472, w: 256, h: 286 },
    { x: 1438, y: 472, w: 246, h: 286 },
    { x: 1703, y: 472, w: 255, h: 286 },
  ],
  ghostIdle: { x: 30, y: 70, w: 266, h: 320 },
  boat: { x: 1894, y: 80, w: 820, h: 270 },
  coveredBoat: { x: 70, y: 64, w: 715, h: 250 },
  lampBoat: { x: 22, y: 515, w: 430, h: 280 },
  woodPlatform: { x: 1285, y: 94, w: 120, h: 56 },
  village: {
    mudHouse: { x: 1510, y: 145, w: 530, h: 335 },
    metalHouse: { x: 2100, y: 44, w: 610, h: 435 },
    palmTall: { x: 32, y: 548, w: 330, h: 430 },
    bananaWide: { x: 410, y: 600, w: 360, h: 395 },
    bananaFruit: { x: 990, y: 604, w: 320, h: 380 },
    bambooA: { x: 1565, y: 628, w: 330, h: 370 },
    bambooB: { x: 1890, y: 640, w: 330, h: 355 },
    reeds: { x: 2205, y: 700, w: 575, h: 340 },
  },
  transport: {
    canoe: { x: 24, y: 520, w: 430, h: 275 },
    auto: { x: 870, y: 470, w: 350, h: 310 },
    bus: { x: 1245, y: 430, w: 560, h: 395 },
    thatchHouse: { x: 850, y: 1015, w: 385, h: 350 },
    palmGroup: { x: 0, y: 1400, w: 330, h: 438 },
    bananaGroup: { x: 455, y: 1415, w: 390, h: 410 },
    bambooGroup: { x: 835, y: 1420, w: 300, h: 415 },
    powerPoles: { x: 1260, y: 1510, w: 365, h: 270 },
  },
  items: {
    lanternItem: { x: 18, y: 18, w: 158, h: 190 },
    cashBundle: { x: 282, y: 34, w: 238, h: 142 },
    boatLetter: { x: 650, y: 36, w: 178, h: 118 },
    coinPile: { x: 944, y: 34, w: 178, h: 124 },
    coinNote: { x: 36, y: 292, w: 146, h: 110 },
    materialStack: { x: 270, y: 250, w: 238, h: 136 },
    landDeed: { x: 640, y: 244, w: 228, h: 176 },
    crystal: { x: 936, y: 238, w: 175, h: 178 },
    toolboxItem: { x: 16, y: 510, w: 190, h: 156 },
    mangoBasket: { x: 304, y: 500, w: 238, h: 160 },
    fishStack: { x: 632, y: 500, w: 252, h: 154 },
    spiceBag: { x: 972, y: 504, w: 142, h: 156 },
    ropeCoil: { x: 36, y: 748, w: 178, h: 106 },
    clayPots: { x: 314, y: 698, w: 196, h: 198 },
    wrenchTool: { x: 666, y: 754, w: 176, h: 92 },
    oilCan: { x: 968, y: 746, w: 136, h: 142 },
  },
};

let farBackgroundProps = [
  { id: "palmTall", x: 140, y: 230, w: 116, h: 152, p: 0.12, a: 0.3 },
  { id: "mudHouse", x: 360, y: 304, w: 132, h: 84, p: 0.18, a: 0.44 },
  { id: "bananaWide", x: 620, y: 250, w: 132, h: 136, p: 0.14, a: 0.34 },
  { id: "bambooB", x: 920, y: 262, w: 92, h: 128, p: 0.18, a: 0.38 },
  { id: "reeds", x: 1180, y: 304, w: 168, h: 92, p: 0.22, a: 0.34 },
  { id: "metalHouse", x: 1510, y: 292, w: 150, h: 98, p: 0.2, a: 0.42 },
  { id: "palmTall", x: 1810, y: 236, w: 116, h: 154, p: 0.16, a: 0.34 },
  { id: "bananaFruit", x: 2410, y: 254, w: 112, h: 142, p: 0.15, a: 0.36 },
  { id: "bambooA", x: 2760, y: 262, w: 96, h: 132, p: 0.18, a: 0.36 },
  { id: "mudHouse", x: 3100, y: 306, w: 128, h: 82, p: 0.2, a: 0.42 },
  { id: "reeds", x: 3440, y: 306, w: 170, h: 94, p: 0.22, a: 0.34 },
  { id: "metalHouse", x: 3830, y: 286, w: 160, h: 106, p: 0.18, a: 0.42 },
  { id: "palmTall", x: 4210, y: 228, w: 124, h: 162, p: 0.14, a: 0.32 },
  { id: "bananaWide", x: 4560, y: 252, w: 136, h: 138, p: 0.16, a: 0.36 },
  { id: "bambooB", x: 5010, y: 260, w: 100, h: 136, p: 0.19, a: 0.38 },
];

let worldProps = [
  { id: "palmTall", x: 70, y: 258, w: 136, h: 176, a: 0.88 },
  { id: "bananaFruit", x: 340, y: 282, w: 120, h: 150, a: 0.86 },
  { id: "reeds", x: 670, y: 332, w: 176, h: 104, a: 0.82 },
  { id: "bambooA", x: 1040, y: 292, w: 100, h: 140, a: 0.84 },
  { id: "mudHouse", x: 1280, y: 322, w: 174, h: 110, a: 0.88 },
  { id: "bananaWide", x: 2350, y: 288, w: 138, h: 144, a: 0.84 },
  { id: "bambooB", x: 2640, y: 298, w: 100, h: 136, a: 0.84 },
  { id: "metalHouse", x: 2960, y: 310, w: 184, h: 122, a: 0.88 },
  { id: "reeds", x: 3320, y: 328, w: 176, h: 104, a: 0.84 },
  { id: "bananaFruit", x: 3710, y: 286, w: 120, h: 150, a: 0.86 },
  { id: "palmTall", x: 4470, y: 258, w: 136, h: 176, a: 0.86 },
  { id: "bambooA", x: 4860, y: 292, w: 100, h: 140, a: 0.84 },
  { id: "reeds", x: 5230, y: 328, w: 176, h: 104, a: 0.82 },
];

let platforms = [
  { id: "woodPlatform", x: 390, y: 374, w: 126, h: 46, a: 0.96 },
  { id: "woodPlatform", x: 560, y: 334, w: 126, h: 46, a: 0.96 },
  { id: "woodPlatform", x: 910, y: 350, w: 132, h: 46, a: 0.96 },
  { id: "woodPlatform", x: 1220, y: 366, w: 132, h: 46, a: 0.96 },
  { id: "woodPlatform", x: 1740, y: 340, w: 132, h: 46, a: 0.96 },
  { id: "woodPlatform", x: 2060, y: 310, w: 132, h: 46, a: 0.96 },
  { id: "woodPlatform", x: 2465, y: 360, w: 132, h: 46, a: 0.96 },
  { id: "woodPlatform", x: 2890, y: 318, w: 132, h: 46, a: 0.96 },
  { id: "woodPlatform", x: 3340, y: 354, w: 132, h: 46, a: 0.96 },
  { id: "woodPlatform", x: 3860, y: 318, w: 132, h: 46, a: 0.96 },
  { id: "woodPlatform", x: 4340, y: 350, w: 132, h: 46, a: 0.96 },
  { id: "woodPlatform", x: 4830, y: 322, w: 132, h: 46, a: 0.96 },
  { id: "woodPlatform", x: 5170, y: 360, w: 132, h: 46, a: 0.96 },
];

let assetCatalog = {
  foreground: [],
  background: [],
  platform: [],
  collectible: [],
  enemy: [],
  traversal: [],
};

const defaultSizes = {
  palmTall: { w: 136, h: 176 },
  bananaWide: { w: 138, h: 144 },
  bananaFruit: { w: 120, h: 150 },
  bambooA: { w: 100, h: 140 },
  bambooB: { w: 100, h: 136 },
  reeds: { w: 176, h: 104 },
  mudHouse: { w: 174, h: 110 },
  metalHouse: { w: 190, h: 126 },
  auto: { w: 128, h: 98 },
  bus: { w: 172, h: 112 },
  coveredBoat: { w: 158, h: 58 },
  lampBoat: { w: 150, h: 74 },
  powerPoles: { w: 180, h: 98 },
  woodPlatform: { w: 120, h: 46 },
  crystal: { w: 38, h: 44 },
  lanternItem: { w: 42, h: 54 },
  cashBundle: { w: 52, h: 34 },
  boatLetter: { w: 46, h: 30 },
  coinPile: { w: 46, h: 32 },
  coinNote: { w: 44, h: 32 },
  materialStack: { w: 56, h: 36 },
  landDeed: { w: 48, h: 42 },
  toolboxItem: { w: 50, h: 42 },
  mangoBasket: { w: 50, h: 38 },
  fishStack: { w: 54, h: 34 },
  spiceBag: { w: 42, h: 42 },
  ropeCoil: { w: 48, h: 28 },
  clayPots: { w: 46, h: 48 },
  wrenchTool: { w: 50, h: 24 },
  oilCan: { w: 34, h: 42 },
  ghost: { w: 144, h: 144 },
  boat: { w: 258, h: 86 },
};

collectibles = makeLevelCollectibles(defaultCollectiblePositions, {
  worldWidth: WORLD_W,
  foreground: worldProps,
  background: farBackgroundProps,
  platforms,
  water: WATER,
});

const sheetSources = {
  world: "River world",
  hero: "Hero sheet",
  ghost: "Ghost sheet",
  boat: "Boat sheet",
  items: "Item sheet",
  village: "Village props",
  transport: "Transport props",
};

const assetDefinitions = {};
let deletedAssetIds = loadDeletedAssetIds();

defineAsset("palmTall", "village", crop.village.palmTall, ["foreground", "background"], 12);
defineAsset("bananaWide", "village", crop.village.bananaWide, ["foreground", "background"], 12);
defineAsset("bananaFruit", "village", crop.village.bananaFruit, ["foreground", "background"], 12);
defineAsset("bambooA", "village", crop.village.bambooA, ["foreground", "background"], 12);
defineAsset("bambooB", "village", crop.village.bambooB, ["foreground", "background"], 12);
defineAsset("reeds", "village", crop.village.reeds, ["foreground", "background"], 12);
defineAsset("mudHouse", "village", crop.village.mudHouse, ["foreground", "background"], 12);
defineAsset("metalHouse", "village", crop.village.metalHouse, ["foreground", "background"], 12);
defineAsset("auto", "transport", crop.transport.auto, ["foreground"], 10);
defineAsset("bus", "transport", crop.transport.bus, ["foreground"], 10);
defineAsset("coveredBoat", "boat", crop.coveredBoat, ["foreground", "background"], 10);
defineAsset("lampBoat", "transport", crop.transport.canoe, ["foreground", "background"], 10);
defineAsset("powerPoles", "transport", crop.transport.powerPoles, ["foreground"], 10);
defineAsset("woodPlatform", "world", crop.woodPlatform, ["platform", "foreground"], 10);
defineAsset("crystal", "items", crop.items.crystal, ["collectible"], 30);
defineAsset("cashBundle", "items", crop.items.cashBundle, ["collectible"], 18);
defineAsset("boatLetter", "items", crop.items.boatLetter, ["collectible"], 18);
defineAsset("coinPile", "items", crop.items.coinPile, ["collectible"], 18);
defineAsset("coinNote", "items", crop.items.coinNote, ["collectible"], 18);
defineAsset("materialStack", "items", crop.items.materialStack, ["collectible"], 18);
defineAsset("landDeed", "items", crop.items.landDeed, ["collectible"], 18);
defineAsset("toolboxItem", "items", crop.items.toolboxItem, ["collectible"], 18);
defineAsset("mangoBasket", "items", crop.items.mangoBasket, ["collectible"], 18);
defineAsset("fishStack", "items", crop.items.fishStack, ["collectible"], 18);
defineAsset("spiceBag", "items", crop.items.spiceBag, ["collectible"], 18);
defineAsset("ropeCoil", "items", crop.items.ropeCoil, ["collectible"], 18);
defineAsset("clayPots", "items", crop.items.clayPots, ["collectible"], 18);
defineAsset("wrenchTool", "items", crop.items.wrenchTool, ["collectible"], 18);
defineAsset("oilCan", "items", crop.items.oilCan, ["collectible"], 18);
defineAsset("ghost", "ghost", crop.ghostIdle, ["enemy"], 24);
defineAsset("boat", "boat", crop.boat, ["traversal"], 4);

const builtInAssetDefinitions = cloneLevel(assetDefinitions);
rebuildAssetCatalog();

const defaultLevel = captureLevel();
const builtInLevels = createBuiltInLevels();

function defineAsset(id, source, rect, types, tolerance = 12, customData = null) {
  if (deletedAssetIds.has(id)) return;
  const size = defaultSizes[id] || { w: Math.round(rect.w * 0.35), h: Math.round(rect.h * 0.35) };
  assetDefinitions[id] = {
    id,
    source,
    crop: { x: rect.x, y: rect.y, w: rect.w, h: rect.h },
    tolerance,
    types: [...types],
    defaultW: size.w,
    defaultH: size.h,
    customData,
    customKey: null,
    customName: null,
  };
}

function rebuildAssetCatalog() {
  assetCatalog = { foreground: [], background: [], platform: [], collectible: [], enemy: [], traversal: [] };
  for (const definition of Object.values(assetDefinitions)) {
    if (REMOVED_BUILT_IN_ASSETS.has(definition.id)) continue;
    for (const type of definition.types || []) {
      if (!assetCatalog[type]) assetCatalog[type] = [];
      if (!assetCatalog[type].includes(definition.id)) assetCatalog[type].push(definition.id);
    }
  }
  for (const ids of Object.values(assetCatalog)) ids.sort((a, b) => a.localeCompare(b));
}

function normalizeAssetDefinition(definition) {
  const id = sanitizeAssetId(definition.id || "asset");
  const cropRect = definition.crop || definition;
  const fallback = defaultSizes[id] || { w: 96, h: 96 };
  const tolerance = Number(definition.tolerance);
  return {
    id,
    source: definition.source || "items",
    crop: {
      x: Math.max(0, Number(cropRect.x) || 0),
      y: Math.max(0, Number(cropRect.y) || 0),
      w: Math.max(1, Number(cropRect.w) || 96),
      h: Math.max(1, Number(cropRect.h) || 96),
    },
    tolerance: clamp(Number.isFinite(tolerance) ? tolerance : 12, 0, 80),
    types: Array.isArray(definition.types) && definition.types.length ? [...definition.types] : ["foreground"],
    defaultW: Math.max(8, Number(definition.defaultW) || fallback.w),
    defaultH: Math.max(8, Number(definition.defaultH) || fallback.h),
    customData: definition.customData || null,
    customKey: definition.customKey || null,
    customName: definition.customName || null,
  };
}

function serializeAssetDefinitions() {
  const definitions = Object.values(assetDefinitions)
    .filter((definition) => !REMOVED_BUILT_IN_ASSETS.has(definition.id))
    .map((definition) => ({
      id: definition.id,
      source: definition.source,
      crop: { ...definition.crop },
      tolerance: definition.tolerance,
      types: [...definition.types],
      defaultW: definition.defaultW,
      defaultH: definition.defaultH,
      customData: definition.customData || null,
      customKey: definition.customKey || null,
      customName: definition.customName || null,
    }));
  return {
    definitions,
    deleted: [...deletedAssetIds].filter((id) => !REMOVED_BUILT_IN_ASSETS.has(id)).sort((a, b) => a.localeCompare(b)),
  };
}

async function applyAssetDefinitions(definitions) {
  if (!definitions) return;
  const incomingDefinitions = Array.isArray(definitions) ? definitions : Array.isArray(definitions.definitions) ? definitions.definitions : [];
  const levelDeleted = Array.isArray(definitions.deleted) ? definitions.deleted.map(sanitizeAssetId) : [];
  deletedAssetIds = new Set([...loadDeletedAssetIds(), ...levelDeleted]);
  for (const key of Object.keys(assetDefinitions)) delete assetDefinitions[key];
  for (const definition of Object.values(builtInAssetDefinitions)) {
    if (deletedAssetIds.has(definition.id)) continue;
    assetDefinitions[definition.id] = cloneLevel(definition);
  }
  for (const definition of incomingDefinitions) {
    const normalized = normalizeAssetDefinition(definition);
    if (REMOVED_BUILT_IN_ASSETS.has(normalized.id)) continue;
    if (deletedAssetIds.has(normalized.id)) continue;
    assetDefinitions[normalized.id] = normalized;
  }
  for (const definition of Object.values(assetDefinitions)) {
    defaultSizes[definition.id] = { w: definition.defaultW, h: definition.defaultH };
  }
  rebuildAssetCatalog();
  await rebuildAssetSprites();
}

async function rebuildAssetSprites() {
  if (!sprites) return;
  sprites.props = {};
  for (const definition of Object.values(assetDefinitions)) {
    await rebuildSingleAssetSprite(definition.id);
  }
  sprites.crystal = sprites.props.crystal || sprites.crystal;
}

async function rebuildSingleAssetSprite(id) {
  const definition = assetDefinitions[id];
  if (!definition || !sprites) return;
  const image = await imageForAsset(definition);
  if (!image) return;
  sprites.props[id] = cutSprite(image, definition.crop, definition.tolerance);
  if (id === "crystal") sprites.crystal = sprites.props[id];
}

async function imageForAsset(definition) {
  if (definition.customKey) {
    const key = "assetblob:" + definition.customKey;
    if (!images[key]) {
      const blob = await readAssetBlob(definition.customKey);
      if (blob) {
        const url = URL.createObjectURL(blob);
        customImageObjectUrls[key] = url;
        images[key] = await loadImage(url);
      }
    }
    if (images[key]) return images[key];
  }
  if (definition.customData) {
    const key = "custom:" + definition.id;
    if (!images[key] || images[key].src !== definition.customData) {
      images[key] = await loadImage(definition.customData);
    }
    return images[key];
  }
  if (String(definition.source || "").startsWith("custom:")) return null;
  return images[definition.source];
}

function clearCustomAssetCache(key) {
  const cacheKey = "assetblob:" + key;
  if (customImageObjectUrls[cacheKey]) {
    URL.revokeObjectURL(customImageObjectUrls[cacheKey]);
    delete customImageObjectUrls[cacheKey];
  }
  delete images[cacheKey];
  delete images["custom:" + key];
}

function sanitizeAssetId(value) {
  const clean = String(value || "")
    .trim()
    .replace(/[^a-zA-Z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return clean || "asset";
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = src;
  });
}

function cutSprite(image, rect, tolerance = 24) {
  const offscreen = document.createElement("canvas");
  offscreen.width = rect.w;
  offscreen.height = rect.h;
  const octx = offscreen.getContext("2d", { willReadFrequently: true });
  octx.drawImage(image, rect.x, rect.y, rect.w, rect.h, 0, 0, rect.w, rect.h);
  const frame = octx.getImageData(0, 0, rect.w, rect.h);
  const data = frame.data;
  const samples = edgeSamples(data, rect.w, rect.h);
  const visited = new Uint8Array(rect.w * rect.h);
  const queue = new Int32Array(rect.w * rect.h);
  let head = 0;
  let tail = 0;

  const push = (x, y) => {
    if (x < 0 || y < 0 || x >= rect.w || y >= rect.h) return;
    const p = y * rect.w + x;
    if (visited[p] || !matchesBackground(data, p * 4, samples, tolerance)) return;
    visited[p] = 1;
    queue[tail++] = p;
  };

  for (let x = 0; x < rect.w; x++) {
    push(x, 0);
    push(x, rect.h - 1);
  }
  for (let y = 0; y < rect.h; y++) {
    push(0, y);
    push(rect.w - 1, y);
  }

  while (head < tail) {
    const p = queue[head++];
    const x = p % rect.w;
    const y = Math.floor(p / rect.w);
    data[p * 4 + 3] = 0;
    push(x + 1, y);
    push(x - 1, y);
    push(x, y + 1);
    push(x, y - 1);
  }

  octx.putImageData(frame, 0, 0);
  return offscreen;
}

function copySprite(image, rect) {
  const offscreen = document.createElement("canvas");
  offscreen.width = rect.w;
  offscreen.height = rect.h;
  const octx = offscreen.getContext("2d");
  octx.imageSmoothingEnabled = true;
  octx.imageSmoothingQuality = "high";
  octx.drawImage(image, rect.x, rect.y, rect.w, rect.h, 0, 0, rect.w, rect.h);
  return offscreen;
}

function makeHeroFrame(rect) {
  const source = cutSprite(images.hero, rect, 5);
  const frame = document.createElement("canvas");
  frame.width = HERO_FRAME.w;
  frame.height = HERO_FRAME.h;
  const fctx = frame.getContext("2d");
  fctx.imageSmoothingEnabled = true;
  fctx.imageSmoothingQuality = "high";
  fctx.drawImage(source, rect.ox ?? 0, rect.oy ?? 0);
  return frame;
}

function edgeSamples(data, width, height) {
  const samples = [];
  const step = Math.max(24, Math.floor(Math.min(width, height) / 4));
  for (let x = 0; x < width; x += step) {
    samples.push(colorAt(data, width, x, 0));
    samples.push(colorAt(data, width, x, height - 1));
  }
  for (let y = 0; y < height; y += step) {
    samples.push(colorAt(data, width, 0, y));
    samples.push(colorAt(data, width, width - 1, y));
  }
  samples.push(colorAt(data, width, width - 1, height - 1));
  return samples;
}

function matchesBackground(data, i, samples, tolerance) {
  const limit = tolerance * tolerance;
  const r = data[i];
  const g = data[i + 1];
  const b = data[i + 2];
  for (const sample of samples) {
    const dr = r - sample[0];
    const dg = g - sample[1];
    const db = b - sample[2];
    if (dr * dr + dg * dg + db * db <= limit) return true;
  }
  return false;
}

function colorAt(data, width, x, y) {
  const i = (Math.max(0, y) * width + Math.max(0, x)) * 4;
  return [data[i], data[i + 1], data[i + 2]];
}

async function initSprites() {
  sprites = {
    moon: cutSprite(images.world, crop.moon, 18),
    trees: crop.trees.map((rect) => cutSprite(images.world, rect, 18)),
    grass: crop.grass.map((rect) => cutSprite(images.world, rect, 20)),
    heroRun: crop.heroRun.map(makeHeroFrame),
    heroIdle: makeHeroFrame(crop.heroIdle),
    ghostMove: crop.ghostMove.map((rect) => cutSprite(images.ghost, rect, 24)),
    ghostIdle: cutSprite(images.ghost, crop.ghostIdle, 24),
    boat: cutSprite(images.boat, crop.boat, 4),
    props: {},
    crystal: cutSprite(images.items, crop.items.crystal, 30),
  };
  await rebuildAssetSprites();
}

async function initAudioSystem() {
  loadSoundSettings();
  await rebuildSoundRuntime();
  renderSoundEditor();
  audioReady = true;
  if (audioUnlocked) startPersistentAudio();
}

function loadSoundSettings() {
  const stored = safeParseJson(localStorage.getItem(SOUND_SETTINGS_KEY), {});
  const resetAmbientDefaults = localStorage.getItem(SOUND_DEFAULTS_VERSION_KEY) !== "3";
  for (const [id, definition] of Object.entries(soundDefinitions)) {
    const saved = stored[id] || {};
    soundSettings[id] = {
      volume: clamp(Number(saved.volume ?? definition.volume), 0, 1),
      speed: clamp(Number(saved.speed ?? definition.speed ?? 1), 0.5, 1.75),
      custom: Boolean(saved.custom),
      name: saved.name || defaultSoundFileName(definition.path),
    };
    if (id === "ambient" && resetAmbientDefaults) {
      soundSettings[id].volume = definition.volume;
      soundSettings[id].speed = definition.speed;
    }
  }
  if (resetAmbientDefaults) {
    localStorage.setItem(SOUND_DEFAULTS_VERSION_KEY, "3");
    saveSoundSettings();
  }
}

function serializeSoundSettings() {
  const settings = {};
  for (const id of Object.keys(soundDefinitions)) {
    settings[id] = {
      volume: soundSettings[id]?.volume ?? soundDefinitions[id].volume,
      speed: soundSpeed(id),
      custom: Boolean(soundSettings[id]?.custom),
      name: soundSettings[id]?.name || defaultSoundFileName(soundDefinitions[id].path),
    };
  }
  return settings;
}

function saveSoundSettings() {
  localStorage.setItem(SOUND_SETTINGS_KEY, JSON.stringify(serializeSoundSettings()));
}

async function applySoundSettings(settings) {
  if (!settings || typeof settings !== "object") return;
  for (const id of Object.keys(soundDefinitions)) {
    if (!settings[id]) continue;
    soundSettings[id].volume = clamp(Number(settings[id].volume ?? soundSettings[id].volume), 0, 1);
    soundSettings[id].speed = clamp(Number(settings[id].speed ?? soundSettings[id].speed), 0.5, 1.75);
    soundSettings[id].custom = Boolean(settings[id].custom);
    soundSettings[id].name = settings[id].name || soundSettings[id].name;
  }
  saveSoundSettings();
  if (audioReady) {
    await rebuildSoundRuntime();
    renderSoundEditor();
  }
}

async function rebuildSoundRuntime(onlyId = null) {
  const ids = onlyId ? [onlyId] : Object.keys(soundDefinitions);
  for (const id of ids) {
    const old = soundRuntime[id];
    if (old?.loop) old.loop.stop();
    if (old?.audio) old.audio.pause();
    if (old?.objectUrl) URL.revokeObjectURL(old.objectUrl);

    const definition = soundDefinitions[id];
    const source = await soundSource(id);
    if (definition.seamless) {
      soundRuntime[id] = {
        src: source.src,
        objectUrl: source.objectUrl ? source.src : null,
        loop: null,
        loadingPromise: null,
        playing: false,
      };
      continue;
    }
    const audio = new Audio(source.src);
    audio.loop = definition.loop;
    audio.preload = "auto";
    audio.volume = soundSettings[id]?.volume ?? definition.volume;
    applyAudioSpeed(audio, id);
    soundRuntime[id] = { audio, objectUrl: source.objectUrl ? source.src : null };
  }

  if (audioUnlocked) {
    startPersistentAudio();
  }
}

async function soundSource(id) {
  const definition = soundDefinitions[id];
  if (soundSettings[id]?.custom) {
    const blob = await readSoundBlob(id);
    if (blob) {
      return { src: URL.createObjectURL(blob), objectUrl: true };
    }
    soundSettings[id].custom = false;
    soundSettings[id].name = defaultSoundFileName(definition.path);
    saveSoundSettings();
  }
  return { src: definition.path, objectUrl: false };
}

function unlockAudio() {
  if (audioUnlocked) return;
  audioUnlocked = true;
  ensureAudioContext()?.resume();
  startPersistentAudio();
}

function startPersistentAudio() {
  if (!audioReady) return;
  setLoopPlaying("music", true);
  setLoopPlaying("ambient", true);
}

function updateAudioState() {
  if (!audioReady) return;
  const walking = gameState === "playing" && !editor.active && !player.onBoat && player.onGround && Math.abs(player.vx) > 28;
  const boating = gameState === "playing" && !editor.active && player.onBoat;
  setLoopPlaying("walking", walking);
  setLoopPlaying("boat", boating);
}

function setLoopPlaying(id, shouldPlay) {
  const entry = soundRuntime[id];
  const definition = soundDefinitions[id];
  if (definition?.seamless) {
    setSeamlessLoopPlaying(id, shouldPlay);
    return;
  }
  if (!entry?.audio) return;
  entry.audio.volume = soundSettings[id]?.volume ?? soundDefinitions[id].volume;
  applyAudioSpeed(entry.audio, id);
  if (!audioUnlocked || !shouldPlay) {
    if (!entry.audio.paused) entry.audio.pause();
    if (!shouldPlay && id !== "music" && id !== "ambient") entry.audio.currentTime = 0;
    return;
  }
  if (entry.audio.paused) {
    entry.audio.play().catch(() => {
      audioUnlocked = false;
    });
  }
}

function setSeamlessLoopPlaying(id, shouldPlay) {
  const entry = soundRuntime[id];
  const definition = soundDefinitions[id];
  if (!entry) return;
  entry.playing = Boolean(shouldPlay && audioUnlocked);
  if (!entry.playing) {
    if (entry.loop) {
      entry.loop.stop();
      entry.loop = null;
    }
    return;
  }
  if (entry.loop) {
    entry.loop.setVolume(soundSettings[id]?.volume ?? definition.volume);
    entry.loop.setSpeed(soundSpeed(id));
    return;
  }
  if (entry.loadingPromise) return;
  entry.loadingPromise = createCrossfadedLoop(id)
    .then((loop) => {
      entry.loadingPromise = null;
      entry.loop = loop;
      entry.loop.setVolume(soundSettings[id]?.volume ?? definition.volume);
      entry.loop.setSpeed(soundSpeed(id));
      if (entry.playing && audioUnlocked) {
        entry.loop.start();
      } else {
        entry.loop.stop();
        entry.loop = null;
      }
    })
    .catch(() => {
      entry.loadingPromise = null;
      entry.playing = false;
      audioUnlocked = false;
    });
}

function ensureAudioContext() {
  if (!window.AudioContext && !window.webkitAudioContext) return null;
  if (!audioContext) {
    const Context = window.AudioContext || window.webkitAudioContext;
    audioContext = new Context();
  }
  return audioContext;
}

async function createCrossfadedLoop(id) {
  const definition = soundDefinitions[id];
  const entry = soundRuntime[id];
  const context = ensureAudioContext();
  if (!context) throw new Error("Web Audio is unavailable");
  const response = await fetch(entry.src);
  const bytes = await response.arrayBuffer();
  const buffer = await context.decodeAudioData(bytes.slice(0));
  const requestedFade = Number(definition.fade) || 0.2;
  const fade = clamp(requestedFade, 0.04, Math.max(0.04, buffer.duration / 3));
  return new CrossfadedLoop(context, buffer, fade, soundSpeed(id));
}

class CrossfadedLoop {
  constructor(context, buffer, fade, speed = 1) {
    this.context = context;
    this.buffer = buffer;
    this.fade = fade;
    this.speed = clamp(Number(speed) || 1, 0.5, 1.75);
    this.period = this.loopPeriod();
    this.master = context.createGain();
    this.master.gain.value = 0;
    this.master.connect(context.destination);
    this.sources = new Set();
    this.timer = 0;
    this.nextStart = 0;
    this.started = false;
  }

  setVolume(volume) {
    const now = this.context.currentTime;
    this.master.gain.cancelScheduledValues(now);
    this.master.gain.setTargetAtTime(clamp(volume, 0, 1), now, 0.03);
  }

  setSpeed(speed) {
    const nextSpeed = clamp(Number(speed) || 1, 0.5, 1.75);
    if (Math.abs(nextSpeed - this.speed) < 0.001) return;
    this.speed = nextSpeed;
    this.period = this.loopPeriod();
    if (this.started) this.nextStart = Math.min(this.nextStart, this.context.currentTime + this.period);
  }

  loopDuration() {
    return Math.max(0.05, this.buffer.duration / this.speed);
  }

  loopFade() {
    return Math.min(this.fade, this.loopDuration() / 3);
  }

  loopPeriod() {
    return Math.max(0.05, this.loopDuration() - this.loopFade());
  }

  start() {
    if (this.started) return;
    this.started = true;
    this.nextStart = this.context.currentTime + 0.03;
    this.scheduleAhead();
    this.timer = window.setInterval(() => this.scheduleAhead(), 180);
  }

  scheduleAhead() {
    if (!this.started) return;
    const horizon = this.context.currentTime + Math.max(1.2, this.period * 2.5);
    while (this.nextStart < horizon) {
      this.scheduleSource(this.nextStart);
      this.nextStart += this.period;
    }
  }

  scheduleSource(startAt) {
    const source = this.context.createBufferSource();
    const gain = this.context.createGain();
    source.buffer = this.buffer;
    source.playbackRate.setValueAtTime(this.speed, startAt);
    source.connect(gain);
    gain.connect(this.master);

    const duration = this.loopDuration();
    const fade = this.loopFade();
    const endAt = startAt + duration;
    const fullAt = startAt + fade;
    const fadeOutAt = Math.max(fullAt, endAt - fade);
    gain.gain.setValueAtTime(0, startAt);
    gain.gain.linearRampToValueAtTime(1, fullAt);
    gain.gain.setValueAtTime(1, fadeOutAt);
    gain.gain.linearRampToValueAtTime(0, endAt);

    source.start(startAt);
    source.stop(endAt + 0.02);
    this.sources.add(source);
    source.onended = () => {
      this.sources.delete(source);
      gain.disconnect();
    };
  }

  stop() {
    if (!this.started && !this.sources.size) return;
    this.started = false;
    window.clearInterval(this.timer);
    this.timer = 0;
    const now = this.context.currentTime;
    this.master.gain.cancelScheduledValues(now);
    this.master.gain.setTargetAtTime(0, now, 0.04);
    window.setTimeout(() => {
      for (const source of this.sources) {
        try {
          source.stop();
        } catch {
          // Source may already have stopped.
        }
      }
      this.sources.clear();
      this.master.disconnect();
    }, 90);
  }
}

function playOneShot(id) {
  if (!audioReady || !audioUnlocked) return;
  const entry = soundRuntime[id];
  if (!entry?.audio) return;
  const audio = entry.audio.cloneNode(true);
  audio.loop = false;
  audio.volume = soundSettings[id]?.volume ?? soundDefinitions[id].volume;
  applyAudioSpeed(audio, id);
  audio.play().catch(() => {
    audioUnlocked = false;
  });
}

function renderSoundEditor() {
  if (!editorEls.soundEditor) return;
  editorEls.soundEditor.innerHTML = "";
  for (const [id, definition] of Object.entries(soundDefinitions)) {
    const setting = soundSettings[id];
    const row = document.createElement("div");
    row.className = "sound-row";
    row.innerHTML = `
      <header>
        <span>${definition.label}</span>
        <span class="sound-file-name">${setting.custom ? setting.name : defaultSoundFileName(definition.path)}</span>
      </header>
      <div class="sound-control-row">
        <label>Volume <input data-sound-volume="${id}" type="range" min="0" max="1" step="0.01" value="${setting.volume}"></label>
        <span class="sound-value">${Math.round(setting.volume * 100)}%</span>
      </div>
      <div class="sound-control-row">
        <label>Speed <input data-sound-speed="${id}" type="range" min="0.5" max="1.75" step="0.01" value="${soundSpeed(id)}"></label>
        <span class="sound-value" data-sound-speed-value="${id}">${formatSpeed(soundSpeed(id))}</span>
      </div>
      <label>Replace <input data-sound-file="${id}" type="file" accept="audio/*"></label>
      <button data-sound-reset="${id}" type="button">Reset Sound</button>
    `;
    editorEls.soundEditor.appendChild(row);
  }

  editorEls.soundEditor.querySelectorAll("[data-sound-volume]").forEach((input) => {
    input.addEventListener("input", () => {
      const id = input.dataset.soundVolume;
      soundSettings[id].volume = clamp(Number(input.value) || 0, 0, 1);
      if (soundRuntime[id]?.audio) soundRuntime[id].audio.volume = soundSettings[id].volume;
      if (soundRuntime[id]?.loop) soundRuntime[id].loop.setVolume(soundSettings[id].volume);
      input.closest(".sound-control-row")?.querySelector(".sound-value")?.replaceChildren(`${Math.round(soundSettings[id].volume * 100)}%`);
      saveSoundSettings();
      scheduleAutosave();
    });
  });

  editorEls.soundEditor.querySelectorAll("[data-sound-speed]").forEach((input) => {
    input.addEventListener("input", () => {
      const id = input.dataset.soundSpeed;
      soundSettings[id].speed = clamp(Number(input.value) || 1, 0.5, 1.75);
      if (soundRuntime[id]?.audio) applyAudioSpeed(soundRuntime[id].audio, id);
      if (soundRuntime[id]?.loop) soundRuntime[id].loop.setSpeed(soundSettings[id].speed);
      const value = editorEls.soundEditor.querySelector(`[data-sound-speed-value="${id}"]`);
      if (value) value.textContent = formatSpeed(soundSettings[id].speed);
      saveSoundSettings();
      scheduleAutosave();
    });
  });

  editorEls.soundEditor.querySelectorAll("[data-sound-file]").forEach((input) => {
    input.addEventListener("change", async () => {
      const id = input.dataset.soundFile;
      const file = input.files?.[0];
      if (!file) return;
      await writeSoundBlob(id, file);
      soundSettings[id].custom = true;
      soundSettings[id].name = file.name;
      saveSoundSettings();
      await rebuildSoundRuntime(id);
      renderSoundEditor();
      scheduleAutosave(true);
      editorEls.status.textContent = `Editor mode: replaced ${soundDefinitions[id].label}`;
    });
  });

  editorEls.soundEditor.querySelectorAll("[data-sound-reset]").forEach((button) => {
    button.addEventListener("click", async () => {
      const id = button.dataset.soundReset;
      await deleteSoundBlob(id);
      soundSettings[id].custom = false;
      soundSettings[id].name = defaultSoundFileName(soundDefinitions[id].path);
      saveSoundSettings();
      await rebuildSoundRuntime(id);
      renderSoundEditor();
      scheduleAutosave(true);
      editorEls.status.textContent = `Editor mode: reset ${soundDefinitions[id].label}`;
    });
  });
}

function defaultSoundFileName(path) {
  return path.split("/").pop();
}

function soundSpeed(id) {
  return clamp(Number(soundSettings[id]?.speed ?? soundDefinitions[id]?.speed ?? 1), 0.5, 1.75);
}

function applyAudioSpeed(audio, id) {
  audio.playbackRate = soundSpeed(id);
  if ("preservesPitch" in audio) audio.preservesPitch = true;
  if ("mozPreservesPitch" in audio) audio.mozPreservesPitch = true;
  if ("webkitPreservesPitch" in audio) audio.webkitPreservesPitch = true;
}

function formatSpeed(value) {
  return `${Number(value).toFixed(2)}x`;
}

function openSoundDb() {
  if (audioDbPromise) return audioDbPromise;
  audioDbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(SOUND_DB_NAME, 1);
    request.onupgradeneeded = () => {
      request.result.createObjectStore(SOUND_DB_STORE);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  return audioDbPromise;
}

async function readSoundBlob(id) {
  try {
    const db = await openSoundDb();
    return await soundStoreRequest(db, "readonly", (store) => store.get(id));
  } catch {
    return null;
  }
}

async function writeSoundBlob(id, blob) {
  const db = await openSoundDb();
  await soundStoreRequest(db, "readwrite", (store) => store.put(blob, id));
}

async function deleteSoundBlob(id) {
  try {
    const db = await openSoundDb();
    await soundStoreRequest(db, "readwrite", (store) => store.delete(id));
  } catch {
    // Ignore reset failures; settings still fall back to default paths.
  }
}

function soundStoreRequest(db, mode, run) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(SOUND_DB_STORE, mode);
    const request = run(tx.objectStore(SOUND_DB_STORE));
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
    tx.onerror = () => reject(tx.error);
  });
}

function openAssetDb() {
  if (assetDbPromise) return assetDbPromise;
  assetDbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(ASSET_DB_NAME, 1);
    request.onupgradeneeded = () => {
      request.result.createObjectStore(ASSET_DB_STORE);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  return assetDbPromise;
}

async function readAssetBlob(id) {
  try {
    const db = await openAssetDb();
    return await assetStoreRequest(db, "readonly", (store) => store.get(id));
  } catch {
    return null;
  }
}

async function writeAssetBlob(id, blob) {
  const db = await openAssetDb();
  await assetStoreRequest(db, "readwrite", (store) => store.put(blob, id));
  clearCustomAssetCache(id);
}

async function deleteAssetBlob(id) {
  try {
    const db = await openAssetDb();
    await assetStoreRequest(db, "readwrite", (store) => store.delete(id));
    clearCustomAssetCache(id);
  } catch {
    // Ignore cleanup failures; the visible asset metadata is still updated.
  }
}

function assetStoreRequest(db, mode, run) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(ASSET_DB_STORE, mode);
    const request = run(tx.objectStore(ASSET_DB_STORE));
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
    tx.onerror = () => reject(tx.error);
  });
}

function start() {
  Promise.all(
    [
      ...Object.entries(imagePaths).map(([key, src]) =>
        loadImage(src).then((image) => {
          images[key] = image;
        }),
      ),
      document.fonts?.load('700 44px "Doto"').catch(() => null) || Promise.resolve(),
    ],
  )
    .then(async () => {
      await initSprites();
      await initAudioSystem();
      initEditor();
      initTouchControls();
      await loadStoredLevel();
      gameState = "playing";
      requestAnimationFrame(loop);
    })
    .catch(() => {
      gameState = "error";
      drawLoading("Could not load the reference sprite sheets.");
    });
}

function initTouchControls() {
  const buttons = Array.from(document.querySelectorAll("[data-touch-key]"));
  for (const button of buttons) {
    const code = button.dataset.touchKey;
    const press = (event) => {
      event.preventDefault();
      unlockAudio();
      if (!keys.has(code)) pressed.add(code);
      keys.add(code);
    };
    const release = (event) => {
      event.preventDefault();
      keys.delete(code);
    };
    button.addEventListener("pointerdown", press);
    button.addEventListener("pointerup", release);
    button.addEventListener("pointercancel", release);
    button.addEventListener("pointerleave", release);
  }
}

function loop(now) {
  const dt = Math.min(0.033, (now - lastTime) / 1000 || 0.016);
  lastTime = now;
  update(dt, now / 1000);
  updateAudioState();
  draw(now / 1000);
  pressed.clear();
  requestAnimationFrame(loop);
}

function update(dt, t) {
  if (gameState === "clear") {
    clearTimer -= dt;
    if (clearTimer <= 0 && !levelTransitionPending) advanceToNextLevel();
    return;
  }
  if (gameState !== "playing") return;
  if (editor.active) {
    updateEditorCamera(dt);
    return;
  }

  player.invuln = Math.max(0, player.invuln - dt);
  player.attack = Math.max(0, player.attack - dt);

  const left = keys.has("ArrowLeft") || keys.has("KeyA");
  const right = keys.has("ArrowRight") || keys.has("KeyD");
  const jump = pressed.has("Space") || pressed.has("ArrowUp") || pressed.has("KeyW");
  const jumpDoubleTap = jump && t - player.lastJumpTap <= DOUBLE_TAP_JUMP_WINDOW;
  const attack = pressed.has("KeyX") || pressed.has("Enter");

  if (jump) player.lastJumpTap = t;
  if (attack && player.attack <= 0) player.attack = 0.24;

  const waterRect = { x: WATER.x, y: WATER_Y, w: WATER.w, h: H - WATER_Y };
  const wasOnBoat = player.onBoat;
  const previousY = player.y;
  if (!player.onBoat) {
    const boardIndex = findBoardableBoat();
    if (boardIndex >= 0) boardBoat(boardIndex, t);
  } else if (!boats[player.boatIndex]) {
    player.onBoat = false;
    player.boatIndex = -1;
  }

  if (player.onBoat) {
    const currentBoat = boats[player.boatIndex] || boats[0];
    const steer = (right ? 1 : 0) - (left ? 1 : 0);
    const limits = boatMovementLimits(currentBoat);
    currentBoat.vx = steer * 136;
    currentBoat.x = clamp(currentBoat.x + currentBoat.vx * dt, limits.minX, limits.maxX);
    placePlayerOnBoat(currentBoat, t);
    player.vx = 0;
    player.vy = 0;
    player.onGround = true;
    if (!jump) player.jumpBoosted = false;
    if (jump) {
      player.onBoat = false;
      player.boatIndex = -1;
      player.vy = jumpDoubleTap ? -430 : -330;
      player.jumpBoosted = jumpDoubleTap;
      player.y -= 6;
    }
    if (isFinalBoatAtShore(currentBoat) && right) {
      player.onBoat = false;
      player.boatIndex = -1;
      player.x = WATER.x + WATER.w + 58;
      player.y = GROUND_Y;
      player.checkpoint = Math.max(player.checkpoint, player.x);
    }
  } else {
    const steer = (right ? 1 : 0) - (left ? 1 : 0);
    const speed = player.onGround ? 178 : 145;
    player.vx = approach(player.vx, steer * speed, (player.onGround ? 980 : 520) * dt);
    if (steer) player.facing = steer;
    if (jump && player.onGround) {
      player.vy = jumpDoubleTap ? -470 : -356;
      player.onGround = false;
      player.jumpBoosted = jumpDoubleTap;
    } else if (jump && jumpDoubleTap && !player.jumpBoosted && player.vy < 0) {
      player.vy = Math.min(player.vy - 130, -470);
      player.jumpBoosted = true;
    }
    player.vy += 860 * dt;
    player.x += player.vx * dt;
    player.y += player.vy * dt;
  }

  player.x = clamp(player.x, 40, WORLD_W - 70);
  const landedPlatform = !player.onBoat && resolvePlatformLanding(previousY);
  const landedBoatIndex = !player.onBoat ? findBoardableBoat() : -1;
  if (landedBoatIndex >= 0) boardBoat(landedBoatIndex, t);

  const overWater = pointInRect(player.x, Math.min(player.y, GROUND_Y + 24), waterRect);
  if (!player.onBoat && landedBoatIndex < 0 && !landedPlatform && !overWater && player.y >= GROUND_Y) {
    player.y = GROUND_Y;
    player.vy = 0;
    player.onGround = true;
    player.jumpBoosted = false;
  } else if (!player.onBoat && landedBoatIndex < 0 && !landedPlatform && overWater && player.y > WATER_Y + 26) {
    hurtPlayer(1);
    respawn();
  }

  if (wasOnBoat && !player.onBoat) player.checkpoint = Math.max(player.checkpoint, player.x - 60);

  updateGhosts(dt, t);
  updateCollectibles(t);

  if (player.x > WORLD_W - 185) {
    startLevelClear();
  }

  camera = clamp(player.x - 330, 0, WORLD_W - W);
}

function findBoardableBoat() {
  const pbox = playerBox();
  for (let i = boats.length - 1; i >= 0; i -= 1) {
    const currentBoat = boats[i];
    if (!currentBoat) continue;
    const deck = boatDeckRect(currentBoat);
    if (rectsOverlap(pbox, deck) && player.vy >= -95 && player.y <= currentBoat.y + 24) return i;
  }
  return -1;
}

function boardBoat(index, t) {
  const currentBoat = boats[index];
  if (!currentBoat) return;
  player.onBoat = true;
  player.boatIndex = index;
  player.vx = 0;
  player.vy = 0;
  player.onGround = true;
  player.jumpBoosted = false;
  placePlayerOnBoat(currentBoat, t);
  player.checkpoint = Math.max(player.checkpoint, player.x - 70);
}

function placePlayerOnBoat(currentBoat, t) {
  const size = defaultSizes[currentBoat.id || "boat"] || defaultSizes.boat;
  player.x = currentBoat.x + size.w * 0.49;
  player.y = currentBoat.y - 18 + Math.sin(t * 4.3 + currentBoat.x * 0.02) * 2;
}

function boatDeckRect(currentBoat) {
  const size = defaultSizes[currentBoat.id || "boat"] || defaultSizes.boat;
  return {
    x: currentBoat.x + size.w * 0.12,
    y: currentBoat.y - 24,
    w: size.w * 0.76,
    h: 34,
  };
}

function boatMovementLimits(currentBoat) {
  const size = defaultSizes[currentBoat.id || "boat"] || defaultSizes.boat;
  const waterMin = WATER.x - 8;
  const waterMax = WATER.x + WATER.w - size.w + 38;
  const minX = Number.isFinite(currentBoat.minX) ? currentBoat.minX : waterMin;
  const maxX = Number.isFinite(currentBoat.maxX) ? currentBoat.maxX : waterMax;
  return {
    minX: clamp(minX, waterMin, waterMax),
    maxX: clamp(Math.max(maxX, minX), waterMin, waterMax),
  };
}

function isFinalBoatAtShore(currentBoat) {
  const size = defaultSizes[currentBoat.id || "boat"] || defaultSizes.boat;
  const finalX = WATER.x + WATER.w - size.w + 34;
  return currentBoat.x >= finalX - 8 && (currentBoat.maxX ?? finalX) >= finalX - 8;
}

function shouldJumpToNextBoat() {
  const currentBoat = boats[player.boatIndex];
  if (!currentBoat || isFinalBoatAtShore(currentBoat)) return false;
  const limits = boatMovementLimits(currentBoat);
  return currentBoat.x >= limits.maxX - 12 && boats.some((nextBoat) => nextBoat.x > currentBoat.x + 150);
}

function resolvePlatformLanding(previousY) {
  if (player.vy < 0) return false;
  const footLeft = player.x - 18;
  const footRight = player.x + 18;
  let landing = null;
  for (const platform of platforms) {
    const overlapsX = footRight > platform.x + 8 && footLeft < platform.x + platform.w - 8;
    const crossesTop = previousY <= platform.y + 8 && player.y >= platform.y - 4;
    const closeEnough = player.y <= platform.y + Math.max(26, platform.h * 0.65);
    if (overlapsX && crossesTop && closeEnough && (!landing || platform.y < landing.y)) {
      landing = platform;
    }
  }
  if (!landing) return false;
  player.y = landing.y;
  player.vy = 0;
  player.onGround = true;
  player.jumpBoosted = false;
  return true;
}

function updateGhosts(dt, t) {
  updateGhostSpawns(dt);
  for (const ghost of ghosts) updateSingleGhost(ghost, dt, t);
  for (const ghost of ambientGhosts) updateSingleGhost(ghost, dt, t);
}

function updateSingleGhost(ghost, dt, t) {
  if (!Number.isFinite(ghost.baseY)) ghost.baseY = Number(ghost.y) || GROUND_Y - 48;
  if (!Number.isFinite(ghost.minX)) ghost.minX = ghost.x - 230;
  if (!Number.isFinite(ghost.maxX)) ghost.maxX = ghost.x + 230;
  if (!Number.isFinite(ghost.spawnX)) ghost.spawnX = ghost.x;
  if (!Number.isFinite(ghost.spawnVx)) ghost.spawnVx = ghost.vx || 42;
  if (Number.isFinite(ghost.appear) && ghost.appear < 1) ghost.appear = Math.min(1, ghost.appear + dt * 1.45);

  if (!ghost.alive) {
    ghost.gone += dt;
    return;
  }

  ghost.x += ghost.vx * dt;
  if (ghost.x < ghost.minX || ghost.x > ghost.maxX) {
    ghost.x = clamp(ghost.x, ghost.minX, ghost.maxX);
    ghost.vx *= -1;
  }
  ghost.y = ghost.baseY + Math.sin(t * 2.6 + ghost.spawnX * 0.01) * 18;

  const gbox = { x: ghost.x - 44, y: ghost.y - 108, w: 88, h: 100 };
  const pbox = playerBox();
  const closeAttack = player.attack > 0 && Math.abs(player.x - ghost.x) < 116 && Math.abs(player.y - ghost.y) < 135;
  const fullyArrived = !Number.isFinite(ghost.appear) || ghost.appear >= 0.58;

  if (fullyArrived && closeAttack) {
    ghost.alive = false;
    player.score += 250;
    playOneShot("ghostDestroy");
  } else if (fullyArrived && rectsOverlap(pbox, gbox) && player.invuln <= 0) {
    hurtPlayer(1);
    player.vx = player.x < ghost.x ? -220 : 220;
    player.vy = -190;
    player.onBoat = false;
  }
}

function updateGhostSpawns(dt) {
  ambientGhosts = ambientGhosts.filter((ghost) => {
    if (!ghost.alive) return ghost.gone < 0.74;
    return Math.abs(ghost.x - player.x) < GHOST_SPAWN.despawnDistance;
  });

  ghostSpawnTimer -= dt;
  if (ghostSpawnTimer > 0) return;
  ghostSpawnTimer = randomGhostDelay();

  const activeAmbient = ambientGhosts.filter((ghost) => ghost.alive).length;
  if (activeAmbient >= GHOST_SPAWN.maxAmbient) return;

  const nearbyGhosts = allGhosts().filter((ghost) => ghost.alive && Math.abs(ghost.x - player.x) < GHOST_SPAWN.maxDistance).length;
  if (nearbyGhosts >= GHOST_SPAWN.maxNearby) return;

  const spawned = makeAmbientGhost();
  if (spawned) ambientGhosts.push(spawned);
}

function makeAmbientGhost() {
  const facing = player.facing || 1;
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const preferredDirection = Math.random() < 0.64 ? facing : -facing;
    const direction = attempt % 2 ? -preferredDirection : preferredDirection;
    const distance = GHOST_SPAWN.minDistance + Math.random() * (GHOST_SPAWN.maxDistance - GHOST_SPAWN.minDistance);
    const x = clamp(player.x + direction * distance, 180, WORLD_W - 180);
    if (Math.abs(x - player.x) < GHOST_SPAWN.minDistance) continue;
    if (allGhosts().some((ghost) => ghost.alive && Math.abs(ghost.x - x) < GHOST_SPAWN.minSpacing)) continue;

    const baseY = GROUND_Y - 50 - Math.random() * 42;
    const patrol = 170 + Math.random() * 220;
    const vx = (Math.random() < 0.5 ? -1 : 1) * (30 + Math.random() * 38);
    return {
      id: "ghost",
      x,
      y: baseY,
      baseY,
      vx,
      alive: true,
      gone: 0,
      minX: clamp(x - patrol, 80, WORLD_W - 80),
      maxX: clamp(x + patrol, 80, WORLD_W - 80),
      spawnX: x,
      spawnVx: vx,
      appear: 0,
      ambient: true,
    };
  }
  return null;
}

function randomGhostDelay() {
  return GHOST_SPAWN.minDelay + Math.random() * (GHOST_SPAWN.maxDelay - GHOST_SPAWN.minDelay);
}

function resetGhostCadence() {
  ambientGhosts = [];
  ghostSpawnTimer = randomGhostDelay() * 0.65;
}

function allGhosts() {
  return [...ghosts, ...ambientGhosts];
}

function updateCollectibles(t) {
  for (const item of collectibles) {
    if (item.taken) continue;
    const box = collectibleRect(item, t);
    if (rectsOverlap(playerBox(), box)) {
      item.taken = true;
      player.score += 100;
      playOneShot("collectible");
    }
  }
}

function hurtPlayer(amount) {
  if (player.invuln > 0) return;
  player.hp -= amount;
  player.invuln = 1.15;
  if (player.hp <= 0) {
    player.hp = 3;
    player.score = Math.max(0, player.score - 150);
    for (const item of collectibles) item.taken = false;
    for (const ghost of ghosts) {
      ghost.alive = true;
      ghost.gone = 0;
      ghost.x = Number.isFinite(ghost.spawnX) ? ghost.spawnX : ghost.x;
      ghost.vx = Number.isFinite(ghost.spawnVx) ? ghost.spawnVx : ghost.vx || 42;
    }
    resetGhostCadence();
    resetBoats();
    respawn(120);
  }
}

function respawn(forcedX) {
  player.x = forcedX || player.checkpoint;
  player.y = GROUND_Y;
  player.vx = 0;
  player.vy = 0;
  player.onBoat = false;
  player.boatIndex = -1;
  player.onGround = true;
  player.jumpBoosted = false;
}

function resetBoats() {
  for (const currentBoat of boats) {
    currentBoat.x = Number.isFinite(currentBoat.spawnX) ? currentBoat.spawnX : currentBoat.x;
    currentBoat.vx = 0;
  }
}

function startLevelClear() {
  clearTimer = LEVEL_CLEAR_DELAY;
  levelTransitionPending = false;
  clearSubtitle = `Next level | Score ${player.score}`;
  gameState = "clear";
}

async function advanceToNextLevel() {
  if (levelTransitionPending) return;
  levelTransitionPending = true;
  const levels = readLevels();
  const nextName = nextLevelName(levels);
  const keptScore = player.score;
  try {
    editor.currentLevel = nextName;
    if (editorEls.levelSelect) editorEls.levelSelect.value = nextName;
    await applyLevel(cloneLevel(levels[nextName]));
    player.score = keptScore;
    resetPlayerForLevel();
    editorEls.levelName.value = nextName;
    editorEls.json.value = JSON.stringify(levels[nextName], null, 2);
    gameState = "playing";
    clearTimer = 0;
    clearSubtitle = "";
  } catch {
    gameState = "playing";
    clearSubtitle = "";
  } finally {
    levelTransitionPending = false;
  }
}

function resetPlayerForLevel() {
  player.x = 120;
  player.y = GROUND_Y;
  player.vx = 0;
  player.vy = 0;
  player.onBoat = false;
  player.boatIndex = -1;
  player.onGround = true;
  player.invuln = 0;
  player.attack = 0;
  player.checkpoint = 120;
  player.lastJumpTap = -1;
  player.jumpBoosted = false;
  resetGhostCadence();
  resetBoats();
  camera = 0;
}

function sortedLevelNames(levels) {
  return Object.keys(levels).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
}

function nextLevelName(levels) {
  const names = sortedLevelNames(levels);
  if (!names.length) return "Level 1";
  const currentIndex = Math.max(0, names.indexOf(editor.currentLevel));
  return names[(currentIndex + 1) % names.length];
}

function draw(t) {
  if (gameState === "loading" || gameState === "error") {
    drawLoading(gameState === "loading" ? "Loading reference sprites..." : "Sprite load error.");
    return;
  }

  ctx.clearRect(0, 0, W, H);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";

  drawBackground(t);
  drawWorld(t);
  drawCollectibles(t);
  drawGhosts(t);
  drawBoats(t);
  drawPlayer(t);
  drawHud();
  if (editor.active) drawEditorOverlay();

  if (gameState === "clear") {
    drawOverlay("LEVEL CLEAR", clearSubtitle || "Collected " + player.score + " points");
  }
}

function drawLoading(label) {
  ctx.fillStyle = "#050815";
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = "#efe5c7";
  ctx.font = "22px Consolas, monospace";
  ctx.textAlign = "center";
  ctx.fillText(label, W / 2, H / 2);
}

function drawBackground(t) {
  const sky = ctx.createLinearGradient(0, 0, 0, H);
  sky.addColorStop(0, "#080c1b");
  sky.addColorStop(0.45, "#0d1a2a");
  sky.addColorStop(1, "#061017");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, H);

  drawHorizonLayer(17, 0.05, 180, 18, "#070b18");
  drawHorizonLayer(81, 0.09, 228, 26, "#0b1422");
  drawHorizonLayer(133, 0.14, 292, 34, "#0c1c25");
  drawSprite(sprites.moon, 654 - camera * 0.035, 30, 96, 96);
  drawParallaxProps();
  drawMist(90 - camera * 0.1, 350, 260, t);
  drawMist(600 - camera * 0.08, 318, 310, t + 1.4);
  drawMist(1020 - camera * 0.12, 374, 340, t + 3.1);

  ctx.fillStyle = "rgba(4, 7, 15, 0.18)";
  ctx.fillRect(0, 0, W, H);
}

function drawWorld(t) {
  drawWater(WATER.x, WATER.w, t);
  drawGround(-80, WATER.x + 10);
  drawGround(WATER.x + WATER.w - 8, WORLD_W + 100);

  drawWorldSprite(sprites.grass[1], 255, 390, 110, 52);
  drawPlatforms();
  drawWorldProps();
  drawWorldSprite(sprites.grass[2], 2285, 392, 116, 56);
}

function drawGround(x, x2) {
  const sx = x - camera;
  const width = x2 - x;
  if (sx > W || sx + width < 0) return;

  ctx.fillStyle = "#2b3b2e";
  ctx.fillRect(sx, GROUND_Y - 18, width, 20);
  ctx.fillStyle = "#3a2c28";
  ctx.fillRect(sx, GROUND_Y, width, H - GROUND_Y);
  ctx.fillStyle = "#1c1719";
  ctx.fillRect(sx, GROUND_Y + 46, width, 30);

  ctx.fillStyle = "rgba(21, 29, 32, 0.55)";
  for (let px = Math.floor((sx + camera) / 88) * 88 - camera; px < sx + width; px += 88) {
    ctx.fillRect(px + 20, GROUND_Y + 22, 34, 10);
    ctx.fillRect(px + 58, GROUND_Y + 58, 24, 8);
  }
}

function drawWater(x, w, t) {
  const sx = x - camera;
  if (sx > W || sx + w < 0) return;

  const water = ctx.createLinearGradient(0, WATER_Y, 0, H);
  water.addColorStop(0, "#28546a");
  water.addColorStop(0.45, "#123040");
  water.addColorStop(1, "#07131d");
  ctx.fillStyle = water;
  ctx.fillRect(sx, WATER_Y, w, H - WATER_Y);

  ctx.fillStyle = "rgba(101, 178, 197, 0.36)";
  for (let i = 0; i < 12; i++) {
    const px = sx + ((i * 93 + t * 34) % (w + 130)) - 90;
    const py = WATER_Y + 16 + Math.sin(t * 2 + i) * 8;
    ctx.fillRect(px, py, 64, 3);
  }

  ctx.fillStyle = "rgba(4, 9, 17, 0.5)";
  ctx.fillRect(sx, H - 54, w, 54);
}

function drawBoats(t) {
  for (const currentBoat of boats) drawSingleBoat(currentBoat, t);
}

function drawSingleBoat(currentBoat, t) {
  const bx = currentBoat.x - camera;
  if (bx < -270 || bx > W + 60) return;
  const id = currentBoat.id || "boat";
  const size = defaultSizes[id] || defaultSizes.boat;
  const sprite = sprites.props[id] || sprites.boat;
  drawSprite(sprite, bx, currentBoat.y - size.h + 10 + Math.sin(t * 4.3 + currentBoat.x * 0.02) * 2, size.w, size.h);
}

function drawPlayer(t) {
  const moving = !player.onBoat && Math.abs(player.vx) > 18;
  const frame = moving
    ? sprites.heroRun[Math.floor(t * 6.5) % sprites.heroRun.length]
    : sprites.heroIdle;
  const scale = HERO_FRAME.displayH / HERO_FRAME.h;
  const x = player.x - camera - HERO_FRAME.anchorX * scale;
  const y = player.y - HERO_FRAME.anchorY * scale;
  drawSprite(frame, x, y, HERO_FRAME.displayW, HERO_FRAME.displayH, player.facing < 0);

  if (player.attack > 0) {
    const cx = player.x - camera + player.facing * 36;
    const cy = player.y - 82;
    const glow = ctx.createRadialGradient(cx, cy, 8, cx, cy, 122);
    glow.addColorStop(0, "rgba(255, 224, 132, 0.64)");
    glow.addColorStop(0.42, "rgba(255, 183, 80, 0.24)");
    glow.addColorStop(1, "rgba(255, 183, 80, 0)");
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(cx, cy, 122, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawGhosts(t) {
  for (const ghost of ghosts) drawSingleGhost(ghost, t);
  for (const ghost of ambientGhosts) drawSingleGhost(ghost, t);
}

function drawSingleGhost(ghost, t) {
  const customSprite = ghost.id && ghost.id !== "ghost" && sprites.props[ghost.id];
  const appearAlpha = Number.isFinite(ghost.appear) ? clamp(ghost.appear, 0, 1) : 1;
  if (customSprite) {
    const size = defaultSizes[ghost.id] || { w: 120, h: 120 };
    if (!ghost.alive) {
      if (ghost.gone < 0.7) {
        ctx.globalAlpha = Math.max(0, 1 - ghost.gone / 0.7);
        drawSprite(customSprite, ghost.x - camera - size.w / 2, ghost.y - size.h + 10, size.w, size.h, ghost.vx < 0);
        ctx.globalAlpha = 1;
      }
      return;
    }
    ctx.globalAlpha = appearAlpha;
    drawSprite(customSprite, ghost.x - camera - size.w / 2, ghost.y - size.h + 10, size.w, size.h, ghost.vx < 0);
    ctx.globalAlpha = 1;
    return;
  }
  if (!ghost.alive) {
    if (ghost.gone < 0.7) {
      ctx.globalAlpha = Math.max(0, 1 - ghost.gone / 0.7);
      drawSprite(sprites.ghostIdle, ghost.x - camera - 62, ghost.y - 135, 124, 144, ghost.vx < 0);
      ctx.globalAlpha = 1;
    }
    return;
  }
  const frame = sprites.ghostMove[Math.floor(t * 8) % sprites.ghostMove.length];
  ctx.globalAlpha = appearAlpha;
  drawSprite(frame, ghost.x - camera - 72, ghost.y - 130, 144, 144, ghost.vx < 0);
  ctx.globalAlpha = 1;
}

function drawCollectibles(t) {
  for (const item of collectibles) {
    if (item.taken) continue;
    const id = item.id || "crystal";
    const size = defaultSizes[id] || defaultSizes.crystal;
    const sprite = sprites.props[id] || sprites.crystal;
    const x = item.x - camera - size.w / 2;
    const y = item.y - size.h * 0.58 + collectibleBob(item, t);
    drawSprite(sprite, x, y, size.w, size.h);
  }
}

function drawHud() {
  ctx.textAlign = "left";
  ctx.font = "18px Consolas, monospace";
  ctx.fillStyle = "rgba(2, 5, 10, 0.5)";
  ctx.fillRect(18, 16, 144, 32);
  ctx.fillStyle = "#efe4c2";
  ctx.fillText("HP", 30, 38);
  for (let i = 0; i < 3; i++) {
    ctx.fillStyle = i < player.hp ? "#ca4c4c" : "#44313b";
    ctx.fillRect(64 + i * 27, 23, 18, 18);
    ctx.fillStyle = "rgba(255, 226, 180, 0.35)";
    ctx.fillRect(67 + i * 27, 25, 5, 5);
  }

  ctx.textAlign = "right";
  ctx.fillStyle = "rgba(2, 5, 10, 0.5)";
  ctx.fillRect(W - 180, 16, 162, 32);
  ctx.fillStyle = "#efe4c2";
  ctx.fillText("SCORE " + player.score, W - 30, 38);

  const nearbyGhost = allGhosts().find((ghost) => ghost.alive && Math.abs(player.x - ghost.x) < 210);
  const nearbyBoat = boats.find((currentBoat) => Math.abs(player.x - (currentBoat.x + (defaultSizes[currentBoat.id || "boat"] || defaultSizes.boat).w * 0.5)) < 190);
  if (player.x < 210) drawPrompt("Follow the river.");
  else if (player.onBoat && shouldJumpToNextBoat()) drawPrompt("Jump to the next boat.");
  else if (nearbyBoat && !player.onBoat) drawPrompt("Step onto the boat.");
  else if (player.attack <= 0 && nearbyGhost) drawPrompt("Use the lantern.");
}

function drawPrompt(text) {
  ctx.textAlign = "center";
  ctx.font = "15px Consolas, monospace";
  ctx.fillStyle = "rgba(2, 5, 10, 0.42)";
  ctx.fillRect(W / 2 - 130, H - 48, 260, 28);
  ctx.fillStyle = "rgba(245, 232, 197, 0.82)";
  ctx.fillText(text, W / 2, H - 28);
}

function drawOverlay(title, subtitle) {
  ctx.fillStyle = "rgba(3, 6, 12, 0.62)";
  ctx.fillRect(0, 0, W, H);
  ctx.textAlign = "center";
  ctx.fillStyle = "#f4e8c5";
  ctx.font = '700 44px "Doto", Consolas, monospace';
  ctx.fillText(title, W / 2, H / 2 - 8);
  ctx.font = '400 18px "Doto", Consolas, monospace';
  ctx.fillText(subtitle, W / 2, H / 2 + 28);
}

function drawMist(x, y, w, t) {
  ctx.fillStyle = "rgba(102, 142, 150, 0.13)";
  for (let i = 0; i < 5; i++) {
    const px = x + i * (w / 5) + Math.sin(t + i) * 16;
    ctx.beginPath();
    ctx.ellipse(px, y + Math.cos(t * 0.8 + i) * 6, 52, 13, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawHorizonLayer(seed, parallax, baseY, amp, color) {
  const shift = camera * parallax;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(0, H);
  ctx.lineTo(0, baseY);
  for (let x = -80; x <= W + 80; x += 64) {
    const wx = x + shift + seed;
    const y =
      baseY +
      Math.sin(wx * 0.012 + seed) * amp +
      Math.sin(wx * 0.004 + seed * 0.7) * amp * 0.75;
    ctx.lineTo(x, y);
  }
  ctx.lineTo(W, H);
  ctx.closePath();
  ctx.fill();
}

function drawParallaxProps() {
  for (const prop of farBackgroundProps) {
    const sprite = sprites.props[prop.id];
    if (!sprite) continue;
    const x = prop.x - camera * prop.p;
    if (x + prop.w < -80 || x > W + 80) continue;
    ctx.globalAlpha = prop.a;
    drawSprite(sprite, x, prop.y, prop.w, prop.h, prop.flip);
  }
  ctx.globalAlpha = 1;
}

function drawWorldProps() {
  for (const prop of worldProps) {
    const sprite = sprites.props[prop.id];
    if (!sprite) continue;
    const x = prop.x - camera;
    if (x + prop.w < -80 || x > W + 80) continue;
    ctx.globalAlpha = prop.a;
    drawSprite(sprite, x, prop.y, prop.w, prop.h, prop.flip);
  }
  ctx.globalAlpha = 1;
}

function drawPlatforms() {
  for (const platform of platforms) {
    const sprite = sprites.props[platform.id];
    const x = platform.x - camera;
    if (x + platform.w < -80 || x > W + 80) continue;
    ctx.globalAlpha = platform.a ?? 1;
    if (sprite) {
      drawSprite(sprite, x, platform.y, platform.w, platform.h, platform.flip);
    } else {
      ctx.fillStyle = "#5c5147";
      ctx.fillRect(Math.round(x), Math.round(platform.y), Math.round(platform.w), Math.round(platform.h));
    }
    ctx.fillStyle = "rgba(231, 219, 176, 0.22)";
    ctx.fillRect(Math.round(x + 8), Math.round(platform.y + 4), Math.round(platform.w - 16), 3);
  }
  ctx.globalAlpha = 1;
}

function drawWorldSprite(sprite, x, y, w, h) {
  const sx = x - camera;
  if (sx + w < -40 || sx > W + 40) return;
  drawSprite(sprite, sx, y, w, h);
}

function drawSprite(sprite, x, y, w, h, flip = false) {
  ctx.save();
  if (flip) {
    ctx.translate(Math.round(x + w), Math.round(y));
    ctx.scale(-1, 1);
    ctx.drawImage(sprite, 0, 0, Math.round(w), Math.round(h));
  } else {
    ctx.drawImage(sprite, Math.round(x), Math.round(y), Math.round(w), Math.round(h));
  }
  ctx.restore();
}

function playerBox() {
  return { x: player.x - 20, y: player.y - 96, w: 40, h: 96 };
}

function pointInRect(x, y, r) {
  return x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;
}

function rectsOverlap(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

function approach(value, target, delta) {
  if (value < target) return Math.min(value + delta, target);
  if (value > target) return Math.max(value - delta, target);
  return target;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function cloneLevel(value) {
  return JSON.parse(JSON.stringify(value));
}

function safeParseJson(raw, fallback) {
  try {
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function loadDeletedAssetIds() {
  const stored = safeParseJson(localStorage.getItem(DELETED_ASSETS_KEY), []);
  return new Set(Array.isArray(stored) ? stored.map(sanitizeAssetId).filter(Boolean) : []);
}

function persistDeletedAssetIds() {
  localStorage.setItem(DELETED_ASSETS_KEY, JSON.stringify([...deletedAssetIds].sort((a, b) => a.localeCompare(b))));
}

function assetAvailable(id) {
  return Boolean(id && !REMOVED_BUILT_IN_ASSETS.has(id) && assetDefinitions[id]);
}

function serializableGhost(ghost) {
  return {
    id: assetAvailable(ghost.id) ? ghost.id : "ghost",
    x: ghost.x,
    y: Number.isFinite(ghost.baseY) ? ghost.baseY : ghost.y,
    vx: ghost.vx,
    alive: ghost.alive !== false,
    minX: ghost.minX,
    maxX: ghost.maxX,
    spawnX: Number.isFinite(ghost.spawnX) ? ghost.spawnX : ghost.x,
    spawnVx: Number.isFinite(ghost.spawnVx) ? ghost.spawnVx : ghost.vx,
  };
}

function serializableBoat(currentBoat) {
  return {
    id: assetAvailable(currentBoat.id) ? currentBoat.id : "boat",
    x: currentBoat.x,
    y: currentBoat.y,
    minX: currentBoat.minX,
    maxX: currentBoat.maxX,
    spawnX: Number.isFinite(currentBoat.spawnX) ? currentBoat.spawnX : currentBoat.x,
  };
}

function captureLevel() {
  const capturedGhosts = ghosts.length ? ghosts.map(serializableGhost) : [normalizeGhost()];
  const capturedBoats = boats.length ? boats.map(serializableBoat) : [normalizeBoat()];
  return {
    worldWidth: WORLD_W,
    sounds: serializeSoundSettings(),
    assets: serializeAssetDefinitions(),
    water: { x: WATER.x, w: WATER.w },
    boat: capturedBoats[0],
    boats: capturedBoats,
    ghost: capturedGhosts[0],
    ghosts: capturedGhosts,
    collectibles: collectibles
      .filter((item) => assetAvailable(item.id || "crystal"))
      .map((item) => ({ id: item.id || "crystal", x: item.x, y: item.y, taken: false })),
    foreground: worldProps.filter((item) => assetAvailable(item.id)).map((item) => ({ ...item })),
    background: farBackgroundProps.filter((item) => assetAvailable(item.id)).map((item) => ({ ...item })),
    platforms: platforms.filter((item) => assetAvailable(item.id)).map((item) => ({ ...item })),
  };
}

async function applyLevel(level) {
  if (!level) return;
  if (level.sounds) await applySoundSettings(level.sounds);
  if (level.assets) await applyAssetDefinitions(level.assets);
  WORLD_W = clamp(Number(level.worldWidth) || WORLD_W, 1600, 12000);
  if (level.water) {
    WATER.x = clamp(Number(level.water.x) || WATER.x, 0, WORLD_W - 220);
    WATER.w = clamp(Number(level.water.w) || WATER.w, 260, WORLD_W - WATER.x);
  }
  const levelBoats = Array.isArray(level.boats) ? level.boats : level.boat ? [level.boat] : boats;
  boats = levelBoats.map(normalizeBoat).filter(Boolean);
  if (!boats.length) boats = [normalizeBoat()];
  Object.assign(boat, boats[0]);
  boats[0] = boat;
  const levelGhosts = Array.isArray(level.ghosts) ? level.ghosts : level.ghost ? [level.ghost] : ghosts;
  ghosts = levelGhosts.map(normalizeGhost).filter(Boolean);
  if (!ghosts.length) ghosts = [normalizeGhost()];
  worldProps = Array.isArray(level.foreground)
    ? level.foreground.map((item) => normalizeProp(item, "palmTall")).filter(Boolean)
    : worldProps;
  farBackgroundProps = Array.isArray(level.background)
    ? level.background.map((item) => normalizeProp({ p: 0.2, ...item }, "palmTall")).filter(Boolean)
    : farBackgroundProps;
  platforms = Array.isArray(level.platforms)
    ? level.platforms.map((item) => normalizeProp(item, "woodPlatform")).filter(Boolean)
    : cloneLevel(defaultLevel.platforms).map((item) => normalizeProp(item, "woodPlatform")).filter(Boolean);
  collectibles = Array.isArray(level.collectibles)
    ? level.collectibles.map(normalizeCollectible)
    : collectibles.map(normalizeCollectible);
  player.x = clamp(player.x, 40, WORLD_W - 70);
  camera = clamp(camera, 0, WORLD_W - W);
  resetGhostCadence();
  editor.selected = null;
  populateTypeOptions();
  if (!assetCatalog[editorEls.type.value]) editorEls.type.value = "foreground";
  populateAssetOptions();
  syncEditorUI();
}

function normalizeCollectible(item = {}, index = 0) {
  const id = assetAvailable(item.id) ? item.id : collectibleIdAt(index);
  const y = Number(item.y) || 0;
  const x = supportedCollectibleX(id, Number(item.x) || 0, y, platforms, WATER, index);
  return {
    id,
    x,
    y: supportedCollectibleY(id, x, y),
    taken: false,
  };
}

function makeCollectibles(items, offset = 0, supportPlatforms = platforms, supportWater = WATER) {
  return items.map(([x, y], index) => {
    const id = collectibleIdAt(index + offset);
    const safeX = supportedCollectibleX(id, x, y, supportPlatforms, supportWater, index);
    return {
      id,
      x: safeX,
      y: supportedCollectibleY(id, safeX, y, supportPlatforms),
      taken: false,
    };
  });
}

function makeLevelCollectibles(crystalPositions, level = {}, offset = 0) {
  const supportPlatforms = Array.isArray(level.platforms) ? level.platforms : platforms;
  const supportWater = level.water || WATER;
  const levelWorldW = Number(level.worldWidth) || WORLD_W;
  const crystals = makeCollectibles(crystalPositions, 0, supportPlatforms, supportWater);
  return [
    ...crystals,
    ...makeContextualCollectibles(level, supportPlatforms, supportWater, levelWorldW, offset),
  ];
}

function makeContextualCollectibles(level = {}, supportPlatforms = platforms, supportWater = WATER, levelWorldW = WORLD_W, offset = 0) {
  return [
    ...makePropCollectibles("mangoBasket", level, TREE_PROP_IDS, supportPlatforms, supportWater, levelWorldW, offset, 42),
    ...makePostWaterCollectibles("fishStack", supportPlatforms, supportWater, levelWorldW),
  ];
}

function makePropCollectibles(id, level, propIds, supportPlatforms, supportWater, levelWorldW, offset = 0, nudge = 36) {
  const candidates = contextualPropCandidates(level, propIds, supportWater, levelWorldW);
  const fallbackXs = contextFallbackXs(supportWater, levelWorldW, offset);
  const result = [];
  for (let index = 0; index < CONTEXTUAL_COLLECTIBLE_COUNT; index += 1) {
    const prop = spreadPick(candidates, index, CONTEXTUAL_COLLECTIBLE_COUNT);
    const baseX = prop ? propCenterX(prop) : fallbackXs[index];
    const spread = prop ? (index - 1) * nudge : 0;
    const preferredY = prop ? Math.min(GROUND_Y, Number(prop.y) + Number(prop.h || defaultSizes[prop.id]?.h || 0) + 4) : GROUND_Y;
    result.push(placeSpecialCollectible(id, baseX + spread, preferredY, supportPlatforms, supportWater, index));
  }
  return result;
}

function makePostWaterCollectibles(id, supportPlatforms = platforms, supportWater = WATER, levelWorldW = WORLD_W) {
  const waterEnd = Number(supportWater.x) + Number(supportWater.w);
  const afterWaterStart = clamp(waterEnd + 108, 120, Math.max(120, levelWorldW - 360));
  return Array.from({ length: CONTEXTUAL_COLLECTIBLE_COUNT }, (_, index) =>
    placeSpecialCollectible(id, afterWaterStart + index * 116, GROUND_Y, supportPlatforms, supportWater, index),
  );
}

function placeSpecialCollectible(id, x, preferredY, supportPlatforms = platforms, supportWater = WATER, index = 0) {
  const safeX = supportedCollectibleX(id, x, preferredY, supportPlatforms, supportWater, index);
  return {
    id,
    x: safeX,
    y: supportedCollectibleY(id, safeX, preferredY, supportPlatforms),
    taken: false,
  };
}

function contextualPropCandidates(level = {}, propIds = [], supportWater = WATER, levelWorldW = WORLD_W) {
  const foreground = Array.isArray(level.foreground) ? level.foreground : worldProps;
  const background = Array.isArray(level.background) ? level.background : [];
  const ids = new Set(propIds);
  const foregroundMatches = collectMatchingProps(foreground, ids, supportWater, levelWorldW);
  const backgroundMatches = collectMatchingProps(background, ids, supportWater, levelWorldW);
  return [...foregroundMatches, ...backgroundMatches].sort((a, b) => propCenterX(a) - propCenterX(b));
}

function collectMatchingProps(props, ids, supportWater, levelWorldW) {
  return props.filter((prop) => {
    if (!prop || !ids.has(prop.id)) return false;
    const x = propCenterX(prop);
    return x > 72 && x < levelWorldW - 72 && !xOverWater(x, supportWater);
  });
}

function spreadPick(items, index, count) {
  if (!items.length) return null;
  if (items.length === 1 || count <= 1) return items[0];
  const itemIndex = Math.round((items.length - 1) * (index / (count - 1)));
  return items[itemIndex];
}

function propCenterX(prop) {
  return Number(prop.x) + Number(prop.w || defaultSizes[prop.id]?.w || 0) * 0.5;
}

function contextFallbackXs(supportWater = WATER, levelWorldW = WORLD_W, offset = 0) {
  const left = clamp(Number(supportWater.x) - 320 - offset * 34, 120, levelWorldW - 120);
  const right = clamp(Number(supportWater.x) + Number(supportWater.w) + 170 + offset * 42, 120, levelWorldW - 120);
  return [left, Math.round((left + right) * 0.5), right];
}

function collectibleIdAt(index) {
  return COLLECTIBLE_VARIANTS[index % COLLECTIBLE_VARIANTS.length];
}

function isFloatingCollectible(id) {
  return (id || "crystal") === "crystal";
}

function collectibleBob(item, t) {
  return isFloatingCollectible(item.id) ? Math.sin(t * 4 + item.x) * 4 : 0;
}

function collectibleRect(item, t = 0) {
  const id = item.id || "crystal";
  const size = defaultSizes[id] || defaultSizes.crystal;
  const bob = collectibleBob(item, t);
  return {
    x: item.x - size.w * 0.5,
    y: item.y - size.h * 0.58 + bob,
    w: size.w,
    h: size.h,
  };
}

function supportedCollectibleX(id, x, preferredY = GROUND_Y, supportPlatforms = platforms, supportWater = WATER, index = 0) {
  const nextX = Number(x) || 0;
  if (!collectibleWouldUseWaterSurface(id, nextX, preferredY, supportPlatforms, supportWater)) return nextX;
  const waterMid = supportWater.x + supportWater.w * 0.5;
  const leftSide = nextX < waterMid;
  const shore = leftSide ? supportWater.x - 74 : supportWater.x + supportWater.w + 74;
  const stagger = ((index % 5) - 2) * 28;
  const candidate = shore + (leftSide ? -Math.abs(stagger) : Math.abs(stagger));
  return clamp(candidate, 44, WORLD_W - 74);
}

function supportedCollectibleY(id, x, preferredY = GROUND_Y, supportPlatforms = platforms) {
  if (isFloatingCollectible(id)) return floatingCollectibleY(id, x, preferredY, supportPlatforms);
  const size = defaultSizes[id] || defaultSizes.crystal;
  return collectibleSupportY(x, preferredY, supportPlatforms) - size.h * 0.42;
}

function floatingCollectibleY(id, x, preferredY = GROUND_Y, supportPlatforms = platforms) {
  const size = defaultSizes[id] || defaultSizes.crystal;
  const supportY = collectibleSupportY(x, preferredY, supportPlatforms);
  const highestGroundedAnchor = supportY - CRYSTAL_FLOAT_GAP - size.h * 0.42;
  const requestedY = Number(preferredY) || highestGroundedAnchor;
  return Math.min(requestedY, highestGroundedAnchor);
}

function collectibleSupportY(x, preferredY = GROUND_Y, supportPlatforms = platforms) {
  const platform = collectiblePlatformSupport(x, preferredY, supportPlatforms);
  return platform ? platform.y : GROUND_Y;
}

function collectiblePlatformSupport(x, preferredY = GROUND_Y, supportPlatforms = platforms) {
  let support = null;
  let supportDistance = Infinity;
  for (const platform of supportPlatforms) {
    if (x < platform.x - 18 || x > platform.x + platform.w + 18) continue;
    const distance = Math.abs((Number(preferredY) || platform.y) - platform.y);
    if (distance <= supportDistance) {
      support = platform;
      supportDistance = distance;
    }
  }
  return support;
}

function collectibleWouldUseWaterSurface(id, x, preferredY = GROUND_Y, supportPlatforms = platforms, supportWater = WATER) {
  if (!xOverWater(x, supportWater)) return false;
  if (collectiblePlatformSupport(x, preferredY, supportPlatforms)) return false;
  return true;
}

function xOverWater(x, supportWater = WATER) {
  if (!supportWater || !Number.isFinite(supportWater.x) || !Number.isFinite(supportWater.w)) return false;
  return x > supportWater.x + 14 && x < supportWater.x + supportWater.w - 14;
}

function normalizeGhost(item = {}, index = 0) {
  const x = Number(item.x) || [740, 2140, 3620][index] || 740;
  const y = Number(item.y) || GROUND_Y - 48;
  const vx = Number(item.vx) || (index % 2 ? -38 : 42);
  return {
    id: assetAvailable(item.id) ? item.id : "ghost",
    x,
    y,
    baseY: Number(item.baseY) || y,
    vx,
    alive: item.alive !== false,
    gone: Number(item.gone) || 0,
    minX: Number(item.minX) || x - 230,
    maxX: Number(item.maxX) || x + 230,
    spawnX: Number(item.spawnX) || x,
    spawnVx: Number(item.spawnVx) || vx,
  };
}

function normalizeBoat(item = {}, index = 0) {
  const id = assetAvailable(item.id) ? item.id : "boat";
  const size = defaultSizes[id] || defaultSizes.boat;
  const defaultX = WATER.x + 28 + index * 380;
  const x = Number(item.x) || defaultX;
  const y = Number(item.y) || WATER_Y + 18;
  const waterMin = WATER.x - 8;
  const waterMax = WATER.x + WATER.w - size.w + 38;
  const minX = clamp(Number.isFinite(Number(item.minX)) ? Number(item.minX) : x - 210, waterMin, waterMax);
  const maxX = clamp(Number.isFinite(Number(item.maxX)) ? Number(item.maxX) : x + 260, minX, waterMax);
  return {
    id,
    x: clamp(x, waterMin, waterMax),
    y,
    vx: 0,
    minX,
    maxX,
    spawnX: clamp(Number(item.spawnX) || x, minX, maxX),
  };
}

function normalizeProp(item = {}, fallbackId = "palmTall") {
  if (REMOVED_BUILT_IN_ASSETS.has(item.id)) return null;
  const id = assetAvailable(item.id) ? item.id : fallbackId;
  if (!assetAvailable(id)) return null;
  const size = defaultSizes[id] || { w: 96, h: 96 };
  return {
    id,
    x: Number(item.x) || 0,
    y: Number(item.y) || 0,
    w: Number(item.w) || size.w,
    h: Number(item.h) || size.h,
    a: clamp(Number(item.a ?? item.alpha ?? 0.85), 0, 1),
    p: clamp(Number(item.p ?? item.parallax ?? 0.2), 0, 1),
    flip: Boolean(item.flip),
  };
}

function createBuiltInLevels() {
  const levelPickups = (items, level, offset = 0) => makeLevelCollectibles(items, level, offset);
  const ferry = (x, minX, maxX) => ({
    id: "boat",
    x,
    y: WATER_Y + 18,
    minX,
    maxX,
    spawnX: x,
  });
  const patrol = (x, minX, maxX, vx = 42, y = GROUND_Y - 48) => ({
    id: "ghost",
    x,
    y,
    vx,
    alive: true,
    gone: 0,
    minX,
    maxX,
    spawnX: x,
    spawnVx: vx,
  });

  const level1 = cloneLevel(defaultLevel);
  level1.water = { x: 1360, w: 1160 };
  level1.boats = [
    ferry(1390, 1352, 1600),
    ferry(1760, 1710, 1960),
    ferry(2130, 2070, 2298),
  ];
  level1.boat = level1.boats[0];
  level1.collectibles = levelPickups(defaultCollectiblePositions, level1, 0);

  const level2 = cloneLevel(defaultLevel);
  level2.worldWidth = 4700;
  level2.water = { x: 940, w: 1280 };
  level2.boats = [
    ferry(968, 932, 1180),
    ferry(1360, 1300, 1520),
    ferry(1730, 1680, 2000),
  ];
  level2.boat = level2.boats[0];
  level2.ghosts = [
    patrol(640, 480, 940, 42),
    patrol(1780, 1640, 2180, -38),
    patrol(2860, 2600, 3120, 46),
    patrol(3920, 3640, 4280, -44),
  ];
  level2.ghost = level2.ghosts[0];
  const level2CollectiblePositions = [
    [260, 360], [410, 322], [620, 282], [790, 344], [1050, 328], [1260, 286],
    [1560, 350], [1780, 304], [2020, 350], [2290, 320], [2580, 284], [2860, 344],
    [3130, 306], [3420, 350], [3710, 312], [3980, 342], [4300, 302],
  ];
  level2.background = [
    { id: "palmTall", x: 80, y: 232, w: 120, h: 158, p: 0.12, a: 0.32 },
    { id: "mudHouse", x: 340, y: 306, w: 138, h: 88, p: 0.18, a: 0.42 },
    { id: "bambooA", x: 700, y: 266, w: 96, h: 132, p: 0.18, a: 0.38 },
    { id: "bananaFruit", x: 1180, y: 252, w: 116, h: 144, p: 0.16, a: 0.36 },
    { id: "reeds", x: 1650, y: 310, w: 174, h: 94, p: 0.2, a: 0.34 },
    { id: "metalHouse", x: 2200, y: 292, w: 156, h: 104, p: 0.19, a: 0.42 },
    { id: "bananaWide", x: 2760, y: 252, w: 138, h: 140, p: 0.15, a: 0.34 },
    { id: "bambooB", x: 3920, y: 264, w: 104, h: 138, p: 0.18, a: 0.36 },
  ];
  level2.foreground = [
    { id: "palmTall", x: 100, y: 254, w: 138, h: 180, a: 0.88 },
    { id: "reeds", x: 500, y: 332, w: 176, h: 104, a: 0.84 },
    { id: "mudHouse", x: 760, y: 322, w: 176, h: 112, a: 0.88 },
    { id: "bambooA", x: 1690, y: 292, w: 100, h: 140, a: 0.84 },
    { id: "bananaWide", x: 2050, y: 288, w: 140, h: 146, a: 0.84 },
    { id: "metalHouse", x: 2560, y: 310, w: 188, h: 124, a: 0.88 },
    { id: "reeds", x: 3090, y: 330, w: 180, h: 104, a: 0.84 },
    { id: "bambooB", x: 4250, y: 296, w: 104, h: 138, a: 0.84 },
  ];
  level2.platforms = [
    { id: "woodPlatform", x: 360, y: 374, w: 126, h: 46, a: 0.96 },
    { id: "woodPlatform", x: 560, y: 334, w: 126, h: 46, a: 0.96 },
    { id: "woodPlatform", x: 1040, y: 356, w: 132, h: 46, a: 0.96 },
    { id: "woodPlatform", x: 1210, y: 316, w: 132, h: 46, a: 0.96 },
    { id: "woodPlatform", x: 1880, y: 338, w: 132, h: 46, a: 0.96 },
    { id: "woodPlatform", x: 2500, y: 356, w: 132, h: 46, a: 0.96 },
    { id: "woodPlatform", x: 2780, y: 316, w: 132, h: 46, a: 0.96 },
    { id: "woodPlatform", x: 3370, y: 352, w: 132, h: 46, a: 0.96 },
    { id: "woodPlatform", x: 3960, y: 318, w: 132, h: 46, a: 0.96 },
  ];
  level2.collectibles = levelPickups(level2CollectiblePositions, level2, 1);

  const level3 = cloneLevel(defaultLevel);
  level3.worldWidth = 6200;
  level3.water = { x: 1550, w: 1840 };
  level3.boats = [
    ferry(1580, 1542, 1780),
    ferry(1970, 1920, 2160),
    ferry(2380, 2320, 2590),
    ferry(2800, 2730, 3168),
  ];
  level3.boat = level3.boats[0];
  level3.ghosts = [
    patrol(760, 560, 1080, 44),
    patrol(2240, 1980, 2520, -40),
    patrol(3340, 3040, 3620, 48),
    patrol(4560, 4260, 4880, -46),
    patrol(5480, 5200, 5860, 42),
  ];
  level3.ghost = level3.ghosts[0];
  const level3CollectiblePositions = [
    [300, 360], [480, 326], [660, 290], [860, 344], [1080, 310], [1340, 354],
    [1680, 322], [1900, 280], [2200, 342], [2500, 304], [2760, 352], [3060, 316],
    [3360, 276], [3660, 348], [3960, 312], [4260, 354], [4560, 296], [4880, 344],
    [5200, 306], [5520, 352], [5860, 304],
  ];
  level3.background = [
    ...level1.background,
    { id: "mudHouse", x: 5600, y: 306, w: 132, h: 84, p: 0.2, a: 0.42 },
    { id: "bambooA", x: 5900, y: 262, w: 98, h: 134, p: 0.18, a: 0.36 },
  ];
  level3.foreground = [
    ...level1.foreground,
    { id: "bananaWide", x: 5580, y: 286, w: 140, h: 146, a: 0.84 },
    { id: "reeds", x: 5920, y: 328, w: 180, h: 104, a: 0.82 },
  ];
  level3.platforms = [
    ...level1.platforms,
    { id: "woodPlatform", x: 5520, y: 326, w: 132, h: 46, a: 0.96 },
    { id: "woodPlatform", x: 5860, y: 360, w: 132, h: 46, a: 0.96 },
  ];
  level3.collectibles = levelPickups(level3CollectiblePositions, level3, 2);

  const level4 = cloneLevel(level2);
  level4.worldWidth = 5400;
  level4.water = { x: 2450, w: 1540 };
  level4.boats = [
    ferry(2480, 2442, 2690),
    ferry(2870, 2820, 3080),
    ferry(3260, 3200, 3768),
  ];
  level4.boat = level4.boats[0];
  level4.ghosts = [
    patrol(520, 340, 820, 44),
    patrol(1460, 1220, 1780, -42),
    patrol(2360, 2060, 2560, 46),
    patrol(3540, 3260, 3820, -44),
    patrol(4740, 4420, 5120, 46),
  ];
  level4.ghost = level4.ghosts[0];
  const level4CollectiblePositions = [
    [240, 362], [420, 326], [620, 288], [880, 350], [1160, 312], [1460, 352],
    [1760, 304], [2060, 348], [2360, 292], [2640, 340], [2940, 302], [3240, 354],
    [3540, 314], [3860, 350], [4180, 294], [4500, 340], [4820, 306], [5160, 352],
  ];
  level4.platforms = [
    { id: "woodPlatform", x: 300, y: 372, w: 126, h: 46, a: 0.96 },
    { id: "woodPlatform", x: 520, y: 332, w: 126, h: 46, a: 0.96 },
    { id: "woodPlatform", x: 840, y: 362, w: 132, h: 46, a: 0.96 },
    { id: "woodPlatform", x: 1300, y: 322, w: 132, h: 46, a: 0.96 },
    { id: "woodPlatform", x: 1780, y: 356, w: 132, h: 46, a: 0.96 },
    { id: "woodPlatform", x: 2140, y: 318, w: 132, h: 46, a: 0.96 },
    { id: "woodPlatform", x: 2860, y: 350, w: 132, h: 46, a: 0.96 },
    { id: "woodPlatform", x: 3460, y: 318, w: 132, h: 46, a: 0.96 },
    { id: "woodPlatform", x: 4060, y: 354, w: 132, h: 46, a: 0.96 },
    { id: "woodPlatform", x: 4700, y: 320, w: 132, h: 46, a: 0.96 },
  ];
  level4.collectibles = levelPickups(level4CollectiblePositions, level4, 3);

  return {
    "Level 1": level1,
    "Level 2": level2,
    "Level 3": level3,
    "Level 4": level4,
  };
}

function initEditor() {
  populateTypeOptions();
  populateSourceOptions();
  populateAssetOptions();
  refreshLevelOptions();
  editorEls.toggle.addEventListener("click", () => setEditorActive(!editor.active));
  for (const tab of editorEls.tabs) {
    tab.addEventListener("click", () => setEditorTab(tab.dataset.editorTab));
  }
  editorEls.type.addEventListener("change", populateAssetOptions);
  editorEls.asset.addEventListener("change", () => {
    applySelectedAssetId();
    syncAssetEditor();
  });
  editorEls.add.addEventListener("click", addEditorAsset);
  editorEls.duplicate.addEventListener("click", duplicateEditorAsset);
  editorEls.delete.addEventListener("click", deleteEditorAsset);
  editorEls.deleteAssetClass.addEventListener("click", deleteSelectedAssetClass);
  editorEls.openAssetModal.addEventListener("click", openNewAssetModal);
  editorEls.closeAssetModal.addEventListener("click", closeNewAssetModal);
  editorEls.assetModal.addEventListener("click", (event) => {
    if (event.target === editorEls.assetModal) closeNewAssetModal();
  });
  editorEls.spriteUpload.addEventListener("change", readSpriteUpload);
  editorEls.updateSprite.addEventListener("click", updateSelectedAssetSprite);
  editorEls.createAsset.addEventListener("click", createAssetDefinition);
  editorEls.createUploadedAssets.addEventListener("click", createUploadedAssets);
  for (const input of [editorEls.spriteSource, editorEls.spriteX, editorEls.spriteY, editorEls.spriteW, editorEls.spriteH, editorEls.spriteTolerance]) {
    input.addEventListener("input", drawSpritePreview);
    input.addEventListener("change", drawSpritePreview);
  }
  for (const input of [editorEls.x, editorEls.y, editorEls.w, editorEls.h, editorEls.alpha, editorEls.parallax]) {
    input.addEventListener("input", applyEditorFields);
  }
  editorEls.camera.addEventListener("input", () => {
    camera = Number(editorEls.camera.value) || 0;
  });
  editorEls.width.addEventListener("input", () => {
    WORLD_W = clamp(Number(editorEls.width.value) || WORLD_W, 1600, 12000);
    WATER.x = clamp(WATER.x, 0, WORLD_W - 220);
    WATER.w = clamp(WATER.w, 260, WORLD_W - WATER.x);
    clampBoatsToWater();
    camera = clamp(camera, 0, WORLD_W - W);
    syncEditorUI();
    scheduleAutosave();
  });
  for (const input of [editorEls.waterX, editorEls.waterW]) {
    input.addEventListener("input", applyWaterFields);
  }
  editorEls.save.addEventListener("click", saveLevel);
  editorEls.load.addEventListener("click", loadStoredLevel);
  editorEls.reset.addEventListener("click", async () => {
    await applyLevel(cloneLevel(defaultLevel));
    scheduleAutosave(true);
  });
  editorEls.levelSelect.addEventListener("change", () => {
    editor.currentLevel = editorEls.levelSelect.value || editor.currentLevel;
    editorEls.levelName.value = editor.currentLevel;
  });
  editorEls.levelName.addEventListener("change", () => {
    persistCurrentLevel({ refreshLevels: true });
  });
  editorEls.newLevel.addEventListener("click", createLevel);
  editorEls.deleteLevel.addEventListener("click", deleteLevel);
  editorEls.export.addEventListener("click", exportLevel);
  editorEls.import.addEventListener("click", importLevel);
  canvas.addEventListener("mousedown", onEditorPointerDown);
  window.addEventListener("mousemove", onEditorPointerMove);
  window.addEventListener("mouseup", onEditorPointerUp);
  setEditorTab(editor.activeTab);
  syncEditorUI();
}

function setEditorTab(name) {
  const next = editorEls.tabPanels.some((panel) => panel.dataset.editorPanel === name) ? name : "assets";
  editor.activeTab = next;
  for (const tab of editorEls.tabs) {
    const active = tab.dataset.editorTab === next;
    tab.classList.toggle("is-active", active);
    tab.setAttribute("aria-selected", String(active));
  }
  for (const panel of editorEls.tabPanels) {
    const active = panel.dataset.editorPanel === next;
    panel.classList.toggle("is-active", active);
    panel.hidden = !active;
  }
}

function populateTypeOptions() {
  const options = Object.keys(assetCatalog)
    .map((type) => `<option value="${type}">${type}</option>`)
    .join("");
  const currentType = editorEls.type.value || "foreground";
  const currentNewType = editorEls.newAssetType.value || currentType;
  editorEls.type.innerHTML = options;
  editorEls.newAssetType.innerHTML = options;
  if (assetCatalog[currentType]) editorEls.type.value = currentType;
  if (assetCatalog[currentNewType]) editorEls.newAssetType.value = currentNewType;
}

function openNewAssetModal() {
  editorEls.newAssetType.value = assetCatalog[editorEls.type.value] ? editorEls.type.value : "foreground";
  editorEls.newUploadedAssetId.value = "";
  editorEls.newAssetFiles.value = "";
  if (editorEls.assetModal.showModal) {
    editorEls.assetModal.showModal();
  } else {
    editorEls.assetModal.setAttribute("open", "");
  }
}

function closeNewAssetModal() {
  if (editorEls.assetModal.close) {
    editorEls.assetModal.close();
  } else {
    editorEls.assetModal.removeAttribute("open");
  }
}

function populateSourceOptions() {
  editorEls.spriteSource.innerHTML = Object.entries(sheetSources)
    .map(([id, label]) => `<option value="${id}">${label}</option>`)
    .join("");
}

function populateAssetOptions() {
  const type = editorEls.type.value || "foreground";
  editorEls.asset.innerHTML = (assetCatalog[type] || [])
    .map((id) => `<option value="${id}">${id}</option>`)
    .join("");
  syncAssetEditor();
}

function syncAssetEditor() {
  const id = editorEls.asset.value;
  const definition = assetDefinitions[id];
  if (!definition) return;
  const isCustom = Boolean(definition.customData || definition.customKey);
  if (isCustom) ensureCustomSourceOption();
  editorEls.spriteSource.value = isCustom ? "custom" : definition.source;
  editorEls.spriteX.value = definition.crop.x;
  editorEls.spriteY.value = definition.crop.y;
  editorEls.spriteW.value = definition.crop.w;
  editorEls.spriteH.value = definition.crop.h;
  editorEls.spriteTolerance.value = definition.tolerance ?? 12;
  editorEls.newAssetId.value = "";
  drawSpritePreview();
}

function drawSpritePreview() {
  const preview = editorEls.spritePreview;
  const pctx = preview.getContext("2d");
  pctx.clearRect(0, 0, preview.width, preview.height);
  pctx.imageSmoothingEnabled = true;
  pctx.imageSmoothingQuality = "high";
  const id = editorEls.asset.value;
  const definition = assetDefinitions[id];
  const image = previewSourceImage(id, definition);
  const sprite = image
    ? cutSprite(image, readSpriteCropFields(), readSpriteTolerance(definition?.tolerance ?? 12))
    : sprites?.props?.[id];
  if (!sprite) return;
  const scale = Math.min(preview.width / sprite.width, preview.height / sprite.height, 1);
  const w = sprite.width * scale;
  const h = sprite.height * scale;
  pctx.drawImage(sprite, (preview.width - w) / 2, (preview.height - h) / 2, w, h);
}

function previewSourceImage(id, definition) {
  const source = editorEls.spriteSource.value;
  if (source === "custom") return editor.pendingImage || images["assetblob:" + definition?.customKey] || images["custom:" + id] || null;
  if (source && images[source]) return images[source];
  if (definition?.customKey) return images["assetblob:" + definition.customKey] || null;
  if (definition?.customData) return images["custom:" + id] || null;
  return definition ? images[definition.source] : null;
}

function applySelectedAssetId() {
  const selected = getSelectedEditorObject();
  if (!selected || !editor.selected) return;
  const id = editorEls.asset.value;
  if (!id) return;
  selected.obj.id = id;
  const size = defaultSizes[id];
  if (size && (editor.selected.type === "foreground" || editor.selected.type === "background" || editor.selected.type === "platform")) {
    selected.obj.w = size.w;
    selected.obj.h = size.h;
  }
  if (editor.selected.type === "collectible") {
    selected.obj.x = supportedCollectibleX(id, selected.obj.x, selected.obj.y);
    selected.obj.y = supportedCollectibleY(id, selected.obj.x, selected.obj.y);
    selected.obj.taken = false;
  }
  syncEditorUI();
  scheduleAutosave();
}

function readSpriteUpload() {
  const file = editorEls.spriteUpload.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    editor.pendingUpload = String(reader.result);
    editor.pendingUploadFile = file;
    editor.pendingImage = null;
    ensureCustomSourceOption();
    editorEls.spriteSource.value = "custom";
    loadImage(editor.pendingUpload).then((image) => {
      editor.pendingImage = image;
      editorEls.spriteX.value = 0;
      editorEls.spriteY.value = 0;
      editorEls.spriteW.value = image.width;
      editorEls.spriteH.value = image.height;
      drawSpritePreview();
    });
  };
  reader.readAsDataURL(file);
}

async function updateSelectedAssetSprite() {
  const id = editorEls.asset.value;
  const definition = assetDefinitions[id];
  if (!definition) return;
  deletedAssetIds.delete(id);
  persistDeletedAssetIds();
  const source = editorEls.spriteSource.value;
  if (source === "custom" && !editor.pendingUpload && !definition.customData && !definition.customKey) {
    editorEls.status.textContent = "Upload an image before switching this sprite to custom";
    return;
  }
  definition.source = source === "custom" ? "custom:" + id : source;
  if (source === "custom") {
    if (editor.pendingUploadFile) {
      await writeAssetBlob(id, editor.pendingUploadFile);
      definition.customKey = id;
      definition.customName = editor.pendingUploadFile.name;
      definition.customData = null;
    } else {
      definition.customData = editor.pendingUpload || definition.customData;
      definition.customKey = definition.customKey || null;
      definition.customName = definition.customName || null;
    }
  } else {
    if (definition.customKey) await deleteAssetBlob(definition.customKey);
    definition.customData = null;
    definition.customKey = null;
    definition.customName = null;
  }
  definition.crop = readSpriteCropFields();
  definition.tolerance = readSpriteTolerance(definition.tolerance);
  definition.defaultW = Math.max(8, Number(editorEls.w.value) || definition.defaultW || definition.crop.w);
  definition.defaultH = Math.max(8, Number(editorEls.h.value) || definition.defaultH || definition.crop.h);
  defaultSizes[id] = { w: definition.defaultW, h: definition.defaultH };
  ensureAssetType(id, editorEls.type.value);
  rebuildAssetCatalog();
  populateAssetOptions();
  editorEls.asset.value = id;
  await rebuildSingleAssetSprite(id);
  syncAssetEditor();
  syncEditorUI();
  scheduleAutosave(true);
}

async function createAssetDefinition() {
  const id = uniqueAssetId(sanitizeAssetId(editorEls.newAssetId.value || editorEls.asset.value + "-copy"));
  const type = editorEls.type.value || "foreground";
  const source = editorEls.spriteSource.value;
  const cropRect = readSpriteCropFields();
  if (source === "custom" && !editor.pendingUpload) {
    editorEls.status.textContent = "Upload an image before creating a custom asset";
    return;
  }
  assetDefinitions[id] = {
    id,
    source: source === "custom" ? "custom:" + id : source,
    crop: cropRect,
    tolerance: readSpriteTolerance(source === "custom" ? 0 : 12),
    types: [type],
    defaultW: Math.max(8, Number(editorEls.w.value) || Math.round(cropRect.w * 0.35)),
    defaultH: Math.max(8, Number(editorEls.h.value) || Math.round(cropRect.h * 0.35)),
    customData: source === "custom" && !editor.pendingUploadFile ? editor.pendingUpload : null,
    customKey: source === "custom" && editor.pendingUploadFile ? id : null,
    customName: source === "custom" && editor.pendingUploadFile ? editor.pendingUploadFile.name : null,
  };
  deletedAssetIds.delete(id);
  persistDeletedAssetIds();
  if (source === "custom" && editor.pendingUploadFile) await writeAssetBlob(id, editor.pendingUploadFile);
  defaultSizes[id] = { w: assetDefinitions[id].defaultW, h: assetDefinitions[id].defaultH };
  rebuildAssetCatalog();
  populateTypeOptions();
  editorEls.type.value = type;
  populateAssetOptions();
  editorEls.asset.value = id;
  await rebuildSingleAssetSprite(id);
  syncAssetEditor();
  addEditorAsset();
  scheduleAutosave(true);
}

async function createUploadedAssets() {
  const files = Array.from(editorEls.newAssetFiles.files || []).filter((file) => file.type.startsWith("image/"));
  if (!files.length) {
    editorEls.status.textContent = "Choose one or more image files first";
    return;
  }
  const type = editorEls.newAssetType.value || "foreground";
  const typedId = String(editorEls.newUploadedAssetId.value || "").trim();
  const prefix = typedId ? sanitizeAssetId(typedId) : "";
  const created = [];

  try {
    for (const file of files) {
      const baseName = sanitizeAssetId(file.name.replace(/\.[^.]+$/, ""));
      const requestedId = files.length === 1 && prefix ? prefix : sanitizeAssetId([prefix, baseName].filter(Boolean).join("-"));
      const id = uniqueAssetId(requestedId);
      const image = await loadImageFromFile(file);
      const size = defaultSizeForUploadedAsset(type, image);
      await writeAssetBlob(id, file);
      assetDefinitions[id] = {
        id,
        source: "custom:" + id,
        crop: { x: 0, y: 0, w: image.width, h: image.height },
        tolerance: 0,
        types: [type],
        defaultW: size.w,
        defaultH: size.h,
        customData: null,
        customKey: id,
        customName: file.name,
      };
      deletedAssetIds.delete(id);
      persistDeletedAssetIds();
      defaultSizes[id] = { w: size.w, h: size.h };
      await rebuildSingleAssetSprite(id);
      created.push(id);
    }
  } catch {
    editorEls.status.textContent = "Could not create uploaded asset";
    return;
  }

  rebuildAssetCatalog();
  populateTypeOptions();
  editorEls.type.value = type;
  populateAssetOptions();
  editorEls.asset.value = created[0];
  syncAssetEditor();
  syncEditorUI();
  editorEls.newAssetFiles.value = "";
  editorEls.newUploadedAssetId.value = "";
  closeNewAssetModal();
  scheduleAutosave(true);
  editorEls.status.textContent = `Editor mode: created ${created.length} uploaded asset${created.length === 1 ? "" : "s"}; use Add to place`;
}

function ensureCustomSourceOption() {
  if (sheetSources.custom) return;
  sheetSources.custom = "Uploaded sprite";
  populateSourceOptions();
}

async function loadImageFromFile(file) {
  const url = URL.createObjectURL(file);
  try {
    return await loadImage(url);
  } finally {
    URL.revokeObjectURL(url);
  }
}

function defaultSizeForUploadedAsset(type, image) {
  const maxSideByType = {
    foreground: 170,
    background: 190,
    platform: 140,
    collectible: 44,
    enemy: 144,
    traversal: 258,
  };
  const maxSide = maxSideByType[type] || 160;
  const scale = Math.min(1, maxSide / Math.max(image.width, image.height));
  return {
    w: Math.max(8, Math.round(image.width * scale)),
    h: Math.max(8, Math.round(image.height * scale)),
  };
}

function readSpriteCropFields() {
  return {
    x: Math.max(0, Number(editorEls.spriteX.value) || 0),
    y: Math.max(0, Number(editorEls.spriteY.value) || 0),
    w: Math.max(1, Number(editorEls.spriteW.value) || 1),
    h: Math.max(1, Number(editorEls.spriteH.value) || 1),
  };
}

function readSpriteTolerance(fallback = 12) {
  const value = Number(editorEls.spriteTolerance.value);
  return clamp(Number.isFinite(value) ? value : fallback, 0, 80);
}

function ensureAssetType(id, type) {
  const definition = assetDefinitions[id];
  if (!definition) return;
  if (!definition.types.includes(type)) definition.types.push(type);
}

function uniqueAssetId(id) {
  let next = id;
  let count = 2;
  while (assetDefinitions[next] || REMOVED_BUILT_IN_ASSETS.has(next)) {
    next = id + "-" + count;
    count += 1;
  }
  return next;
}

function setEditorActive(active) {
  editor.active = active;
  editorEls.panel.hidden = !active;
  editorEls.toggle.textContent = active ? "Play" : "Editor";
  editorEls.status.textContent = active ? "Editor mode: drag assets on canvas" : "Play mode";
  if (active) {
    keys.clear();
    player.vx = 0;
    player.vy = 0;
    player.onBoat = false;
  }
  syncEditorUI();
}

function updateEditorCamera(dt) {
  const left = keys.has("ArrowLeft") || keys.has("KeyA");
  const right = keys.has("ArrowRight") || keys.has("KeyD");
  camera = clamp(camera + ((right ? 1 : 0) - (left ? 1 : 0)) * 520 * dt, 0, WORLD_W - W);
  syncEditorUI(false);
}

function addEditorAsset() {
  const type = editorEls.type.value;
  const id = editorEls.asset.value;
  const centerX = Math.round(camera + W * 0.52);
  const size = defaultSizes[id] || { w: 96, h: 96 };

  if (type === "foreground") {
    worldProps.push({ id, x: centerX, y: GROUND_Y - size.h - 6, w: size.w, h: size.h, a: 0.88 });
    selectEditorObject({ type, index: worldProps.length - 1 });
  } else if (type === "background") {
    farBackgroundProps.push({ id, x: Math.round(camera * 0.2 + W * 0.52), y: 310 - size.h * 0.35, w: size.w, h: size.h, p: 0.2, a: 0.48 });
    selectEditorObject({ type, index: farBackgroundProps.length - 1 });
  } else if (type === "platform") {
    platforms.push({ id, x: centerX - Math.round(size.w / 2), y: GROUND_Y - 82, w: size.w, h: size.h, a: 0.96 });
    selectEditorObject({ type, index: platforms.length - 1 });
  } else if (type === "collectible") {
    const x = supportedCollectibleX(id, centerX, 350);
    collectibles.push({ id, x, y: supportedCollectibleY(id, x, 350), taken: false });
    selectEditorObject({ type, index: collectibles.length - 1 });
  } else if (type === "enemy") {
    const nextGhost = normalizeGhost({
      id,
      x: centerX,
      y: GROUND_Y - 48,
      vx: ghosts.length % 2 ? -42 : 42,
      minX: centerX - 230,
      maxX: centerX + 230,
      spawnX: centerX,
      alive: true,
    }, ghosts.length);
    ghosts.push(nextGhost);
    selectEditorObject({ type, index: ghosts.length - 1 });
  } else if (type === "traversal") {
    const nextBoat = normalizeBoat({
      id,
      x: centerX - Math.round(size.w / 2),
      y: WATER_Y + 18,
      minX: centerX - Math.round(size.w / 2) - 210,
      maxX: centerX - Math.round(size.w / 2) + 260,
      spawnX: centerX - Math.round(size.w / 2),
    }, boats.length);
    boats.push(nextBoat);
    selectEditorObject({ type, index: boats.length - 1 });
  }
  scheduleAutosave();
}

function duplicateEditorAsset() {
  const selected = getSelectedEditorObject();
  if (!selected) return;
  if (editor.selected.type === "foreground") {
    worldProps.push({ ...selected.obj, x: selected.obj.x + 46, y: selected.obj.y + 8 });
    selectEditorObject({ type: "foreground", index: worldProps.length - 1 });
  } else if (editor.selected.type === "background") {
    farBackgroundProps.push({ ...selected.obj, x: selected.obj.x + 54, y: selected.obj.y + 8 });
    selectEditorObject({ type: "background", index: farBackgroundProps.length - 1 });
  } else if (editor.selected.type === "platform") {
    platforms.push({ ...selected.obj, x: selected.obj.x + 64, y: selected.obj.y });
    selectEditorObject({ type: "platform", index: platforms.length - 1 });
  } else if (editor.selected.type === "collectible") {
    const cloneX = supportedCollectibleX(selected.obj.id, selected.obj.x + 52, selected.obj.y);
    collectibles.push({ ...selected.obj, x: cloneX, y: supportedCollectibleY(selected.obj.id, cloneX, selected.obj.y), taken: false });
    selectEditorObject({ type: "collectible", index: collectibles.length - 1 });
  } else if (editor.selected.type === "enemy") {
    const clone = normalizeGhost({
      ...selected.obj,
      x: selected.obj.x + 150,
      minX: selected.obj.minX + 150,
      maxX: selected.obj.maxX + 150,
      spawnX: selected.obj.x + 150,
      alive: true,
    }, ghosts.length);
    ghosts.push(clone);
    selectEditorObject({ type: "enemy", index: ghosts.length - 1 });
  } else if (editor.selected.type === "traversal") {
    const clone = normalizeBoat({
      ...selected.obj,
      x: selected.obj.x + 210,
      minX: selected.obj.minX + 210,
      maxX: selected.obj.maxX + 210,
      spawnX: selected.obj.x + 210,
    }, boats.length);
    boats.push(clone);
    selectEditorObject({ type: "traversal", index: boats.length - 1 });
  }
  scheduleAutosave();
}

function deleteEditorAsset() {
  if (!editor.selected) return;
  if (editor.selected.type === "foreground") worldProps.splice(editor.selected.index, 1);
  if (editor.selected.type === "background") farBackgroundProps.splice(editor.selected.index, 1);
  if (editor.selected.type === "platform") platforms.splice(editor.selected.index, 1);
  if (editor.selected.type === "collectible") collectibles.splice(editor.selected.index, 1);
  if (editor.selected.type === "enemy" && ghosts.length > 1) ghosts.splice(editor.selected.index, 1);
  if (editor.selected.type === "traversal" && boats.length > 1) boats.splice(editor.selected.index, 1);
  editor.selected = null;
  syncEditorUI();
  scheduleAutosave();
}

async function deleteSelectedAssetClass() {
  const id = editorEls.asset.value;
  const definition = assetDefinitions[id];
  if (!id || !definition) {
    editorEls.status.textContent = "Editor mode: choose an asset class first";
    return;
  }

  const count = countAssetReferences(id);
  const prompt = count
    ? `Delete asset class "${id}" and remove ${count} placed instance${count === 1 ? "" : "s"} from this level?`
    : `Delete asset class "${id}" from the asset library?`;
  if (!window.confirm(prompt)) return;

  if (definition.customKey) await deleteAssetBlob(definition.customKey);
  clearCustomAssetCache(definition.customKey || id);
  delete assetDefinitions[id];
  if (!builtInAssetDefinitions[id]) delete defaultSizes[id];
  delete sprites?.props?.[id];
  deletedAssetIds.add(id);
  persistDeletedAssetIds();
  removeAssetReferences(id);
  removeAssetReferencesFromStoredLevels(id);
  editor.selected = null;

  rebuildAssetCatalog();
  populateTypeOptions();
  populateAssetOptions();
  syncEditorUI();
  scheduleAutosave(true);
  editorEls.status.textContent = `Editor mode: deleted asset class ${id}`;
}

function countAssetReferences(id) {
  return (
    worldProps.filter((item) => item.id === id).length +
    farBackgroundProps.filter((item) => item.id === id).length +
    platforms.filter((item) => item.id === id).length +
    collectibles.filter((item) => item.id === id).length +
    ghosts.filter((item) => item.id === id && id !== "ghost").length +
    boats.filter((item) => item.id === id && id !== "boat").length
  );
}

function removeAssetReferences(id) {
  worldProps = worldProps.filter((item) => item.id !== id);
  farBackgroundProps = farBackgroundProps.filter((item) => item.id !== id);
  platforms = platforms.filter((item) => item.id !== id);
  collectibles = collectibles.filter((item) => item.id !== id);
  for (const ghost of ghosts) {
    if (ghost.id === id && id !== "ghost") ghost.id = "ghost";
  }
  for (const currentBoat of boats) {
    if (currentBoat.id === id && id !== "boat") currentBoat.id = "boat";
  }
}

function removeAssetReferencesFromStoredLevels(id) {
  const levels = safeParseJson(localStorage.getItem(LEVELS_KEY), {});
  if (levels && typeof levels === "object") {
    for (const level of Object.values(levels)) removeAssetReferencesFromLevel(level, id);
    localStorage.setItem(LEVELS_KEY, JSON.stringify(levels));
  }
  const storedLevel = safeParseJson(localStorage.getItem(STORAGE_KEY), null);
  if (storedLevel && typeof storedLevel === "object") {
    removeAssetReferencesFromLevel(storedLevel, id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(storedLevel));
  }
}

function removeAssetReferencesFromLevel(level, id) {
  level.foreground = Array.isArray(level.foreground) ? level.foreground.filter((item) => item.id !== id) : level.foreground;
  level.background = Array.isArray(level.background) ? level.background.filter((item) => item.id !== id) : level.background;
  level.platforms = Array.isArray(level.platforms) ? level.platforms.filter((item) => item.id !== id) : level.platforms;
  level.collectibles = Array.isArray(level.collectibles) ? level.collectibles.filter((item) => item.id !== id) : level.collectibles;
  if (Array.isArray(level.ghosts)) {
    for (const ghost of level.ghosts) if (ghost.id === id && id !== "ghost") ghost.id = "ghost";
  }
  if (level.ghost?.id === id && id !== "ghost") level.ghost.id = "ghost";
  if (Array.isArray(level.boats)) {
    for (const currentBoat of level.boats) if (currentBoat.id === id && id !== "boat") currentBoat.id = "boat";
  }
  if (level.boat?.id === id && id !== "boat") level.boat.id = "boat";
  markAssetDeletedInLevel(level, id);
}

function markAssetDeletedInLevel(level, id) {
  const assets = Array.isArray(level.assets)
    ? { definitions: level.assets, deleted: [] }
    : level.assets && typeof level.assets === "object"
      ? level.assets
      : { definitions: [], deleted: [] };
  assets.definitions = Array.isArray(assets.definitions) ? assets.definitions.filter((definition) => definition.id !== id) : [];
  assets.deleted = Array.from(new Set([...(Array.isArray(assets.deleted) ? assets.deleted : []), id]));
  level.assets = assets;
}

function selectEditorObject(selection) {
  editor.selected = selection;
  const selected = getSelectedEditorObject();
  if (selected) {
    editorEls.type.value = selection.type;
    populateAssetOptions();
    if (selected.obj.id) editorEls.asset.value = selected.obj.id;
    syncAssetEditor();
  }
  syncEditorUI();
}

function getSelectedEditorObject() {
  if (!editor.selected) return null;
  let obj = null;
  if (editor.selected.type === "foreground") obj = worldProps[editor.selected.index];
  if (editor.selected.type === "background") obj = farBackgroundProps[editor.selected.index];
  if (editor.selected.type === "platform") obj = platforms[editor.selected.index];
  if (editor.selected.type === "collectible") obj = collectibles[editor.selected.index];
  if (editor.selected.type === "enemy") obj = ghosts[editor.selected.index];
  if (editor.selected.type === "traversal") obj = boats[editor.selected.index];
  if (!obj) return null;
  return { obj };
}

function syncEditorUI(updateFields = true) {
  if (!editorEls.camera) return;
  editorEls.camera.max = Math.max(0, WORLD_W - W);
  editorEls.camera.value = Math.round(camera);
  editorEls.width.value = WORLD_W;
  editorEls.waterX.value = Math.round(WATER.x);
  editorEls.waterW.value = Math.round(WATER.w);

  if (!updateFields) return;
  const selected = getSelectedEditorObject();
  const hasSelection = Boolean(selected);
  for (const input of [editorEls.x, editorEls.y, editorEls.w, editorEls.h, editorEls.alpha, editorEls.parallax]) {
    input.disabled = !hasSelection;
  }
  editorEls.deleteAssetClass.disabled = !assetDefinitions[editorEls.asset.value];
  const selectedType = editor.selected?.type;
  editorEls.delete.disabled =
    !hasSelection ||
    (selectedType === "traversal" && boats.length <= 1) ||
    (selectedType === "enemy" && ghosts.length <= 1);
  editorEls.duplicate.disabled = !hasSelection;
  if (!selected) {
    editorEls.x.value = "";
    editorEls.y.value = "";
    editorEls.w.value = "";
    editorEls.h.value = "";
    editorEls.alpha.value = "";
    editorEls.parallax.value = "";
    return;
  }

  const bounds = getEditorBounds(editor.selected);
  editorEls.x.value = Math.round(selected.obj.x);
  editorEls.y.value = Math.round(selected.obj.y);
  editorEls.w.value = Math.round(bounds.worldW);
  editorEls.h.value = Math.round(bounds.worldH);
  editorEls.alpha.value = selected.obj.a ?? 1;
  editorEls.parallax.value = selected.obj.p ?? (editor.selected.type === "background" ? 0.2 : 1);
}

function applyWaterFields() {
  WATER.x = clamp(Number(editorEls.waterX.value) || WATER.x, 0, WORLD_W - 220);
  WATER.w = clamp(Number(editorEls.waterW.value) || WATER.w, 260, WORLD_W - WATER.x);
  clampBoatsToWater();
  syncEditorUI(false);
  scheduleAutosave();
}

function clampBoatsToWater() {
  for (const currentBoat of boats) {
    const limits = boatMovementLimits(currentBoat);
    currentBoat.minX = limits.minX;
    currentBoat.maxX = limits.maxX;
    currentBoat.x = clamp(currentBoat.x, limits.minX, limits.maxX);
    currentBoat.spawnX = clamp(Number.isFinite(currentBoat.spawnX) ? currentBoat.spawnX : currentBoat.x, limits.minX, limits.maxX);
  }
}

function applyEditorFields() {
  const selected = getSelectedEditorObject();
  if (!selected) return;
  const obj = selected.obj;
  const nextX = Number(editorEls.x.value) || 0;
  const nextY = Number(editorEls.y.value) || 0;
  const dx = nextX - obj.x;
  const dy = nextY - obj.y;
  obj.x = nextX;
  obj.y = nextY;
  if (editor.selected.type === "enemy") {
    if (Number.isFinite(obj.minX)) obj.minX += dx;
    if (Number.isFinite(obj.maxX)) obj.maxX += dx;
    obj.spawnX = Number.isFinite(obj.spawnX) ? obj.spawnX + dx : obj.x;
    obj.baseY = Number.isFinite(obj.baseY) ? obj.baseY + dy : obj.y;
  } else if (editor.selected.type === "traversal") {
    if (Number.isFinite(obj.minX)) obj.minX += dx;
    if (Number.isFinite(obj.maxX)) obj.maxX += dx;
    obj.spawnX = Number.isFinite(obj.spawnX) ? obj.spawnX + dx : obj.x;
  }

  if (editor.selected.type === "foreground" || editor.selected.type === "background" || editor.selected.type === "platform") {
    obj.w = Math.max(8, Number(editorEls.w.value) || obj.w);
    obj.h = Math.max(8, Number(editorEls.h.value) || obj.h);
    const alpha = Number(editorEls.alpha.value);
    obj.a = clamp(Number.isFinite(alpha) ? alpha : obj.a || 1, 0, 1);
    if (editor.selected.type === "background") {
      const parallax = Number(editorEls.parallax.value);
      obj.p = clamp(Number.isFinite(parallax) ? parallax : obj.p || 0.2, 0, 1);
    }
  } else if (editor.selected.type === "collectible") {
    obj.x = supportedCollectibleX(obj.id, obj.x, obj.y);
    obj.y = supportedCollectibleY(obj.id, obj.x, obj.y);
    obj.taken = false;
  } else if (editor.selected.type === "enemy" || editor.selected.type === "traversal") {
    const id = obj.id || editorEls.asset.value;
    const nextSize = {
      w: Math.max(8, Number(editorEls.w.value) || defaultSizes[id]?.w || 96),
      h: Math.max(8, Number(editorEls.h.value) || defaultSizes[id]?.h || 96),
    };
    defaultSizes[id] = nextSize;
    if (assetDefinitions[id]) {
      assetDefinitions[id].defaultW = nextSize.w;
      assetDefinitions[id].defaultH = nextSize.h;
    }
  }
  scheduleAutosave();
}

function persistCurrentLevel({ updateJson = false, refreshLevels = false } = {}) {
  const name = levelName();
  const levels = readLevels();
  const level = captureLevel();
  levels[name] = level;
  try {
    localStorage.setItem(LEVELS_KEY, JSON.stringify(levels));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(level));
  } catch {
    editorEls.status.textContent = "Autosave failed: browser storage is full";
    return false;
  }
  editor.currentLevel = name;
  if (refreshLevels) refreshLevelOptions();
  if (updateJson) editorEls.json.value = JSON.stringify(level, null, 2);
  return true;
}

function scheduleAutosave(immediate = false) {
  window.clearTimeout(autosaveTimer);
  if (immediate) {
    persistCurrentLevel();
    return;
  }
  autosaveTimer = window.setTimeout(() => persistCurrentLevel(), 350);
}

function saveLevel() {
  const name = levelName();
  const saved = persistCurrentLevel({ updateJson: true, refreshLevels: true });
  if (!saved) return;
  editorEls.status.textContent = `Editor mode: saved ${name}`;
}

async function loadStoredLevel() {
  const levels = readLevels();
  const name = editorEls.levelSelect.value || editor.currentLevel;
  const level = levels[name];
  if (!level) {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      try {
        await applyLevel(JSON.parse(raw));
        editorEls.json.value = raw;
      } catch {
        editorEls.status.textContent = "Could not load saved level JSON";
      }
    }
    syncEditorUI();
    return;
  }
  try {
    await applyLevel(cloneLevel(level));
    editor.currentLevel = name;
    editorEls.levelName.value = name;
    editorEls.json.value = JSON.stringify(level, null, 2);
    editorEls.status.textContent = editor.active ? `Editor mode: loaded ${name}` : "Play mode";
  } catch {
    editorEls.status.textContent = "Could not load saved level JSON";
  }
}

function readLevels() {
  const shouldRefreshBuiltIns = localStorage.getItem(LEVEL_DEFAULTS_VERSION_KEY) !== LEVEL_DEFAULTS_VERSION;
  let parsed = {};
  try {
    parsed = JSON.parse(localStorage.getItem(LEVELS_KEY) || "{}") || {};
  } catch {
    // Ignore malformed local storage and rebuild below.
  }
  if (!parsed || typeof parsed !== "object") parsed = {};

  const levels = {};
  for (const [name, level] of Object.entries(parsed)) {
    if (shouldRefreshBuiltIns && builtInLevels[name]) continue;
    levels[name] = level;
  }
  for (const [name, level] of Object.entries(builtInLevels)) {
    if (shouldRefreshBuiltIns || !levels[name]) levels[name] = cloneLevel(level);
  }
  if (!Object.keys(levels).length) levels["Level 1"] = cloneLevel(defaultLevel);

  if (shouldRefreshBuiltIns) {
    try {
      localStorage.setItem(LEVELS_KEY, JSON.stringify(levels));
      localStorage.setItem(LEVEL_DEFAULTS_VERSION_KEY, LEVEL_DEFAULTS_VERSION);
    } catch {
      // The in-memory version still lets the game load if storage is full.
    }
  }
  return levels;
}

function refreshLevelOptions() {
  const levels = readLevels();
  if (!levels[editor.currentLevel]) editor.currentLevel = Object.keys(levels)[0] || "Level 1";
  editorEls.levelSelect.innerHTML = Object.keys(levels)
    .sort((a, b) => a.localeCompare(b))
    .map((name) => `<option value="${name}">${name}</option>`)
    .join("");
  editorEls.levelSelect.value = editor.currentLevel;
  editorEls.levelName.value = editor.currentLevel;
}

function levelName() {
  const name = String(editorEls.levelName.value || editor.currentLevel || "Level 1").trim();
  return name || "Level 1";
}

async function createLevel() {
  const levels = readLevels();
  const name = uniqueLevelName(levelName(), levels);
  levels[name] = cloneLevel(defaultLevel);
  localStorage.setItem(LEVELS_KEY, JSON.stringify(levels));
  editor.currentLevel = name;
  await applyLevel(cloneLevel(levels[name]));
  refreshLevelOptions();
  editorEls.status.textContent = `Editor mode: created ${name}`;
}

function uniqueLevelName(name, levels) {
  if (!levels[name]) return name;
  let count = 2;
  let next = `${name} ${count}`;
  while (levels[next]) {
    count += 1;
    next = `${name} ${count}`;
  }
  return next;
}

async function deleteLevel() {
  const levels = readLevels();
  const name = editorEls.levelSelect.value || editor.currentLevel;
  delete levels[name];
  if (!Object.keys(levels).length) levels["Level 1"] = cloneLevel(defaultLevel);
  localStorage.setItem(LEVELS_KEY, JSON.stringify(levels));
  editor.currentLevel = Object.keys(levels)[0];
  await applyLevel(cloneLevel(levels[editor.currentLevel]));
  refreshLevelOptions();
  editorEls.status.textContent = `Editor mode: deleted ${name}`;
}

function exportLevel() {
  setEditorTab("data");
  editorEls.json.value = JSON.stringify(captureLevel(), null, 2);
  editorEls.json.focus();
  editorEls.json.select();
}

async function importLevel() {
  try {
    await applyLevel(JSON.parse(editorEls.json.value));
    scheduleAutosave(true);
    editorEls.status.textContent = "Editor mode: imported JSON";
  } catch {
    editorEls.status.textContent = "Import failed: invalid JSON";
  }
}

function onEditorPointerDown(event) {
  if (!editor.active) return;
  const point = canvasPoint(event);
  const hit = hitEditorObject(point.x, point.y);
  if (hit) {
    selectEditorObject(hit);
    editor.dragging = true;
    editor.dragStart = { x: point.x, y: point.y };
  } else {
    editor.selected = null;
    syncEditorUI();
  }
}

function onEditorPointerMove(event) {
  if (!editor.active || !editor.dragging || !editor.selected) return;
  const point = canvasPoint(event);
  const dx = point.x - editor.dragStart.x;
  const dy = point.y - editor.dragStart.y;
  const selected = getSelectedEditorObject();
  if (!selected) return;
  selected.obj.x += dx;
  selected.obj.y += dy;
  if (editor.selected.type === "enemy") {
    if (Number.isFinite(selected.obj.minX)) selected.obj.minX += dx;
    if (Number.isFinite(selected.obj.maxX)) selected.obj.maxX += dx;
    selected.obj.spawnX = Number.isFinite(selected.obj.spawnX) ? selected.obj.spawnX + dx : selected.obj.x;
    selected.obj.baseY = Number.isFinite(selected.obj.baseY) ? selected.obj.baseY + dy : selected.obj.y;
  } else if (editor.selected.type === "traversal") {
    if (Number.isFinite(selected.obj.minX)) selected.obj.minX += dx;
    if (Number.isFinite(selected.obj.maxX)) selected.obj.maxX += dx;
    selected.obj.spawnX = Number.isFinite(selected.obj.spawnX) ? selected.obj.spawnX + dx : selected.obj.x;
  } else if (editor.selected.type === "collectible") {
    selected.obj.x = supportedCollectibleX(selected.obj.id, selected.obj.x, selected.obj.y);
    selected.obj.y = supportedCollectibleY(selected.obj.id, selected.obj.x, selected.obj.y);
    selected.obj.taken = false;
  }
  editor.dragStart = point;
  syncEditorUI();
}

function onEditorPointerUp() {
  if (editor.dragging) scheduleAutosave(true);
  editor.dragging = false;
}

function canvasPoint(event) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: ((event.clientX - rect.left) / rect.width) * W,
    y: ((event.clientY - rect.top) / rect.height) * H,
  };
}

function hitEditorObject(x, y) {
  const candidates = [
    ...boats.map((_, index) => ({ type: "traversal", index })).reverse(),
    ...ghosts.map((_, index) => ({ type: "enemy", index })).reverse(),
    ...collectibles.map((_, index) => ({ type: "collectible", index })).reverse(),
    ...platforms.map((_, index) => ({ type: "platform", index })).reverse(),
    ...worldProps.map((_, index) => ({ type: "foreground", index })).reverse(),
    ...farBackgroundProps.map((_, index) => ({ type: "background", index })).reverse(),
  ];
  return candidates.find((selection) => pointInRect(x, y, getEditorBounds(selection))) || null;
}

function getEditorBounds(selection) {
  if (selection.type === "foreground") {
    const prop = worldProps[selection.index];
    return { x: prop.x - camera, y: prop.y, w: prop.w, h: prop.h, worldW: prop.w, worldH: prop.h };
  }
  if (selection.type === "background") {
    const prop = farBackgroundProps[selection.index];
    return { x: prop.x - camera * prop.p, y: prop.y, w: prop.w, h: prop.h, worldW: prop.w, worldH: prop.h };
  }
  if (selection.type === "platform") {
    const platform = platforms[selection.index];
    return { x: platform.x - camera, y: platform.y, w: platform.w, h: platform.h, worldW: platform.w, worldH: platform.h };
  }
  if (selection.type === "collectible") {
    const item = collectibles[selection.index];
    const rect = collectibleRect(item);
    return { x: rect.x - camera, y: rect.y, w: rect.w, h: rect.h, worldW: rect.w, worldH: rect.h };
  }
  if (selection.type === "enemy") {
    const ghost = ghosts[selection.index] || ghosts[0] || normalizeGhost();
    const size = defaultSizes[ghost.id || "ghost"] || defaultSizes.ghost;
    return { x: ghost.x - camera - size.w / 2, y: ghost.y - size.h + 10, w: size.w, h: size.h, worldW: size.w, worldH: size.h };
  }
  const currentBoat = boats[selection.index] || boats[0] || normalizeBoat();
  const size = defaultSizes[currentBoat.id || "boat"] || defaultSizes.boat;
  return { x: currentBoat.x - camera, y: currentBoat.y - size.h + 10, w: size.w, h: size.h, worldW: size.w, worldH: size.h };
}

function drawEditorOverlay() {
  ctx.save();
  ctx.strokeStyle = "rgba(255, 223, 128, 0.74)";
  ctx.fillStyle = "rgba(255, 223, 128, 0.1)";
  ctx.lineWidth = 2;
  const all = [
    ...boats.map((_, index) => ({ type: "traversal", index })),
    ...ghosts.map((_, index) => ({ type: "enemy", index })),
    ...farBackgroundProps.map((_, index) => ({ type: "background", index })),
    ...worldProps.map((_, index) => ({ type: "foreground", index })),
    ...platforms.map((_, index) => ({ type: "platform", index })),
    ...collectibles.map((_, index) => ({ type: "collectible", index })),
  ];
  for (const selection of all) {
    const b = getEditorBounds(selection);
    if (b.x + b.w < 0 || b.x > W) continue;
    ctx.globalAlpha = editor.selected && editor.selected.type === selection.type && editor.selected.index === selection.index ? 1 : 0.34;
    ctx.fillRect(b.x, b.y, b.w, b.h);
    ctx.strokeRect(b.x, b.y, b.w, b.h);
  }
  ctx.globalAlpha = 1;
  ctx.fillStyle = "rgba(2, 5, 10, 0.58)";
  ctx.fillRect(18, H - 88, 348, 28);
  ctx.fillStyle = "#efe4c2";
  ctx.font = "14px Consolas, monospace";
  ctx.textAlign = "left";
  ctx.fillText("Editor: drag boxes, A/D pans, JSON saves the level", 28, H - 69);
  ctx.restore();
}

window.addEventListener("keydown", (event) => {
  const handled = ["ArrowLeft", "ArrowRight", "ArrowUp", "Space", "KeyA", "KeyD", "KeyW", "KeyX", "Enter"];
  if (handled.includes(event.code)) {
    unlockAudio();
    event.preventDefault();
    if (!keys.has(event.code)) pressed.add(event.code);
    keys.add(event.code);
  }
  if (gameState === "clear" && event.code === "Enter") {
    advanceToNextLevel();
  }
});

window.addEventListener("keyup", (event) => {
  keys.delete(event.code);
});

window.addEventListener("pointerdown", unlockAudio, { once: true });

start();
