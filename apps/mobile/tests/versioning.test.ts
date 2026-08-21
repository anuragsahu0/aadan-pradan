import { describe, it, expect } from 'vitest';
import { APP_VERSION, BUILD_NUMBER, APP_BUNDLE_ID, APP_NAME } from '@aadan-pradan/config';
import appJson from '../app.json';

describe('Phase 11 Release Engineering & Mobile Configuration QA', () => {
  it('1. App version and build numbers must be consistent', () => {
    expect(APP_NAME).toBe('Aadan Pradan');
    expect(APP_VERSION).toBe('1.0.0');
    expect(BUILD_NUMBER).toBe('1');
    expect(APP_BUNDLE_ID).toBe('com.aadanpradan.app');

    expect(appJson.expo.name).toBe('Aadan Pradan');
    expect(appJson.expo.version).toBe('1.0.0');
    expect(appJson.expo.ios.bundleIdentifier).toBe('com.aadanpradan.app');
    expect(appJson.expo.ios.buildNumber).toBe('1');
    expect(appJson.expo.android.package).toBe('com.aadanpradan.app');
    expect(appJson.expo.android.versionCode).toBe(1);
  });

  it('2. Microphone privacy description must be present and transparent', () => {
    const micDescription = appJson.expo.ios.infoPlist.NSMicrophoneUsageDescription;
    expect(micDescription).toBeDefined();
    expect(micDescription).toContain('microphone access');
    expect(micDescription).toContain('Push-to-Talk');
  });

  it('3. Android permissions must be declared for voice, network, and notifications', () => {
    const permissions = appJson.expo.android.permissions;
    expect(permissions).toContain('RECORD_AUDIO');
    expect(permissions).toContain('INTERNET');
    expect(permissions).toContain('POST_NOTIFICATIONS');
    expect(permissions).toContain('VIBRATE');
  });
});
