# Difficulty & Leveling System Documentation

## Overview
This document describes the new difficulty-based learning system and level progression mechanics implemented for ReadRise Learn Mode.

---

## 📚 Difficulty Levels

### Easy 🌱
- **Passage Length**: ~3 sentences
- **Vocabulary**: Basic, simple words
- **Reading Time**: ~10 seconds
- **Max XP**: 10 XP (at 100% accuracy)
- **Example**: "The cat sat on the mat. It was a sunny day. The cat was happy."

### Medium 🔥
- **Passage Length**: ~4-5 sentences
- **Vocabulary**: Moderate complexity with varied words
- **Reading Time**: ~20 seconds
- **Max XP**: 25 XP (at 100% accuracy)
- **Example**: "The ancient castle stood on the hilltop, its gray stone walls covered in ivy..."

### Hard 💎
- **Passage Length**: ~5-7 sentences
- **Vocabulary**: Advanced, complex words
- **Reading Time**: ~30 seconds
- **Max XP**: 50 XP (at 100% accuracy)
- **Example**: "The renowned archaeologist meticulously excavated the site, uncovering artifacts..."

---

## 🎮 XP Calculation System

### Base XP Values
```javascript
{
  easy: 10 XP,
  medium: 25 XP,
  hard: 50 XP
}
```

### Accuracy Multiplier
XP is scaled based on reading accuracy:
- **100% accuracy** = 100% of base XP
- **90% accuracy** = 90% of base XP
- **70% accuracy** = 70% of base XP
- **50% accuracy** = 50% of base XP
- **Below 20%** = minimum 20% of base XP (encourages practice)

### XP Examples
| Difficulty | Accuracy | XP Earned |
|------------|----------|-----------|
| Easy       | 100%     | 10 XP     |
| Easy       | 70%      | 7 XP      |
| Medium     | 100%     | 25 XP     |
| Medium     | 80%      | 20 XP     |
| Hard       | 100%     | 50 XP     |
| Hard       | 60%      | 30 XP     |

### Cross-Difficulty Comparison
As intended, difficulty matters more than accuracy for XP:
- **Medium at 70%** (17.5 XP) > **Easy at 100%** (10 XP) ✓
- **Hard at 60%** (30 XP) > **Medium at 100%** (25 XP) ✓

---

## ⭐ Level Progression System

### XP Requirements
Level requirements follow an exponential curve:
```javascript
XP_Required(level) = 100 × (level ^ 1.5)
```

### Level Chart
| Level | XP Required | Cumulative XP |
|-------|-------------|---------------|
| 1     | -           | 0             |
| 2     | 141         | 141           |
| 3     | 245         | 386           |
| 4     | 374         | 760           |
| 5     | 523         | 1,283         |
| 10    | 1,414       | 7,146         |
| 15    | 2,598       | 24,744        |
| 20    | 3,995       | 57,739        |
| 25    | 5,590       | 113,329       |
| 50    | 17,677      | 631,473       |

### Level-Up System
- When user earns XP, their total XP increases
- If total XP crosses a level threshold, they level up
- **Level-up modal** appears celebrating the achievement
- Progress bar shows XP progress to next level

---

## 🏆 Level-Based Rewards & Unlocks

| Level | Unlock                     | Description                         |
|-------|----------------------------|-------------------------------------|
| 1     | Easy & Medium Difficulty   | Start practicing immediately        |
| 5     | Challenge Mode             | Unlock timed reading challenges     |
| 10    | Hard Difficulty            | Access advanced passages            |
| 15    | Custom Passages (Future)   | Create your own practice content    |

### Motivational Messages by Level
- **Level 1-4**: 🌱 Just Getting Started
- **Level 5-9**: 📚 Building Momentum
- **Level 10-14**: 🔥 On Fire!
- **Level 15-19**: ⭐ Rising Star
- **Level 20-29**: 💎 Dedicated Reader
- **Level 30-49**: 🏆 Reading Champion
- **Level 50+**: 👑 Master Reader

---

## 📊 Passage Bank

### Storage
- Passages stored in `src/data/passages.json`
- Organized by difficulty level
- Each passage includes:
  - `id`: Unique identifier
  - `text`: The passage content
  - `estimatedSeconds`: Expected reading time

### Current Bank Size
- **Easy**: 8 passages
- **Medium**: 8 passages
- **Hard**: 8 passages
- **Total**: 24 unique passages

### Random Selection
- When difficulty is chosen, random passage selected from pool
- Users can practice new passages without repeating
- "New Passage" button loads another random passage at same difficulty

---

## 🎯 User Flow

```
Home Screen → Learn Mode
    ↓
Select Difficulty (Easy/Medium/Hard)
    ↓
Load Random Passage
    ↓
Read Aloud & Record
    ↓
Speech-to-Text Analysis
    ↓
Calculate Accuracy %
    ↓
Award XP (difficulty × accuracy)
    ↓
Update Database (xp, level)
    ↓
Show Results (score, XP, highlighted words)
    ↓
Level Up Modal? (if leveled up)
    ↓
Options: New Passage / Change Difficulty / Back
```

---

## 💾 Database Schema

### User Object (Firebase Realtime Database)
```json
{
  "users": {
    "userId": {
      "email": "user@example.com",
      "uid": "userId",
      "xp": 350,
      "level": 5,
      "awards": [],
      "onboardingCompleted": true,
      "ageRange": "8-10",
      "readingLevel": "beginner",
      "goals": ["fluency", "fun"],
      "createdAt": "2026-01-31T..."
    }
  }
}
```

### Key Changes from Old System
- `totalScore` → `xp` (Experience Points)
- `currentTier` → `level` (Numeric Level)
- Tier emojis (🌱🌿🌳) → Level numbers (1, 2, 3...)

---

## 🎨 UI Components

### Difficulty Selection Screen
- Large, colorful cards for each difficulty
- Shows max XP potential
- Visual emoji indicators (🌱🔥💎)
- Estimated reading time displayed

### Learn Mode Screen
- Current difficulty shown in header
- Passage displayed with large, readable text
- Microphone button (tap to record/stop)
- Word highlighting after recording:
  - **Green background** = spoken correctly
  - **Red background** = missed/incorrect

### Results Card
- Large score percentage
- Motivational message based on score
- **XP earned display** with "+[amount] XP" badge
- Two action buttons:
  - "New Passage" (same difficulty)
  - "Change Difficulty" (return to selection)

### Level-Up Modal
- Celebratory 🎉 emoji
- "Level Up!" title
- Shows old level → new level
- "Awesome!" button to dismiss

### Home Dashboard
- **Level Card** replaces old Tier Card:
  - Shows current level number with ⭐
  - Displays motivational message
  - Shows total XP earned
  - Progress bar to next level
  - Text: "X XP to Level [N+1]"

---

## 🧮 Level Calculation Examples

### Example 1: New User
- **Starting**: Level 1, 0 XP
- **Completes Easy (80%)**: +8 XP → Total: 8 XP (still Level 1)
- **Completes Medium (90%)**: +22 XP → Total: 30 XP (still Level 1)
- **Completes Hard (100%)**: +50 XP → Total: 80 XP (still Level 1)
- **Needs**: 141 XP to reach Level 2

### Example 2: Intermediate User
- **Current**: Level 4, 950 XP
- **Needs**: 374 XP to reach Level 5 (1,283 total)
- **Remaining**: 333 XP needed
- **If completes Hard (100%)**: +50 XP → 1,000 XP (still Level 4)
- **If completes 7 more Hard (100%)**: +350 XP → 1,350 XP → **LEVEL 5!**

### Example 3: Advanced User
- **Current**: Level 10, 8,000 XP
- **Next Level XP**: Needs 1,414 XP to Level 11
- **Current Level XP**: 8,000 - 7,146 = 854 XP into Level 10
- **Remaining**: 1,414 - 854 = 560 XP needed
- **Strategy**: 12 Hard passages at 100% = 600 XP → Level 11!

---

## 🔧 Implementation Files

### Core Files
1. **`src/data/passages.json`** - Passage bank (easy/medium/hard)
2. **`src/services/levelingService.js`** - XP calculation & level logic
3. **`src/screens/learn/LearnModeScreen.js`** - Learn Mode UI & flow
4. **`src/screens/home/HomeScreen.js`** - Level display on dashboard
5. **`App.js`** - User initialization with xp/level
6. **`src/screens/auth/AuthScreen.js`** - New user creation with xp/level

### Service Functions

#### `levelingService.js`
```javascript
calculateXP(difficulty, accuracyPercent)
  → Returns XP earned

getLevelInfo(totalXP)
  → Returns { level, currentLevelXP, nextLevelXP, xpToNextLevel, progressPercent }

addXP(currentXP, earnedXP)
  → Returns { newTotalXP, oldLevel, newLevel, leveledUp }

getLevelMessage(level)
  → Returns motivational message string

getLevelRewards(level)
  → Returns { challengeModeUnlocked, hardDifficultyUnlocked, ... }
```

---

## 🚀 Future Enhancements

### Potential Features
1. **Difficulty Recommendations**: AI suggests difficulty based on past performance
2. **Streak Bonuses**: Extra XP for consecutive days
3. **Weekly Challenges**: Special passages with bonus XP
4. **Leaderboards**: Compare levels with friends
5. **Achievement Badges**: Special rewards for milestones
6. **Adaptive Difficulty**: Automatically adjust based on performance
7. **Voice Speed Analysis**: Bonus XP for smooth reading pace
8. **Pronunciation Feedback**: Highlight specific mispronunciations

---

## 📈 Balancing Philosophy

### Design Goals
1. **Rewarding Challenge**: Higher difficulty = Higher reward
2. **Encouraging Practice**: All attempts earn XP (minimum 20%)
3. **Meaningful Progress**: Levels get harder but remain achievable
4. **Clear Feedback**: Users always know their progress
5. **Long-term Engagement**: No level cap, always progressing

### Pacing
- **Early Levels (1-5)**: Quick progression to build confidence
- **Mid Levels (5-15)**: Steady growth, unlocking features
- **High Levels (15+)**: Slower but prestigious, for dedicated readers

---

*System implemented on 2026-01-31 | Branch: feature/add-difficulty-leveling*
