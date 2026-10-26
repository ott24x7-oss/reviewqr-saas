import type { LandingTrust } from "@/lib/landing/proof";
import type { PhotoCredit } from "@/lib/landing/credits";
import type { OwnerStory } from "@/lib/landing/stories";
import type { StandAddon } from "@/lib/landing/hardware";
import type { PublicPlan } from "@/lib/plans/public";
import { homeFontClass } from "./font";
import { HomeHeader } from "./header";
import { HomeHero } from "./hero";
import { HomeFlow } from "./flow";
import { CustomerView } from "./customer-view";
import { HomeProof } from "./proof";
import { HomePlans } from "./plans";
import { HomeComparison } from "./comparison";
import { HomeStands } from "./stands";
import { HomeFaq } from "./faq";
import { HomeFinalCta } from "./final-cta";
import { HomeFooter } from "./footer";
import { HomeSticky } from "./sticky";
import "./home.css";

export function HomeV3({
  name,
  email,
  trust,
  startHref,
  whatsapp,
  plans,
  hardware,
  credits,
  stories
}: {
  name: string;
  email: string;
  trust: LandingTrust;
  startHref: string;
  whatsapp: string | null;
  plans: PublicPlan[];
  hardware: StandAddon[];
  credits: PhotoCredit[];
  stories: OwnerStory[];
}) {
  return (
    <div className={`home-v3 ${homeFontClass}`}>
      <HomeHeader name={name} startHref={startHref} />
      <main id="home-main">
        <HomeHero trust={trust} startHref={startHref} />
        <HomeFlow />
        <CustomerView />
        <HomeProof stories={stories} />
        <HomePlans plans={plans} />
        <HomeComparison />
        <HomeStands hardware={hardware} />
        <HomeFaq />
        <HomeFinalCta startHref={startHref} whatsapp={whatsapp} />
      </main>
      <HomeFooter name={name} email={email} credits={credits} />
      <HomeSticky startHref={startHref} whatsapp={whatsapp} />
    </div>
  );
}
