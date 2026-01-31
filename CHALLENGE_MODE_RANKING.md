# Challenge Mode - Ranking System

## Overview
Challenge Mode now features difficulty levels, WPM+Accuracy scoring, and a ranking system with Bronze, Silver, and Gold tiers based on performance.

---

## 🏆 Ranking System

### Ranks & Thresholds
| Rank | Score Range | Emoji | Color |
|------|-------------|-------|-------|
| **Bronze** | 0-49 | 🥉 | #CD7F32 |
| **Silver** | 50-69 | 🥈 | #C0C0C0 |
| **Gold** | 70-100 | 🥇 | #FFD700 |

---

## 📊 Scoring System

### Composite Score Formula
**Total Score = Accuracy Points + WPM Points**

### Accuracy Component (0-50 points)
```javascript
accuracyPoints = (correctWords / totalWords) * 50
```

**Examples:**
- 100% accuracy = 50 points
- 80% accuracy = 40 points
- 60% accuracy = 30 points

### WPM Component (0-50 points)
```javascript
wpmRatio = min(actualWPM / targetWPM, 2.0)
wpmPoints = wpmRatio * 25
```

**Target WPM by Difficulty:**
- Easy: 90 WPM
- Medium: 110 WPM
- Hard: 130 WPM

**Examples (Medium difficulty, target 110 WPM):**
- 220 WPM = 50 points (capped at 2x target)
- 110 WPM = 25 points (at target)
- 55 WPM = 12.5 points (half target)

### Score Examples

#### Example 1: Perfect Gold
- **Accuracy**: 100% → 50 points
- **WPM**: 140 WPM (medium) → 31.8 points
- **Total**: **82 points** → 🥇 **GOLD**

#### Example 2: Silver Performance
- **Accuracy**: 85% → 42.5 points
- **WPM**: 80 WPM (medium) → 18.2 points
- **Total**: **61 points** → 🥈 **SILVER**

#### Example 3: Bronze Effort
- **Accuracy**: 70% → 35 points
- **WPM**: 50 WPM (medium) → 11.4 points
- **Total**: **46 points** → 🥉 **BRONZE**

---

## 🎯 Difficulty Levels

### Easy 🌱
- **Target WPM**: 90
- **Passage**: ~25-35 words
- **Reading Time**: ~10 seconds
- **Difficulty**: Simple vocabulary, short sentences

### Medium 🔥
- **Target WPM**: 110
- **Passage**: ~50-70 words
- **Reading Time**: ~20 seconds
- **Difficulty**: Moderate vocabulary, varied sentences

### Hard 💎
- **Target WPM**: 130
- **Passage**: ~80-100 words
- **Reading Time**: ~30 seconds
- **Difficulty**: Advanced vocabulary, complex sentences

---

## 📈 High Scores

### Stored Per Difficulty
Each difficulty level tracks its own high score:
```javascript
{
  challengeHighScores: {
    easy: 85,
    medium: 72,
    hard: 68
  }
}
```

### Firebase Structure
```
/users
  /{userId}
    /challengeHighScores
      /easy: 85
      /medium: 72
      /hard: 68
```

### New High Score Detection
- Compares current score to previous high score
- Shows "🎉 NEW HIGH SCORE! 🎉" banner
- Automatically updates Firebase
- Displays in difficulty selection screen

---

## 🎮 User Flow

```
Challenge Mode Selected
    ↓
Choose Difficulty (Easy/Medium/Hard)
    ↓
View Current High Scores
    ↓
AI Generates Challenge Passage
    ↓
Timer Starts → User Reads Aloud
    ↓
Timer Stops → Processing
    ↓
Calculate Accuracy & WPM
    ↓
Calculate Composite Score
    ↓
Determine Rank (Bronze/Silver/Gold)
    ↓
Check for New High Score
    ↓
Show Rank Modal with Celebration
    ↓
Display Full Results
    ↓
Options: Try Again / Change Level
```

---

## 🎨 UI Features

### Difficulty Selection Screen
```
┌──────────────────────────────┐
│  ⚔️ Test Your Skills!        │
│                              │
│  Ranks:                      │
│  🥉 Bronze (0-49)            │
│  🥈 Silver (50-69)           │
│  🥇 Gold (70-100)            │
│                              │
│  [🌱 Easy - Target: 90 WPM]  │
│     High Score: 85           │
│                              │
│  [🔥 Medium - Target: 110 WPM]│
│     High Score: 72           │
│                              │
│  [💎 Hard - Target: 130 WPM] │
│     High Score: 68           │
└──────────────────────────────┘
```

### Challenge Screen
```
┌──────────────────────────────┐
│  ⏱️ 3.2s (while recording)    │
│                              │
│  Challenge Rules:            │
│  1. Read as quickly possible │
│  2. Maintain high accuracy   │
│  3. Score = SPEED + ACCURACY │
│                              │
│  [Passage Text Here]         │
│                              │
│  [🎤 Microphone Button]      │
└──────────────────────────────┘
```

### Results Display
```
┌──────────────────────────────┐
│        🥇                    │
│        Gold                  │
│                              │
│  Accuracy    Speed    Score  │
│    92%      125 WPM    78    │
│                              │
│  🎉 NEW HIGH SCORE! 🎉      │
│                              │
│  [Try Again] [Change Level]  │
└──────────────────────────────┘
```

### Rank Modal
```
┌──────────────────────┐
│                      │
│        🥇            │
│                      │
│  New High Score!     │
│                      │
│    Gold Rank         │
│    Score: 78         │
│                      │
│   [Continue]         │
│                      │
└──────────────────────┘
```

---

## 💾 Database Updates

### New Fields Added
```javascript
// In /users/{userId}
challengeHighScores: {
  easy: number,
  medium: number,
  hard: number
}
```

### Initialization
New users start with:
```javascript
challengeHighScores: {
  easy: 0,
  medium: 0,
  hard: 0
}
```

---

## 🧮 Scoring Logic Details

### Why This Formula?

**Balance Speed & Accuracy:**
- Pure speed without accuracy = Low score
- Pure accuracy without speed = Medium score
- High speed + High accuracy = Gold!

**Encourages Practice:**
- Bronze achievable with basic performance
- Silver requires competence
- Gold demands excellence

**Difficulty Scaling:**
- Harder difficulties have higher WPM targets
- Same effort on hard = lower score than easy
- Encourages skill progression

---

## 📊 Performance Targets

### To Achieve Gold (70+):

**Easy (Target: 90 WPM)**
- Option 1: 100% accuracy + 80 WPM = 72 points ✓
- Option 2: 90% accuracy + 100 WPM = 73 points ✓
- Option 3: 85% accuracy + 120 WPM = 76 points ✓

**Medium (Target: 110 WPM)**
- Option 1: 100% accuracy + 110 WPM = 75 points ✓
- Option 2: 95% accuracy + 130 WPM = 77 points ✓
- Option 3: 90% accuracy + 140 WPM = 77 points ✓

**Hard (Target: 130 WPM)**
- Option 1: 100% accuracy + 130 WPM = 75 points ✓
- Option 2: 95% accuracy + 150 WPM = 76 points ✓
- Option 3: 85% accuracy + 180 WPM = 77 points ✓

---

## 🎯 Key Differences from Learn Mode

| Feature | Learn Mode | Challenge Mode |
|---------|------------|----------------|
| **Goal** | Practice & Learn | Test & Compete |
| **Reward** | XP for leveling | Ranks & High Scores |
| **Timer** | No time pressure | Timed performance |
| **Scoring** | Accuracy only | Accuracy + Speed |
| **Feedback** | Encouraging | Performance-based |
| **Unlock** | Always available | Level 5+ |

---

## 🚀 Future Enhancements

### Leaderboards
- Global leaderboards per difficulty
- Friend comparisons
- Weekly challenges

### Additional Ranks
- Platinum (85-94)
- Diamond (95-100)

### Achievements
- "Speed Demon" - 150+ WPM
- "Perfect Read" - 100% accuracy
- "Consistent Champion" - 3 Gold ranks in a row

### Time Trials
- Fixed time limits (30s, 60s)
- Read as much as possible
- Score based on words read correctly

---

## 📝 Summary

**Scoring**: Accuracy (50%) + WPM (50%) = Total Score (0-100)

**Ranks**:
- 🥉 Bronze: 0-49
- 🥈 Silver: 50-69
- 🥇 Gold: 70-100

**High Scores**: Tracked per difficulty, stored in Firebase

**Goal**: Read fast AND accurately to achieve Gold rank!

---

*Implemented: 2026-01-31*
*Feature: Challenge Mode Ranking System*
