import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { formatNumber } from '../../utils/utils';

const NavigationInfo = ({ spacecraft }) => {
  return (
    <Card className="bg-gray-900/90 border-gray-700 text-white backdrop-blur-sm p-2">
      <CardContent className="flex flex-row justify-around items-center text-xs p-0">
        <div>Coordiantes (AU): {spacecraft.position ? `${spacecraft.position.x.toFixed(3)}, ${spacecraft.position.y.toFixed(3)}, ${spacecraft.position.z.toFixed(3)}` : 'N/A'}</div>
      </CardContent>
    </Card>
  );
};

export default NavigationInfo;