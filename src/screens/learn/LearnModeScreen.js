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
import { Audio } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';
import { ref, update, get } from 'firebase/database';
import { db } from '../../../firebaseConfig';
import { transcribeAudio } from '../../services/deepgramService';
import { calculateXP, addXP, getLevelInfo } from '../../services/levelingService';
import { generateLearnModeFeedback } from '../../services/claudeService';
import { speakWords } from '../../services/elevenLabsService';
import { colors, fontSize, fontWeight, spacing, borderRadius, shadows } from '../../theme';
import passagesData from '../../data/passages.json';

const LearnModeScreen = ({ onBack, user }) => {
  const [difficulty, setDifficulty] = useState(null);
  const [currentPassage, setCurrentPassage] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [transcribedText, setTranscribedText] = useState('');
  const [wordStates, setWordStates] = useState([]);
  const [score, setScore] = useState(null);
  const [earnedXP, setEarnedXP] = useState(0);
  const [hasFinished, setHasFinished] = useState(false);
  const [showLevelUp, setShowLevelUp] = useState(false);
  const [levelUpInfo, setLevelUpInfo] = useState(null);
  const [aiFeedback, setAiFeedback] = useState('');
  const [incorrectWords, setIncorrectWords] = useState([]);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);

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

  const loadRandomPassage = (diff) => {
    const passages = passagesData[diff];
    if (passages && passages.length > 0) {
      const randomIndex = Math.floor(Math.random() * passages.length);
      setCurrentPassage(passages[randomIndex]);
      resetSession();
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
        <View style={styles.header}>
          <TouchableOpacity onPress={onBack} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Select Difficulty</Text>
          <View style={styles.placeholder} />
        </View>

        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.difficultyContainer}
        >
          <Text style={styles.difficultyPrompt}>Choose your challenge level:</Text>

          <TouchableOpacity
            style={[styles.difficultyCard, styles.easyCard]}
            onPress={() => selectDifficulty('easy')}
          >
            <Text style={styles.difficultyEmoji}>🌱</Text>
            <Text style={styles.difficultyTitle}>Easy</Text>
            <Text style={styles.difficultyDescription}>
              Short passages with simple words{'\n'}
              ~10 seconds • +{calculateXP('easy', 100)} XP max
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.difficultyCard, styles.mediumCard]}
            onPress={() => selectDifficulty('medium')}
          >
            <Text style={styles.difficultyEmoji}>🔥</Text>
            <Text style={styles.difficultyTitle}>Medium</Text>
            <Text style={styles.difficultyDescription}>
              Moderate length with varied vocabulary{'\n'}
              ~20 seconds • +{calculateXP('medium', 100)} XP max
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.difficultyCard, styles.hardCard]}
            onPress={() => selectDifficulty('hard')}
          >
            <Text style={styles.difficultyEmoji}>💎</Text>
            <Text style={styles.difficultyTitle}>Hard</Text>
            <Text style={styles.difficultyDescription}>
              Complex passages with advanced vocabulary{'\n'}
              ~30 seconds • +{calculateXP('hard', 100)} XP max
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    );
  }

  // Main Learning Screen
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => setDifficulty(null)} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Learn Mode</Text>
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
          <Text style={styles.instructionTitle}>How it works:</Text>
          <Text style={styles.instructionText}>
            1. Read the text below aloud{'\n'}
            2. Tap the microphone to start recording{'\n'}
            3. Tap again to stop and see your results
          </Text>
        </View>

        {currentPassage && (
          <View style={styles.textCard}>
            <Text style={styles.textTitle}>Read this passage:</Text>
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
          >
            {isProcessing ? (
              <ActivityIndicator size="large" color="#fff" />
            ) : (
              <Ionicons
                name={isRecording ? 'stop' : 'mic'}
                size={48}
                color="#fff"
              />
            )}
          </TouchableOpacity>
          <Text style={styles.microphoneLabel}>
            {isProcessing
              ? 'Processing...'
              : isRecording
              ? 'Tap to stop recording'
              : 'Tap to start recording'}
          </Text>
        </View>

        {transcribedText.length > 0 && (
          <View style={styles.transcriptCard}>
            <Text style={styles.transcriptTitle}>What we heard:</Text>
            <Text style={styles.transcriptText}>{transcribedText}</Text>
          </View>
        )}

        {hasFinished && score !== null && (
          <View style={styles.scoreCard}>
            <Text style={styles.scoreTitle}>Your Score</Text>
            <Text style={styles.scoreValue}>{score}%</Text>
            <Text style={styles.scoreLabel}>
              {score >= 90
                ? 'Excellent! 🌟'
                : score >= 70
                ? 'Great job! 👏'
                : score >= 50
                ? 'Good effort! 💪'
                : 'Keep practicing! 📚'}
            </Text>

            <View style={styles.xpContainer}>
              <Text style={styles.xpText}>+{earnedXP} XP</Text>
            </View>

            {/* AI Feedback */}
            {aiFeedback && (
              <View style={styles.feedbackContainer}>
                <View style={styles.feedbackHeader}>
                  <Ionicons name="bulb" size={20} color={colors.secondary} />
                  <Text style={styles.feedbackTitle}>AI Coach Says:</Text>
                </View>
                <Text style={styles.feedbackText}>{aiFeedback}</Text>
              </View>
            )}

            {/* Pronunciation Help */}
            {incorrectWords.length > 0 && (
              <TouchableOpacity
                style={styles.pronunciationButton}
                onPress={async () => {
                  setIsPlayingAudio(true);
                  try {
                    await speakWords(incorrectWords);
                  } catch (error) {
                    Alert.alert('Error', 'Failed to play pronunciation audio');
                  }
                  setIsPlayingAudio(false);
                }}
                disabled={isPlayingAudio}
              >
                <Ionicons
                  name={isPlayingAudio ? "volume-high" : "volume-medium"}
                  size={20}
                  color="#fff"
                />
                <Text style={styles.pronunciationButtonText}>
                  {isPlayingAudio ? 'Playing...' : 'Hear Missed Words'}
                </Text>
              </TouchableOpacity>
            )}

            <View style={styles.buttonRow}>
              <TouchableOpacity
                style={[styles.actionButton, styles.tryAgainButton]}
                onPress={tryNewPassage}
              >
                <Text style={styles.actionButtonText}>New Passage</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionButton, styles.changeDifficultyButton]}
                onPress={() => setDifficulty(null)}
              >
                <Text style={styles.actionButtonText}>Change Difficulty</Text>
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
            <Text style={styles.levelUpEmoji}>🎉</Text>
            <Text style={styles.levelUpTitle}>Level Up!</Text>
            <Text style={styles.levelUpText}>
              Level {levelUpInfo?.oldLevel} → {levelUpInfo?.newLevel}
            </Text>
            <TouchableOpacity
              style={styles.levelUpButton}
              onPress={() => setShowLevelUp(false)}
            >
              <Text style={styles.levelUpButtonText}>Awesome!</Text>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.md,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E8E8E8',
  },
  backButton: {
    padding: spacing.xs,
  },
  headerCenter: {
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  headerSubtitle: {
    fontSize: fontSize.sm,
    color: colors.textLight,
    marginTop: 2,
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
    fontWeight: fontWeight.bold,
    color: colors.text,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  difficultyCard: {
    backgroundColor: '#fff',
    borderRadius: borderRadius.lg,
    padding: spacing.xl,
    marginBottom: spacing.lg,
    alignItems: 'center',
    borderWidth: 3,
    ...shadows.medium,
  },
  easyCard: {
    borderColor: '#7ED957',
  },
  mediumCard: {
    borderColor: colors.secondary,
  },
  hardCard: {
    borderColor: colors.accent,
  },
  difficultyEmoji: {
    fontSize: 56,
    marginBottom: spacing.md,
  },
  difficultyTitle: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  difficultyDescription: {
    fontSize: fontSize.md,
    color: colors.textLight,
    textAlign: 'center',
    lineHeight: 22,
  },
  instructionCard: {
    backgroundColor: '#fff',
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: '#E8E8E8',
  },
  instructionTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  instructionText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.regular,
    color: colors.textLight,
    lineHeight: 24,
  },
  textCard: {
    backgroundColor: '#fff',
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    borderWidth: 2,
    borderColor: colors.primary,
  },
  textTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.md,
  },
  textContent: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  word: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.regular,
    color: colors.text,
    lineHeight: 28,
  },
  correctWord: {
    backgroundColor: '#C8E6C9',
    color: '#2E7D32',
    paddingHorizontal: 4,
    borderRadius: 4,
  },
  incorrectWord: {
    backgroundColor: '#FFCDD2',
    color: '#C62828',
    paddingHorizontal: 4,
    borderRadius: 4,
  },
  microphoneContainer: {
    alignItems: 'center',
    marginVertical: spacing.xl,
  },
  microphoneButton: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.large,
  },
  microphoneButtonActive: {
    backgroundColor: '#E53935',
  },
  microphoneButtonProcessing: {
    backgroundColor: colors.secondary,
  },
  microphoneLabel: {
    marginTop: spacing.md,
    fontSize: fontSize.md,
    fontWeight: fontWeight.medium,
    color: colors.textLight,
  },
  transcriptCard: {
    backgroundColor: '#F5F5F5',
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  transcriptTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  transcriptText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.regular,
    color: colors.textLight,
    lineHeight: 24,
  },
  scoreCard: {
    backgroundColor: '#fff',
    borderRadius: borderRadius.lg,
    padding: spacing.xl,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.accent,
  },
  scoreTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  scoreValue: {
    fontSize: 64,
    fontWeight: fontWeight.bold,
    color: colors.primary,
    marginVertical: spacing.sm,
  },
  scoreLabel: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.medium,
    color: colors.textLight,
    marginBottom: spacing.md,
  },
  xpContainer: {
    backgroundColor: colors.primaryLight + '30',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    marginBottom: spacing.lg,
  },
  xpText: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.primary,
  },
  feedbackContainer: {
    backgroundColor: colors.background,
    padding: spacing.md,
    borderRadius: borderRadius.md,
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
    color: colors.text,
    marginLeft: spacing.xs,
  },
  feedbackText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.regular,
    color: colors.textLight,
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
    color: '#fff',
    marginLeft: spacing.sm,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: spacing.md,
    width: '100%',
  },
  actionButton: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  tryAgainButton: {
    backgroundColor: colors.primary,
  },
  changeDifficultyButton: {
    backgroundColor: colors.secondary,
  },
  actionButtonText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: '#fff',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  levelUpCard: {
    backgroundColor: '#fff',
    borderRadius: borderRadius.xl,
    padding: spacing.xxl,
    alignItems: 'center',
    width: '100%',
    maxWidth: 400,
  },
  levelUpEmoji: {
    fontSize: 80,
    marginBottom: spacing.lg,
  },
  levelUpTitle: {
    fontSize: fontSize.xxxl,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.md,
  },
  levelUpText: {
    fontSize: fontSize.xl,
    color: colors.primary,
    fontWeight: fontWeight.bold,
    marginBottom: spacing.xl,
  },
  levelUpButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.xxl,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
  },
  levelUpButtonText: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: '#fff',
  },
});

export default LearnModeScreen;
