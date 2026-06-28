# NetWorth App - React Native Expo Setup

## Project Overview

This is a React Native Expo app for personal finance management, built with:
- **Framework:** React Native with Expo SDK 54
- **Navigation:** Expo Router (file-based routing)
- **Styling:** NativeWind (Tailwind CSS for React Native)
- **State Management:** Zustand
- **Language:** TypeScript

## Project Structure

```
app/
├── app/                          # Expo Router app directory
│   ├── _layout.tsx               # Root layout with auth check
│   ├── (auth)/                   # Authentication routes (conditional rendering)
│   │   ├── _layout.tsx           # Auth layout
│   │   ├── login.tsx             # Login screen
│   │   └── onboarding.tsx        # Onboarding flow (4 steps)
│   └── (tabs)/                   # Main app routes (after auth)
│       ├── _layout.tsx           # Tab navigation layout
│       ├── index.tsx             # Home/Dashboard
│       ├── networth.tsx          # Net Worth screen
│       ├── add.tsx               # Add new entry
│       ├── analytics.tsx         # Analytics
│       └── more.tsx              # More/Settings
│
├── components/                   # Reusable components
│   ├── buttons/
│   │   ├── PrimaryButton.tsx     # Main CTA button (purple gradient)
│   │   ├── SecondaryButton.tsx   # Secondary button (glass effect)
│   │   └── TextButton.tsx        # Text-only button
│   └── onboarding/
│       ├── CurrencyStep.tsx      # Step 1: Currency selection
│       ├── AccountStep.tsx       # Step 2: Add first account
│       ├── AssetStep.tsx         # Step 3: Add first asset
│       └── SuccessStep.tsx       # Step 4: Success/net-worth display
│
├── store/
│   └── authStore.ts              # Zustand auth state store
│
├── app.json                       # Expo app configuration
├── tailwind.config.js            # Tailwind CSS configuration
├── tsconfig.json                 # TypeScript configuration
├── .babelrc                      # Babel configuration for NativeWind
├── package.json                  # Dependencies
└── SETUP.md                      # This file
```

## Installation & Setup

### Prerequisites
- Node.js (v18+)
- npm or yarn
- Expo CLI: `npm install -g expo-cli`
- iOS Simulator (Mac) or Android Emulator

### 1. Install Dependencies

```bash
npm install
```

Key packages installed:
- `expo-router` - File-based navigation
- `nativewind` - Tailwind CSS for React Native
- `tailwindcss` - CSS framework
- `zustand` - State management
- `expo-secure-store` - Secure storage for tokens
- `@react-native-async-storage/async-storage` - AsyncStorage
- `axios` - HTTP client (for API calls)
- `expo-font` - Font loading

### 2. Start the Development Server

```bash
npm run android    # Android
npm run ios        # iOS
npm run web        # Web
```

Or use Expo CLI directly:
```bash
expo start
```

## Screens Created

### 1. **Login Screen** (`app/(auth)/login.tsx`)
- NetWorth logo (₹ in gradient box)
- Email login button
- Google OAuth button
- Guest login option
- Dark cosmic theme with purple/blue gradients

**Features:**
- Email input validation
- Loading states on buttons
- Deep linking support
- Guest login with device ID

### 2. **Onboarding Flow** (`app/(auth)/onboarding.tsx`)
4-step guided onboarding:

#### Step 1: Currency Selection
- Select INR or USD
- Feature list (3 benefits)
- Skip option
- Progress indicator

#### Step 2: Add First Account
- Account type selector (Savings/Current/Cash)
- Bank name input
- Balance input (decimal support)
- Live preview of account

#### Step 3: Add First Asset
- Asset type selector (Bank/Investment/Cash/Property)
- Asset name input
- Asset value input
- Live preview

#### Step 4: Success Screen
- Net worth calculation (Assets + Liabilities)
- Metrics cards (Assets in green, Liabilities in red)
- Milestone achievement banner
- Setup summary

## Design System

### Colors
```javascript
// Cosmic Dark Theme
cosmic-darker: #0a0e27      // Primary bg
cosmic-dark: #0f1629        // Secondary bg
cosmic-black: #000000       // Borders, frames
cosmic-surface: rgba(255, 255, 255, 0.06)  // Glass effect
cosmic-border: rgba(255, 255, 255, 0.12)   // Border color

// Accent Colors
accent-purple: #a855f7      // Primary CTA
accent-blue: #3b82f6        // Secondary accent

// Semantic Colors
semantic-success: #22c55e   // Green (Assets)
semantic-error: #ef4444     // Red (Liabilities)
semantic-warning: #f59e0b   // Orange (Alerts)
```

### Typography
- **Hero:** 48px, bold
- **Title:** 28-32px, bold
- **Headline:** 20px, bold
- **Body:** 14px, regular
- **Label:** 12px, semibold
- **Caption:** 11px, regular
- **Micro:** 10px, semibold

### Buttons
- **Primary:** Purple gradient, shadow, hover effect
- **Secondary:** Glass effect (semi-transparent), border
- **Text:** Purple text, no background

## Authentication Flow

### Current Flow (Development)
1. User opens app
2. `useAuthStore.checkAuth()` checks AsyncStorage for tokens
3. If authenticated → show `(tabs)` navigation
4. If not → show `(auth)` login/onboarding
5. After login → navigate to onboarding
6. After onboarding → navigate to dashboard `(tabs)`

### Future Flow (with Clerk)
- Replace manual email/password with Clerk authentication
- Implement Google OAuth via Clerk
- Store Clerk session tokens in SecureStore
- Auto-refresh on app launch

## Styling with NativeWind

All screens use **NativeWind** (Tailwind CSS for React Native):

```jsx
<View className="flex-1 bg-cosmic-darker px-6 py-8">
  <Text className="text-3xl font-bold text-white mb-4">
    Heading
  </Text>
  <PrimaryButton label="Continue" onPress={handleNext} />
</View>
```

### Available Utility Classes
- Colors: `bg-cosmic-darker`, `text-white`, `text-accent-purple`
- Spacing: `px-6`, `py-4`, `gap-3`, `mb-4`
- Sizing: `w-16`, `h-16`, `flex-1`
- Flexbox: `flex-row`, `items-center`, `justify-center`
- Border: `border`, `border-white/10`, `rounded-lg`
- Opacity: `opacity-50`, `text-white/70`
- Transforms: `translate-y-0.5`, `scale-95`

## Key Features Implemented

✅ **Auth Layout Switching** - Conditional rendering based on auth state
✅ **Login Screen** - Email, Google, Guest options
✅ **Multi-step Onboarding** - 4-step guided flow with progress
✅ **Form Validation** - Client-side validation on inputs
✅ **Loading States** - Button loading indicators
✅ **Dark Cosmic Theme** - CRED-inspired design
✅ **Responsive Design** - Mobile-first, scales to tablet
✅ **TypeScript** - Full type safety
✅ **Component System** - Reusable button & step components
✅ **State Management** - Zustand for auth state

## Next Steps (Phase 2)

- [ ] Integrate Clerk for authentication
- [ ] Create API client with Axios
- [ ] Implement backend API calls for login/signup
- [ ] Add secure token storage (SecureStore)
- [ ] Create dashboard screens (home, net worth, accounts)
- [ ] Add transaction list & details
- [ ] Implement SMS ingestion listener (Android)
- [ ] Create form screens (add account, asset, transaction)
- [ ] Add analytics visualizations
- [ ] Set up push notifications

## Development Tips

### Hot Reload
- Changes to `.tsx` files auto-reload
- Recompile `.ts` or config changes

### Debugging
```bash
# Expo DevTools (shake device or press D)
# Shows console logs, performance, etc.
```

### Typography in ClassNames
- Use `font-bold`, `font-semibold`, `font-normal`
- Use `text-xs`, `text-sm`, `text-base`, `text-lg`, etc.

### Adding New Screens
1. Create `.tsx` file in appropriate directory under `app/`
2. Export default component
3. Expo Router auto-registers the route

## Package Scripts

```bash
npm run android          # Run on Android emulator
npm run ios             # Run on iOS simulator
npm run web             # Run on web browser
npm start               # Start Expo dev server
npm run lint            # Run ESLint
npm run format          # Format code with Prettier
```

## Troubleshooting

### NativeWind Classes Not Working
- Check `.babelrc` has `nativewind/babel` plugin
- Rebuild: `npm run android` or `npm run ios`

### TypeScript Path Aliases Not Working
- Check `tsconfig.json` paths configuration
- Restart IDE/editor

### Zustand State Not Updating
- Ensure using hooks: `const { isAuthenticated } = useAuthStore()`
- Not direct store access

### Import Errors
- Use absolute imports: `import Component from "@/components/..."`
- Check `tsconfig.json` paths are correct

## Resources

- [Expo Documentation](https://docs.expo.dev)
- [Expo Router](https://expo.github.io/router)
- [NativeWind](https://www.nativewind.dev)
- [Zustand](https://github.com/pmndrs/zustand)
- [Tailwind CSS](https://tailwindcss.com)

## License

MIT
