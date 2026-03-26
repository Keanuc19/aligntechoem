# AlignSpecDB — Shared OEM Alignment Specification Database

A web app for your team to collaboratively build a database of OEM wheel alignment specs. Every technician gets the same live data — add a spec from one device and it appears on all others instantly.

**Stack:** React + Vite (frontend) · Supabase (free shared database) · Vercel (free hosting)

---

## 🚀 Setup Guide (30 minutes, one time)

### Step 1: Create a Supabase Project (free database)

1. Go to **https://supabase.com** and click **Start your project**
2. Sign up with GitHub (easiest) or email
3. Click **New Project**
   - **Name:** `alignspec-db`
   - **Database Password:** pick something strong, save it somewhere
   - **Region:** pick the closest to you (e.g. US East)
4. Click **Create new project** — wait ~2 minutes for it to spin up

### Step 2: Create the Database Table

1. In your Supabase dashboard, click **SQL Editor** in the left sidebar
2. Click **New Query**
3. Open the file `supabase-setup.sql` from this project
4. Copy the ENTIRE contents and paste it into the SQL Editor
5. Click **Run** (the green play button)
6. You should see "Success. No rows returned" — that's correct!

### Step 3: Get Your Supabase Credentials

1. In the Supabase dashboard, go to **Settings** (gear icon) > **API**
2. You need two values:
   - **Project URL** — looks like `https://abcdefgh.supabase.co`
   - **anon / public key** — the long string under "Project API keys"
3. Keep this page open — you'll need these in the next steps

### Step 4: Set Up the Project on Your Mac

Open **Terminal** (or the VS Code terminal) and run these commands one at a time:

```bash
# 1. Clone or create the project folder (if you haven't already)
cd ~/Desktop
# If you downloaded the zip, unzip it and cd into the folder
# If you're starting from Git:
# git clone https://github.com/YOUR-USERNAME/alignspec-db.git

cd alignspec-db

# 2. Install dependencies
npm install

# 3. Create your environment file
cp .env.example .env
```

Now open the `.env` file and replace the placeholder values:

```
VITE_SUPABASE_URL=https://your-actual-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-actual-anon-key-here
```

### Step 5: Test Locally

```bash
npm run dev
```

Open **http://localhost:5173** in your browser. You should see the AlignSpecDB app! Try adding a spec — it should save to Supabase.

### Step 6: Push to GitHub

```bash
# 1. Create a new repo on github.com (click + > New Repository)
#    Name it: alignspec-db
#    Keep it Private if you want
#    Do NOT initialize with README (you already have one)

# 2. Connect your local project to GitHub
git init
git add .
git commit -m "Initial commit - AlignSpecDB"
git branch -M main
git remote add origin https://github.com/YOUR-USERNAME/alignspec-db.git
git push -u origin main
```

### Step 7: Deploy to Vercel (free hosting, gives you a URL)

1. Go to **https://vercel.com** and sign up with your GitHub account
2. Click **Add New** > **Project**
3. Find and select your `alignspec-db` repository
4. Before clicking Deploy, add your **Environment Variables**:
   - Click **Environment Variables**
   - Add `VITE_SUPABASE_URL` = your Supabase project URL
   - Add `VITE_SUPABASE_ANON_KEY` = your Supabase anon key
5. Click **Deploy**
6. Wait ~1 minute — Vercel will give you a URL like `https://alignspec-db.vercel.app`

**That's your live URL!** Share it with your technicians.

---

## 📱 Using the App

1. Open the URL on any device (phone, tablet, laptop)
2. Enter your name (so the team knows who added what)
3. Click **Add Spec** to enter a new vehicle's alignment specs
4. All data syncs in real-time — if Mike adds a 2024 Camry from Bay 1, Sarah sees it instantly on her tablet in Bay 3

### Tips for Building the Database Fast

- **Start with your top 30 vehicles** — the ones you align most often
- **Use the Duplicate button** — a 2023 Camry often has the same specs as 2024. Duplicate it and just change the year
- **Pull specs from AllData/Mitchell1** — look up the vehicle, find the alignment specs page, and enter the preferred/min/max values
- **Export regularly** — click Export JSON to back up your database

---

## 🛠 For Claude Code Users (VS Code)

If you have Claude in VS Code, you can ask it to help with:
- "Add a CSV import feature so I can bulk-import specs"
- "Add user authentication so only my team can access it"  
- "Build the alignment recording tool that uses this spec database"

---

## 📁 Project Structure

```
alignspec-db/
├── index.html              # Entry point
├── package.json            # Dependencies
├── vite.config.js          # Build config
├── supabase-setup.sql      # Run this in Supabase SQL Editor
├── .env.example            # Template for environment variables
├── .gitignore              # Files to exclude from Git
└── src/
    ├── main.jsx            # React bootstrap
    ├── App.jsx             # Main application
    ├── supabase.js         # Database connection
    └── index.css           # Styles
```

---

## ❓ Troubleshooting

**"Failed to connect to database"**
- Check your `.env` file has the correct Supabase URL and key
- Make sure you ran the SQL setup script in Step 2
- Check Supabase dashboard > Table Editor to see if `alignment_specs` table exists

**Vercel deploy fails**
- Make sure you added both environment variables in Vercel project settings
- Go to Vercel dashboard > your project > Settings > Environment Variables

**Data not syncing between users**
- Make sure the realtime line in the SQL script ran successfully
- All users must be using the same Vercel URL (not localhost)

**Want to change your name**
- Click "Switch User" in the bottom-left of the spec list
