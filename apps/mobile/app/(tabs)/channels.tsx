import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  Pressable,
  StyleSheet,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useFrequencyStore } from '../../src/store/frequencyStore';

interface ChannelItem {
  id: string;
  code: string;
  name: string;
  category: string;
  onlineCount: number;
  maxCount: number;
  color: string;
  isFavorite: boolean;
  isActive?: boolean;
}

const CHANNELS: ChannelItem[] = [
  {
    id: 'ch-07',
    code: '145.800',
    name: 'Channel 07',
    category: 'Engineering Dept',
    onlineCount: 12,
    maxCount: 40,
    color: '#FF7A00',
    isFavorite: true,
    isActive: true,
  },
  {
    id: 'ch-03',
    code: '145.810',
    name: 'Channel 03',
    category: 'Hostel Block A',
    onlineCount: 8,
    maxCount: 40,
    color: '#00E5FF',
    isFavorite: false,
  },
  {
    id: 'ch-12',
    code: '145.820',
    name: 'Channel 12',
    category: 'Event Committee',
    onlineCount: 15,
    maxCount: 40,
    color: '#A855F7',
    isFavorite: false,
  },
  {
    id: 'ch-21',
    code: '145.830',
    name: 'Channel 21',
    category: 'Study Group',
    onlineCount: 6,
    maxCount: 40,
    color: '#22C55E',
    isFavorite: false,
  },
  {
    id: 'ch-99',
    code: '145.890',
    name: 'Channel 99',
    category: 'Admin Channel',
    onlineCount: 4,
    maxCount: 40,
    color: '#EF4444',
    isFavorite: false,
  },
];

export default function ChannelsScreen() {
  const router = useRouter();
  const { currentFrequencyCode, connectToFrequency } = useFrequencyStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<'All' | 'Joined' | 'Favorites' | 'Recent'>('Joined');
  const [favoriteIds, setFavoriteIds] = useState<string[]>(['ch-07']);

  const toggleFavorite = (id: string) => {
    setFavoriteIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleTuneChannel = async (channel: ChannelItem) => {
    await connectToFrequency(channel.code);
    router.push('/(tabs)');
  };

  const filteredChannels = CHANNELS.filter((ch) => {
    const matchesSearch =
      ch.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ch.category.toLowerCase().includes(searchQuery.toLowerCase());
    if (!matchesSearch) return false;

    if (activeFilter === 'Favorites') return favoriteIds.includes(ch.id);
    if (activeFilter === 'Joined') return ch.code === currentFrequencyCode || ch.isActive;
    return true;
  });

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" />
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable style={styles.menuButton}>
            <Text style={styles.menuIcon}>☰</Text>
          </Pressable>
          <Text style={styles.headerTitle}>Channels</Text>
          <Pressable style={styles.addButton}>
            <Text style={styles.addIcon}>＋</Text>
          </Pressable>
        </View>

        {/* Search Bar */}
        <View style={styles.searchBar}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            placeholder="Search channels..."
            placeholderTextColor="#64748B"
            value={searchQuery}
            onChangeText={setSearchQuery}
            style={styles.searchInput}
          />
        </View>

        {/* Filter Pills */}
        <View style={styles.filtersRow}>
          {(['All', 'Joined', 'Favorites', 'Recent'] as const).map((filter) => {
            const isSelected = activeFilter === filter;
            return (
              <Pressable
                key={filter}
                onPress={() => setActiveFilter(filter)}
                style={[
                  styles.filterPill,
                  isSelected && styles.filterPillActive,
                ]}
              >
                <Text
                  style={[
                    styles.filterPillText,
                    isSelected && styles.filterPillTextActive,
                  ]}
                >
                  {filter}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* Channels List */}
        <ScrollView contentContainerStyle={styles.listContent}>
          {filteredChannels.map((ch) => {
            const isCurrent = ch.code === currentFrequencyCode || ch.isActive;
            const isFav = favoriteIds.includes(ch.id);

            return (
              <Pressable
                key={ch.id}
                onPress={() => handleTuneChannel(ch)}
                style={[styles.channelCard, isCurrent && styles.channelCardActive]}
              >
                {/* Channel Acoustic Icon */}
                <View style={[styles.waveIconCircle, { backgroundColor: ch.color + '22' }]}>
                  <Text style={[styles.waveSymbol, { color: ch.color }]}>〰️</Text>
                </View>

                {/* Channel Details */}
                <View style={styles.channelInfo}>
                  <Text style={styles.channelName}>{ch.name}</Text>
                  <Text style={styles.channelCategory}>
                    {ch.category}
                  </Text>
                  <View style={styles.occupancyRow}>
                    <View style={styles.greenDot} />
                    <Text style={styles.occupancyText}>
                      {ch.onlineCount}/{ch.maxCount} Online
                    </Text>
                  </View>
                </View>

                {/* Right Action: Live Waveform or Star */}
                <View style={styles.cardRight}>
                  <Pressable onPress={() => toggleFavorite(ch.id)} style={styles.starButton}>
                    <Text style={[styles.starIcon, isFav && { color: '#FF7A00' }]}>
                      {isFav ? '★' : '☆'}
                    </Text>
                  </Pressable>
                  {isCurrent && (
                    <View style={styles.liveMiniWave}>
                      <Text style={{ color: '#22C55E', fontSize: 16 }}>📶</Text>
                    </View>
                  )}
                </View>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* Floating Mini-Player Dock */}
        <View style={styles.miniPlayer}>
          <View style={styles.miniPlayerLeft}>
            <View style={styles.miniWaveCircle}>
              <Text style={{ color: '#FF7A00', fontSize: 16 }}>〰️</Text>
            </View>
            <View>
              <Text style={styles.miniPlayerTitle}>Channel 07</Text>
              <Text style={styles.miniPlayerSub}>Engineering Dept</Text>
            </View>
          </View>
          <Pressable
            onPress={() => router.push('/(tabs)')}
            style={styles.miniPlayerBtn}
          >
            <Text style={styles.pauseSymbol}>❚❚</Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#0B0E14',
  },
  container: {
    flex: 1,
    backgroundColor: '#0B0E14',
    paddingHorizontal: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
  },
  menuButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuIcon: {
    fontSize: 22,
    color: '#FFFFFF',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  addButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FF7A00',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addIcon: {
    fontSize: 20,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#151A24',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#242C3C',
    paddingHorizontal: 14,
    height: 44,
    marginVertical: 10,
    gap: 10,
  },
  searchIcon: {
    fontSize: 14,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#FFFFFF',
  },
  filtersRow: {
    flexDirection: 'row',
    gap: 8,
    marginVertical: 10,
  },
  filterPill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#151A24',
    borderWidth: 1,
    borderColor: '#242C3C',
  },
  filterPillActive: {
    backgroundColor: '#FF7A00',
    borderColor: '#FF7A00',
  },
  filterPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#94A3B8',
  },
  filterPillTextActive: {
    color: '#FFFFFF',
  },
  listContent: {
    paddingBottom: 90,
    gap: 12,
    paddingTop: 6,
  },
  channelCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#151A24',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#242C3C',
    padding: 14,
    gap: 14,
  },
  channelCardActive: {
    borderColor: '#FF7A00',
    backgroundColor: 'rgba(255, 122, 0, 0.04)',
  },
  waveIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  waveSymbol: {
    fontSize: 20,
  },
  channelInfo: {
    flex: 1,
    gap: 3,
  },
  channelName: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  channelCategory: {
    fontSize: 12,
    fontWeight: '600',
    color: '#94A3B8',
  },
  occupancyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  greenDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#22C55E',
  },
  occupancyText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#22C55E',
  },
  cardRight: {
    alignItems: 'flex-end',
    gap: 10,
  },
  starButton: {
    padding: 4,
  },
  starIcon: {
    fontSize: 18,
    color: '#64748B',
  },
  liveMiniWave: {
    paddingRight: 2,
  },
  miniPlayer: {
    position: 'absolute',
    bottom: 12,
    left: 16,
    right: 16,
    backgroundColor: '#151A24',
    borderWidth: 1.5,
    borderColor: '#FF7A00',
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#FF7A00',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 6,
  },
  miniPlayerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  miniWaveCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 122, 0, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  miniPlayerTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  miniPlayerSub: {
    fontSize: 11,
    fontWeight: '600',
    color: '#94A3B8',
  },
  miniPlayerBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#1E2533',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pauseSymbol: {
    fontSize: 13,
    color: '#FF7A00',
    fontWeight: '900',
  },
});
