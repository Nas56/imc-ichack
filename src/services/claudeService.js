import Anthropic from '@anthropic-ai/sdk';
import { CLAUDE_API_KEY } from '../../config';

/**
 * Generate AI feedback for Learn Mode performance
 * @param {number} accuracy - Accuracy percentage (0-100)
 * @param {string[]} incorrectWords - List of words that were said incorrectly
 * @returns {Promise<string>} Two lines of personalized feedback
 */
export const generateLearnModeFeedback = async (accuracy, incorrectWords) => {
  try {
    const anthropic = new Anthropic({
      apiKey: CLAUDE_API_KEY,
    });

    const incorrectWordsList = incorrectWords.length > 0
      ? incorrectWords.join(', ')
      : 'none';

    const message = await anthropic.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 150,
      messages: [{
        role: 'user',
        content: `You are a supportive reading tutor for children. A student just completed a reading exercise with ${accuracy}% accuracy. They had trouble with these words: ${incorrectWordsList}.

Provide exactly 2 simple sentences of encouraging feedback to help them improve. Use plain text only, no formatting, no asterisks, no special characters. Keep it friendly and specific.`
      }]
    });

    const feedback = message.content[0].text.trim();
    return feedback;
  } catch (error) {
    console.error('Claude API error:', error);
    return 'Great effort! Keep practicing those tricky words and you\'ll improve even more.';
  }
};

/**
 * Generate AI feedback for Challenge Mode performance
 * @param {number} accuracy - Accuracy percentage (0-100)
 * @param {number} wpm - Words per minute
 * @param {string[]} incorrectWords - List of words that were said incorrectly
 * @returns {Promise<string>} Two lines of personalized feedback
 */
export const generateChallengeModeFeedback = async (accuracy, wpm, incorrectWords) => {
  try {
    const anthropic = new Anthropic({
      apiKey: CLAUDE_API_KEY,
    });

    const incorrectWordsList = incorrectWords.length > 0
      ? incorrectWords.join(', ')
      : 'none';

    const message = await anthropic.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 150,
      messages: [{
        role: 'user',
        content: `You are a supportive reading coach for children. A student completed a timed reading challenge with ${accuracy}% accuracy and ${wpm} words per minute. They struggled with: ${incorrectWordsList}.

Provide exactly 2 simple sentences of encouraging feedback about their speed and accuracy. Use plain text only, no formatting, no asterisks, no special characters. Be friendly and specific.`
      }]
    });

    const feedback = message.content[0].text.trim();
    return feedback;
  } catch (error) {
    console.error('Claude API error:', error);
    return 'Good job! Practice reading smoothly while maintaining accuracy for even better results.';
  }
};

/**
 * Assess the difficulty of a reading passage
 * @param {string} passageText - The text to assess
 * @returns {Promise<number>} Difficulty rating from 1-10
 */
export const assessPassageDifficulty = async (passageText) => {
  try {
    const anthropic = new Anthropic({
      apiKey: CLAUDE_API_KEY,
    });

    const message = await anthropic.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 50,
      messages: [{
        role: 'user',
        content: `Rate the reading difficulty of this passage for children ages 8-14 on a scale of 1-10, where:
1-3 = Easy (simple vocabulary, short sentences)
4-6 = Medium (moderate vocabulary, varied sentence structure)
7-10 = Hard (complex vocabulary, long sentences, advanced concepts)

Passage: "${passageText}"

Respond with ONLY a single number from 1 to 10. No explanation, just the number.`
      }]
    });

    const response = message.content[0].text.trim();
    const difficulty = parseInt(response, 10);

    // Validate the response is a number between 1-10
    if (isNaN(difficulty) || difficulty < 1 || difficulty > 10) {
      console.warn('Invalid difficulty rating from Claude:', response);
      // Fallback to estimating based on text characteristics
      const { estimateDifficulty } = require('./challengeRankingService');
      return estimateDifficulty(passageText);
    }

    return difficulty;
  } catch (error) {
    console.error('Claude API error assessing difficulty:', error);
    // Fallback to local estimation
    const { estimateDifficulty } = require('./challengeRankingService');
    return estimateDifficulty(passageText);
  }
};
