import React from 'react';
import { council, experts } from '../lib/experts';

export const CouncilManager: React.FC = () => {
  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-2">Council of Experts</h2>
      <div className="mb-4">
        <strong>{council.name}</strong>
        <p className="text-sm text-gray-500">{council.description}</p>
      </div>
      <ul>
        {council.members.map(expert => (
          <li key={expert.id} className="mb-2">
            <span className="font-semibold">{expert.name}</span> — {expert.specialty}
            {expert.bio && <span className="ml-2 text-xs text-gray-400">({expert.bio})</span>}
          </li>
        ))}
      </ul>
      <h3 className="mt-6 font-semibold">All Experts</h3>
      <ul>
        {experts.map(expert => (
          <li key={expert.id} className="mb-1">
            {expert.name} <span className="text-xs text-gray-400">[{expert.specialty}]</span> {expert.active ? '(Active)' : '(Inactive)'}
          </li>
        ))}
      </ul>
    </div>
  );
};
