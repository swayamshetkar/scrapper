const CID_RE = /^0x[0-9a-f]{16}:0x[0-9a-f]{16}$/i;

export function safeGet(root, path) {
  let value = root;
  for (const key of path) {
    if (value == null) return null;
    value = value[key];
  }
  return value == null ? null : value;
}

export function findXssiJspbPayload(state) {
  const seen = new WeakSet();
  let best = null;
  let visited = 0;
  const budget = 200000;
  function walk(node, depth) {
    if (++visited > budget || depth > 20) return;
    if (typeof node === 'string') {
      if (node.length > 1000 && node.startsWith(")]}'") && (!best || node.length > best.length)) best = node;
      return;
    }
    if (!node || typeof node !== 'object') return;
    if (seen.has(node)) return;
    seen.add(node);
    const values = Array.isArray(node) ? node : Object.values(node);
    for (const item of values) walk(item, depth + 1);
  }
  walk(state, 0);
  return best;
}

export function parseXssiPayload(raw) {
  if (!raw || typeof raw !== 'string') return null;
  const start = raw.indexOf('\n');
  const json = start >= 0 ? raw.slice(start + 1) : raw.replace(/^\)\]\}'\s*/, '');
  return JSON.parse(json);
}

function firstValid(root, paths, validate = (v) => v != null) {
  for (const path of paths) {
    const value = safeGet(root, path);
    if (validate(value)) return value;
  }
  return null;
}

function parseReviewCount(text) {
  if (typeof text !== 'string') return null;
  const match = text.match(/[\d.,]+/);
  if (!match) return null;
  const value = Number.parseInt(match[0].replace(/[.,]/g, ''), 10);
  return Number.isFinite(value) ? value : null;
}

function extractPhone(inner) {
  const sub = inner[178];
  if (!Array.isArray(sub)) return null;
  const variants = safeGet(sub, [0, 1]);
  const e164 = Array.isArray(variants) ? variants.find((item) => Array.isArray(item) && item[1] === 2 && typeof item[0] === 'string')?.[0] : null;
  const digits = safeGet(sub, [0, 3]);
  const display = safeGet(sub, [0, 0]);
  const tel = safeGet(sub, [0, 5, 0]);
  if (!digits && !display && !e164 && !tel) return null;
  return { digits: typeof digits === 'string' ? digits : null, display: typeof display === 'string' ? display : null, e164: typeof e164 === 'string' ? e164 : null, tel: typeof tel === 'string' ? tel : null };
}

function extractWeeklyHours(inner) {
  const days = safeGet(inner, [203, 0]);
  if (!Array.isArray(days)) return null;
  return days.filter(Array.isArray).map((day) => ({
    day_name: typeof day[0] === 'string' ? day[0] : null,
    day_index: typeof day[1] === 'number' ? day[1] : null,
    periods: Array.isArray(day[3]) ? day[3].filter(Array.isArray).map((period) => ({ display: period[0] ?? null, structured: period[1] ?? null })) : []
  }));
}

function extractCategoryCodes(inner) {
  if (!Array.isArray(inner[76])) return null;
  return inner[76].filter(Array.isArray).map((item) => ({ code: item[0] ?? null, display: item[1] ?? null }));
}

function validRating(value) { return typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 5; }
function validCountry(value) { return typeof value === 'string' && /^[A-Z]{2}$/.test(value); }

export function extractBusinessFromJspbInner(inner) {
  if (!Array.isArray(inner)) return null;
  const cid = inner[10];
  if (typeof cid !== 'string' || !CID_RE.test(cid)) return null;
  const reviewsText = safeGet(inner, [4, 3, 1]);
  const rating = firstValid(inner, [[4, 7]], validRating);
  const countryCode = firstValid(inner, [[243]], validCountry);
  const postcode = typeof safeGet(inner, [183, 1, 4]) === 'string' ? safeGet(inner, [183, 1, 4]) : null;
  return {
    cid: cid.toLowerCase(), title: typeof inner[11] === 'string' ? inner[11] : null,
    placeId: typeof inner[78] === 'string' ? inner[78] : null,
    knowledgeGraphId: typeof inner[89] === 'string' ? inner[89] : null,
    latitude: typeof safeGet(inner, [9, 2]) === 'number' ? safeGet(inner, [9, 2]) : null,
    longitude: typeof safeGet(inner, [9, 3]) === 'number' ? safeGet(inner, [9, 3]) : null,
    addressFormatted: typeof inner[39] === 'string' ? inner[39] : null,
    addressFull: typeof inner[18] === 'string' ? inner[18] : null,
    addressLine1: typeof safeGet(inner, [2, 0]) === 'string' ? safeGet(inner, [2, 0]) : null,
    addressLine2: typeof safeGet(inner, [2, 1]) === 'string' ? safeGet(inner, [2, 1]) : null,
    street: typeof safeGet(inner, [82, 1]) === 'string' ? safeGet(inner, [82, 1]) : null,
    city: typeof inner[166] === 'string' ? inner[166] : null,
    countryCode,
    postcode: countryCode === 'IT' && postcode && !/^\d{5}$/.test(postcode) ? null : postcode,
    province: typeof safeGet(inner, [183, 1, 5]) === 'string' ? safeGet(inner, [183, 1, 5]) : null,
    phone: extractPhone(inner),
    website: typeof safeGet(inner, [7, 0]) === 'string' ? safeGet(inner, [7, 0]) : null,
    websiteDomain: typeof safeGet(inner, [7, 1]) === 'string' ? safeGet(inner, [7, 1]) : null,
    reservationUrl: typeof safeGet(inner, [46, 0, 0]) === 'string' ? safeGet(inner, [46, 0, 0]) : null,
    categoryNames: Array.isArray(inner[13]) ? inner[13].filter((item) => typeof item === 'string') : null,
    primaryCategory: typeof safeGet(inner, [13, 0]) === 'string' ? safeGet(inner, [13, 0]) : null,
    categoryCodes: extractCategoryCodes(inner),
    ratingDecimal: rating,
    reviewsCount: typeof safeGet(inner, [4, 8]) === 'number' ? safeGet(inner, [4, 8]) : parseReviewCount(reviewsText),
    reviewsText: typeof reviewsText === 'string' ? reviewsText : null,
    priceRangeText: typeof safeGet(inner, [4, 2]) === 'string' ? safeGet(inner, [4, 2]) : null,
    openStatusShort: typeof safeGet(inner, [203, 1, 8, 0]) === 'string' ? safeGet(inner, [203, 1, 8, 0]) : null,
    openStatusFull: typeof safeGet(inner, [203, 1, 4, 0]) === 'string' ? safeGet(inner, [203, 1, 4, 0]) : null,
    openingHours: extractWeeklyHours(inner),
    ownerInformation: safeGet(inner, [57, 1]) || safeGet(inner, [57, 2]) ? { owner_name: safeGet(inner, [57, 1]) ?? null, owner_id: safeGet(inner, [57, 2]) ?? null, owner_photo_url: typeof inner[157] === 'string' ? inner[157] : null } : null,
    primaryPhotoUrl: typeof safeGet(inner, [37, 0, 0, 6, 0]) === 'string' ? safeGet(inner, [37, 0, 0, 6, 0]) : null
  };
}

export function extractBusinessesFromParsedJspb(parsed) {
  const businesses = new Map();
  function walk(node) {
    if (!Array.isArray(node)) return;
    const candidate = Array.isArray(node[1]) ? extractBusinessFromJspbInner(node[1]) : null;
    if (candidate && !businesses.has(candidate.cid)) businesses.set(candidate.cid, candidate);
    for (const item of node) walk(item);
  }
  walk(parsed);
  return [...businesses.values()];
}

export function extractBusinessesFromAppState(state) {
  const raw = findXssiJspbPayload(state);
  if (!raw) return [];
  return extractBusinessesFromParsedJspb(parseXssiPayload(raw));
}
