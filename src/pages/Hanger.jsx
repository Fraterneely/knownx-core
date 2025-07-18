import React, { useState, useEffect } from 'react';
import { Spacecraft } from '@/entities/Spacecraft';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Zap, Fuel, Wind, Edit, Save, Trash2, Plus } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';

export default function Hangar() {
  const [spacecraft, setSpacecraft] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editedName, setEditedName] = useState('');

  useEffect(() => {
    loadSpacecraft();
  }, []);

  const loadSpacecraft = async () => {
    setIsLoading(true);
    const spacecraftList = await Spacecraft.list();
    if (spacecraftList.length > 0) {
      setSpacecraft(spacecraftList[0]);
      setEditedName(spacecraftList[0].name);
    }
    setIsLoading(false);
  };

  const handleSaveName = async () => {
    if (spacecraft && editedName) {
      await Spacecraft.update(spacecraft.id, { name: editedName });
      setSpacecraft({ ...spacecraft, name: editedName });
      setIsEditing(false);
    }
  };

  const UpgradeCard = ({ title, description, onUpgrade, cost }) => (
    <Card className="bg-gray-800/50 border-gray-700">
      <CardHeader>
        <CardTitle className="text-lg">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-gray-400 mb-4">{description}</p>
        <Button disabled className="w-full">
          Upgrade (Coming Soon)
        </Button>
      </CardContent>
    </Card>
  );

  return (
    <div className="min-h-screen w-full bg-gray-900 text-white p-4 sm:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <Link to={createPageUrl('MainMenu')}>
            <Button variant="outline" size="icon">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <h1 className="text-3xl font-bold">Hangar</h1>
        </div>

        {isLoading ? (
          <Skeleton className="w-full h-64 rounded-lg" />
        ) : spacecraft ? (
          <div className="grid lg:grid-cols-3 gap-8">
            <div className="lg:col-span-1 space-y-4">
              <Card className="bg-gray-800 border-gray-700">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    {isEditing ? (
                      <Input
                        value={editedName}
                        onChange={(e) => setEditedName(e.target.value)}
                        className="text-2xl font-bold bg-gray-900"
                      />
                    ) : (
                      <CardTitle className="text-2xl font-bold">{spacecraft.name}</CardTitle>
                    )}
                    <div className="flex gap-2">
                      {isEditing ? (
                        <Button variant="ghost" size="icon" onClick={handleSaveName}><Save className="w-4 h-4 text-green-500" /></Button>
                      ) : (
                        <Button variant="ghost" size="icon" onClick={() => setIsEditing(true)}><Edit className="w-4 h-4 text-gray-400" /></Button>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-400 flex items-center gap-2"><Fuel className="w-4 h-4 text-blue-400" /> Max Fuel</span>
                    <span>{spacecraft.max_fuel} kg</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-400 flex items-center gap-2"><Zap className="w-4 h-4 text-yellow-400" /> Max Power</span>
                    <span>{spacecraft.power} kWh</span>
                  </div>
                   <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-400 flex items-center gap-2"><Wind className="w-4 h-4 text-cyan-400" /> Max Oxygen</span>
                    <span>72 hours</span>
                  </div>
                </CardContent>
              </Card>
            </div>
            <div className="lg:col-span-2">
              <h2 className="text-2xl font-semibold mb-4">Upgrades</h2>
              <div className="grid md:grid-cols-2 gap-4">
                <UpgradeCard title="Engine Efficiency" description="Improve fuel consumption rate." />
                <UpgradeCard title="Fuel Tank Capacity" description="Increase the maximum amount of fuel you can carry." />
                <UpgradeCard title="Solar Panel Array" description="Enhance power generation capabilities." />
                <UpgradeCard title="Hull Reinforcement" description="Increase spacecraft mass and resilience." />
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-16">
            <p className="text-gray-400 text-lg">No spacecraft found.</p>
            <p className="text-gray-500 mt-2">Start a new game to build your first ship.</p>
          </div>
        )}
      </div>
    </div>
  );
}