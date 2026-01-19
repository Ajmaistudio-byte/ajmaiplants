
import { supabase } from './supabaseClient';
import { UserProfile } from '../types';

export const getProfile = async (userId: string): Promise<UserProfile | null> => {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) {
      console.log('Profile fetch note:', error.message);
      return null;
    }
    return data as UserProfile;
  } catch (error) {
    console.error('Error fetching profile:', error);
    return null;
  }
};

export const updateProfile = async (userId: string, updates: { username?: string; full_name?: string; country?: string; avatar_url?: string }) => {
  const { error } = await supabase
    .from('profiles')
    .upsert({
      id: userId,
      ...updates,
      updated_at: new Date().toISOString(),
    });

  if (error) {
    throw error;
  }
};
