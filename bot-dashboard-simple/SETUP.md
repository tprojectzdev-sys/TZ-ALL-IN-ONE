# Discord Bot Dashboard Setup Guide

## 🚀 Quick Start

### Step 1: Replace your package.json

Replace your current `package.json` with the new one I'm providing. It keeps all your bot dependencies and adds the UI dependencies.

### Step 2: Copy these files to your bot project root:

```
your-bot-project/
├── index.js (keep your existing file)
├── dashboard.js (keep your existing file)
├── package.json (REPLACE with new one)
├── vite.config.ts (NEW)
├── tailwind.config.ts (NEW)
├── tsconfig.json (NEW)
├── tsconfig.app.json (NEW)
├── tsconfig.node.json (NEW)
├── postcss.config.js (NEW)
├── index.html (NEW)
├── src/ (NEW folder with all React components)
│   ├── components/
│   ├── pages/
│   ├── hooks/
│   ├── lib/
│   ├── types/
│   ├── App.tsx
│   ├── main.tsx
│   └── index.css
└── public/ (your existing public folder - will be overwritten by build)
```

### Step 3: Install dependencies

```bash
npm install
```

This will install both your bot dependencies AND the new UI dependencies.

### Step 4: Start the bot (as usual)

```bash
npm start
```

Your bot will run on port 3000 (as it does now).

### Step 5: Start the UI dev server (NEW - separate terminal)

Open a **NEW terminal window** and run:

```bash
npm run ui:dev
```

This starts the React dev server on port 5173.

### Step 6: Open the dashboard

Go to: **http://localhost:5173**

You'll see your glassmorphic dashboard!

---

## 🎯 How It Works

### Development Mode

- **Bot Backend**: Runs on `http://localhost:3000` (your dashboard.js)
- **React Frontend**: Runs on `http://localhost:5173` (Vite dev server)
- The frontend proxies API calls to the backend

### Production Mode

1. Build the UI:
```bash
npm run ui:build
```

2. This compiles everything into the `public/` folder

3. Start your bot:
```bash
npm start
```

4. Access dashboard at `http://localhost:3000` (served by Express)

---

## 📝 Commands

```bash
npm start           # Start the bot
npm run dashboard   # Start dashboard server only
npm run ui:dev      # Start React dev server (for development)
npm run ui:build    # Build React app to public/ folder
npm run ui:preview  # Preview production build locally
```

---

## 🔧 Workflow

### For Development (making UI changes):

1. Terminal 1: `npm start` (bot running)
2. Terminal 2: `npm run ui:dev` (hot reload UI)
3. Edit files in `src/` and see changes instantly

### For Production (deploying):

1. `npm run ui:build` (compile UI)
2. `npm start` (bot serves the compiled UI)
3. Share `http://your-ip:3000` with your team

---

## 🎨 Customization

All UI code is in the `src/` folder:

- `src/components/` - Reusable components (Sidebar, Header, Cards)
- `src/pages/` - Pages (Overview, Modules, Activity, etc.)
- `src/index.css` - Global styles and color variables
- `src/hooks/useApi.ts` - API data fetching

To change colors, edit `src/index.css`:
```css
--primary: 180 85% 55%;  /* Cyan color */
--accent: 180 85% 55%;
```

---

## ✅ Checklist

- [ ] Replaced package.json
- [ ] Copied all new files (vite.config.ts, src/, etc.)
- [ ] Ran `npm install`
- [ ] Started bot with `npm start`
- [ ] Started UI with `npm run ui:dev` in a new terminal
- [ ] Opened http://localhost:5173 in browser
- [ ] Dashboard loaded successfully!

---

## 🐛 Troubleshooting

**"ERR_CONNECTION_REFUSED on port 5173"**
- Make sure you ran `npm run ui:dev` in a separate terminal
- Check if port 5173 is already in use

**"Cannot find module '@/...' "**
- Run `npm install` again
- Check that `src/` folder exists with all files

**"API calls failing"**
- Make sure your bot (dashboard.js) is running on port 3000
- Check vite.config.ts proxy settings

**Changes not appearing**
- Vite has hot reload - just save the file
- Try refreshing the browser
- Check the terminal for build errors

---

## 🎉 You're Done!

Your glassmorphic dashboard should now be running. Navigate through the pages and enjoy your modern UI!
