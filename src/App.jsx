import { Route, Switch } from 'wouter';
import MainMenu from './components/MainMenu.jsx';
import NewGame from './components/NewGame.jsx';
import RaiseFunds from './components/RaiseFunds.jsx';

function App() {
  return (
    <Switch>
      <Route path="/" component={MainMenu} />
      <Route path="/new" component={NewGame} />
      <Route path="/resume">
        {/* Placeholder for Resume Game */}
        <div style={{ color: 'white', padding: '2rem' }}>Resume Game (Coming Soon)</div>
      </Route>
      <Route path="/game/:id/setup" component={RaiseFunds} />
      <Route path="/users">
        {/* Placeholder for User Management */}
        <div style={{ color: 'white', padding: '2rem' }}>User Management (Coming Soon)</div>
      </Route>
      <Route>
        <div style={{ color: 'white', padding: '2rem' }}>404 Not Found</div>
      </Route>
    </Switch>
  )
}

export default App
