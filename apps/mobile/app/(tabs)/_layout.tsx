import React from 'react';
import { Tabs } from 'expo-router';
import { Text, StyleSheet, View } from 'react-native';
import { useTheme } from '../../src/theme';

interface TabIconProps {
  label: string;
  focused: boolean;
  iconSymbol: string;
}

const TabIcon: React.FC<TabIconProps> = ({ label, focused, iconSymbol }) => {
  const { colors, typography } = useTheme();

  return (
    <View style={{ alignItems: 'center', justifyContent: 'center', gap: 3, paddingTop: 4 }}>
      <Text
        style={{
          fontSize: 19,
          opacity: focused ? 1 : 0.55,
        }}
      >
        {iconSymbol}
      </Text>
      <Text
        style={{
          fontSize: 11,
          fontWeight: focused ? '800' : '600',
          color: focused ? '#FF7A00' : '#64748B',
          letterSpacing: 0.4,
        }}
      >
        {label}
      </Text>
      {focused && (
        <View
          style={{
            width: 14,
            height: 2.5,
            borderRadius: 1.5,
            backgroundColor: '#FF7A00',
            marginTop: 1,
          }}
        />
      )}
    </View>
  );
};

export default function TabsLayout() {
  const { colors } = useTheme();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#0F1218',
          borderTopColor: '#1A212B',
          borderTopWidth: 1,
          height: 64,
          paddingBottom: 8,
          paddingTop: 4,
        },
        tabBarShowLabel: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon label="Home" focused={focused} iconSymbol="🏠" />
          ),
          tabBarAccessibilityLabel: 'Home Tab',
        }}
      />
      <Tabs.Screen
        name="channels"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon label="Channels" focused={focused} iconSymbol="📻" />
          ),
          tabBarAccessibilityLabel: 'Channels Directory Tab',
        }}
      />
      <Tabs.Screen
        name="people"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon label="People" focused={focused} iconSymbol="👥" />
          ),
          tabBarAccessibilityLabel: 'People Directory Tab',
        }}
      />
      <Tabs.Screen
        name="me"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon label="Profile" focused={focused} iconSymbol="👤" />
          ),
          tabBarAccessibilityLabel: 'Profile Tab',
        }}
      />

      {/* Legacy and auxiliary routes */}
      <Tabs.Screen
        name="frequency"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="activity"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          href: null,
        }}
      />
    </Tabs>
  );
}
