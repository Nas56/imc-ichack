/**
 * Passage Generation Service using Claude API
 * Dynamically generates reading passages based on difficulty
 */

import Anthropic from '@anthropic-ai/sdk';
import { CLAUDE_API_KEY } from '../../config';

// Initialize Anthropic client
const anthropic = new Anthropic({
  apiKey: CLAUDE_API_KEY,
});

// Topic categories for variety
const TOPIC_CATEGORIES = [
  'Nature and animals',
  'Space and astronomy',
  'Ocean life and marine biology',
  'Adventures and exploration',
  'Everyday life experiences',
  'Historical events',
  'Technology and inventions',
  'Sports and hobbies',
  'Art and music',
  'Food and cooking',
  'Weather and seasons',
  'Transportation and travel',
  'Friendship and relationships',
  'Problem-solving and creativity',
  'Science experiments and discoveries',
];

// Difficulty specifications
const DIFFICULTY_SPECS = {
  easy: {
    readingTime: 10,
    vocabularyLevel: 'very simple and basic',
    sentenceStructure: 'short, simple sentences',
    wordCount: '25-35',
    ageGroup: '8-10 years old',
    examples: 'Use words like: cat, dog, sun, play, happy, run, eat',
  },
  medium: {
    readingTime: 20,
    vocabularyLevel: 'moderate complexity with some challenging words',
    sentenceStructure: 'varied sentence lengths with compound sentences',
    wordCount: '50-70',
    ageGroup: '11-13 years old',
    examples: 'Use words like: ancient, mysterious, discovered, adventure, magnificent',
  },
  hard: {
    readingTime: 30,
    vocabularyLevel: 'advanced and sophisticated',
    sentenceStructure: 'complex sentences with clauses and advanced grammar',
    wordCount: '80-100',
    ageGroup: '13-16 years old',
    examples: 'Use words like: phenomenon, unprecedented, meticulously, remarkable, sophisticated',
  },
};

/**
 * Generate a reading passage using Claude API
 * @param {string} difficulty - 'easy', 'medium', or 'hard'
 * @returns {Promise<Object>} Generated passage object { text, estimatedSeconds }
 */
export const generatePassage = async (difficulty = 'easy') => {
  try {
    const spec = DIFFICULTY_SPECS[difficulty];

    if (!spec) {
      throw new Error(`Invalid difficulty: ${difficulty}`);
    }

    // Select a random topic to ensure variety
    const randomTopic = TOPIC_CATEGORIES[Math.floor(Math.random() * TOPIC_CATEGORIES.length)];

    // Add timestamp to ensure uniqueness
    const timestamp = Date.now();

    console.log(`Generating ${difficulty} passage (topic: ${randomTopic})...`);

    const prompt = `Generate a UNIQUE and ORIGINAL reading passage for a reading practice app with these exact specifications:

DIFFICULTY LEVEL: ${difficulty.toUpperCase()}
TARGET AGE: ${spec.ageGroup}
WORD COUNT: ${spec.wordCount} words
READING TIME: Approximately ${spec.readingTime} seconds when read aloud
VOCABULARY: ${spec.vocabularyLevel}
SENTENCE STRUCTURE: ${spec.sentenceStructure}
TOPIC FOCUS: ${randomTopic}

CRITICAL REQUIREMENTS:
1. This passage MUST be completely different from any previous passages
2. Create an engaging, age-appropriate story or description
3. Make it interesting and relatable to young readers
4. Use clear, proper grammar and punctuation
5. Avoid controversial or sensitive topics
6. Make it educational and positive
7. ${spec.examples}
8. Be creative and original - avoid clichés
9. Include specific details to make it unique

CREATIVE GUIDELINES:
- Tell a mini-story or describe a specific scenario
- Include sensory details (sights, sounds, feelings)
- Use varied vocabulary within the appropriate level
- Make it memorable and engaging

OUTPUT FORMAT:
Return ONLY the passage text, no titles, no explanations, no metadata.
The passage should be complete and ready to read aloud.

Request ID: ${timestamp}`;

    const message = await anthropic.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 300,
      temperature: 1.0, // Maximum creativity for varied passages
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    const generatedText = message.content[0].text.trim();

    console.log(`✅ Generated ${difficulty} passage (${generatedText.split(' ').length} words)`);

    return {
      id: `generated-${difficulty}-${Date.now()}`,
      text: generatedText,
      estimatedSeconds: spec.readingTime,
      difficulty,
      generatedAt: new Date().toISOString(),
    };
  } catch (error) {
    console.error('Error generating passage with Claude:', error);
    throw error;
  }
};

/**
 * Generate multiple passages at once (for preloading)
 * @param {string} difficulty - 'easy', 'medium', or 'hard'
 * @param {number} count - Number of passages to generate
 * @returns {Promise<Array>} Array of generated passages
 */
export const generateMultiplePassages = async (difficulty, count = 3) => {
  try {
    console.log(`Generating ${count} ${difficulty} passages...`);

    const promises = Array(count)
      .fill(null)
      .map(() => generatePassage(difficulty));

    const passages = await Promise.all(promises);

    console.log(`✅ Generated ${count} ${difficulty} passages`);
    return passages;
  } catch (error) {
    console.error('Error generating multiple passages:', error);
    throw error;
  }
};

export default {
  generatePassage,
  generateMultiplePassages,
};
