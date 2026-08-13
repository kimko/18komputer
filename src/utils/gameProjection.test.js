import { describe, it, expect } from 'vitest';
import { countRecordedRounds, buildTimeline, projectNetWorth } from './gameProjection';
import { getPlayerNetWorth } from './dashboardMath';
import game1830 from '../data/games/1830.json';

const companies = [
  { shortName: 'PRR', name: 'Pennsylvania', parValue: 90, totalShares: 10, color: '#237333' },
  { shortName: 'NYC', name: 'New York Central', parValue: 90, totalShares: 10, color: '#000000' }
];

// PRR pays twice and ends at 126; NYC pays then withholds and ends back at 90.
const dashboardState = {
  ors: { PRR: { or1: 100, or2: 200 }, NYC: { or1: 100, or2: 0 } },
  shareValues: { PRR: 126, NYC: 90 },
  sharePositions: { PRR: [1, 9], NYC: [1, 6] },
  playerAssets: {
    Kim: { cash: 500, shares: { PRR: 60, NYC: 40 } },
    Sam: { cash: 300, shares: { PRR: 30 } }
  }
};

const project = (over = {}) => projectNetWorth({
  dashboardState,
  staticConfig: game1830,
  maxOr: 3,
  players: ['Kim', 'Sam'],
  activeCompanies: companies,
  ...over
});

describe('countRecordedRounds', () => {
  it('counts only the rounds that have a figure somewhere', () => {
    expect(countRecordedRounds(dashboardState, 3, companies)).toBe(2);
  });

  it('counts a round recorded as zero, because withholding is a result', () => {
    const withheld = { ors: { PRR: { or1: 0, or2: 0, or3: 0 } } };
    expect(countRecordedRounds(withheld, 3, companies)).toBe(3);
  });

  it('has nothing to count when no round was played', () => {
    expect(countRecordedRounds({ ors: {} }, 3, companies)).toBe(0);
  });
});

describe('buildTimeline', () => {
  it('lays out a share round then its operating rounds, up to twelve ticks', () => {
    const labels = buildTimeline(2).map((tick) => tick.label);

    expect(labels).toHaveLength(12);
    expect(labels).toEqual([
      'SR1', 'OR1', 'OR2',
      'SR2', 'OR1', 'OR2',
      'SR3', 'OR1', 'OR2',
      'SR4', 'OR1', 'OR2'
    ]);
  });

  it('marks only the first share round and its rounds as recorded', () => {
    const timeline = buildTimeline(2);

    expect(timeline.slice(0, 3).every((tick) => tick.recorded)).toBe(true);
    expect(timeline.slice(3).some((tick) => tick.recorded)).toBe(false);
  });

  it('gives every tick an id of its own, because the labels repeat', () => {
    const ids = buildTimeline(2).map((tick) => tick.id);
    expect(new Set(ids).size).toBe(12);
  });

  it('fills twelve ticks whatever the number of rounds', () => {
    expect(buildTimeline(1)).toHaveLength(12);
    expect(buildTimeline(5)).toHaveLength(12);
    expect(buildTimeline(3).map((t) => t.label).slice(0, 5)).toEqual(['SR1', 'OR1', 'OR2', 'OR3', 'SR2']);
  });

  it('leaves no room to project when the recorded rounds already fill the chart', () => {
    const timeline = buildTimeline(11);
    expect(timeline).toHaveLength(12);
    expect(timeline.every((tick) => tick.recorded)).toBe(true);
  });

  it('has nothing to show when no round was recorded', () => {
    expect(buildTimeline(0)).toEqual([]);
  });
});

describe('projectNetWorth', () => {
  it('starts at the last share round and runs to twelve ticks', () => {
    const rows = project();

    expect(rows).toHaveLength(12);
    expect(rows[0].label).toBe('SR1');
    expect(rows[2].label).toBe('OR2');
  });

  // The one figure the chart must agree with is the one the results table already shows.
  it('lands on the recorded net worth at the last recorded round', () => {
    const rows = project();
    const last = rows.filter((row) => row.recorded).pop();

    ['Kim', 'Sam'].forEach((player) => {
      expect(last.netWorth[player])
        .toBeCloseTo(getPlayerNetWorth(dashboardState, companies, 3, player), 6);
    });
  });

  it('never touches the cash, because it was entered once and describes an earlier moment', () => {
    const rows = project();

    rows.forEach((row) => {
      expect(row.cash.Kim).toBe(500);
      expect(row.cash.Sam).toBe(300);
    });
  });

  it('collects no dividends until a round has been played', () => {
    const [first] = project();

    expect(first.dividends.Kim).toBe(0);
    expect(first.netWorth.Kim).toBe(first.cash.Kim + first.shareValue.Kim);
  });

  it('keeps paying dividends into the projected rounds', () => {
    const rows = project();
    const lastRecorded = rows.filter((row) => row.recorded).pop();
    const end = rows[rows.length - 1];

    expect(end.dividends.Kim).toBeGreaterThan(lastRecorded.dividends.Kim);
  });

  it('takes the sold out move again at every projected share round', () => {
    const soldOut = {
      ...dashboardState,
      playerAssets: { Kim: { cash: 500, shares: { PRR: 100 } }, Sam: { cash: 300, shares: {} } }
    };
    const rows = project({ dashboardState: soldOut });
    const prices = rows.map((row) => row.prices.PRR);
    const firstSr = rows.findIndex((row, i) => i > 2 && row.kind === 'sr');

    expect(prices[firstSr]).toBeGreaterThan(prices[firstSr - 1]);
  });

  it('keeps a company that withheld sliding down through the projection', () => {
    const rows = project();
    const nycAtEnd = rows[rows.length - 1].prices.NYC;

    // NYC's last recorded round withheld, so every projected round withholds too.
    expect(nycAtEnd).toBeLessThan(rows[2].prices.NYC);
  });

  it('holds a company still when its price could not be explained', () => {
    const puzzling = {
      ...dashboardState,
      ors: { PRR: { or1: 100 } },
      shareValues: { PRR: 10, NYC: 90 },
      sharePositions: { PRR: [7, 0], NYC: [1, 6] }
    };
    const rows = project({ dashboardState: puzzling });

    expect(rows.every((row) => row.prices.PRR === 10)).toBe(true);
    expect(rows[0].unexplained).toContain('PRR');
  });

  it('has nothing to draw when no round was recorded', () => {
    expect(project({ dashboardState: { ...dashboardState, ors: {} } })).toEqual([]);
  });
});
