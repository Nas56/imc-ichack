import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { colors, spacing, fontSize, fontWeight, borderRadius, shadows } from '../../theme';
import { Button, Card } from '../../components';

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
      title: 'Welcome to ReadRise!',
      subtitle: 'Your reading adventure starts here',
      content: WelcomeStep,
    },
    {
      emoji: '🎂',
      title: 'How old are you?',
      subtitle: 'This helps us recommend the right books',
      content: AgeStep,
    },
    {
      emoji: '📚',
      title: 'Reading Level',
      subtitle: 'Choose what feels comfortable',
      content: ReadingLevelStep,
    },
    {
      emoji: '🎯',
      title: 'Your Goals',
      subtitle: 'What would you like to achieve?',
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
        <Text style={styles.emoji}>{currentStepData.emoji}</Text>
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
          <Button
            title="Back"
            variant="ghost"
            size="medium"
            onPress={handleBack}
            style={styles.backButton}
          />
        )}
        <Button
          title={step === steps.length - 1 ? "Let's Go!" : 'Next'}
          variant="primary"
          size="large"
          onPress={handleNext}
          disabled={!canProceed()}
          style={styles.nextButton}
        />
      </View>
    </View>
  );
};

// Step 1: Welcome
const WelcomeStep = () => (
  <View style={styles.stepContainer}>
    <Text style={styles.welcomeText}>
      📖 Read amazing stories{'\n'}
      🎤 Practice reading aloud{'\n'}
      🏆 Earn achievements{'\n'}
      🌟 Level up your skills
    </Text>
    <Card style={styles.tipCard} variant="primary">
      <Text style={styles.tipTitle}>💡 Did you know?</Text>
      <Text style={styles.tipText}>
        Reading just 20 minutes a day can expose you to over 1.8 million words a year!
      </Text>
    </Card>
  </View>
);

// Step 2: Age selection
const AgeStep = ({ userData, setUserData }) => {
  const ageRanges = [
    { label: '8-10 years', value: '8-10', emoji: '🧒' },
    { label: '11-14 years', value: '11-14', emoji: '🧑' },
    { label: '15+ years', value: '15+', emoji: '👤' },
  ];

  return (
    <View style={styles.stepContainer}>
      {ageRanges.map((range) => (
        <TouchableOpacity
          key={range.value}
          style={[
            styles.optionCard,
            userData.ageRange === range.value && styles.optionCardSelected,
          ]}
          onPress={() => setUserData({ ...userData, ageRange: range.value })}
        >
          <Text style={styles.optionEmoji}>{range.emoji}</Text>
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
    { label: 'Beginner', value: 'beginner', emoji: '🌱', description: 'Just starting out' },
    { label: 'Intermediate', value: 'intermediate', emoji: '🌿', description: 'Getting confident' },
    { label: 'Advanced', value: 'advanced', emoji: '🌳', description: 'Ready for challenges' },
  ];

  return (
    <View style={styles.stepContainer}>
      {levels.map((level) => (
        <TouchableOpacity
          key={level.value}
          style={[
            styles.optionCard,
            userData.readingLevel === level.value && styles.optionCardSelected,
          ]}
          onPress={() => setUserData({ ...userData, readingLevel: level.value })}
        >
          <Text style={styles.optionEmoji}>{level.emoji}</Text>
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
    { label: 'Read more fluently', value: 'fluency', emoji: '🎯' },
    { label: 'Build confidence', value: 'confidence', emoji: '💪' },
    { label: 'Discover new books', value: 'discovery', emoji: '🗺️' },
    { label: 'Have fun reading', value: 'fun', emoji: '🎉' },
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
      <Text style={styles.helperText}>Select all that apply</Text>
      {goals.map((goal) => (
        <TouchableOpacity
          key={goal.value}
          style={[
            styles.optionCard,
            userData.goals?.includes(goal.value) && styles.optionCardSelected,
          ]}
          onPress={() => toggleGoal(goal.value)}
        >
          <Text style={styles.optionEmoji}>{goal.emoji}</Text>
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
    paddingTop: spacing.xxl * 2,
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.lg,
    alignItems: 'center',
  },
  emoji: {
    fontSize: 64,
    marginBottom: spacing.md,
  },
  title: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
    color: colors.text,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  subtitle: {
    fontSize: fontSize.md,
    color: colors.textLight,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  dotsContainer: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.border,
  },
  dotActive: {
    backgroundColor: colors.primary,
    width: 24,
  },
  dotCompleted: {
    backgroundColor: colors.success,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.xl,
  },
  stepContainer: {
    paddingBottom: spacing.xl,
  },
  welcomeText: {
    fontSize: fontSize.lg,
    lineHeight: 32,
    color: colors.text,
    marginBottom: spacing.xl,
  },
  tipCard: {
    marginTop: spacing.lg,
  },
  tipTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  tipText: {
    fontSize: fontSize.sm,
    color: colors.textLight,
    lineHeight: 20,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 2,
    borderColor: 'transparent',
    ...shadows.small,
  },
  optionCardSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight + '10',
  },
  optionEmoji: {
    fontSize: 32,
    marginRight: spacing.md,
  },
  optionTextContainer: {
    flex: 1,
  },
  optionLabel: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.medium,
    color: colors.text,
  },
  optionDescription: {
    fontSize: fontSize.sm,
    color: colors.textLight,
    marginTop: spacing.xs,
  },
  checkmark: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkmarkText: {
    color: colors.surface,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
  },
  helperText: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  footer: {
    flexDirection: 'row',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: spacing.md,
  },
  backButton: {
    flex: 1,
  },
  nextButton: {
    flex: 2,
  },
});

export default OnboardingFlow;
