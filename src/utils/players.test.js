import { describe, it, expect } from 'vitest';
import { nameKey, isTaken, findDuplicateName } from './players';

describe('nameKey', () => {
  it('reads a name the way a person would, ignoring case and stray spaces', () => {
    expect(nameKey('Kim')).toBe(nameKey('kim'));
    expect(nameKey('Kim')).toBe(nameKey(' Kim '));
    expect(nameKey('Kim')).not.toBe(nameKey('Kimberly'));
  });
});

describe('isTaken', () => {
  it('spots a seat already filled, however the name was typed', () => {
    expect(isTaken(['Kim', 'Sam'], 'kim')).toBe(true);
    expect(isTaken(['Kim', 'Sam'], 'Sam ')).toBe(true);
    expect(isTaken(['Kim', 'Sam'], 'Alex')).toBe(false);
  });

  it('has no objection to an empty table', () => {
    expect(isTaken([], 'Kim')).toBe(false);
    expect(isTaken(undefined, 'Kim')).toBe(false);
  });
});

describe('findDuplicateName', () => {
  it('names the offender rather than just saying no', () => {
    expect(findDuplicateName(['Kim', 'Sam', 'kim'])).toBe('kim');
  });

  it('is happy with a list of distinct names', () => {
    expect(findDuplicateName(['Kim', 'Sam', 'Alex'])).toBeNull();
    expect(findDuplicateName([])).toBeNull();
  });
});
