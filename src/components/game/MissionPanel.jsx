import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Mission } from '@/entities/Mission';
import { Target, Clock, Trophy, AlertCircle, ChevronDown, ChevronUp, PanelRightClose } from 'lucide-react';

export default function MissionPanel({ onMissionSelect, currentMission, spacecraft }) {
  const [missions, setMissions] = useState([]);
  const [selectedMission, setSelectedMission] = useState(null);
  const [isVisible, setIsVisible] = useState(true);
  const [isCollapsed, setIsCollapsed] = useState(false);

  useEffect(() => {
    loadMissions();
  }, []);

  const loadMissions = async () => {
    const missionData = await Mission.list();
    setMissions(missionData);
  };

  const handleMissionSelect = (mission) => {
    setSelectedMission(mission);
    onMissionSelect(mission);
  };

  const getDifficultyColor = (difficulty) => {
    switch (difficulty) {
      case 'easy': return 'bg-green-100 text-green-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'hard': return 'bg-orange-100 text-orange-800';
      case 'extreme': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'available': return 'bg-blue-100 text-blue-800';
      case 'active': return 'bg-green-100 text-green-800';
      case 'completed': return 'bg-purple-100 text-purple-800';
      case 'failed': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const canStartMission = (mission) => {
    if (!mission.requirements) return true;
    return (
      spacecraft.fuel >= (mission.requirements.min_fuel || 0) &&
      spacecraft.oxygen >= (mission.requirements.min_oxygen || 0) &&
      spacecraft.power >= (mission.requirements.min_power || 0)
    );
  };

  if (!isVisible) {
    return (
      <div className="absolute bottom-4 left-4 z-10">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsVisible(true)}
          className="bg-amber-900/40 border-amber-700/30 hover:bg-amber-800/50"
        >
          <Target className="w-4 h-4 mr-2 text-amber-400" />
          Show Missions
        </Button>
      </div>
    );
  }

  return (
    <div className="absolute bottom-4 left-4 z-10 w-96 max-h-[calc(100vh-8rem)] overflow-y-auto">
      <Card className="border-amber-800/30 bg-gray-900/60 shadow-lg shadow-amber-900/10">
        <CardHeader className="pb-2 flex flex-row items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Target className="w-5 h-5 text-amber-400" />
            <span className="bg-gradient-to-r from-amber-400 to-yellow-300 bg-clip-text text-transparent">
              Mission Control
            </span>
          </CardTitle>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="text-gray-400 hover:text-amber-400 h-8 w-8"
              title={isCollapsed ? "Expand" : "Collapse"}
            >
              {isCollapsed ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsVisible(false)}
              className="text-gray-400 hover:text-amber-400 h-8 w-8"
              title="Hide Missions"
            >
              <PanelRightClose className="w-5 h-5" />
            </Button>
          </div>
        </CardHeader>
        
        {!isCollapsed && (
          <CardContent className="space-y-4">
            {currentMission && (
              <div className="p-3 bg-blue-900/30 rounded-lg border border-blue-700/50 backdrop-blur-sm">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="text-sm font-semibold text-blue-200">ACTIVE MISSION</span>
                </div>
                <div className="text-sm text-blue-100">{currentMission.title}</div>
                <div className="flex items-center gap-2 mt-2">
                  <Trophy className="w-4 h-4 text-yellow-400" />
                  <span className="text-xs text-yellow-200">{currentMission.reward_points} points</span>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <h4 className="font-semibold text-sm text-amber-200">Available Missions</h4>
              {missions.filter(m => m.status === 'available').map(mission => (
                <div key={mission.id} className="p-3 bg-gray-800/40 rounded-lg border border-gray-700/50 backdrop-blur-sm hover:bg-gray-800/60 transition-colors">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <div className="font-medium text-sm">{mission.title}</div>
                      <div className="text-xs text-gray-400 mt-1">{mission.description}</div>
                    </div>
                    <div className="flex flex-col gap-1">
                      <Badge className={getDifficultyColor(mission.difficulty)}>
                        {mission.difficulty}
                      </Badge>
                      <Badge className={getStatusColor(mission.status)}>
                        {mission.status}
                      </Badge>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4 text-xs text-gray-400 mb-2">
                    <div className="flex items-center gap-1">
                      <Target className="w-3 h-3" />
                      {mission.target}
                    </div>
                    {mission.time_limit && (
                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {mission.time_limit}h
                      </div>
                    )}
                    <div className="flex items-center gap-1">
                      <Trophy className="w-3 h-3" />
                      {mission.reward_points}
                    </div>
                  </div>

                  {mission.requirements && (
                    <div className="text-xs text-gray-400 mb-2">
                      <div className="flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        Requirements:
                      </div>
                      <div className="ml-4">
                        {mission.requirements.min_fuel && (
                          <div className={spacecraft.fuel >= mission.requirements.min_fuel ? 'text-green-400' : 'text-red-400'}>
                            Fuel: {mission.requirements.min_fuel}kg
                          </div>
                        )}
                        {mission.requirements.min_oxygen && (
                          <div className={spacecraft.oxygen >= mission.requirements.min_oxygen ? 'text-green-400' : 'text-red-400'}>
                            Oxygen: {mission.requirements.min_oxygen}h
                          </div>
                        )}
                        {mission.requirements.min_power && (
                          <div className={spacecraft.power >= mission.requirements.min_power ? 'text-green-400' : 'text-red-400'}>
                            Power: {mission.requirements.min_power}kWh
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  <Button
                    size="sm"
                    onClick={() => handleMissionSelect(mission)}
                    disabled={!canStartMission(mission) || currentMission}
                    className="w-full bg-blue-600 hover:bg-blue-700"
                  >
                    {!canStartMission(mission) ? 'Requirements Not Met' : 'Start Mission'}
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        )}
      </Card>
    </div>
  );
}