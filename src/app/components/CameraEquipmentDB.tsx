import React from 'react';
import { cameraEquipment } from '../lib/cameraEquipment';

export const CameraEquipmentDB: React.FC = () => {
  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-2">Camera Equipment Database</h2>
      <ul>
        {cameraEquipment.map(item => (
          <li key={item.id} className="mb-4 border-b pb-2">
            <div className="font-semibold">{item.name}</div>
            <div className="text-xs text-gray-500">{item.type} — {item.manufacturer}</div>
            <div className="mt-1 text-sm">Specs:</div>
            <ul className="ml-4 text-xs">
              {Object.entries(item.specs).map(([k, v]) => (
                <li key={k}><strong>{k}:</strong> {v}</li>
              ))}
            </ul>
            {item.notes && <div className="mt-1 text-xs text-blue-600">Notes: {item.notes}</div>}
          </li>
        ))}
      </ul>
    </div>
  );
};
