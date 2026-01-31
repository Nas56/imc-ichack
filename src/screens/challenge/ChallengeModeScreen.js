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
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Challenge Mode</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Timer and Metrics Bar */}
      <View style={styles.metricsBar}>
        <View style={styles.metricItem}>
          <Ionicons name="time-outline" size={20} color={colors.accent} />
          <Text style={styles.metricLabel}>Time</Text>
          <Text style={styles.metricValue}>{formatTime(elapsedTime)}</Text>
        </View>
        {wpm !== null && (
          <View style={styles.metricItem}>
            <Ionicons name="speedometer-outline" size={20} color={colors.secondary} />
            <Text style={styles.metricLabel}>WPM</Text>
            <Text style={styles.metricValue}>{wpm}</Text>
          </View>
        )}
        {score !== null && (
          <View style={styles.metricItem}>
            <Ionicons name="checkmark-circle-outline" size={20} color={colors.primary} />
            <Text style={styles.metricLabel}>Accuracy</Text>
            <Text style={styles.metricValue}>{score}%</Text>
          </View>
        )}
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
      >
        {/* Instructions */}
        {!isRecording && !hasFinished && (
          <View style={styles.instructionCard}>
            <Text style={styles.instructionTitle}>⚡ Challenge Rules:</Text>
            <Text style={styles.instructionText}>
              1. Read the passage as quickly AND accurately as you can{'\n'}
              2. Your time and WPM will be tracked{'\n'}
              3. Try to beat your personal best!
            </Text>
          </View>
        )}

        {/* Text Display */}
        <View style={styles.textCard}>
          <Text style={styles.textTitle}>
            {hasFinished ? 'Your Performance:' : 'Read this passage:'}
          </Text>
          <View style={styles.textContent}>
            {wordStates.length > 0 ? (
              wordStates.map((wordState, index) => renderWord(wordState, index))
            ) : (
              <Text style={styles.word}>{CHALLENGE_TEXT}</Text>
            )}
          </View>
        </View>

        {/* Microphone Button */}
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
                : 'Tap to start challenge'}
            </Text>
          </View>
        )}

        {/* Transcribed Text */}
        {transcribedText.length > 0 && (
          <View style={styles.transcriptCard}>
            <Text style={styles.transcriptTitle}>What we heard:</Text>
            <Text style={styles.transcriptText}>{transcribedText}</Text>
          </View>
        )}

        {/* Results Display */}
        {hasFinished && (
          <View style={styles.resultsCard}>
            <Text style={styles.resultsTitle}>Challenge Complete! 🎉</Text>

            <View style={styles.resultsGrid}>
              <View style={styles.resultItem}>
                <Text style={styles.resultLabel}>Accuracy</Text>
                <Text style={[styles.resultValue, { color: colors.primary }]}>
                  {score}%
                </Text>
              </View>
              <View style={styles.resultItem}>
                <Text style={styles.resultLabel}>WPM</Text>
                <Text style={[styles.resultValue, { color: colors.secondary }]}>
                  {wpm}
                </Text>
              </View>
              <View style={styles.resultItem}>
                <Text style={styles.resultLabel}>Time</Text>
                <Text style={[styles.resultValue, { color: colors.accent }]}>
                  {formatTime(elapsedTime)}
                </Text>
              </View>
            </View>

            <Text style={styles.performanceLabel}>
              {score >= 90 && wpm >= 100
                ? 'Outstanding! 🌟'
                : score >= 80 && wpm >= 80
                ? 'Excellent work! 🎯'
                : score >= 70 && wpm >= 60
                ? 'Great effort! 💪'
                : 'Keep practicing! 📚'}
            </Text>

            <TouchableOpacity
              style={styles.tryAgainButton}
              onPress={resetSession}
            >
              <Text style={styles.tryAgainText}>Try Again</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
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
  headerTitle: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  placeholder: {
    width: 40,
  },
  metricsBar: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    justifyContent: 'space-around',
    borderBottomWidth: 1,
    borderBottomColor: '#E8E8E8',
  },
  metricItem: {
    alignItems: 'center',
    flex: 1,
  },
  metricLabel: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.regular,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  metricValue: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginTop: 2,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: spacing.lg,
  },
  instructionCard: {
    backgroundColor: '#FFF9E6',
    borderRadius: 16,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    borderWidth: 2,
    borderColor: colors.secondary,
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
    borderRadius: 16,
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
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
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
    borderRadius: 16,
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
  resultsCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: spacing.xl,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.secondary,
  },
  resultsTitle: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.lg,
  },
  resultsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginBottom: spacing.lg,
  },
  resultItem: {
    alignItems: 'center',
    flex: 1,
  },
  resultLabel: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.textMuted,
    marginBottom: spacing.xs,
  },
  resultValue: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
  },
  performanceLabel: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.medium,
    color: colors.textLight,
    marginBottom: spacing.lg,
    textAlign: 'center',
  },
  tryAgainButton: {
    backgroundColor: colors.accent,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: 12,
    marginTop: spacing.md,
  },
  tryAgainText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: '#fff',
  },
});

export default ChallengeModeScreen;
