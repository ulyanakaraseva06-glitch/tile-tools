import { describe, expect, it } from 'vitest';
import { clone } from './clone';

describe('clone', () => {
  it('creates an independent deep copy for plain project-like data', () => {
    const original = {
      title: 'Project',
      pages: [
        {
          id: 'page_1',
          zones: {
            heading: {
              value: 'Hello'
            }
          }
        }
      ]
    };

    const copied = clone(original);
    copied.pages[0].zones.heading.value = 'Updated';

    expect(copied).not.toBe(original);
    expect(copied.pages).not.toBe(original.pages);
    expect(original.pages[0].zones.heading.value).toBe('Hello');
  });
});
