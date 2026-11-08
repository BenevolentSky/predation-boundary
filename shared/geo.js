// shared/geo.js — geodesy and sphere math (ESM, no dependencies).
//
// COORDINATE CONVENTION, stated in full so nothing here needs an external
// reference: positions are lat/lon in DEGREES on a sphere of radius R in KM.
// The Cartesian frame is equirectangular with the X AXIS FLIPPED — that is,
// phi = (90 - lat), theta = (lon + 180), and x = -R sin(phi) cos(theta). The
// x-flip is a convention, not a bug; every function below is consistent with
// it, and surfaceBasis() depends on it.

export const R = 6371; // km
const DEG = Math.PI / 180;

// lat/lon(+alt km) -> {x,y,z} in km, in the x-flipped frame described above
export function latLonToV3(lat, lon, alt = 0) {
  const phi = (90 - lat) * DEG;
  const theta = (lon + 180) * DEG;
  const r = R + alt;
  return {
    x: -r * Math.sin(phi) * Math.cos(theta),
    y: r * Math.cos(phi),
    z: r * Math.sin(phi) * Math.sin(theta),
  };
}

export function v3ToLatLon(v) {
  const r = Math.hypot(v.x, v.y, v.z);
  const lat = 90 - Math.acos(Math.max(-1, Math.min(1, v.y / r))) / DEG;
  let lon = Math.atan2(v.z, -v.x) / DEG - 180;
  if (lon < -180) lon += 360;
  return { lat, lon, r };
}

export function norm(v) {
  const l = Math.hypot(v.x, v.y, v.z) || 1;
  return { x: v.x / l, y: v.y / l, z: v.z / l };
}
export function dot(a, b) { return a.x * b.x + a.y * b.y + a.z * b.z; }
export function cross(a, b) {
  return { x: a.y * b.z - a.z * b.y, y: a.z * b.x - a.x * b.z, z: a.x * b.y - a.y * b.x };
}
export function add(a, b) { return { x: a.x + b.x, y: a.y + b.y, z: a.z + b.z }; }
export function scale(v, s) { return { x: v.x * s, y: v.y * s, z: v.z * s }; }
export function sub(a, b) { return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z }; }

// angular distance in radians between two unit vectors
export function angBetween(a, b) {
  return Math.acos(Math.max(-1, Math.min(1, dot(a, b))));
}

// rotate vector v around unit axis by angle (radians)
export function rotateAroundAxis(v, axis, ang) {
  const c = Math.cos(ang), s = Math.sin(ang);
  const d = dot(axis, v);
  const cr = cross(axis, v);
  return {
    x: v.x * c + cr.x * s + axis.x * d * (1 - c),
    y: v.y * c + cr.y * s + axis.y * d * (1 - c),
    z: v.z * c + cr.z * s + axis.z * d * (1 - c),
  };
}

// great-circle distance km between lat/lon pairs
export function gcDist(a, b) {
  return angBetween(norm(latLonToV3(a.lat, a.lon)), norm(latLonToV3(b.lat, b.lon))) * R;
}

// tangent-plane basis at unit normal n, in the x-flipped frame described at the top:
// east = direction of increasing longitude, north = direction of increasing latitude
export function surfaceBasis(n) {
  const up = { x: 0, y: 1, z: 0 };
  let east = cross(up, n);
  const l = Math.hypot(east.x, east.y, east.z);
  if (l < 1e-6) east = { x: 1, y: 0, z: 0 };
  else east = { x: east.x / l, y: east.y / l, z: east.z / l };
  const north = cross(n, east);
  return { east, north };
}

// destination point from origin lat/lon, distance dKm, initial bearing brgDeg (0=N, 90=E)
export function destPoint(origin, dKm, brgDeg) {
  const n = norm(latLonToV3(origin.lat, origin.lon));
  const { east, north } = surfaceBasis(n);
  const dir = norm(add(scale(north, Math.cos(brgDeg * DEG)), scale(east, Math.sin(brgDeg * DEG))));
  const ang = dKm / R;
  const dest = rotateAroundAxis(n, norm(cross(n, dir)), ang);
  const { lat, lon } = v3ToLatLon(dest);
  return { lat, lon };
}

// Shot outcome: where the shell actually landed (imp) vs. where it was aimed.
// Returns a WoWS-style cue: rel = ON | SHORT | LONG | OFF, mag (km of the
// dominant miss), and for OFF a LEFT/RIGHT lateral. dAim = intended range.
export function shotOutcome(origin, aim, imp) {
  const dAim = gcDist(origin, aim);
  const dOff = gcDist(aim, imp);
  if (dOff < 0.2) return { dAim, dOff: 0, along: 0, perp: 0, rel: 'ON', lateral: null, mag: 0, bearing: bearingTo(origin, aim) };
  const bf = bearingTo(origin, aim);   // firing bearing (origin -> aim)
  const bi = bearingTo(aim, imp);      // aim -> impact bearing
  let ang = bi - bf; ang = ((ang % 360) + 360) % 360; if (ang > 180) ang -= 360; // -180..180
  const ar = ang * Math.PI / 180;
  const along = dOff * Math.cos(ar);   // + = LONG (past aim), - = SHORT (behind aim)
  const perp = dOff * Math.sin(ar);    // + = RIGHT of firing dir, - = LEFT
  let rel, mag;
  if (Math.abs(along) >= Math.abs(perp)) { rel = along >= 0 ? 'LONG' : 'SHORT'; mag = Math.abs(along); }
  else { rel = 'OFF'; mag = Math.abs(perp); }
  const lateral = rel === 'OFF' ? (perp >= 0 ? 'RIGHT' : 'LEFT') : null;
  return { dAim, dOff, along, perp, rel, lateral, mag, bearing: bf };
}

// bearing (degrees, 0=N 90=E) from point A to point B along great circle
export function bearingTo(a, b) {
  const n = norm(latLonToV3(a.lat, a.lon));
  const n2 = norm(latLonToV3(b.lat, b.lon));
  const d = angBetween(n, n2);
  if (d < 1e-9) return 0;
  const dir = norm(rotateAroundAxis(n, norm(cross(n, n2)), d / 2));
  const { east, north } = surfaceBasis(n);
  const c = dot(dir, north), s = dot(dir, east);
  let brg = Math.atan2(s, c) / DEG;
  if (brg < 0) brg += 360;
  return brg;
}

// slerp between two lat/lon surface points, t in [0,1]
export function slerpPoint(a, b, t) {
  const va = norm(latLonToV3(a.lat, a.lon));
  const vb = norm(latLonToV3(b.lat, b.lon));
  const d = angBetween(va, vb);
  if (d < 1e-9) return { lat: a.lat, lon: a.lon };
  const s = Math.sin(d);
  const w1 = Math.sin((1 - t) * d) / s;
  const w2 = Math.sin(t * d) / s;
  return v3ToLatLon(add(scale(va, w1), scale(vb, w2)));
}

// ---------------------------------------------------------------------------
// Deterministic wind field: sum of drifting vortices. Same function on both
// sides so client previews match server simulation. Returns km/h vector.
// ---------------------------------------------------------------------------
const VORTS = [
  { lat: 35, lon: -100, str: 46, rad: 55, sp: 4.0, ph: 0.0 },
  { lat: -15, lon: 150, str: 38, rad: 70, sp: -3.1, ph: 1.7 },
  { lat: 60, lon: 30, str: 52, rad: 60, sp: 2.4, ph: 3.1 },
  { lat: -30, lon: -40, str: 40, rad: 50, sp: -4.4, ph: 4.4 },
  { lat: 10, lon: 60, str: 30, rad: 65, sp: 3.6, ph: 5.2 },
];

export function windAt(lat, lon, tMin) {
  // tMin = simulated minutes
  let wx = 0, wy = 0; // in (lat, lon) "degrees/min" space; convert to km/h N/E
  for (const v of VORTS) {
    const lonDrift = v.lon + v.sp * (tMin / 60); // vortex center drifts in lon
    // angular distance (deg) between point and vortex center (approx, fine at this scale)
    const dLat = lat - v.lat;
    const dLon = ((lon - lonDrift) % 360 + 540) % 360 - 180;
    const d = Math.hypot(dLat, dLon * Math.cos((lat * DEG)));
    const fall = Math.exp(-(d * d) / (2 * v.rad * v.rad));
    // tangential direction (counterclockwise around vortex center in lat/lon space)
    const tx = -dLon, ty = dLat;
    const tl = Math.hypot(tx, ty) || 1;
    wx += (tx / tl) * v.str * fall;
    wy += (ty / tl) * v.str * fall;
  }
  // gentle global trade-wind baseline
  wx += 12 * Math.cos(lat * DEG) * Math.cos(lat * DEG); // eastward near equator
  wy += 4 * Math.sin(2 * lat * DEG);
  // wx/wy are km/h directly (vortex strength 30-52 km/h, trade winds ~12 km/h)
  return { north: wy, east: wx };
}

// wind as 3D vector in globe space at a point (km/h)
export function windVector3(lat, lon, tMin) {
  const w = windAt(lat, lon, tMin);
  const n = norm(latLonToV3(lat, lon));
  const { east, north } = surfaceBasis(n);
  return add(scale(north, w.north / 3.6), scale(east, w.east / 3.6)); // m/s
}
