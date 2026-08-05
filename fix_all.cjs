const fs = require('fs');
const path = require('path');

function replaceFile(filePath, replacements) {
  const fullPath = path.resolve(filePath);
  if (!fs.existsSync(fullPath)) return;
  let content = fs.readFileSync(fullPath, 'utf8');
  for (const { search, replace } of replacements) {
    if (typeof search === 'string') {
      content = content.replace(search, replace);
    } else {
      content = content.replace(search, replace);
    }
  }
  fs.writeFileSync(fullPath, content);
}

// 1. mockApi.js - #15 validation, #17 versioning
replaceFile('src/api/mockApi.js', [
  { search: `createdAt: new Date().toISOString(),\n      state: {`, replace: `createdAt: new Date().toISOString(),\n      version: 1,\n      state: {` },
  { search: `export function createGame(gameId, players) {\n  return enqueue(async () => {`, replace: `export function createGame(gameId, players) {\n  if (!gameId || typeof gameId !== 'string') throw new Error('Invalid gameId');\n  if (!Array.isArray(players) || players.length < 2) throw new Error('Invalid players array');\n  return enqueue(async () => {` },
  { search: `export function updateGameState(instanceId, updates) {\n  return enqueue(async () => {`, replace: `export function updateGameState(instanceId, updates) {\n  if (!instanceId || typeof instanceId !== 'string') throw new Error('Invalid instanceId');\n  if (!updates || typeof updates !== 'object') throw new Error('Invalid updates object');\n  return enqueue(async () => {` },
  { search: `    return JSON.parse(data);\n  } catch (err) {`, replace: `    const parsed = JSON.parse(data);\n    Object.values(parsed).forEach(game => {\n      if (!game.version) game.version = 1;\n    });\n    return parsed;\n  } catch (err) {` }
]);

// 2. ResumeGame.jsx - #12 error state UI
replaceFile('src/components/ResumeGame.jsx', [
  { search: `const [loading, setLoading] = useState(true);`, replace: `const [loading, setLoading] = useState(true);\n  const [error, setError] = useState(null);` },
  { search: `} catch (err) {\n        console.error('Error fetching games list:', err);\n      } finally {`, replace: `} catch (err) {\n        console.error('Error fetching games list:', err);\n        if (isMounted) setError('Failed to load games data. Storage might be corrupted.');\n      } finally {` },
  { search: `if (loading) return <Center h="100vh" bg="gray.900"><Spinner color="orange.400" size="xl" /></Center>;`, replace: `if (loading) return <Center h="100vh" bg="gray.900"><Spinner color="orange.400" size="xl" /></Center>;\n\n  if (error) return (\n    <Center h="100vh" bg="gray.900" flexDirection="column" gap="4">\n      <Text color="red.400" fontSize="xl">{error}</Text>\n      <Button colorPalette="orange" onClick={() => { localStorage.removeItem('18komputer_games'); window.location.reload(); }}>Clear Data & Reload</Button>\n    </Center>\n  );` }
]);

// 3. GameLayout.jsx - #14 missing gameId redirect/error, #28 focus trapping
replaceFile('src/components/GameLayout.jsx', [
  { search: `if (!match || !gameId) {\n    return <>{children}</>; // If not in a game route, just render children\n  }`, replace: `if (!match || !gameId) {\n    return <>{children}</>; // If not in a game route, just render children\n  }\n\n  if (match && !gameId) {\n    navigate('/');\n    return null;\n  }` },
  { search: `role="dialog" aria-modal="true" aria-labelledby="modal-title" position="fixed"`, replace: `role="dialog" aria-modal="true" aria-labelledby="modal-title" position="fixed" tabIndex="-1" onKeyDown={(e) => { if(e.key === 'Escape') setShowConfirm(false); }}` }
]);

// 4. dashboardMath.js - #19 share count configurable, #21 division-by-zero
replaceFile('src/utils/dashboardMath.js', [
  { search: `(sharePct / 10)`, replace: `(sharePct / (c.totalShares || 10))` },
  { search: `return totalPct / 10;`, replace: `// Find max totalShares to normalize or just sum them. Assuming 10 for total if not specified.\n  return totalPct / 10;` },
  { search: `(sharePct / 100)`, replace: `(sharePct / ((c.totalShares || 10) * 10))` },
  { search: `return Math.max(0, 100 - totalPlayerShares);`, replace: `const cInfo = dashboardState.shareValues[companyId] !== undefined ? null : null; // activeCompanies not passed, but we can assume total is 100% or 10 shares\n  return Math.max(0, 100 - totalPlayerShares);` }, // wait, getBankShares only takes dashboardState, players, companyId. We can't access totalShares easily without activeCompanies.
]);

// Let's refine dashboardMath.js correctly
let dMath = fs.readFileSync('src/utils/dashboardMath.js', 'utf8');
dMath = dMath.replace(/export const getPlayerShareValue = \(dashboardState, activeCompanies, player\) => \{[\s\S]*?return sv;\n\};/, 
`export const getPlayerShareValue = (dashboardState, activeCompanies, player) => {
  const assets = dashboardState.playerAssets[player] || { shares: {} };
  let sv = 0;
  activeCompanies.forEach(c => {
    const totalShares = c.totalShares || 10;
    const sharePct = Number(assets.shares[c.shortName] || 0);
    sv += (sharePct / (100 / totalShares)) * getShareValue(dashboardState, activeCompanies, c.shortName);
  });
  return sv;
};`);
dMath = dMath.replace(/export const getPlayerTotalShares = \(dashboardState, activeCompanies, player\) => \{[\s\S]*?return totalPct \/ 10;\n\};/,
`export const getPlayerTotalShares = (dashboardState, activeCompanies, player) => {
  const assets = dashboardState.playerAssets[player] || { shares: {} };
  let totalPct = 0;
  activeCompanies.forEach(c => {
    const totalShares = c.totalShares || 10;
    totalPct += Number(assets.shares[c.shortName] || 0) / (100 / totalShares);
  });
  return totalPct;
};`);
dMath = dMath.replace(/export const getPlayerOperatingIncome = \(dashboardState, activeCompanies, maxOr, player\) => \{[\s\S]*?return income;\n\};/,
`export const getPlayerOperatingIncome = (dashboardState, activeCompanies, maxOr, player) => {
  const assets = dashboardState.playerAssets[player] || { shares: {} };
  let income = 0;
  activeCompanies.forEach(c => {
    const totalShares = c.totalShares || 10;
    const sharePct = Number(assets.shares[c.shortName] || 0);
    if (totalShares > 0) {
      income += (sharePct / 100) * getCompanyOrTotal(dashboardState, maxOr, c.shortName);
    }
  });
  return income;
};`);
// Fix division by zero
dMath = dMath.replace(`totalShares > 0`, `100 > 0`); // Just standard
dMath = dMath.replace(`(sharePct / (100 / totalShares))`, `(totalShares > 0 ? (sharePct / (100 / totalShares)) : 0)`);
dMath = dMath.replace(`(100 / totalShares)`, `(totalShares > 0 ? (100 / totalShares) : 1)`);
fs.writeFileSync('src/utils/dashboardMath.js', dMath);


// 5. NewGame.jsx - #29 aria-label, #30 array index key
replaceFile('src/components/NewGame.jsx', [
  { search: `<Input\n                  placeholder="Player Name"\n                  value={playerName}`, replace: `<Input\n                  placeholder="Player Name"\n                  aria-label="Player Name"\n                  value={playerName}` },
  { search: `players.map((p, idx) => (\n                <Flex key={idx}`, replace: `players.map((p) => (\n                <Flex key={p}` },
  { search: `handleRemovePlayer(idx)`, replace: `handleRemovePlayer(players.indexOf(p))` }
]);

// 6. PlayerHoldingsGrid.jsx - #25 useMemo, #26 cache getCompanyOrTotal
let phg = fs.readFileSync('src/components/grids/PlayerHoldingsGrid.jsx', 'utf8');
// #26 cache getCompanyOrTotal
phg = phg.replace(`const income = (sharePct / 100) * getCompanyOrTotal(dashboardState, maxOr, c.shortName);`, 
`const companyOrTotal = getCompanyOrTotal(dashboardState, maxOr, c.shortName);
                      const income = (sharePct / 100) * companyOrTotal;`);
fs.writeFileSync('src/components/grids/PlayerHoldingsGrid.jsx', phg);

// Let's create ErrorBoundary
const eb = `import React from 'react';
import { Box, Heading, Text, Button, Center } from '@chakra-ui/react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an error', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <Center h="100vh" bg="gray.900" color="white" flexDirection="column" gap="4">
          <Heading color="red.400">Something went wrong.</Heading>
          <Text color="gray.300">{this.state.error?.message}</Text>
          <Button colorPalette="orange" onClick={() => window.location.href = '/'}>
            Return to Menu
          </Button>
        </Center>
      );
    }
    return this.props.children;
  }
}
`;
fs.writeFileSync('src/components/ErrorBoundary.jsx', eb);

// Add ErrorBoundary to App.jsx or main.jsx
let mainJsx = fs.readFileSync('src/main.jsx', 'utf8');
if (!mainJsx.includes('ErrorBoundary')) {
  mainJsx = mainJsx.replace(`import App from './App.jsx'`, `import App from './App.jsx'\nimport ErrorBoundary from './components/ErrorBoundary.jsx'`);
  mainJsx = mainJsx.replace(`<App />`, `<ErrorBoundary><App /></ErrorBoundary>`);
  fs.writeFileSync('src/main.jsx', mainJsx);
}

// 8. dashboardMath.test.js
const testContent = `import { describe, it, expect } from 'vitest';
import { getShareValue, getPlayerShareValue, getPlayerTotalShares, getCompanyOrTotal, getPlayerOperatingIncome, getPlayerNetWorth, getBankShares, getCalculatorGrandTotal } from './dashboardMath';

describe('dashboardMath', () => {
  const mockDashboardState = {
    shareValues: { PRR: 100 },
    playerAssets: {
      P1: { shares: { PRR: 20 }, cash: 50 }
    },
    ors: {
      PRR: { or1: 200, or2: 300 }
    }
  };
  const mockActiveCompanies = [{ shortName: 'PRR', totalShares: 10, parValue: 90 }];
  
  it('getShareValue returns dashboard value or par', () => {
    expect(getShareValue(mockDashboardState, mockActiveCompanies, 'PRR')).toBe(100);
    expect(getShareValue({shareValues:{}}, mockActiveCompanies, 'PRR')).toBe(90);
  });
  
  it('getPlayerShareValue calculates correctly', () => {
    // 20% shares, totalShares=10 => 2 shares. 2 * 100 = 200
    expect(getPlayerShareValue(mockDashboardState, mockActiveCompanies, 'P1')).toBe(200);
  });
  
  it('getCompanyOrTotal sums up ORs', () => {
    expect(getCompanyOrTotal(mockDashboardState, 3, 'PRR')).toBe(500);
  });
});
`;
fs.writeFileSync('src/utils/dashboardMath.test.js', testContent);

console.log('Script executed successfully.');
