import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { colors, spacing, fontSize, fontWeight, borderRadius, shadows } from '../../theme';
import { Card } from '../../components';

export const OnboardingFlow = ({ onComplete }) => {
  const [step, setStep] = useState(0);
  const [userData, setUserData] = useState({
    ageRange: null,
    readingLevel: null,
    goals: [],
  });

  const steps = [
    {
      emoji: '👋',
      title: 'welcome to readrise!',
      subtitle: 'your reading adventure starts here',
      content: WelcomeStep,
    },
    {
      emoji: '🎂',
      title: 'how old are you?',
      subtitle: 'this helps us recommend the right books',
      content: AgeStep,
    },
    {
      emoji: '📚',
      title: 'reading level',
      subtitle: 'choose what feels comfortable',
      content: ReadingLevelStep,
    },
    {
      emoji: '🎯',
      title: 'your goals',
      subtitle: 'what would you like to achieve?',
      content: GoalsStep,
    },
  ];

  const currentStepData = steps[step];

  const handleNext = () => {
    if (step < steps.length - 1) {
      setStep(step + 1);
    } else {
      onComplete(userData);
    }
  };

  const handleBack = () => {
    if (step > 0) {
      setStep(step - 1);
    }
  };

  const canProceed = () => {
    if (step === 0) return true;
    if (step === 1) return userData.ageRange !== null;
    if (step === 2) return userData.readingLevel !== null;
    if (step === 3) return userData.goals.length > 0;
    return false;
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        {/* Decorative Circle */}
        <View style={styles.decorativeCircle} />
        
        <View style={styles.emojiContainer}>
          <View style={styles.emojiCircle}>
            <Text style={styles.emoji}>{currentStepData.emoji}</Text>
          </View>
        </View>
        <Text style={styles.title}>{currentStepData.title}</Text>
        <Text style={styles.subtitle}>{currentStepData.subtitle}</Text>

        {/* Progress dots */}
        <View style={styles.dotsContainer}>
          {steps.map((_, index) => (
            <View
              key={index}
              style={[
                styles.dot,
                index === step && styles.dotActive,
                index < step && styles.dotCompleted,
              ]}
            />
          ))}
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {React.createElement(currentStepData.content, {
          userData,
          setUserData,
        })}
      </ScrollView>

      <View style={styles.footer}>
        {step > 0 && (
          <TouchableOpacity
            style={styles.backButton}
            onPress={handleBack}
            activeOpacity={0.8}
          >
            <Text style={styles.backButtonText}>back</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={[
            styles.nextButton,
            !canProceed() && styles.nextButtonDisabled,
          ]}
          onPress={handleNext}
          disabled={!canProceed()}
          activeOpacity={0.8}
        >
          <Text style={styles.nextButtonText}>
            {step === steps.length - 1 ? "let's go!" : 'next'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

// Step 1: Welcome
const WelcomeStep = () => (
  <View style={styles.stepContainer}>
    <View style={styles.welcomeFeatures}>
      <FeatureItem emoji="📖" text="read amazing stories" color={colors.accent} />
      <FeatureItem emoji="🎤" text="practice reading aloud" color={colors.secondary} />
      <FeatureItem emoji="🏆" text="earn achievements" color={colors.tertiary} />
      <FeatureItem emoji="🌟" text="level up your skills" color={colors.quaternary} />
    </View>
    <Card style={styles.tipCard}>
      <View style={styles.tipIconCircle}>
        <Text style={styles.tipIcon}>💡</Text>
      </View>
      <Text style={styles.tipTitle}>did you know?</Text>
      <Text style={styles.tipText}>
        reading just 20 minutes a day can expose you to over 1.8 million words a year!
      </Text>
    </Card>
  </View>
);

const FeatureItem = ({ emoji, text, color }) => (
  <View style={styles.featureItem}>
    <View style={[styles.featureIconCircle, { backgroundColor: color }]}>
      <Text style={styles.featureEmoji}>{emoji}</Text>
    </View>
    <Text style={styles.featureText}>{text}</Text>
  </View>
);

// Step 2: Age selection
const AgeStep = ({ userData, setUserData }) => {
  const ageRanges = [
    { label: '8-10 years', value: '8-10', emoji: '🧒', color: colors.accent },
    { label: '11-14 years', value: '11-14', emoji: '🧑', color: colors.secondary },
    { label: '15+ years', value: '15+', emoji: '👤', color: colors.tertiary },
  ];

  return (
    <View style={styles.stepContainer}>
      {ageRanges.map((range) => (
        <TouchableOpacity
          key={range.value}
          style={[
            styles.optionCard,
            userData.ageRange === range.value && styles.optionCardSelected,
            { borderColor: range.color },
            userData.ageRange === range.value && { borderColor: colors.foreground },
          ]}
          onPress={() => setUserData({ ...userData, ageRange: range.value })}
          activeOpacity={0.8}
        >
          <View style={[styles.optionIconCircle, { backgroundColor: range.color }]}>
            <Text style={styles.optionEmoji}>{range.emoji}</Text>
          </View>
          <Text style={styles.optionLabel}>{range.label}</Text>
          {userData.ageRange === range.value && (
            <View style={styles.checkmark}>
              <Text style={styles.checkmarkText}>✓</Text>
            </View>
          )}
        </TouchableOpacity>
      ))}
    </View>
  );
};

// Step 3: Reading level
const ReadingLevelStep = ({ userData, setUserData }) => {
  const levels = [
    { label: 'beginner', value: 'beginner', emoji: '🌱', description: 'just starting out', color: colors.quaternary },
    { label: 'intermediate', value: 'intermediate', emoji: '🌿', description: 'getting confident', color: colors.tertiary },
    { label: 'advanced', value: 'advanced', emoji: '🌳', description: 'ready for challenges', color: colors.accent },
  ];

  return (
    <View style={styles.stepContainer}>
      {levels.map((level) => (
        <TouchableOpacity
          key={level.value}
          style={[
            styles.optionCard,
            userData.readingLevel === level.value && styles.optionCardSelected,
            { borderColor: level.color },
            userData.readingLevel === level.value && { borderColor: colors.foreground },
          ]}
          onPress={() => setUserData({ ...userData, readingLevel: level.value })}
          activeOpacity={0.8}
        >
          <View style={[styles.optionIconCircle, { backgroundColor: level.color }]}>
            <Text style={styles.optionEmoji}>{level.emoji}</Text>
          </View>
          <View style={styles.optionTextContainer}>
            <Text style={styles.optionLabel}>{level.label}</Text>
            <Text style={styles.optionDescription}>{level.description}</Text>
          </View>
          {userData.readingLevel === level.value && (
            <View style={styles.checkmark}>
              <Text style={styles.checkmarkText}>✓</Text>
            </View>
          )}
        </TouchableOpacity>
      ))}
    </View>
  );
};

// Step 4: Goals
const GoalsStep = ({ userData, setUserData }) => {
  const goals = [
    { label: 'read more fluently', value: 'fluency', emoji: '🎯', color: colors.accent },
    { label: 'build confidence', value: 'confidence', emoji: '💪', color: colors.secondary },
    { label: 'discover new books', value: 'discovery', emoji: '🗺️', color: colors.tertiary },
    { label: 'have fun reading', value: 'fun', emoji: '🎉', color: colors.quaternary },
  ];

  const toggleGoal = (value) => {
    const currentGoals = userData.goals || [];
    if (currentGoals.includes(value)) {
      setUserData({ ...userData, goals: currentGoals.filter(g => g !== value) });
    } else {
      setUserData({ ...userData, goals: [...currentGoals, value] });
    }
  };

  return (
    <View style={styles.stepContainer}>
      <Text style={styles.helperText}>select all that apply</Text>
      {goals.map((goal) => (
        <TouchableOpacity
          key={goal.value}
          style={[
            styles.optionCard,
            userData.goals?.includes(goal.value) && styles.optionCardSelected,
            { borderColor: goal.color },
            userData.goals?.includes(goal.value) && { borderColor: colors.foreground },
          ]}
          onPress={() => toggleGoal(goal.value)}
          activeOpacity={0.8}
        >
          <View style={[styles.optionIconCircle, { backgroundColor: goal.color }]}>
            <Text style={styles.optionEmoji}>{goal.emoji}</Text>
          </View>
          <Text style={styles.optionLabel}>{goal.label}</Text>
          {userData.goals?.includes(goal.value) && (
            <View style={styles.checkmark}>
              <Text style={styles.checkmarkText}>✓</Text>
            </View>
          )}
        </TouchableOpacity>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    position: 'relative',
    paddingTop: spacing.xxl * 1.5,
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.lg,
    alignItems: 'center',
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
    right: -50,
  },
  emojiContainer: {
    marginBottom: spacing.md,
    zIndex: 1,
  },
  emojiCircle: {
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
  emoji: {
    fontSize: 48,
  },
  title: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.extraBold,
    color: colors.foreground,
    textAlign: 'center',
    marginBottom: spacing.xs,
    textTransform: 'lowercase',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: fontSize.md,
    color: colors.mutedForeground,
    textAlign: 'center',
    marginBottom: spacing.lg,
    textTransform: 'lowercase',
  },
  dotsContainer: {
    flexDirection: 'row',
    gap: spacing.sm,
    zIndex: 1,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.border,
    borderWidth: 2,
    borderColor: colors.foreground,
  },
  dotActive: {
    backgroundColor: colors.accent,
    width: 32,
    borderColor: colors.foreground,
  },
  dotCompleted: {
    backgroundColor: colors.quaternary,
    borderColor: colors.foreground,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.xl,
  },
  stepContainer: {
    paddingBottom: spacing.xl,
  },
  welcomeFeatures: {
    marginBottom: spacing.lg,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.md,
    borderWidth: 2,
    borderColor: colors.border,
  },
  featureIconCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
    borderWidth: 2,
    borderColor: colors.foreground,
    ...shadows.hard,
  },
  featureEmoji: {
    fontSize: 24,
  },
  featureText: {
    fontSize: fontSize.md,
    color: colors.foreground,
    fontWeight: fontWeight.medium,
    textTransform: 'lowercase',
    flex: 1,
  },
  tipCard: {
    borderWidth: 2,
    borderColor: colors.foreground,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.card,
    padding: spacing.lg,
    ...shadows.card,
    position: 'relative',
  },
  tipIconCircle: {
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
  tipIcon: {
    fontSize: 24,
  },
  tipTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.extraBold,
    color: colors.foreground,
    marginBottom: spacing.sm,
    marginTop: spacing.sm,
    textTransform: 'lowercase',
  },
  tipText: {
    fontSize: fontSize.sm,
    color: colors.mutedForeground,
    lineHeight: 20,
    textTransform: 'lowercase',
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 2,
    ...shadows.card,
  },
  optionCardSelected: {
    borderColor: colors.foreground,
    backgroundColor: colors.card,
  },
  optionIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
    borderWidth: 2,
    borderColor: colors.foreground,
    ...shadows.hard,
  },
  optionEmoji: {
    fontSize: 32,
  },
  optionTextContainer: {
    flex: 1,
  },
  optionLabel: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.foreground,
    textTransform: 'lowercase',
  },
  optionDescription: {
    fontSize: fontSize.sm,
    color: colors.mutedForeground,
    marginTop: spacing.xs,
    textTransform: 'lowercase',
  },
  checkmark: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.accent,
    borderWidth: 2,
    borderColor: colors.foreground,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.hard,
  },
  checkmarkText: {
    color: colors.accentForeground,
    fontSize: fontSize.md,
    fontWeight: fontWeight.extraBold,
  },
  helperText: {
    fontSize: fontSize.sm,
    color: colors.mutedForeground,
    marginBottom: spacing.md,
    textAlign: 'center',
    textTransform: 'lowercase',
    fontWeight: fontWeight.medium,
  },
  footer: {
    flexDirection: 'row',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
    backgroundColor: colors.card,
    borderTopWidth: 2,
    borderTopColor: colors.foreground,
    gap: spacing.md,
  },
  backButton: {
    flex: 1,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.full,
    borderWidth: 2,
    borderColor: colors.foreground,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backButtonText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.foreground,
    textTransform: 'lowercase',
  },
  nextButton: {
    flex: 2,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.full,
    borderWidth: 2,
    borderColor: colors.foreground,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.hard,
  },
  nextButtonDisabled: {
    opacity: 0.5,
    ...shadows.hardPress,
  },
  nextButtonText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.accentForeground,
    textTransform: 'lowercase',
  },
});

export default OnboardingFlow;