// Platform-aware authentication wrapper

import { User as FirebaseUser } from 'firebase/auth';
import { isFacebookInstantGame } from './platform';

export interface PlatformUser {
  uid: string;
  displayName: string | null;
  email?: string | null;
  photoURL?: string | null;
  platform: 'web' | 'facebook';
}

class PlatformAuth {
  // Convert Firebase user to platform user
  fromFirebaseUser(user: FirebaseUser): PlatformUser {
    return {
      uid: user.uid,
      displayName: user.displayName,
      email: user.email,
      photoURL: user.photoURL,
      platform: 'web'
    };
  }

  // Get Facebook Instant Games player as platform user
  async fromFacebookPlayer(): Promise<PlatformUser | null> {
    if (!isFacebookInstantGame()) {
      return null;
    }

    try {
      const FBInstant = window.FBInstant!;
      
      let playerId = FBInstant.player.getID();
      let playerName = FBInstant.player.getName();
      const playerPhoto = FBInstant.player.getPhoto();
      
      // Check if player ID is available - in test/dev environment it might be null
      if (!playerId) {
        // Generate a test ID based on current time for development
        playerId = `test_${Date.now()}`;
      }

      // getName() might return null if called too early or permission not granted
      // Use the actual name if available, otherwise create a fallback
      if (!playerName || playerName.trim() === '') {
        playerName = playerId.startsWith('test_') 
          ? 'Test Player' 
          : `Player ${playerId.substring(0, 8)}`;
      }

      return {
        uid: `fb_${playerId}`,
        displayName: playerName,
        photoURL: playerPhoto || null,
        platform: 'facebook'
      };
    } catch (error) {
      console.error('Failed to get Facebook player info:', error);
      return null;
    }
  }

  // Generic method to get current user regardless of platform
  async getCurrentUser(firebaseUser: FirebaseUser | null): Promise<PlatformUser | null> {
    if (isFacebookInstantGame()) {
      return this.fromFacebookPlayer();
    } else {
      return firebaseUser ? this.fromFirebaseUser(firebaseUser) : null;
    }
  }
}

export const platformAuth = new PlatformAuth();
