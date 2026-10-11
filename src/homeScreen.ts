import { useSyncExternalStore } from 'react';

/**
 * Putting Ashra on the home screen. Chrome on Android offers its own install prompt once, and
 * it's easy to miss; we keep the browser's event so a button can bring the prompt back. Safari
 * has no such event, so iPhones get step-by-step instructions instead.
 */

export type Platform = 'ios' | 'android' | 'other';
/** "inapp": a browser inside another app (Instagram, Facebook, the Google app…), which can't install. */
export type Browser = 'safari' | 'chrome' | 'samsung' | 'inapp' | 'other';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const IN_APP = /FBAN|FBAV|FB_IAB|Instagram|Line\/|Snapchat|musical_ly|TikTok|Twitter|GSA\//;

export function detect(ua: string, maxTouchPoints = 0): { platform: Platform; browser: Browser } {
  // iPads ask for the desktop site and say "Macintosh"; only the touch screen gives them away.
  const ios = /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && maxTouchPoints > 1);
  const android = !ios && /Android/.test(ua);
  const platform: Platform = ios ? 'ios' : android ? 'android' : 'other';
  let browser: Browser = 'other';
  // Android web views add "; wv)" to the user agent.
  if (IN_APP.test(ua) || (android && /; wv\)/.test(ua))) browser = 'inapp';
  else if (ios) browser = /CriOS/.test(ua) ? 'chrome' : /FxiOS|EdgiOS|OPiOS|YaBrowser/.test(ua) ? 'other' : 'safari';
  else if (/SamsungBrowser/.test(ua)) browser = 'samsung';
  else if (/Firefox|OPR\/|EdgA|YaBrowser|MiuiBrowser|HuaweiBrowser|UCBrowser/.test(ua)) browser = 'other';
  else if (/Chrome\//.test(ua)) browser = 'chrome';
  return { platform, browser };
}

export function thisDevice() {
  return detect(navigator.userAgent, navigator.maxTouchPoints);
}

/** Opened from the home screen (or an installed app window) rather than in a browser tab. */
export function isStandalone(): boolean {
  return window.matchMedia('(display-mode: standalone)').matches || (navigator as { standalone?: boolean }).standalone === true;
}

let deferred: BeforeInstallPromptEvent | null = null;
let installed = false;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

/** Call once at start-up: Chrome may fire its event before any screen is drawn. */
export function startInstallWatch() {
  // No preventDefault: Chrome still shows its own prompt the first time; we keep the event for later.
  window.addEventListener('beforeinstallprompt', (e) => {
    deferred = e as BeforeInstallPromptEvent;
    emit();
  });
  window.addEventListener('appinstalled', () => {
    deferred = null;
    installed = true;
    emit();
  });
}

function subscribe(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}

/** Whether a tap can bring up the browser's own install prompt right now. */
export function useCanPrompt(): boolean {
  return useSyncExternalStore(subscribe, () => deferred !== null, () => false);
}

/** True once the browser says it installed the app during this visit. */
export function useJustInstalled(): boolean {
  return useSyncExternalStore(subscribe, () => installed, () => false);
}

/** Shows the browser's install prompt. "unavailable": there is none, so show the steps instead. */
export async function promptInstall(): Promise<'accepted' | 'dismissed' | 'unavailable'> {
  const e = deferred;
  if (!e) return 'unavailable';
  // The event works once; Chrome fires a new one if it can ask again.
  deferred = null;
  emit();
  try {
    await e.prompt();
    return (await e.userChoice).outcome;
  } catch {
    return 'unavailable';
  }
}

/** Worth suggesting: a phone, in a browser tab. */
export function shouldSuggestInstall(): boolean {
  return thisDevice().platform !== 'other' && !isStandalone();
}
