# Facebook Instant Games Deployment Guide

## 🎮 Your game is now ready for Facebook Instant Games!

### What's Been Added

✅ **Platform Detection** - Automatically detects Facebook vs Web
✅ **Facebook Authentication** - Uses FBInstant.player instead of Google Sign-In
✅ **Facebook Ads** - Integrated Audience Network (interstitial + rewarded video)
✅ **Unified Codebase** - Same code works on both platforms
✅ **Facebook SDK** - FBInstant 6.3 integrated

---

## 📋 Deployment Steps

### 1. Build Your Game

```bash
cd web
npm run build
```

This creates the `build/` folder with your optimized game.

### 2. Create Facebook App

1. Go to [Facebook Developers](https://developers.facebook.com/)
2. Click "My Apps" → "Create App"
3. Select **"Gaming"** as app type
4. Fill in app details:
   - **App Name**: CrazyPuzzle
   - **Contact Email**: Your email
   - **Business Account**: Optional

### 3. Enable Instant Games

1. In your app dashboard, click **"Add Product"**
2. Find **"Instant Games"** and click **"Set Up"**
3. Accept the Instant Games terms

### 4. Configure Ad Placements (For Monetization)

1. In left menu, go to **"Monetization"** → **"Audience Network"**
2. Click **"Create Ad Placement"**
3. Create 2 placements:
   - **Interstitial**: Between games
   - **Rewarded Video**: For bonus features

4. Copy the placement IDs and update `facebookAds.ts`:
   ```typescript
   // Replace YOUR_PLACEMENT_ID with actual IDs
   async showInterstitialAd(placementId: string = 'YOUR_ACTUAL_PLACEMENT_ID')
   async showRewardedVideo(placementId: string = 'YOUR_ACTUAL_REWARDED_ID')
   ```

### 5. Upload Your Game

1. In your app dashboard, go to **"Instant Games"** → **"Web Hosting"**
2. Click **"Upload Version"**
3. **Zip your build folder**:
   ```bash
   # On Windows
   Compress-Archive -Path web\build\* -DestinationPath crazypuzzle-facebook.zip
   ```
4. Upload `crazypuzzle-facebook.zip`
5. Add version notes (e.g., "Initial release v1.0")

### 6. Test Your Game

1. After upload completes, you'll see a **"Test"** button
2. Click **"Test"** to play in Facebook
3. Verify:
   - ✅ Game loads without errors
   - ✅ Player name shows correctly
   - ✅ Multiplayer works
   - ✅ Leaderboards display

### 7. Push to Production

1. Once testing looks good, click **"Push to Production"**
2. Wait for approval (usually a few minutes)

### 8. Submit for Review

1. Go to **"App Review"** → **"Permissions and Features"**
2. Request these features:
   - `publish_actions` - For sharing scores
   - `gaming_user_locale` - For localization
3. Fill out the review form:
   - Upload screenshots
   - Write description
   - Provide test instructions

**Review typically takes 1-3 days**

---

## 💰 Monetization Setup

### Enable Ads

After your game is approved and has some traffic:

1. Go to **"Monetization"** in your app
2. Apply for **Audience Network**
3. Wait for approval (can take 1-2 weeks)
4. Once approved, your ads will start showing!

### Where Ads Will Appear

Based on your code, ads can be shown:
- **Interstitial**: Between game rounds
- **Rewarded Video**: For extra lives, hints, etc.

To trigger ads in your game, call:
```typescript
import { facebookAds } from './facebookAds';

// Show interstitial ad
await facebookAds.showInterstitialAd();

// Show rewarded video
const watched = await facebookAds.showRewardedVideo();
if (watched) {
  // Grant reward to player
}
```

---

## 🌐 Dual Platform Support

Your game now works on **both platforms**:

### Web (Current)
- URL: `https://crazypuzzle-3cfeb.web.app`
- Auth: Google Sign-In
- Ads: Google AdSense (pending approval)

### Facebook Instant Games
- Platform: Facebook Messenger + News Feed
- Auth: Automatic (Facebook player)
- Ads: Audience Network

**Same codebase, two platforms!** 🎯

---

## 🔧 Troubleshooting

### "FBInstant is not defined" Error
- **Cause**: Testing on web instead of Facebook
- **Solution**: This is normal! The game detects platform automatically

### Ads Not Showing
- **Cause**: Placement IDs not configured OR ads not approved yet
- **Solution**: 
  1. Update placement IDs in `facebookAds.ts`
  2. Wait for Audience Network approval

### Player Name Shows as "null"
- **Cause**: Missing permissions
- **Solution**: Request `user_friends` permission in app review

---

## 📊 Next Steps

1. **Build the game**: `npm run build`
2. **Zip the build folder**
3. **Upload to Facebook**
4. **Test thoroughly**
5. **Submit for review**
6. **Enable monetization** once approved

Need help? Check [Facebook Instant Games Docs](https://developers.facebook.com/docs/games/instant-games)

---

## 🎉 Your Game Stack

- ✅ React + TypeScript
- ✅ Firebase (Database + Auth)
- ✅ Facebook Instant Games SDK
- ✅ Audience Network Ads
- ✅ Multiplayer with leaderboards
- ✅ Cross-platform (Web + Facebook)

**You're all set to monetize on Facebook! 🚀**
