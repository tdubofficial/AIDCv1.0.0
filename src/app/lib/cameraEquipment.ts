import { CameraEquipment } from '../../types';

export const cameraEquipment: CameraEquipment[] = [
  {
    id: 'cam1',
    name: 'ARRI Alexa Mini',
    type: 'Camera',
    manufacturer: 'ARRI',
    specs: {
      Sensor: 'Super 35',
      Resolution: '4.5K',
      Weight: '2.3kg'
    },
    notes: 'Industry standard for high-end productions.'
  },
  {
    id: 'lens1',
    name: 'Canon CN-E 24mm T1.5 L F',
    type: 'Lens',
    manufacturer: 'Canon',
    specs: {
      Mount: 'EF',
      Aperture: 'T1.5',
      FocalLength: '24mm'
    },
    notes: 'Popular cinema prime lens.'
  }
];
