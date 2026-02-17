import React from 'react';
import { anthologies } from '../lib/anthologies';

export const AnthologyBrowser: React.FC = () => {
  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-2">Anthologies</h2>
      <ul>
        {anthologies.map(entry => (
          <li key={entry.id} className="mb-4 border-b pb-2">
            <div className="font-semibold">{entry.title}</div>
            <div className="text-xs text-gray-500">{entry.category}</div>
            <div className="mt-1 text-sm">{entry.content}</div>
            {entry.tags && <div className="mt-1 text-xs text-blue-600">Tags: {entry.tags.join(', ')}</div>}
            {entry.references && entry.references.length > 0 && (
              <div className="mt-1 text-xs text-green-600">References: {entry.references.join(', ')}</div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
};
