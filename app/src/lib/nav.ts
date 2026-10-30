import { router } from 'expo-router';

/** Return to the previous screen, or Home when opened directly (e.g. a deep link). */
export function leave() {
  if (router.canGoBack()) router.back();
  else router.replace('/home');
}
