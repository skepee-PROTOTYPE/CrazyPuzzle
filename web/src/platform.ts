// Platform detection and utilities

declare global {
  interface Window {
    FBInstant?: any;
  }
}

export type Platform = 'web' | 'facebook';

export const detectPlatform = (): Platform => {
  return typeof window.FBInstant !== 'undefined' ? 'facebook' : 'web';
};

export const isFacebookInstantGame = (): boolean => {
  return detectPlatform() === 'facebook';
};

export const isWebPlatform = (): boolean => {
  return detectPlatform() === 'web';
};

// Get current platform
export const currentPlatform = detectPlatform();
