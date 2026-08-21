import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTheme } from '../../src/theme';
import { AppHeader } from '../../src/components/common/AppHeader';
import { Card } from '../../src/components/common/Card';
import { Button } from '../../src/components/common/Button';
import { Input } from '../../src/components/common/Input';
import { useAuthStore } from '../../src/store/authStore';
import { register as apiRegister } from '../../src/api/authApi';
import { hapticFeedback } from '../../src/utils/haptics';
import { APP_NAME } from '@aadan-pradan/config';

export default function RegisterScreen() {
  const router = useRouter();
  const { colors, typography, spacing, radii } = useTheme();
  const { setAuth } = useAuthStore();

  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{
    displayName?: string;
    username?: string;
    email?: string;
    password?: string;
    confirmPassword?: string;
  }>({});

  const validate = () => {
    const errors: {
      displayName?: string;
      username?: string;
      email?: string;
      password?: string;
      confirmPassword?: string;
    } = {};

    if (!displayName.trim()) {
      errors.displayName = 'Display name is required';
    } else if (displayName.trim().length > 50) {
      errors.displayName = 'Display name cannot exceed 50 characters';
    }

    if (!username.trim()) {
      errors.username = 'Username is required';
    } else if (username.trim().length < 3) {
      errors.username = 'Username must be at least 3 characters';
    } else if (!/^[a-zA-Z0-9_-]+$/.test(username.trim())) {
      errors.username = 'Only letters, numbers, hyphens, and underscores allowed';
    }

    if (!email.trim()) {
      errors.email = 'Email address is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      errors.email = 'Please enter a valid email address';
    }

    if (!password) {
      errors.password = 'Password is required';
    } else if (password.length < 8) {
      errors.password = 'Password must be at least 8 characters';
    }

    if (password !== confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleRegister = async () => {
    setErrorMessage(null);
    if (!validate()) {
      hapticFeedback.warning();
      return;
    }

    setIsLoading(true);
    hapticFeedback.light();

    try {
      const response = await apiRegister({
        displayName: displayName.trim(),
        username: username.trim(),
        email: email.trim(),
        password,
      });

      await setAuth(response.user, response.tokens.accessToken, response.tokens.refreshToken);
      hapticFeedback.success();
      router.replace('/(tabs)');
    } catch (err: any) {
      hapticFeedback.error();
      const msg = err.message || 'Registration failed. Please check your details.';
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
            padding: spacing.lg,
            paddingBottom: spacing.xxl,
          }}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header */}
          <AppHeader
            title="CREATE ACCOUNT"
            showBrand={false}
            onBack={() => router.back()}
          />

          <Card variant="tactical" style={{ padding: spacing.lg, marginTop: spacing.sm }}>
            <Text
              style={{
                color: colors.primary,
                fontSize: typography.fontSize.xxs,
                fontWeight: '800',
                letterSpacing: typography.letterSpacing.tactical,
                marginBottom: spacing.xs,
              }}
            >
              NEW OPERATOR REGISTRATION
            </Text>
            <Text
              style={{
                color: colors.textMuted,
                fontSize: typography.fontSize.xs,
                marginBottom: spacing.md,
              }}
            >
              Create your permanent identity on the {APP_NAME} virtual frequency network.
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
              label="Display Name"
              placeholder="e.g. Anurag Sahu"
              value={displayName}
              onChangeText={(val) => {
                setDisplayName(val);
                if (fieldErrors.displayName) setFieldErrors({ ...fieldErrors, displayName: undefined });
              }}
              error={fieldErrors.displayName}
            />

            <Input
              label="Username / Handle"
              placeholder="e.g. anurag"
              value={username}
              onChangeText={(val) => {
                setUsername(val);
                if (fieldErrors.username) setFieldErrors({ ...fieldErrors, username: undefined });
              }}
              autoCapitalize="none"
              autoCorrect={false}
              helperText="Unique identifier for calling & mentions"
              error={fieldErrors.username}
            />

            <Input
              label="Email Address"
              placeholder="user@example.com"
              value={email}
              onChangeText={(val) => {
                setEmail(val);
                if (fieldErrors.email) setFieldErrors({ ...fieldErrors, email: undefined });
              }}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              error={fieldErrors.email}
            />

            <Input
              label="Password"
              placeholder="Minimum 8 characters"
              value={password}
              onChangeText={(val) => {
                setPassword(val);
                if (fieldErrors.password) setFieldErrors({ ...fieldErrors, password: undefined });
              }}
              secureTextEntry
              autoCapitalize="none"
              error={fieldErrors.password}
            />

            <Input
              label="Confirm Password"
              placeholder="Re-enter your password"
              value={confirmPassword}
              onChangeText={(val) => {
                setConfirmPassword(val);
                if (fieldErrors.confirmPassword) setFieldErrors({ ...fieldErrors, confirmPassword: undefined });
              }}
              secureTextEntry
              autoCapitalize="none"
              error={fieldErrors.confirmPassword}
            />

            <Button
              label={isLoading ? 'CREATING ACCOUNT...' : 'CREATE ACCOUNT'}
              variant="primary"
              size="lg"
              loading={isLoading}
              onPress={handleRegister}
              style={{ marginTop: spacing.sm }}
            />
          </Card>

          {/* Switch to Login */}
          <View style={{ alignItems: 'center', marginTop: spacing.lg }}>
            <Text style={{ color: colors.textSecondary, fontSize: typography.fontSize.sm }}>
              Already registered as an operator?
            </Text>
            <TouchableOpacity
              onPress={() => {
                hapticFeedback.light();
                router.push('/auth/login');
              }}
              style={{ marginTop: spacing.xs, padding: spacing.xs }}
            >
              <Text style={{ color: colors.primary, fontSize: typography.fontSize.sm, fontWeight: '800' }}>
                Log In Instead
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
