// ReadRise Theme
// Design Philosophy: Warm, energetic, youthful. Soft purples, warm oranges, sky blues, creamy whites.

export const colors = {
  // Primary palette
  primary: '#8B7EC8',        // Soft purple
  primaryLight: '#A599D9',
  primaryDark: '#6B5FA8',

  secondary: '#FF9B71',      // Warm orange
  secondaryLight: '#FFB08F',
  secondaryDark: '#E8825A',

  accent: '#6BB6FF',         // Sky blue
  accentLight: '#8FC7FF',
  accentDark: '#4A9FE8',

  // Neutral palette
  background: '#FFF8F0',     // Creamy white
  surface: '#FFFFFF',
  cream: '#FFF5E9',

  // Text colors
  text: '#2C2C2C',
  textLight: '#666666',
  textMuted: '#999999',

  // Tier colors
  seedling: '#7ED957',       // 🌱 Bright green
  sprout: '#5CB85C',         // 🌿 Forest green
  tree: '#8B5A3C',           // 🌳 Wood brown
  grove: '#2E7D32',          // 🌲 Deep green
  starReader: '#FFD700',     // ⭐ Gold

  // Status colors
  success: '#4CAF50',
  warning: '#FF9800',
  error: '#FF5252',
  info: '#2196F3',

  // UI elements
  border: '#E0E0E0',
  shadow: '#000000',
  overlay: 'rgba(0, 0, 0, 0.5)',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const borderRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  full: 9999,
};

export const fontSize = {
  xs: 12,
  sm: 14,
  md: 16,
  lg: 18,
  xl: 24,
  xxl: 32,
  xxxl: 40,
};

export const fontWeight = {
  regular: '400',
  medium: '600',
  bold: '700',
  extraBold: '800',
};

export const shadows = {
  small: {
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  medium: {
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  large: {
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },
};

// Tier progression
export const tiers = [
  { name: 'Seedling', emoji: '🌱', minScore: 0, color: colors.seedling },
  { name: 'Sprout', emoji: '🌿', minScore: 200, color: colors.sprout },
  { name: 'Tree', emoji: '🌳', minScore: 500, color: colors.tree },
  { name: 'Grove', emoji: '🌲', minScore: 1000, color: colors.grove },
  { name: 'Star Reader', emoji: '⭐', minScore: 2000, color: colors.starReader },
];

export const getTierByScore = (score) => {
  for (let i = tiers.length - 1; i >= 0; i--) {
    if (score >= tiers[i].minScore) {
      return tiers[i];
    }
  }
  return tiers[0];
};

export const getTierProgress = (score) => {
  const currentTier = getTierByScore(score);
  const currentIndex = tiers.findIndex(t => t.name === currentTier.name);

  if (currentIndex === tiers.length - 1) {
    return { progress: 1, nextTierScore: null };
  }

  const nextTier = tiers[currentIndex + 1];
  const tierRange = nextTier.minScore - currentTier.minScore;
  const progressInTier = score - currentTier.minScore;
  const progress = Math.min(progressInTier / tierRange, 1);

  return { progress, nextTierScore: nextTier.minScore };
};

export default {
  colors,
  spacing,
  borderRadius,
  fontSize,
  fontWeight,
  shadows,
  tiers,
  getTierByScore,
  getTierProgress,
};
