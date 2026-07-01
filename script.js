/* =====================================================================
   THE CORRIDOR — script.js
   Full raycaster engine, ghost AI, puzzles, horror events, audio.
   ===================================================================== */

'use strict';

// -----------------------------------------------------------------------
// CANVAS & CONTEXT
// -----------------------------------------------------------------------
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d', { alpha: false });

// -----------------------------------------------------------------------
// MOBILE DETECTION & ADAPTIVE RESOLUTION
// -----------------------------------------------------------------------
const isMobile = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);

// Adaptive internal resolution: lower on mobile for 30-60 FPS targets
const RW = isMobile ? 480 : 640;
const RH = isMobile ? 270 : 360;
canvas.width = RW;
canvas.height = RH;
canvas.style.width = '100vw';
canvas.style.height = '100vh';

// Helper: request pointer lock only on desktop
function requestLock() {
    if(!isMobile) document.body.requestPointerLock();
}
function releaseLock() {
    if(!isMobile && document.pointerLockElement) document.exitPointerLock();
}

const minimapCanvas = document.getElementById('minimap');
const mCtx = minimapCanvas.getContext('2d');
minimapCanvas.width = 160;
minimapCanvas.height = 160;

const staticCanvas = document.getElementById('static-canvas');
const sCtx = staticCanvas.getContext('2d');
staticCanvas.width = 320;
staticCanvas.height = 180;

// -----------------------------------------------------------------------
// DOM REFS
// -----------------------------------------------------------------------
const hudEl             = document.getElementById('hud');
const flashOverlay      = document.getElementById('flash-overlay');
const bloodSplatter     = document.getElementById('blood-splatter');
const breathingOverlay  = document.getElementById('breathing-overlay');
const noteOverlay       = document.getElementById('note-overlay');
const noteBody          = document.getElementById('note-body');
const noteTitle         = document.getElementById('note-title');
const puzzleOverlay     = document.getElementById('puzzle-overlay');
const switchGrid        = document.getElementById('switch-grid');
const puzzleFeedback    = document.getElementById('puzzle-feedback');
const interactionPrompt = document.getElementById('interaction-prompt');
const crouchIndicator   = document.getElementById('crouch-indicator');
const hidingIndicator   = document.getElementById('hiding-indicator');
const breathBarContainer= document.getElementById('breath-bar-container');
const breathBar         = document.getElementById('breath-bar');
const healthBar         = document.getElementById('health-bar');
const staminaBar        = document.getElementById('stamina-bar');
const batteryBar        = document.getElementById('battery-bar');
const sanityText        = document.getElementById('sanity-text');
const objText           = document.getElementById('objective-text');
const timerText         = document.getElementById('timer-text');
const dirArrow          = document.getElementById('direction-arrow');
const dangerIcon        = document.getElementById('danger-icon');

// Menus
const mainMenu          = document.getElementById('main-menu');
const settingsMenu      = document.getElementById('settings-menu');
const pauseMenu         = document.getElementById('pause-menu');
const gameOverMenu      = document.getElementById('game-over-menu');
const victoryMenu       = document.getElementById('victory-menu');

// -----------------------------------------------------------------------
// SETTINGS
// -----------------------------------------------------------------------
let masterVolume    = 0.5;
let mouseSensitivity = 0.0025;
let fovPlane        = 0.66;

// -----------------------------------------------------------------------
// 30x30 MAP
// Cell values:
//   0 = walkable floor
//   1 = concrete wall
//   2 = exit door (locked / unlocked after all objectives)
//   3 = old wooden wall (darker)
//   4 = blood-stained wall
//   5 = safe room wall (cannot be entered by ghost)
// -----------------------------------------------------------------------
const MAP_W = 30, MAP_H = 30;
const WORLD_MAP = [
// Row  0         1         2         3
//      0123456789012345678901234567890
  [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
  [1,0,0,0,0,0,1,0,0,0,1,0,0,0,0,0,1,0,0,0,0,0,0,0,1,0,0,0,0,1],
  [1,0,1,1,1,0,1,0,1,0,1,0,1,1,1,0,1,0,1,1,1,1,1,0,1,0,1,1,0,1],
  [1,0,1,0,0,0,0,0,1,0,0,0,1,0,0,0,0,0,1,0,0,0,1,0,0,0,1,0,0,1],
  [1,0,1,0,1,1,1,1,1,1,1,1,1,0,1,1,1,0,1,0,1,0,1,1,1,1,1,0,1,1],
  [1,0,1,0,1,0,0,0,0,0,0,0,1,0,1,0,0,0,0,0,1,0,0,0,0,0,1,0,0,1],
  [1,0,1,0,1,0,1,1,1,1,1,0,1,0,1,0,1,1,1,0,1,1,1,1,1,0,1,1,0,1],
  [1,0,0,0,1,0,1,0,0,0,1,0,0,0,1,0,1,0,0,0,0,0,0,0,1,0,0,1,0,1],
  [1,1,1,1,1,0,1,0,1,0,1,1,1,0,1,0,1,0,1,1,1,1,1,0,1,0,1,1,0,1],
  [1,0,0,0,0,0,1,0,1,0,0,0,1,0,0,0,1,0,1,0,0,0,1,0,0,0,1,0,0,1],
  [1,0,1,1,1,1,1,0,1,1,1,0,1,1,1,1,1,0,1,0,1,0,1,1,1,1,1,0,1,1],
  [1,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,1],
  [1,0,1,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,1,1,1,1,1,1,1,1,0,1],
  [1,0,0,0,1,0,0,0,0,0,0,0,0,0,1,0,0,0,1,0,0,0,0,0,0,0,0,1,0,1],
  [1,1,1,0,1,0,1,1,1,1,1,1,1,0,1,0,1,0,1,1,1,1,1,0,1,1,0,1,0,1],
  [1,0,0,0,0,0,1,0,0,0,0,0,1,0,0,0,1,0,0,0,0,0,1,0,1,0,0,0,0,1],
  [1,0,1,1,1,1,1,0,1,1,1,0,1,1,1,1,1,1,1,1,1,0,1,0,1,0,1,1,1,1],
  [1,0,1,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,1,0,0,1],
  [1,0,1,0,1,1,1,1,1,0,1,1,1,1,1,1,1,1,1,0,1,1,1,1,1,0,1,0,1,1],
  [1,0,1,0,1,0,0,0,0,0,1,0,0,0,0,0,0,0,1,0,0,0,0,0,1,0,0,0,0,1],
  [1,0,0,0,1,0,1,1,1,0,1,0,1,1,1,1,1,0,1,0,1,1,1,0,1,1,1,1,0,1],
  [1,0,1,1,1,0,1,0,0,0,1,0,1,0,0,0,1,0,0,0,1,0,0,0,0,0,0,1,0,1],
  [1,0,1,0,0,0,1,0,1,1,1,0,1,0,1,0,1,1,1,1,1,0,1,1,1,1,0,1,0,1],
  [1,0,1,0,1,1,1,0,1,0,0,0,1,0,1,0,0,0,0,0,0,0,1,0,0,1,0,1,0,1],
  [1,0,0,0,1,0,0,0,1,0,1,1,1,0,1,1,1,1,1,1,1,0,1,0,1,1,0,1,0,1],
  [1,1,1,0,1,0,1,0,0,0,1,0,0,0,0,0,0,0,0,0,1,0,0,0,1,0,0,0,0,1],
  [1,0,0,0,0,0,1,1,1,0,1,0,1,1,1,1,1,1,1,0,1,1,1,0,1,0,1,1,1,1],
  [1,0,1,1,1,1,1,0,0,0,0,0,1,0,0,0,0,0,1,0,0,0,1,0,0,0,1,0,0,1],
  [1,0,0,0,0,0,0,0,1,1,1,0,1,0,1,1,1,0,1,1,1,0,1,1,1,0,1,0,2,1],
  [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1]
];

// Entity type constants
const ENT_KEY      = 'key';
const ENT_BATTERY  = 'battery';
const ENT_NOTE     = 'note';
const ENT_GHOST    = 'ghost';
const ENT_LOCKER   = 'locker';
const ENT_TABLE    = 'table';
const ENT_SWITCH   = 'switch';
const ENT_DOOR     = 'door';
const ENT_DUST     = 'dust';

// -----------------------------------------------------------------------
// GAME STATE
// -----------------------------------------------------------------------
let gameState      = 'MENU'; // MENU | PLAYING | PAUSED | DEAD | WON | NOTE | PUZZLE
let playTime       = 0;
let lastTime       = 0;
let bestTime       = parseFloat(localStorage.getItem('corridor_best_v3') || '0');

// Player State
let player = {
    x: 1.5, y: 28.5,
    dirX: 0, dirY: -1,
    planeX: fovPlane, planeY: 0,
    health: 100,
    stamina: 100,
    battery: 100,
    breath: 100,
    speed: 0,
    isSprinting: false,
    isCrouching: false,
    isHiding: false,
    holdingBreath: false,
    noiseLevel: 0
};

// Keys collected and objectives
let keysCollected   = 0;
const TOTAL_KEYS    = 3;
let powerRestored   = false;
let exitUnlocked    = false;
let currentObj      = 'Find Key 1/3';
let objTarget       = { x: 0, y: 0 }; // for direction arrow

// Explored map for minimap
let exploredMap = Array.from({length: MAP_H}, () => new Uint8Array(MAP_W));

// Keyboard state
const kDown = {};

// Ghost
const ghost = {
    x: 28.5, y: 1.5,
    state: 'PATROL', // PATROL | CHASE | SEARCH | IDLE
    speed: 2.0,
    targetX: 15, targetY: 15,
    lastHeardX: -1, lastHeardY: -1,
    aggression: 1.0,  // increases as game progresses
    glitchTimer: 0,
    visible: true,
    twitch: 0,
    patroltimer: 0,
    loseSightTimer: 0,
    attackCooldown: 0
};

// Entities list
let entities = [];

// Active note/puzzle being read
let activeNote = null;
let puzzleActive = false;
const PUZZLE_ANSWER = [1,0,1,0,1]; // 5 switches: on/off pattern
let puzzleState = [0,0,0,0,0];

// Dust particles
let dustParticles = [];

// Horror event timers
let horrorCooldown = 12;
let nextHorrorIn   = 12;

// Sanity
let sanity = 100; // 0-100, decreases near ghost and in dark

// -----------------------------------------------------------------------
// TEXTURES (Generated procedurally at startup using offscreen canvases)
// -----------------------------------------------------------------------
const TEX_SIZE = 128;
const textures = {}; // { concrete, wood, blood, door, ceiling, floor, ghost, key, battery, note, locker, switch }

function makeTexCanvas() {
    const c = document.createElement('canvas');
    c.width = TEX_SIZE; c.height = TEX_SIZE;
    return [c, c.getContext('2d')];
}

function rng(seed) {
    // Simple deterministic PRNG for consistent texture generation
    let s = seed;
    return function() {
        s = (s * 1664525 + 1013904223) & 0xFFFFFFFF;
        return (s >>> 0) / 0xFFFFFFFF;
    };
}

function generateTextures() {
    // ── CONCRETE WALL ──────────────────────────────────────────────────
    {
        const [c, x] = makeTexCanvas();
        const r = rng(42);
        // Base dark grey
        x.fillStyle = '#1e1e1e'; x.fillRect(0,0,TEX_SIZE,TEX_SIZE);
        // Noise pixels
        for(let i = 0; i < 4000; i++) {
            const px = (r() * TEX_SIZE)|0, py = (r() * TEX_SIZE)|0;
            const v = 14 + (r()*20)|0;
            x.fillStyle = `rgb(${v},${v},${v})`;
            x.fillRect(px, py, 2, 2);
        }
        // Horizontal grout lines
        for(let i = 16; i < TEX_SIZE; i += 16) {
            x.fillStyle = 'rgba(0,0,0,0.4)';
            x.fillRect(0, i, TEX_SIZE, 1);
        }
        // Vertical grout (staggered)
        for(let row = 0; row < TEX_SIZE/16; row++) {
            const offset = (row % 2) * 32;
            for(let col = offset; col < TEX_SIZE; col += 32) {
                x.fillStyle = 'rgba(0,0,0,0.35)';
                x.fillRect(col, row*16, 1, 16);
            }
        }
        textures.concrete = c;
    }

    // ── OLD WOOD WALL ──────────────────────────────────────────────────
    {
        const [c, x] = makeTexCanvas();
        const r = rng(77);
        x.fillStyle = '#1a0e06'; x.fillRect(0,0,TEX_SIZE,TEX_SIZE);
        // Wood grain lines
        for(let i = 0; i < TEX_SIZE; i++) {
            const v = 22 + (r()*16)|0;
            x.fillStyle = `rgb(${v+8},${(v*0.7)|0},${(v*0.4)|0})`;
            x.fillRect(0, i, TEX_SIZE, 1);
            // Grain noise
            for(let j = 0; j < 8; j++) {
                const px = (r()*TEX_SIZE)|0;
                const dv = (r()*12)|0;
                x.fillStyle = `rgba(${dv},${(dv*0.5)|0},0,0.4)`;
                x.fillRect(px, i, 3, 1);
            }
        }
        textures.wood = c;
    }

    // ── BLOOD WALL ─────────────────────────────────────────────────────
    {
        const [c, x] = makeTexCanvas();
        const r = rng(13);
        // Copy concrete look underneath
        x.fillStyle = '#1e1e1e'; x.fillRect(0,0,TEX_SIZE,TEX_SIZE);
        for(let i=0;i<3000;i++){
            const v=14+(r()*18)|0;
            x.fillStyle=`rgb(${v},${v},${v})`;
            x.fillRect((r()*TEX_SIZE)|0,(r()*TEX_SIZE)|0,2,2);
        }
        // Blood drips
        for(let d = 0; d < 8; d++) {
            const bx = (r()*TEX_SIZE)|0;
            const by = (r()*40)|0;
            const len = 20 + (r()*60)|0;
            const width = 2 + (r()*5)|0;
            const alpha = 0.5 + r()*0.5;
            x.fillStyle = `rgba(${120+(r()*60)|0},0,0,${alpha})`;
            x.fillRect(bx, by, width, len);
            // Drip blob
            x.beginPath();
            x.arc(bx + width/2, by+len, width*1.5, 0, Math.PI*2);
            x.fill();
        }
        textures.blood = c;
    }

    // ── DOOR ───────────────────────────────────────────────────────────
    {
        const [c, x] = makeTexCanvas();
        x.fillStyle = '#3d2010'; x.fillRect(0,0,TEX_SIZE,TEX_SIZE);
        // Panels
        x.fillStyle = '#2a1508';
        x.fillRect(8,8,TEX_SIZE-16,TEX_SIZE/2-12);
        x.fillRect(8,TEX_SIZE/2+4,TEX_SIZE-16,TEX_SIZE/2-12);
        // Border lines
        x.strokeStyle = '#1a0c04'; x.lineWidth = 2;
        x.strokeRect(4,4,TEX_SIZE-8,TEX_SIZE-8);
        // Door handle
        x.fillStyle = '#888';
        x.fillRect(TEX_SIZE-18,TEX_SIZE/2-5,8,10);
        x.fillStyle = '#555';
        x.beginPath(); x.arc(TEX_SIZE-18,TEX_SIZE/2,4,0,Math.PI*2); x.fill();
        textures.door = c;
    }

    // ── FLOOR ──────────────────────────────────────────────────────────
    {
        const [c, x] = makeTexCanvas();
        const r = rng(99);
        x.fillStyle = '#141414'; x.fillRect(0,0,TEX_SIZE,TEX_SIZE);
        for(let i=0;i<6000;i++){
            const v=10+(r()*12)|0;
            x.fillStyle=`rgb(${v},${v},${v-2})`;
            x.fillRect((r()*TEX_SIZE)|0,(r()*TEX_SIZE)|0,1,1);
        }
        // Tile grid
        for(let i=0;i<TEX_SIZE;i+=32){
            x.fillStyle='rgba(0,0,0,0.5)';
            x.fillRect(i,0,1,TEX_SIZE);
            x.fillRect(0,i,TEX_SIZE,1);
        }
        // Dirt smudges
        for(let i=0;i<12;i++){
            x.fillStyle=`rgba(0,0,0,${0.2+r()*0.3})`;
            x.beginPath();
            x.ellipse((r()*TEX_SIZE)|0,(r()*TEX_SIZE)|0,10+r()*20,5+r()*10,r()*Math.PI,0,Math.PI*2);
            x.fill();
        }
        textures.floor = c;
    }

    // ── CEILING ────────────────────────────────────────────────────────
    {
        const [c, x] = makeTexCanvas();
        const r = rng(55);
        x.fillStyle = '#0a0a0a'; x.fillRect(0,0,TEX_SIZE,TEX_SIZE);
        for(let i=0;i<2000;i++){
            const v=5+(r()*10)|0;
            x.fillStyle=`rgb(${v},${v},${v})`;
            x.fillRect((r()*TEX_SIZE)|0,(r()*TEX_SIZE)|0,2,2);
        }
        textures.ceiling = c;
    }

    // ── GHOST SPRITE ───────────────────────────────────────────────────
    {
        const [c, x] = makeTexCanvas();
        // Transparent background
        x.clearRect(0,0,TEX_SIZE,TEX_SIZE);
        // Dress/Body
        const grd = x.createRadialGradient(64,80,0,64,80,50);
        grd.addColorStop(0,'rgba(240,240,255,0.92)');
        grd.addColorStop(1,'rgba(200,200,230,0.0)');
        x.fillStyle = grd;
        x.beginPath();
        x.moveTo(35,40);
        x.bezierCurveTo(20,90,25,128,40,128);
        x.lineTo(88,128);
        x.bezierCurveTo(103,128,108,90,93,40);
        x.closePath();
        x.fill();
        // Head
        x.fillStyle = 'rgba(230,230,245,0.9)';
        x.beginPath(); x.ellipse(64,36,22,26,0,0,Math.PI*2); x.fill();
        // Hair — long black
        x.fillStyle = 'rgba(5,5,10,0.95)';
        x.beginPath();
        x.moveTo(42,20);
        x.bezierCurveTo(30,60,20,90,22,128);
        x.lineTo(35,128);
        x.bezierCurveTo(32,90,42,55,50,20);
        x.closePath(); x.fill();
        x.beginPath();
        x.moveTo(86,20);
        x.bezierCurveTo(98,60,108,90,106,128);
        x.lineTo(93,128);
        x.bezierCurveTo(96,90,84,55,78,20);
        x.closePath(); x.fill();
        // Top hair
        x.beginPath(); x.ellipse(64,18,24,10,0,0,Math.PI*2); x.fill();
        // Eyes — red glow
        x.fillStyle = '#ff0000';
        x.shadowColor = '#ff0000'; x.shadowBlur = 12;
        x.beginPath(); x.ellipse(54,36,5,3,0,0,Math.PI*2); x.fill();
        x.beginPath(); x.ellipse(74,36,5,3,0,0,Math.PI*2); x.fill();
        x.shadowBlur = 0;
        textures.ghost = c;
    }

    // ── KEY ────────────────────────────────────────────────────────────
    {
        const [c, x] = makeTexCanvas();
        x.clearRect(0,0,TEX_SIZE,TEX_SIZE);
        x.fillStyle = '#e0c030'; x.shadowColor='#ffd700'; x.shadowBlur=20;
        x.beginPath(); x.arc(50,45,20,0,Math.PI*2); x.fill();
        x.fillStyle = '#1a1205';
        x.beginPath(); x.arc(50,45,12,0,Math.PI*2); x.fill();
        x.fillStyle = '#e0c030';
        x.fillRect(62,42,32,10);
        x.fillRect(82,36,10,10);
        x.fillRect(90,36,10,10);
        x.shadowBlur=0;
        textures.key = c;
    }

    // ── BATTERY ────────────────────────────────────────────────────────
    {
        const [c, x] = makeTexCanvas();
        x.clearRect(0,0,TEX_SIZE,TEX_SIZE);
        x.fillStyle = '#303030'; x.fillRect(30,30,68,68);
        x.fillStyle = '#222'; x.fillRect(55,20,18,10);
        x.fillStyle = '#00cc44'; x.shadowColor='#00ff55'; x.shadowBlur=15;
        x.fillRect(34,70,60,20);
        x.fillStyle = '#005522'; x.fillRect(34,50,60,20);
        x.shadowBlur=0;
        textures.battery = c;
    }

    // ── NOTE ───────────────────────────────────────────────────────────
    {
        const [c, x] = makeTexCanvas();
        x.clearRect(0,0,TEX_SIZE,TEX_SIZE);
        x.fillStyle = '#e8e2c0'; x.fillRect(25,15,80,100);
        x.fillStyle = '#1a1208';
        for(let i=30;i<100;i+=12) x.fillRect(30,i,70,2);
        textures.note = c;
    }

    // ── LOCKER ─────────────────────────────────────────────────────────
    {
        const [c, x] = makeTexCanvas();
        x.fillStyle = '#2a3a2a'; x.fillRect(0,0,TEX_SIZE,TEX_SIZE);
        x.strokeStyle = '#1a2a1a'; x.lineWidth=2;
        x.strokeRect(5,5,TEX_SIZE-10,TEX_SIZE-10);
        x.strokeRect(5,5,TEX_SIZE-10,TEX_SIZE/2-5);
        x.fillStyle = '#555'; x.fillRect(TEX_SIZE-20,TEX_SIZE/4-5,8,10);
        textures.locker = c;
    }

    // ── SWITCH ─────────────────────────────────────────────────────────
    {
        const [c, x] = makeTexCanvas();
        x.fillStyle = '#1a1a1a'; x.fillRect(0,0,TEX_SIZE,TEX_SIZE);
        x.fillStyle = '#333'; x.fillRect(20,20,TEX_SIZE-40,TEX_SIZE-40);
        // Switch levers
        for(let i=0;i<5;i++) {
            const sx = 30 + i*18;
            x.fillStyle = '#555'; x.fillRect(sx,35,10,58);
            x.fillStyle = '#0f0'; x.fillRect(sx,35,10,25);
        }
        textures.switch = c;
    }
}
generateTextures();

// -----------------------------------------------------------------------
// ENTITY SETUP
// -----------------------------------------------------------------------
const loreNotes = [
    { x:5.5,  y:5.5,  title:"Journal — Day 1",
      msg:"We found the door at the end of the south hall. Something is carved into it. A warning, perhaps. Anika says we should leave. I told her we're scientists, not cowards. I was wrong." },
    { x:15.5, y:11.5, title:"Maintenance Log",
      msg:"Generator room is in block C, north corridor. The power has been cut. Without it the security door won't open. There are three fuse keys scattered around the basement. Do NOT go alone." },
    { x:7.5,  y:19.5, title:"Torn Page",
      msg:"She follows the sound. If you must run, run far and then hide and wait. The lockers in storage block B are safe. She cannot reach inside. But don't breathe. She can hear your breathing." },
    { x:25.5, y:3.5,  title:"Warning — DANGER",
      msg:"DO NOT TURN OFF YOUR LIGHT. The dark feeds her. She grows stronger when you cannot see. Even a dying flashlight is better than nothing. Find batteries in the storage room and generator block." },
    { x:19.5, y:25.5, title:"Final Entry",
      msg:"The power switch is in the generator room at coordinates north-east of the main hall. The pattern is: ON — OFF — ON — OFF — ON. Get it wrong and she will know. Get it right and run." }
];

function initEntities() {
    entities = [];
    // 3 Keys
    entities.push({type:ENT_KEY, x:3.5,  y:3.5,  id:'key1'});
    entities.push({type:ENT_KEY, x:27.5, y:15.5, id:'key2'});
    entities.push({type:ENT_KEY, x:11.5, y:27.5, id:'key3'});
    // Batteries
    entities.push({type:ENT_BATTERY, x:9.5,  y:7.5});
    entities.push({type:ENT_BATTERY, x:21.5, y:21.5});
    entities.push({type:ENT_BATTERY, x:15.5, y:5.5});
    entities.push({type:ENT_BATTERY, x:5.5,  y:25.5});
    // Notes
    loreNotes.forEach(n => entities.push({type:ENT_NOTE, x:n.x, y:n.y, title:n.title, msg:n.msg}));
    // Switch Puzzle (power restoration)
    entities.push({type:ENT_SWITCH, x:25.5, y:5.5, id:'power'});
    // Lockers for hiding
    entities.push({type:ENT_LOCKER, x:5.5,  y:17.5});
    entities.push({type:ENT_LOCKER, x:23.5, y:9.5});
}

function initDust() {
    dustParticles = [];
    for(let i=0;i<30;i++) {
        dustParticles.push({
            x: (Math.random()*RW)|0,
            y: (Math.random()*RH)|0,
            size: 0.5+Math.random()*1.5,
            speed: 0.1+Math.random()*0.3,
            alpha: 0.1+Math.random()*0.3,
            life: Math.random()
        });
    }
}
initDust();

// -----------------------------------------------------------------------
// AUDIO ENGINE (Web Audio API — entirely procedural)
// -----------------------------------------------------------------------
let audioCtx = null;
let masterGain = null;
let heartbeatNode = null;
let ambienceLoop = null;

function initAudio() {
    if(audioCtx) return;
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    masterGain = audioCtx.createGain();
    masterGain.gain.value = masterVolume;
    masterGain.connect(audioCtx.destination);
    startAmbience();
    startHeartbeat();
}

function resumeAudioCtx() {
    if(audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
}

function setGain(node, vol, time=0) {
    if(!node) return;
    if(time > 0) node.gain.linearRampToValueAtTime(vol, audioCtx.currentTime + time);
    else node.gain.setValueAtTime(vol, audioCtx.currentTime);
}

function makeGain(vol=1) {
    const g = audioCtx.createGain();
    g.gain.value = vol;
    g.connect(masterGain);
    return g;
}

function playTone(freq, type, duration, volume=0.4, ramp=true) {
    if(!audioCtx) return;
    const osc = audioCtx.createOscillator();
    const g = makeGain(volume);
    osc.type = type; osc.frequency.value = freq;
    osc.connect(g);
    if(ramp) g.gain.setValueAtTime(volume, audioCtx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
    osc.start(); osc.stop(audioCtx.currentTime + duration);
}

function playNoise(duration, volume=0.3, filterFreq=1200) {
    if(!audioCtx) return;
    const bufSize = audioCtx.sampleRate * duration;
    const buf = audioCtx.createBuffer(1, bufSize, audioCtx.sampleRate);
    const data = buf.getChannelData(0);
    for(let i=0;i<bufSize;i++) data[i]=Math.random()*2-1;
    const src = audioCtx.createBufferSource();
    src.buffer = buf;
    const flt = audioCtx.createBiquadFilter();
    flt.type = 'bandpass'; flt.frequency.value = filterFreq; flt.Q.value = 0.5;
    const g = makeGain(volume);
    src.connect(flt); flt.connect(g);
    g.gain.setValueAtTime(volume, audioCtx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
    src.start(); src.stop(audioCtx.currentTime + duration);
}

function playDoorSlam() {
    if(!audioCtx) return;
    playTone(60, 'sawtooth', 0.08, 0.9);
    setTimeout(() => playTone(40, 'sine', 0.4, 0.5), 80);
    playNoise(0.2, 0.8, 300);
}

function playScream() {
    if(!audioCtx) return;
    playNoise(2.5, 1.0, 800);
    playTone(400, 'sawtooth', 0.3, 0.7);
    setTimeout(() => playNoise(1.5, 0.8, 600), 300);
}

function playPickup() {
    if(!audioCtx) return;
    playTone(880, 'sine', 0.15, 0.3);
    setTimeout(() => playTone(1100, 'sine', 0.15, 0.2), 100);
}

function playClickSFX() {
    if(!audioCtx) return;
    playNoise(0.05, 0.4, 2000);
}

function startAmbience() {
    if(!audioCtx || ambienceLoop) return;
    const bufSize = audioCtx.sampleRate * 4;
    const buf = audioCtx.createBuffer(1, bufSize, audioCtx.sampleRate);
    const data = buf.getChannelData(0);
    for(let i=0;i<bufSize;i++) data[i]=Math.random()*2-1;
    const src = audioCtx.createBufferSource();
    src.buffer = buf; src.loop = true;
    const flt = audioCtx.createBiquadFilter();
    flt.type = 'lowpass'; flt.frequency.value = 300;
    const g = makeGain(0.06);
    src.connect(flt); flt.connect(g);
    src.start();
    ambienceLoop = {src, g};
}

function startHeartbeat() {
    if(!audioCtx || heartbeatNode) return;
    heartbeatNode = {active: true};
    const beat = () => {
        if(!heartbeatNode || !heartbeatNode.active) return;
        const dist = distToGhost();
        if(dist < 12 && gameState === 'PLAYING') {
            const vol = Math.max(0.05, 0.8 * (1 - dist/12));
            const bpm = 60 + (1 - dist/12) * 100;
            playTone(50, 'sine', 0.12, vol * 0.8);
            setTimeout(() => playTone(50, 'sine', 0.1, vol * 0.5), 150);
            setTimeout(beat, (60000/bpm)|0);
        } else {
            setTimeout(beat, 1200);
        }
    };
    setTimeout(beat, 2000);
}

function playWhisper() {
    if(!audioCtx) return;
    const freqs = [200,250,180,220,190];
    freqs.forEach((f, i) => setTimeout(() => {
        const osc = audioCtx.createOscillator();
        const g = makeGain(0.05);
        osc.type='sine'; osc.frequency.value = f + Math.random()*50;
        osc.connect(g);
        g.gain.setValueAtTime(0.05, audioCtx.currentTime);
        g.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 1.5);
        osc.start(); osc.stop(audioCtx.currentTime + 1.5);
    }, i*200));
}

function playFootsteps() {
    if(!audioCtx) return;
    playNoise(0.08, 0.25, 200);
}

function playStaticSFX() {
    if(!audioCtx) return;
    playNoise(0.5, 0.7, 3000);
}

// -----------------------------------------------------------------------
// MAP HELPERS
// -----------------------------------------------------------------------
function mapAt(x, y) {
    const mx = x|0, my = y|0;
    if(mx<0||mx>=MAP_W||my<0||my>=MAP_H) return 1;
    return WORLD_MAP[my][mx];
}

function isWalkable(x, y) {
    const v = mapAt(x,y);
    return v === 0 || (v === 2 && exitUnlocked);
}

function isWall(x, y) { return !isWalkable(x,y); }

function distToGhost() {
    const dx = player.x - ghost.x, dy = player.y - ghost.y;
    return Math.sqrt(dx*dx+dy*dy);
}

// -----------------------------------------------------------------------
// BFS PATHFINDING (for Ghost)
// -----------------------------------------------------------------------
function bfsNextStep(sx, sy, tx, ty) {
    const key = (x,y) => y * MAP_W + x;
    const start = {x:sx|0, y:sy|0};
    const goal  = {x:tx|0, y:ty|0};
    if(start.x===goal.x && start.y===goal.y) return null;

    const visited = new Set();
    const queue = [{x:start.x, y:start.y, parent:null}];
    visited.add(key(start.x,start.y));
    const dirs = [{x:0,y:-1},{x:1,y:0},{x:0,y:1},{x:-1,y:0}];

    while(queue.length) {
        const curr = queue.shift();
        if(curr.x===goal.x && curr.y===goal.y) {
            // Trace back to first step
            let n = curr;
            while(n.parent && (n.parent.x!==start.x || n.parent.y!==start.y)) n = n.parent;
            return n;
        }
        for(const d of dirs) {
            const nx = curr.x+d.x, ny = curr.y+d.y;
            const k = key(nx,ny);
            if(!visited.has(k) && mapAt(nx,ny)===0) {
                visited.add(k);
                queue.push({x:nx,y:ny,parent:curr});
            }
        }
    }
    return null;
}

// -----------------------------------------------------------------------
// RAYCASTER ENGINE
// -----------------------------------------------------------------------
function render(delta) {
    // Floor & ceiling casting (textured)
    const halfH = RH/2;
    const rowDir_left_x  = player.dirX - player.planeX;
    const rowDir_left_y  = player.dirY - player.planeY;
    const rowDir_right_x = player.dirX + player.planeX;
    const rowDir_right_y = player.dirY + player.planeY;

    const floorImg  = ctx.createImageData(RW, RH);
    const data = floorImg.data;

    // Sample from texture canvases (convert to raw pixel data once)
    const floorPixels   = textures.floor.getContext('2d').getImageData(0,0,TEX_SIZE,TEX_SIZE).data;
    const ceilPixels    = textures.ceiling.getContext('2d').getImageData(0,0,TEX_SIZE,TEX_SIZE).data;

    for(let y = halfH|0; y < RH; y++) {
        const isFloor = (y >= halfH);
        const rowDist = halfH / (y - halfH + 0.001);

        const floorStepX = rowDist * (rowDir_right_x - rowDir_left_x) / RW;
        const floorStepY = rowDist * (rowDir_right_y - rowDir_left_y) / RW;

        let floorX = player.x + rowDist * rowDir_left_x;
        let floorY = player.y + rowDist * rowDir_left_y;

        const fog = Math.min(1, rowDist / 6);
        const brightness = Math.max(0, 1 - fog) * (flashlightBrightness());

        for(let x = 0; x < RW; x++) {
            const tx = ((floorX * TEX_SIZE) & (TEX_SIZE-1));
            const ty = ((floorY * TEX_SIZE) & (TEX_SIZE-1));
            const tidx = ((ty|0)*TEX_SIZE + (tx|0))*4;

            const src = isFloor ? floorPixels : ceilPixels;
            const r = (src[tidx]   * brightness) | 0;
            const g = (src[tidx+1] * brightness) | 0;
            const b = (src[tidx+2] * brightness) | 0;

            const pidx = (y * RW + x) * 4;
            data[pidx]   = r; data[pidx+1] = g; data[pidx+2] = b; data[pidx+3] = 255;

            // Mirror for ceiling
            const cpidx = ((RH-1-y) * RW + x) * 4;
            const cr = (ceilPixels[tidx] * brightness * 0.4) | 0;
            const cg = (ceilPixels[tidx+1] * brightness * 0.4) | 0;
            const cb = (ceilPixels[tidx+2] * brightness * 0.4) | 0;
            data[cpidx]   = cr; data[cpidx+1] = cg; data[cpidx+2] = cb; data[cpidx+3] = 255;

            floorX += floorStepX; floorY += floorStepY;
        }
    }
    ctx.putImageData(floorImg, 0, 0);

    // Wall raycasting
    const zBuf = new Float32Array(RW);
    const wallData = ctx.createImageData(RW, RH);
    const wd = wallData.data;

    const concretePixels = textures.concrete.getContext('2d').getImageData(0,0,TEX_SIZE,TEX_SIZE).data;
    const bloodPixels    = textures.blood.getContext('2d').getImageData(0,0,TEX_SIZE,TEX_SIZE).data;
    const doorPixels     = textures.door.getContext('2d').getImageData(0,0,TEX_SIZE,TEX_SIZE).data;
    const woodPixels     = textures.wood.getContext('2d').getImageData(0,0,TEX_SIZE,TEX_SIZE).data;

    const maxDist = flashlightOn() ? 9.5 : 2.8;
    const flickerMod = getFlickerMod();

    for(let x = 0; x < RW; x++) {
        const camX = 2 * x / RW - 1;
        const rDirX = player.dirX + player.planeX * camX;
        const rDirY = player.dirY + player.planeY * camX;

        let mapX = player.x|0, mapY = player.y|0;
        const dDX = Math.abs(1/rDirX), dDY = Math.abs(1/rDirY);
        let sideDistX, sideDistY, stepX, stepY;

        if(rDirX<0) { stepX=-1; sideDistX=(player.x-mapX)*dDX; }
        else        { stepX= 1; sideDistX=(mapX+1-player.x)*dDX; }
        if(rDirY<0) { stepY=-1; sideDistY=(player.y-mapY)*dDY; }
        else        { stepY= 1; sideDistY=(mapY+1-player.y)*dDY; }

        let side=0, hit=0, hitVal=0, perpDist=0;
        for(let i=0;i<64;i++) {
            if(sideDistX < sideDistY) { sideDistX+=dDX; mapX+=stepX; side=0; }
            else                       { sideDistY+=dDY; mapY+=stepY; side=1; }
            hitVal = mapAt(mapX, mapY);
            if(hitVal > 0) { hit=1; break; }
        }

        perpDist = side===0 ? (mapX-player.x+(1-stepX)/2)/rDirX : (mapY-player.y+(1-stepY)/2)/rDirY;
        if(perpDist <= 0) perpDist = 0.01;
        zBuf[x] = perpDist;

        const lineH = (RH / perpDist)|0;
        const drawStart = Math.max(0, (-lineH/2+RH/2)|0);
        const drawEnd   = Math.min(RH-1, (lineH/2+RH/2)|0);

        let wallX = side===0 ? player.y + perpDist*rDirY : player.x + perpDist*rDirX;
        wallX -= Math.floor(wallX);
        let texCol = (wallX * TEX_SIZE)|0;
        if((side===0 && rDirX>0)||(side===1 && rDirY<0)) texCol = TEX_SIZE - texCol - 1;
        if(texCol<0) texCol=0;
        if(texCol>=TEX_SIZE) texCol=TEX_SIZE-1;

        // Pick texture based on cell type
        let srcPix = concretePixels;
        if(hitVal === 3) srcPix = woodPixels;
        if(hitVal === 4) srcPix = bloodPixels;
        if(hitVal === 2) srcPix = doorPixels;

        // Flashlight cone (brighter in center of screen)
        const coneFactor = 1 - Math.abs(camX) * 0.7;
        const dist = perpDist;
        const fogAmount = Math.min(1, dist / maxDist);
        const baseBright = Math.max(0, (1-fogAmount) * flickerMod * coneFactor);
        const sideDim = side===1 ? 0.65 : 1.0;
        const brightness = baseBright * sideDim;

        const texStep = TEX_SIZE / lineH;
        let texPos = (drawStart - RH/2 + lineH/2) * texStep;

        for(let y = drawStart; y <= drawEnd; y++) {
            const ty = Math.min(TEX_SIZE-1, (texPos)|0);
            texPos += texStep;
            const tidx = (ty * TEX_SIZE + texCol) * 4;
            const r = (srcPix[tidx]   * brightness)|0;
            const g = (srcPix[tidx+1] * brightness)|0;
            const b = (srcPix[tidx+2] * brightness)|0;
            const pidx = (y * RW + x) * 4;
            wd[pidx]  =r; wd[pidx+1]=g; wd[pidx+2]=b; wd[pidx+3]=255;
        }
    }
    ctx.putImageData(wallData, 0, 0);

    // Sort & render sprites
    let visEnts = entities.filter(e=>e.type!==ENT_LOCKER && e.type!==ENT_SWITCH && e.type!==ENT_DOOR).map(e=>{
        const dx=e.x-player.x, dy=e.y-player.y;
        return {...e, dist:dx*dx+dy*dy};
    });
    if(ghost.visible && ghost.glitchTimer < 0.8) {
        visEnts.push({type:ENT_GHOST, x:ghost.x, y:ghost.y, dist:(ghost.x-player.x)**2+(ghost.y-player.y)**2});
    }
    visEnts.sort((a,b)=>b.dist-a.dist);

    const invDet = 1.0 / (player.planeX*player.dirY - player.dirX*player.planeY);

    const ghostPix   = textures.ghost.getContext('2d').getImageData(0,0,TEX_SIZE,TEX_SIZE).data;
    const keyPix     = textures.key.getContext('2d').getImageData(0,0,TEX_SIZE,TEX_SIZE).data;
    const battPix    = textures.battery.getContext('2d').getImageData(0,0,TEX_SIZE,TEX_SIZE).data;
    const notePix    = textures.note.getContext('2d').getImageData(0,0,TEX_SIZE,TEX_SIZE).data;

    for(const e of visEnts) {
        const spX = e.x - player.x, spY = e.y - player.y;
        const tX = invDet*(player.dirY*spX - player.dirX*spY);
        const tY = invDet*(-player.planeY*spX + player.planeX*spY);
        if(tY <= 0.1) continue;

        const screenX = ((RW/2)*(1+tX/tY))|0;
        const sprH = Math.abs((RH/tY))|0;
        const dsy = Math.max(0,(-sprH/2+RH/2)|0);
        const dey = Math.min(RH-1,(sprH/2+RH/2)|0);
        const sprW = sprH;
        const dsx = Math.max(0,(-sprW/2+screenX)|0);
        const dex = Math.min(RW-1,(sprW/2+screenX)|0);

        // Sprite fog
        const sFog = Math.min(1, tY / maxDist);
        if(sFog >= 1) continue;
        const sBright = (1-sFog) * flickerMod;

        let srcPix2 = notePix;
        if(e.type===ENT_GHOST)   srcPix2 = ghostPix;
        if(e.type===ENT_KEY)     srcPix2 = keyPix;
        if(e.type===ENT_BATTERY) srcPix2 = battPix;

        for(let sx=dsx; sx<dex; sx++) {
            if(tY >= zBuf[sx]) continue;
            const texX = ((sx - (-sprW/2+screenX)) * TEX_SIZE / sprW)|0;
            const clamped = Math.max(0,Math.min(TEX_SIZE-1,texX));

            for(let sy=dsy; sy<dey; sy++) {
                const texY = ((sy-(dsy))*TEX_SIZE/(dey-dsy+1))|0;
                const tidx = (Math.min(TEX_SIZE-1,texY)*TEX_SIZE+clamped)*4;
                if(srcPix2[tidx+3] < 30) continue;
                let r=(srcPix2[tidx]*sBright)|0;
                let g=(srcPix2[tidx+1]*sBright)|0;
                let b=(srcPix2[tidx+2]*sBright)|0;
                // Ghost red tint
                if(e.type===ENT_GHOST && ghost.glitchTimer>0) {
                    r=Math.min(255,r+60); g=(g*0.3)|0; b=(b*0.3)|0;
                }
                const pidx=(sy*RW+sx)*4;
                wd[pidx]=r; wd[pidx+1]=g; wd[pidx+2]=b; wd[pidx+3]=255;
            }
        }
    }
    ctx.putImageData(wallData,0,0);

    // Dust particles
    renderDust();
}

// -----------------------------------------------------------------------
// FLASHLIGHT HELPERS
// -----------------------------------------------------------------------
let flickerValue = 1.0;
let flickerTimer = 0;

function flashlightOn() {
    return player.battery > 0;
}

function flashlightBrightness() {
    if(player.battery <= 0) return 0.04;
    const base = Math.min(1, player.battery/100);
    return base * flickerValue;
}

function getFlickerMod() {
    if(player.battery <= 0) return 0.04;
    return flickerValue * Math.min(1, player.battery / 100);
}

function updateFlicker(delta) {
    if(player.battery < 20) {
        flickerTimer += delta;
        if(flickerTimer > 0.1 + Math.random()*0.2) {
            flickerTimer = 0;
            flickerValue = 0.3 + Math.random()*0.7;
        }
    } else {
        flickerValue = 1.0;
    }
}

// -----------------------------------------------------------------------
// DUST PARTICLES
// -----------------------------------------------------------------------
function renderDust() {
    dustParticles.forEach(p => {
        const alpha = p.alpha * (flashlightBrightness());
        if(alpha < 0.02) return;
        ctx.fillStyle = `rgba(200,180,150,${alpha})`;
        ctx.fillRect(p.x, p.y, p.size, p.size);
    });
}

function updateDust(delta) {
    dustParticles.forEach(p => {
        p.y -= p.speed * delta * 30;
        p.life += delta * 0.1;
        if(p.y < 0 || p.life > 1) {
            p.x = (Math.random()*RW)|0;
            p.y = RH;
            p.life = 0;
            p.alpha = 0.1+Math.random()*0.3;
        }
    });
}

// -----------------------------------------------------------------------
// MINIMAP
// -----------------------------------------------------------------------
function drawMinimap() {
    mCtx.clearRect(0,0,160,160);
    const cellSize = 160 / MAP_W;

    for(let y=0;y<MAP_H;y++) {
        for(let x=0;x<MAP_W;x++) {
            if(!exploredMap[y][x]) continue;
            const v = WORLD_MAP[y][x];
            if(v===1)      mCtx.fillStyle='#3a3a3a';
            else if(v===2) mCtx.fillStyle= exitUnlocked ? '#00ff66' : '#aa2222';
            else           mCtx.fillStyle='#888';
            mCtx.fillRect(x*cellSize, y*cellSize, cellSize, cellSize);
        }
    }

    // Entities on map if explored
    entities.forEach(e => {
        if(!exploredMap[e.y|0][e.x|0]) return;
        if(e.type===ENT_KEY)     mCtx.fillStyle='#ffdd00';
        else if(e.type===ENT_BATTERY) mCtx.fillStyle='#00ff44';
        else return;
        mCtx.fillRect(e.x*cellSize-cellSize/2, e.y*cellSize-cellSize/2, cellSize, cellSize);
    });

    // Player
    const px = player.x * cellSize, py = player.y * cellSize;
    mCtx.fillStyle='#ffffff';
    mCtx.beginPath(); mCtx.arc(px, py, cellSize, 0, Math.PI*2); mCtx.fill();

    // Direction arrow
    mCtx.strokeStyle='#ffffff'; mCtx.lineWidth=1;
    mCtx.beginPath();
    mCtx.moveTo(px, py);
    mCtx.lineTo(px + player.dirX*cellSize*3, py + player.dirY*cellSize*3);
    mCtx.stroke();

    // Ghost flashing if close
    const ghostDist = distToGhost();
    if(ghostDist < 8) {
        dangerIcon.classList.remove('hidden');
    } else {
        dangerIcon.classList.add('hidden');
    }
}

// -----------------------------------------------------------------------
// DIRECTION ARROW
// -----------------------------------------------------------------------
function updateDirectionArrow() {
    let tx = objTarget.x, ty = objTarget.y;
    const dx = tx - player.x, dy = ty - player.y;
    const angle = Math.atan2(dy, dx);
    // Convert world angle to player-relative angle
    const playerAngle = Math.atan2(player.dirY, player.dirX);
    const relAngle = angle - playerAngle;
    // CSS rotate of the arrow element
    dirArrow.style.transform = `rotate(${(relAngle * 180/Math.PI + 90).toFixed(1)}deg)`;
}

function setObjectiveTarget() {
    if(!powerRestored) {
        // Point to nearest key first
        let nearestKey = null, nearestDist = Infinity;
        entities.forEach(e => {
            if(e.type===ENT_KEY) {
                const d = (e.x-player.x)**2 + (e.y-player.y)**2;
                if(d<nearestDist) { nearestDist=d; nearestKey=e; }
            }
        });
        if(nearestKey) {
            objTarget = {x:nearestKey.x, y:nearestKey.y};
            currentObj = `Find Key ${keysCollected+1}/${TOTAL_KEYS}`;
        }
        if(keysCollected >= TOTAL_KEYS) {
            // Point to switch
            const sw = entities.find(e=>e.type===ENT_SWITCH);
            if(sw) { objTarget={x:sw.x,y:sw.y}; currentObj='Restore Power'; }
        }
    } else {
        objTarget = {x:28.5, y:28.5};
        currentObj = 'Escape!';
    }
    objText.innerText = currentObj;
}

// -----------------------------------------------------------------------
// PLAYER MOVEMENT & INTERACTION
// -----------------------------------------------------------------------
function movePlayer(delta) {
    if(player.isHiding) return;

    player.isSprinting = kDown['shift'] && player.stamina > 0;
    player.isCrouching = kDown['c'] && !player.isSprinting;

    const spd = player.isSprinting ? 5.5 : (player.isCrouching ? 1.5 : 3.0);
    let moveX = 0, moveY = 0;

    if(kDown['w']) { moveX += player.dirX; moveY += player.dirY; }
    if(kDown['s']) { moveX -= player.dirX; moveY -= player.dirY; }
    if(kDown['a']) { moveX -= player.planeX; moveY -= player.planeY; }
    if(kDown['d']) { moveX += player.planeX; moveY += player.planeY; }

    const moved = moveX!==0||moveY!==0;
    const step = spd * delta;
    if(moved) {
        const nx = player.x + moveX * step;
        const ny = player.y + moveY * step;
        if(isWalkable(nx|0, player.y|0)) player.x = nx;
        if(isWalkable(player.x|0, ny|0)) player.y = ny;
    }

    // Noise level
    player.noiseLevel = 0;
    if(moved) {
        player.noiseLevel = player.isSprinting ? 3 : (player.isCrouching ? 0.3 : 1);
        if(Math.random() < 0.05 && player.noiseLevel > 0.5) playFootsteps();
    }

    // Stamina
    if(player.isSprinting && moved) {
        player.stamina = Math.max(0, player.stamina - 20*delta);
    } else {
        player.stamina = Math.min(100, player.stamina + 8*delta);
    }

    // Battery drain
    player.battery = Math.max(0, player.battery - (flashlightOn() ? 0.8 : 0.15) * delta);

    // Explore map
    const px = player.x|0, py = player.y|0;
    for(let dy=-2;dy<=2;dy++) for(let dx=-2;dx<=2;dx++) {
        const ex=px+dx, ey=py+dy;
        if(ex>=0&&ex<MAP_W&&ey>=0&&ey<MAP_H) exploredMap[ey][ex]=true;
    }
}

function updateHUD() {
    healthBar.style.width  = player.health  + '%';
    staminaBar.style.width = player.stamina + '%';
    batteryBar.style.width = player.battery + '%';

    if(player.battery < 20) batteryBar.style.background='#e74c3c';
    else if(player.battery < 50) batteryBar.style.background='#e67e22';
    else batteryBar.style.background='#f39c12';

    if(sanity < 30) sanityText.innerText='Mind slipping…';
    else if(sanity < 60) sanityText.innerText='';
    else sanityText.innerText='';

    timerText.innerText = formatTime(playTime);
    crouchIndicator.classList.toggle('hidden', !player.isCrouching);
    hidingIndicator.classList.toggle('hidden', !player.isHiding);

    // Breath bar
    if(player.holdingBreath) {
        breathBarContainer.classList.remove('hidden');
        breathBar.style.width = player.breath + '%';
    } else {
        breathBarContainer.classList.add('hidden');
    }
}

function formatTime(t) {
    const m = (t/60)|0, s = (t%60)|0, ms = ((t%1)*100)|0;
    return `${m}:${s<10?'0':''}${s}.${ms<10?'0':''}${ms}`;
}

// -----------------------------------------------------------------------
// INTERACTION CHECK
// -----------------------------------------------------------------------
let interactCooldown = 0;

function getClosestInteractable() {
    let closest = null, closestDist = 2.0;
    entities.forEach(e => {
        if([ENT_KEY,ENT_BATTERY,ENT_NOTE,ENT_SWITCH,ENT_LOCKER].includes(e.type)) {
            const d = Math.sqrt((player.x-e.x)**2+(player.y-e.y)**2);
            if(d < closestDist) { closestDist=d; closest=e; }
        }
    });
    // Also check exit door
    const exX=28|0, exY=28|0;
    const dDoor = Math.sqrt((player.x-28.5)**2+(player.y-28.5)**2);
    if(dDoor < 2.0 && (!closest||dDoor<closestDist)) {
        closest = {type:'EXIT', dist:dDoor};
    }
    return closest;
}

function doInteract() {
    if(interactCooldown > 0) return;
    interactCooldown = 0.5;
    const e = getClosestInteractable();
    if(!e) return;

    if(e.type===ENT_KEY) {
        keysCollected++;
        const idx=entities.indexOf(e); if(idx>-1) entities.splice(idx,1);
        playPickup();
        flashEffect('rgba(255,215,0,0.3)', 200);
        interactionPrompt.classList.add('hidden');
    }
    else if(e.type===ENT_BATTERY) {
        player.battery = Math.min(100, player.battery + 45);
        const idx=entities.indexOf(e); if(idx>-1) entities.splice(idx,1);
        playPickup();
    }
    else if(e.type===ENT_NOTE) {
        noteTitle.innerText = e.title || 'NOTE';
        noteBody.innerText  = e.msg   || '';
        noteOverlay.classList.remove('hidden');
        gameState = 'NOTE';
        document.exitPointerLock();
    }
    else if(e.type===ENT_SWITCH) {
        if(keysCollected < TOTAL_KEYS) {
            showTempMessage('Need all 3 keys first.');
            return;
        }
        openPuzzle();
    }
    else if(e.type===ENT_LOCKER) {
        enterHiding();
    }
    else if(e.type==='EXIT') {
        if(exitUnlocked) winGame();
        else showTempMessage('Not yet. Restore the power first.');
    }
}

let tempMsgTimer=0, tempMsg='';
function showTempMessage(msg) {
    interactionPrompt.innerText = msg;
    interactionPrompt.classList.remove('hidden');
    tempMsgTimer = 2.5;
}

// -----------------------------------------------------------------------
// HIDING MECHANIC
// -----------------------------------------------------------------------
let hideTimer = 0;
function enterHiding() {
    player.isHiding = true;
    hideTimer = 0;
    player.breath = 100;
    showTempMessage('Hidden. Hold SPACE to hold breath.');
}

function exitHiding() {
    player.isHiding = false;
    player.holdingBreath = false;
    interactionPrompt.classList.add('hidden');
}

function updateHiding(delta) {
    if(!player.isHiding) return;
    player.holdingBreath = kDown[' '];
    if(player.holdingBreath) {
        player.breath = Math.max(0, player.breath - 15*delta);
        if(player.breath <= 0) {
            // Force exit hiding
            exitHiding();
            flashEffect('rgba(0,0,0,0.8)', 600);
        }
    } else {
        player.breath = Math.min(100, player.breath + 10*delta);
    }
    if(kDown['e'] && interactCooldown <= 0) { exitHiding(); interactCooldown=0.5; }
}

// -----------------------------------------------------------------------
// SWITCH PUZZLE
// -----------------------------------------------------------------------
function openPuzzle() {
    puzzleState = [0,0,0,0,0];
    buildSwitchGrid();
    puzzleOverlay.classList.remove('hidden');
    puzzleActive = true;
    gameState = 'PUZZLE';
    document.exitPointerLock();
}

function buildSwitchGrid() {
    switchGrid.innerHTML = '';
    for(let i=0;i<5;i++) {
        const btn = document.createElement('button');
        btn.className = 'switch-btn off';
        btn.dataset.idx = i;
        btn.innerHTML = '|';
        btn.onclick = () => toggleSwitch(i, btn);
        switchGrid.appendChild(btn);
    }
    puzzleFeedback.innerText = 'Pattern: ON OFF ON OFF ON';
}

function toggleSwitch(i, btn) {
    puzzleState[i] = puzzleState[i] ? 0 : 1;
    btn.className = 'switch-btn ' + (puzzleState[i] ? 'on' : 'off');
    // Check solution
    const solved = PUZZLE_ANSWER.every((v,idx)=>v===puzzleState[idx]);
    if(solved) {
        puzzleFeedback.innerText = '✓ POWER RESTORED';
        powerRestored = true;
        exitUnlocked  = true;
        setTimeout(() => {
            puzzleOverlay.classList.add('hidden');
            puzzleActive = false;
            gameState = 'PLAYING';
            document.body.requestPointerLock();
            playDoorSlam();
            flashEffect('rgba(50,255,50,0.3)', 500);
        }, 1200);
        // Remove switch entity
        const idx = entities.findIndex(e=>e.type===ENT_SWITCH);
        if(idx>-1) entities.splice(idx,1);
    }
}

// -----------------------------------------------------------------------
// GHOST AI
// -----------------------------------------------------------------------
let ghostPathTimer = 0;
const GHOST_PATH_INTERVAL = 1.2;

function updateGhost(delta) {
    ghost.attackCooldown = Math.max(0, ghost.attackCooldown - delta);
    ghost.aggression = Math.min(2.5, 1.0 + playTime / 180); // Gets faster over 3 min

    const dist = distToGhost();
    const playerVisible = dist < (flashlightOn() ? 10 : 4);

    // State transitions
    if(dist < 2 && !player.isHiding) {
        // Attack
        if(ghost.attackCooldown <= 0) {
            ghostAttack();
            ghost.attackCooldown = 8;
        }
    }

    if(player.noiseLevel > 0 && dist < (player.noiseLevel*5)) {
        ghost.lastHeardX = player.x; ghost.lastHeardY = player.y;
        ghost.state = 'CHASE';
    }
    if(playerVisible && !player.isHiding) {
        ghost.state = 'CHASE';
        ghost.loseSightTimer = 0;
    } else if(ghost.state==='CHASE') {
        ghost.loseSightTimer += delta;
        if(ghost.loseSightTimer > 6) {
            ghost.state = 'SEARCH';
            ghost.patroltimer = 0;
        }
    }

    // Update ghost speed
    ghost.speed = ghost.aggression * (ghost.state==='CHASE' ? 3.8 : (ghost.state==='SEARCH'?2.0:1.5));

    // Random teleport
    if(ghost.state!=='CHASE' && Math.random() < 0.001 && dist > 10) {
        ghost.x = player.x + (Math.random()*8-4);
        ghost.y = player.y + (Math.random()*8-4);
        if(isWall(ghost.x|0, ghost.y|0)) { ghost.x=1.5; ghost.y=1.5; }
        flashEffect('rgba(255,0,0,0.15)', 300);
    }

    // Movement via BFS
    ghostPathTimer += delta;
    if(ghostPathTimer > GHOST_PATH_INTERVAL) {
        ghostPathTimer = 0;
        let targetX = ghost.targetX, targetY = ghost.targetY;

        if(ghost.state==='CHASE') {
            targetX = player.x|0; targetY = player.y|0;
        } else if(ghost.state==='SEARCH' && ghost.lastHeardX>-1) {
            targetX = ghost.lastHeardX|0; targetY = ghost.lastHeardY|0;
        } else {
            // Patrol
            ghost.patroltimer += GHOST_PATH_INTERVAL;
            if(ghost.patroltimer > 4 || mapAt(ghost.targetX|0,ghost.targetY|0)!==0) {
                ghost.targetX = 1 + (Math.random()*(MAP_W-2))|0;
                ghost.targetY = 1 + (Math.random()*(MAP_H-2))|0;
                while(mapAt(ghost.targetX,ghost.targetY)!==0) {
                    ghost.targetX=(1+Math.random()*(MAP_W-2))|0;
                    ghost.targetY=(1+Math.random()*(MAP_H-2))|0;
                }
                ghost.patroltimer = 0;
            }
        }
        ghost.targetX = targetX; ghost.targetY = targetY;
    }

    // Smooth movement toward next BFS step
    const step = bfsNextStep(ghost.x, ghost.y, ghost.targetX, ghost.targetY);
    if(step) {
        const tx = step.x+0.5, ty = step.y+0.5;
        const dx=tx-ghost.x, dy=ty-ghost.y, d=Math.sqrt(dx*dx+dy*dy);
        if(d>0.05) {
            ghost.x += (dx/d)*ghost.speed*delta;
            ghost.y += (dy/d)*ghost.speed*delta;
        }
    }

    // Glitch & flicker
    ghost.glitchTimer = Math.max(0, ghost.glitchTimer - delta);
    if(Math.random() < 0.02) { ghost.glitchTimer = 0.1+Math.random()*0.3; }
    ghost.visible = (ghost.glitchTimer < 0.5) || (Math.floor(playTime*10)%2===0);
    ghost.twitch += delta;
}

function ghostAttack() {
    player.health -= 25;
    bloodSplatter.style.opacity='0.85';
    setTimeout(()=>bloodSplatter.style.opacity='0',500);
    flashEffect('rgba(180,0,0,0.6)', 400);
    document.body.classList.add('shake-heavy');
    setTimeout(()=>document.body.classList.remove('shake-heavy'),400);
    playScream();

    // Breathing becomes scared
    breathingOverlay.style.animationName='breathe-scared';
    breathingOverlay.style.animationDuration='0.8s';
    setTimeout(()=>{
        breathingOverlay.style.animationName='breathe-normal';
        breathingOverlay.style.animationDuration='4s';
    }, 8000);

    if(player.health <= 0) {
        gameOver('She caught you');
    }
}

// -----------------------------------------------------------------------
// SANITY
// -----------------------------------------------------------------------
function updateSanity(delta) {
    const dist = distToGhost();
    if(!flashlightOn()) sanity = Math.max(0, sanity - 5*delta);
    if(dist < 6)         sanity = Math.max(0, sanity - 4*delta*(1-dist/6));
    sanity = Math.min(100, sanity + 1*delta);

    if(sanity < 30) {
        // Sanity effects: subtle visual distortion
        if(Math.random() < 0.002) flashEffect('rgba(100,0,100,0.1)', 100);
    }
}

// -----------------------------------------------------------------------
// HORROR EVENT DIRECTOR
// -----------------------------------------------------------------------
function updateHorrorEvents(delta) {
    nextHorrorIn -= delta;
    if(nextHorrorIn <= 0) {
        triggerRandomHorrorEvent();
        nextHorrorIn = 10 + Math.random()*20;
    }
}

function triggerRandomHorrorEvent() {
    const events = [
        // Door slam
        ()=>{ playDoorSlam(); },
        // Whispers behind player
        ()=>{ playWhisper(); if(Math.random()<0.5) flashEffect('rgba(0,0,0,0.4)',300); },
        // Lights flicker
        ()=>{
            const orig=flickerValue;
            flickerValue=0.1;
            setTimeout(()=>flickerValue=1.0,100);
            setTimeout(()=>flickerValue=0.2,200);
            setTimeout(()=>flickerValue=orig,400);
        },
        // Screen shake
        ()=>{
            document.body.classList.add('shake-light');
            setTimeout(()=>document.body.classList.remove('shake-light'),250);
        },
        // Blood flash
        ()=>{ flashEffect('rgba(120,0,0,0.35)',200); },
        // Static TV
        ()=>{ showStatic(1.2); playStaticSFX(); },
        // Random scream from far
        ()=>{ playScream(); },
        // Fake ghost appear
        ()=>{
            const wasVis=ghost.visible;
            ghost.visible=true; ghost.glitchTimer=0;
            setTimeout(()=>{ ghost.glitchTimer=1.0; ghost.visible=wasVis; },300);
        },
    ];
    const ev=events[(Math.random()*events.length)|0];
    ev();
}

// -----------------------------------------------------------------------
// VISUAL EFFECTS
// -----------------------------------------------------------------------
function flashEffect(color, duration) {
    flashOverlay.style.background = color;
    flashOverlay.style.opacity = '1';
    setTimeout(()=>flashOverlay.style.opacity='0', duration);
}

function showStatic(duration) {
    staticCanvas.classList.remove('hidden');
    const drawStatic = () => {
        const img = sCtx.createImageData(staticCanvas.width, staticCanvas.height);
        const d = img.data;
        for(let i=0;i<d.length;i+=4){
            const v=(Math.random()*255)|0;
            d[i]=d[i+1]=d[i+2]=v; d[i+3]=(Math.random()*180)|0;
        }
        sCtx.putImageData(img,0,0);
    };
    const interval=setInterval(drawStatic,50);
    setTimeout(()=>{ clearInterval(interval); staticCanvas.classList.add('hidden'); }, duration*1000);
}

// -----------------------------------------------------------------------
// GAME FLOW
// -----------------------------------------------------------------------
function startGame() {
    initAudio();
    resumeAudioCtx();

    // Reset all state
    player.x=1.5; player.y=28.5;
    player.dirX=0; player.dirY=-1;
    player.planeX=fovPlane; player.planeY=0;
    player.health=100; player.stamina=100; player.battery=100;
    player.isCrouching=false; player.isSprinting=false;
    player.isHiding=false; player.holdingBreath=false;
    player.breath=100; player.noiseLevel=0;

    keysCollected=0; powerRestored=false; exitUnlocked=false;
    sanity=100; playTime=0;
    ghostPathTimer=0; horrorCooldown=12; nextHorrorIn=15;
    exploredMap = Array.from({length:MAP_H},()=>new Uint8Array(MAP_W));

    ghost.x=1.5; ghost.y=1.5;
    ghost.state='PATROL'; ghost.speed=2.0;
    ghost.targetX=15; ghost.targetY=15;
    ghost.lastHeardX=-1; ghost.lastHeardY=-1;
    ghost.aggression=1.0; ghost.glitchTimer=0;
    ghost.visible=true; ghost.patroltimer=0;
    ghost.loseSightTimer=0; ghost.attackCooldown=0;

    initEntities(); initDust();

    flickerValue=1.0; flickerTimer=0;
    interactCooldown=0;

    [mainMenu,settingsMenu,pauseMenu,gameOverMenu,victoryMenu,noteOverlay,puzzleOverlay].forEach(m=>m.classList.add('hidden'));
    hudEl.classList.remove('hidden');
    interactionPrompt.classList.add('hidden');

    breathingOverlay.style.animationName='breathe-normal';
    breathingOverlay.style.animationDuration='4s';
    breathingOverlay.style.animationIterationCount='infinite';

    setObjectiveTarget();
    requestLock();
    // Show touch controls on mobile
    if(isMobile) {
        document.getElementById('touch-controls').classList.remove('hidden');
    }
    gameState='PLAYING';
    lastTime=performance.now();
    requestAnimationFrame(gameLoop);
}

function pauseGame() {
    gameState='PAUSED';
    releaseLock();
    if(isMobile) document.getElementById('touch-controls').classList.add('hidden');
    pauseMenu.classList.remove('hidden');
}

function resumeGame() {
    pauseMenu.classList.add('hidden');
    settingsMenu.classList.add('hidden');
    if(isMobile) document.getElementById('touch-controls').classList.remove('hidden');
    requestLock();
    gameState='PLAYING';
    lastTime=performance.now();
    requestAnimationFrame(gameLoop);
}

function gameOver(reason='She found you') {
    gameState='DEAD';
    document.exitPointerLock();
    hudEl.classList.add('hidden');
    document.getElementById('death-title').innerText=reason.toUpperCase();
    document.getElementById('death-time').innerText='Survived: '+formatTime(playTime);
    gameOverMenu.classList.remove('hidden');
}

function winGame() {
    gameState='WON';
    releaseLock();
    if(isMobile) document.getElementById('touch-controls').classList.add('hidden');
    hudEl.classList.add('hidden');
    document.getElementById('victory-time').innerText='Time: '+formatTime(playTime);
    const prev=parseFloat(localStorage.getItem('corridor_best_v3')||'0');
    if(!prev || playTime<prev) {
        localStorage.setItem('corridor_best_v3', playTime);
        document.getElementById('victory-record').classList.remove('hidden');
    } else {
        document.getElementById('victory-record').classList.add('hidden');
    }
    victoryMenu.classList.remove('hidden');
}

// -----------------------------------------------------------------------
// MAIN GAME LOOP
// -----------------------------------------------------------------------
function gameLoop(timestamp) {
    if(gameState!=='PLAYING') return;
    const delta = Math.min((timestamp - lastTime)/1000, 0.05);
    lastTime = timestamp;
    playTime += delta;
    interactCooldown = Math.max(0, interactCooldown - delta);
    tempMsgTimer = Math.max(0, tempMsgTimer - delta);
    if(tempMsgTimer<=0 && interactionPrompt.classList.contains('hidden')===false) {
        interactionPrompt.classList.add('hidden');
    }

    movePlayer(delta);
    updateHiding(delta);
    updateGhost(delta);
    updateSanity(delta);
    updateFlicker(delta);
    updateDust(delta);
    updateHorrorEvents(delta);
    setObjectiveTarget();

    // Check interaction range for UI prompt
    const ent = getClosestInteractable();
    if(ent && tempMsgTimer<=0) {
        let prompt='';
        if(ent.type===ENT_KEY)     prompt='[ E ]  Pick up Key';
        if(ent.type===ENT_BATTERY) prompt='[ E ]  Grab Battery';
        if(ent.type===ENT_NOTE)    prompt='[ E ]  Read Note';
        if(ent.type===ENT_SWITCH)  prompt='[ E ]  Use Panel';
        if(ent.type===ENT_LOCKER)  prompt='[ E ]  Hide in Locker';
        if(ent.type==='EXIT')      prompt= exitUnlocked?'[ E ]  ESCAPE!':'[ E ]  (Locked)';
        if(prompt) {
            interactionPrompt.innerText=prompt;
            interactionPrompt.classList.remove('hidden');
        }
    } else if(tempMsgTimer<=0) {
        interactionPrompt.classList.add('hidden');
    }

    render(delta);
    drawMinimap();
    updateDirectionArrow();
    updateHUD();

    // Best time display update
    const best=parseFloat(localStorage.getItem('corridor_best_v3')||'0');
    document.getElementById('best-time-display').innerText='Best: '+(best?formatTime(best):'--');

    requestAnimationFrame(gameLoop);
}

// -----------------------------------------------------------------------
// INPUT
// -----------------------------------------------------------------------
document.addEventListener('keydown', e => {
    kDown[e.key.toLowerCase()] = true;
    if(e.key==='Escape') {
        if(gameState==='PLAYING') pauseGame();
        else if(gameState==='PAUSED') resumeGame();
        else if(gameState==='NOTE')   closeNote();
        else if(gameState==='PUZZLE') closePuzzle();
    }
    if(e.key.toLowerCase()==='e') {
        if(gameState==='PLAYING') doInteract();
        else if(gameState==='NOTE') closeNote();
    }
    e.preventDefault && e.key==='Space' && e.preventDefault();
});
document.addEventListener('keyup', e => { kDown[e.key.toLowerCase()]=false; });

document.addEventListener('mousemove', e => {
    // Desktop only: pointer lock mouse look
    if(isMobile) return;
    if(gameState!=='PLAYING'||document.pointerLockElement!==document.body) return;
    const rot = -e.movementX * mouseSensitivity;
    const oDirX=player.dirX, oPlaneX=player.planeX;
    player.dirX   = player.dirX*Math.cos(rot)   - player.dirY*Math.sin(rot);
    player.dirY   = oDirX*Math.sin(rot)          + player.dirY*Math.cos(rot);
    player.planeX = player.planeX*Math.cos(rot)  - player.planeY*Math.sin(rot);
    player.planeY = oPlaneX*Math.sin(rot)         + player.planeY*Math.cos(rot);
});

function closeNote() {
    noteOverlay.classList.add('hidden');
    gameState='PLAYING';
    if(isMobile) document.getElementById('touch-controls').classList.remove('hidden');
    else requestLock();
    lastTime=performance.now();
    requestAnimationFrame(gameLoop);
}

function closePuzzle() {
    if(!powerRestored) {
        puzzleOverlay.classList.add('hidden');
        puzzleActive=false;
        gameState='PLAYING';
        if(isMobile) document.getElementById('touch-controls').classList.remove('hidden');
        else requestLock();
        lastTime=performance.now();
        requestAnimationFrame(gameLoop);
    }
}

// -----------------------------------------------------------------------
// BUTTON HANDLERS
// -----------------------------------------------------------------------
document.getElementById('btn-play').onclick       = () => startGame();
document.getElementById('btn-settings').onclick   = () => { mainMenu.classList.add('hidden'); settingsMenu.classList.remove('hidden'); };
document.getElementById('btn-settings-back').onclick = () => { settingsMenu.classList.add('hidden'); mainMenu.classList.remove('hidden'); };
document.getElementById('btn-fullscreen').onclick = () => document.documentElement.requestFullscreen?.();
document.getElementById('btn-resume').onclick     = () => resumeGame();
document.getElementById('btn-settings-pause').onclick = () => {
    pauseMenu.classList.add('hidden');
    settingsMenu.classList.remove('hidden');
    document.getElementById('btn-settings-back').onclick = () => {
        settingsMenu.classList.add('hidden');
        pauseMenu.classList.remove('hidden');
    };
};
document.getElementById('btn-quit-pause').onclick  = () => location.reload();
document.getElementById('btn-restart-death').onclick = () => startGame();
document.getElementById('btn-quit-death').onclick   = () => location.reload();
document.getElementById('btn-play-again').onclick   = () => startGame();
document.getElementById('btn-quit-win').onclick     = () => location.reload();

const volSlider = document.getElementById('vol-slider');
const sensSlider = document.getElementById('sens-slider');
const fovSlider  = document.getElementById('fov-slider');

volSlider.oninput = e => {
    masterVolume=parseFloat(e.target.value);
    document.getElementById('vol-display').innerText=Math.round(masterVolume*100)+'%';
    if(masterGain) masterGain.gain.value=masterVolume;
};
sensSlider.oninput = e => {
    mouseSensitivity=parseFloat(e.target.value);
    document.getElementById('sens-display').innerText=(mouseSensitivity*1000).toFixed(1);
};
fovSlider.oninput = e => {
    fovPlane=parseFloat(e.target.value);
    player.planeX=fovPlane;
    document.getElementById('fov-display').innerText=Math.round(fovPlane*100)+'°';
};

// -----------------------------------------------------------------------
// BEST TIME ON MAIN MENU
// -----------------------------------------------------------------------
const savedBest=parseFloat(localStorage.getItem('corridor_best_v3')||'0');
document.getElementById('best-time-display').innerText='Best: '+(savedBest?formatTime(savedBest):'--');

// -----------------------------------------------------------------------
// RESIZE
// -----------------------------------------------------------------------
window.addEventListener('resize', () => {
    canvas.style.width='100vw';
    canvas.style.height='100vh';
});

// Allow tapping note overlay to close on mobile
document.getElementById('note-overlay').addEventListener('touchend', e => {
    if(gameState==='NOTE' && e.target.id !== 'switch-grid') {
        e.preventDefault();
        closeNote();
    }
}, { passive: false });

// -----------------------------------------------------------------------
// MOBILE TOUCH SYSTEM
// -----------------------------------------------------------------------
if(isMobile) {
    // ---- Virtual Joystick ------------------------------------------------
    const joystickZone  = document.getElementById('joystick-zone');
    const joystickBase  = document.getElementById('joystick-base');
    const joystickThumb = document.getElementById('joystick-thumb');

    const JS_RADIUS = 45; // max thumb travel in px
    let jsActiveTouchId = null;
    let jsOriginX = 0, jsOriginY = 0; // base centre in page coords
    let jsVecX = 0, jsVecY = 0;       // normalised joystick vector [-1..1]

    // Position the joystick base relative to the first touch inside the zone
    joystickZone.addEventListener('touchstart', e => {
        e.preventDefault();
        if(jsActiveTouchId !== null) return; // already tracking one finger
        const t = e.changedTouches[0];
        jsActiveTouchId = t.identifier;

        // Move the visible base to the touch point
        const rect = joystickZone.getBoundingClientRect();
        const bx = t.clientX - rect.left;
        const by = t.clientY - rect.top;
        joystickBase.style.left = (bx - joystickBase.offsetWidth/2) + 'px';
        joystickBase.style.top  = (by - joystickBase.offsetHeight/2) + 'px';
        joystickBase.style.position = 'absolute';

        jsOriginX = t.clientX;
        jsOriginY = t.clientY;
        jsVecX = 0; jsVecY = 0;
        joystickThumb.style.transform = 'translate(0,0)';
    }, { passive: false });

    joystickZone.addEventListener('touchmove', e => {
        e.preventDefault();
        for(const t of e.changedTouches) {
            if(t.identifier !== jsActiveTouchId) continue;
            const dx = t.clientX - jsOriginX;
            const dy = t.clientY - jsOriginY;
            const dist = Math.sqrt(dx*dx + dy*dy);
            const clampedDist = Math.min(dist, JS_RADIUS);
            const angle = Math.atan2(dy, dx);
            const tx = Math.cos(angle) * clampedDist;
            const ty = Math.sin(angle) * clampedDist;
            joystickThumb.style.transform = `translate(${tx}px,${ty}px)`;
            jsVecX = tx / JS_RADIUS;
            jsVecY = ty / JS_RADIUS;
        }
    }, { passive: false });

    function jsRelease(e) {
        for(const t of e.changedTouches) {
            if(t.identifier === jsActiveTouchId) {
                jsActiveTouchId = null;
                jsVecX = 0; jsVecY = 0;
                joystickThumb.style.transform = 'translate(0,0)';
            }
        }
    }
    joystickZone.addEventListener('touchend',    jsRelease, { passive: false });
    joystickZone.addEventListener('touchcancel', jsRelease, { passive: false });

    // Inject joystick input into player movement each frame.
    // We extend movePlayer to also read jsVecX/jsVecY.
    const _origMovePlayer = movePlayer;
    window._jsInjectMove = function(delta) {
        if(!player.isHiding && (jsVecX !== 0 || jsVecY !== 0)) {
            // jsVec is in screen space: Y = forward/back, X = strafe
            const spd = (player.isSprinting && player.stamina>0) ? 5.5 : (player.isCrouching ? 1.5 : 3.0);
            const step = spd * delta;
            // Forward (negative jsVecY = up on screen = forward)
            const fwdX = -player.dirX * jsVecY;
            const fwdY = -player.dirY * jsVecY;
            // Strafe
            const strX = player.planeX * jsVecX;
            const strY = player.planeY * jsVecX;
            const mx = fwdX + strX, my = fwdY + strY;
            if(isWalkable((player.x + mx*step)|0, player.y|0)) player.x += mx*step;
            if(isWalkable(player.x|0, (player.y + my*step)|0)) player.y += my*step;

            // Noise from joystick movement
            player.noiseLevel = Math.max(player.noiseLevel, player.isSprinting ? 3 : (player.isCrouching ? 0.3 : 1));
            if(Math.random() < 0.04 && player.noiseLevel > 0.5) playFootsteps();

            // Explore
            const px=player.x|0, py=player.y|0;
            for(let dy2=-2;dy2<=2;dy2++) for(let dx2=-2;dx2<=2;dx2++) {
                const ex=px+dx2,ey=py+dy2;
                if(ex>=0&&ex<MAP_W&&ey>=0&&ey<MAP_H) exploredMap[ey][ex]=true;
            }
        }
    };

    // Patch gameLoop to call joystick injection after movePlayer
    const _origGameLoop_ref = gameLoop;
    // We hook via the existing gameLoop by monkey-patching the global:
    const _rawGameLoop = gameLoop;
    // Override gameLoop to call JS injection
    // Since gameLoop is declared with function keyword it's hoisted — we wrap it:
    const _gameLoopMobileWrapper = function(timestamp) {
        // Already handled by modified gameLoop below — see end of file
    };

    // ---- Look Zone (right-side swipe for camera rotation) ---------------
    const lookZone = document.getElementById('look-zone');
    let lookActiveTouchId = null;
    let lookLastX = 0;
    const TOUCH_SENS = 0.008; // radians per pixel

    lookZone.addEventListener('touchstart', e => {
        e.preventDefault();
        if(lookActiveTouchId !== null) return;
        const t = e.changedTouches[0];
        lookActiveTouchId = t.identifier;
        lookLastX = t.clientX;
    }, { passive: false });

    lookZone.addEventListener('touchmove', e => {
        e.preventDefault();
        if(gameState !== 'PLAYING') return;
        for(const t of e.changedTouches) {
            if(t.identifier !== lookActiveTouchId) continue;
            const dx = t.clientX - lookLastX;
            lookLastX = t.clientX;
            const rot = -dx * TOUCH_SENS * (mouseSensitivity / 0.0025);
            const oDirX  = player.dirX,   oPlaneX = player.planeX;
            player.dirX   = player.dirX   * Math.cos(rot) - player.dirY   * Math.sin(rot);
            player.dirY   = oDirX          * Math.sin(rot) + player.dirY   * Math.cos(rot);
            player.planeX = player.planeX  * Math.cos(rot) - player.planeY * Math.sin(rot);
            player.planeY = oPlaneX        * Math.sin(rot) + player.planeY * Math.cos(rot);
        }
    }, { passive: false });

    function lookRelease(e) {
        for(const t of e.changedTouches) {
            if(t.identifier === lookActiveTouchId) lookActiveTouchId = null;
        }
    }
    lookZone.addEventListener('touchend',    lookRelease, { passive: false });
    lookZone.addEventListener('touchcancel', lookRelease, { passive: false });

    // ---- Action Buttons --------------------------------------------------
    function bindTouchBtn(id, onDown, onUp) {
        const el = document.getElementById(id);
        if(!el) return;
        el.addEventListener('touchstart', e => { e.preventDefault(); el.classList.add('pressed'); onDown && onDown(); }, { passive: false });
        el.addEventListener('touchend',   e => { e.preventDefault(); el.classList.remove('pressed'); onUp && onUp(); },   { passive: false });
        el.addEventListener('touchcancel',e => { e.preventDefault(); el.classList.remove('pressed'); onUp && onUp(); },   { passive: false });
    }

    // Interact
    bindTouchBtn('tbtn-interact', () => {
        if(gameState==='PLAYING') doInteract();
        else if(gameState==='NOTE') closeNote();
        else if(gameState==='PUZZLE') closePuzzle();
    });

    // Flashlight toggle (tap)
    bindTouchBtn('tbtn-flashlight', () => {
        if(gameState==='PLAYING' && player.battery > 0) {
            // Toggle via synthetic keydown
            const evt = new KeyboardEvent('keydown', { key: 'f', bubbles: true });
            document.dispatchEvent(evt);
        }
    });

    // Sprint (hold)
    bindTouchBtn('tbtn-sprint',
        () => { kDown['shift'] = true; },
        () => { kDown['shift'] = false; }
    );

    // Crouch (hold)
    bindTouchBtn('tbtn-crouch',
        () => { kDown['c'] = true; },
        () => { kDown['c'] = false; }
    );

    // Breath hold (hold)
    bindTouchBtn('tbtn-breath',
        () => { kDown[' '] = true; },
        () => { kDown[' '] = false; }
    );

    // Pause
    bindTouchBtn('tbtn-pause', () => {
        if(gameState==='PLAYING')    pauseGame();
        else if(gameState==='PAUSED') resumeGame();
    });

    // ---- Joystick integration into game loop ----------------------------
    // Override the global gameLoop to inject joystick AFTER movePlayer runs.
    // We re-declare the function at module level by assigning to a shadow.
    // The original gameLoop calls requestAnimationFrame(gameLoop) at its end,
    // so we intercept by replacing the requestAnimationFrame callback.
    const _realRAF = window.requestAnimationFrame.bind(window);
    window._mobileGameLoopActive = false;

    function mobileGameLoop(timestamp) {
        if(gameState !== 'PLAYING') return;
        const delta = Math.min((timestamp - lastTime) / 1000, 0.05);
        lastTime = timestamp;
        playTime += delta;
        interactCooldown = Math.max(0, interactCooldown - delta);
        tempMsgTimer = Math.max(0, tempMsgTimer - delta);
        if(tempMsgTimer <= 0 && !interactionPrompt.classList.contains('hidden')) {
            interactionPrompt.classList.add('hidden');
        }

        movePlayer(delta);          // handles kDown WASD + keyboard
        window._jsInjectMove(delta); // handles joystick vector
        updateHiding(delta);
        updateGhost(delta);
        updateSanity(delta);
        updateFlicker(delta);
        updateDust(delta);
        updateHorrorEvents(delta);
        setObjectiveTarget();

        // Interaction prompt
        const ent = getClosestInteractable();
        if(ent && tempMsgTimer <= 0) {
            let prompt = '';
            if(ent.type===ENT_KEY)     prompt = 'Tap USE — Pick up Key';
            if(ent.type===ENT_BATTERY) prompt = 'Tap USE — Grab Battery';
            if(ent.type===ENT_NOTE)    prompt = 'Tap USE — Read Note';
            if(ent.type===ENT_SWITCH)  prompt = 'Tap USE — Use Panel';
            if(ent.type===ENT_LOCKER)  prompt = 'Tap USE — Hide in Locker';
            if(ent.type==='EXIT')      prompt = exitUnlocked ? 'Tap USE — ESCAPE!' : '(Locked)';
            if(prompt) {
                interactionPrompt.innerText = prompt;
                interactionPrompt.classList.remove('hidden');
            }
        } else if(tempMsgTimer <= 0) {
            interactionPrompt.classList.add('hidden');
        }

        render(delta);
        drawMinimap();
        updateDirectionArrow();
        updateHUD();

        const best = parseFloat(localStorage.getItem('corridor_best_v3') || '0');
        document.getElementById('best-time-display').innerText = 'Best: ' + (best ? formatTime(best) : '--');

        _realRAF(mobileGameLoop);
    }

    // When startGame is called on mobile, we redirect RAF to mobileGameLoop
    const _origStartGame = startGame;
    // Override requestAnimationFrame for the first frame so our loop takes over
    const _origRAFForStart = requestAnimationFrame;
    // Hook: after startGame sets gameState='PLAYING' and calls requestAnimationFrame(gameLoop),
    // we cancel that and start our loop instead. We do this by overriding rAF temporarily.
    const _origStartBtn = document.getElementById('btn-play');
    _origStartBtn.onclick = null;
    _origStartBtn.addEventListener('click', () => {
        // temporarily hijack the first rAF
        const _origRaf2 = window.requestAnimationFrame;
        window.requestAnimationFrame = function(cb) {
            // Restore immediately
            window.requestAnimationFrame = _origRaf2;
            // Start our mobile loop instead
            lastTime = performance.now();
            _realRAF(mobileGameLoop);
            return 0;
        };
        startGame();
    });

    // Also wire restart buttons
    ['btn-restart-death','btn-play-again'].forEach(id => {
        const btn = document.getElementById(id);
        const prev = btn.onclick;
        btn.onclick = null;
        btn.addEventListener('click', () => {
            const _origRaf3 = window.requestAnimationFrame;
            window.requestAnimationFrame = function(cb) {
                window.requestAnimationFrame = _origRaf3;
                lastTime = performance.now();
                _realRAF(mobileGameLoop);
                return 0;
            };
            startGame();
        });
    });
}
