import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, fontSize, fontWeight, spacing, borderRadius, shadows } from '../../theme';

const BookReaderScreen = ({ book, onBack }) => {
  const [currentPage, setCurrentPage] = useState(0);

  const goToNextPage = () => {
    if (currentPage < book.pages.length - 1) {
      setCurrentPage(currentPage + 1);
    }
  };

  const goToPreviousPage = () => {
    if (currentPage > 0) {
      setCurrentPage(currentPage - 1);
    }
  };

  const currentPageData = book.pages[currentPage];
  const progress = ((currentPage + 1) / book.pages.length) * 100;

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.foreground} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>{book.title}</Text>
          <Text style={styles.headerSubtitle}>
            page {currentPage + 1} of {book.pages.length}
          </Text>
        </View>
        <View style={styles.placeholder} />
      </View>

      {/* Progress Bar */}
      <View style={styles.progressBarContainer}>
        <View style={[styles.progressBar, { width: `${progress}%` }]} />
      </View>

      {/* Book Content */}
      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.pageCard, { borderColor: book.difficultyColor }]}>
          {/* Page Title */}
          <View style={styles.pageHeader}>
            <Text style={styles.pageNumber}>page {currentPage + 1}</Text>
            <Text style={styles.pageTitle}>{currentPageData.title}</Text>
          </View>

          {/* Page Content */}
          <ScrollView
            style={styles.textScrollView}
            nestedScrollEnabled={true}
            showsVerticalScrollIndicator={false}
          >
            <Text style={styles.pageContent}>{currentPageData.content}</Text>
          </ScrollView>

          {/* Book Cover Emoji (decorative) */}
          <View style={styles.decorativeEmoji}>
            <Text style={styles.emojiText}>{book.coverUrl}</Text>
          </View>
        </View>

        {/* Navigation Hint */}
        <Text style={styles.navigationHint}>
          {currentPage === 0 && currentPage < book.pages.length - 1 && '👉 tap next to continue reading'}
          {currentPage > 0 && currentPage < book.pages.length - 1 && '👈 👉 use the buttons to navigate'}
          {currentPage === book.pages.length - 1 && '🎉 you finished this book!'}
        </Text>
      </ScrollView>

      {/* Navigation Buttons */}
      <View style={styles.navigationBar}>
        <TouchableOpacity
          style={[
            styles.navButton,
            styles.prevButton,
            currentPage === 0 && styles.navButtonDisabled,
          ]}
          onPress={goToPreviousPage}
          disabled={currentPage === 0}
          activeOpacity={0.8}
        >
          <Ionicons
            name="chevron-back"
            size={24}
            color={currentPage === 0 ? colors.mutedForeground : colors.foreground}
          />
          <Text
            style={[
              styles.navButtonText,
              currentPage === 0 && styles.navButtonTextDisabled,
            ]}
          >
            previous
          </Text>
        </TouchableOpacity>

        <View style={styles.pageIndicator}>
          <Text style={styles.pageIndicatorText}>
            {currentPage + 1} / {book.pages.length}
          </Text>
        </View>

        <TouchableOpacity
          style={[
            styles.navButton,
            styles.nextButton,
            currentPage === book.pages.length - 1 && styles.navButtonDisabled,
          ]}
          onPress={goToNextPage}
          disabled={currentPage === book.pages.length - 1}
          activeOpacity={0.8}
        >
          <Text
            style={[
              styles.navButtonText,
              currentPage === book.pages.length - 1 && styles.navButtonTextDisabled,
            ]}
          >
            next
          </Text>
          <Ionicons
            name="chevron-forward"
            size={24}
            color={
              currentPage === book.pages.length - 1
                ? colors.mutedForeground
                : colors.foreground
            }
          />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
    backgroundColor: colors.card,
    borderBottomWidth: 2,
    borderBottomColor: colors.foreground,
  },
  backButton: {
    padding: spacing.xs,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.extraBold,
    color: colors.foreground,
    textTransform: 'lowercase',
  },
  headerSubtitle: {
    fontSize: fontSize.xs,
    color: colors.mutedForeground,
    textTransform: 'lowercase',
    marginTop: 2,
  },
  placeholder: {
    width: 40,
  },
  progressBarContainer: {
    height: 4,
    backgroundColor: colors.muted,
  },
  progressBar: {
    height: '100%',
    backgroundColor: colors.accent,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: spacing.lg,
    paddingBottom: 100, // Space for navigation bar
  },
  pageCard: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    borderWidth: 3,
    minHeight: 400,
    ...shadows.card,
    position: 'relative',
  },
  pageHeader: {
    marginBottom: spacing.md,
    paddingBottom: spacing.md,
    borderBottomWidth: 2,
    borderBottomColor: colors.border,
  },
  pageNumber: {
    fontSize: fontSize.xs,
    color: colors.mutedForeground,
    textTransform: 'uppercase',
    fontWeight: fontWeight.bold,
    letterSpacing: 1,
    marginBottom: spacing.xs,
  },
  pageTitle: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.extraBold,
    color: colors.foreground,
  },
  textScrollView: {
    maxHeight: 300,
  },
  pageContent: {
    fontSize: fontSize.md,
    color: colors.foreground,
    lineHeight: 26,
    fontWeight: fontWeight.regular,
  },
  decorativeEmoji: {
    position: 'absolute',
    bottom: spacing.lg,
    right: spacing.lg,
    opacity: 0.1,
  },
  emojiText: {
    fontSize: 80,
  },
  navigationHint: {
    fontSize: fontSize.sm,
    color: colors.mutedForeground,
    textAlign: 'center',
    marginTop: spacing.md,
    textTransform: 'lowercase',
    fontStyle: 'italic',
  },
  navigationBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.card,
    borderTopWidth: 2,
    borderTopColor: colors.foreground,
    ...shadows.hard,
  },
  navButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.full,
    backgroundColor: colors.accent,
    borderWidth: 2,
    borderColor: colors.foreground,
    ...shadows.hard,
  },
  navButtonDisabled: {
    backgroundColor: colors.muted,
    borderColor: colors.border,
    opacity: 0.5,
  },
  prevButton: {
    paddingLeft: spacing.sm,
  },
  nextButton: {
    paddingRight: spacing.sm,
  },
  navButtonText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    color: colors.foreground,
    textTransform: 'lowercase',
    marginHorizontal: spacing.xs,
  },
  navButtonTextDisabled: {
    color: colors.mutedForeground,
  },
  pageIndicator: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.muted,
    borderRadius: borderRadius.full,
    borderWidth: 2,
    borderColor: colors.border,
  },
  pageIndicatorText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    color: colors.foreground,
  },
});

export default BookReaderScreen;
