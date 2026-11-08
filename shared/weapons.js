// shared/weapons.js — weapon catalog + consumables. Shared by client + server.
//
// Ballistic weapons fire a projectile with a flat muzzle velocity; the shot
// simulates gravity over the curved globe (server-authoritative). Player picks
// aim point (azimuth) + elevation; wind drifts the round — lead your targets
// like World of Warships.

export const WEAPONS = [
  {
    id: 'cannon', name: 'Coastal Cannon', icon: '💥', type: 'ballistic',
    cost: 20, cooldown: 2.0,
    speed: 800,           // m/s muzzle velocity
    minElev: 15, maxElev: 85,
    damage: 25, radius: 1.2,
    blurb: 'Dependable 155mm howitzer. Cheap, fast reload.',
  },
  {
    id: 'napalm', name: 'Napalm Rocket', icon: '🔥', type: 'ballistic',
    cost: 80, cooldown: 4.0,
    speed: 700, minElev: 15, maxElev: 80,
    damage: 18, radius: 2.5, dot: { dmg: 6, dur: 8, radius: 2.5 },
    blurb: 'Incendiary warhead. Burns the impact zone for 8s.',
  },
  {
    id: 'cluster', name: 'Cluster Barrage', icon: '🎇', type: 'ballistic',
    cost: 150, cooldown: 6.0,
    speed: 750, minElev: 15, maxElev: 80,
    damage: 0, radius: 0,
    sub: { count: 16, dmg: 6, radius: 0.4, spread: 1.6 },
    blurb: '16 submunitions scatter over a ~3km patch.',
  },
  {
    id: 'carpet', name: 'Carpet Bomber Run', icon: '🛩️', type: 'ballistic',
    cost: 400, cooldown: 12.0,
    speed: 650, minElev: 15, maxElev: 75,
    damage: 0, radius: 0,
    carpet: { count: 12, dmg: 14, radius: 0.7, spacing: 0.9 },
    blurb: 'A bomber flies through; 12 bombs rake a line 10km long.',
  },
  {
    id: 'laser', name: 'Orbital Laser', icon: '⚡', type: 'beam',
    cost: 250, cooldown: 8.0,
    range: 400, damage: 35, radius: 0.8,
    blurb: 'Instant beam, 400km range. No wind drift — but terrain blocks it.',
  },
  {
    id: 'satellite', name: 'Strike Satellite', icon: '🛰️', type: 'strike',
    cost: 600, cooldown: 60.0,
    delay: 15, damage: 80, radius: 2.0,
    blurb: 'Targets a point. 15s warning ring, then kinetic kill.',
  },
  {
    id: 'hypersonic', name: 'Hypersonic Glide', icon: '🚀', type: 'ballistic',
    cost: 800, cooldown: 45.0,
    speed: 2400, minElev: 5, maxElev: 25,
    damage: 60, radius: 0.8,
    blurb: 'Mach 7 flat-shooter, ~500km reach. Very hard to avoid.',
  },
  {
    id: 'emp', name: 'EMP Pulse', icon: '🌀', type: 'ballistic',
    cost: 500, cooldown: 90.0,
    speed: 700, minElev: 15, maxElev: 80,
    damage: 5, radius: 6.0, emp: 60,
    blurb: 'Stuns ships, trains & satellites for 60s. Fries enemy HQ systems.',
  },
  {
    id: 'nuke', name: 'Tactical Nuke', icon: '☢️', type: 'ballistic',
    cost: 2500, cooldown: 120.0,
    speed: 1200, minElev: 10, maxElev: 89,
    damage: 120, radius: 8.0,
    crater: { r: 3.0, depth: 1.5 }, fallout: { r: 4.0, dps: 10, dur: 60 },
    blurb: '8km blast, carves a 3km crater, 60s fallout zone.',
  },
  {
    id: 'hydrogen', name: 'Hydrogen Bomb', icon: '☢️', type: 'ballistic',
    cost: 5000, cooldown: 300.0,
    speed: 1500, minElev: 10, maxElev: 89,
    damage: 200, radius: 20.0,
    crater: { r: 8.0, depth: 4.0 }, fallout: { r: 8.0, dps: 15, dur: 120 },
    blurb: 'The end of the world in 20km. Continent-scale overkill.',
  },
];

export const WEAPON_BY_ID = Object.fromEntries(WEAPONS.map(w => [w.id, w]));

// Max effective range (km) for a weapon.
//  - beam:   fixed `range`
//  - strike: 3000 km (orbital / any-point targeting)
//  - ballistic: flat range from muzzle velocity (v²/g) with a 15% margin + 10 km.
// Shared so the client can reject out-of-range fire with feedback instead of
// relying on the server to silently drop it.
export function maxRange(w) {
  if (w.type === 'beam') return w.range;
  if (w.type === 'strike') return 3000;
  return (w.speed / 1000) ** 2 / 0.00981 * 1.15 + 10;
}

// Effective visual footprint of a weapon's effect (km): the blast radius, but
// widened for things that spread over an area (cluster scatter, carpet line,
// nuke crater + fallout). Drives how far back the cinematic camera sits.
export function effectRadius(w) {
  let r = w.radius || 0;
  if (w.sub) r = Math.max(r, (w.sub.spread || 1.5) * 2);
  if (w.carpet) r = Math.max(r, w.carpet.count * w.carpet.spacing || 10);
  if (w.fallout) r = Math.max(r, w.fallout.r);
  if (w.crater) r = Math.max(r, w.crater.r);
  return r;
}

// Scene-space camera distance (globe radius = 1) that frames a weapon's blast
// nicely: small rounds sit close and tight, nukes pull back to show the whole
// fireball + fallout. Used by the client's cinematic focus-on-fire.
export function focusDist(w) {
  const alt = Math.min(0.5, Math.max(0.05, 0.008 * effectRadius(w) + 0.03));
  return 1 + alt;
}

// Tradable consumables (market / P2P)
export const ITEMS = [
  { id: 'repair', name: 'Field Repair Kit', icon: '🔧', cost: 200, blurb: '+40 HP instantly.' },
  { id: 'shield', name: 'Aegis Shield', icon: '🛡️', cost: 300, blurb: 'Blocks 50% damage for 30s.' },
  { id: 'boost', name: 'Supply Drop', icon: '📦', cost: 400, blurb: '+50% income for 2 minutes.' },
  { id: 'credits', name: 'Credit Transfer', icon: '💰', cost: 0, blurb: 'Send credits to another player. Price = amount.' },
];

// Deployable platforms — assets a player buys with credits. They are owned,
// income-generating, and destructible by enemy fire (destroyer gets the bounty).
//   tower: fixed ground auto-turret (no income, defensive)
//   ship : sea freighter on a patrol route (+income)
//   sub  : slow submarine on a long patrol (+income)
//   train: armored supply train on a land route (+income)
//   bomber: supersonic jet on a long air patrol, elevated (+income)
//   satellite: high-orbit recon on a great-circle orbit, far above (+income)
// alt (km) is the render height above the surface; scaled to scene units by the client.
export const UNITS = [
  { id: 'tower', kind: 'tower', name: 'Guard Tower', icon: '🗼', cost: 900, hp: 100,
    blurb: 'Fixed ground turret. Auto-fires 12-dmg rounds at the nearest enemy within 30 km.' },
  { id: 'ship', kind: 'ship', name: 'Cargo Freighter', icon: '⛴', cost: 1200, hp: 80, speed: 25, bounty: 500, income: 20,
    blurb: 'Sea freighter patrolling near your region. +20c/10s while afloat.' },
  { id: 'sub', kind: 'sub', name: 'Submarine', icon: '🌊', cost: 1800, hp: 60, speed: 15, bounty: 600, income: 35,
    blurb: 'Slow sub on a long patrol. +35c/10s. Sink it before it pays you back.' },
  { id: 'train', kind: 'train', name: 'Supply Train', icon: '🚆', cost: 1400, hp: 100, speed: 90, bounty: 450, income: 25,
    blurb: 'Armored supply train on a land route near your region. +25c/10s. Fast, but exposed on the ground.' },
  { id: 'bomber', kind: 'bomber', name: 'Strike Bomber', icon: '🛩', cost: 2200, hp: 60, speed: 1200, alt: 250, bounty: 700, income: 30,
    blurb: 'Supersonic strike bomber on a long air patrol. +30c/10s. Fast and high, but fragile.' },
  { id: 'satellite', kind: 'satellite', name: 'Orbital Recon', icon: '🛰', cost: 3000, hp: 80, speed: 40000, alt: 800, bounty: 900, income: 40,
    blurb: 'High-orbit recon satellite. +40c/10s. Slow and far overhead — intercept it as it passes.' },
];
export const UNIT_BY_ID = Object.fromEntries(UNITS.map((u) => [u.id, u]));
export const MAX_UNITS_PER_PLAYER = 5;

export const GAME = {
  startCredits: 1200,
  maxHp: 100,
  passiveIncome: 25,      // credits per 10s
  incomeInterval: 10,
  killBounty: 600,
  respawnCost: 1500,
  respawnCooldown: 120,
  windDisplayInterval: 1, // snapshot rate
};
