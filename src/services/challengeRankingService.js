/**
 * Challenge Ranking Service
 * Handles cumulative challenge scoring and rank progression
 * Separate from the per-challenge Bronze/Silver/Gold system
 */

// Rank titles and emojis (0-5)
export const RANKS = {
  0: { name: 'Novice', emoji: '🌱', color: '#94a3b8' },
  1: { name: 'Reader', emoji: '📖', color: '#60a5fa' },
  2: { name: 'Scholar', emoji: '🎓', color: '#a78bfa' },
  3: { name: 'Expert', emoji: '🏅', color: '#f59e0b' },
  4: { name: 'Master', emoji: '💎', color: '#ec4899' },
  5: { name: 'Legend', emoji: '👑', color: '#eab308' },
};

// Points required to reach each rank
// Progressive difficulty: need more challenges for higher ranks
const RANK_THRESHOLDS = {
  0: 0,      // Starting rank
  1: 300,    // ~10 good challenges to reach rank 1
  2: 800,    // ~17 more good challenges
  3: 1600,   // ~27 more good challenges
  4: 2800,   // ~40 more good challenges
  5: 4500,   // ~57 more good challenges
};

/**
 * Calculate challenge score based on difficulty, WPM, and accuracy
 * @param {number} difficulty - Difficulty rating from Claude (1-10)
 * @param {number} wpm - Words per minute achieved
 * @param {number} accuracyPercent - Accuracy percentage (0-100)
 * @returns {number} Challenge score earned
 */
export const calculateChallengeScore = (difficulty, wpm, accuracyPercent) => {
  // Base score from accuracy (0-40 points)
  const accuracyScore = (accuracyPercent / 100) * 40;

  // WPM score (0-30 points)
  // Scale: 60 WPM = 10 pts, 100 WPM = 20 pts, 150 WPM = 30 pts
  const wpmScore = Math.min((wpm / 150) * 30, 30);

  // Difficulty multiplier (0.5x to 2.0x)
  // Difficulty 1-3 = 0.5x-0.8x (easier passages)
  // Difficulty 4-6 = 0.9x-1.2x (medium passages)
  // Difficulty 7-10 = 1.3x-2.0x (harder passages)
  const difficultyMultiplier = 0.5 + (difficulty / 10) * 1.5;

  // Calculate final score
  const baseScore = accuracyScore + wpmScore;
  const finalScore = Math.floor(baseScore * difficultyMultiplier);

  return Math.max(0, finalScore);
};

/**
 * Get current rank and progress based on total challenge score
 * @param {number} totalScore - Total accumulated challenge score
 * @returns {Object} { rank, nextRank, scoreToNextRank, progressPercent, rankInfo }
 */
export const getRankInfo = (totalScore) => {
  let currentRank = 0;

  // Find current rank
  for (let rank = 5; rank >= 0; rank--) {
    if (totalScore >= RANK_THRESHOLDS[rank]) {
      currentRank = rank;
      break;
    }
  }

  // Calculate progress to next rank
  const nextRank = currentRank < 5 ? currentRank + 1 : 5;
  const currentThreshold = RANK_THRESHOLDS[currentRank];
  const nextThreshold = RANK_THRESHOLDS[nextRank];
  const scoreToNextRank = Math.max(nextThreshold - totalScore, 0);

  const progressInRank = totalScore - currentThreshold;
  const scoreNeededForRank = nextThreshold - currentThreshold;
  const progressPercent = scoreNeededForRank > 0
    ? Math.min(progressInRank / scoreNeededForRank, 1)
    : 1;

  return {
    rank: currentRank,
    nextRank,
    scoreToNextRank,
    progressPercent,
    rankInfo: RANKS[currentRank],
    nextRankInfo: RANKS[nextRank],
    isMaxRank: currentRank === 5,
  };
};

/**
 * Calculate new rank info after earning challenge score
 * @param {number} currentScore - Current total challenge score
 * @param {number} earnedScore - Score just earned
 * @returns {Object} { newTotalScore, oldRank, newRank, rankedUp }
 */
export const addChallengeScore = (currentScore, earnedScore) => {
  const oldRankInfo = getRankInfo(currentScore);
  const newTotalScore = currentScore + earnedScore;
  const newRankInfo = getRankInfo(newTotalScore);
  const rankedUp = newRankInfo.rank > oldRankInfo.rank;

  return {
    newTotalScore,
    oldRank: oldRankInfo.rank,
    newRank: newRankInfo.rank,
    rankedUp,
    earnedScore,
  };
};

/**
 * Get rank threshold for a specific rank
 * @param {number} rank - Rank number (0-5)
 * @returns {number} Score required to reach that rank
 */
export const getRankThreshold = (rank) => {
  return RANK_THRESHOLDS[rank] || 0;
};

/**
 * Get a motivational message based on rank
 * @param {number} rank - Current rank (0-5)
 * @returns {string} Motivational message
 */
export const getRankMessage = (rank) => {
  const messages = {
    0: "begin your challenge journey",
    1: "building challenge skills",
    2: "impressive progress",
    3: "exceptional performance",
    4: "mastering the challenges",
    5: "legendary champion",
  };

  return messages[rank] || messages[0];
};

/**
 * Estimate difficulty of a passage (fallback if Claude assessment fails)
 * @param {string} text - The passage text
 * @returns {number} Estimated difficulty (1-10)
 */
export const estimateDifficulty = (text) => {
  const words = text.split(/\s+/);
  const avgWordLength = words.reduce((sum, word) => sum + word.length, 0) / words.length;
  const sentenceCount = (text.match(/[.!?]+/g) || []).length;
  const avgWordsPerSentence = words.length / Math.max(sentenceCount, 1);

  // Simple heuristic: longer words and sentences = harder
  let difficulty = 1;

  if (avgWordLength > 6) difficulty += 2;
  else if (avgWordLength > 5) difficulty += 1;

  if (avgWordsPerSentence > 20) difficulty += 3;
  else if (avgWordsPerSentence > 15) difficulty += 2;
  else if (avgWordsPerSentence > 10) difficulty += 1;

  if (words.length > 80) difficulty += 2;
  else if (words.length > 50) difficulty += 1;

  return Math.min(Math.max(difficulty, 1), 10);
};

export default {
  RANKS,
  calculateChallengeScore,
  getRankInfo,
  addChallengeScore,
  getRankThreshold,
  getRankMessage,
  estimateDifficulty,
};
