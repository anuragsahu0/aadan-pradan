export const getNetworkStateAsync = async () => ({
  isConnected: true,
  isInternetReachable: true,
  type: 'WIFI',
});

export const NetworkStateType = {
  NONE: 0,
  UNKNOWN: 1,
  CELLULAR: 2,
  WIFI: 3,
  BLUETOOTH: 4,
  ETHERNET: 5,
  WIMAX: 6,
  VPN: 7,
  OTHER: 8,
};
