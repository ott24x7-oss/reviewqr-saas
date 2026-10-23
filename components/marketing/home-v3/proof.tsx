import { Star } from "lucide-react";
import type { OwnerStory } from "@/lib/landing/stories";
import { Shot } from "./shot";

/** Hidden when there are no real owner stories. Demo seed quotes are not used. */
export function HomeProof({ stories }: { stories: OwnerStory[] }) {
  if (stories.length === 0) return null;
  const shown = stories.slice(0, 3);
  const average = shown.reduce((sum, story) => sum + story.rating, 0) / shown.length;
  return (
    <section id="home-proof" className="hv3-section" aria-labelledby="home-proof-title">
      <div className="hv3-wrap">
        <h2 id="home-proof-title">Owners on QR24x7</h2>
        <p className="hv3-trust" style={{ marginTop: 12 }}>
          <Star size={20} strokeWidth={1.75} aria-hidden="true" />
          <span>
            {average.toFixed(1)} from {shown.length} {shown.length === 1 ? "owner" : "owners"}
          </span>
        </p>
        <div className="hv3-proof" style={{ marginTop: 16 }}>
          {shown.map((story) => (
            <figure key={`${story.name}-${story.business}`} className="hv3-quote">
              <Shot
                name={story.photo}
                kind="photo"
                alt={`${story.business} in ${story.city}`}
                sizes="(max-width: 767px) 100vw, 360px"
                width={800}
                height={600}
              />
              <div>
                <blockquote style={{ margin: 0 }}>
                  <p>{story.quote}</p>
                </blockquote>
                <figcaption className="hv3-small" style={{ marginTop: 8 }}>
                  {story.name}
                  <span className="hv3-muted">
                    {" "}
                    · {story.business}, {story.city}
                  </span>
                </figcaption>
              </div>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}
