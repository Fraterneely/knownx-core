import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Sun, Globe, Moon, Sprout, Milestone } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

const CELESTIAL_BODIES = {
  sun: { name: 'Sun', radius: 695510, mass: "1.989 × 10^30 kg", type: 'star', temp: '5,505 °C', description: 'The star at the center of the Solar System. It is a nearly perfect sphere of hot plasma, heated to incandescence by nuclear fusion reactions in its core.', icon: Sun },
  earth: { name: 'Earth', radius: 6371, mass: "5.972 × 10^24 kg", type: 'planet', temp: '15 °C (avg)', description: 'Our home planet, the only place known in the universe where life has originated and found habitability.', icon: Globe },
  moon: { name: 'Moon', radius: 1737.4, mass: "7.342 × 10^22 kg", type: 'moon', temp: '-20 °C (avg)', description: "Earth's only natural satellite. It is the fifth largest satellite in the Solar System.", icon: Moon },
  mars: { name: 'Mars', radius: 3389.5, mass: "6.39 × 10^23 kg", type: 'planet', temp: '-65 °C (avg)', description: 'The "Red Planet," known for its iron oxide-rich surface. It is a target for future human exploration.', icon: Sprout },
  jupiter: { name: 'Jupiter', radius: 69911, mass: "1.898 × 10^27 kg", type: 'planet', temp: '-145 °C (avg)', description: 'The largest planet in our Solar System, a gas giant with a Great Red Spot, a storm larger than Earth.', icon: Milestone },
  proximaCentauri: { name: 'Proxima Centauri', radius: 107280, mass: "2.428 × 10^29 kg", type: 'star', temp: '2,769 °C', description: 'A red dwarf star located about 4.24 light-years away from the Sun in the constellation of Centaurus. It is the closest known star to the Sun.', icon: Sun }
};

export default function Codex() {
  const [selectedBody, setSelectedBody] = useState(CELESTIAL_BODIES.sun);

  const BodyIcon = ({ type }) => {
    const Icon = CELESTIAL_BODIES[type].icon;
    return <Icon className="w-5 h-5 text-gray-400" />;
  };

  return (
    <div className="min-h-screen w-full bg-gray-900 text-white p-4 sm:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <Link to={createPageUrl('MainMenu')}>
            <Button variant="outline" size="icon">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <h1 className="text-3xl font-bold">Codex</h1>
        </div>

        <div className="grid md:grid-cols-3 lg:grid-cols-4 gap-8">
          <div className="md:col-span-1">
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle>Celestial Bodies</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-1">
                  {Object.entries(CELESTIAL_BODIES).map(([key, body]) => (
                    <li key={key}>
                      <button
                        onClick={() => setSelectedBody(body)}
                        className={`w-full text-left p-2 rounded-md flex items-center gap-3 transition-colors ${
                          selectedBody.name === body.name ? 'bg-blue-600' : 'hover:bg-gray-700'
                        }`}
                      >
                        <BodyIcon type={key} />
                        {body.name}
                      </button>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </div>

          <div className="md:col-span-2 lg:col-span-3">
            {selectedBody && (
              <Card className="bg-gray-800/50 border-gray-700">
                <CardHeader>
                  <div className="flex items-center gap-4">
                    <selectedBody.icon className="w-10 h-10 text-blue-400" />
                    <div>
                      <CardTitle className="text-4xl">{selectedBody.name}</CardTitle>
                      <p className="text-gray-400 capitalize">{selectedBody.type}</p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-300 mb-6">{selectedBody.description}</p>
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 border-t border-gray-700 pt-4">
                    <div>
                      <h4 className="font-semibold text-gray-400">Mass</h4>
                      <p>{selectedBody.mass}</p>
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-400">Radius</h4>
                      <p>{selectedBody.radius.toLocaleString()} km</p>
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-400">Avg. Surface Temp</h4>
                      <p>{selectedBody.temp}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}