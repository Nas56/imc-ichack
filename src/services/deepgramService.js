import { DEEPGRAM_API_KEY } from '../../config';

const DEEPGRAM_API_URL = 'https://api.deepgram.com/v1/listen';

/**
 * Transcribe audio using Deepgram's REST API
 * @param {string} audioUri - The URI of the audio file to transcribe
 * @returns {Promise<string>} The transcribed text
 */
export const transcribeAudio = async (audioUri) => {
  try {
    console.log('Starting transcription for:', audioUri);

    // Read the audio file
    const response = await fetch(audioUri);
    const audioBlob = await response.blob();

    console.log('Audio blob size:', audioBlob.size, 'bytes');

    // Create FormData to send the audio
    const formData = new FormData();
    formData.append('audio', {
      uri: audioUri,
      type: 'audio/m4a', // Expo records in m4a format by default
      name: 'audio.m4a',
    });

    // Send to Deepgram API
    const deepgramResponse = await fetch(
      `${DEEPGRAM_API_URL}?model=nova-2&smart_format=true&punctuate=true`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Token ${DEEPGRAM_API_KEY}`,
          'Content-Type': 'audio/m4a',
        },
        body: audioBlob,
      }
    );

    if (!deepgramResponse.ok) {
      const errorText = await deepgramResponse.text();
      console.error('Deepgram API error:', errorText);
      throw new Error(`Deepgram API error: ${deepgramResponse.status}`);
    }

    const result = await deepgramResponse.json();
    console.log('Deepgram response:', JSON.stringify(result, null, 2));

    const transcript = result.results?.channels?.[0]?.alternatives?.[0]?.transcript || '';
    console.log('Transcript:', transcript);

    return transcript;
  } catch (error) {
    console.error('Deepgram transcription error:', error);
    throw error;
  }
};
