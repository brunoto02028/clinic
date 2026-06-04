import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.bpr.rehab',
  appName: 'BPR Rehab',
  // Point to the live deployed site — start at /dashboard (redirects to /login if not authenticated)
  server: {
    url: 'https://bpr.rehab/dashboard',
    cleartext: false,
  },
  // Native splash & status bar
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      backgroundColor: '#0f172a',
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true,
    },
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#0f172a',
    },
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
    Keyboard: {
      resize: 'body',
      resizeOnFullScreen: true,
    },
  },
  // iOS specific
  ios: {
    contentInset: 'automatic',
    preferredContentMode: 'mobile',
    scheme: 'BPR Rehab',
  },
  // Android specific
  android: {
    allowMixedContent: false,
    captureInput: true,
    webContentsDebuggingEnabled: false,
  },
};

export default config;
