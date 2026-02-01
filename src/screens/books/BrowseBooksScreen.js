import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, fontSize, fontWeight, spacing, borderRadius, shadows } from '../../theme';
import { fetchBooksFromFirebase } from '../../services/booksService';
import BookReaderScreen from './BookReaderScreen';

const BrowseBooksScreen = ({ onBack }) => {
  const [selectedBook, setSelectedBook] = useState(null);
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadBooks();
  }, []);

  const loadBooks = async () => {
    try {
      const booksData = await fetchBooksFromFirebase();
      setBooks(Array.isArray(booksData) ? booksData : Object.values(booksData));
    } catch (error) {
      console.error('Error loading books:', error);
    } finally {
      setLoading(false);
    }
  };

  if (selectedBook) {
    return (
      <BookReaderScreen
        book={selectedBook}
        onBack={() => setSelectedBook(null)}
      />
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>browse books</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.sectionTitle}>📚 choose a book to read</Text>
        <Text style={styles.sectionSubtitle}>
          pick a book and enjoy reading at your own pace
        </Text>

        {/* Loading State */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.accent} />
            <Text style={styles.loadingText}>loading books...</Text>
          </View>
        ) : (
          <>
            {/* Books Grid */}
            <View style={styles.booksContainer}>
              {books.map((book) => (
                <BookCard
                  key={book.id}
                  book={book}
                  onPress={() => setSelectedBook(book)}
                />
              ))}
            </View>

            {/* Difficulty Legend */}
            <View style={styles.legendCard}>
              <Text style={styles.legendTitle}>difficulty levels:</Text>
              <View style={styles.legendItems}>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: '#22c55e' }]} />
                  <Text style={styles.legendText}>easy</Text>
                </View>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: '#f97316' }]} />
                  <Text style={styles.legendText}>medium</Text>
                </View>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: '#ef4444' }]} />
                  <Text style={styles.legendText}>hard</Text>
                </View>
              </View>
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const BookCard = ({ book, onPress }) => {
  const getDifficultyColor = () => {
    return book.difficultyColor || colors.accent;
  };

  return (
    <TouchableOpacity
      style={[styles.bookCard, { borderColor: getDifficultyColor() }]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      {/* Book Cover */}
      <View style={[styles.bookCover, { borderColor: getDifficultyColor() }]}>
        <Text style={styles.bookCoverEmoji}>{book.coverUrl}</Text>
        <View style={[styles.difficultyBadge, { backgroundColor: getDifficultyColor() }]}>
          <Text style={styles.difficultyText}>{book.difficulty}</Text>
        </View>
      </View>

      {/* Book Info */}
      <View style={styles.bookInfo}>
        <Text style={styles.bookTitle}>{book.title}</Text>
        <Text style={styles.bookGenre}>{book.genreEmoji} {book.difficulty}</Text>
        <Text style={styles.bookDescription} numberOfLines={3}>
          {book.description}
        </Text>
        <View style={styles.bookMeta}>
          <Ionicons name="book-outline" size={14} color={colors.mutedForeground} />
          <Text style={styles.bookPages}>{book.pages.length} pages</Text>
        </View>
      </View>
    </TouchableOpacity>
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
  headerTitle: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.extraBold,
    color: colors.foreground,
    textTransform: 'lowercase',
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  sectionTitle: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.extraBold,
    color: colors.foreground,
    marginBottom: spacing.xs,
    textTransform: 'lowercase',
  },
  sectionSubtitle: {
    fontSize: fontSize.sm,
    color: colors.mutedForeground,
    marginBottom: spacing.lg,
    textTransform: 'lowercase',
  },
  booksContainer: {
    gap: spacing.md,
  },
  bookCard: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderWidth: 3,
    flexDirection: 'row',
    ...shadows.card,
  },
  bookCover: {
    width: 100,
    height: 140,
    backgroundColor: colors.muted,
    borderRadius: borderRadius.md,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
    position: 'relative',
    ...shadows.hard,
  },
  bookCoverEmoji: {
    fontSize: 48,
  },
  difficultyBadge: {
    position: 'absolute',
    top: spacing.xs,
    right: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
    borderWidth: 2,
    borderColor: colors.foreground,
  },
  difficultyText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.extraBold,
    color: colors.foreground,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  bookInfo: {
    flex: 1,
    justifyContent: 'space-between',
  },
  bookTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.extraBold,
    color: colors.foreground,
    marginBottom: spacing.xs,
  },
  bookGenre: {
    fontSize: fontSize.sm,
    color: colors.mutedForeground,
    marginBottom: spacing.xs,
    textTransform: 'lowercase',
  },
  bookDescription: {
    fontSize: fontSize.sm,
    color: colors.mutedForeground,
    lineHeight: 18,
    flex: 1,
  },
  bookMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.xs,
  },
  bookPages: {
    fontSize: fontSize.xs,
    color: colors.mutedForeground,
    marginLeft: spacing.xs,
    textTransform: 'lowercase',
  },
  legendCard: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginTop: spacing.lg,
    borderWidth: 2,
    borderColor: colors.border,
  },
  legendTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.foreground,
    marginBottom: spacing.sm,
    textTransform: 'lowercase',
  },
  legendItems: {
    flexDirection: 'row',
    gap: spacing.lg,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    marginRight: spacing.xs,
    borderWidth: 2,
    borderColor: colors.foreground,
  },
  legendText: {
    fontSize: fontSize.sm,
    color: colors.foreground,
    textTransform: 'lowercase',
    fontWeight: fontWeight.medium,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxl * 2,
  },
  loadingText: {
    fontSize: fontSize.md,
    color: colors.mutedForeground,
    marginTop: spacing.md,
    textTransform: 'lowercase',
  },
});

export default BrowseBooksScreen;
