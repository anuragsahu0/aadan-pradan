import { Platform } from 'react-native';
import { Audio, InterruptionModeIOS, InterruptionModeAndroid } from 'expo-av';
import type { AudioOutputRoute } from '../types/voice.types';

class AudioOutputManager {
  private currentRoute: AudioOutputRoute = 'speaker';

  public async initializeAudioMode(): Promise<void> {
    if (Platform.OS === 'web') return;

    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        staysActiveInBackground: true,
        interruptionModeIOS: InterruptionModeIOS.DoNotMix,
        interruptionModeAndroid: InterruptionModeAndroid.DoNotMix,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
      });
    } catch {
      // Non-fatal on web/simulators
    }
  }

  public async setSpeakerphoneOn(speakerOn: boolean): Promise<void> {
    this.currentRoute = speakerOn ? 'speaker' : 'earpiece';

    if (Platform.OS === 'web') return;

    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        staysActiveInBackground: true,
        interruptionModeIOS: InterruptionModeIOS.DoNotMix,
        interruptionModeAndroid: InterruptionModeAndroid.DoNotMix,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: !speakerOn,
      });
    } catch {
      // Non-fatal
    }
  }

  public getRoute(): AudioOutputRoute {
    return this.currentRoute;
  }
}

export const audioOutputManager = new AudioOutputManager();
