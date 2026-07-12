# meow-study  (≧◡≦)

> A tiny cozy study nook for notes, tasks, soundscapes, Pomodoro purrs, streaks, and calendar magic (｡•̀ᴗ-)✧

**Live app:** [Open the cute little meow-study app on Netlify](https://meow-study.netlify.app)

## Hello There (ฅ^•ﻌ•^ฅ)

meow-study is a soft little productivity space built to feel calm, playful, and useful (✿◠‿◠). It bundles study tools, a soundboard, note capture, task tracking, and gentle progress feedback in one sweet place.

## Try the App (ﾉ◕ヮ◕)ﾉ*:･ﾟ✧

You can jump in right here:

[Launch meow-study](https://meow-study.netlify.app)

## Tiny Quick Start (ง'̀-'́)ง

1. Open the live app or run it locally.
2. Sign in and connect your Supabase project.
3. Load the database schema and add the bundled media files.
4. Start tracking tasks, notes, sessions, and streaks.

## Local Setup (•̀ᴗ•́)و

Install dependencies:

```
npm install
```

Connect Supabase in `src/supabaseClient.js` by filling in `SUPABASE_URL` and `SUPABASE_ANON_KEY` from Supabase Settings > API Keys.

Run the database schema by opening the SQL Editor, creating a new query, pasting all of `schema.sql`, and running it. It is safe to re-run on older versions. The schema adds task columns, subtasks, due dates, folders, expanded note fields, labels, reminders, voice/image/drawing support, session history, badges, calendar metadata, sound mix settings, and the `notes-media` bucket.

See `public/ADD_YOUR_FILES_HERE.txt` for the exact filenames and folders you need to add. It lists the required images, ambiance tracks, and Pomodoro sound effects, including the filenames that need a quick rename.

## Optional Google Calendar Sparkle Sync (｡•̀ᴗ-)✧

meow-study can reuse your existing Google sign-in for calendar sync. No new Google Cloud project is required.

1. Sign in with Google in the app.
2. Approve the extra calendar access prompt the first time it appears.
3. If your OAuth consent screen is still in Testing mode, make sure your account is added as a test user.

After that, events you add in the Calendar panel are created on your Google Calendar too. If sync stops working, sign out and sign back in to refresh the access token.

## Run Locally or Deploy (っ˘ω˘ς)

Start the app locally with:

```
npm run dev
```

To deploy, push to GitHub and let Netlify build it with `npm run build`. The publish directory is `dist`, already configured in `netlify.toml`.

## What’s Included (｡•̀ᴗ-)✧

- **Foundation**: light/dark theme, custom backgrounds, profile picture, username, email/password changes, welcome greeting, in-app toasts
- **Soundboard**: real audio files for rain, cafe, fire, and ocean waves, plus saved mix presets
- **Pomodoro**: task picker, real sound effects, session prompts, daily goal progress, auto-start toggle, full session history
- **Tasks**: Todo / In Progress / Completed columns, inline editing, subtasks, due dates, overdue highlighting, time tracking
- **Media**: link history with back and forward navigation
- **Streak**: weekly recap and achievement badges
- **Notes**: rich text editing, five note types, labels, note colors, pinning, folders, archive, search, templates, backlinks, reminders, export
- **Calendar**: category color-coding and one-way sync to Google Calendar

## Known Limitations (´• ω •`)

- **Voice transcription** uses the browser's built-in speech recognition, which is Chrome-only. Recording still works everywhere.
- **OCR** runs locally in the browser with Tesseract.js, so it is free but slower than a cloud OCR service.
- **Google Calendar sync** is one-way from meow-study to Google.
- **Rich text formatting** uses the browser's built-in `execCommand` API, which is dependable but older than a modern editor library.
