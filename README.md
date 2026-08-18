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
OPENAI_API_KEY=sk-proj-your-openai-key-here
GEMINI_API_KEY=your-gemini-api-key-here
PERPLEXITY_API_KEY=your-perplexity-api-key-here
```

### Getting API Keys

- **OpenAI**: Visit [platform.openai.com/account/api-keys](https://platform.openai.com/account/api-keys)
- **Google Gemini**: Visit [aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey)
- **Perplexity**: Visit [perplexity.ai](https://www.perplexity.ai) and check account settings for API access

### Demo vs Production Mode

- **With all keys**: Live AI analysis runs real queries against all three providers
- **With missing keys**: Falls back to demo generator for UI/UX validation (data is pseudo-random, not real)
- **Mixed keys**: Only enabled providers run live queries; disabled ones are skipped

## Scoring methodology

### AI Visibility Score (0–100)
- **70%** from brand mentions across AI responses
- **30%** from direct citations (when the AI explicitly references your site)
- **Sentiment boost** when mentions are positive/recommended

### GEO Score
Measures local/structured presence signals like entity data, FAQ alignment, and authority.

### SEO Score
Reflects content authority and discoverability relative to competitors.

### How mentions are detected
- Direct domain matching (e.g., "example.com" in text)
- Recommendation phrases (e.g., "we recommend", "best for", "according to")
- Citation patterns (URLs, source references)

## Running analysis

1. Enter your website URL and industry category
2. (Optional) Add target keywords and competitor URLs for benchmarking
3. Select which AI providers to analyze
4. Submit and wait for results (~30–60 seconds depending on providers)
5. Review scores, sub-factors, competitors, and recommendations
6. Save results to view history anytime

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

