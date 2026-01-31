import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  Modal,
  SafeAreaView,
} from 'react-native';
import { Audio } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';
import { ref, update, get } from 'firebase/database';
import { db } from '../../../firebaseConfig';
import { transcribeAudio } from '../../services/deepgramService';
import { calculateXP, addXP, getLevelInfo } from '../../services/levelingService';
import { generatePassage } from '../../services/passageGenerationService';
import { colors, fontSize, fontWeight, spacing, borderRadius, shadows } from '../../theme';
import passagesData from '../../data/passages.json';

const LearnModeScreen = ({ onBack, user }) => {
  const [difficulty, setDifficulty] = useState(null);
  const [currentPassage, setCurrentPassage] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [transcribedText, setTranscribedText] = useState('');
  const [wordStates, setWordStates] = useState([]);
  const [score, setScore] = useState(null);
  const [earnedXP, setEarnedXP] = useState(0);
  const [hasFinished, setHasFinished] = useState(false);
  const [showLevelUp, setShowLevelUp] = useState(false);
  const [levelUpInfo, setLevelUpInfo] = useState(null);

  const recordingRef = useRef(null);
  const audioPermissionRef = useRef(false);

  useEffect(() => {
    requestAudioPermission();
    return () => {
      if (recordingRef.current) {
        stopRecording();
      }
    };
  }, []);

  const requestAudioPermission = async () => {
    try {
      const { status } = await Audio.requestPermissionsAsync();
      audioPermissionRef.current = status === 'granted';
      if (status !== 'granted') {
        Alert.alert(
          'Permission Required',
          'Please grant microphone permissions to use Learn Mode.'
        );
      }
    } catch (error) {
      console.error('Error requesting audio permission:', error);
    }
  };

  const selectDifficulty = (selectedDifficulty) => {
    setDifficulty(selectedDifficulty);
    loadRandomPassage(selectedDifficulty);
  };

  const loadRandomPassage = async (diff) => {
    setIsGenerating(true);
    resetSession();

    try {
      // Try to generate passage using Claude API
      console.log(`Generating ${diff} passage with Claude AI...`);
      const generatedPassage = await generatePassage(diff);
      setCurrentPassage(generatedPassage);
      console.log('✅ Successfully generated passage with Claude AI');
    } catch (error) {
      console.error('Failed to generate passage with Claude AI:', error);
      console.log('Falling back to local passages...');

      // Fallback to local JSON passages
      const passages = passagesData[diff];
      if (passages && passages.length > 0) {
        const randomIndex = Math.floor(Math.random() * passages.length);
        setCurrentPassage(passages[randomIndex]);
        console.log('✅ Loaded passage from local database');
      } else {
        Alert.alert(
          'Error',
          'Failed to load passage. Please try again.'
        );
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const startRecording = async () => {
    try {
      if (!audioPermissionRef.current) {
        await requestAudioPermission();
        if (!audioPermissionRef.current) return;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );

      recordingRef.current = recording;
      setIsRecording(true);
      setTranscribedText('');
      setWordStates([]);
      setScore(null);
      setEarnedXP(0);
      setHasFinished(false);
    } catch (error) {
      console.error('Failed to start recording:', error);
      Alert.alert('Error', 'Failed to start recording. Please try again.');
    }
  };

  const stopRecording = async () => {
    try {
      if (!recordingRef.current) return;

      setIsRecording(false);
      setIsProcessing(true);

      await recordingRef.current.stopAndUnloadAsync();
      const uri = recordingRef.current.getURI();
      recordingRef.current = null;

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
      });

      if (uri) {
        const transcript = await transcribeAudio(uri);
        setTranscribedText(transcript);
        compareTexts(transcript);
      }

      setIsProcessing(false);
    } catch (error) {
      console.error('Failed to stop recording:', error);
      setIsProcessing(false);
      Alert.alert('Error', 'Failed to process recording. Please try again.');
    }
  };

  const compareTexts = async (transcript) => {
    if (!currentPassage) return;

    const normalizeText = (text) =>
      text.toLowerCase()
        .replace(/[.,!?;:]/g, '')
        .split(/\s+/)
        .filter(word => word.length > 0);

    const extractWords = normalizeText(currentPassage.text);
    const transcriptWords = normalizeText(transcript);

    const states = extractWords.map((word, index) => {
      const wasSpoken = transcriptWords.includes(word);
      return {
        word: currentPassage.text.split(/\s+/)[index],
        isCorrect: wasSpoken,
        index,
      };
    });

    setWordStates(states);

    const correctWords = states.filter(state => state.isCorrect).length;
    const totalWords = states.length;
    const percentage = Math.round((correctWords / totalWords) * 100);

    setScore(percentage);

    // Calculate XP earned
    const xp = calculateXP(difficulty, percentage);
    setEarnedXP(xp);

    // Update user's XP in database
    if (user) {
      await updateUserXP(xp);
    }

    setHasFinished(true);
  };

  const updateUserXP = async (xp) => {
    try {
      const userRef = ref(db, 'users/' + user.uid);
      const snapshot = await get(userRef);
      const userData = snapshot.val();

      const currentXP = userData?.xp || 0;
      const { newTotalXP, oldLevel, newLevel, leveledUp } = addXP(currentXP, xp);

      // Update database
      await update(userRef, {
        xp: newTotalXP,
        level: newLevel,
      });

      // Show level up modal if leveled up
      if (leveledUp) {
        setLevelUpInfo({ oldLevel, newLevel });
        setShowLevelUp(true);
      }
    } catch (error) {
      console.error('Error updating XP:', error);
    }
  };

  const resetSession = () => {
    setTranscribedText('');
    setWordStates([]);
    setScore(null);
    setEarnedXP(0);
    setHasFinished(false);
    setIsRecording(false);
    setIsProcessing(false);
  };

  const tryNewPassage = () => {
    loadRandomPassage(difficulty);
  };

  const renderWord = (wordState, index) => {
    const { word, isCorrect } = wordState;

    return (
      <Text
        key={index}
        style={[
          styles.word,
          hasFinished && (isCorrect ? styles.correctWord : styles.incorrectWord),
        ]}
      >
        {word}{' '}
      </Text>
    );
  };

  // Difficulty Selection Screen
  if (!difficulty) {
    return (
      <View style={styles.container}>
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.header}>
            <TouchableOpacity onPress={onBack} style={styles.backButton} activeOpacity={0.7}>
              <Ionicons name="arrow-back" size={24} color={colors.foreground} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>select difficulty</Text>
            <View style={styles.placeholder} />
          </View>
        </SafeAreaView>

        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.difficultyContainer}
        >
          <Text style={styles.difficultyPrompt}>choose your challenge level:</Text>

          <TouchableOpacity
            style={[styles.difficultyCard, styles.easyCard]}
            onPress={() => selectDifficulty('easy')}
            activeOpacity={0.8}
          >
            <View style={[styles.difficultyIconCircle, { backgroundColor: colors.quaternary }]}>
              <Text style={styles.difficultyEmoji}>🌱</Text>
            </View>
            <Text style={styles.difficultyTitle}>easy</Text>
            <Text style={styles.difficultyDescription}>
              short passages with simple words{'\n'}
              ~10 seconds • +{calculateXP('easy', 100)} xp max
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.difficultyCard, styles.mediumCard]}
            onPress={() => selectDifficulty('medium')}
            activeOpacity={0.8}
          >
            <View style={[styles.difficultyIconCircle, { backgroundColor: colors.secondary }]}>
              <Text style={styles.difficultyEmoji}>🔥</Text>
            </View>
            <Text style={styles.difficultyTitle}>medium</Text>
            <Text style={styles.difficultyDescription}>
              moderate length with varied vocabulary{'\n'}
              ~20 seconds • +{calculateXP('medium', 100)} xp max
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.difficultyCard, styles.hardCard]}
            onPress={() => selectDifficulty('hard')}
            activeOpacity={0.8}
          >
            <View style={[styles.difficultyIconCircle, { backgroundColor: colors.accent }]}>
              <Text style={styles.difficultyEmoji}>💎</Text>
            </View>
            <Text style={styles.difficultyTitle}>hard</Text>
            <Text style={styles.difficultyDescription}>
              complex passages with advanced vocabulary{'\n'}
              ~30 seconds • +{calculateXP('hard', 100)} xp max
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    );
  }

  // Main Learning Screen
  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => setDifficulty(null)} style={styles.backButton} activeOpacity={0.7}>
            <Ionicons name="arrow-back" size={24} color={colors.foreground} />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>learn mode</Text>
            <Text style={styles.headerSubtitle}>
              {difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}
            </Text>
          </View>
          <View style={styles.placeholder} />
        </View>
      </SafeAreaView>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
      >
        <View style={styles.instructionCard}>
          <Text style={styles.instructionTitle}>how it works:</Text>
          <Text style={styles.instructionText}>
            1. read the text below aloud{'\n'}
            2. tap the microphone to start recording{'\n'}
            3. tap again to stop and see your results
          </Text>
        </View>

        {isGenerating ? (
          <View style={styles.generatingCard}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.generatingText}>
              ✨ Generating your unique passage with AI...
            </Text>
          </View>
        ) : currentPassage && (
          <View style={styles.textCard}>
            <Text style={styles.textTitle}>read this passage:</Text>
            <View style={styles.textContent}>
              {wordStates.length > 0 ? (
                wordStates.map((wordState, index) => renderWord(wordState, index))
              ) : (
                <Text style={styles.word}>{currentPassage.text}</Text>
              )}
            </View>
          </View>
        )}

        <View style={styles.microphoneContainer}>
          <TouchableOpacity
            style={[
              styles.microphoneButton,
              isRecording && styles.microphoneButtonActive,
              isProcessing && styles.microphoneButtonProcessing,
            ]}
            onPress={isRecording ? stopRecording : startRecording}
            disabled={isProcessing}
            activeOpacity={0.8}
          >
            {isProcessing ? (
              <ActivityIndicator size="large" color={colors.accentForeground} />
            ) : (
              <Ionicons
                name={isRecording ? 'stop' : 'mic'}
                size={48}
                color={colors.accentForeground}
              />
            )}
          </TouchableOpacity>
          <Text style={styles.microphoneLabel}>
            {isProcessing
              ? 'processing...'
              : isRecording
              ? 'tap to stop recording'
              : 'tap to start recording'}
          </Text>
        </View>

        {transcribedText.length > 0 && (
          <View style={styles.transcriptCard}>
            <Text style={styles.transcriptTitle}>what we heard:</Text>
            <Text style={styles.transcriptText}>{transcribedText}</Text>
          </View>
        )}

        {hasFinished && score !== null && (
          <View style={styles.scoreCard}>
            <Text style={styles.scoreTitle}>your score</Text>
            <Text style={styles.scoreValue}>{score}%</Text>
            <Text style={styles.scoreLabel}>
              {score >= 90
                ? 'excellent! 🌟'
                : score >= 70
                ? 'great job! 👏'
                : score >= 50
                ? 'good effort! 💪'
                : 'keep practicing! 📚'}
            </Text>

            <View style={styles.xpContainer}>
              <Text style={styles.xpText}>+{earnedXP} xp</Text>
            </View>

            <View style={styles.buttonRow}>
              <TouchableOpacity
                style={[styles.actionButton, styles.tryAgainButton]}
                onPress={tryNewPassage}
                activeOpacity={0.8}
              >
                <Text style={styles.actionButtonText}>new passage</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionButton, styles.changeDifficultyButton]}
                onPress={() => setDifficulty(null)}
                activeOpacity={0.8}
              >
                <Text style={styles.actionButtonText}>change difficulty</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Level Up Modal */}
      <Modal
        visible={showLevelUp}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowLevelUp(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.levelUpCard}>
            <View style={styles.levelUpIconCircle}>
              <Text style={styles.levelUpEmoji}>🎉</Text>
            </View>
            <Text style={styles.levelUpTitle}>level up!</Text>
            <Text style={styles.levelUpText}>
              level {levelUpInfo?.oldLevel} → {levelUpInfo?.newLevel}
            </Text>
            <TouchableOpacity
              style={styles.levelUpButton}
              onPress={() => setShowLevelUp(false)}
              activeOpacity={0.8}
            >
              <Text style={styles.levelUpButtonText}>awesome!</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  safeArea: {
    backgroundColor: colors.card,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
    backgroundColor: colors.card,
    borderBottomWidth: 2,
    borderBottomColor: colors.foreground,
  },
  backButton: {
    padding: spacing.xs,
  },
  headerCenter: {
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.extraBold,
    color: colors.foreground,
    textTransform: 'lowercase',
  },
  headerSubtitle: {
    fontSize: fontSize.sm,
    color: colors.mutedForeground,
    marginTop: 2,
    textTransform: 'lowercase',
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: spacing.lg,
  },
  difficultyContainer: {
    padding: spacing.lg,
    alignItems: 'stretch',
  },
  difficultyPrompt: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.extraBold,
    color: colors.foreground,
    textAlign: 'center',
    marginBottom: spacing.lg,
    textTransform: 'lowercase',
  },
  difficultyCard: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.foreground,
    ...shadows.card,
  },
  easyCard: {
    borderColor: colors.quaternary,
  },
  mediumCard: {
    borderColor: colors.secondary,
  },
  hardCard: {
    borderColor: colors.accent,
  },
  difficultyIconCircle: {
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
  difficultyEmoji: {
    fontSize: 32,
  },
  difficultyTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.extraBold,
    color: colors.foreground,
    marginBottom: spacing.xs,
    textTransform: 'lowercase',
  },
  difficultyDescription: {
    fontSize: fontSize.sm,
    color: colors.mutedForeground,
    textAlign: 'center',
    lineHeight: 20,
    textTransform: 'lowercase',
  },
  instructionCard: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    borderWidth: 2,
    borderColor: colors.foreground,
    ...shadows.card,
  },
  instructionTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.extraBold,
    color: colors.foreground,
    marginBottom: spacing.sm,
    textTransform: 'lowercase',
  },
  instructionText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.regular,
    color: colors.mutedForeground,
    lineHeight: 24,
    textTransform: 'lowercase',
  },
  generatingCard: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    padding: spacing.xxl,
    marginBottom: spacing.lg,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.accent,
    ...shadows.card,
  },
  generatingText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.medium,
    color: colors.foreground,
    marginTop: spacing.lg,
    textAlign: 'center',
    textTransform: 'lowercase',
  },
  textCard: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    borderWidth: 2,
    borderColor: colors.accent,
    ...shadows.card,
  },
  textTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.extraBold,
    color: colors.foreground,
    marginBottom: spacing.md,
    textTransform: 'lowercase',
  },
  textContent: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  word: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.regular,
    color: colors.foreground,
    lineHeight: 28,
  },
  correctWord: {
    backgroundColor: colors.quaternary,
    color: colors.foreground,
    paddingHorizontal: 4,
    borderRadius: 4,
    fontWeight: fontWeight.bold,
  },
  incorrectWord: {
    backgroundColor: colors.secondary,
    color: colors.foreground,
    paddingHorizontal: 4,
    borderRadius: 4,
    fontWeight: fontWeight.bold,
  },
  microphoneContainer: {
    alignItems: 'center',
    marginVertical: spacing.xl,
  },
  microphoneButton: {
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
  microphoneButtonActive: {
    backgroundColor: colors.secondary,
  },
  microphoneButtonProcessing: {
    backgroundColor: colors.tertiary,
  },
  microphoneLabel: {
    marginTop: spacing.md,
    fontSize: fontSize.md,
    fontWeight: fontWeight.medium,
    color: colors.mutedForeground,
    textTransform: 'lowercase',
  },
  transcriptCard: {
    backgroundColor: colors.muted,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    borderWidth: 2,
    borderColor: colors.border,
  },
  transcriptTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.extraBold,
    color: colors.foreground,
    marginBottom: spacing.sm,
    textTransform: 'lowercase',
  },
  transcriptText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.regular,
    color: colors.mutedForeground,
    lineHeight: 24,
  },
  scoreCard: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    padding: spacing.xl,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.accent,
    ...shadows.card,
  },
  scoreTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.extraBold,
    color: colors.foreground,
    marginBottom: spacing.sm,
    textTransform: 'lowercase',
  },
  scoreValue: {
    fontSize: 64,
    fontWeight: fontWeight.extraBold,
    color: colors.accent,
    marginVertical: spacing.sm,
  },
  scoreLabel: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.medium,
    color: colors.mutedForeground,
    marginBottom: spacing.md,
    textTransform: 'lowercase',
  },
  xpContainer: {
    backgroundColor: colors.accent,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    marginBottom: spacing.lg,
    borderWidth: 2,
    borderColor: colors.foreground,
    ...shadows.hard,
  },
  xpText: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.extraBold,
    color: colors.accentForeground,
    textTransform: 'lowercase',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: spacing.md,
    width: '100%',
  },
  actionButton: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.foreground,
    ...shadows.hard,
  },
  tryAgainButton: {
    backgroundColor: colors.accent,
  },
  changeDifficultyButton: {
    backgroundColor: colors.secondary,
  },
  actionButtonText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.accentForeground,
    textTransform: 'lowercase',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(30, 41, 59, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  levelUpCard: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    padding: spacing.xxl,
    alignItems: 'center',
    width: '100%',
    maxWidth: 400,
    borderWidth: 2,
    borderColor: colors.foreground,
    ...shadows.card,
    position: 'relative',
  },
  levelUpIconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: colors.tertiary,
    borderWidth: 3,
    borderColor: colors.foreground,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
    ...shadows.hard,
  },
  levelUpEmoji: {
    fontSize: 56,
  },
  levelUpTitle: {
    fontSize: fontSize.xxxl,
    fontWeight: fontWeight.extraBold,
    color: colors.foreground,
    marginBottom: spacing.md,
    textTransform: 'lowercase',
  },
  levelUpText: {
    fontSize: fontSize.xl,
    color: colors.accent,
    fontWeight: fontWeight.extraBold,
    marginBottom: spacing.xl,
  },
  levelUpButton: {
    backgroundColor: colors.accent,
    paddingHorizontal: spacing.xxl,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.full,
    borderWidth: 2,
    borderColor: colors.foreground,
    ...shadows.hard,
  },
  levelUpButtonText: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.accentForeground,
    textTransform: 'lowercase',
  },
});

export default LearnModeScreen;