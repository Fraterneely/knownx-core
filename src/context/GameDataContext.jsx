import { createContext, useContext, useState } from 'react';

const GameDataContext = createContext();

export const GameDataProvider = ({ children }) => {
  const [spacecrafts, setSpacecrafts] = useState([]);
  const [missions, setMissions] = useState([]);

  const addSpacecraft = (craft) => setSpacecrafts((prev) => [...prev, craft]);
  const addMission = (mission) => setMissions((prev) => [...prev, mission]);

  return (
    <GameDataContext.Provider value={{
      spacecrafts, missions,
      addSpacecraft, addMission
    }}>
      {children}
    </GameDataContext.Provider>
  );
};

export const useGameData = () => useContext(GameDataContext);
