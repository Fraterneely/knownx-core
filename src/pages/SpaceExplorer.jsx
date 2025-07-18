
import React, { useState, useEffect, useRef } from 'react';
import { Mission } from '@/entities/Mission';
import { Spacecraft } from '@/entities/SpaceCraft';
import SpaceRenderer from '../components/game/SpaceRenderer';
import SpacecraftHUD from '../components/game/SpacecraftHUD';
import ControlPanel from '../components/game/ControlPanel';
import MissionPanel from '../components/game/MissionPanel';
import GameOverScreen from '../components/game/GameOverScreen'; // New import
import { Button } from '@/components/ui/button';
import { PanelRightOpen } from 'lucide-react';

export default function SpaceExplorer() {
  const [spacecraft, setSpacecraft] = useState(null);
  const [currentMission, setCurrentMission] = useState(null);
  const [isPaused, setIsPaused] = useState(false);
  const [timeScale, setTimeScale] = useState(1);
  const [gameTime, setGameTime] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [showControls, setShowControls] = useState(true);
  const [gameOverReason, setGameOverReason] = useState(null); // New state
  const spacecraftDataRef = useRef(spacecraft); // Updated initialization as per outline

  // Keep a ref to the latest spacecraft data to use in the save interval
  useEffect(() => {
    spacecraftDataRef.current = spacecraft;
  }, [spacecraft]);

  useEffect(() => {
    initializeGame();
  }, []);

  // Set up a periodic save to the database to avoid rate-limiting
  useEffect(() => {
    const saveInterval = setInterval(async () => {
      const currentData = spacecraftDataRef.current;
      if (currentData && currentData.id) {
        try {
          // Destructure to remove read-only fields that shouldn't be sent in an update
          const { id, created_date, updated_date, created_by, created_by_id, is_sample, ...dataToSave } = currentData;
          await Spacecraft.update(currentData.id, dataToSave);
        } catch (error) {
          // Avoid flooding the console with expected rate limit errors if the interval is too fast
          if (error.message && !error.message.includes('429')) {
             console.error('Error auto-saving spacecraft state:', error);
          }
        }
      }
    }, 2000); // Save state to the database every 2 seconds

    return () => clearInterval(saveInterval); // Cleanup interval on component unmount
  }, []); // Run this effect only once on mount

  // Game over check
  useEffect(() => {
    if (spacecraft) {
      if (spacecraft.fuel <= 0) setGameOverReason('fuel');
      else if (spacecraft.oxygen <= 0) setGameOverReason('oxygen');
      else if (spacecraft.power <= 0) setGameOverReason('power');
    }
  }, [spacecraft]);

  const initializeGame = async (isRestart = false) => {
    try {
      if (isRestart && spacecraft) {
        await Spacecraft.delete(spacecraft.id);
      }

      // Try to load existing spacecraft
      const spacecraftList = await Spacecraft.list();
      if (spacecraftList.length > 0 && !isRestart) {
        console.log(spacecraftList[0].name); // Imboni-1
        console.log(Spacecraft.schema.properties.fuel.description); // Fuel remaining (kg)
        setSpacecraft(spacecraftList[0]);
      } else {
        // Create new spacecraft if none exists or if restarting
        const newSpacecraft = await Spacecraft.create({
          name: "Explorer-1",
          position: { x: 1.0, y: 0, z: 0 }, // Start at Earth's orbit
          velocity: { x: 0, y: 0, z: 0 },
          fuel: 10000,
          max_fuel: 10000,
          oxygen: 72, // 72 hours
          power: 1000,
          thrust: 50000,
          mass: 5000,
          target_body: "",
          mission_status: "active"
        });
        setSpacecraft(newSpacecraft);
      }
      setGameOverReason(null); // Reset game over reason on initialization
      setIsLoading(false);
    } catch (error) {
      console.error('Error initializing game:', error);
      setIsLoading(false);
    }
  };

  const handleRestart = () => {
    setIsLoading(true);
    initializeGame(true);
  };

  const handleSpacecraftUpdate = (updatedSpacecraft) => {
    // This is called on every frame by the physics simulation.
    // It ONLY updates the local state for a smooth UI.
    // The useEffect hook above will handle persisting the data to the database periodically.
    setSpacecraft(updatedSpacecraft);
  };

  const handleMissionSelect = async (mission) => {
    setCurrentMission(mission);
    const updatedSpacecraft = {
      ...spacecraft,
      target_body: mission.target
    };
    // Update local state immediately for responsiveness
    setSpacecraft(updatedSpacecraft);
    try {
      await Mission.update(mission.id, { status: 'active' });
      // Also persist this specific change immediately since it's a one-time user action
      await Spacecraft.update(spacecraft.id, { target_body: mission.target });
    } catch (error) {
      console.error('Error starting mission:', error);
    }
  };

  const handleTargetChange = async (targetBody) => {
    const updatedSpacecraft = {
      ...spacecraft,
      target_body: targetBody
    };
    // Update local state immediately
    setSpacecraft(updatedSpacecraft);
    try {
        // Persist this user-initiated change immediately
        await Spacecraft.update(spacecraft.id, { target_body: targetBody });
    } catch (error) {
        console.error('Error updating spacecraft target:', error);
    }
  };

  const handleThrustApply = (thrustVector) => {
    // Thrust application is handled in ControlPanel
    console.log('Thrust applied:', thrustVector);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-500 mb-4"></div>
          <div className="text-white text-xl">Initializing Space Explorer...</div>
        </div>
      </div>
    );
  }

  if (!spacecraft) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center text-white">
          <div className="text-xl mb-4">Failed to initialize spacecraft</div>
          <button 
            onClick={initializeGame}
            className="px-4 py-2 bg-blue-600 rounded hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black overflow-hidden relative">
      {/* Game Over Screen - Rendered only when gameOverReason is set */}
      {gameOverReason && <GameOverScreen reason={gameOverReason} onRestart={handleRestart} />}

      {/* 3D Space Environment */}
      <SpaceRenderer
        spacecraft={spacecraft}
        onSpacecraftUpdate={handleSpacecraftUpdate}
        targetBody={spacecraft.target_body}
        isPaused={isPaused || !!gameOverReason} // Pause game if game over
        timeScale={timeScale}
      />

      {/* Game UI Overlay */}
      <SpacecraftHUD
        spacecraft={spacecraft}
        currentMission={currentMission}
        gameTime={gameTime}
      />

      {/* Control Panel or Toggle Button */}
      {showControls && !gameOverReason ? ( // Hide controls if game over
        <ControlPanel
          spacecraft={spacecraft}
          onSpacecraftUpdate={handleSpacecraftUpdate}
          isPaused={isPaused}
          setIsPaused={setIsPaused}
          timeScale={timeScale}
          setTimeScale={setTimeScale}
          onTargetChange={handleTargetChange}
          onThrustApply={handleThrustApply}
          setShowControls={setShowControls} // Pass setter to allow ControlPanel to hide itself
        />
      ) : (
        !gameOverReason && ( // Only show toggle button if not game over
          <div className="absolute top-4 right-4 z-10">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setShowControls(true)}
              className="bg-gray-900/90 border-gray-700 text-white hover:bg-gray-800/90 backdrop-blur-sm"
              title="Show Controls"
            >
              <PanelRightOpen className="w-5 h-5" />
            </Button>
          </div>
        )
      )}

      {!gameOverReason && ( // Hide mission panel if game over
        <MissionPanel
          onMissionSelect={handleMissionSelect}
          currentMission={currentMission}
          spacecraft={spacecraft}
        />
      )}

      {/* Emergency Warning - Hide if game over is already displayed */}
      {(spacecraft.fuel < 1000 || spacecraft.oxygen < 5 || spacecraft.power < 100) && !gameOverReason && (
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-20">
          <div className="bg-red-900/90 border-2 border-red-500 rounded-lg p-6 text-white text-center animate-pulse">
            <div className="text-2xl font-bold mb-2">⚠️ CRITICAL WARNING ⚠️</div>
            <div className="text-lg">
              {spacecraft.fuel < 1000 && <div>LOW FUEL: {spacecraft.fuel.toFixed(0)}kg remaining</div>}
              {spacecraft.oxygen < 5 && <div>LOW OXYGEN: {spacecraft.oxygen.toFixed(1)}h remaining</div>}
              {spacecraft.power < 100 && <div>LOW POWER: {spacecraft.power.toFixed(0)}kWh remaining</div>}
            </div>
            <div className="mt-4 text-sm">Return to Earth immediately!</div>
          </div>
        </div>
      )}
    </div>
  );
}
