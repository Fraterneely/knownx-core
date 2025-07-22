import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../utils/router';
import { Button } from '@/components/ui/button';
import { Rocket, Library, Wrench, PlayCircle } from 'lucide-react';

export default function MainMenu() {
  return (
    <div 
      className="min-h-screen w-full flex flex-col items-center justify-center bg-gray-900 text-white p-4"
      style={{
        backgroundImage: 'radial-gradient(circle at top right, rgba(29, 78, 216, 0.3), transparent), radial-gradient(circle at bottom left, rgba(107, 33, 168, 0.3), transparent)',
        backgroundAttachment: 'fixed'
      }}
    >
      <div className="text-center z-10">
        <div className="flex items-center justify-center gap-4 mb-4">
          <Rocket className="w-16 h-16 text-blue-400" />
          <div>
            <h1 className="text-5xl md:text-7xl font-bold tracking-tighter">
              Cosmic Navigator
            </h1>
            <p className="text-lg text-gray-400 mt-2">A Realistic Space Exploration Game</p>
          </div>
        </div>

        <div className="mt-12 flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link to={"/game"}>
            <Button size="lg" className="w-64 bg-blue-600 hover:bg-blue-700 text-lg py-6 shadow-lg">
              <PlayCircle className="w-5 h-5 mr-3" />
              Start Game
            </Button>
          </Link>
          <Link to={createPageUrl('Settings')}>
            <Button size="lg" variant="outline" className="w-64 text-lg py-6 shadow-lg border-blue-500 hover:bg-blue-900/50 hover:text-white">
              <Wrench className="w-5 h-5 mr-3" />
              Hangar
            </Button>
          </Link>
          <Link to={createPageUrl('Codex')}>
            <Button size="lg" variant="outline" className="w-64 text-lg py-6 shadow-lg border-purple-500 hover:bg-purple-900/50 hover:text-white">
              <Library className="w-5 h-5 mr-3" />
              Codex
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}