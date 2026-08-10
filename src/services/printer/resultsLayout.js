import { COLS, centerText, spreadLine, sanitizeAscii } from './receiptLayout.js';
import {
  getPlayerNetWorth,
  getPlayerShareValue,
  getPlayerOperatingIncome,
  getPlayerTotalShares,
  formatCurrency
} from '../../utils/dashboardMath.js';

const INDENT = '    ';
const RULE = '-'.repeat(COLS);
const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

const upper = (text) => sanitizeAscii(text).toUpperCase();
const formatDate = (d) => `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
const formatShares = (n) => String(Number(Number(n).toFixed(1)));

const positionLine = (rank, name, money) => {
  const room = COLS - money.length - 1 - String(rank).length - 1;
  return spreadLine(`${rank} ${upper(name).slice(0, room)}`, money)[0];
};

export function buildResultsReceipt({ gameName, players, activeCompanies, dashboardState, maxOr, printedAt }) {
  const header = [centerText(upper(gameName || 'GAME')), centerText('FINAL RESULTS')];
  const body = [];
  const push = (text, bold = false) => body.push({ text, bold });

  push(RULE);

  const ranked = [...(players || [])]
    .map((p) => ({ p, net: getPlayerNetWorth(dashboardState, activeCompanies, maxOr, p) }))
    .sort((a, b) => b.net - a.net);

  if (ranked.length === 0) {
    push(centerText('NO RESULTS YET'));
  }

  ranked.forEach(({ p, net }, i) => {
    push(positionLine(i + 1, p, formatCurrency(net)), i === 0);
    const row = (label, value) => push(spreadLine(INDENT + label, value)[0]);
    row('SHARES', formatShares(getPlayerTotalShares(dashboardState, activeCompanies, p)));
    row('CASH', formatCurrency(Number(dashboardState.playerAssets[p]?.cash || 0)));
    row('STOCK', formatCurrency(getPlayerShareValue(dashboardState, activeCompanies, p)));
    row('INCOME', formatCurrency(getPlayerOperatingIncome(dashboardState, activeCompanies, maxOr, p)));
  });

  push(RULE);
  push('');
  push(centerText('SCAN TO OPEN RESULTS'));
  push(centerText(formatDate(printedAt || new Date())));

  return { header, body };
}
