import React from 'react';
import SpaceExplorer from './pages/SpaceExplorer';
import { GameDataProvider } from '@/context/GameDataContext';

function App() {
  return (
    <GameDataProvider>
      <SpaceExplorer />
    </GameDataProvider>
  );
}

export default App;
