// Ids come from the corporate structures block of the source game files; only 1817 and its
// siblings are mapped correctly so far, so every unknown id falls back to a 10 share company.
const CORPORATE_STRUCTURES = {
  0: { name: '10 Share', totalShares: 10, holdingStep: 10 },
  1: { name: '5 Share', totalShares: 5, holdingStep: 20 },
  2: { name: '2 Share', totalShares: 2, holdingStep: 100 }
};

export const DEFAULT_TOTAL_SHARES = 10;

// Most titles stop a player at 60% of a company; the few that let one player take the whole thing
// say so with maxPlayerHolding in their JSON.
const DEFAULT_MAX_PLAYER_HOLDING = 60;

// The title's own cap, but never below a single share, or the structure would be unbuyable: 1817
// stops a player at 60%, yet one share of its 2 share company is already the whole company.
const cappedAt = (staticConfig, holdingStep) => Math.max(
  Number(staticConfig?.maxPlayerHolding) || DEFAULT_MAX_PLAYER_HOLDING,
  holdingStep
);

const defaultStructure = (staticConfig) => ({
  name: '10 Share',
  totalShares: DEFAULT_TOTAL_SHARES,
  holdingStep: 10,
  maxPlayerHolding: cappedAt(staticConfig, 10)
});

export const getStructures = (staticConfig) => {
  const ids = staticConfig?.corporateStructures;
  const structures = Array.isArray(ids)
    ? ids
      .map(id => CORPORATE_STRUCTURES[id])
      .filter(Boolean)
      .map(s => ({ ...s, maxPlayerHolding: cappedAt(staticConfig, s.holdingStep) }))
    : [];
  return structures.length > 0 ? structures : [defaultStructure(staticConfig)];
};

export const getStructure = (staticConfig, totalShares) =>
  getStructures(staticConfig).find(s => s.totalShares === Number(totalShares))
    || defaultStructure(staticConfig);

export const hasStructureChoice = (staticConfig) => getStructures(staticConfig).length > 1;

export const canUseStructure = (structure, holdings = []) =>
  holdings.every(pct => {
    const held = Number(pct) || 0;
    return held % structure.holdingStep === 0 && held <= structure.maxPlayerHolding;
  });

export const getHoldingOptions = (structure, maxAvailable) => {
  const step = structure?.holdingStep || 10;
  const ceiling = Math.min(structure?.maxPlayerHolding ?? DEFAULT_MAX_PLAYER_HOLDING, Number(maxAvailable) || 0);
  const options = [];
  for (let pct = 0; pct <= ceiling; pct += step) options.push(pct);
  return options.length > 0 ? options : [0];
};
