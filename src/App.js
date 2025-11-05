import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import SpaceExplorer from './pages/SpaceExplorer';
import MainMenu from './pages/MainMenu';
// import Hangar from './pages/Hanger';
import Codex from "./pages/Codex";
import { GameDataProvider } from '@/context/GameDataContext';
import SplashScreen from './pages/SplashScreen';
import LoadingScreen from './pages/LoadingScreen';

function App() {
  return (
    <BrowserRouter>
      <GameDataProvider>
        <Routes>
          <Route path="/" element={<SplashScreen />} />
          <Route path="/loading" element={<LoadingScreen />} />
          <Route path="/menu" element={<MainMenu />} />
          <Route path="/game" element={<SpaceExplorer />} />
          {/* <Route path="/settings" element={<Hanger />} /> */}
          <Route path="/codex" element={<Codex />} />
          {/* Add more routes as needed */}
        </Routes>
      </GameDataProvider>
    </BrowserRouter>
  );
}

export default App;
