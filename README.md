# Trace

> *record of change*

A photo journaling app that helps you track visual changes over time. Take a photo with a translucent overlay of a previous reference shot, capture the same composition over weeks or months, and see your transformation in stack or slider comparison views.

Useful for diet progress, plant growth, interior changes, or any slow transformation worth remembering.

## Features

- **Reference overlay camera** — translucent overlay of a previous photo helps you align new shots to the same composition
- **Adjustable overlay opacity** — slider for fine-grained transparency control
- **Tap-to-focus** with iOS-style yellow indicator
- **Pinch + preset zoom** (1x / 2x / 3x / 5x)
- **3×3 grid guide** for composition
- **Folders & projects** — group projects together (e.g. "Plants" → Pine, Forsythia) or create top-level standalone projects
- **Two compare modes**
  - **Stack** — top/bottom split with independent pinch-zoom on each pane
  - **Slider** — drag a vertical divider to reveal before/after
- **Photo library import** — bring in old photos with EXIF date preserved
- **Export** — slideshow saved to camera roll album, or vertical collage as a single shareable image
- **i18n** — English / Korean toggle in Settings
- **Daily onboarding** — animated chameleon (pink → teal color shift) that shows once per day on first open
- **Editorial dark theme** — coral accent on charcoal background, Lora serif + Inter sans

All data stored locally on device. No accounts, no sync, no analytics.

## Stack

- **React Native** + **Expo** (SDK 54)
- **TypeScript**
- **expo-camera** for photo capture and overlay
- **expo-image-picker** for gallery imports
- **expo-image-manipulator** + **react-native-view-shot** for collage export
- **expo-media-library** + **expo-sharing** for save and share
- **react-native-svg** for the chameleon onboarding illustration
- **AsyncStorage** for project/folder/photo metadata
- **expo-file-system** (legacy) for photo file storage in app document directory
- **@expo-google-fonts/lora** + **@expo-google-fonts/inter**
- **@react-navigation/native-stack**
- **expo-haptics** for tactile feedback

## Project structure

```
src/
├── theme/colors.ts         editorial dark palette + typography tokens
├── i18n/                   string dictionary + Context provider
├── types/                  Folder, Project, Photo
├── storage/                AsyncStorage CRUD + migrations
│   ├── folders.ts
│   ├── projects.ts
│   ├── photos.ts
│   ├── recompute.ts        folder cover/count cascade
│   ├── cascade.ts          recursive folder deletion
│   ├── import.ts           gallery import with EXIF date
│   ├── onboarding.ts       daily reset flag
│   └── migration.ts        one-time data shape upgrades
├── components/             ZoomablePane, CompareSlider, CompareStack,
│                            PhotoPickerSheet, Chameleon
├── screens/                Home, FolderDetail, ProjectDetail, Camera,
│                            Compare, Export, Settings, Onboarding
├── navigation/             RootNavigator + RootStackParamList
└── utils/                  share helpers
```

## Setup

```bash
npm install --legacy-peer-deps
npx expo start
```

Open in Expo Go on a real device for full camera testing. iOS Simulator works for everything except the actual camera feed.

## Building

EAS Build for distribution:

```bash
eas build --profile development --platform ios   # dev client for simulator/device
eas build --profile production --platform ios    # App Store
eas build --profile production --platform android # Google Play
```

## License

Personal project. All rights reserved.
