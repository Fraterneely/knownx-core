
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Play, 
  Pause, 
  RotateCcw, 
  Zap, 
  Navigation,
  Settings,
  FastForward,
  PanelRightClose
} from 'lucide-react';

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

  const handleThrustApply = () => {
    if (spacecraft.fuel > 0) {
      const fuelUsed = thrustPower * 0.1;
      if (spacecraft.fuel >= fuelUsed) {
        const thrust = {
          x: thrustDirection.x * thrustPower / 100,
          y: thrustDirection.y * thrustPower / 100,
          z: thrustDirection.z * thrustPower / 100
        };
        onThrustApply(thrust);
        onSpacecraftUpdate({
          ...spacecraft,
          fuel: spacecraft.fuel - fuelUsed,
          velocity: {
            x: spacecraft.velocity.x + thrust.x * 0.001,
            y: spacecraft.velocity.y + thrust.y * 0.001,
            z: spacecraft.velocity.z + thrust.z * 0.001
          }
        });
      }
    }
  };

  const handleEmergencyStop = () => {
    onSpacecraftUpdate({
      ...spacecraft,
      velocity: { x: 0, y: 0, z: 0 }
    });
  };

  return (
    <div className="absolute top-4 right-4 z-10 w-80 space-y-4">
      {/* Time Control */}
      <Card className="bg-gray-900/90 border-gray-700 text-white backdrop-blur-sm">
        <CardHeader className="p-4 pb-3 flex flex-row items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Time Control
          </CardTitle>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowControls(false)}
            className="text-gray-400 hover:text-white h-8 w-8"
            title="Hide Controls"
          >
            <PanelRightClose className="w-5 h-5" />
          </Button>
        </CardHeader>
        <CardContent className="space-y-4 pt-4">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsPaused(!isPaused)}
              className="flex items-center gap-2"
            >
              {isPaused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
              {isPaused ? 'Play' : 'Pause'}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setTimeScale(timeScale === 1 ? 10 : 1)}
              className="flex items-center gap-2"
            >
              <FastForward className="w-4 h-4" />
              {timeScale}x
            </Button>
          </div>
          
          <div className="space-y-2">
            <label className="text-sm text-gray-300">Time Scale: {timeScale}x</label>
            <Slider
              value={[timeScale]}
              onValueChange={(value) => setTimeScale(value[0])}
              min={0.1}
              max={100}
              step={0.1}
              className="w-full"
            />
          </div>
        </CardContent>
      </Card>

      {/* Navigation Control */}
      <Card className="bg-gray-900/90 border-gray-700 text-white backdrop-blur-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Navigation className="w-5 h-5" />
            Navigation
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm text-gray-300">Target Body</label>
            <Select onValueChange={onTargetChange}>
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

          <Button
            variant="outline"
            size="sm"
            onClick={handleEmergencyStop}
            className="w-full flex items-center gap-2"
          >
            <RotateCcw className="w-4 h-4" />
            Emergency Stop
          </Button>
        </CardContent>
      </Card>

      {/* Thrust Control */}
      <Card className="bg-gray-900/90 border-gray-700 text-white backdrop-blur-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Zap className="w-5 h-5" />
            Thrust Control
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm text-gray-300">Thrust Power: {thrustPower}%</label>
            <Slider
              value={[thrustPower]}
              onValueChange={(value) => setThrustPower(value[0])}
              min={0}
              max={100}
              step={1}
              className="w-full"
            />
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div className="space-y-1">
              <label className="text-xs text-gray-400">X</label>
              <Slider
                value={[thrustDirection.x]}
                onValueChange={(value) => setThrustDirection({...thrustDirection, x: value[0]})}
                min={-100}
                max={100}
                step={1}
                orientation="vertical"
                className="h-20"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-gray-400">Y</label>
              <Slider
                value={[thrustDirection.y]}
                onValueChange={(value) => setThrustDirection({...thrustDirection, y: value[0]})}
                min={-100}
                max={100}
                step={1}
                orientation="vertical"
                className="h-20"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-gray-400">Z</label>
              <Slider
                value={[thrustDirection.z]}
                onValueChange={(value) => setThrustDirection({...thrustDirection, z: value[0]})}
                min={-100}
                max={100}
                step={1}
                orientation="vertical"
                className="h-20"
              />
            </div>
          </div>

          <Button
            onClick={handleThrustApply}
            disabled={spacecraft.fuel <= 0}
            className="w-full bg-blue-600 hover:bg-blue-700"
          >
            Apply Thrust
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
