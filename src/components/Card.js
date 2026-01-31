import React from 'react';
import { View, StyleSheet } from 'react-native';
import { colors, borderRadius, spacing, shadows } from '../theme';

export const Card = ({ children, style, variant = 'default', padding = 'default' }) => {
  const cardStyles = [
    styles.base,
    styles[variant],
    padding === 'none' ? styles.noPadding : padding === 'small' ? styles.smallPadding : styles.defaultPadding,
    style,
  ];

  return <View style={cardStyles}>{children}</View>;
};

const styles = StyleSheet.create({
  base: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    ...shadows.medium,
  },
  default: {
    backgroundColor: colors.surface,
  },
  cream: {
    backgroundColor: colors.cream,
  },
  primary: {
    backgroundColor: colors.primaryLight + '20',
  },
  secondary: {
    backgroundColor: colors.secondaryLight + '20',
  },
  defaultPadding: {
    padding: spacing.lg,
  },
  smallPadding: {
    padding: spacing.md,
  },
  noPadding: {
    padding: 0,
  },
});

export default Card;
