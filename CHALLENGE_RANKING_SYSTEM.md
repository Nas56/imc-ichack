# Challenge Mode - Cumulative Ranking System

## Overview
This document describes the cumulative scoring and ranking system for Challenge Mode, which is separate from the per-challenge Bronze/Silver/Gold performance ranks.

---

## 🏆 Rank Progression System

### Ranks (0-5)
| Rank | Name | Emoji | Score Required | Challenges Needed* |
|------|------|-------|----------------|-------------------|
| 0 | Novice | 🌱 | 0 | Starting rank |
| 1 | Reader | 📖 | 300 | ~10 good challenges |
| 2 | Scholar | 🎓 | 800 | ~27 total challenges |
| 3 | Expert | 🏅 | 1,600 | ~54 total challenges |
| 4 | Master | 💎 | 2,800 | ~94 total challenges |
| 5 | Legend | 👑 | 4,500 | ~150 total challenges |

*Approximate challenges assuming average score of ~30 points per challenge

---

## 📊 Challenge Score Calculation

Each challenge completion awards points based on three factors:

### Formula
```
Base Score = Accuracy Score + WPM Score
Final Score = Base Score × Difficulty Multiplier
```

### 1. Accuracy Component (0-40 points)
```
Accuracy Score = (Accuracy % ÷ 100) × 40
```

**Examples:**
- 100% accuracy = 40 points
- 90% accuracy = 36 points
- 75% accuracy = 30 points
- 50% accuracy = 20 points

### 2. WPM Component (0-30 points)
```
WPM Score = min((Actual WPM ÷ 150) × 30, 30)
```

**Examples:**
- 150+ WPM = 30 points (capped)
- 100 WPM = 20 points
- 75 WPM = 15 points
- 50 WPM = 10 points

### 3. Difficulty Multiplier (0.5x - 2.0x)

Claude AI assesses each passage difficulty on a 1-10 scale:

```
Difficulty Multiplier = 0.5 + (Difficulty ÷ 10) × 1.5
```

| Difficulty | Multiplier | Description |
|------------|------------|-------------|
| 1-3 | 0.5x - 0.8x | Easy passages (simple vocabulary, short sentences) |
| 4-6 | 0.9x - 1.2x | Medium passages (moderate vocabulary, varied structure) |
| 7-10 | 1.3x - 2.0x | Hard passages (complex vocabulary, long sentences) |

---

## 💡 Score Examples

### Example 1: Perfect Easy Passage
- **Accuracy**: 100% → 40 points
- **WPM**: 120 → 24 points
- **Base**: 64 points
- **Difficulty**: 3 (0.95x multiplier)
- **Final Score**: **61 points** ✨

### Example 2: Good Medium Passage
- **Accuracy**: 85% → 34 points
- **WPM**: 100 → 20 points
- **Base**: 54 points
- **Difficulty**: 5 (1.25x multiplier)
- **Final Score**: **68 points** 🎯

### Example 3: Challenging Hard Passage
- **Accuracy**: 75% → 30 points
- **WPM**: 80 → 16 points
- **Base**: 46 points
- **Difficulty**: 8 (1.7x multiplier)
- **Final Score**: **78 points** 🏆

### Example 4: Speed Run
- **Accuracy**: 90% → 36 points
- **WPM**: 180 → 30 points (capped)
- **Base**: 66 points
- **Difficulty**: 4 (1.1x multiplier)
- **Final Score**: **73 points** 🚀

---

## 🎮 Progression Design

### Progressive Difficulty
The rank thresholds increase exponentially:
- Rank 0 → 1: 300 points (easy to get started)
- Rank 1 → 2: 500 points (building skills)
- Rank 2 → 3: 800 points (serious commitment)
- Rank 3 → 4: 1,200 points (expert dedication)
- Rank 4 → 5: 1,700 points (legendary achievement)

### Why This Works
1. **Balances Speed & Accuracy**: Neither alone can maximize score
2. **Rewards Challenge**: Harder passages give higher multipliers
3. **Encourages Practice**: Need consistent performance to rank up
4. **Achievable Goals**: Early ranks are quick, later ranks show dedication
5. **Fair Assessment**: Claude AI provides objective difficulty ratings

---

## 🎨 UI Display

### Dashboard Display
The Home Screen shows:
- **Current Rank**: Badge with emoji and name
- **Progress Bar**: Visual progress to next rank
- **Points Remaining**: "X points to [Next Rank]"
- **Only shown when**: User has unlocked Challenge Mode (Level 2+)

### Challenge Results Display
After completing a challenge:
- **Challenge Score**: "+X points" earned
- **Current Rank**: Badge display with emoji
- **Rank Up Alert**: "⬆️ RANK UP!" if rank increased
- **Progress Update**: Visual feedback on advancement

---

## 💾 Firebase Data Structure

### User Document Updates
```javascript
{
  challengeScore: 450,        // Total cumulative challenge points
  challengeRank: 1,            // Current rank (0-5)
  // ... other user fields
}
```

### Initialization
New users start with:
```javascript
{
  challengeScore: 0,
  challengeRank: 0
}
```

---

## 🔄 Difference from Bronze/Silver/Gold

| Feature | Per-Challenge Ranks | Cumulative Ranks |
|---------|---------------------|------------------|
| **Scope** | Single challenge | All-time progress |
| **Ranks** | Bronze/Silver/Gold | Novice → Legend (0-5) |
| **Reset** | Each challenge | Never resets |
| **Purpose** | Performance feedback | Long-term progression |
| **Display** | Results screen | Home dashboard |
| **Based on** | Challenge score (0-100) | Cumulative points |

Both systems coexist:
- **Bronze/Silver/Gold**: Immediate performance feedback
- **Cumulative Ranks**: Long-term achievement tracking

---

## 🚀 Implementation Details

### Key Services

**`challengeRankingService.js`**
- `calculateChallengeScore(difficulty, wpm, accuracy)` - Calculate points
- `getRankInfo(totalScore)` - Get current rank and progress
- `addChallengeScore(current, earned)` - Update and check rank up
- `estimateDifficulty(text)` - Fallback difficulty estimation

**`claudeService.js`**
- `assessPassageDifficulty(text)` - AI difficulty assessment (1-10)

### Integration Flow
```
1. User completes challenge
2. System calculates accuracy & WPM
3. Claude AI assesses passage difficulty
4. Calculate challenge score
5. Add to user's total score
6. Check for rank up
7. Update Firebase
8. Display results with rank info
```

---

## 🎯 Design Philosophy

**Goal**: Create a meaningful long-term progression system that:
- Encourages regular practice
- Rewards both speed and accuracy
- Accounts for passage difficulty
- Provides clear milestones
- Feels achievable but prestigious

**Balance**: The system ensures that:
- Beginners can make quick initial progress
- Veterans have meaningful goals to chase
- Difficulty affects scoring fairly
- All playstyles (speed/accuracy/balance) are viable

---

*Implemented: 2026-02-01*
*Feature: Challenge Mode Cumulative Ranking System*
