/**
 * Mobile Bridge — Capacitor native feature access.
 * Safe to import on web (gracefully falls back to no-op).
 */

import { Capacitor } from '@capacitor/core';

// ─── Platform Detection ─────────────────────────────────

export const isNative = Capacitor.isNativePlatform();
export const isIOS = Capacitor.getPlatform() === 'ios';
export const isAndroid = Capacitor.getPlatform() === 'android';
export const isWeb = Capacitor.getPlatform() === 'web';

// ─── Push Notifications ─────────────────────────────────

export async function registerPushNotifications() {
  if (!isNative) return null;

  const { PushNotifications } = await import('@capacitor/push-notifications');

  const permission = await PushNotifications.requestPermissions();
  if (permission.receive !== 'granted') return null;

  await PushNotifications.register();

  return new Promise<string>((resolve) => {
    PushNotifications.addListener('registration', (token) => {
      console.log('[Push] Token:', token.value);
      resolve(token.value);
    });

    PushNotifications.addListener('registrationError', (err) => {
      console.error('[Push] Registration error:', err);
      resolve('');
    });
  });
}

export async function addPushListeners(onNotification: (data: any) => void) {
  if (!isNative) return;

  const { PushNotifications } = await import('@capacitor/push-notifications');

  PushNotifications.addListener('pushNotificationReceived', (notification) => {
    console.log('[Push] Received:', notification);
    onNotification(notification);
  });

  PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
    console.log('[Push] Action:', action);
    onNotification(action.notification);
  });
}

// ─── Haptics ─────────────────────────────────────────────

export async function hapticFeedback(style: 'light' | 'medium' | 'heavy' = 'medium') {
  if (!isNative) return;

  const { Haptics, ImpactStyle } = await import('@capacitor/haptics');
  const styleMap = {
    light: ImpactStyle.Light,
    medium: ImpactStyle.Medium,
    heavy: ImpactStyle.Heavy,
  };
  await Haptics.impact({ style: styleMap[style] });
}

export async function hapticNotification(type: 'success' | 'warning' | 'error' = 'success') {
  if (!isNative) return;

  const { Haptics, NotificationType } = await import('@capacitor/haptics');
  const typeMap = {
    success: NotificationType.Success,
    warning: NotificationType.Warning,
    error: NotificationType.Error,
  };
  await Haptics.notification({ type: typeMap[type] });
}

// ─── Camera ──────────────────────────────────────────────

export async function takePhoto() {
  if (!isNative) return null;

  const { Camera, CameraResultType, CameraSource } = await import('@capacitor/camera');

  try {
    const photo = await Camera.getPhoto({
      quality: 80,
      allowEditing: false,
      resultType: CameraResultType.Base64,
      source: CameraSource.Camera,
    });
    return photo;
  } catch {
    return null;
  }
}

export async function pickImage() {
  if (!isNative) return null;

  const { Camera, CameraResultType, CameraSource } = await import('@capacitor/camera');

  try {
    const photo = await Camera.getPhoto({
      quality: 80,
      allowEditing: false,
      resultType: CameraResultType.Base64,
      source: CameraSource.Photos,
    });
    return photo;
  } catch {
    return null;
  }
}

// ─── Share ───────────────────────────────────────────────

export async function shareContent(opts: { title: string; text?: string; url?: string }) {
  if (!isNative) {
    // Fallback to Web Share API
    if (navigator.share) {
      await navigator.share(opts);
    }
    return;
  }

  const { Share } = await import('@capacitor/share');
  await Share.share(opts);
}

// ─── Status Bar ──────────────────────────────────────────

export async function setStatusBarDark() {
  if (!isNative) return;

  const { StatusBar, Style } = await import('@capacitor/status-bar');
  await StatusBar.setStyle({ style: Style.Dark });
  if (isAndroid) {
    await StatusBar.setBackgroundColor({ color: '#0f172a' });
  }
}

// ─── App Lifecycle ───────────────────────────────────────

export async function addAppStateListener(onResume: () => void) {
  if (!isNative) return;

  const { App } = await import('@capacitor/app');
  App.addListener('appStateChange', ({ isActive }) => {
    if (isActive) onResume();
  });
}

// ─── Open External URL ──────────────────────────────────

export async function openExternalUrl(url: string) {
  if (!isNative) {
    window.open(url, '_blank');
    return;
  }

  const { Browser } = await import('@capacitor/browser');
  await Browser.open({ url });
}
