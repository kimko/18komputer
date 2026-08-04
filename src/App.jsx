import { Route, Switch, Router } from 'wouter';
import MainMenu from './components/MainMenu.jsx';
import NewGame from './components/NewGame.jsx';
import ActivateCompany from './components/ActivateCompany.jsx';
import GameLayout from './components/GameLayout.jsx';
import RevenueCalculator from './components/RevenueCalculator.jsx';
import Dashboard from './components/Dashboard.jsx';

const base = import.meta.env.BASE_URL === '/' ? '' : import.meta.env.BASE_URL.replace(/\/$/, '');

function App() {
  return (
    <Router base={base}>
      <GameLayout>
      <Switch>
      <Route path="/" component={MainMenu} />
      <Route path="/new" component={NewGame} />
      <Route path="/resume">
        {/* Placeholder for Resume Game */}
        <div style={{ color: 'white', padding: '2rem' }}>Resume Game (Coming Soon)</div>
      </Route>
      <Route path="/game/:id/dashboard" component={Dashboard} />
      <Route path="/game/:id/calculator" component={RevenueCalculator} />
      <Route path="/game/:id/setup" component={ActivateCompany} />
      <Route path="/users">
        {/* Placeholder for User Management */}
        <div style={{ color: 'white', padding: '2rem' }}>User Management (Coming Soon)</div>
      </Route>
      <Route>
        <div style={{ color: 'white', padding: '2rem' }}>404 Not Found</div>
      </Route>
      </Switch>
      </GameLayout>
    </Router>
  )
}

export default App
