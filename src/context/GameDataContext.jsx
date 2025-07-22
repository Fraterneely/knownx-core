import { createContext, useContext, useState } from 'react';

const GameDataContext = createContext();

export const GameDataProvider = ({ children }) => {
  const [spacecrafts, setSpacecrafts] = useState([]);
  const [missions, setMissions] = useState([]);
  const [isPaused, setIsPaused] = useState(false);
  const [timeScale, setTimeScale] = useState(1);

  const addSpacecraft = (craft) => setSpacecrafts((prev) => [...prev, craft]);
  const addMission = (mission) => setMissions((prev) => [...prev, mission]);

  return (
    <GameDataContext.Provider value={{
      spacecrafts, missions, isPaused, setIsPaused, timeScale, setTimeScale,
      addSpacecraft, addMission
    }}>
      {children}
    </GameDataContext.Provider>
  );
};

export const useGameData = () => useContext(GameDataContext);
