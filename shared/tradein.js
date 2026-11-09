// Trade-in valuation shared by the browser (instant estimate) and the server (authoritative on submit).
export const CONDITION_ORDER = ['likeNew', 'good', 'fair', 'broken'];

export function estimateTradeIn(device, answers, cfg) {
  if (!device || !cfg) return null;
  const a = answers || {};
  const storageBonus = (cfg.storageBonus && cfg.storageBonus[a.storage]) || 0;
  const worst = [a.screen, a.body].filter(Boolean)
    .sort((x, y) => CONDITION_ORDER.indexOf(y) - CONDITION_ORDER.indexOf(x))[0] || 'good';
  let v = (device.base_value + storageBonus) * (cfg.condition?.[worst] ?? 1);
  if (a.battery && cfg.battery) v *= cfg.battery[a.battery] ?? 1;
  const np = cfg.noPenalty || {};
  if (a.powers === false) v *= np.powers ?? 1;
  if (a.bio === false) v *= np.bio ?? 1;
  if (a.unlocked === false) v *= np.unlocked ?? 1;
  const r5 = (n) => Math.max(0, Math.round(n / 5) * 5);
  const high = r5(v);
  return { low: r5(v * (cfg.rangeLow ?? 0.85)), high, credit: r5(high * (1 + (cfg.creditBonus ?? 0))), condition: worst };
}
