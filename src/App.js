import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import SpaceExplorer from './pages/SpaceExplorer';
import { GameDataProvider } from '@/context/GameDataContext';

function App() {
  return (
    <BrowserRouter>
      <GameDataProvider>
        <Routes>
          <Route path="/" element={<SpaceExplorer />} />
          {/* Add more routes as needed */}
        </Routes>
      </GameDataProvider>
    </BrowserRouter>
  );
}

export default App;
