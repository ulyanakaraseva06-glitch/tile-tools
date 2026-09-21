import { describe, expect, it } from 'vitest';
import { helpQuestions } from './helpContent';
import { aboutSections } from './aboutContent';

describe('site content', () => {
  it('keeps unique help questions and about sections', () => {
    expect(new Set(helpQuestions.map((item) => item.id)).size).toBe(helpQuestions.length);
    expect(helpQuestions.length).toBeGreaterThan(15);
    expect(new Set(aboutSections.map((item) => item.id)).size).toBe(aboutSections.length);
    expect(aboutSections.length).toBeGreaterThan(6);
  });
});
