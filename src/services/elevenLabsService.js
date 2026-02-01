import { Audio } from 'expo-av';
import { ELEVENLABS_API_KEY } from '../../config';

const ELEVENLABS_API_URL = 'https://api.elevenlabs.io/v1/text-to-speech';
// Using the default voice "Rachel" - a clear, friendly voice
const DEFAULT_VOICE_ID = '21m00Tcm4TlvDq8ikWAM';

// Track currently playing sounds to allow stopping
let currentSounds = [];
let shouldStop = false;
let currentSound = null;
let isPaused = false;

/**
 * Convert text to speech using ElevenLabs API and play it
 * @param {string} text - The text to convert to speech
 * @returns {Promise<void>}
 */
export const speakText = async (text) => {
  try {
    console.log('Generating speech for:', text);

    // Reset shouldStop flag for new playback
    shouldStop = false;

    // Call ElevenLabs API
    const response = await fetch(
      `${ELEVENLABS_API_URL}/${DEFAULT_VOICE_ID}`,
      {
        method: 'POST',
        headers: {
          'Accept': 'audio/mpeg',
          'Content-Type': 'application/json',
          'xi-api-key': ELEVENLABS_API_KEY,
        },
        body: JSON.stringify({
          text: text,
          model_id: 'eleven_monolingual_v1',
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75,
          },
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('ElevenLabs API error:', errorText);
      throw new Error(`ElevenLabs API error: ${response.status}`);
    }

    // Get audio blob
    const audioBlob = await response.blob();
    console.log('Audio blob size:', audioBlob.size, 'bytes');

    // Convert blob to base64 for React Native
    const reader = new FileReader();
    reader.readAsDataURL(audioBlob);

    return new Promise((resolve, reject) => {
      reader.onloadend = async () => {
        try {
          const base64Audio = reader.result;

          // Configure audio mode for playback
          await Audio.setAudioModeAsync({
            allowsRecordingIOS: false,
            playsInSilentModeIOS: true,
            shouldDuckAndroid: true,
            playThroughEarpieceAndroid: false,
          });

          // Create and play sound
          const { sound } = await Audio.Sound.createAsync(
            { uri: base64Audio },
            { shouldPlay: true }
          );

          // Track this sound
          currentSounds.push(sound);
          currentSound = sound;

          // Clean up after playback
          sound.setOnPlaybackStatusUpdate((status) => {
            if (status.didJustFinish) {
              currentSounds = currentSounds.filter(s => s !== sound);
              if (currentSound === sound) {
                currentSound = null;
                isPaused = false;
              }
              sound.unloadAsync();
              resolve();
            }
          });

          // Check if we should stop
          if (shouldStop) {
            sound.stopAsync();
            currentSounds = currentSounds.filter(s => s !== sound);
            sound.unloadAsync();
            reject(new Error('Audio stopped'));
          }
        } catch (error) {
          console.error('Audio playback error:', error);
          reject(error);
        }
      };

      reader.onerror = () => {
        console.error('FileReader error:', reader.error);
        reject(reader.error);
      };
    });
  } catch (error) {
    console.error('ElevenLabs speech generation error:', error);
    throw error;
  }
};

/**
 * Speak multiple words with a pause between each
 * @param {string[]} words - Array of words to speak
 * @returns {Promise<void>}
 */
export const speakWords = async (words) => {
  try {
    if (words.length === 0) return;

    shouldStop = false;

    // Speak words one by one with pauses
    for (const word of words) {
      if (shouldStop) break;
      await speakText(word);
      // Small pause between words
      if (!shouldStop) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }
  } catch (error) {
    console.error('Error speaking words:', error);
    throw error;
  }
};

/**
 * Stop all currently playing audio
 */
export const stopAllAudio = async () => {
  shouldStop = true;
  isPaused = false;
  const sounds = [...currentSounds];
  currentSounds = [];
  currentSound = null;

  for (const sound of sounds) {
    try {
      await sound.stopAsync();
      await sound.unloadAsync();
    } catch (error) {
      console.error('Error stopping sound:', error);
    }
  }
};

/**
 * Pause currently playing audio
 */
export const pauseAudio = async () => {
  if (currentSound) {
    try {
      await currentSound.pauseAsync();
      isPaused = true;
    } catch (error) {
      console.error('Error pausing audio:', error);
    }
  }
};

/**
 * Resume paused audio
 */
export const resumeAudio = async () => {
  if (currentSound && isPaused) {
    try {
      await currentSound.playAsync();
      isPaused = false;
    } catch (error) {
      console.error('Error resuming audio:', error);
    }
  }
};

/**
 * Check if audio is currently playing
 */
export const isAudioPlaying = () => {
  return currentSound !== null && !isPaused;
};

/**
 * Check if audio is paused
 */
export const isAudioPaused = () => {
  return isPaused;
};
