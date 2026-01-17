// Facebook Audience Network Ad Integration

import { isFacebookInstantGame } from './platform';

export type AdPlacement = 'interstitial' | 'rewarded';

class FacebookAdManager {
  private interstitialAd: any = null;
  private rewardedAd: any = null;
  private initialized = false;

  async initialize(): Promise<void> {
    if (!isFacebookInstantGame()) {
      console.warn('Facebook Ads only available on Facebook Instant Games platform');
      return;
    }

    this.initialized = true;
  }

  async showInterstitialAd(placementId: string = 'YOUR_PLACEMENT_ID'): Promise<boolean> {
    if (!isFacebookInstantGame() || !this.initialized) {
      return false;
    }

    try {
      const FBInstant = window.FBInstant!;
      
      // Load the ad
      this.interstitialAd = await FBInstant.getInterstitialAdAsync(placementId);
      await this.interstitialAd.loadAsync();
      
      // Show the ad
      await this.interstitialAd.showAsync();
      
      return true;
    } catch (error) {
      console.error('Failed to show interstitial ad:', error);
      return false;
    }
  }

  async showRewardedVideo(placementId: string = 'YOUR_REWARDED_PLACEMENT_ID'): Promise<boolean> {
    if (!isFacebookInstantGame() || !this.initialized) {
      return false;
    }

    try {
      const FBInstant = window.FBInstant!;
      
      // Load the rewarded video
      this.rewardedAd = await FBInstant.getRewardedVideoAsync(placementId);
      await this.rewardedAd.loadAsync();
      
      // Show the rewarded video
      await this.rewardedAd.showAsync();
      
      // Video was watched completely - grant reward
      return true;
    } catch (error) {
      console.error('Failed to show rewarded video:', error);
      // User may have closed the video early
      return false;
    }
  }

  // Preload ads for better user experience
  async preloadInterstitial(placementId: string = 'YOUR_PLACEMENT_ID'): Promise<void> {
    if (!isFacebookInstantGame() || !this.initialized) {
      return;
    }

    try {
      const FBInstant = window.FBInstant!;
      this.interstitialAd = await FBInstant.getInterstitialAdAsync(placementId);
      await this.interstitialAd.loadAsync();
    } catch (error) {
      console.error('Failed to preload interstitial ad:', error);
    }
  }

  async preloadRewardedVideo(placementId: string = 'YOUR_REWARDED_PLACEMENT_ID'): Promise<void> {
    if (!isFacebookInstantGame() || !this.initialized) {
      return;
    }

    try {
      const FBInstant = window.FBInstant!;
      this.rewardedAd = await FBInstant.getRewardedVideoAsync(placementId);
      await this.rewardedAd.loadAsync();
    } catch (error) {
      console.error('Failed to preload rewarded video:', error);
    }
  }
}

// Export singleton instance
export const facebookAds = new FacebookAdManager();
