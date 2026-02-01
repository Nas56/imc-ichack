import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Audio } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';
import { transcribeAudio } from '../../services/deepgramService';
import { generateChallengeModeFeedback, assessPassageDifficulty } from '../../services/claudeService';
import { speakWords, stopAllAudio } from '../../services/elevenLabsService';
import { calculateChallengeScore, getRankInfo, addChallengeScore } from '../../services/challengeRankingService';
import { generatePassage } from '../../services/passageGenerationService';
import { ref, update } from 'firebase/database';
import { db } from '../../../firebaseConfig';
import { colors, fontSize, fontWeight, spacing, borderRadius, shadows } from '../../theme';
import passagesData from '../../data/passages.json';

const ChallengeModeScreen = ({ onBack, user }) => {
  const insets = useSafeAreaInsets();
  const [difficulty, setDifficulty] = useState(null);
  const [currentPassage, setCurrentPassage] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [transcribedText, setTranscribedText] = useState('');
  const [wordStates, setWordStates] = useState([]);
  const [score, setScore] = useState(null);
  const [wpm, setWpm] = useState(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [hasFinished, setHasFinished] = useState(false);
  const [aiFeedback, setAiFeedback] = useState('');
  const [incorrectWords, setIncorrectWords] = useState([]);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [challengeScore, setChallengeScore] = useState(null);
  const [rankInfo, setRankInfo] = useState(null);
  const [rankedUp, setRankedUp] = useState(false);

  const recordingRef = useRef(null);
  const audioPermissionRef = useRef(false);
  const timerRef = useRef(null);
  const startTimeRef = useRef(null);

  useEffect(() => {
    requestAudioPermission();
    return () => {
      // Cleanup on unmount
      if (recordingRef.current) {
        stopRecording();
      }
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      // Stop any playing audio
      stopAllAudio();
    };
  }, []);

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

  const startRecording = async () => {
    try {
      if (!audioPermissionRef.current) {
        await requestAudioPermission();
        if (!audioPermissionRef.current) return;
      }

      // Configure audio mode
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      // Start recording
      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );

      recordingRef.current = recording;
      setIsRecording(true);
      setTranscribedText('');
      setWordStates([]);
      setScore(null);
      setWpm(null);
      setHasFinished(false);

      // Start timer
      startTimeRef.current = Date.now();
      setElapsedTime(0);
      timerRef.current = setInterval(() => {
        setElapsedTime(Math.floor((Date.now() - startTimeRef.current) / 1000));
      }, 1000);
    } catch (error) {
      console.error('Failed to start recording:', error);
      Alert.alert('Error', 'Failed to start recording. Please try again.');
    }
  };

  const stopRecording = async () => {
    try {
      if (!recordingRef.current) return;

      // Stop timer
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }

      const finalTime = Math.floor((Date.now() - startTimeRef.current) / 1000);
      setElapsedTime(finalTime);

      setIsRecording(false);
      setIsProcessing(true);

      await recordingRef.current.stopAndUnloadAsync();
      const uri = recordingRef.current.getURI();
      recordingRef.current = null;

      // Reset audio mode
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
      });

      if (uri) {
        // Transcribe the audio
        const transcript = await transcribeAudio(uri);
        setTranscribedText(transcript);

        // Compare with the extract and calculate metrics
        compareTexts(transcript, finalTime);
      }

      setIsProcessing(false);
    } catch (error) {
      console.error('Failed to stop recording:', error);
      setIsProcessing(false);
      Alert.alert('Error', 'Failed to process recording. Please try again.');
    }
  };

  const compareTexts = async (transcript, timeInSeconds) => {
    if (!currentPassage) return;

    // Normalize texts
    const normalizeText = (text) =>
      text.toLowerCase()
        .replace(/[.,!?;:]/g, '')
        .split(/\s+/)
        .filter(word => word.length > 0);

    const challengeWords = normalizeText(currentPassage.text);
    const transcriptWords = normalizeText(transcript);

    // Create word states with comparison
    const states = challengeWords.map((word, index) => {
      const wasSpoken = transcriptWords.includes(word);
      return {
        word: currentPassage.text.split(/\s+/)[index],
        isCorrect: wasSpoken,
        index,
      };
    });

    setWordStates(states);

    // Calculate accuracy score
    const correctWords = states.filter(state => state.isCorrect).length;
    const totalWords = states.length;
    const percentage = Math.round((correctWords / totalWords) * 100);

    // Calculate WPM (Words Per Minute)
    const minutes = timeInSeconds / 60;
    const wordsPerMinute = Math.round(correctWords / minutes);

    // Get incorrect words for AI feedback and pronunciation help
    const incorrect = states
      .filter(state => !state.isCorrect)
      .map(state => state.word);
    setIncorrectWords(incorrect);

    setScore(percentage);
    setWpm(wordsPerMinute);
    setHasFinished(true);

    // Assess passage difficulty with Claude
    let passageDifficulty = 5; // Default medium difficulty
    try {
      passageDifficulty = await assessPassageDifficulty(currentPassage.text);
      console.log('Passage difficulty assessed:', passageDifficulty);
    } catch (error) {
      console.error('Failed to assess difficulty:', error);
    }

    // Calculate challenge score
    const earnedScore = calculateChallengeScore(passageDifficulty, wordsPerMinute, percentage);
    setChallengeScore(earnedScore);

    // Update user's challenge score and rank in Firebase
    if (user) {
      try {
        const userRef = ref(db, 'users/' + user.uid);

        // Get current challenge score from Firebase
        const { onValue } = require('firebase/database');
        onValue(userRef, (snapshot) => {
          const userData = snapshot.val();
          const currentScore = userData?.challengeScore || 0;

          // Calculate new score and check for rank up
          const scoreUpdate = addChallengeScore(currentScore, earnedScore);
          const newRankInfo = getRankInfo(scoreUpdate.newTotalScore);

          setRankInfo(newRankInfo);
          setRankedUp(scoreUpdate.rankedUp);

          // Update Firebase with new score and rank
          update(userRef, {
            challengeScore: scoreUpdate.newTotalScore,
            challengeRank: newRankInfo.rank,
          });
        }, { onlyOnce: true });
      } catch (error) {
        console.error('Failed to update challenge score:', error);
      }
    }

    // Generate AI feedback
    try {
      const feedback = await generateChallengeModeFeedback(percentage, wordsPerMinute, incorrect);
      setAiFeedback(feedback);
    } catch (error) {
      console.error('Failed to generate AI feedback:', error);
      setAiFeedback('Great effort! Keep practicing to improve both speed and accuracy.');
    }
  };

  const resetSession = () => {
    setTranscribedText('');
    setWordStates([]);
    setScore(null);
    setWpm(null);
    setElapsedTime(0);
    setHasFinished(false);
    setIsRecording(false);
    setIsProcessing(false);
    setAiFeedback('');
    setIncorrectWords([]);
    setIsPlayingAudio(false);
    setChallengeScore(null);
    setRankInfo(null);
    setRankedUp(false);
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const tryNewPassage = () => {
    loadRandomPassage(difficulty);
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
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
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.difficultyPrompt}>⚔️ test your skills:</Text>

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
              ~25-35 words • ~10 seconds
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
              ~50-70 words • ~20 seconds
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
              ~80-100 words • ~30 seconds
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // Main Challenge Screen
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: Math.max(insets.top - 70, spacing.sm) }]}>
        <TouchableOpacity onPress={() => setDifficulty(null)} style={styles.backButton} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={24} color={colors.foreground} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>challenge mode</Text>
          <Text style={styles.headerSubtitle}>
            {difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}
          </Text>
        </View>
        <View style={styles.placeholder} />
      </View>

      {/* Timer and Metrics Bar */}
      <View style={styles.metricsBar}>
        <View style={styles.metricItem}>
          <Ionicons name="time-outline" size={18} color={colors.accent} />
          <Text style={styles.metricLabel}>time</Text>
          <Text style={styles.metricValue}>{formatTime(elapsedTime)}</Text>
        </View>
        {wpm !== null && (
          <View style={styles.metricItem}>
            <Ionicons name="speedometer-outline" size={18} color={colors.secondary} />
            <Text style={styles.metricLabel}>wpm</Text>
            <Text style={styles.metricValue}>{wpm}</Text>
          </View>
        )}
        {score !== null && (
          <View style={styles.metricItem}>
            <Ionicons name="checkmark-circle-outline" size={18} color={colors.quaternary} />
            <Text style={styles.metricLabel}>accuracy</Text>
            <Text style={styles.metricValue}>{score}%</Text>
          </View>
        )}
      </View>

      <View style={styles.contentWrapper}>
        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
        >
          {/* Instructions - Only show when not recording and not finished */}
          {!isRecording && !hasFinished && !isGenerating && (
            <View style={styles.instructionCard}>
              <Text style={styles.instructionTitle}>⚡ challenge rules</Text>
              <Text style={styles.instructionText}>
                read the passage quickly and accurately. your time and accuracy will be tracked.
              </Text>
            </View>
          )}

          {/* Generating Passage */}
          {isGenerating ? (
            <View style={styles.generatingCard}>
              <ActivityIndicator size="large" color={colors.accent} />
              <Text style={styles.generatingText}>
                ✨ generating your unique challenge passage...
              </Text>
            </View>
          ) : currentPassage && (
            <View style={styles.textCard}>
              <Text style={styles.textTitle}>
                {hasFinished ? 'your performance:' : 'read this passage:'}
              </Text>
              <ScrollView
                style={styles.textScrollView}
                nestedScrollEnabled={true}
                showsVerticalScrollIndicator={false}
              >
                <View style={styles.textContent}>
                  {wordStates.length > 0 ? (
                    wordStates.map((wordState, index) => renderWord(wordState, index))
                  ) : (
                    <Text style={styles.word}>{currentPassage.text}</Text>
                  )}
                </View>
              </ScrollView>
            </View>
          )}

          {/* Transcribed Text - Only show if there's content and not finished */}
          {transcribedText.length > 0 && !hasFinished && (
            <View style={styles.transcriptCard}>
              <Text style={styles.transcriptTitle}>what we heard:</Text>
              <Text style={styles.transcriptText}>{transcribedText}</Text>
            </View>
          )}

          {/* Results Display */}
          {hasFinished && (
            <View style={styles.resultsCard}>
              <Text style={styles.resultsTitle}>challenge complete! 🎉</Text>

              <View style={styles.resultsGrid}>
                <View style={styles.resultItem}>
                  <Text style={styles.resultLabel}>accuracy</Text>
                  <Text style={[styles.resultValue, { color: colors.quaternary }]}>
                    {score}%
                  </Text>
                </View>
                <View style={styles.resultItem}>
                  <Text style={styles.resultLabel}>wpm</Text>
                  <Text style={[styles.resultValue, { color: colors.secondary }]}>
                    {wpm}
                  </Text>
                </View>
                <View style={styles.resultItem}>
                  <Text style={styles.resultLabel}>time</Text>
                  <Text style={[styles.resultValue, { color: colors.accent }]}>
                    {formatTime(elapsedTime)}
                  </Text>
                </View>
              </View>

              {/* Challenge Score & Rank */}
              {challengeScore !== null && (
                <View style={styles.scoreCard}>
                  <Text style={styles.scoreTitle}>challenge score</Text>
                  <Text style={styles.scoreValueLarge}>+{challengeScore}</Text>
                  {rankInfo && (
                    <View style={styles.rankDisplay}>
                      <Text style={styles.rankEmoji}>{rankInfo.rankInfo.emoji}</Text>
                      <Text style={styles.rankName}>{rankInfo.rankInfo.name}</Text>
                      {rankedUp && (
                        <Text style={styles.rankUpBadge}>⬆️ RANK UP!</Text>
                      )}
                    </View>
                  )}
                </View>
              )}

              <Text style={styles.performanceLabel}>
                {score >= 90 && wpm >= 100
                  ? 'outstanding! 🌟'
                  : score >= 80 && wpm >= 80
                  ? 'excellent work! 🎯'
                  : score >= 70 && wpm >= 60
                  ? 'great effort! 💪'
                  : 'keep practicing! 📚'}
              </Text>

              {/* AI Feedback */}
              {aiFeedback && (
                <View style={styles.feedbackContainer}>
                  <View style={styles.feedbackHeader}>
                    <Ionicons name="bulb" size={20} color={colors.secondary} />
                    <Text style={styles.feedbackTitle}>ai coach says:</Text>
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
                      Alert.alert('error', 'failed to play pronunciation audio');
                    }
                    setIsPlayingAudio(false);
                  }}
                  disabled={isPlayingAudio}
                  activeOpacity={0.8}
                >
                  <Ionicons
                    name={isPlayingAudio ? "volume-high" : "volume-medium"}
                    size={20}
                    color="#fff"
                  />
                  <Text style={styles.pronunciationButtonText}>
                    {isPlayingAudio ? 'playing...' : 'hear missed words'}
                  </Text>
                </TouchableOpacity>
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

        {/* Microphone Button - Fixed at bottom, outside ScrollView */}
        {!hasFinished && (
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
                  size={40}
                  color={colors.accentForeground}
                />
              )}
            </TouchableOpacity>
            <Text style={styles.microphoneLabel}>
              {isProcessing
                ? 'processing...'
                : isRecording
                ? 'tap to stop'
                : 'tap to start'}
            </Text>
          </View>
        )}
      </View>
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
  headerTitle: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.extraBold,
    color: colors.foreground,
    textTransform: 'lowercase',
  },
  headerCenter: {
    alignItems: 'center',
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
  metricsBar: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    justifyContent: 'space-around',
    borderBottomWidth: 2,
    borderBottomColor: colors.border,
  },
  metricItem: {
    alignItems: 'center',
    flex: 1,
  },
  metricLabel: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.medium,
    color: colors.mutedForeground,
    marginTop: spacing.xs,
    textTransform: 'lowercase',
  },
  metricValue: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.extraBold,
    color: colors.foreground,
    marginTop: 2,
  },
  contentWrapper: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: spacing.lg,
    paddingBottom: spacing.xl + 120, // Extra padding for fixed mic button
  },
  instructionCard: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 2,
    borderColor: colors.secondary,
    ...shadows.card,
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
  instructionTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.extraBold,
    color: colors.foreground,
    marginBottom: spacing.xs,
    textTransform: 'lowercase',
  },
  instructionText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.regular,
    color: colors.mutedForeground,
    lineHeight: 20,
    textTransform: 'lowercase',
  },
  textCard: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 2,
    borderColor: colors.accent,
    maxHeight: 200,
    ...shadows.card,
  },
  textTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.extraBold,
    color: colors.foreground,
    marginBottom: spacing.sm,
    textTransform: 'lowercase',
  },
  textScrollView: {
    maxHeight: 150,
  },
  textContent: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  word: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.regular,
    color: colors.foreground,
    lineHeight: 22,
  },
  correctWord: {
    backgroundColor: colors.quaternary,
    color: colors.foreground,
    paddingHorizontal: 3,
    borderRadius: 3,
    fontWeight: fontWeight.bold,
  },
  incorrectWord: {
    backgroundColor: colors.secondary,
    color: colors.foreground,
    paddingHorizontal: 3,
    borderRadius: 3,
    fontWeight: fontWeight.bold,
  },
  microphoneContainer: {
    position: 'absolute',
    bottom: spacing.lg,
    left: 0,
    right: 0,
    alignItems: 'center',
    backgroundColor: colors.background,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
    borderTopWidth: 2,
    borderTopColor: colors.border,
    ...shadows.hard,
  },
  microphoneButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: colors.foreground,
    ...shadows.hard,
  },
  microphoneButtonActive: {
    backgroundColor: colors.secondary,
  },
  microphoneButtonProcessing: {
    backgroundColor: colors.tertiary,
  },
  microphoneLabel: {
    marginTop: spacing.sm,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.mutedForeground,
    textTransform: 'lowercase',
  },
  transcriptCard: {
    backgroundColor: colors.muted,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 2,
    borderColor: colors.border,
  },
  transcriptTitle: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.extraBold,
    color: colors.foreground,
    marginBottom: spacing.xs,
    textTransform: 'lowercase',
  },
  transcriptText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.regular,
    color: colors.mutedForeground,
    lineHeight: 20,
  },
  resultsCard: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.secondary,
    marginBottom: spacing.xl,
    ...shadows.card,
  },
  resultsTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.extraBold,
    color: colors.foreground,
    marginBottom: spacing.md,
    textTransform: 'lowercase',
  },
  resultsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginBottom: spacing.md,
  },
  resultItem: {
    alignItems: 'center',
    flex: 1,
  },
  resultLabel: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.medium,
    color: colors.mutedForeground,
    marginBottom: spacing.xs,
    textTransform: 'lowercase',
  },
  resultValue: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.extraBold,
  },
  performanceLabel: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.medium,
    color: colors.mutedForeground,
    marginBottom: spacing.md,
    textAlign: 'center',
    textTransform: 'lowercase',
  },
  feedbackContainer: {
    backgroundColor: colors.muted,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.md,
    borderLeftWidth: 4,
    borderLeftColor: colors.secondary,
    width: '100%',
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
    textTransform: 'lowercase',
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
    width: '100%',
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
  scoreCard: {
    backgroundColor: colors.muted,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginVertical: spacing.md,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.accent,
    width: '100%',
  },
  scoreTitle: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    color: colors.mutedForeground,
    textTransform: 'lowercase',
    marginBottom: spacing.xs,
  },
  scoreValueLarge: {
    fontSize: fontSize.xxxl,
    fontWeight: fontWeight.extraBold,
    color: colors.accent,
    marginBottom: spacing.sm,
  },
  rankDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  rankEmoji: {
    fontSize: 24,
  },
  rankName: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.foreground,
    textTransform: 'lowercase',
  },
  rankUpBadge: {
    backgroundColor: colors.secondary,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    fontSize: fontSize.xs,
    fontWeight: fontWeight.extraBold,
    color: colors.foreground,
    marginLeft: spacing.xs,
  },
});

export default ChallengeModeScreen;
