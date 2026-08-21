import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, KeyboardAvoidingView, Platform, Alert, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTheme } from '../../src/theme';
import { ScreenHeader } from '../../src/components/common/ScreenHeader';
import { Card } from '../../src/components/common/Card';
import { Button } from '../../src/components/common/Button';
import { Input } from '../../src/components/common/Input';
import { useAuthStore } from '../../src/store/authStore';
import { login as apiLogin } from '../../src/api/authApi';
import { hapticFeedback } from '../../src/utils/haptics';
import { APP_NAME } from '@aadan-pradan/config';

export default function LoginScreen() {
  const router = useRouter();
  const { colors, typography, spacing, radii } = useTheme();
  const { setAuth } = useAuthStore();

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{ identifier?: string; password?: string }>({});

  const validate = () => {
    const errors: { identifier?: string; password?: string } = {};
    if (!identifier.trim()) {
      errors.identifier = 'Username or email is required';
    }
    if (!password) {
      errors.password = 'Password is required';
    }
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleLogin = async () => {
    setErrorMessage(null);
    if (!validate()) {
      hapticFeedback.warning();
      return;
    }

    setIsLoading(true);
    hapticFeedback.light();

    try {
      const response = await apiLogin({
        identifier: identifier.trim(),
        password,
      });

      await setAuth(response.user, response.tokens.accessToken, response.tokens.refreshToken);
      hapticFeedback.success();
      router.replace('/(tabs)');
    } catch (err: any) {
      hapticFeedback.error();
      const msg = err.message || 'Login failed. Please verify your credentials.';
      setErrorMessage(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={{
            flexGrow: 1,
            justifyContent: 'center',
            padding: spacing.lg,
          }}
          keyboardShouldPersistTaps="handled"
        >
          {/* Brand Header */}
          <View style={{ alignItems: 'center', marginBottom: spacing.lg }}>
            <Image
              source={require('../../assets/icon.png')}
              style={{
                width: 90,
                height: 90,
                borderRadius: 20,
                marginBottom: spacing.xs,
              }}
              resizeMode="contain"
            />

            <Text
              style={{
                color: colors.textPrimary,
                fontSize: typography.fontSize.xl,
                fontWeight: '900',
                letterSpacing: typography.letterSpacing.wide,
              }}
            >
              {APP_NAME.toUpperCase()}
            </Text>
            <Text
              style={{
                color: colors.textSecondary,
                fontSize: typography.fontSize.xs,
                letterSpacing: 1,
                marginTop: 2,
              }}
            >
              Welcome back, Operator
            </Text>
          </View>

          {/* Login Card */}
          <Card variant="tactical" style={{ padding: spacing.lg }}>
            <Text
              style={{
                color: colors.primary,
                fontSize: typography.fontSize.xxs,
                fontWeight: '800',
                letterSpacing: typography.letterSpacing.tactical,
                marginBottom: spacing.md,
              }}
            >
              OPERATOR ACCESS CREDENTIALS
            </Text>

            {errorMessage && (
              <View
                style={{
                  backgroundColor: colors.crimsonMuted,
                  borderColor: colors.crimson,
                  borderWidth: 1,
                  borderRadius: radii.md,
                  padding: spacing.sm,
                  marginBottom: spacing.md,
                }}
              >
                <Text style={{ color: colors.crimson, fontSize: typography.fontSize.xs, fontWeight: '700' }}>
                  {errorMessage}
                </Text>
              </View>
            )}

            <Input
              label="Username or Email"
              placeholder="e.g. anurag or user@example.com"
              value={identifier}
              onChangeText={(val) => {
                setIdentifier(val);
                if (fieldErrors.identifier) setFieldErrors({ ...fieldErrors, identifier: undefined });
              }}
              autoCapitalize="none"
              autoCorrect={false}
              error={fieldErrors.identifier}
            />

            <Input
              label="Password"
              placeholder="Enter your password"
              value={password}
              onChangeText={(val) => {
                setPassword(val);
                if (fieldErrors.password) setFieldErrors({ ...fieldErrors, password: undefined });
              }}
              secureTextEntry
              autoCapitalize="none"
              error={fieldErrors.password}
            />

            <Button
              label={isLoading ? 'AUTHENTICATING...' : 'LOG IN'}
              variant="primary"
              size="lg"
              loading={isLoading}
              onPress={handleLogin}
              style={{ marginTop: spacing.xs }}
            />

            {/* Quick Demo Operator Buttons */}
            <View style={{ marginTop: spacing.md, gap: spacing.xs }}>
              <Text
                style={{
                  color: colors.textMuted,
                  fontSize: typography.fontSize.xxs,
                  fontWeight: '800',
                  letterSpacing: 1,
                  textAlign: 'center',
                }}
              >
                — 1-TAP DEMO OPERATOR LOGIN —
              </Text>
              <View style={{ flexDirection: 'row', gap: spacing.xs }}>
                <TouchableOpacity
                  onPress={async () => {
                    setIdentifier('anurag');
                    setPassword('password123');
                    setIsLoading(true);
                    try {
                      const res = await apiLogin({ identifier: 'anurag', password: 'password123' });
                      await setAuth(res.user, res.tokens.accessToken, res.tokens.refreshToken);
                      router.replace('/(tabs)');
                    } catch {
                      // Fallback dev login
                      await setAuth(
                        {
                          id: 'usr_anurag_01',
                          username: 'anurag',
                          displayName: 'Anurag Sahu',
                          email: 'anurag@aadanpradan.io',
                          role: 'USER',
                          status: 'ACTIVE',
                          isActive: true,
                          createdAt: new Date().toISOString(),
                          updatedAt: new Date().toISOString(),
                        },
                        'mock_dev_access_token_1',
                        'mock_dev_refresh_token_1'
                      );
                      router.replace('/(tabs)');
                    } finally {
                      setIsLoading(false);
                    }
                  }}
                  style={{
                    flex: 1,
                    backgroundColor: colors.surfaceElevated,
                    borderColor: colors.primary,
                    borderWidth: 1,
                    borderRadius: radii.md,
                    paddingVertical: 10,
                    alignItems: 'center',
                  }}
                >
                  <Text style={{ color: colors.primary, fontSize: typography.fontSize.xs, fontWeight: '800' }}>
                    OPERATOR 1 (ALPHA)
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={async () => {
                    setIdentifier('bravo');
                    setPassword('password123');
                    setIsLoading(true);
                    try {
                      const res = await apiLogin({ identifier: 'bravo', password: 'password123' });
                      await setAuth(res.user, res.tokens.accessToken, res.tokens.refreshToken);
                      router.replace('/(tabs)');
                    } catch {
                      // Fallback dev login
                      await setAuth(
                        {
                          id: 'usr_bravo_02',
                          username: 'bravo',
                          displayName: 'Operator Bravo',
                          email: 'bravo@aadanpradan.io',
                          role: 'USER',
                          status: 'ACTIVE',
                          isActive: true,
                          createdAt: new Date().toISOString(),
                          updatedAt: new Date().toISOString(),
                        },
                        'mock_dev_access_token_2',
                        'mock_dev_refresh_token_2'
                      );
                      router.replace('/(tabs)');
                    } finally {
                      setIsLoading(false);
                    }
                  }}
                  style={{
                    flex: 1,
                    backgroundColor: colors.surfaceElevated,
                    borderColor: colors.amber,
                    borderWidth: 1,
                    borderRadius: radii.md,
                    paddingVertical: 10,
                    alignItems: 'center',
                  }}
                >
                  <Text style={{ color: colors.amber, fontSize: typography.fontSize.xs, fontWeight: '800' }}>
                    OPERATOR 2 (BRAVO)
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </Card>

          {/* Switch to Register */}
          <View style={{ alignItems: 'center', marginTop: spacing.xl }}>
            <Text style={{ color: colors.textSecondary, fontSize: typography.fontSize.sm }}>
              Don't have an operator account?
            </Text>
            <TouchableOpacity
              onPress={() => {
                hapticFeedback.light();
                router.push('/auth/register');
              }}
              style={{ marginTop: spacing.xs, padding: spacing.xs }}
            >
              <Text style={{ color: colors.primary, fontSize: typography.fontSize.sm, fontWeight: '800' }}>
                Create Account
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
