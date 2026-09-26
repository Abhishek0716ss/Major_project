# AI Face Access Control — Foundation Phase

This is **Phase A** of your NIE major project rebuild: project setup, admin
login (password + passkey/WebAuthn), and user registration with in-browser
face enrollment. It is a real, runnable Next.js app — not a mockup.

Modules 3–10 from your plan (liveness, adaptive auth, risk scoring, intrusion
severity classification, explainable auth, live analytics dashboard) are
**not built yet** — see "What's next" below. Building all ten as one
finished, bug-free system in a single pass isn't realistic; this gives you a
working, secure base to build the rest on top of, one module at a time.

## What actually works right now

- Admin login with email + password (bcrypt-hashed, rate-limited)
- Passkey (WebAuthn) sign-in as a second, passwordless option — Windows
  Hello, Touch ID, phone authenticator, or a USB security key
- Protected dashboard (redirects to `/login` if not authenticated)
- User registration form with **live webcam face enrollment** in the browser
  (face-api.js): detects a face, checks detection confidence and distance
  from camera, captures 5 good samples, averages them into one descriptor
- Face descriptors are encrypted (AES-256-GCM) before being written to
  SQLite — **raw face images are never stored**, only the numeric descriptor
  used for future matching

## Prerequisites

- Node.js 18.18+ (`node -v`)
- A webcam
- Internet access **once**, to install npm packages and download the
  face-api.js model files (after that, the app runs fully offline on
  localhost)

## Setup

```bash
cd face-security-system
npm install

cp .env.example .env.local
# Edit .env.local:
#  - ADMIN_EMAIL is already set to your email
#  - Set ADMIN_BOOTSTRAP_PASSWORD to a temporary password you'll change on first login
#  - Generate JWT_SECRET:        node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
#  - Generate FACE_DATA_ENC_KEY: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

bash scripts/download-face-models.sh   # Mac/Linux/Git Bash — downloads ~7MB of model weights into public/models
# Windows (plain PowerShell/CMD), use this instead:
#   powershell -ExecutionPolicy Bypass -File scripts\download-face-models.ps1

npm run create-admin                   # creates your admin account from .env.local
# Now remove ADMIN_BOOTSTRAP_PASSWORD from .env.local — it's no longer needed.

npm run dev
```

Open **http://localhost:3000**, log in with your email + the password you
set, then go to the dashboard and click **"Set up passkey login"** to
register a passkey for faster, passwordless sign-in next time.

## Project layout

```
app/
  login/                 admin sign-in (password + passkey)
  dashboard/             protected home: user list, roadmap, passkey setup
  register/              new user registration + face enrollment (THIS is
                          "where to train a face" — /register, webcam panel)
  api/auth/...           login, logout, WebAuthn registration/verification
  api/users/...          user registration, user listing
lib/
  db.js                  SQLite schema + connection
  auth.js                password hashing, JWT signing/verification
  session.js              cookie helpers (Node runtime)
  crypto.js               AES-256-GCM encrypt/decrypt for face descriptors
middleware.js            edge-runtime route guard (redirects unauth'd users)
components/
  WebcamFaceCapture.jsx  camera + face-api.js capture logic
scripts/
  create-admin.js        bootstraps the single admin account
  download-face-models.sh
```

**Direct answers to your questions:**
- **Login page** → `app/login/page.js`, served at `/login`.
- **Where to "train" a face** → there's no separate training step; enrollment
  happens live at `/register` when an admin registers a user — the browser
  captures 5 webcam samples and computes one face descriptor per person.
  Matching against these descriptors (actual "authentication") is Module 4,
  not yet built.
- **Why it felt like it was "lagging"** → there was no code yet, only your
  PPT. This is the first real codebase.

## Security notes (read before treating this as production-ready)

- Face descriptors are encrypted at rest, but the encryption key
  (`FACE_DATA_ENC_KEY`) lives in `.env.local` on the same machine — fine for
  a local demo, not fine for a real deployment (use a secrets manager/HSM).
- Rate limiting on `/api/auth/login` is in-memory and per-process — resets
  on restart and won't work across multiple server instances.
- There is exactly one admin account by design (matches your "admin login"
  requirement). Extend `admins` table if you need more than one.
- WebAuthn is configured for `localhost` only (`RP_ID=localhost`,
  `ORIGIN=http://localhost:3000`). Deploying anywhere else requires updating
  both to your real domain **and** serving over HTTPS.
- This has not been through a security audit or automated test suite. Treat
  "completely secured" as a direction to keep working toward, not a box
  already checked.

## What's next (in build order)

1. **Face Authentication + Multi-Frame Matching** — live camera match against
   stored descriptors (Euclidean/cosine distance threshold) at an "access
   point" screen.
2. **Liveness / Anti-Spoofing** — blink detection + head-turn challenge
   before a match is accepted (webcam-only liveness is a deterrent, not a
   guarantee — say so honestly in your report).
3. **Intrusion Detection + Severity Classification** — on repeated failed
   matches, log an intrusion event, snapshot the frame, classify severity by
   attempt frequency/time-of-day.
4. **Dynamic Risk Assessment + Decay** — score each access attempt, decay
   risk over time per user.
5. **Adaptive Authentication** — raise the match threshold or require a
   second factor when risk is elevated.
6. **Explainable Authentication + Real-Time Alerts** — surface *why* a
   decision was made; push alerts over Socket.IO/email as they happen.
7. **Security Dashboard + Analytics** — charts over access/intrusion logs
   already being written to SQLite.

Tell me which one to build next and I'll add it to this same codebase.
