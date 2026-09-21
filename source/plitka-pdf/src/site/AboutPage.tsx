import { aboutPageMeta } from './aboutContent';
import { AboutInfo } from './AboutInfo';
import { SitePageShell } from './SitePageShell';

export function AboutPage() {
  return (
    <SitePageShell
      wide
      eyebrow={aboutPageMeta.eyebrow}
      title={aboutPageMeta.title}
      lead={aboutPageMeta.lead}
    >
      <AboutInfo />
    </SitePageShell>
  );
}
