# Inningz - Live Cricket Score Tracker

<div align="center">

[![Next.js](https://img.shields.io/badge/Next.js-15-black?logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue?logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind](https://img.shields.io/badge/Tailwind-3.4-38B2AC?logo=tailwind-css)](https://tailwindcss.com/)
[![License](https://img.shields.io/badge/license-MIT-green)](LICENSE)

</div>

**Inningz** is a modern cricket web app that delivers real-time scores, detailed scorecards, player profiles, ICC rankings, series stats, and over-by-over analysis. Built with Next.js 15 and designed mobile-first for cricket fans who want fast, comprehensive match coverage.

---

## Features

### Live Match Tracking
- Real-time score updates with 10-second polling
- Live batsmen and bowler stats, partnerships, and recent overs
- Ball-by-ball commentary with infinite scroll pagination
- Win probability indicator based on run rate, wickets, and match phase

### Match Views
- **Live** / **Recent** / **Upcoming** match tabs with category filters (International, League, Domestic, Women)
- Series-grouped match listings

### Full Scorecards
- Innings-by-innings batting and bowling breakdowns
- Fall of wickets, extras, partnerships
- Match stats and key moments

### Over-by-Over Analysis
- Interactive charts (Recharts) showing runs and wickets per over
- Toggle between per-over and cumulative score views

### Player Profiles
- Career statistics across Test, ODI, T20, and IPL formats
- ICC Rankings for batting, bowling, and all-rounder categories with best rank history
- Recent form (last 5 innings) with batting/bowling tab switcher
- Career summary tables with format-wise breakdown
- Player bio and personal info

### ICC Rankings
- Dedicated rankings page for Test, ODI, and T20 formats
- Batting, bowling, and all-rounder categories

### Series
- Series match schedules and fixtures
- Series statistics (most runs, most wickets, etc.)
- Points tables with group support
- Team filtering within series

### Match Squads
- Full team lineups with captain and wicket-keeper indicators
- Player in/out indicators showing changes from the previous match
- Click any player to view their full profile in a dialog

### Additional
- Dark/light theme with system preference detection
- Responsive mobile-first design
- Player highlight reel links

---

## Tech Stack

| Category | Details |
|---|---|
| **Framework** | Next.js 15 (App Router, Server Actions) |
| **Language** | TypeScript 5.9 |
| **Styling** | Tailwind CSS 3.4 |
| **UI** | Radix UI + shadcn/ui |
| **Charts** | Recharts |
| **Validation** | Zod |
| **Fonts** | DM Serif Display, DM Sans, JetBrains Mono |

---

## Architecture

```
src/
  app/
    page.tsx                      # Home (Live / Recent / Upcoming tabs)
    match/[matchId]/page.tsx      # Match detail view
    rankings/page.tsx             # ICC Rankings page
    series/[...seriesPath]/page.tsx # Series detail view
    actions.ts                    # Server actions (data fetching layer)

  ai/
    flows/scraper-flow.ts         # Cheerio-based scraping flows (16 flows)

  components/
    scraper.tsx                   # Main match display component
    live-matches.tsx              # Live match grid
    recent-matches.tsx            # Recent matches
    upcoming-matches.tsx          # Upcoming matches
    full-scorecard.tsx            # Complete scorecard
    player-profile.tsx            # Player bio, stats, rankings, form
    over-by-over-chart.tsx        # Runs per over visualization
    win-probability.tsx           # Match prediction algorithm
    match-squads.tsx              # Team lineups
    series-schedule.tsx           # Series fixtures
    series-stats.tsx              # Series statistics
    points-table.tsx              # League standings
    ui/                           # shadcn/ui component library
```

---

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn

### Installation

```bash
git clone https://github.com/vanshaj-pahwa/Inningz.git
cd Inningz
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

No environment variables or API keys are required — the app scrapes publicly available data.

---

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/my-feature`)
3. Commit your changes (`git commit -m 'feat: add my feature'`)
4. Push to the branch (`git push origin feature/my-feature`)
5. Open a Pull Request

## License

MIT License - see [LICENSE](LICENSE) for details.


