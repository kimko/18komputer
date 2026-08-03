import { Route, Switch } from 'wouter';
import MainMenu from './components/MainMenu.jsx';

function App() {
  return (
    <Switch>
      <Route path="/" component={MainMenu} />
      <Route path="/new">
        {/* Placeholder for New Game */}
        <div style={{ color: 'white', padding: '2rem' }}>New Game (Coming Soon)</div>
      </Route>
      <Route path="/resume">
        {/* Placeholder for Resume Game */}
        <div style={{ color: 'white', padding: '2rem' }}>Resume Game (Coming Soon)</div>
      </Route>
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
