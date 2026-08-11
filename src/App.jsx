import { Route, Switch, Router } from 'wouter';
import MainMenu from './components/MainMenu.jsx';
import NewGame from './components/NewGame.jsx';
import ActivateCompany from './components/ActivateCompany.jsx';
import GameLayout from './components/GameLayout.jsx';
import RevenueCalculator from './components/RevenueCalculator.jsx';
import Dashboard from './components/Dashboard.jsx';
import ResumeGame from './components/ResumeGame.jsx';
import ManageUsers from './components/ManageUsers.jsx';
import { PrinterConnectionProvider } from './hooks/PrinterConnectionProvider.jsx';

const base = import.meta.env.BASE_URL === '/' ? '' : import.meta.env.BASE_URL.replace(/\/$/, '');

function App() {
  return (
    <Router base={base}>
      <PrinterConnectionProvider>
      <GameLayout>
      <Switch>
      <Route path="/" component={MainMenu} />
      <Route path="/new" component={NewGame} />
      <Route path="/resume" component={ResumeGame} />
      <Route path="/game/:id/dashboard" component={Dashboard} />
      <Route path="/game/:id/calculator" component={RevenueCalculator} />
      <Route path="/game/:id/setup" component={ActivateCompany} />
      <Route path="/users" component={ManageUsers} />
      <Route>
        <div style={{ color: 'white', padding: '2rem' }}>404 Not Found</div>
      </Route>
      </Switch>
      </GameLayout>
      </PrinterConnectionProvider>
    </Router>
  )
}

export default App
