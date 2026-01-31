import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  SafeAreaView,
} from 'react-native';
import { Audio } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';
import { transcribeAudio } from '../../services/deepgramService';
import { colors, fontSize, fontWeight, spacing, borderRadius, shadows } from '../../theme';

// Challenge text - slightly longer and more complex
const CHALLENGE_TEXT = "The ancient library stood tall against the evening sky, its weathered stone walls holding countless stories within. Scholars from distant lands traveled for months to access its vast collection of manuscripts and scrolls. Each book was a treasure, carefully preserved by generations of dedicated librarians who understood the immense value of knowledge.";

const ChallengeModeScreen = ({ onBack }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [transcribedText, setTranscribedText] = useState('');
  const [wordStates, setWordStates] = useState([]);
  const [score, setScore] = useState(null);
  const [wpm, setWpm] = useState(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [hasFinished, setHasFinished] = useState(false);

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

  const compareTexts = (transcript, timeInSeconds) => {
    // Normalize texts
    const normalizeText = (text) =>
      text.toLowerCase()
        .replace(/[.,!?;:]/g, '')
        .split(/\s+/)
        .filter(word => word.length > 0);

    const challengeWords = normalizeText(CHALLENGE_TEXT);
    const transcriptWords = normalizeText(transcript);

    // Create word states with comparison
    const states = challengeWords.map((word, index) => {
      const wasSpoken = transcriptWords.includes(word);
      return {
        word: CHALLENGE_TEXT.split(/\s+/)[index],
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

    setScore(percentage);
    setWpm(wordsPerMinute);
    setHasFinished(true);
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
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
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

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>challenge mode</Text>
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
          {!isRecording && !hasFinished && (
            <View style={styles.instructionCard}>
              <Text style={styles.instructionTitle}>⚡ challenge rules</Text>
              <Text style={styles.instructionText}>
                read the passage quickly and accurately. your time and accuracy will be tracked.
              </Text>
            </View>
          )}

          {/* Text Display */}
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
                  <Text style={styles.word}>{CHALLENGE_TEXT}</Text>
                )}
              </View>
            </ScrollView>
          </View>

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

              <Text style={styles.performanceLabel}>
                {score >= 90 && wpm >= 100
                  ? 'outstanding! 🌟'
                  : score >= 80 && wpm >= 80
                  ? 'excellent work! 🎯'
                  : score >= 70 && wpm >= 60
                  ? 'great effort! 💪'
                  : 'keep practicing! 📚'}
              </Text>

              <TouchableOpacity
                style={styles.tryAgainButton}
                onPress={resetSession}
              >
                <Text style={styles.tryAgainText}>try again</Text>
              </TouchableOpacity>
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
    paddingTop: spacing.sm,
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
  placeholder: {
    width: 40,
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
  tryAgainButton: {
    backgroundColor: colors.accent,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.full,
    borderWidth: 2,
    borderColor: colors.foreground,
    ...shadows.hard,
  },
  tryAgainText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.accentForeground,
    textTransform: 'lowercase',
  },
});

export default ChallengeModeScreen;
