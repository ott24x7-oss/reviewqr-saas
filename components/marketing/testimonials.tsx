import { Star } from "lucide-react";
import { AvatarInitials } from "@/components/ui/avatar-initials";

const testimonials = [
  {
    name: "Rakesh Sharma",
    role: "Owner, Spice Junction Café",
    location: "Bengaluru",
    rating: 5,
    quote:
      "Our Google rating jumped from 4.1 to 4.6 in two months. The QR code on every bill is the simplest growth hack I've ever set up.",
    image:
      "https://api.dicebear.com/7.x/initials/svg?seed=Rakesh%20Sharma&backgroundColor=1a73e8&fontFamily=Poppins"
  },
  {
    name: "Priya Iyer",
    role: "Manager, Glow Beauty Salon",
    location: "Chennai",
    rating: 5,
    quote:
      "We catch unhappy customers before they post a 1-star review. Saved my reputation more than once. Best ₹499 I spend every month.",
    image:
      "https://api.dicebear.com/7.x/initials/svg?seed=Priya%20Iyer&backgroundColor=34a853&fontFamily=Poppins"
  },
  {
    name: "Dr. Anil Verma",
    role: "Dental Clinic Owner",
    location: "Pune",
    rating: 5,
    quote:
      "Three branches, three QR codes, one dashboard. The negative-feedback WhatsApp alert lets me apologize personally — that has changed our reviews.",
    image:
      "https://api.dicebear.com/7.x/initials/svg?seed=Anil%20Verma&backgroundColor=ea4335&fontFamily=Poppins"
  },
  {
    name: "Sneha Kulkarni",
    role: "Co-founder, Threadwork Boutique",
    location: "Mumbai",
    rating: 5,
    quote:
      "The WhatsApp template feature is gold. We get 5x more reviews than when we asked verbally. Customers actually click.",
    image:
      "https://api.dicebear.com/7.x/initials/svg?seed=Sneha%20Kulkarni&backgroundColor=fbbc04&fontFamily=Poppins"
  },
  {
    name: "Karthik Reddy",
    role: "Owner, FitZone Gym",
    location: "Hyderabad",
    rating: 5,
    quote:
      "Staff-wise tracking told me Arjun was driving most of our 5-star reviews. Promoted him last week. Game-changer.",
    image:
      "https://api.dicebear.com/7.x/initials/svg?seed=Karthik%20Reddy&backgroundColor=1a73e8&fontFamily=Poppins"
  },
  {
    name: "Meena Pillai",
    role: "Restaurant Group, 7 outlets",
    location: "Kochi",
    rating: 5,
    quote:
      "We went from manually checking Google Maps every Monday to a beautiful weekly PDF email. My GMs love it.",
    image:
      "https://api.dicebear.com/7.x/initials/svg?seed=Meena%20Pillai&backgroundColor=34a853&fontFamily=Poppins"
  }
];

export function Testimonials() {
  return (
    <section className="py-16 sm:py-24">
      <div className="container max-w-6xl">
        <div className="text-center max-w-2xl mx-auto">
          <span className="inline-block px-3 py-1 rounded-full bg-primary-50 text-primary-700 text-sm font-medium">
            Loved by SMBs
          </span>
          <h2 className="section-title mt-4 font-display">
            Stories from <span className="gradient-text">2,500+ Indian businesses</span>
          </h2>
          <p className="section-sub mt-4">
            Cafés, salons, clinics, gyms, boutiques — they all share one thing.
          </p>
        </div>

        <div className="mt-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {testimonials.map((t) => (
            <figure
              key={t.name}
              className="rounded-xl border bg-white p-6 shadow-soft hover:shadow-card transition-shadow flex flex-col"
            >
              <div className="flex items-center gap-0.5 mb-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star
                    key={i}
                    className={`h-4 w-4 ${
                      i < t.rating ? "fill-amber-400 text-amber-400" : "fill-muted text-muted"
                    }`}
                  />
                ))}
              </div>
              <blockquote className="text-sm sm:text-base text-foreground/90 leading-relaxed flex-1">
                "{t.quote}"
              </blockquote>
              <figcaption className="mt-5 flex items-center gap-3">
                <AvatarInitials name={t.name} className="h-10 w-10 text-sm shrink-0" />
                <div>
                  <div className="font-medium text-sm">{t.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {t.role} · {t.location}
                  </div>
                </div>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}
