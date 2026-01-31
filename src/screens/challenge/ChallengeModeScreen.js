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
import { generatePassage } from '../../services/passageGenerationService';
import { colors, fontSize, fontWeight, spacing, borderRadius, shadows } from '../../theme';
import passagesData from '../../data/passages.json';

// Target WPM for each difficulty
const TARGET_WPM = {
  easy: 90,
  medium: 110,
  hard: 130,
};

// Rank thresholds
const RANKS = {
  bronze: { min: 0, max: 49, emoji: '🥉', color: '#CD7F32', name: 'Bronze' },
  silver: { min: 50, max: 69, emoji: '🥈', color: '#C0C0C0', name: 'Silver' },
  gold: { min: 70, max: 100, emoji: '🥇', color: '#FFD700', name: 'Gold' },
};

const ChallengeModeScreen = ({ onBack, user }) => {
  const [difficulty, setDifficulty] = useState(null);
  const [currentPassage, setCurrentPassage] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [transcribedText, setTranscribedText] = useState('');
  const [wordStates, setWordStates] = useState([]);
  const [accuracyScore, setAccuracyScore] = useState(null);
  const [wpm, setWpm] = useState(null);
  const [totalScore, setTotalScore] = useState(null);
  const [rank, setRank] = useState(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [hasFinished, setHasFinished] = useState(false);
  const [showRankModal, setShowRankModal] = useState(false);
  const [isNewHighScore, setIsNewHighScore] = useState(false);
  const [highScores, setHighScores] = useState({ easy: 0, medium: 0, hard: 0 });

  const recordingRef = useRef(null);
  const audioPermissionRef = useRef(false);
  const timerRef = useRef(null);
  const startTimeRef = useRef(null);

  useEffect(() => {
    requestAudioPermission();
    loadHighScores();
    return () => {
      if (recordingRef.current) {
        stopRecording();
      }
      if (timerRef.current) {
        clearInterval(timerRef.current);
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
          'Please grant microphone permissions to use Challenge Mode.'
        );
      }
    } catch (error) {
      console.error('Error requesting audio permission:', error);
    }
  };

  const loadHighScores = async () => {
    if (!user) return;
    try {
      const userRef = ref(db, 'users/' + user.uid);
      const snapshot = await get(userRef);
      const userData = snapshot.val();
      if (userData?.challengeHighScores) {
        setHighScores(userData.challengeHighScores);
      }
    } catch (error) {
      console.error('Error loading high scores:', error);
    }
  };

  const selectDifficulty = (selectedDifficulty) => {
    setDifficulty(selectedDifficulty);
    loadChallengePassage(selectedDifficulty);
  };

  const loadChallengePassage = async (diff) => {
    setIsGenerating(true);
    resetSession();

    try {
      console.log(`Generating ${diff} challenge passage...`);
      const generatedPassage = await generatePassage(diff);
      setCurrentPassage(generatedPassage);
      console.log('✅ Challenge passage generated');
    } catch (error) {
      console.error('Failed to generate challenge passage:', error);
      console.log('Falling back to local passages...');

      const passages = passagesData[diff];
      if (passages && passages.length > 0) {
        const randomIndex = Math.floor(Math.random() * passages.length);
        setCurrentPassage(passages[randomIndex]);
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
      setAccuracyScore(null);
      setWpm(null);
      setTotalScore(null);
      setRank(null);
      setHasFinished(false);

      // Start timer
      startTimeRef.current = Date.now();
      setElapsedTime(0);
      timerRef.current = setInterval(() => {
        setElapsedTime(Math.floor((Date.now() - startTimeRef.current) / 1000));
      }, 100);
    } catch (error) {
      console.error('Failed to start recording:', error);
      Alert.alert('Error', 'Failed to start recording. Please try again.');
    }
  };

  const stopRecording = async () => {
    try {
      if (!recordingRef.current) return;

      setIsRecording(false);
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }

      const endTime = Date.now();
      const duration = (endTime - startTimeRef.current) / 1000; // seconds

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
        analyzePerformance(transcript, duration);
      }

      setIsProcessing(false);
    } catch (error) {
      console.error('Failed to stop recording:', error);
      setIsProcessing(false);
      Alert.alert('Error', 'Failed to process recording. Please try again.');
    }
  };

  const analyzePerformance = async (transcript, duration) => {
    if (!currentPassage) return;

    const normalizeText = (text) =>
      text.toLowerCase()
        .replace(/[.,!?;:]/g, '')
        .split(/\s+/)
        .filter(word => word.length > 0);

    const extractWords = normalizeText(currentPassage.text);
    const transcriptWords = normalizeText(transcript);

    // Calculate word states
    const states = extractWords.map((word, index) => {
      const wasSpoken = transcriptWords.includes(word);
      return {
        word: currentPassage.text.split(/\s+/)[index],
        isCorrect: wasSpoken,
        index,
      };
    });

    setWordStates(states);

    // Calculate accuracy
    const correctWords = states.filter(state => state.isCorrect).length;
    const totalWords = states.length;
    const accuracy = Math.round((correctWords / totalWords) * 100);
    setAccuracyScore(accuracy);

    // Calculate WPM
    const wordsPerMinute = Math.round((transcriptWords.length / duration) * 60);
    setWpm(wordsPerMinute);

    // Calculate composite score
    const score = calculateChallengeScore(accuracy, wordsPerMinute, difficulty);
    setTotalScore(score);

    // Determine rank
    const achievedRank = getRankFromScore(score);
    setRank(achievedRank);

    // Check for new high score
    const currentHighScore = highScores[difficulty] || 0;
    const isNewHigh = score > currentHighScore;
    setIsNewHighScore(isNewHigh);

    // Update high score in Firebase
    if (isNewHigh && user) {
      await updateHighScore(difficulty, score);
    }

    setHasFinished(true);
    setShowRankModal(true);
  };

  const calculateChallengeScore = (accuracy, wpm, diff) => {
    // Accuracy component (0-50 points)
    const accuracyPoints = (accuracy / 100) * 50;

    // WPM component (0-50 points)
    const targetWpm = TARGET_WPM[diff];
    const wpmRatio = Math.min(wpm / targetWpm, 2); // Cap at 2x target
    const wpmPoints = wpmRatio * 25; // Max 50 points if reading at 2x target

    const total = Math.round(accuracyPoints + wpmPoints);
    return Math.min(total, 100); // Cap at 100
  };

  const getRankFromScore = (score) => {
    if (score >= RANKS.gold.min && score <= RANKS.gold.max) return RANKS.gold;
    if (score >= RANKS.silver.min && score <= RANKS.silver.max) return RANKS.silver;
    return RANKS.bronze;
  };

  const updateHighScore = async (diff, score) => {
    if (!user) return;
    try {
      const userRef = ref(db, 'users/' + user.uid);
      const snapshot = await get(userRef);
      const userData = snapshot.val();

      const currentHighScores = userData?.challengeHighScores || { easy: 0, medium: 0, hard: 0 };
      currentHighScores[diff] = score;

      await update(userRef, {
        challengeHighScores: currentHighScores,
      });

      setHighScores(currentHighScores);
    } catch (error) {
      console.error('Error updating high score:', error);
    }
  };

  const resetSession = () => {
    setTranscribedText('');
    setWordStates([]);
    setAccuracyScore(null);
    setWpm(null);
    setTotalScore(null);
    setRank(null);
    setElapsedTime(0);
    setHasFinished(false);
    setIsRecording(false);
    setIsProcessing(false);
    setIsNewHighScore(false);
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
  };

  const tryNewChallenge = () => {
    loadChallengePassage(difficulty);
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
          <Text style={styles.headerTitle}>Challenge Mode</Text>
          <View style={styles.placeholder} />
        </View>

        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.difficultyContainer}
        >
          <Text style={styles.challengeTitle}>⚔️ Test Your Skills!</Text>
          <Text style={styles.challengeSubtitle}>
            Read as fast AND accurately as you can.{'\n'}
            Earn ranks based on your performance!
          </Text>

          <View style={styles.rankLegend}>
            <Text style={styles.legendTitle}>Ranks:</Text>
            <View style={styles.rankRow}>
              <Text style={styles.rankEmoji}>🥉</Text>
              <Text style={styles.rankText}>Bronze (0-49)</Text>
            </View>
            <View style={styles.rankRow}>
              <Text style={styles.rankEmoji}>🥈</Text>
              <Text style={styles.rankText}>Silver (50-69)</Text>
            </View>
            <View style={styles.rankRow}>
              <Text style={styles.rankEmoji}>🥇</Text>
              <Text style={styles.rankText}>Gold (70-100)</Text>
            </View>
          </View>

          <Text style={styles.difficultyPrompt}>Choose your difficulty:</Text>

          <TouchableOpacity
            style={[styles.difficultyCard, styles.easyCard]}
            onPress={() => selectDifficulty('easy')}
          >
            <Text style={styles.difficultyEmoji}>🌱</Text>
            <Text style={styles.difficultyTitle}>Easy</Text>
            <Text style={styles.difficultyDescription}>
              Target: {TARGET_WPM.easy} WPM{'\n'}
              High Score: {highScores.easy || 0}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.difficultyCard, styles.mediumCard]}
            onPress={() => selectDifficulty('medium')}
          >
            <Text style={styles.difficultyEmoji}>🔥</Text>
            <Text style={styles.difficultyTitle}>Medium</Text>
            <Text style={styles.difficultyDescription}>
              Target: {TARGET_WPM.medium} WPM{'\n'}
              High Score: {highScores.medium || 0}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.difficultyCard, styles.hardCard]}
            onPress={() => selectDifficulty('hard')}
          >
            <Text style={styles.difficultyEmoji}>💎</Text>
            <Text style={styles.difficultyTitle}>Hard</Text>
            <Text style={styles.difficultyDescription}>
              Target: {TARGET_WPM.hard} WPM{'\n'}
              High Score: {highScores.hard || 0}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    );
  }

  // Main Challenge Screen
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => setDifficulty(null)} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Challenge Mode</Text>
          <Text style={styles.headerSubtitle}>
            {difficulty.charAt(0).toUpperCase() + difficulty.slice(1)} • Target: {TARGET_WPM[difficulty]} WPM
          </Text>
        </View>
        <View style={styles.placeholder} />
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
      >
        {isRecording && (
          <View style={styles.timerCard}>
            <Text style={styles.timerText}>⏱️ {(elapsedTime / 10).toFixed(1)}s</Text>
          </View>
        )}

        <View style={styles.instructionCard}>
          <Text style={styles.instructionTitle}>Challenge Rules:</Text>
          <Text style={styles.instructionText}>
            1. Read the passage as quickly as possible{'\n'}
            2. Maintain high accuracy{'\n'}
            3. Your score is based on SPEED + ACCURACY
          </Text>
        </View>

        {isGenerating ? (
          <View style={styles.generatingCard}>
            <ActivityIndicator size="large" color={colors.accent} />
            <Text style={styles.generatingText}>
              ⚔️ Preparing your challenge...
            </Text>
          </View>
        ) : currentPassage && (
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
            disabled={isProcessing || isGenerating}
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
              ? 'Analyzing...'
              : isRecording
              ? 'Tap to finish'
              : 'Tap to start challenge'}
          </Text>
        </View>

        {hasFinished && (
          <View style={styles.resultsCard}>
            <View style={styles.rankDisplay}>
              <Text style={styles.rankEmojiLarge}>{rank?.emoji}</Text>
              <Text style={[styles.rankName, { color: rank?.color }]}>{rank?.name}</Text>
            </View>

            <View style={styles.statsGrid}>
              <View style={styles.statItem}>
                <Text style={styles.statLabel}>Accuracy</Text>
                <Text style={styles.statValue}>{accuracyScore}%</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statLabel}>Speed</Text>
                <Text style={styles.statValue}>{wpm} WPM</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statLabel}>Score</Text>
                <Text style={styles.statValue}>{totalScore}</Text>
              </View>
            </View>

            {isNewHighScore && (
              <View style={styles.highScoreBanner}>
                <Text style={styles.highScoreText}>🎉 NEW HIGH SCORE! 🎉</Text>
              </View>
            )}

            <View style={styles.buttonRow}>
              <TouchableOpacity
                style={[styles.actionButton, styles.tryAgainButton]}
                onPress={tryNewChallenge}
              >
                <Text style={styles.actionButtonText}>Try Again</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionButton, styles.changeDifficultyButton]}
                onPress={() => setDifficulty(null)}
              >
                <Text style={styles.actionButtonText}>Change Level</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Rank Achievement Modal */}
      <Modal
        visible={showRankModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowRankModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.rankModal}>
            <Text style={styles.modalRankEmoji}>{rank?.emoji}</Text>
            <Text style={styles.modalTitle}>
              {isNewHighScore ? 'New High Score!' : 'Challenge Complete!'}
            </Text>
            <Text style={[styles.modalRank, { color: rank?.color }]}>
              {rank?.name} Rank
            </Text>
            <Text style={styles.modalScore}>Score: {totalScore}</Text>
            <TouchableOpacity
              style={styles.modalButton}
              onPress={() => setShowRankModal(false)}
            >
              <Text style={styles.modalButtonText}>Continue</Text>
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
  challengeTitle: {
    fontSize: fontSize.xxxl,
    fontWeight: fontWeight.bold,
    color: colors.text,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  challengeSubtitle: {
    fontSize: fontSize.md,
    color: colors.textLight,
    textAlign: 'center',
    marginBottom: spacing.xl,
    lineHeight: 22,
  },
  rankLegend: {
    backgroundColor: colors.cream,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.xl,
  },
  legendTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.md,
  },
  rankRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  rankEmoji: {
    fontSize: 24,
    marginRight: spacing.md,
  },
  rankText: {
    fontSize: fontSize.md,
    color: colors.text,
  },
  difficultyPrompt: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text,
    textAlign: 'center',
    marginBottom: spacing.lg,
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
  timerCard: {
    backgroundColor: colors.accent,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    alignItems: 'center',
  },
  timerText: {
    fontSize: fontSize.xxxl,
    fontWeight: fontWeight.bold,
    color: '#fff',
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
    color: colors.textLight,
    lineHeight: 24,
  },
  generatingCard: {
    backgroundColor: '#fff',
    borderRadius: borderRadius.lg,
    padding: spacing.xxl,
    marginBottom: spacing.lg,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.accent,
  },
  generatingText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.medium,
    color: colors.text,
    marginTop: spacing.lg,
    textAlign: 'center',
  },
  textCard: {
    backgroundColor: '#fff',
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    borderWidth: 2,
    borderColor: colors.accent,
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
    backgroundColor: colors.accent,
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
  resultsCard: {
    backgroundColor: '#fff',
    borderRadius: borderRadius.lg,
    padding: spacing.xl,
    borderWidth: 2,
    borderColor: colors.accent,
  },
  rankDisplay: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  rankEmojiLarge: {
    fontSize: 80,
    marginBottom: spacing.md,
  },
  rankName: {
    fontSize: fontSize.xxxl,
    fontWeight: fontWeight.bold,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: spacing.lg,
  },
  statItem: {
    alignItems: 'center',
  },
  statLabel: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    marginBottom: spacing.xs,
  },
  statValue: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  highScoreBanner: {
    backgroundColor: '#FFD700',
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  highScoreText: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
    textAlign: 'center',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  actionButton: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
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
    color: '#fff',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  rankModal: {
    backgroundColor: '#fff',
    borderRadius: borderRadius.xl,
    padding: spacing.xxl,
    alignItems: 'center',
    width: '100%',
    maxWidth: 400,
  },
  modalRankEmoji: {
    fontSize: 100,
    marginBottom: spacing.lg,
  },
  modalTitle: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.md,
  },
  modalRank: {
    fontSize: fontSize.xxxl,
    fontWeight: fontWeight.bold,
    marginBottom: spacing.sm,
  },
  modalScore: {
    fontSize: fontSize.xl,
    color: colors.textLight,
    marginBottom: spacing.xl,
  },
  modalButton: {
    backgroundColor: colors.accent,
    paddingHorizontal: spacing.xxl,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
  },
  modalButtonText: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: '#fff',
  },
});

export default ChallengeModeScreen;
