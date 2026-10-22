# Landing images

Generated with Grok image generation, then resized with `node scripts/optimize-landing-images.mjs <source-folder>`.

Style for every shot: premium product photo, warm morning light, sand, cream, terracotta, and sage. Indian small-business settings. No words, no brand logos, no celebrity faces. Text on the site is HTML so Hindi can swap in.

The optimizer crops about 8% off the right and 10% off the bottom (corner stamps), then writes two sizes:

- `public/landing/<name>-800.webp` and `.avif` (mobile)
- `public/landing/<name>-1600.webp` and `.avif` (desktop frame; the number is the slot, not always 1600 pixels)

Each file is kept under about 150 KB.

## Source map

| File | Shot |
| --- | --- |
| hero, og, use-cafe | Café counter, acrylic stand, phone scanning it |
| product-reviews | Acrylic QR + NFC stand alone |
| product-menu | Stand beside a blank menu booklet |
| product-store | Phone and stand on a clothing-shop counter |
| product-profile | Phone with a link-page layout on a salon counter |
| product-combo | Stand, phone, booklet, and cup as one bundle |
| step-choose | Hand over three blank cards |
| step-ship | Kraft parcel beside the stand |
| step-setup | Phone on the counter, colour blocks on the screen |
| step-scan | Phone held toward the stand |
| step-results | Star, menu card, and a round dish |
| step-track | Tablet with an abstract chart |
| use-salon | Salon counter |
| use-shop | Kirana counter |
| use-clinic | Clinic reception |
| spot-shield | Small shield |
| spot-time | Hourglass |
| spot-india | Marigold |

## Prompts

Hero (16:9, new image): A premium product photograph of a small Indian café counter in warm morning light. A clear acrylic table stand holds a blank cream card with a simple abstract dark square pattern that is not writing, plus a small round metallic NFC disc. A hand holds a phone from behind so the screen faces the stand and shows no readable content. A ceramic coffee cup and a pastry rest on pale stone. Soft sand, cream, terracotta, and sage colours, shallow depth of field, realistic materials, quiet luxury.

Later shots were edited from the hero so the stand, light, and palette stay the same. Each edit asked for the new subject in that style, with no words, logos, faces, or watermark.

- product-reviews: square photo of only the acrylic stand on pale stone.
- product-menu: blank cream menu booklet beside the stand. Pages show soft colour blocks.
- product-store: phone in a wooden stand next to the acrylic stand, folded neutral fabrics, screen of coloured blocks.
- product-profile: phone on a salon counter with a plant and bowl, screen is a vertical stack of rounded blocks.
- product-combo: stand, phone, blank booklet, and ceramic cup together.
- step-choose: hand hovering over three blank cream cards, middle card raised.
- step-ship: kraft parcel tied with cotton string beside the stand.
- step-setup: phone and cup, screen of rounded colour blocks.
- step-scan: hand holding a phone toward the stand, phone seen from behind.
- step-results: ceramic star, blank menu card, round dish.
- step-track: tablet with abstract sage and terracotta bars, no numbers.
- use-salon: salon counter, towels, plant, stand, no people.
- use-shop: kirana counter, jars, paper bags, stand, no readable labels.
- use-clinic: calm reception desk, plant, bowl, stand, no people and no medical symbols.
- spot-shield: sage shield with a terracotta check, cream background.
- spot-time: terracotta hourglass, no numbers.
- spot-india: a single marigold.

Open Graph uses the hero frame at 1200×630. The café use-case crop uses the same hero source at 3:2.
