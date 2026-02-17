import { Expert, Council } from '../../types';

export const experts: Expert[] = [
  { id: '1', name: 'Director AI', specialty: 'Directing', active: true },
  { id: '2', name: 'Cinematographer AI', specialty: 'Cinematography', active: true },
  { id: '3', name: 'Editor AI', specialty: 'Editing', active: true },
  { id: '4', name: 'Composer AI', specialty: 'Music', active: false },
];

export const council: Council = {
  id: 'main-council',
  name: 'Director’s Council',
  members: experts.filter(e => e.active),
  description: 'Core group of knowledge experts for film, video, and music production.'
};
