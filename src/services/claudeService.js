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
