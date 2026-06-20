# Sporty Pulse Pro — Mobile App

Sporty Pulse Pro is a cross-platform fitness app built with React Native and Expo. It delivers personalised workout programs, real-time session tracking, and progress analytics for iOS and Android.

## Overview

The app guides users from onboarding through structured training programs — Rebuild, Operator, and Executive Performance tiers — tailored to their goals (Lose Weight, Build Muscle, Get Fit), training environment (home or gym), and available equipment. Users track live workout sessions with rest timers, log sets and reps, and review progress through animated charts and streak tracking.

## Tech Stack

| Layer          | Technology                                                        |
| -------------- | ----------------------------------------------------------------- |
| Framework      | React Native + Expo (SDK 54)                                      |
| Routing        | Expo Router                                                       |
| Language       | TypeScript                                                        |
| Animations     | React Native Reanimated                                           |
| Auth storage   | Expo SecureStore                                                  |
| Image handling | Expo Image, Expo Image Picker                                     |
| Build & deploy | EAS Build / EAS Update                                            |
| Backend        | [Sporty Pulse Pro API](#) — Next.js, Prisma, Supabase, Cloudinary |

## Project Structure

```
sporty-pulse-expo/
├── src/
│   ├── app/                  # Expo Router screens
│   │   ├── (auth)/            # Login, register
│   │   ├── (tabs)/            # Home, Programs, Progress, Training, Settings
│   │   ├── workout/            # Active session routes
│   │   └── _layout.tsx
│   ├── components/            # Reusable UI components
│   ├── hooks/                  # useAuth, useSessionState, useRestTimer, etc.
│   ├── lib/                     # API client, cache keys
│   └── types/                  # Shared TypeScript types
├── android/                    # Native Android project (prebuilt)
├── assets/                      # Icons, splash screens
├── app.json                    # Expo app configuration
├── eas.json                     # EAS Build profiles
└── package.json
```

## Getting Started

### Prerequisites

- Node.js 18+
- npm
- An Expo account ([expo.dev](https://expo.dev))
- EAS CLI: `npm install -g eas-cli`

### Installation

```bash
git clone https://github.com/YOUR-USERNAME/sporty-pulse-expo.git
cd sporty-pulse-expo
npm install
```

### Environment Variables

Create a `.env` file in the project root:

```
EXPO_PUBLIC_API_URL=https://your-backend-url.vercel.app
```

> Only variables prefixed `EXPO_PUBLIC_` are exposed to the app bundle. Never store secrets here.

### Running Locally

```bash
npx expo start
```

Scan the QR code with the Expo Go app, or run on a simulator:

```bash
npx expo start --android
npx expo start --ios
```

## Building for Production

This project uses [EAS Build](https://docs.expo.dev/build/introduction/) for native builds.

```bash
# Internal testing build (APK, installs directly on device)
eas build --profile preview --platform android

# Production build (App Bundle, for Play Store submission)
eas build --profile production --platform android
```

### Build Profiles

| Profile       | Purpose                          | Output                    |
| ------------- | -------------------------------- | ------------------------- |
| `development` | Local debugging with dev client  | APK                       |
| `preview`     | Internal testing, direct install | APK                       |
| `production`  | Store submission                 | AAB (Android) / IPA (iOS) |

## Over-the-Air Updates

JavaScript and UI changes can be pushed without a full rebuild:

```bash
eas update --branch preview --message "describe the change"
```

> Native module additions, permission changes, or icon/splash updates require a full rebuild.

## Key Features

- **Onboarding** — identity, goal, and equipment assessment
- **Programs** — filtered by goal, training environment, equipment, and experience level
- **Training** — active program tracking with session progression
- **Live Sessions** — set/rep logging, rest timers, weight tracking
- **Progress** — streaks, training history, recovery scoring, animated charts
- **Settings** — profile management, subscription tier, preferences

## License

Proprietary — all rights reserved.
