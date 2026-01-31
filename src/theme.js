// ReadRise Theme - Playful Geometric Design System
// Design Philosophy: Playful, tactile, optimistic. Stable grid, wild decoration.

export const colors = {
  // Playful Geometric Palette
  background: '#FFFDF5',     // Warm Cream/Off-White (Paper feel)
  foreground: '#1E293B',     // Slate 800 (Softer than black)
  muted: '#F1F5F9',          // Slate 100
  mutedForeground: '#64748B', // Slate 500
  accent: '#8B5CF6',         // Vivid Violet (Primary Brand)
  accentForeground: '#FFFFFF', // White
  secondary: '#F472B6',      // Hot Pink (Playful pop)
  tertiary: '#FBBF24',       // Amber/Yellow (Optimism)
  quaternary: '#34D399',     // Emerald/Mint (Freshness)
  border: '#E2E8F0',         // Slate 200
  input: '#FFFFFF',           // White
  card: '#FFFFFF',            // White
  ring: '#8B5CF6',            // Violet Focus

  // Legacy compatibility (mapped to new palette)
  primary: '#8B5CF6',         // Maps to accent
  primaryLight: '#A78BFA',
  primaryDark: '#7C3AED',
  secondary: '#F472B6',      // Hot Pink
  secondaryLight: '#F9A8D4',
  secondaryDark: '#EC4899',
  accent: '#8B5CF6',         // Same as primary
  accentLight: '#A78BFA',
  accentDark: '#7C3AED',

  // Neutral palette
  surface: '#FFFFFF',
  cream: '#FFFDF5',

  // Text colors (mapped to new system)
  text: '#1E293B',            // foreground
  textLight: '#64748B',       // mutedForeground
  textMuted: '#94A3B8',       // Slate 400

  // Tier colors (keeping for compatibility)
  seedling: '#34D399',        // Using quaternary
  sprout: '#34D399',
  tree: '#FBBF24',            // Using tertiary
  grove: '#8B5CF6',           // Using accent
  starReader: '#FBBF24',      // Using tertiary

  // Status colors
  success: '#34D399',
  warning: '#FBBF24',
  error: '#EF4444',
  info: '#8B5CF6',

  // UI elements
  shadow: '#1E293B',          // foreground for hard shadows
  overlay: 'rgba(30, 41, 59, 0.5)',
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
  md: 16,
  lg: 24,
  xl: 32,
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

// Playful Geometric Hard Shadows (approximated for React Native)
// Note: React Native doesn't support true hard shadows, so we use minimal blur
export const shadows = {
  // Hard shadow - 4px 4px 0px (The "Pop" Shadow)
  hard: {
    shadowColor: colors.shadow,
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 0, // Minimal blur for hard edge
    elevation: 4,
  },
  // Hard shadow hover - 6px 6px 0px (Lift effect)
  hardLift: {
    shadowColor: colors.shadow,
    shadowOffset: { width: 6, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 0,
    elevation: 6,
  },
  // Hard shadow active - 2px 2px 0px (Press effect)
  hardPress: {
    shadowColor: colors.shadow,
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 0,
    elevation: 2,
  },
  // Soft hard shadow for cards - 8px 8px 0px
  card: {
    shadowColor: colors.border,
    shadowOffset: { width: 8, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 0,
    elevation: 8,
  },
  // Legacy shadows (for compatibility)
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
