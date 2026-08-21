// A bonus pays out but never fills a train: a 4 train with two bonuses has still only run four
// stops. Everything here works from that split, so the stop count and the revenue stay separate.

// Bonus entries on a saved train carry a short form of the label rather than the whole thing,
// because the chip and the receipt route both have to fit in very little room. A label already
// that short is kept whole, so "2x" stays "2x" rather than becoming a meaningless "2".
export const bonusKey = (bonus) => {
  const label = String(bonus?.label ?? '');
  return label.length <= 2 ? label : label.slice(0, 1);
};

// Most bonuses are worth a fixed amount, written into the entry when it was added. A doubling
// bonus has no amount of its own, because it is worth whatever the train's best stop is worth,
// and that changes every time a stop is added or taken away.
export const bonusValue = (entry, stops = []) => {
  if (entry?.doubles === 'highestStop') {
    return stops.length ? Math.max(...stops.map(Number)) : 0;
  }
  return Number(entry?.val) || 0;
};

// What the calculator writes into a train when a bonus button is pressed.
export const toBonusEntry = (bonus, val) => {
  const entry = { val: Number(val) || 0, label: bonusKey(bonus) };
  return bonus?.doubles ? { ...entry, doubles: bonus.doubles } : entry;
};

export const trainStopsTotal = (train) => (train?.stops || []).reduce((sum, v) => sum + Number(v), 0);

export const trainBonusTotal = (train) => {
  const stops = train?.stops || [];
  return (train?.bonusStops || []).reduce((sum, entry) => sum + bonusValue(entry, stops), 0);
};

export const trainRevenue = (train) => trainStopsTotal(train) + trainBonusTotal(train);

// Excluded trains stay on screen, so they are skipped here rather than filtered out by the caller.
export const trainsRevenue = (trains = []) =>
  trains.filter((train) => !train.isExcluded).reduce((sum, train) => sum + trainRevenue(train), 0);

// Absent means the title puts no limit on how often the bonus can be claimed for one train.
export const bonusesLeft = (bonus, train) => {
  const limit = Number(bonus?.maxPerTrain);
  if (!Number.isFinite(limit)) return Infinity;
  const key = bonusKey(bonus);
  const used = (train?.bonusStops || []).filter((entry) => entry.label === key).length;
  return Math.max(0, limit - used);
};
