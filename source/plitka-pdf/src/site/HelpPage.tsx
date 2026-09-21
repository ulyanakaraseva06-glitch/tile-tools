import { helpPageMeta } from './helpContent';
import { HelpGuide } from './HelpGuide';
import { SitePageShell } from './SitePageShell';

export function HelpPage() {
  return (
    <SitePageShell
      wide
      eyebrow={helpPageMeta.eyebrow}
      title={helpPageMeta.title}
      lead={helpPageMeta.lead}
    >
      <HelpGuide />
    </SitePageShell>
  );
}
