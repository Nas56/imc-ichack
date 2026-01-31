/**
 * Leveling System Service
 * Handles XP calculation and level progression
 */

// Base XP values for each difficulty at 100% accuracy
const BASE_XP = {
  easy: 10,
  medium: 25,
  hard: 50,
};

// XP required for each level (exponential growth)
// Formula: baseXP * (level ^ 1.5)
const calculateXPForLevel = (level) => {
  const baseXP = 100;
  return Math.floor(baseXP * Math.pow(level, 1.5));
};

// Generate XP requirements for levels 1-100
const XP_REQUIREMENTS = {};
for (let i = 1; i <= 100; i++) {
  XP_REQUIREMENTS[i] = calculateXPForLevel(i);
}

/**
 * Calculate XP earned based on difficulty and accuracy percentage
 * @param {string} difficulty - 'easy', 'medium', or 'hard'
 * @param {number} accuracyPercent - Percentage score (0-100)
 * @returns {number} XP earned
 */
export const calculateXP = (difficulty, accuracyPercent) => {
  const baseXP = BASE_XP[difficulty] || BASE_XP.easy;

  // Scale XP based on accuracy
  // 100% = full XP, 90% = 90% XP, etc.
  // Minimum 20% of base XP even for very low scores (to encourage practice)
  const accuracyMultiplier = Math.max(accuracyPercent / 100, 0.2);

  const earnedXP = Math.floor(baseXP * accuracyMultiplier);

  return earnedXP;
};

/**
 * Get current level and progress based on total XP
 * @param {number} totalXP - Total accumulated XP
 * @returns {Object} { level, currentLevelXP, nextLevelXP, xpToNextLevel, progressPercent }
 */
export const getLevelInfo = (totalXP) => {
  let level = 1;
  let xpForCurrentLevel = 0;

  // Find current level
  for (let i = 1; i <= 100; i++) {
    if (totalXP >= XP_REQUIREMENTS[i]) {
      level = i + 1;
      xpForCurrentLevel += XP_REQUIREMENTS[i];
    } else {
      break;
    }
  }

  // Calculate progress to next level
  const currentLevelXP = totalXP - xpForCurrentLevel;
  const nextLevelXP = XP_REQUIREMENTS[level] || 0;
  const xpToNextLevel = Math.max(nextLevelXP - currentLevelXP, 0);
  const progressPercent = nextLevelXP > 0 ? currentLevelXP / nextLevelXP : 1;

  return {
    level,
    currentLevelXP,
    nextLevelXP,
    xpToNextLevel,
    progressPercent: Math.min(progressPercent, 1),
  };
};

/**
 * Calculate total XP and new level after earning XP
 * @param {number} currentXP - Current total XP
 * @param {number} earnedXP - XP just earned
 * @returns {Object} { newTotalXP, oldLevel, newLevel, leveledUp }
 */
export const addXP = (currentXP, earnedXP) => {
  const oldLevel = getLevelInfo(currentXP).level;
  const newTotalXP = currentXP + earnedXP;
  const newLevel = getLevelInfo(newTotalXP).level;
  const leveledUp = newLevel > oldLevel;

  return {
    newTotalXP,
    oldLevel,
    newLevel,
    leveledUp,
  };
};

/**
 * Get XP requirement for a specific level
 * @param {number} level - Level number
 * @returns {number} XP required to reach that level
 */
export const getXPRequirement = (level) => {
  return XP_REQUIREMENTS[level] || 0;
};

/**
 * Get level-based rewards or unlocks
 * @param {number} level - Current level
 * @returns {Object} Information about what's unlocked at this level
 */
export const getLevelRewards = (level) => {
  const rewards = {
    challengeModeUnlocked: level >= 5,
    hardDifficultyUnlocked: level >= 10,
    customPassagesUnlocked: level >= 15,
  };

  return rewards;
};

/**
 * Get a motivational message based on level
 * @param {number} level - Current level
 * @returns {string} Motivational message
 */
export const getLevelMessage = (level) => {
  if (level < 5) return "🌱 Just Getting Started";
  if (level < 10) return "📚 Building Momentum";
  if (level < 15) return "🔥 On Fire!";
  if (level < 20) return "⭐ Rising Star";
  if (level < 30) return "💎 Dedicated Reader";
  if (level < 50) return "🏆 Reading Champion";
  return "👑 Master Reader";
};

export default {
  calculateXP,
  getLevelInfo,
  addXP,
  getXPRequirement,
  getLevelRewards,
  getLevelMessage,
  BASE_XP,
};
