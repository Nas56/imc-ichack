import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { ref, onValue } from 'firebase/database';
import { db } from '../../../firebaseConfig';
import { colors, spacing, fontSize, fontWeight, borderRadius, shadows } from '../../theme';
import { Button, Card, ProgressBar } from '../../components';
import { getLevelInfo, getLevelMessage } from '../../services/levelingService';
import LearnModeScreen from '../learn/LearnModeScreen';
import ChallengeModeScreen from '../challenge/ChallengeModeScreen';

const { width } = Dimensions.get('window');

export const HomeScreen = ({ user, onLogout }) => {
  const [currentScreen, setCurrentScreen] = useState('home'); // 'home', 'learn', or 'challenge'
  const [userData, setUserData] = useState({
    xp: 0,
    level: 1,
    awards: [],
    currentBook: null,
  });

  useEffect(() => {
    if (user) {
      const userRef = ref(db, 'users/' + user.uid);
      const unsubscribe = onValue(userRef, (snapshot) => {
        const data = snapshot.val();
        if (data) {
          setUserData({
            xp: data.xp || 0,
            level: data.level || 1,
            awards: data.awards || [],
            currentBook: data.currentBook || null,
          });
        }
      });

      return () => unsubscribe();
    }
  }, [user]);

  const levelInfo = getLevelInfo(userData.xp);
  const levelMessage = getLevelMessage(levelInfo.level);

  if (currentScreen === 'learn') {
    return (
      <LearnModeScreen onBack={() => setCurrentScreen('home')} user={user} />
    );
  }

  // Show Challenge Mode screen if selected
  if (currentScreen === 'challenge') {
    console.log('Rendering ChallengeModeScreen');
    return (
      <ChallengeModeScreen onBack={() => setCurrentScreen('home')} />
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Hero Header with Playful Geometric Design */}
        <View style={styles.heroSection}>
          {/* Decorative Yellow Circle */}
          <View style={styles.decorativeCircle} />
          
          <View style={styles.header}>
            <View style={styles.titleContainer}>
              <Text style={styles.title}>readrise.</Text>
              <Text style={styles.subheading}>your reading journey starts here</Text>
            </View>
            <TouchableOpacity 
              onPress={onLogout} 
              style={styles.logoutButton}
              activeOpacity={0.7}
            >
              <Text style={styles.logoutText}>Logout</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Level Progress Card - Sticker Style */}
        <View style={styles.cardContainer}>
          <Card style={styles.tierCard}>
            {/* Floating Icon Circle */}
            <View style={styles.floatingIcon}>
              <Text style={styles.iconEmoji}>⭐</Text>
            </View>
            
            <View style={styles.tierHeader}>
              <View style={styles.tierInfo}>
                <Text style={styles.tierLabel}>your level</Text>
                <View style={styles.tierNameContainer}>
                  <Text style={styles.tierName}>Level {levelInfo.level}</Text>
                </View>
                <Text style={styles.levelMessage}>{levelMessage}</Text>
              </View>
              <View style={styles.scoreContainer}>
                <Text style={styles.scoreLabel}>total xp</Text>
                <Text style={styles.scoreValue}>{userData.xp}</Text>
              </View>
            </View>

            <ProgressBar
              progress={levelInfo.progressPercent}
              height={20}
              color={colors.accent}
            />

            <Text style={styles.nextTierText}>
              {levelInfo.xpToNextLevel} xp to level {levelInfo.level + 1}
            </Text>
          </Card>
        </View>

        {/* Mode Selection - Playful Cards */}
        <View style={styles.modesSection}>
          <Text style={styles.sectionTitle}>🎮 choose your mode</Text>
          <View style={styles.modesGrid}>
            <ModeCard
              emoji="📚"
              title="learn mode"
              description="practice reading with helpful feedback"
              color={colors.accent}
              onPress={() => setCurrentScreen('learn')}
            />
            <ModeCard
              emoji="⚔️"
              title="challenge mode"
              description="test your skills and earn rewards"
              color={colors.tertiary}
              onPress={() => {
                console.log('Challenge Mode clicked!');
                setCurrentScreen('challenge');
              }}
              locked={levelInfo.level < 5}
            />
          </View>
        </View>

        {/* Continue Reading Card */}
        {userData.currentBook ? (
          <View style={styles.cardContainer}>
            <Card style={styles.continueCard}>
              <Text style={styles.sectionTitle}>📖 continue reading</Text>
              <View style={styles.bookPreview}>
                <View style={styles.bookCover}>
                  <Text style={styles.bookCoverEmoji}>📕</Text>
                </View>
                <View style={styles.bookInfo}>
                  <Text style={styles.bookTitle}>{userData.currentBook.title}</Text>
                  <Text style={styles.bookProgress}>
                    chapter {userData.currentBook.currentChapter} of {userData.currentBook.totalChapters}
                  </Text>
                  <ProgressBar
                    progress={userData.currentBook.currentChapter / userData.currentBook.totalChapters}
                    height={8}
                    color={colors.secondary}
                  />
                </View>
              </View>
              <TouchableOpacity
                style={styles.pillButton}
                onPress={() => {}}
                activeOpacity={0.8}
              >
                <Text style={styles.pillButtonText}>continue reading</Text>
              </TouchableOpacity>
            </Card>
          </View>
        ) : (
          <View style={styles.cardContainer}>
            <Card style={styles.continueCard}>
              <Text style={styles.sectionTitle}>🎯 start your journey</Text>
              <Text style={styles.emptyText}>
                no book in progress yet.{'\n'}browse the library to get started!
              </Text>
              <TouchableOpacity
                style={[styles.pillButton, styles.pillButtonPrimary]}
                onPress={() => {}}
                activeOpacity={0.8}
              >
                <Text style={[styles.pillButtonText, styles.pillButtonTextPrimary]}>browse books</Text>
              </TouchableOpacity>
            </Card>
          </View>
        )}

        {/* Awards Preview */}
        {userData.awards.length > 0 && (
          <View style={styles.cardContainer}>
            <Card style={styles.awardsCard}>
              <View style={styles.awardsHeader}>
                <Text style={styles.sectionTitle}>🏆 recent awards</Text>
                <TouchableOpacity>
                  <Text style={styles.seeAllText}>see all</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.awardsGrid}>
                {userData.awards.slice(0, 4).map((award, index) => (
                  <View key={index} style={styles.awardBadge}>
                    <Text style={styles.awardEmoji}>{award.emoji || '🏅'}</Text>
                  </View>
                ))}
                {userData.awards.length > 4 && (
                  <View style={styles.awardBadge}>
                    <Text style={styles.awardMore}>+{userData.awards.length - 4}</Text>
                  </View>
                )}
              </View>
            </Card>
          </View>
        )}

        {/* Quick Stats - Geometric Style */}
        <View style={styles.statsGrid}>
          <StatCard
            emoji="🔥"
            value="0"
            label="day streak"
            color={colors.secondary}
          />
          <StatCard
            emoji="📚"
            value="0"
            label="books read"
            color={colors.tertiary}
          />
          <StatCard
            emoji="⭐"
            value="0"
            label="chapters"
            color={colors.quaternary}
          />
        </View>
      </ScrollView>
    </View>
  );
};

const ModeCard = ({ emoji, title, description, color, onPress, locked = false }) => {
  const [pressed, setPressed] = React.useState(false);
  
  return (
    <TouchableOpacity
      style={[
        styles.modeCard,
        { borderColor: color },
        locked && styles.modeCardLocked,
        pressed && !locked && styles.modeCardPressed,
      ]}
      onPress={onPress}
      disabled={locked}
      activeOpacity={0.9}
      onPressIn={() => setPressed(true)}
      onPressOut={() => setPressed(false)}
    >
      <View style={[
        styles.modeIconCircle, 
        { backgroundColor: color },
        locked && styles.modeIconCircleLocked,
      ]}>
        {locked ? (
          <View style={styles.lockIconCircle}>
            <Text style={styles.lockIcon}>🔒</Text>
          </View>
        ) : (
          <Text style={styles.modeEmoji}>{emoji}</Text>
        )}
      </View>
      <Text style={[styles.modeTitle, locked && styles.modeTitleLocked]}>{title}</Text>
      <Text style={styles.modeDescription}>
        {locked ? 'unlock at level 5' : description}
      </Text>
      {locked && (
        <View style={styles.lockBadge}>
          <Text style={styles.lockBadgeText}>locked</Text>
        </View>
      )}
    </TouchableOpacity>
  );
};

const StatCard = ({ emoji, value, label, color }) => (
  <Card style={styles.statCard} padding="small">
    <View style={[styles.statIconCircle, { backgroundColor: color }]}>
      <Text style={styles.statEmoji}>{emoji}</Text>
    </View>
    <Text style={styles.statValue}>{value}</Text>
    <Text style={styles.statLabel}>{label}</Text>
  </Card>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: spacing.xxl,
  },
  
  // Hero Section
  heroSection: {
    position: 'relative',
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xxl * 1.5,
    paddingBottom: spacing.lg,
    overflow: 'hidden',
  },
  decorativeCircle: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: colors.tertiary,
    opacity: 0.15,
    top: -50,
    left: -50,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    zIndex: 1,
  },
  titleContainer: {
    flex: 1,
  },
  title: {
    fontSize: fontSize.xxxl,
    fontWeight: fontWeight.extraBold,
    color: colors.foreground,
    letterSpacing: -1,
    marginBottom: spacing.xs,
  },
  subheading: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.regular,
    color: colors.mutedForeground,
    textTransform: 'lowercase',
  },
  logoutButton: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.card,
    borderRadius: borderRadius.full,
    borderWidth: 2,
    borderColor: colors.foreground,
    ...shadows.hard,
  },
  logoutText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    color: colors.foreground,
    textTransform: 'lowercase',
  },

  // Card Container
  cardContainer: {
    paddingHorizontal: spacing.xl,
    marginBottom: spacing.lg,
  },

  // Tier Card - Sticker Style
  tierCard: {
    borderWidth: 2,
    borderColor: colors.foreground,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.card,
    padding: spacing.lg,
    ...shadows.card,
    position: 'relative',
  },
  floatingIcon: {
    position: 'absolute',
    top: -20,
    right: spacing.lg,
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: colors.tertiary,
    borderWidth: 2,
    borderColor: colors.foreground,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
    ...shadows.hard,
  },
  iconEmoji: {
    fontSize: 24,
  },
  tierHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
    marginTop: spacing.sm,
  },
  tierInfo: {
    flex: 1,
  },
  tierLabel: {
    fontSize: fontSize.xs,
    color: colors.mutedForeground,
    marginBottom: spacing.xs,
    textTransform: 'uppercase',
    fontWeight: fontWeight.bold,
    letterSpacing: 1,
  },
  tierNameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  tierName: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.extraBold,
    color: colors.foreground,
  },
  levelMessage: {
    fontSize: fontSize.sm,
    color: colors.mutedForeground,
    textTransform: 'lowercase',
  },
  scoreContainer: {
    alignItems: 'flex-end',
  },
  scoreLabel: {
    fontSize: fontSize.xs,
    color: colors.mutedForeground,
    marginBottom: spacing.xs,
    textTransform: 'uppercase',
    fontWeight: fontWeight.bold,
    letterSpacing: 1,
  },
  scoreValue: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.extraBold,
    color: colors.accent,
  },
  nextTierText: {
    fontSize: fontSize.xs,
    color: colors.mutedForeground,
    marginTop: spacing.sm,
    textAlign: 'center',
    textTransform: 'lowercase',
  },

  // Continue Reading Card
  continueCard: {
    borderWidth: 2,
    borderColor: colors.foreground,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.card,
    padding: spacing.lg,
    ...shadows.card,
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.extraBold,
    color: colors.foreground,
    marginBottom: spacing.sm,
    textTransform: 'lowercase',
  },
  bookPreview: {
    flexDirection: 'row',
    marginBottom: spacing.sm,
  },
  bookCover: {
    width: 80,
    height: 100,
    backgroundColor: colors.tertiary,
    borderRadius: borderRadius.md,
    borderWidth: 2,
    borderColor: colors.foreground,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
    ...shadows.hard,
  },
  bookCoverEmoji: {
    fontSize: 40,
  },
  bookInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  bookTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.foreground,
    marginBottom: spacing.xs,
  },
  bookProgress: {
    fontSize: fontSize.sm,
    color: colors.mutedForeground,
    marginBottom: spacing.xs,
    textTransform: 'lowercase',
  },
  emptyText: {
    fontSize: fontSize.md,
    color: colors.mutedForeground,
    textAlign: 'center',
    marginVertical: spacing.sm,
    lineHeight: 22,
    textTransform: 'lowercase',
  },

  // Pill Buttons
  pillButton: {
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.xl,
    borderRadius: borderRadius.full,
    borderWidth: 2,
    borderColor: colors.foreground,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.xs,
  },
  pillButtonPrimary: {
    backgroundColor: colors.accent,
    borderColor: colors.foreground,
    ...shadows.hard,
  },
  pillButtonText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.foreground,
    textTransform: 'lowercase',
  },
  pillButtonTextPrimary: {
    color: colors.accentForeground,
  },

  // Modes Section
  modesSection: {
    paddingHorizontal: spacing.xl,
    marginBottom: spacing.lg,
  },
  modesGrid: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  modeCard: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    borderWidth: 2,
    alignItems: 'center',
    ...shadows.card,
    position: 'relative',
  },
  modeCardLocked: {
    opacity: 0.7,
    borderColor: colors.border,
  },
  modeCardPressed: {
    transform: [{ scale: 0.98 }],
    ...shadows.hardPress,
  },
  modeIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
    borderWidth: 2,
    borderColor: colors.foreground,
    ...shadows.hard,
  },
  modeIconCircleLocked: {
    backgroundColor: colors.muted,
    borderColor: colors.border,
  },
  lockIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.card,
    borderWidth: 2,
    borderColor: colors.foreground,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.hard,
  },
  lockIcon: {
    fontSize: 20,
  },
  modeEmoji: {
    fontSize: 32,
  },
  modeTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.extraBold,
    color: colors.foreground,
    marginBottom: spacing.xs,
    textAlign: 'center',
    textTransform: 'lowercase',
  },
  modeDescription: {
    fontSize: fontSize.xs,
    color: colors.mutedForeground,
    textAlign: 'center',
    textTransform: 'lowercase',
  },
  modeTitleLocked: {
    opacity: 0.6,
  },
  lockBadge: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    backgroundColor: colors.tertiary,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    borderWidth: 2,
    borderColor: colors.foreground,
    ...shadows.hard,
  },
  lockBadgeText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.extraBold,
    color: colors.foreground,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  // Awards
  awardsCard: {
    borderWidth: 2,
    borderColor: colors.foreground,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.card,
    padding: spacing.lg,
    ...shadows.card,
  },
  awardsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  seeAllText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    color: colors.accent,
    textTransform: 'lowercase',
  },
  awardsGrid: {
    flexDirection: 'row',
    gap: spacing.md,
    flexWrap: 'wrap',
  },
  awardBadge: {
    width: 60,
    height: 60,
    backgroundColor: colors.quaternary,
    borderRadius: borderRadius.md,
    borderWidth: 2,
    borderColor: colors.foreground,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.hard,
  },
  awardEmoji: {
    fontSize: 32,
  },
  awardMore: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.extraBold,
    color: colors.foreground,
  },

  // Stats Grid
  statsGrid: {
    flexDirection: 'row',
    paddingHorizontal: spacing.xl,
    gap: spacing.md,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.foreground,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.card,
    padding: spacing.md,
    ...shadows.card,
  },
  statIconCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
    borderWidth: 2,
    borderColor: colors.foreground,
    ...shadows.hard,
  },
  statEmoji: {
    fontSize: 24,
  },
  statValue: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.extraBold,
    color: colors.foreground,
    marginBottom: spacing.xs,
  },
  statLabel: {
    fontSize: fontSize.xs,
    color: colors.mutedForeground,
    textAlign: 'center',
    textTransform: 'lowercase',
    fontWeight: fontWeight.medium,
  },
});

export default HomeScreen;