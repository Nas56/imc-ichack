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
import { colors, spacing, fontSize, fontWeight, borderRadius, shadows } from '../../theme';
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
        {/* Hero Header with Decorative Elements */}
        <View style={styles.heroSection}>
          {/* Decorative Shapes */}
          <View style={styles.decorativeCircle1} />
          <View style={styles.decorativeCircle2} />
          <View style={styles.decorativeTriangle} />
          
          <View style={styles.header}>
            <View style={styles.logoContainer}>
              <View style={styles.logoCircle}>
                <Text style={styles.logo}>📚</Text>
              </View>
            </View>
            <Text style={styles.appName}>readrise.</Text>
            <Text style={styles.tagline}>your reading adventure awaits</Text>
          </View>
        </View>

        {/* Auth Card - Sticker Style */}
        <View style={styles.cardContainer}>
          <Card style={styles.authCard}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>
                {isLogin ? '👋 welcome back!' : '✨ create account'}
              </Text>
              <Text style={styles.cardSubtitle}>
                {isLogin
                  ? 'continue your reading journey'
                  : 'start your reading adventure today'}
              </Text>
            </View>

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

              <TouchableOpacity
                style={[styles.pillButton, styles.pillButtonPrimary]}
                onPress={isLogin ? handleLogin : handleRegister}
                disabled={loading}
                activeOpacity={0.8}
              >
                <Text style={styles.pillButtonTextPrimary}>
                  {loading ? 'loading...' : isLogin ? 'log in' : 'create account'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity 
                onPress={switchMode} 
                disabled={loading} 
                style={styles.switchButton}
                activeOpacity={0.7}
              >
                <Text style={styles.switchText}>
                  {isLogin ? "don't have an account? " : 'already have an account? '}
                  <Text style={styles.switchTextBold}>
                    {isLogin ? 'sign up' : 'log in'}
                  </Text>
                </Text>
              </TouchableOpacity>
            </View>
          </Card>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};


const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: spacing.lg,
  },
  
  // Hero Section
  heroSection: {
    position: 'relative',
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xxl * 2,
    paddingBottom: spacing.md,
    overflow: 'hidden',
  },
  decorativeCircle1: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: colors.tertiary,
    opacity: 0.2,
    top: -40,
    right: -40,
  },
  decorativeCircle2: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: colors.secondary,
    opacity: 0.15,
    top: 60,
    left: -30,
  },
  decorativeTriangle: {
    position: 'absolute',
    width: 0,
    height: 0,
    borderLeftWidth: 40,
    borderRightWidth: 40,
    borderBottomWidth: 70,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: colors.quaternary,
    opacity: 0.2,
    top: 100,
    right: spacing.xl,
    transform: [{ rotate: '15deg' }],
  },
  header: {
    alignItems: 'center',
    zIndex: 1,
  },
  logoContainer: {
    marginBottom: spacing.sm,
  },
  logoCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: colors.accent,
    borderWidth: 3,
    borderColor: colors.foreground,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.hard,
  },
  logo: {
    fontSize: 48,
  },
  appName: {
    fontSize: fontSize.xxxl,
    fontWeight: fontWeight.extraBold,
    color: colors.foreground,
    marginBottom: spacing.xs,
    letterSpacing: -1,
  },
  tagline: {
    fontSize: fontSize.md,
    color: colors.mutedForeground,
    textAlign: 'center',
    textTransform: 'lowercase',
  },
  
  // Card Container
  cardContainer: {
    paddingHorizontal: spacing.xl,
    marginBottom: spacing.md,
  },
  
  // Auth Card - Sticker Style
  authCard: {
    borderWidth: 2,
    borderColor: colors.foreground,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.card,
    padding: spacing.lg,
    ...shadows.card,
  },
  cardHeader: {
    marginBottom: spacing.sm,
  },
  cardTitle: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.extraBold,
    color: colors.foreground,
    marginBottom: spacing.xs,
    textTransform: 'lowercase',
  },
  cardSubtitle: {
    fontSize: fontSize.sm,
    color: colors.mutedForeground,
    textTransform: 'lowercase',
  },
  form: {
    marginTop: spacing.sm,
  },
  
  // Pill Button
  pillButton: {
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.xl,
    borderRadius: borderRadius.full,
    borderWidth: 2,
    borderColor: colors.foreground,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.sm,
    minHeight: 48,
  },
  pillButtonPrimary: {
    backgroundColor: colors.accent,
    borderColor: colors.foreground,
    ...shadows.hard,
  },
  pillButtonTextPrimary: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.accentForeground,
    textTransform: 'lowercase',
  },
  
  switchButton: {
    marginTop: spacing.md,
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  switchText: {
    fontSize: fontSize.sm,
    color: colors.mutedForeground,
    textTransform: 'lowercase',
  },
  switchTextBold: {
    fontWeight: fontWeight.bold,
    color: colors.accent,
  },
});

export default AuthScreen;