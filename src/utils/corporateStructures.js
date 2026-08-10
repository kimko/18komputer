// Ids come from the corporate structures block of the source game files; only 1817 and its
// siblings are mapped correctly so far, so every unknown id falls back to a 10 share company.
const CORPORATE_STRUCTURES = {
  0: { name: '10 Share', totalShares: 10, holdingStep: 10, maxPlayerHolding: 60 },
  1: { name: '5 Share', totalShares: 5, holdingStep: 20, maxPlayerHolding: 60 },
  2: { name: '2 Share', totalShares: 2, holdingStep: 100, maxPlayerHolding: 100 }
};

export const DEFAULT_TOTAL_SHARES = 10;

const defaultStructure = (staticConfig) => ({
  name: '10 Share',
  totalShares: DEFAULT_TOTAL_SHARES,
  holdingStep: 10,
  maxPlayerHolding: Number(staticConfig?.maxPlayerHolding) || 60
});

export const getStructures = (staticConfig) => {
  const ids = staticConfig?.corporateStructures;
  const structures = Array.isArray(ids)
    ? ids.map(id => CORPORATE_STRUCTURES[id]).filter(Boolean)
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
  const ceiling = Math.min(structure?.maxPlayerHolding ?? 60, Number(maxAvailable) || 0);
  const options = [];
  for (let pct = 0; pct <= ceiling; pct += step) options.push(pct);
  return options.length > 0 ? options : [0];
};
