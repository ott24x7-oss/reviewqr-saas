# Landing Lighthouse (mobile)

Local run against `npx next start -p 3459` after `npm run build`. Lighthouse CLI, mobile form factor, headless Chrome. Scores are category scores times 100.

The home page was measured twice. The first pass was a cold start (Performance 89, TTFB about 480 ms). The scores below are the warm pass.

| URL | Performance | Accessibility | SEO | LCP | FCP | TTFB |
| --- | --- | --- | --- | --- | --- | --- |
| `/` | 90 | 100 | 100 | 3.5 s | 1.8 s | 60 ms |
| `/how-it-works` | 95 | 100 | 100 | 2.9 s | 1.5 s | 50 ms |
| `/plans/starter` | 97 | 100 | 100 | 2.6 s | 1.5 s | 60 ms |

Floors for this slice: Performance ≥ 90, Accessibility ≥ 95, SEO 100. All three pages meet them.

The LCP element on `/` is the hero image (`hero-800.avif` inside `#sell-hero`). The page preloads the WebP twin; Chrome still picks AVIF from the `<picture>` sources. Discovery stayed healthy (fetchpriority high, eager, load delay under 10 ms). The cold-start miss was server response time, not image discovery.
