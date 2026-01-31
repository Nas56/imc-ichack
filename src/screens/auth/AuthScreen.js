import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  TouchableOpacity,
} from 'react-native';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { ref, set } from 'firebase/database';
import { auth, db } from '../../../firebaseConfig';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../../theme';
import { Button, Input, Card } from '../../components';

export const AuthScreen = ({ onAuthSuccess }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const validateForm = () => {
    const newErrors = {};

    if (!email) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = 'Email is invalid';
    }

    if (!password) {
      newErrors.password = 'Password is required';
    } else if (password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    if (!isLogin && password !== confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleLogin = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      onAuthSuccess(userCredential.user);
    } catch (error) {
      let errorMessage = 'Login failed';
      if (error.code === 'auth/invalid-credential') {
        errorMessage = 'Invalid email or password';
      } else if (error.code === 'auth/user-not-found') {
        errorMessage = 'No account found with this email';
      } else if (error.code === 'auth/wrong-password') {
        errorMessage = 'Incorrect password';
      }
      Alert.alert('Login Error', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);

      // Store user data in Realtime Database with new leveling system
      await set(ref(db, 'users/' + userCredential.user.uid), {
        email: email,
        createdAt: new Date().toISOString(),
        uid: userCredential.user.uid,
        xp: 0,
        level: 1,
        awards: [],
      });

      onAuthSuccess(userCredential.user, true); // Pass true to indicate new user needs onboarding
    } catch (error) {
      let errorMessage = 'Registration failed';
      if (error.code === 'auth/email-already-in-use') {
        errorMessage = 'This email is already registered';
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = 'Invalid email address';
      } else if (error.code === 'auth/weak-password') {
        errorMessage = 'Password is too weak';
      }
      Alert.alert('Registration Error', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const switchMode = () => {
    setIsLogin(!isLogin);
    setErrors({});
    setPassword('');
    setConfirmPassword('');
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.logo}>📚</Text>
          <Text style={styles.appName}>ReadRise</Text>
          <Text style={styles.tagline}>Your Reading Adventure Awaits</Text>
        </View>

        {/* Auth Card */}
        <Card style={styles.authCard}>
          <Text style={styles.cardTitle}>
            {isLogin ? '👋 Welcome Back!' : '✨ Create Account'}
          </Text>
          <Text style={styles.cardSubtitle}>
            {isLogin
              ? 'Continue your reading journey'
              : 'Start your reading adventure today'}
          </Text>

          <View style={styles.form}>
            <Input
              label="Email"
              value={email}
              onChangeText={(text) => {
                setEmail(text);
                if (errors.email) setErrors({ ...errors, email: null });
              }}
              placeholder="your.email@example.com"
              keyboardType="email-address"
              autoCapitalize="none"
              editable={!loading}
              error={errors.email}
            />

            <Input
              label="Password"
              value={password}
              onChangeText={(text) => {
                setPassword(text);
                if (errors.password) setErrors({ ...errors, password: null });
              }}
              placeholder="Enter your password"
              secureTextEntry
              editable={!loading}
              error={errors.password}
            />

            {!isLogin && (
              <Input
                label="Confirm Password"
                value={confirmPassword}
                onChangeText={(text) => {
                  setConfirmPassword(text);
                  if (errors.confirmPassword) setErrors({ ...errors, confirmPassword: null });
                }}
                placeholder="Confirm your password"
                secureTextEntry
                editable={!loading}
                error={errors.confirmPassword}
              />
            )}

            <Button
              title={isLogin ? 'Log In' : 'Create Account'}
              variant="primary"
              size="large"
              onPress={isLogin ? handleLogin : handleRegister}
              loading={loading}
              style={styles.submitButton}
            />

            <TouchableOpacity onPress={switchMode} disabled={loading} style={styles.switchButton}>
              <Text style={styles.switchText}>
                {isLogin ? "Don't have an account? " : 'Already have an account? '}
                <Text style={styles.switchTextBold}>
                  {isLogin ? 'Sign up' : 'Log in'}
                </Text>
              </Text>
            </TouchableOpacity>
          </View>
        </Card>

        {/* Features Preview */}
        {!isLogin && (
          <View style={styles.features}>
            <FeatureItem emoji="📖" text="Read amazing books" />
            <FeatureItem emoji="🎤" text="Practice reading aloud" />
            <FeatureItem emoji="🏆" text="Earn achievements" />
            <FeatureItem emoji="🌟" text="Track your progress" />
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const FeatureItem = ({ emoji, text }) => (
  <View style={styles.featureItem}>
    <Text style={styles.featureEmoji}>{emoji}</Text>
    <Text style={styles.featureText}>{text}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xxl * 1.5,
    paddingBottom: spacing.xl,
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  logo: {
    fontSize: 64,
    marginBottom: spacing.sm,
  },
  appName: {
    fontSize: fontSize.xxxl,
    fontWeight: fontWeight.extraBold,
    color: colors.primary,
    marginBottom: spacing.xs,
  },
  tagline: {
    fontSize: fontSize.md,
    color: colors.textLight,
    textAlign: 'center',
  },
  authCard: {
    marginBottom: spacing.lg,
  },
  cardTitle: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  cardSubtitle: {
    fontSize: fontSize.sm,
    color: colors.textLight,
    marginBottom: spacing.lg,
  },
  form: {
    marginTop: spacing.md,
  },
  submitButton: {
    marginTop: spacing.md,
  },
  switchButton: {
    marginTop: spacing.lg,
    alignItems: 'center',
  },
  switchText: {
    fontSize: fontSize.sm,
    color: colors.textLight,
  },
  switchTextBold: {
    fontWeight: fontWeight.bold,
    color: colors.primary,
  },
  features: {
    marginTop: spacing.lg,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  featureEmoji: {
    fontSize: 24,
    marginRight: spacing.md,
  },
  featureText: {
    fontSize: fontSize.md,
    color: colors.text,
  },
});

export default AuthScreen;
