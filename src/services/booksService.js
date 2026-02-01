import { ref, set, get } from 'firebase/database';
import { db } from '../../firebaseConfig';
import booksData from '../data/mockBooks.json';

/**
 * Upload books to Firebase (run once to initialize)
 */
export const uploadBooksToFirebase = async () => {
  try {
    const booksRef = ref(db, 'books');
    await set(booksRef, booksData);
    console.log('✅ Books uploaded to Firebase successfully');
    return true;
  } catch (error) {
    console.error('Error uploading books to Firebase:', error);
    return false;
  }
};

/**
 * Fetch all books from Firebase
 */
export const fetchBooksFromFirebase = async () => {
  try {
    const booksRef = ref(db, 'books');
    const snapshot = await get(booksRef);

    if (snapshot.exists()) {
      return snapshot.val();
    } else {
      console.log('No books found in Firebase, uploading default books...');
      await uploadBooksToFirebase();
      return booksData;
    }
  } catch (error) {
    console.error('Error fetching books from Firebase:', error);
    // Fallback to local data
    return booksData;
  }
};

/**
 * Fetch a single book by ID from Firebase
 */
export const fetchBookById = async (bookId) => {
  try {
    const bookRef = ref(db, `books/${bookId}`);
    const snapshot = await get(bookRef);

    if (snapshot.exists()) {
      return snapshot.val();
    } else {
      console.log(`Book ${bookId} not found`);
      return null;
    }
  } catch (error) {
    console.error('Error fetching book:', error);
    return null;
  }
};

/**
 * Update user's current reading progress
 */
export const updateReadingProgress = async (userId, bookId, currentPage) => {
  try {
    const progressRef = ref(db, `users/${userId}/readingProgress/${bookId}`);
    await set(progressRef, {
      bookId,
      currentPage,
      lastRead: new Date().toISOString(),
    });
    return true;
  } catch (error) {
    console.error('Error updating reading progress:', error);
    return false;
  }
};

/**
 * Get user's reading progress for a book
 */
export const getReadingProgress = async (userId, bookId) => {
  try {
    const progressRef = ref(db, `users/${userId}/readingProgress/${bookId}`);
    const snapshot = await get(progressRef);

    if (snapshot.exists()) {
      return snapshot.val();
    }
    return null;
  } catch (error) {
    console.error('Error getting reading progress:', error);
    return null;
  }
};
