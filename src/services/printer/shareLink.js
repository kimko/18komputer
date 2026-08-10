import LZString from 'lz-string';

export function buildShareToken(gameInstance, dashboardState, { includeCalculator = true } = {}) {
  const { staticConfig: _ignored, state, ...game } = gameInstance;
  const { calculatorState, ...restState } = state;
  const nextState = {
    ...restState,
    ...(includeCalculator ? { calculatorState } : {}),
    dashboardState
  };

  return LZString.compressToEncodedURIComponent(
    JSON.stringify({ ...game, state: nextState, exportedAt: new Date().toISOString() })
  );
}

export function buildShareLink(origin, pathname, token) {
  const segments = pathname.split('/').filter(Boolean);
  const root = segments.length > 0 && segments[0] !== 'game' ? `/${segments[0]}` : '';
  return `${origin}${root}/resume#import=${token}`;
}
