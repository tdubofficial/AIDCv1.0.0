// Expert represents a knowledge expert (AI or human)
export interface Expert {
  id: string;
  name: string;
  specialty: string;
  bio?: string;
  avatarUrl?: string;
  active: boolean;
}

// Council is a group of core experts
export interface Council {
  id: string;
  name: string;
  members: Expert[];
  description?: string;
}

// Anthology represents a knowledge entry or collection
export interface Anthology {
  id: string;
  title: string;
  category: string;
  content: string;
  tags?: string[];
  references?: string[];
}

// CameraEquipment represents a camera or related gear
export interface CameraEquipment {
  id: string;
  name: string;
  type: string;
  manufacturer: string;
  specs: Record<string, string>;
  notes?: string;
}
