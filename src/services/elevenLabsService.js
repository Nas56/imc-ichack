import { Audio } from 'expo-av';
import { ELEVENLABS_API_KEY } from '../../config';

const ELEVENLABS_API_URL = 'https://api.elevenlabs.io/v1/text-to-speech';
// Using the default voice "Rachel" - a clear, friendly voice
const DEFAULT_VOICE_ID = '21m00Tcm4TlvDq8ikWAM';

/**
 * Convert text to speech using ElevenLabs API and play it
 * @param {string} text - The text to convert to speech
 * @returns {Promise<void>}
 */
export const speakText = async (text) => {
  try {
    console.log('Generating speech for:', text);

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

          // Clean up after playback
          sound.setOnPlaybackStatusUpdate((status) => {
            if (status.didJustFinish) {
              sound.unloadAsync();
              resolve();
            }
          });
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

    // Speak words one by one with pauses
    for (const word of words) {
      await speakText(word);
      // Small pause between words
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  } catch (error) {
    console.error('Error speaking words:', error);
    throw error;
  }
};
