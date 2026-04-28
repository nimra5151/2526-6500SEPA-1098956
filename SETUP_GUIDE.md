# TutorBridge — Complete Setup Guide
**For non-technical users. Read this before setting up anywhere.**

---

## What This App Is

TutorBridge is a learning platform with three types of users:
- **Students** — orphanage children who book classes and submit assignments
- **Tutors** — volunteer teachers who create and teach classes
- **Coordinators** — admins who manage everything from a dashboard

The app is built with:
- **Frontend:** React (what you see in the browser)
- **Backend:** Node.js / Express (the server that handles data)
- **Database:** PostgreSQL (where all data is stored permanently)

---

## Before You Begin — What You Need to Install

### On your computer (local setup)

You need these three programs installed on your computer first:

| Program | What it does | Where to download |
|---|---|---|
| **Node.js v20** | Runs the app | https://nodejs.org (click "LTS") |
| **PostgreSQL 15+** | The database | https://www.postgresql.org/download/ |
| **Git** | Downloads the code | https://git-scm.com/downloads |

After installing Node.js, open Terminal (Mac/Linux) or Command Prompt (Windows) and verify:
```
node --version    → should show v20.x.x
npm --version     → should show 10.x.x
```

---

## Part 1 — Running Locally (on your computer)

### Step 1: Download the code

```bash
git clone https://github.com/YOUR_REPO_URL/tutorbridge.git
cd tutorbridge
```

### Step 2: Install all packages

```bash
npm install
```
This downloads ~300 packages the app needs. Takes 1–3 minutes.

### Step 3: Create your environment file

The app needs a file called `.env` to know things like your database password. Copy the example:

```bash
cp .env.example .env
```

Now open `.env` in any text editor (Notepad, TextEdit, VS Code) and fill in the values. See the **Environment Variables Explained** section below for exactly what each one means.

### Step 4: Set up PostgreSQL database

After installing PostgreSQL, create the database the app will use:

**On Mac/Linux:**
```bash
psql -U postgres -c "CREATE DATABASE tutorbridge;"
```

**On Windows (in Command Prompt as Administrator):**
```
"C:\Program Files\PostgreSQL\15\bin\psql.exe" -U postgres -c "CREATE DATABASE tutorbridge;"
```

Then set `DATABASE_URL` in your `.env` file to:
```
DATABASE_URL=postgresql://postgres:YOUR_POSTGRES_PASSWORD@localhost:5432/tutorbridge
```
Replace `YOUR_POSTGRES_PASSWORD` with the password you chose when you installed PostgreSQL.

### Step 5: Create the database tables

```bash
npm run db:push
```
This creates all the tables (students, classes, bookings, etc.) in your database.

### Step 6: Start the app

```bash
npm run dev
```

Open your browser and go to: **http://localhost:5000**

You should see the TutorBridge homepage. The app automatically creates demo accounts on first run:

| Role | Email | Password |
|---|---|---|
| Coordinator | sarah@tutorbridge.org | password123 |
| Tutor | james@example.com | password123 |
| Student | kofi@example.com | password123 |

---

## Part 2 — Deploying to Hostinger (or any VPS)

### What plan you need on Hostinger

You need a **VPS (Virtual Private Server)** plan — NOT shared hosting. Shared hosting does not support Node.js apps. Look for:
- **KVM 1** or higher (starts around $4–8/month)
- Ubuntu 22.04 operating system

### Step 1: Connect to your VPS

Hostinger gives you an IP address and root password after purchase. Connect via SSH:

```bash
ssh root@YOUR_VPS_IP
```
(On Windows, use PuTTY or Windows Terminal)

### Step 2: Install required software on the VPS

Run these commands one by one:

```bash
# Update the system
apt update && apt upgrade -y

# Install Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs

# Install PostgreSQL
apt install -y postgresql postgresql-contrib

# Install Nginx (web server that sits in front of your app)
apt install -y nginx

# Install PM2 (keeps your app running even after crashes/restarts)
npm install -g pm2

# Install Git
apt install -y git
```

### Step 3: Set up PostgreSQL on the VPS

```bash
# Switch to postgres user and create your database
sudo -u postgres psql -c "CREATE DATABASE tutorbridge;"
sudo -u postgres psql -c "CREATE USER tutor_user WITH ENCRYPTED PASSWORD 'choose_a_strong_password';"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE tutorbridge TO tutor_user;"
```

Your `DATABASE_URL` will be:
```
DATABASE_URL=postgresql://tutor_user:choose_a_strong_password@localhost:5432/tutorbridge
```

### Step 4: Upload your code to the VPS

```bash
# On the VPS, download your code from GitHub
cd /var/www
git clone https://github.com/YOUR_REPO_URL/tutorbridge.git
cd tutorbridge

# Install packages
npm install
```

### Step 5: Create the .env file on the VPS

```bash
cp .env.example .env
nano .env
```
Fill in all values (see Environment Variables section below). For production:
- Set `NODE_ENV=production`
- Set `APP_URL=https://yourdomain.com`
- Generate a strong `SESSION_SECRET` (run: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`)

Press `Ctrl+X`, then `Y`, then `Enter` to save.

### Step 6: Build the app for production

```bash
npm run build
```
This creates an optimized version of the app in the `dist/` folder.

### Step 7: Set up the database tables

```bash
npm run db:push
```

### Step 8: Start the app with PM2 (keeps it running)

```bash
pm2 start "npm run start" --name tutorbridge
pm2 startup    # makes it auto-start after VPS reboots
pm2 save
```

### Step 9: Set up Nginx (makes your domain point to the app)

Create an Nginx config file:

```bash
nano /etc/nginx/sites-available/tutorbridge
```

Paste this (replace `yourdomain.com` with your actual domain):

```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;

    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Enable it and restart Nginx:

```bash
ln -s /etc/nginx/sites-available/tutorbridge /etc/nginx/sites-enabled/
nginx -t    # test the config
systemctl restart nginx
```

### Step 10: Add a free SSL certificate (https://)

```bash
apt install -y certbot python3-certbot-nginx
certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

Follow the prompts — Certbot handles everything. Your site will now be available at `https://yourdomain.com`.

### Step 11: Point your domain to Hostinger

In Hostinger's control panel (or wherever you bought your domain):
- Go to **DNS Settings**
- Add an **A Record**: `@` → `YOUR_VPS_IP`
- Add an **A Record**: `www` → `YOUR_VPS_IP`
- DNS changes take 10 minutes to 24 hours to work worldwide

---

## Environment Variables Explained

Open `.env.example` — these are all the settings you need to configure. Here's what each one means in plain English:

### Required — App will NOT start without these

| Variable | What it means | Example |
|---|---|---|
| `DATABASE_URL` | Connection address to your PostgreSQL database | `postgresql://postgres:mypassword@localhost:5432/tutorbridge` |
| `SESSION_SECRET` | A long random password used to protect user sessions. **Generate it, don't make one up.** | Run: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |
| `APP_URL` | The full web address where your app lives | `http://localhost:5000` (local) or `https://yourdomain.com` (production) |
| `PORT` | Which port the server listens on | `5000` |
| `NODE_ENV` | Tells the app if it's in development or production mode | `development` (local) or `production` (hosted) |

### Optional — Email features (password reset, notifications)

Without these, email features are silently disabled. The app still works.

| Variable | What it means | How to get it |
|---|---|---|
| `SMTP_HOST` | Email server address | For Gmail: `smtp.gmail.com` |
| `SMTP_PORT` | Email server port | For Gmail: `587` |
| `SMTP_USER` | Your email address | `yourname@gmail.com` |
| `SMTP_PASS` | **App Password** (NOT your Gmail password) | Go to Google Account → Security → 2-Step Verification → App Passwords. Create one for "Mail". You get a 16-character code. |

> **Important:** If you use Gmail, you must turn on 2-Factor Authentication first, then create an App Password. Your regular Gmail password will NOT work here.

### Optional — AI features (Study Buddy, AI grading)

Without this, AI features show a "not available" message. Everything else still works.

| Variable | What it means | How to get it |
|---|---|---|
| `OPENAI_API_KEY` | Lets the app use ChatGPT-style AI | Sign up at https://platform.openai.com, go to API Keys, create one. Costs money per use (very small amounts). |

### Optional — Zoom (live video classes)

Without these, the Zoom meeting buttons are hidden.

| Variable | What it means | How to get it |
|---|---|---|
| `ZOOM_ACCOUNT_ID` | Your Zoom account identifier | Sign in at https://marketplace.zoom.us, create a "Server-to-Server OAuth" app |
| `ZOOM_CLIENT_ID` | App ID from Zoom | Same place as above |
| `ZOOM_CLIENT_SECRET` | App secret from Zoom | Same place as above |

### Optional — Google Sign-In

Without these, the "Sign in with Google" button is hidden.

| Variable | What it means | How to get it |
|---|---|---|
| `GOOGLE_CLIENT_ID` | Google app identifier | Go to https://console.cloud.google.com → APIs & Services → Credentials → Create OAuth 2.0 Client ID |
| `GOOGLE_CLIENT_SECRET` | Google app secret | Same place as above |

> When setting up Google OAuth for production: add `https://yourdomain.com/api/auth/google/callback` as an Authorized Redirect URI in Google Console.

### Optional — Pinecone (AI Study Buddy memory)

Without this, the AI Study Buddy works but has no memory of course content (it uses ChatGPT without course context).

| Variable | What it means | How to get it |
|---|---|---|
| `PINECONE_API_KEY` | Key for the Pinecone vector database | Sign up at https://pinecone.io (free tier available) |
| `PINECONE_INDEX` | Name of your Pinecone index | Create an index named `tutorbridge` with 1536 dimensions |

---

## Useful Commands (cheat sheet)

```bash
# Start in development mode (local, with hot reload)
npm run dev

# Build for production (run this before deploying)
npm run build

# Start in production mode (after building)
npm run start

# Apply database schema changes (run after any schema update)
npm run db:push

# Run the AI content ingestion (for Study Buddy features)
npm run rag:ingest
```

**PM2 commands (on your VPS):**
```bash
pm2 status              # see if your app is running
pm2 logs tutorbridge    # see app logs (errors, activity)
pm2 restart tutorbridge # restart after updating code
pm2 stop tutorbridge    # stop the app
```

**When you update your code (deploy new version):**
```bash
cd /var/www/tutorbridge
git pull                  # download latest code
npm install               # install any new packages
npm run build             # rebuild the frontend
npm run db:push           # apply any database changes
pm2 restart tutorbridge   # restart the app
```


---


## Troubleshooting Common Problems

### "Cannot connect to database"
- Check that PostgreSQL is running: `sudo systemctl status postgresql`
- Double-check `DATABASE_URL` in your `.env` — no typos in username/password
- Make sure the database was created: `psql -U postgres -c "\l"` (should list `tutorbridge`)

### "Port 5000 already in use"
Another program is using port 5000. Either stop it, or change `PORT=5001` in your `.env`.

### "Session secret is required"
You left `SESSION_SECRET` as the placeholder value. Generate a real one:
```
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```
Paste the result into `.env`.

### Emails not sending
- Make sure you used a Gmail **App Password**, not your regular password
- Check that 2-Factor Authentication is enabled on your Google account
- Test with: `curl http://localhost:5000/api/email/test` (shows exactly what's wrong)

### App works locally but not after deploying
1. Run `npm run build` before deploying — you must build before production
2. Check `NODE_ENV=production` is set in your production `.env`
3. Check `APP_URL` is set to your real domain with `https://`
4. Check PM2 logs: `pm2 logs tutorbridge`

### "Cannot find module" after `npm install`
Delete `node_modules` and reinstall:
```bash
rm -rf node_modules
npm install
```

---

## Security Reminders

- **Never** commit your `.env` file to GitHub — it's already in `.gitignore`
- **Never** share your `SESSION_SECRET` with anyone
- **Change all passwords** from the seed data defaults before going live (`password123`)
- **Keep your VPS updated**: run `apt update && apt upgrade` monthly
- **Renew SSL**: Certbot auto-renews, but check with `certbot renew --dry-run`

---

## File Structure (what each folder is for)

```
tutorbridge/
├── client/          → All frontend code (React pages, components)
│   └── src/
│       ├── pages/   → Student, Teacher, Admin dashboards
│       └── components/ → Reusable UI pieces
├── server/          → All backend code (API, database, auth)
│   ├── index.ts     → App entry point
│   ├── routes.ts    → All API endpoints
│   ├── storage.ts   → Database queries
│   └── seed.ts      → Demo data creator
├── shared/          → Code shared between frontend and backend
│   └── schema.ts    → Database table definitions
├── dist/            → Built production files (created by npm run build)
├── migrations/      → Database migration history
├── .env.example     → Template for your .env file
└── SETUP_GUIDE.md   → This file
```

---

*Last updated: April 2026. App version: TutorBridge v1.0*
