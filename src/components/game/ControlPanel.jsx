
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Spacecraft } from '@/entities/SpaceCraft';
import { 
  Settings, Navigation, Zap, Play, Pause, FastForward, 
  RotateCcw, PanelRightClose, Target, Compass, Gauge
} from 'lucide-react';

// List of celestial bodies for targeting
const CELESTIAL_BODIES = [
  { id: 'sun', name: 'Sun' },
  { id: 'earth', name: 'Earth' },
  { id: 'moon', name: 'Moon' },
  { id: 'mars', name: 'Mars' },
  { id: 'jupiter', name: 'Jupiter' },
  { id: 'proximaCentauri', name: 'Proxima Centauri' }
];

export default function ControlPanel({ 
  spacecraft, 
  onSpacecraftUpdate,
  isPaused,
  setIsPaused,
  timeScale,
  setTimeScale,
  onTargetChange,
  onThrustApply,
  setShowControls
}) {
  const [thrustDirection, setThrustDirection] = useState({ x: 0, y: 0, z: 0 });
  const [thrustPower, setThrustPower] = useState(50);
  const [autopilotEnabled, setAutopilotEnabled] = useState(spacecraft?.autopilot || false);
  const [flightLog, setFlightLog] = useState([]);
  const [showLog, setShowLog] = useState(false);

  // Initialize thrust direction from spacecraft
  useEffect(() => {
    if (spacecraft && spacecraft.thrust_vector) {
      setThrustDirection(spacecraft.thrust_vector);
    }
    if (spacecraft && spacecraft.thrust_level) {
      setThrustPower(spacecraft.thrust_level * 100);
    }
    if (spacecraft && spacecraft.autopilot !== undefined) {
      setAutopilotEnabled(spacecraft.autopilot);
    }
  }, [spacecraft]); // Only run when spacecraft changes, not on every render

  // Add to flight log
  const addLogEntry = (action, details) => {
    const timestamp = new Date().toISOString();
    const newEntry = {
      timestamp,
      action,
      details
    };
    setFlightLog(prev => [newEntry, ...prev].slice(0, 50)); // Keep last 50 entries
  };

  const handleThrustApply = () => {
    if (spacecraft.fuel > 0) {
      const thrustLevel = thrustPower / 100;
      
      // Apply thrust using our enhanced physics model
      const deltaTime = 0.1; // Small time step for immediate feedback
      const updatedSpacecraft = Spacecraft.applyThrust(
        spacecraft,
        thrustDirection,
        thrustLevel,
        deltaTime
      );
      
      // Log the action
      addLogEntry('Thrust Applied', {
        direction: `X:${thrustDirection.x.toFixed(2)}, Y:${thrustDirection.y.toFixed(2)}, Z:${thrustDirection.z.toFixed(2)}`,
        power: `${thrustPower}%`,
        fuelUsed: (spacecraft.fuel - updatedSpacecraft.fuel).toFixed(2)
      });
      
      // Update spacecraft state
      onSpacecraftUpdate(updatedSpacecraft);
      onThrustApply(thrustDirection);
    }
  };

  const handleEmergencyStop = () => {
    const updatedSpacecraft = {
      ...spacecraft,
      velocity: { x: 0, y: 0, z: 0 },
      thrust_level: 0
    };
    
    // Log the action
    addLogEntry('Emergency Stop', {
      previousVelocity: `X:${spacecraft.velocity.x.toFixed(4)}, Y:${spacecraft.velocity.y.toFixed(4)}, Z:${spacecraft.velocity.z.toFixed(4)}`
    });
    
    onSpacecraftUpdate(updatedSpacecraft);
  };

  const handleDirectionChange = (axis, value) => {
    const newDirection = {
      ...thrustDirection,
      [axis]: value[0]
    };
    setThrustDirection(newDirection);
  };

  const handleAutopilotToggle = () => {
    const newState = !autopilotEnabled;
    setAutopilotEnabled(newState);
    
    // Only update the spacecraft if the state actually changed
    if (spacecraft.autopilot !== newState) {
      const updatedSpacecraft = {
        ...spacecraft,
        autopilot: newState
      };
      
      // Log the action
      addLogEntry('Autopilot', {
        status: newState ? 'Enabled' : 'Disabled',
        target: spacecraft.target_body || 'None'
      });
      
      onSpacecraftUpdate(updatedSpacecraft);
    }
  };

  const handleTargetSelect = (targetId) => {
    // Log the action
    addLogEntry('Target Changed', {
      from: spacecraft.target_body || 'None',
      to: targetId
    });
    
    onTargetChange(targetId);
  };

  return (
    <div className="absolute top-4 right-4 z-10 w-80 space-y-4">
      {/* Time Control */}
      <Card className="border-blue-800/30 bg-gray-900/60 shadow-lg shadow-blue-900/10">
        <CardHeader className="p-3 pb-2 flex flex-row items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Settings className="w-5 h-5 text-blue-400" />
            <span className="bg-gradient-to-r from-blue-400 to-cyan-300 bg-clip-text text-transparent">
              Time Control
            </span>
          </CardTitle>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowControls(false)}
            className="text-gray-400 hover:text-blue-400 h-8 w-8"
            title="Hide Controls"
          >
            <PanelRightClose className="w-5 h-5" />
          </Button>
        </CardHeader>
        <CardContent className="space-y-4 pt-2">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setIsPaused(!isPaused);
                addLogEntry('Time Control', { action: isPaused ? 'Resume' : 'Pause' });
              }}
              className="flex-1 flex items-center justify-center gap-2 hover:bg-blue-600/30"
            >
              {isPaused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
              {isPaused ? 'Play' : 'Pause'}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const newTimeScale = timeScale === 1 ? 10 : 1;
                setTimeScale(newTimeScale);
                addLogEntry('Time Scale', { from: timeScale, to: newTimeScale });
              }}
              className="flex-1 flex items-center justify-center gap-2 hover:bg-indigo-600/30"
            >
              <FastForward className="w-4 h-4" />
              {timeScale}x
            </Button>
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm text-gray-300">Time Scale</label>
              <span className="text-sm font-medium text-blue-300">{timeScale.toFixed(1)}x</span>
            </div>
            <Slider
              value={[timeScale]}
              onValueChange={(value) => {
                setTimeScale(value[0]);
                if (Math.abs(value[0] - timeScale) > 1) {
                  addLogEntry('Time Scale', { from: timeScale, to: value[0] });
                }
              }}
              min={0.1}
              max={100}
              step={0.1}
              className="w-full"
            />
          </div>
        </CardContent>
      </Card>

      {/* Navigation Control */}
      <Card className="border-indigo-800/30 bg-gray-900/60 shadow-lg shadow-indigo-900/10">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <Navigation className="w-5 h-5 text-indigo-400" />
            <span className="bg-gradient-to-r from-indigo-400 to-purple-300 bg-clip-text text-transparent">
              Navigation
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm text-gray-300">Target Body</label>
            <Select 
              onValueChange={handleTargetSelect}
              defaultValue={spacecraft.target_body}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select target" />
              </SelectTrigger>
              <SelectContent>
                {CELESTIAL_BODIES.map(body => (
                  <SelectItem key={body.id} value={body.id}>
                    {body.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="flex items-center space-x-2">
            <Switch 
              id="autopilot" 
              checked={autopilotEnabled}
              onCheckedChange={handleAutopilotToggle}
            />
            <label htmlFor="autopilot" className="text-sm text-gray-300 cursor-pointer">
              Autopilot {autopilotEnabled ? 
                <Badge className="ml-2 bg-green-600">Active</Badge> : 
                <Badge className="ml-2 bg-gray-600">Inactive</Badge>
              }
            </label>
          </div>
          
          <div className="flex items-center justify-between text-xs text-gray-400">
            <div>
              <div className="flex items-center gap-1">
                <Compass className="w-3 h-3" />
                <span>Heading:</span>
              </div>
              <div className="ml-4">
                Pitch: {(spacecraft.orientation?.pitch * (180/Math.PI)).toFixed(1)}°
              </div>
              <div className="ml-4">
                Yaw: {(spacecraft.orientation?.yaw * (180/Math.PI)).toFixed(1)}°
              </div>
            </div>
            <div>
              <div className="flex items-center gap-1">
                <Gauge className="w-3 h-3" />
                <span>Velocity:</span>
              </div>
              <div className="ml-4">
                {Math.sqrt(
                  spacecraft.velocity.x ** 2 + 
                  spacecraft.velocity.y ** 2 + 
                  spacecraft.velocity.z ** 2
                ).toFixed(4)} AU/h
              </div>
            </div>
          </div>
          
          <Button
            variant="outline"
            size="sm"
            onClick={handleEmergencyStop}
            className="w-full flex items-center justify-center gap-2 border-red-700/30 hover:bg-red-900/30 hover:border-red-600/50"
          >
            <RotateCcw className="w-4 h-4 text-red-400" />
            Emergency Stop
          </Button>
        </CardContent>
      </Card>

      {/* Thrust Control */}
      <Card className="border-green-800/30 bg-gray-900/60 shadow-lg shadow-green-900/10">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <Zap className="w-5 h-5 text-green-400" />
            <span className="bg-gradient-to-r from-green-400 to-emerald-300 bg-clip-text text-transparent">
              Thrust Control
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm text-gray-300">Thrust Power</label>
              <span className="text-sm font-medium text-green-300">{thrustPower}%</span>
            </div>
            <Slider
              value={[thrustPower]}
              onValueChange={(value) => setThrustPower(value[0])}
              min={0}
              max={100}
              step={1}
              className="w-full"
            />
          </div>
          
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="text-xs text-gray-300">X</div>
            <div className="text-xs text-gray-300">Y</div>
            <div className="text-xs text-gray-300">Z</div>
            
            <div className="flex flex-col space-y-1">
              <span className="text-xs text-gray-400">{thrustDirection.x.toFixed(2)}</span>
              <Slider
                value={[thrustDirection.x]}
                onValueChange={(value) => handleDirectionChange('x', value)}
                min={-1}
                max={1}
                step={0.01}
                className="w-full"
              />
            </div>
            
            <div className="flex flex-col space-y-1">
              <span className="text-xs text-gray-400">{thrustDirection.y.toFixed(2)}</span>
              <Slider
                value={[thrustDirection.y]}
                onValueChange={(value) => handleDirectionChange('y', value)}
                min={-1}
                max={1}
                step={0.01}
                className="w-full"
              />
            </div>
            
            <div className="flex flex-col space-y-1">
              <span className="text-xs text-gray-400">{thrustDirection.z.toFixed(2)}</span>
              <Slider
                value={[thrustDirection.z]}
                onValueChange={(value) => handleDirectionChange('z', value)}
                min={-1}
                max={1}
                step={0.01}
                className="w-full"
              />
            </div>
          </div>
          
          <Button
            onClick={handleThrustApply}
            disabled={spacecraft.fuel <= 0}
            className="w-full bg-gradient-to-r from-green-600 to-emerald-500 hover:from-green-700 hover:to-emerald-600 text-white font-medium"
          >
            Apply Thrust
          </Button>
        </CardContent>
      </Card>

      {/* Flight Log */}
      <Card className="border-amber-800/30 bg-gray-900/60 shadow-lg shadow-amber-900/10">
        <CardHeader className="pb-2 flex flex-row items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Target className="w-5 h-5 text-amber-400" />
            <span className="bg-gradient-to-r from-amber-400 to-yellow-300 bg-clip-text text-transparent">
              Flight Log
            </span>
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowLog(!showLog)}
            className="text-gray-400 hover:text-amber-400"
          >
            {showLog ? 'Hide' : 'Show'}
          </Button>
        </CardHeader>
        
        {showLog && (
          <CardContent className="max-h-60 overflow-y-auto">
            {flightLog.length === 0 ? (
              <div className="text-sm text-gray-400 italic">No flight actions recorded yet.</div>
            ) : (
              <div className="space-y-2">
                {flightLog.map((entry, index) => (
                  <div key={index} className="text-xs border-l-2 border-amber-600/50 pl-2">
                    <div className="text-amber-300 font-medium">{entry.action}</div>
                    <div className="text-gray-400">{new Date(entry.timestamp).toLocaleTimeString()}</div>
                    {entry.details && (
                      <div className="mt-1 text-gray-300">
                        {Object.entries(entry.details).map(([key, value]) => (
                          <div key={key} className="flex">
                            <span className="w-24 text-gray-400">{key}:</span>
                            <span>{value}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        )}
      </Card>
    </div>
  );
}
