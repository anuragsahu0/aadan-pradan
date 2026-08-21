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
          fontSize: 18,
          opacity: focused ? 1 : 0.65,
        }}
      >
        {iconSymbol}
      </Text>
      <Text
        style={{
          fontSize: typography.fontSize.xxs,
          fontWeight: focused ? '800' : '600',
          color: focused ? colors.primary : colors.textMuted,
          letterSpacing: 0.8,
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
            backgroundColor: colors.primary,
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
          backgroundColor: colors.tabBarBackground,
          borderTopColor: colors.tabBarBorder,
          borderTopWidth: 1.5,
          height: 66,
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
            <TabIcon label="HOME" focused={focused} iconSymbol="🏠" />
          ),
          tabBarAccessibilityLabel: 'Home Tab',
        }}
      />
      <Tabs.Screen
        name="frequency"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon label="FREQUENCY" focused={focused} iconSymbol="📻" />
          ),
          tabBarAccessibilityLabel: 'Frequency Walkie Talkie Tab',
        }}
      />
      <Tabs.Screen
        name="activity"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon label="ACTIVITY" focused={focused} iconSymbol="📊" />
          ),
          tabBarAccessibilityLabel: 'Activity Log Tab',
        }}
      />
      <Tabs.Screen
        name="me"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon label="ME" focused={focused} iconSymbol="👤" />
          ),
          tabBarAccessibilityLabel: 'Profile and Settings Tab',
        }}
      />
      {/* Hidden legacy tab mappings for clean router redirection */}
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
