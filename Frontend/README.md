# PrintForge 3D — Mobile App
### CODEQUEST 2026 · Group 42 · KNUST

A React Native + Expo + TypeScript frontend for the PrintForge 3D platform — a 3D print request and job management system for university labs.

---

## Tech Stack

- **Expo SDK 51** (managed workflow)
- **React Native 0.74**
- **TypeScript**
- Navigation via custom state-based router (drop-in replace with React Navigation)
- All data mocked locally — connect to Spring Boot backend via the API endpoints in the proposal

---

## Screens Implemented

| Screen | Description |
|--------|-------------|
| Splash / Onboarding | Animated brand intro with CTA |
| Login | Email/password auth with role detection |
| Register | Multi-role sign-up (Student / Lab Staff / Admin) |
| Home (Student) | Dashboard, active print banner, stats, quick actions |
| My Jobs | Filtered list of all user jobs |
| Job Detail | Full job info, status timeline, staff review actions |
| Submit Job (4-step) | File upload → Material → Options → Review |
| Notifications | Real-time job status alerts |
| Profile | User info, stats, role switcher (demo), sign out |
| Staff/Admin Dashboard | Pending review queue, printer management, queue view |

---

## Design System

- **Palette**: Deep space navy (#0A0F1E) + Electric cyan accent (#00D2FF)
- **Typography**: System fonts with tight display weights
- **Signature element**: Cyan glow rings + pulsing accent on active jobs

---

## Getting Started

```bash
# Install dependencies
npm install
# or
yarn install

# Start Expo dev server
npx expo start

# Run on Android
npx expo start --android

# Run on iOS
npx expo start --ios
```

---

## Demo Roles

Use any email with `@` to log in. Role is auto-detected:

| Email pattern | Role |
|---|---|
| Any `@` email | Student |
| Contains `staff` or `lab` or `boateng` | Lab Staff |
| Contains `admin` or `asante` | Admin |

You can also switch roles from the Profile screen.

---

## API Integration

Connect to the Spring Boot backend by replacing the mock data in `src/constants/mockData.ts` with real fetch calls to:

- `POST /api/auth/login` — authentication
- `GET /api/print-jobs` — job list
- `POST /api/print-jobs` — submit job
- `GET /api/queue` — queue status
- `GET /api/notifications` — notifications

See the proposal document for full API design.

---

## Project Structure

```
PrintForge3D/
├── App.tsx                      # Root app + navigation
├── src/
│   ├── constants/
│   │   ├── theme.ts             # Colors, typography, spacing tokens
│   │   └── mockData.ts          # Mock jobs, materials, printers
│   ├── components/
│   │   ├── UI.tsx               # Button, Card, Input, Badge, etc.
│   │   └── JobCard.tsx          # Reusable job list item
│   ├── screens/
│   │   ├── SplashScreen.tsx
│   │   ├── LoginScreen.tsx
│   │   ├── RegisterScreen.tsx
│   │   ├── HomeScreen.tsx
│   │   ├── JobsScreen.tsx
│   │   ├── JobDetailScreen.tsx
│   │   ├── SubmitJobScreen.tsx
│   │   ├── NotificationsScreen.tsx
│   │   ├── ProfileScreen.tsx
│   │   └── AdminDashboard.tsx
│   ├── hooks/
│   │   └── useAuth.tsx          # Auth context + mock login
│   └── types/
│       └── index.ts             # TypeScript interfaces
├── app.json                     # Expo config
├── tsconfig.json
└── package.json
```

---

Group 42 — John Yeboah, Cofie Denzil Kobena Paddy, Edu Martey Gareth, Kankam Jude Mensah, Fiadzawoo Jude Sedem
