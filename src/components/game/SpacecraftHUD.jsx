import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Fuel, Zap, Wind, MapPin, Clock } from 'lucide-react';

export default function SpacecraftHUD({ spacecraft, currentMission, gameTime }) {
  const formatNumber = (num) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toFixed(1);
  };

  const formatTime = (hours) => {
    const h = Math.floor(hours);
    const m = Math.floor((hours - h) * 60);
    return `${h}h ${m}m`;
  };

  const getStatusColor = (current, max) => {
    const percentage = (current / max) * 100;
    if (percentage > 60) return 'bg-green-500';
    if (percentage > 30) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  return (
    <div className="absolute top-4 left-4 z-10 space-y-4">
      {/* Spacecraft Status */}
      <Card className="bg-gray-900/90 border-gray-700 text-white backdrop-blur-sm">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse"></div>
            <h3 className="font-semibold text-lg">{spacecraft.name}</h3>
            <Badge variant="outline" className="text-xs">
              {spacecraft.mission_status}
            </Badge>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Fuel className="w-4 h-4 text-blue-400" />
                <span className="text-sm">Fuel</span>
              </div>
              <Progress 
                value={(spacecraft.fuel / spacecraft.max_fuel) * 100} 
                className="h-2"
              />
              <div className="text-xs text-gray-400">
                {formatNumber(spacecraft.fuel)} / {formatNumber(spacecraft.max_fuel)} kg
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Wind className="w-4 h-4 text-cyan-400" />
                <span className="text-sm">Oxygen</span>
              </div>
              <Progress 
                value={(spacecraft.oxygen / 72) * 100} 
                className="h-2"
              />
              <div className="text-xs text-gray-400">
                {formatTime(spacecraft.oxygen)} remaining
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-yellow-400" />
                <span className="text-sm">Power</span>
              </div>
              <Progress 
                value={(spacecraft.power / 1000) * 100} 
                className="h-2"
              />
              <div className="text-xs text-gray-400">
                {formatNumber(spacecraft.power)} kWh
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-purple-400" />
                <span className="text-sm">Target</span>
              </div>
              <div className="text-xs text-gray-400">
                {spacecraft.target_body || 'None'}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Mission Status */}
      {currentMission && (
        <Card className="bg-gray-900/90 border-gray-700 text-white backdrop-blur-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="w-4 h-4 text-green-400" />
              <h4 className="font-semibold">Current Mission</h4>
            </div>
            <div className="text-sm text-gray-300 mb-2">{currentMission.title}</div>
            <div className="text-xs text-gray-400 mb-2">
              Target: {currentMission.target}
            </div>
            {currentMission.time_limit && (
              <div className="text-xs text-gray-400">
                Time: {formatTime(currentMission.time_limit - gameTime)}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Navigation Info */}
      <Card className="bg-gray-900/90 border-gray-700 text-white backdrop-blur-sm">
        <CardContent className="p-4">
          <h4 className="font-semibold mb-2">Navigation</h4>
          <div className="space-y-1 text-xs">
            <div>Position: {spacecraft.position.x.toFixed(3)}, {spacecraft.position.y.toFixed(3)}, {spacecraft.position.z.toFixed(3)} AU</div>
            <div>Velocity: {Math.sqrt(spacecraft.velocity.x**2 + spacecraft.velocity.y**2 + spacecraft.velocity.z**2).toFixed(2)} km/s</div>
            <div>Mass: {formatNumber(spacecraft.mass)} kg</div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}