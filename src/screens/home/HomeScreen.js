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
import { colors, spacing, fontSize, fontWeight, borderRadius, shadows, getTierByScore, getTierProgress } from '../../theme';
import { Button, Card, ProgressBar } from '../../components';

const { width } = Dimensions.get('window');

export const HomeScreen = ({ user, onLogout }) => {
  const [userData, setUserData] = useState({
    totalScore: 0,
    currentTier: 'Seedling',
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
            totalScore: data.totalScore || 0,
            currentTier: data.currentTier || 'Seedling',
            awards: data.awards || [],
            currentBook: data.currentBook || null,
          });
        }
      });

      return () => unsubscribe();
    }
  }, [user]);

  const currentTier = getTierByScore(userData.totalScore);
  const { progress, nextTierScore } = getTierProgress(userData.totalScore);

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Hello, Reader!</Text>
            <Text style={styles.email}>{user.email}</Text>
          </View>
          <TouchableOpacity onPress={onLogout} style={styles.logoutButton}>
            <Text style={styles.logoutText}>Logout</Text>
          </TouchableOpacity>
        </View>

        {/* Tier Progress Card */}
        <Card style={styles.tierCard} variant="primary">
          <View style={styles.tierHeader}>
            <View>
              <Text style={styles.tierLabel}>Current Tier</Text>
              <View style={styles.tierNameContainer}>
                <Text style={styles.tierEmoji}>{currentTier.emoji}</Text>
                <Text style={styles.tierName}>{currentTier.name}</Text>
              </View>
            </View>
            <View style={styles.scoreContainer}>
              <Text style={styles.scoreLabel}>Total Score</Text>
              <Text style={styles.scoreValue}>{userData.totalScore}</Text>
            </View>
          </View>

          <ProgressBar
            progress={progress}
            height={16}
            color={currentTier.color}
          />

          {nextTierScore && (
            <Text style={styles.nextTierText}>
              {nextTierScore - userData.totalScore} points to next tier
            </Text>
          )}
        </Card>

        {/* Continue Reading Card */}
        {userData.currentBook ? (
          <Card style={styles.continueCard}>
            <Text style={styles.sectionTitle}>📖 Continue Reading</Text>
            <View style={styles.bookPreview}>
              <View style={styles.bookCover}>
                <Text style={styles.bookCoverEmoji}>📕</Text>
              </View>
              <View style={styles.bookInfo}>
                <Text style={styles.bookTitle}>{userData.currentBook.title}</Text>
                <Text style={styles.bookProgress}>
                  Chapter {userData.currentBook.currentChapter} of {userData.currentBook.totalChapters}
                </Text>
                <ProgressBar
                  progress={userData.currentBook.currentChapter / userData.currentBook.totalChapters}
                  height={6}
                  color={colors.secondary}
                />
              </View>
            </View>
            <Button
              title="Continue Reading"
              variant="secondary"
              size="medium"
              onPress={() => {}}
              style={styles.continueButton}
            />
          </Card>
        ) : (
          <Card style={styles.continueCard}>
            <Text style={styles.sectionTitle}>🎯 Start Your Journey</Text>
            <Text style={styles.emptyText}>
              No book in progress yet.{'\n'}Browse the library to get started!
            </Text>
            <Button
              title="Browse Books"
              variant="primary"
              size="medium"
              onPress={() => {}}
              style={styles.continueButton}
            />
          </Card>
        )}

        {/* Mode Selection */}
        <View style={styles.modesSection}>
          <Text style={styles.sectionTitle}>🎮 Choose Your Mode</Text>
          <View style={styles.modesGrid}>
            <ModeCard
              emoji="📚"
              title="Learn Mode"
              description="Practice reading with helpful feedback"
              color={colors.primary}
              onPress={() => {}}
            />
            <ModeCard
              emoji="⚔️"
              title="Challenge Mode"
              description="Test your skills and earn rewards"
              color={colors.accent}
              onPress={() => {}}
              locked={userData.totalScore < 100}
            />
          </View>
        </View>

        {/* Awards Preview */}
        {userData.awards.length > 0 && (
          <Card style={styles.awardsCard}>
            <View style={styles.awardsHeader}>
              <Text style={styles.sectionTitle}>🏆 Recent Awards</Text>
              <TouchableOpacity>
                <Text style={styles.seeAllText}>See All</Text>
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
        )}

        {/* Quick Stats */}
        <View style={styles.statsGrid}>
          <StatCard
            emoji="🔥"
            value="0"
            label="Day Streak"
          />
          <StatCard
            emoji="📚"
            value="0"
            label="Books Read"
          />
          <StatCard
            emoji="⭐"
            value="0"
            label="Chapters"
          />
        </View>
      </ScrollView>
    </View>
  );
};

const ModeCard = ({ emoji, title, description, color, onPress, locked = false }) => (
  <TouchableOpacity
    style={[styles.modeCard, { borderColor: color }]}
    onPress={onPress}
    disabled={locked}
    activeOpacity={0.7}
  >
    {locked && (
      <View style={styles.lockedOverlay}>
        <Text style={styles.lockIcon}>🔒</Text>
      </View>
    )}
    <Text style={styles.modeEmoji}>{emoji}</Text>
    <Text style={styles.modeTitle}>{title}</Text>
    <Text style={styles.modeDescription}>{description}</Text>
  </TouchableOpacity>
);

const StatCard = ({ emoji, value, label }) => (
  <Card style={styles.statCard} padding="small">
    <Text style={styles.statEmoji}>{emoji}</Text>
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xxl * 1.5,
    paddingBottom: spacing.lg,
  },
  greeting: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  email: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  logoutButton: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    ...shadows.small,
  },
  logoutText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.error,
  },

  // Tier Card
  tierCard: {
    marginHorizontal: spacing.xl,
    marginBottom: spacing.lg,
  },
  tierHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  tierLabel: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    marginBottom: spacing.xs,
  },
  tierNameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  tierEmoji: {
    fontSize: 28,
    marginRight: spacing.sm,
  },
  tierName: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  scoreContainer: {
    alignItems: 'flex-end',
  },
  scoreLabel: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    marginBottom: spacing.xs,
  },
  scoreValue: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
    color: colors.primary,
  },
  nextTierText: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    marginTop: spacing.sm,
    textAlign: 'center',
  },

  // Continue Reading Card
  continueCard: {
    marginHorizontal: spacing.xl,
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.md,
  },
  bookPreview: {
    flexDirection: 'row',
    marginBottom: spacing.md,
  },
  bookCover: {
    width: 80,
    height: 100,
    backgroundColor: colors.cream,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
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
    color: colors.text,
    marginBottom: spacing.xs,
  },
  bookProgress: {
    fontSize: fontSize.sm,
    color: colors.textLight,
    marginBottom: spacing.sm,
  },
  emptyText: {
    fontSize: fontSize.md,
    color: colors.textLight,
    textAlign: 'center',
    marginVertical: spacing.lg,
    lineHeight: 24,
  },
  continueButton: {
    marginTop: spacing.sm,
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
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    borderWidth: 2,
    alignItems: 'center',
    ...shadows.medium,
  },
  lockedOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lockIcon: {
    fontSize: 32,
  },
  modeEmoji: {
    fontSize: 48,
    marginBottom: spacing.sm,
  },
  modeTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.xs,
    textAlign: 'center',
  },
  modeDescription: {
    fontSize: fontSize.xs,
    color: colors.textLight,
    textAlign: 'center',
  },

  // Awards
  awardsCard: {
    marginHorizontal: spacing.xl,
    marginBottom: spacing.lg,
  },
  awardsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  seeAllText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.primary,
  },
  awardsGrid: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  awardBadge: {
    width: 60,
    height: 60,
    backgroundColor: colors.cream,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  awardEmoji: {
    fontSize: 32,
  },
  awardMore: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.textMuted,
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
  },
  statEmoji: {
    fontSize: 28,
    marginBottom: spacing.xs,
  },
  statValue: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  statLabel: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    textAlign: 'center',
  },
});

export default HomeScreen;
