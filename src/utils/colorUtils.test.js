import { describe, it, expect } from 'vitest';
import { isLightColor, getContrastColor } from './colorUtils.js';

describe('isLightColor', () => {
  it('calls pale company colours light', () => {
    expect(isLightColor('#ffffff')).toBe(true);
    expect(isLightColor('#fef6c5')).toBe(true); // New York, Ontario & Western
  });

  it('calls dark company colours dark', () => {
    expect(isLightColor('#000000')).toBe(false);
    expect(isLightColor('#237333')).toBe(false); // Pennsylvania green
  });

  it('reads three-digit hex the same as six', () => {
    expect(isLightColor('#fff')).toBe(isLightColor('#ffffff'));
    expect(isLightColor('#000')).toBe(isLightColor('#000000'));
  });

  it('does not mind a missing hash', () => {
    expect(isLightColor('ffffff')).toBe(true);
  });

  it('treats anything it cannot read as dark, so text stays white', () => {
    expect(isLightColor('')).toBe(false);
    expect(isLightColor(undefined)).toBe(false);
    expect(isLightColor('not a colour')).toBe(false);
  });
});

describe('getContrastColor', () => {
  it('puts dark text on a light badge and white text on a dark one', () => {
    expect(getContrastColor('#fef6c5')).toBe('gray.900');
    expect(getContrastColor('#237333')).toBe('white');
  });

  it('falls back to white text when there is no colour to judge', () => {
    expect(getContrastColor(undefined)).toBe('white');
  });
});
