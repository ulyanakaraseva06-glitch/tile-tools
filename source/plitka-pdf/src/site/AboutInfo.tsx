import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { aboutSections } from './aboutContent';

export function AboutInfo() {
  const [openId, setOpenId] = useState(aboutSections[0].id);

  return (
    <div className="about-accordion">
      {aboutSections.map((section) => {
        const open = section.id === openId;
        return (
          <section key={section.id} className={`about-item ${open ? 'open' : ''}`}>
            <button
              type="button"
              className="about-item-trigger"
              aria-expanded={open}
              onClick={() => setOpenId(open ? '' : section.id)}
            >
              <span>{section.title}</span>
              <ChevronDown size={18} />
            </button>
            {open && (
              <div className="about-item-body">
                {section.paragraphs?.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
                {section.bullets?.length ? (
                  <ul>
                    {section.bullets.map((bullet) => <li key={bullet}>{bullet}</li>)}
                  </ul>
                ) : null}
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}
