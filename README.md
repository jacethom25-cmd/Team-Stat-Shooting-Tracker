# Team Stat Tracker

A live stat-tracking web app for iPad/phone/computer, backed by your Supabase
database. Replaces the "Stats - 2025-2026.xlsx" workbook: roster, practice
stats, individual shooting drills, FT ladder, and conditioning all live in the
database, so daily/weekly/season rollups, positional rankings, and Top-8
leaderboards recalculate instantly as new stats are entered — no duplicating
tabs.

## 1. Set up the database (5 minutes)

1. Open your existing Supabase project (the one you're upgrading to Pro).
2. Go to **SQL Editor** → **New query**.
3. Paste in the entire contents of `supabase/schema.sql` from this folder and
   click **Run**. This creates all the tables, the `v_practice_stats` view,
   the auto-PR trigger, and row-level security policies.
4. Go to **Authentication → Users** and create a login for yourself (and any
   assistant coaches) — email + password. Everyone on staff can use the same
   sign-in screen from their own device.
5. (Optional but recommended) Go to **Authentication → Providers → Email**
   and turn off "Confirm email" if you want new accounts to be usable
   immediately without a confirmation email.
6. Go to your **DataInfo** shooting-drill list in the old spreadsheet and
   re-enter each drill into the app's **Shooting Drills** tab (name,
   standard, great, description) — this only needs to be done once. Program
   highs will then update themselves automatically as attempts are logged.
7. Add your players in the **Roster** tab. Every other screen reads from this
   list, so adding, renaming, or repositioning a player updates the whole app
   immediately.

## 2. Run it locally to try it out

You'll need [Node.js](https://nodejs.org) 18+ installed.

```bash
cd stat-app
cp .env.example .env
# edit .env and paste in your Supabase Project URL + anon public key
# (Supabase dashboard -> Settings -> API)

npm install
npm run dev
```

Open the URL it prints (usually `http://localhost:5173`) in your browser.

## 3. Put it on the internet so it works on iPad/phone anywhere

The easiest free option is **Vercel** (made for exactly this kind of app):

1. Push this `stat-app` folder to a GitHub repo (or use `vercel` CLI directly
   from the folder — `npx vercel`).
2. At [vercel.com](https://vercel.com), "Import Project" from that repo.
3. When it asks for environment variables, add `VITE_SUPABASE_URL` and
   `VITE_SUPABASE_ANON_KEY` (same values as your `.env` file).
4. Deploy. You'll get a URL like `your-team-stats.vercel.app` — bookmark it
   on every iPad/phone, or "Add to Home Screen" so it opens like a native app.

Any time you `git push` an update, Vercel redeploys automatically.

## What's in each tab

- **Dashboard** — Day / Week / Season toggle, team totals, positional-group
  totals (PG/Wing/BIG), and Top-8 leaderboards for Sum of Power 5, Sum of
  Reb, Sum of eFG%, Sum of +/-, and Sum of 3%, plus a full stat breakdown
  table (Power 5, negative stats, positive extras).
- **Practice Entry** — pick a date + Practice/Game, enter every stat column
  for the whole roster at once. Live-calculates FG%/3%/eFG%/FT%/PTS/REB/Power
  5 as you type. Safe to re-open and edit any day.
- **History** — every logged practice/game with quick team totals; click
  "Open / edit" to jump back into that day's entry screen.
- **Shooting Drills** — manage your drill catalog (standard/great/program
  high/description) and log attempts. Logging a new best automatically
  updates the drill's program high and record holder, and flags GOOD /
  GREAT / **PR** right on the spot.
- **FT Ladder** — log a 20-shot ladder session for the whole team at once.
  Run it multiple times in a practice by bumping the session number; each
  player's all-time personal best is tracked automatically. Standard = 16+,
  Great = 19-20.
- **Conditioning** — log 3-min/2-min/1-min results, auto-computed totals,
  program high, and a full multi-year history per player so you can see
  development over time.
- **Roster** — add/edit/deactivate players and set position (PG/Wing/BIG).
  Deactivating keeps their historical stats intact; it just removes them
  from active entry forms.

## Notes / things worth knowing

- "Sum of eFG%" and "Sum of 3%" on the leaderboards are literally the sum of
  each practice's percentage across the period (matching how a pivot table
  would total those columns in the old workbook). If you'd rather see the
  *average* percentage instead, say so and it's a one-line change in
  `src/pages/Dashboard.jsx`.
- Everyone signed in shares full read/write access (simplest setup for a
  small coaching staff). If you later want a "read-only" view for players or
  parents, that's an additional Supabase policy — just ask.
- This is a v1 focused on getting your core workflow — entry, PR tracking,
  rollups, rankings — live before your October start. Natural next steps
  once the season's underway: CSV export, push/email alerts on a new PR, and
  a quick-tap counter UI (+/- buttons) as an alternative to typing numbers
  for faster live in-game tracking.
