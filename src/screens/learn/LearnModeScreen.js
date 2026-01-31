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

// Hardcoded text extract for now
const BOOK_EXTRACT = "The sun was setting behind the mountains, casting long shadows across the valley. Birds chirped their evening songs as the cool breeze rustled through the trees. It was a peaceful moment, one that reminded me of home.";

const LearnModeScreen = ({ onBack }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [transcribedText, setTranscribedText] = useState('');
  const [wordStates, setWordStates] = useState([]);
  const [score, setScore] = useState(null);
  const [hasFinished, setHasFinished] = useState(false);

  const recordingRef = useRef(null);
  const audioPermissionRef = useRef(false);

  useEffect(() => {
    requestAudioPermission();
    return () => {
      // Cleanup on unmount
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

      // Reset audio mode
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
      });

      if (uri) {
        // Transcribe the audio
        const transcript = await transcribeAudio(uri);
        setTranscribedText(transcript);

        // Compare with the extract
        compareTexts(transcript);
      }

      setIsProcessing(false);
    } catch (error) {
      console.error('Failed to stop recording:', error);
      setIsProcessing(false);
      Alert.alert('Error', 'Failed to process recording. Please try again.');
    }
  };

  const compareTexts = (transcript) => {
    // Normalize texts
    const normalizeText = (text) =>
      text.toLowerCase()
        .replace(/[.,!?;:]/g, '')
        .split(/\s+/)
        .filter(word => word.length > 0);

    const extractWords = normalizeText(BOOK_EXTRACT);
    const transcriptWords = normalizeText(transcript);

    // Create word states with comparison
    const states = extractWords.map((word, index) => {
      // Check if the word was said correctly
      const wasSpoken = transcriptWords.includes(word);
      return {
        word: BOOK_EXTRACT.split(/\s+/)[index], // Keep original formatting
        isCorrect: wasSpoken,
        index,
      };
    });

    setWordStates(states);

    // Calculate score
    const correctWords = states.filter(state => state.isCorrect).length;
    const totalWords = states.length;
    const percentage = Math.round((correctWords / totalWords) * 100);

    setScore(percentage);
    setHasFinished(true);
  };

  const resetSession = () => {
    setTranscribedText('');
    setWordStates([]);
    setScore(null);
    setHasFinished(false);
    setIsRecording(false);
    setIsProcessing(false);
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
        <Text style={styles.headerTitle}>Learn Mode</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
      >
        {/* Instructions */}
        <View style={styles.instructionCard}>
          <Text style={styles.instructionTitle}>How it works:</Text>
          <Text style={styles.instructionText}>
            1. Read the text below aloud{'\n'}
            2. Tap the microphone to start recording{'\n'}
            3. Tap again to stop and see your results
          </Text>
        </View>

        {/* Text Display */}
        <View style={styles.textCard}>
          <Text style={styles.textTitle}>Read this passage:</Text>
          <View style={styles.textContent}>
            {wordStates.length > 0 ? (
              wordStates.map((wordState, index) => renderWord(wordState, index))
            ) : (
              <Text style={styles.word}>{BOOK_EXTRACT}</Text>
            )}
          </View>
        </View>

        {/* Microphone Button */}
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

        {/* Transcribed Text */}
        {transcribedText.length > 0 && (
          <View style={styles.transcriptCard}>
            <Text style={styles.transcriptTitle}>What we heard:</Text>
            <Text style={styles.transcriptText}>{transcribedText}</Text>
          </View>
        )}

        {/* Score Display */}
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
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: spacing.lg,
  },
  instructionCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
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
    borderRadius: 16,
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
  scoreCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
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
    marginBottom: spacing.lg,
  },
  tryAgainButton: {
    backgroundColor: colors.primary,
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

export default LearnModeScreen;
