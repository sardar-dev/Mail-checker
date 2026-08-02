# Gmail Checker

A modern, production-ready Gmail Checker web application built with Next.js 15, React 19, TypeScript, and Tailwind CSS.

## Features

- **Gmail Detection** — Automatically identify Gmail and Googlemail addresses
- **Email Syntax Validation** — RFC-compliant syntax checking
- **MX Record Check** — Verify mail exchange records
- **DNS Lookup** — Real-time DNS resolution
- **Duplicate Removal** — Automatically detect and remove duplicates
- **Bulk Checking** — Validate up to 70 email addresses at once
- **Instant Results** — Real-time validation results
- **Deliverability Score** — Comprehensive scoring system
- **Responsive Design** — Works on all devices
- **Dark Mode** — Beautiful dark interface with glassmorphism

## Tech Stack

- **Frontend**: Next.js 15, React 19, TypeScript, Tailwind CSS, Framer Motion
- **Backend**: Next.js API Routes
- **Validation**: DNS lookup, MX Record lookup, Email syntax validation

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn

### Installation

```bash
# Clone the repository
git clone https://github.com/your-username/gmail-checker.git
cd gmail-checker

# Install dependencies
npm install

# Copy environment variables
cp .env.example .env

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Environment Variables

Create a `.env` file in the root directory:

```env
DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:5432/app_db
```

## Usage

1. Paste one or more Gmail addresses into the textarea (one per line)
2. Click **Start Checking** to begin validation
3. View real-time progress and results
4. Download results in TXT, CSV, or JSON format
5. Copy results to clipboard or print

## Docker Deployment

```bash
# Build and run with Docker Compose
docker-compose up -d

# Or build manually
docker build -t gmail-checker .
docker run -p 3000:3000 gmail-checker
```

## Vercel Deployment

1. Push your code to GitHub
2. Import the repository in [Vercel](https://vercel.com)
3. Configure environment variables
4. Deploy

## Project Structure

```
src/
├── app/
│   ├── api/
│   │   ├── validate/route.ts    # Email validation API
│   │   └── health/route.ts      # Health check endpoint
│   ├── globals.css               # Global styles
│   ├── layout.tsx                # Root layout
│   ├── page.tsx                  # Home page
│   ├── robots.ts                 # SEO robots
│   └── sitemap.ts                # SEO sitemap
├── components/
│   ├── AnimatedBackground.tsx    # Canvas particle animation
│   ├── FAQ.tsx                   # FAQ accordion
│   ├── Features.tsx              # Feature cards
│   ├── Footer.tsx                # Footer
│   ├── GmailChecker.tsx          # Main checker component
│   ├── Hero.tsx                  # Hero section
│   ├── ProgressBar.tsx           # Live progress display
│   ├── ResultsTable.tsx          # Results table with actions
│   └── SummaryCards.tsx          # Summary statistics
├── lib/
│   └── validators.ts             # Email validation logic
├── types/
│   └── index.ts                  # TypeScript type definitions
└── utils/
    ├── download.ts               # Download and clipboard utilities
    ├── helpers.ts                 # General utility functions
    └── rate-limit.ts             # Rate limiting middleware
```

## License

MIT
