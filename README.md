# AI Visibility Analyzer

A demo-to-production app for measuring how visible a brand is across ChatGPT, Gemini, and Perplexity-style AI answer engines.

## Features

- Website + competitor benchmarking
- Multi-provider AI visibility scoring
- GEO and SEO score breakdowns
- Recommendation engine for answer-engine improvements
- Local server-backed run history for saved analyses

## Local setup

You need Node.js and npm installed.

```sh
git clone <this-repository-url>
cd <repository-name>
npm install
cp .env.example .env
npm run dev
```

## Environment variables

Copy the example file and add your real keys:

```env
OPENAI_API_KEY=
GEMINI_API_KEY=
PERPLEXITY_API_KEY=
```

The app will attempt live provider calls when keys are present. If any key is missing, it falls back to the demo analysis generator so the interface still works.

## Scripts

```sh
npm run dev
npm run build
npm run preview
```

## Tech stack

- TanStack Start
- TypeScript
- React
- Tailwind CSS
- Vite

