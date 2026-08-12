import LZString from 'lz-string';
import { generateGameName } from '../../api/mockApi.js';
import { DEFAULT_TOTAL_SHARES } from '../../utils/corporateStructures.js';

// Bumped only when the wire shape changes; a token without it is the original format.
const FORMAT = 1;

const isBlank = (value) => value === '' || value === null || value === undefined;
const isZero = (value) => isBlank(value) || Number(value) === 0;

const dropZeros = (map = {}) =>
  Object.fromEntries(Object.entries(map).filter(([, value]) => !isZero(value)));

// A round recorded as zero means the company withheld, which moves its price, so it has to travel.
const dropBlanks = (map = {}) =>
  Object.fromEntries(Object.entries(map).filter(([, value]) => !isBlank(value)));

// Named the same day it was created, so a title nobody has touched can be rebuilt on arrival.
const isAutomaticName = (game) =>
  game.gameName === generateGameName(game.gameId, (game.players || []).length, parseDay(game.createdAt));

function parseDay(value) {
  const date = value ? new Date(value) : new Date();
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

// A bare date is midnight UTC, which is the day before in the Americas, so it is read back as local.
function parseStoredDay(value) {
  const [year, month, day] = String(value).split('-').map(Number);
  return year && month && day ? new Date(year, month - 1, day) : new Date(value);
}

function compactCompanies(companies = []) {
  return companies.map(({ name: _name, color: _color, totalShares, ...rest }) => ({
    ...rest,
    ...(totalShares && Number(totalShares) !== DEFAULT_TOTAL_SHARES ? { totalShares } : {})
  }));
}

function compactDashboard(dashboardState = {}, companies = [], staticMaxOr) {
  const parOf = Object.fromEntries(companies.map((c) => [c.shortName, c.parValue]));
  const { ors = {}, shareValues = {}, playerAssets = {}, maxOr, ...rest } = dashboardState;

  return {
    ...rest,
    ...(maxOr && Number(maxOr) !== Number(staticMaxOr) ? { maxOr } : {}),
    ors: Object.fromEntries(
      Object.entries(ors)
        .map(([shortName, revenue]) => [shortName, dropBlanks(revenue)])
        .filter(([, revenue]) => Object.keys(revenue).length > 0)
    ),
    shareValues: Object.fromEntries(
      Object.entries(shareValues).filter(
        ([shortName, value]) => !isBlank(value) && Number(value) !== Number(parOf[shortName])
      )
    ),
    playerAssets: Object.fromEntries(
      Object.entries(playerAssets).map(([player, assets = {}]) => {
        const { cash, shares, ...others } = assets;
        return [player, {
          ...others,
          ...(isZero(cash) ? {} : { cash }),
          shares: dropZeros(shares)
        }];
      })
    )
  };
}

export function buildShareToken(gameInstance, dashboardState, { includeCalculator = true } = {}) {
  const { staticConfig, state, ...game } = gameInstance;
  const { calculatorState, playerAssets: _dead, companyORs: _alsoDead, ...restState } = state;
  const companies = state.activeCompanies || [];

  const nextState = {
    ...restState,
    ...(includeCalculator ? { calculatorState } : {}),
    activeCompanies: compactCompanies(companies),
    dashboardState: compactDashboard(dashboardState, companies, staticConfig?.maxOr)
  };

  const compact = { ...game, f: FORMAT, state: nextState };
  if (game.createdAt) compact.createdAt = new Date(game.createdAt).toISOString().slice(0, 10);
  if (isAutomaticName(game)) delete compact.gameName;

  return LZString.compressToEncodedURIComponent(JSON.stringify(compact));
}

async function loadCompanyDetails(gameId) {
  try {
    const definition = await import(`../../data/games/${gameId}.json`);
    const companies = (definition.default || definition).companies || [];
    return Object.fromEntries(companies.map((c) => [c.shortName, c]));
  } catch {
    return {};
  }
}

export async function readShareToken(token) {
  let game;
  try {
    game = JSON.parse(LZString.decompressFromEncodedURIComponent(token));
  } catch {
    return null;
  }
  if (!game || typeof game !== 'object') return null;
  if (game.f !== FORMAT) return game;

  const { f: _format, ...rest } = game;
  const details = await loadCompanyDetails(game.gameId);
  const companies = (game.state?.activeCompanies || []).map((company) => {
    const { name, color } = details[company.shortName] || {};
    return { ...(name ? { name } : {}), ...(color ? { color } : {}), ...company };
  });

  const parOf = Object.fromEntries(companies.map((c) => [c.shortName, c.parValue]));
  const shareValues = { ...(game.state?.dashboardState?.shareValues || {}) };
  companies.forEach(({ shortName }) => {
    if (shareValues[shortName] === undefined && parOf[shortName] !== undefined) {
      shareValues[shortName] = parOf[shortName];
    }
  });

  const createdAt = rest.createdAt ? parseStoredDay(rest.createdAt).toISOString() : rest.createdAt;
  const players = rest.players || [];

  return {
    ...rest,
    ...(createdAt ? { createdAt } : {}),
    gameName: rest.gameName || generateGameName(rest.gameId, players.length, parseStoredDay(rest.createdAt)),
    state: {
      ...game.state,
      activeCompanies: companies,
      dashboardState: { ...game.state?.dashboardState, shareValues }
    }
  };
}

function resumeUrl(origin, pathname) {
  const segments = pathname.split('/').filter(Boolean);
  const root = segments.length > 0 && segments[0] !== 'game' ? `/${segments[0]}` : '';
  return `${origin}${root}/resume`;
}

export function buildShareLink(origin, pathname, token) {
  return `${resumeUrl(origin, pathname)}#import=${token}`;
}

export function buildRemoteLink(origin, pathname, gameId) {
  return `${resumeUrl(origin, pathname)}#remote=${gameId}`;
}
