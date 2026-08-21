export const Audio = {
  getPermissionsAsync: async () => ({ granted: true, canAskAgain: true, status: 'granted' }),
  requestPermissionsAsync: async () => ({ granted: true, canAskAgain: true, status: 'granted' }),
  setAudioModeAsync: async () => {},
  Recording: class {
    prepareToRecordAsync = async () => {};
    startAsync = async () => {};
    stopAndUnloadAsync = async () => {};
    getURI = () => 'file:///mock/audio.m4a';
  },
  Sound: class {
    loadAsync = async () => {};
    playAsync = async () => {};
    stopAsync = async () => {};
    unloadAsync = async () => {};
  },
};

export const InterruptionModeIOS = {
  MixWithOthers: 0,
  DoNotMix: 1,
  DuckOthers: 2,
};

export const InterruptionModeAndroid = {
  DoNotMix: 1,
  DuckOthers: 2,
};
