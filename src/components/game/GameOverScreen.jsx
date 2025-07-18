
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skull, Frown, Rocket, RotateCcw, Fuel, Zap } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils/router';

export default function GameOverScreen({ reason, onRestart }) {
  const messages = {
    fuel: {
      title: 'Out of Fuel',
      message: 'You are stranded in the cold darkness of space.',
      icon: <Fuel className="w-12 h-12 text-blue-400" />,
    },
    oxygen: {
      title: 'Oxygen Depleted',
      message: 'Life support systems have failed. Mission is over.',
      icon: <Skull className="w-12 h-12 text-red-400" />,
    },
    power: {
      title: 'Power Failure',
      message: 'All systems are offline. You are adrift.',
      icon: <Zap className="w-12 h-12 text-yellow-400" />,
    },
    crash: {
      title: 'Hull Integrity Lost',
      message: 'You have crashed into a celestial body.',
      icon: <Rocket className="w-12 h-12 text-orange-400" />,
    },
    default: {
      title: 'Mission Failed',
      message: 'Something went wrong.',
      icon: <Frown className="w-12 h-12 text-gray-400" />,
    },
  };

  const { title, message, icon } = messages[reason] || messages.default;

  return (
    <div className="absolute inset-0 bg-black/80 flex items-center justify-center z-50">
      <Card className="bg-gray-900 border-red-500 text-white w-full max-w-md text-center">
        <CardHeader>
          <div className="mx-auto mb-4">{icon}</div>
          <CardTitle className="text-3xl text-red-500">{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-300 mb-8">{message}</p>
          <div className="flex gap-4 justify-center">
            <Button onClick={onRestart} size="lg" variant="destructive" className="flex items-center gap-2">
              <RotateCcw className="w-4 h-4" />
              Try Again
            </Button>
            <Link to={createPageUrl('MainMenu')}>
              <Button size="lg" variant="outline">
                Main Menu
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
