// Recalibrage des seuils de boss sur le ROSTER RÉEL (base Neon).
// Lance: node scripts/calibrate.mjs
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const COST_COEF = 0.4;
const CATEGORY_BONUS = 0.5;
const BUDGET = 100;

const CATEGORIES = [
  "occult-energy",
  "physical-strength",
  "speed",
  "battle-iq",
  "innate-technique",
  "domain-expansion",
  "black-flash",
  "teammate",
];

function contribution(c, slotCat) {
  const base = c.statValue;
  const costBonus = Math.round(c.cost * COST_COEF);
  const categoryBonus =
    slotCat === c.excellenceCategory ? Math.round(c.statValue * CATEGORY_BONUS) : 0;
  return base + costBonus + categoryBonus;
}

const rows = await prisma.draftCharacter.findMany({
  select: { id: true, name: true, excellenceCategory: true, tier: true, cost: true, statValue: true },
});
console.log(`Roster en base : ${rows.length} persos`);

// Cloisonné : pour chaque catégorie, options = persos de cette excellence.
const byCat = {};
for (const cat of CATEGORIES) {
  byCat[cat] = rows
    .filter((c) => c.excellenceCategory === cat)
    .map((c) => ({ id: c.id, name: c.name, tier: c.tier, cost: c.cost, contrib: contribution(c, cat) }));
  if (byCat[cat].length === 0) {
    console.log(`  ⚠️  catégorie vide: ${cat}`);
  }
}

// Brute-force toutes les équipes légales : min, max, distribution.
let min = Infinity, max = -Infinity, bestSel = null, worstSel = null;
const scores = [];
function rec(i, cost, score, sel) {
  if (i === CATEGORIES.length) {
    scores.push(score);
    if (score > max) { max = score; bestSel = { ...sel }; }
    if (score < min) { min = score; worstSel = { ...sel }; }
    return;
  }
  for (const opt of byCat[CATEGORIES[i]]) {
    if (cost + opt.cost <= BUDGET) {
      sel[CATEGORIES[i]] = `${opt.name}(${opt.tier},c${opt.cost})`;
      rec(i + 1, cost + opt.cost, score + opt.contrib, sel);
    }
  }
}
rec(0, 0, 0, {});

scores.sort((a, b) => a - b);
const q = (p) => scores[Math.floor((scores.length - 1) * p)];
const N = scores.length;
console.log(`\nÉquipes légales (budget ≤ ${BUDGET}) : ${N}`);
console.log(`min=${min}  max=${max}`);

// % d'équipes qui BATTENT (score >= seuil) un boss donné — recherche binaire.
const beatPct = (t) => {
  let lo = 0, hi = N;
  while (lo < hi) { const m = (lo + hi) >> 1; if (scores[m] >= t) hi = m; else lo = m + 1; }
  return (((N - lo) / N) * 100).toFixed(1);
};

console.log("\nseuil -> % d'équipes qui le battent :");
for (let t = 110; t <= 240; t += 5) {
  console.log(`  ${t}: ${beatPct(t)}%`);
}

await prisma.$disconnect();
