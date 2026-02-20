# Discord Bot Dashboard

A modern, glassmorphic dashboard for managing your Discord bot with real-time stats, module controls, and activity monitoring.

## 🎨 Features

- **Glassmorphism Design** - Frosted glass effects with cyan/teal accents
- **Real-time Stats** - Live bot metrics and performance data
- **Module Management** - Toggle bot features on/off
- **Activity Monitoring** - Track recent bot actions and user interactions
- **Leaderboard** - View top users by XP, level, and activity
- **Bot Controls** - Restart, pause, resume, or shutdown the bot
- **Responsive** - Works great on desktop and mobile

## 🚀 Setup Instructions

### 1. Copy the `src` folder to your project

Take the entire `/home/claude/discord-dashboard/src` folder and place it in your bot project directory.

### 2. Copy configuration files

You should already have these files, but verify they match:
- `package.json` ✅
- `vite.config.ts` ✅
- `tailwind.config.ts` ✅
- `tsconfig.json` ✅
- `postcss.config.js` ✅
- `index.html` (copy the new one)

### 3. Install dependencies

```bash
npm install
```

### 4. Run the development server

```bash
npm run dev
```

This will start Vite dev server on `http://localhost:5173` with hot reload.

### 5. Build for production

```bash
npm run build
```

This outputs to `../public` folder (which your Express server serves).

## 📁 Project Structure

```
src/
├── components/          # Reusable UI components
│   ├── Card.tsx        # Glass cards and stat cards
│   ├── Sidebar.tsx     # Navigation sidebar
│   ├── Header.tsx      # Top header with search and user menu
│   └── Layout.tsx      # Main layout wrapper
├── pages/              # Route pages
│   ├── Overview.tsx    # Dashboard home with stats
│   ├── Modules.tsx     # Module toggle page
│   ├── Activity.tsx    # Activity log
│   ├── Leaderboard.tsx # User rankings
│   └── Settings.tsx    # Bot controls and config
├── hooks/              # Custom React hooks
│   └── useApi.ts       # API data fetching hooks
├── lib/                # Utilities
│   └── utils.ts        # Helper functions
├── types/              # TypeScript types
│   └── index.ts        # Type definitions
├── App.tsx             # Main app with routing
├── main.tsx            # React entry point
└── index.css           # Global styles and utilities
```

## 🎯 How It Works

The dashboard connects to your existing Express backend (`dashboard.js`):

- **Stats**: Fetches from `/api/stats` every 5 seconds
- **Modules**: Fetches from `/api/modules` and toggles via `/api/toggle-module`
- **Activity**: Fetches from `/api/activity`
- **Leaderboard**: Fetches from `/api/leaderboard`
- **Controls**: Sends commands to `/api/control/:action`

## 🎨 Customization

### Change Colors

Edit `src/index.css` and modify the CSS variables:
```css
--primary: 180 85% 55%;  /* Cyan/teal */
--accent: 180 85% 55%;
```

### Change Fonts

Edit the Google Fonts import in `src/index.css`:
```css
@import url('https://fonts.googleapis.com/css2?family=YourFont&display=swap');
```

### Add New Pages

1. Create component in `src/pages/YourPage.tsx`
2. Add route in `src/App.tsx`
3. Add nav item in `src/components/Sidebar.tsx`

## 🔧 Development Tips

- Hot reload is enabled - changes appear instantly
- Use React DevTools for debugging
- Check browser console for API errors
- Vite proxy forwards `/api` to your Express server on port 3000

## 📦 Production Build

The build process outputs static files to `../public` which your Express server already serves. After running `npm run build`, restart your bot and access the dashboard via your Express server URL.

## 🎉 You're All Set!

Your glassmorphic Discord bot dashboard is ready! Navigate to different pages, toggle modules, and watch the real-time stats update.

Enjoy your next-gen dashboard! 🚀
