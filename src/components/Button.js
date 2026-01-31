import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { colors, borderRadius, spacing, fontSize, fontWeight, shadows } from '../theme';

export const Button = ({
  title,
  onPress,
  variant = 'primary',
  size = 'medium',
  loading = false,
  disabled = false,
  style,
  textStyle,
  icon,
}) => {
  const buttonStyles = [
    styles.base,
    styles[variant],
    styles[size],
    (loading || disabled) && styles.disabled,
    style,
  ];

  const textStyles = [
    styles.text,
    styles[`${variant}Text`],
    styles[`${size}Text`],
    textStyle,
  ];

  return (
    <TouchableOpacity
      style={buttonStyles}
      onPress={onPress}
      disabled={loading || disabled}
      activeOpacity={0.8}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'primary' || variant === 'secondary' ? colors.surface : colors.primary} />
      ) : (
        <>
          {icon && icon}
          <Text style={textStyles}>{title}</Text>
        </>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: borderRadius.full,
  },

  // Variants
  primary: {
    backgroundColor: colors.accent,
    borderWidth: 2,
    borderColor: colors.foreground,
    ...shadows.hard,
  },
  secondary: {
    backgroundColor: colors.secondary,
    borderWidth: 2,
    borderColor: colors.foreground,
    ...shadows.hard,
  },
  accent: {
    backgroundColor: colors.accent,
    borderWidth: 2,
    borderColor: colors.foreground,
    ...shadows.hard,
  },
  outline: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: colors.foreground,
  },
  ghost: {
    backgroundColor: 'transparent',
    shadowOpacity: 0,
    elevation: 0,
  },

  // Sizes
  small: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  medium: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  large: {
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.xl,
  },

  // Text styles
  text: {
    fontWeight: fontWeight.bold,
    textAlign: 'center',
  },
  primaryText: {
    color: colors.accentForeground,
    fontSize: fontSize.md,
    textTransform: 'lowercase',
  },
  secondaryText: {
    color: colors.accentForeground,
    fontSize: fontSize.md,
    textTransform: 'lowercase',
  },
  accentText: {
    color: colors.accentForeground,
    fontSize: fontSize.md,
    textTransform: 'lowercase',
  },
  outlineText: {
    color: colors.foreground,
    fontSize: fontSize.md,
    textTransform: 'lowercase',
  },
  ghostText: {
    color: colors.foreground,
    fontSize: fontSize.md,
    textTransform: 'lowercase',
  },

  smallText: {
    fontSize: fontSize.sm,
  },
  mediumText: {
    fontSize: fontSize.md,
  },
  largeText: {
    fontSize: fontSize.lg,
  },

  disabled: {
    opacity: 0.5,
  },
});

export default Button;
