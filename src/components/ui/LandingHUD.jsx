import React from 'react';
import { LANDING_PHASES } from '../game/LandingSystem';

export default function LandingHUD({ landingData }) {
  if (!landingData || landingData.altitude > 1000000) return null;

  const getPhaseColor = (phase) => {
    switch(phase) {
      case LANDING_PHASES.APPROACH: return 'text-blue-400';
      case LANDING_PHASES.ATMOSPHERIC_ENTRY: return 'text-orange-500';
      case LANDING_PHASES.DESCENT: return 'text-yellow-400';
      case LANDING_PHASES.FINAL_APPROACH: return 'text-green-400';
      case LANDING_PHASES.TOUCHDOWN: return 'text-red-500 animate-pulse';
      case LANDING_PHASES.LANDED: return 'text-green-500';
      default: return 'text-white';
    }
  };

  const getSpeedWarning = (speed) => {
    if (speed < 5) return 'text-green-400';
    if (speed < 15) return 'text-yellow-400';
    if (speed < 30) return 'text-orange-500';
    return 'text-red-500 animate-pulse';
  };

  const formatAltitude = (alt) => {
    if (alt > 1000) return `${(alt / 1000).toFixed(1)} km`;
    return `${alt.toFixed(0)} m`;
  };

  return (
    <div className="fixed top-20 right-4 bg-black/70 border border-cyan-500/50 rounded-lg p-4 font-mono text-sm backdrop-blur-sm">
      <div className="text-cyan-400 text-lg font-bold mb-3 border-b border-cyan-500/30 pb-2">
        🛬 LANDING SYSTEM
      </div>
      
      {/* Phase */}
      <div className="mb-2">
        <span className="text-gray-400">Phase: </span>
        <span className={`font-bold ${getPhaseColor(landingData.phase)}`}>
          {landingData.phase.toUpperCase()}
        </span>
      </div>

      {/* Target Body */}
      {landingData.targetBody && (
        <div className="mb-2">
          <span className="text-gray-400">Target: </span>
          <span className="text-white font-bold">{landingData.targetBody}</span>
        </div>
      )}

      {/* Altitude */}
      <div className="mb-2">
        <span className="text-gray-400">Altitude: </span>
        <span className="text-white font-bold">
          {formatAltitude(landingData.altitude)}
        </span>
      </div>

      {/* Vertical Speed */}
      <div className="mb-2">
        <span className="text-gray-400">V/Speed: </span>
        <span className={`font-bold ${getSpeedWarning(Math.abs(landingData.verticalSpeed))}`}>
          {landingData.verticalSpeed.toFixed(1)} m/s
        </span>
        {Math.abs(landingData.verticalSpeed) > 15 && (
          <span className="text-red-500 ml-2 animate-pulse">⚠️ TOO FAST</span>
        )}
      </div>

      {/* Recommended Thrust */}
      {landingData.recommendedThrust > 0 && landingData.altitude < 5000 && (
        <div className="mb-2">
          <span className="text-gray-400">Retro: </span>
          <span className="text-yellow-400 font-bold">
            {(landingData.recommendedThrust * 100).toFixed(0)}%
          </span>
        </div>
      )}

      {/* Landing Gear Status */}
      <div className="mb-2">
        <span className="text-gray-400">Gear: </span>
        <span className={landingData.isLandingGearDeployed ? 'text-green-400' : 'text-gray-500'}>
          {landingData.isLandingGearDeployed ? '✓ DEPLOYED' : '✗ STOWED'}
        </span>
      </div>

      {/* Warning Messages */}
      {landingData.phase === LANDING_PHASES.FINAL_APPROACH && !landingData.isLandingGearDeployed && (
        <div className="mt-3 p-2 bg-yellow-500/20 border border-yellow-500/50 rounded text-yellow-400 text-xs animate-pulse">
          ⚠️ DEPLOY LANDING GEAR
        </div>
      )}

      {landingData.phase === LANDING_PHASES.TOUCHDOWN && Math.abs(landingData.verticalSpeed) > 15 && (
        <div className="mt-3 p-2 bg-red-500/20 border border-red-500/50 rounded text-red-400 text-xs animate-pulse">
          ⚠️ REDUCE SPEED!
        </div>
      )}

      {landingData.phase === LANDING_PHASES.LANDED && (
        <div className="mt-3 p-2 bg-green-500/20 border border-green-500/50 rounded text-green-400 text-xs">
          ✓ TOUCHDOWN COMPLETE
        </div>
      )}

      {/* Visual altitude indicator */}
      {landingData.altitude < 100000 && (
        <div className="mt-3">
          <div className="text-gray-400 text-xs mb-1">Altitude Bar</div>
          <div className="w-full h-2 bg-gray-700 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-green-500 via-yellow-500 to-red-500 transition-all"
              style={{ 
                width: `${Math.min(100, (landingData.altitude / 100000) * 100)}%` 
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}