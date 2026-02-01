import React, { useState, useEffect } from 'react';
import { StatusBar, ActivityIndicator, View, StyleSheet } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { onAuthStateChanged } from 'firebase/auth';
import { ref, onValue, set } from 'firebase/database';
import { auth, db } from './firebaseConfig';
import { colors } from './src/theme';
import AuthScreen from './src/screens/auth/AuthScreen';
import OnboardingFlow from './src/screens/onboarding/OnboardingFlow';
import HomeScreen from './src/screens/home/HomeScreen';
import { initializeFirebaseData } from './src/utils/initializeFirebase';

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);
  const [onboardingData, setOnboardingData] = useState(null);

  useEffect(() => {
    // Initialize Firebase data (books, etc.) on first run
    initializeFirebaseData();

    // Listen for auth state changes
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);

        // Check if user has completed onboarding
        const userRef = ref(db, 'users/' + currentUser.uid);
        onValue(userRef, (snapshot) => {
          const userData = snapshot.val();
          if (userData && userData.onboardingCompleted) {
            setNeedsOnboarding(false);
          } else if (userData) {
            setNeedsOnboarding(true);
          }
          setLoading(false);
        }, {
          onlyOnce: true,
        });
      } else {
        setUser(null);
        setNeedsOnboarding(false);
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const handleAuthSuccess = (authenticatedUser, isNewUser = false) => {
    setUser(authenticatedUser);
    if (isNewUser) {
      setNeedsOnboarding(true);
    }
    setLoading(false);
  };

  const handleOnboardingComplete = async (userData) => {
    if (!user) return;

    try {
      // Save onboarding data to database with new leveling system
      const userRef = ref(db, 'users/' + user.uid);
      await set(userRef, {
        email: user.email,
        uid: user.uid,
        createdAt: new Date().toISOString(),
        onboardingCompleted: true,
        ageRange: userData.ageRange,
        readingLevel: userData.readingLevel,
        goals: userData.goals,
        xp: 0,
        level: 1,
        awards: [],
      });

      setOnboardingData(userData);
      setNeedsOnboarding(false);
    } catch (error) {
      console.error('Error saving onboarding data:', error);
    }
  };

  const handleLogout = async () => {
    try {
      await auth.signOut();
      setUser(null);
      setNeedsOnboarding(false);
      setOnboardingData(null);
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  // Show loading screen while checking auth state
  if (loading) {
    return (
      <SafeAreaProvider>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaProvider>
    );
  }

  // Show appropriate screen based on state
  return (
    <SafeAreaProvider>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />
      {!user ? (
        <AuthScreen onAuthSuccess={handleAuthSuccess} />
      ) : needsOnboarding ? (
        <OnboardingFlow onComplete={handleOnboardingComplete} />
      ) : (
        <HomeScreen user={user} onLogout={handleLogout} />
      )}
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
