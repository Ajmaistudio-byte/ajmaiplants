
export interface PlantDetails {
  name: string;
  scientificName: string;
  careInstructions: string;
  confidence: number;
}

export interface ScanResult {
  id: string;
  timestamp: number;
  originalImage: string; // Base64
  generatedImage?: string; // URL or Base64
  details: PlantDetails;
}

export interface UserProfile {
  id: string;
  username?: string;
  full_name?: string;
  country?: string;
  avatar_url?: string;
  updated_at?: string;
}

export interface User {
  id: string;
  isGuest: boolean;
  email?: string;
  username?: string;
  fullName?: string;
  country?: string;
  avatarUrl?: string;
}

export enum AppView {
  LANDING = 'LANDING',
  DASHBOARD = 'DASHBOARD',
  RESULT = 'RESULT',
  CAMERA = 'CAMERA'
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
}
