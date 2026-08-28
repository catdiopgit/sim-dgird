import { useContext } from 'react';
import { ProfileContext } from '../contexts/ProfileContext';

export function useProfile() {
  const context = useContext(ProfileContext);
  if (!context) {
    throw new Error('useProfile doit être utilisé à l\'intérieur de ProfileProvider');
  }
  return context;
}
