# meow-study

A cozy study desk, now with real accounts, rich notes, a kanban task board,
a real audio soundboard, Pomodoro sound effects and goals, streak badges,
and optional Google Calendar sync.

## 1. Install

```
npm install
```

## 2. Connect Supabase

`src/supabaseClient.js` — fill in `SUPABASE_URL` and `SUPABASE_ANON_KEY`
from Supabase → Settings → API Keys.

## 3. Run the database schema

SQL Editor → New query → paste all of `schema.sql` → Run. Safe to re-run
even over older versions — it now adds: task columns/subtasks/due dates,
a `folders` table, a much bigger `notes` table (type, color, pinned,
archived, labels, reminders, list/voice/image/drawing fields), a
`label_colors` table, `pomodoro_sessions` history, a `badges` table, extra
`calendar_events` columns (category/color/google_event_id), a
`sound_mixes` field in settings, and a third storage bucket (`notes-media`)
alongside the existing `avatars`/`backgrounds` ones.

## 4. Add your files

See `public/ADD_YOUR_FILES_HERE.txt` for exact filenames and folders —
3 images, 4 ambiance audio files, 3 Pomodoro sound effects. Three of the
sound effect files need a quick rename (no spaces/capitals) — the note
explains exactly what to rename each one to.

## 5. (Optional) Enable Google Calendar sync

This reuses your existing Google sign-in — no new Google Cloud project
needed — but it does need one addition:

1. Google Cloud Console → your OAuth client → under **Scopes**, you don't
   need to add anything manually here; the app now requests the
   `calendar.events` scope automatically when someone signs in with Google.
2. The first time you sign in with Google *after* this update, Google will
   show an extra consent line about calendar access — approve it.
3. If your app is still in "Testing" mode in the OAuth consent screen
   (normal for a personal project), only test users you've explicitly
   added can grant this scope — add your own Google account there if you
   haven't already.

Once granted, any event you add in the Calendar panel also gets created on
your real Google Calendar. Note: Google only hands over this access token
at the moment of sign-in — if sync ever stops working, sign out and back
in with Google to refresh it.

## 6. Run locally / deploy

Same as before:
```
npm run dev
```
for local testing, or push to GitHub and let Netlify build it (`npm run
build`, publish directory `dist` — already set in `netlify.toml`).

## What's included now

- **Foundation**: light/dark theme, custom backgrounds, profile picture,
  username, email/password change, welcome greeting, in-app toasts instead
  of browser alerts
- **Soundboard**: real audio files (rain/cafe/fire/ocean waves), saved mix
  presets
- **Pomodoro**: task picker (auto-moves the task to "In Progress"), real
  sound effects, "another session?" prompt, daily goal progress bar,
  auto-start toggle, full session history logged per task
- **Tasks**: Todo / In Progress / Completed columns, inline editing,
  subtasks, due dates with overdue highlighting, time-spent tracking
- **Media**: link history with back/forward navigation
- **Streak**: weekly recap ("up X min from last week"), 7 achievement
  badges
- **Notes**: rich text (bold/italic/underline/alignment/font/size), five
  note types (text/list/voice/image/drawing), color-coded labels, note
  colors, pinning, folders, archive, full-text/label/type search, 3
  templates, backlinks via `[[Note Title]]`, time-based + recurring
  reminders (in-tab + OS notification if permitted), export to .txt/.md,
  share via your own email client
- **Calendar**: category color-coding, one-way sync to real Google
  Calendar when signed in with Google

## Known limitations, honestly

- **Voice transcription** uses the browser's built-in speech recognition,
  which is Chrome-only. Recording itself works in any browser; live
  transcript text only appears in Chrome.
- **OCR** (image to text) runs entirely in your browser via Tesseract.js —
  free, no API key, but slower and less accurate than a paid cloud OCR
  service, especially on handwriting.
- **Google Calendar sync is one-way** (meow-study to Google). Editing or
  deleting an event later doesn't push that change to Google yet — that'd
  need storing and reconciling both sides' edit history, a bigger job for
  a future pass.
- **Rich text formatting** uses the browser's built-in `execCommand` API.
  It's supported everywhere but is an older/simpler approach than a modern
  editor library — good for bold/italic/underline/fonts/alignment, not
  meant for anything more advanced.
