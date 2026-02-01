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
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Audio } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';
import { ref, update, get } from 'firebase/database';
import { db } from '../../../firebaseConfig';
import { transcribeAudio } from '../../services/deepgramService';
import { calculateXP, addXP, getLevelInfo } from '../../services/levelingService';
import { generatePassage } from '../../services/passageGenerationService';
import { generateLearnModeFeedback } from '../../services/claudeService';
import { speakWords, speakText, stopAllAudio, pauseAudio, resumeAudio, isAudioPlaying, isAudioPaused } from '../../services/elevenLabsService';
import { colors, fontSize, fontWeight, spacing, borderRadius, shadows } from '../../theme';
import passagesData from '../../data/passages.json';

const LearnModeScreen = ({ onBack, user }) => {
  const insets = useSafeAreaInsets();
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
  const [aiFeedback, setAiFeedback] = useState('');
  const [incorrectWords, setIncorrectWords] = useState([]);
  const [playingWordIndex, setPlayingWordIndex] = useState(null);
  const [isPlayingFeedback, setIsPlayingFeedback] = useState(false);
  const [isPausedFeedback, setIsPausedFeedback] = useState(false);

  const recordingRef = useRef(null);
  const audioPermissionRef = useRef(false);

  useEffect(() => {
    requestAudioPermission();
    return () => {
      if (recordingRef.current) {
        stopRecording();
      }
      // Stop any playing audio when leaving the screen
      stopAllAudio();
    };
  }, []);

  const handleWordClick = async (word, index) => {
    // If already playing this word, stop it
    if (playingWordIndex === index) {
      await stopAllAudio();
      setPlayingWordIndex(null);
      return;
    }

    // Stop any other playing audio first
    if (playingWordIndex !== null) {
      await stopAllAudio();
    }

    setPlayingWordIndex(index);
    try {
      await speakText(word);
      setPlayingWordIndex(null);
    } catch (error) {
      console.error('Error playing word:', error);
      setPlayingWordIndex(null);
    }
  };

  const handleFeedbackPlayback = async () => {
    if (isPlayingFeedback && !isPausedFeedback) {
      await pauseAudio();
      setIsPausedFeedback(true);
    } else if (isPausedFeedback) {
      await resumeAudio();
      setIsPausedFeedback(false);
    } else {
      setIsPlayingFeedback(true);
      setIsPausedFeedback(false);
      try {
        await speakText(aiFeedback);
        setIsPlayingFeedback(false);
        setIsPausedFeedback(false);
      } catch (error) {
        console.error('Error playing feedback:', error);
        setIsPlayingFeedback(false);
        setIsPausedFeedback(false);
        Alert.alert('Error', 'Failed to play feedback audio');
      }
    }
  };

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

    // Get incorrect words for AI feedback and pronunciation help
    const incorrect = states
      .filter(state => !state.isCorrect)
      .map(state => state.word);
    setIncorrectWords(incorrect);

    // Calculate XP earned
    const xp = calculateXP(difficulty, percentage);
    setEarnedXP(xp);

    // Update user's XP in database
    if (user) {
      await updateUserXP(xp);
    }

    setHasFinished(true);

    // Generate AI feedback
    try {
      const feedback = await generateLearnModeFeedback(percentage, incorrect);
      setAiFeedback(feedback);
    } catch (error) {
      console.error('Failed to generate AI feedback:', error);
      setAiFeedback('Great effort! Keep practicing to improve your reading skills.');
    }
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
    stopAllAudio();
    setTranscribedText('');
    setWordStates([]);
    setScore(null);
    setEarnedXP(0);
    setHasFinished(false);
    setIsRecording(false);
    setIsProcessing(false);
    setPlayingWordIndex(null);
    setIsPlayingFeedback(false);
    setIsPausedFeedback(false);
  };

  const tryNewPassage = () => {
    loadRandomPassage(difficulty);
  };

  const renderWord = (wordState, index) => {
    const { word, isCorrect } = wordState;
    const isClickable = hasFinished && !isCorrect;
    const isPlaying = playingWordIndex === index;

    if (isClickable) {
      return (
        <TouchableOpacity
          key={index}
          onPress={() => handleWordClick(word, index)}
          activeOpacity={0.7}
          style={styles.wordButton}
        >
          <Text
            style={[
              styles.word,
              styles.incorrectWord,
              isPlaying && styles.playingWord,
            ]}
          >
            {word}{' '}
            {isPlaying && <Ionicons name="volume-high" size={12} color={colors.foreground} />}
          </Text>
        </TouchableOpacity>
      );
    }

    return (
      <Text
        key={index}
        style={[
          styles.word,
          hasFinished && isCorrect && styles.correctWord,
        ]}
      >
        {word}{' '}
      </Text>
    );
  };

  // Difficulty Selection Screen
  if (!difficulty) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={[styles.header, { paddingTop: Math.max(insets.top - 70, spacing.sm) }]}>
          <TouchableOpacity onPress={onBack} style={styles.backButton} activeOpacity={0.7}>
            <Ionicons name="arrow-back" size={24} color={colors.foreground} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>select difficulty</Text>
          <View style={styles.placeholder} />
        </View>

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
      </SafeAreaView>
    );
  }

  // Main Learning Screen
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={[styles.header, { paddingTop: Math.max(insets.top - 70, spacing.sm) }]}>
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

            {/* AI Feedback */}
            {aiFeedback && (
              <View style={styles.feedbackContainer}>
                <View style={styles.feedbackHeader}>
                  <Ionicons name="bulb" size={20} color={colors.secondary} />
                  <Text style={styles.feedbackTitle}>ai coach says:</Text>
                  <TouchableOpacity
                    onPress={handleFeedbackPlayback}
                    style={styles.feedbackAudioButton}
                    activeOpacity={0.7}
                  >
                    <Ionicons
                      name={
                        isPlayingFeedback && !isPausedFeedback
                          ? "pause-circle"
                          : "play-circle"
                      }
                      size={24}
                      color={colors.secondary}
                    />
                  </TouchableOpacity>
                </View>
                <Text style={styles.feedbackText}>{aiFeedback}</Text>
              </View>
            )}

            {/* Hint for clickable words */}
            {incorrectWords.length > 0 && (
              <View style={styles.hintContainer}>
                <Ionicons name="information-circle" size={16} color={colors.mutedForeground} />
                <Text style={styles.hintText}>
                  tap on red words to hear pronunciation
                </Text>
              </View>
            )}

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
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
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
    padding: spacing.xl,
    alignItems: 'stretch',
  },
  difficultyPrompt: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.extraBold,
    color: colors.foreground,
    textAlign: 'center',
    marginBottom: spacing.xl,
    textTransform: 'lowercase',
  },
  difficultyCard: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    padding: spacing.xl,
    marginBottom: spacing.lg,
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
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
    borderWidth: 2,
    borderColor: colors.foreground,
    ...shadows.hard,
  },
  difficultyEmoji: {
    fontSize: 48,
  },
  difficultyTitle: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.extraBold,
    color: colors.foreground,
    marginBottom: spacing.sm,
    textTransform: 'lowercase',
  },
  difficultyDescription: {
    fontSize: fontSize.md,
    color: colors.mutedForeground,
    textAlign: 'center',
    lineHeight: 22,
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
  wordButton: {
    display: 'inline-flex',
  },
  playingWord: {
    backgroundColor: colors.accent,
  },
  hintContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.muted,
    borderRadius: borderRadius.md,
    marginTop: spacing.md,
    marginBottom: spacing.md,
    gap: spacing.xs,
  },
  hintText: {
    fontSize: fontSize.sm,
    color: colors.mutedForeground,
    textTransform: 'lowercase',
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
  feedbackContainer: {
    backgroundColor: colors.muted,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginTop: spacing.md,
    marginBottom: spacing.md,
    borderLeftWidth: 4,
    borderLeftColor: colors.secondary,
  },
  feedbackHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  feedbackTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.foreground,
    marginLeft: spacing.xs,
    flex: 1,
    textTransform: 'lowercase',
  },
  feedbackAudioButton: {
    padding: spacing.xs,
  },
  feedbackText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.regular,
    color: colors.mutedForeground,
    lineHeight: 22,
  },
  pronunciationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.secondary,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.md,
    marginBottom: spacing.md,
  },
  pronunciationButtonText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.secondaryForeground,
    marginLeft: spacing.sm,
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