/**
 * Centralized Application Constants for Aadan Pradan
 */

export const APP_NAME = 'Aadan Pradan';
export const APP_TAGLINE = 'Real-Time Voice Communication';
export const SERVICE_NAME = 'aadan-pradan-server';
export const APP_VERSION = '1.0.0';
export const BUILD_NUMBER = '1';
export const APP_BUNDLE_ID = 'com.aadanpradan.app';

/**
 * Frequency constraints
 * The 40-user limit is defined centrally here and never hardcoded in scattered logic.
 */
export const MAX_USERS_PER_FREQUENCY = 40;
export const MIN_USERS_PER_FREQUENCY = 1;
export const DEFAULT_FREQUENCY = '145.800';

/**
 * Push-to-Talk Floor constraints (Phase 7)
 * Strictly one active speaker at a time with a server-authoritative maximum talk duration.
 */
export const MAX_TALK_DURATION_MS = 30000; // 30 seconds

/**
 * Standard preset virtual frequencies (VHF / UHF simulation channels)
 */
export const PRESET_FREQUENCIES: readonly string[] = [
  '145.800', // Primary General Calling
  '144.200', // Tactical Channel Alpha
  '146.520', // National Calling Channel
  '433.500', // Secondary Channel Bravo
  '430.000', // Operations Relay
  '446.006', // Emergency / Safety Channel
] as const;

/**
 * Default networking constants
 */
export const DEFAULT_PORT = 5001;
export const DEFAULT_HOST = '0.0.0.0';
export const DEFAULT_RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
export const DEFAULT_RATE_LIMIT_MAX = 100;
