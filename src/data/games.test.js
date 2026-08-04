import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('Game Data Schema Validation', () => {
  const gamesDir = path.join(__dirname, 'games');
  const files = fs.readdirSync(gamesDir).filter(f => f.endsWith('.json') && f !== 'index.json');

  it.each(files)('%s should conform to GameData schema', (file) => {
    const filePath = path.join(gamesDir, file);
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));

    // 1. Primitive fields
    expect(data.id, 'id is required').toBeTypeOf('string');
    expect(data.name, 'name is required').toBeTypeOf('string');
    
    // bggId is optional, but if present must be number
    if ('bggId' in data) {
      expect(data.bggId).toBeTypeOf('number');
    }

    if ('maxOr' in data) {
      expect(data.maxOr).toBeTypeOf('number');
    }

    // 2. Arrays
    expect(Array.isArray(data.revenueStops), 'revenueStops must be an array').toBe(true);
    expect(data.revenueStops.every(s => typeof s === 'number'), 'revenueStops must be numbers').toBe(true);

    if (data.parValues) {
      expect(Array.isArray(data.parValues)).toBe(true);
      expect(data.parValues.every(s => typeof s === 'number')).toBe(true);
    }

    if (data.sharePrices) {
      expect(Array.isArray(data.sharePrices)).toBe(true);
      expect(data.sharePrices.every(s => typeof s === 'number')).toBe(true);
    }

    // 3. Companies
    expect(Array.isArray(data.companies), 'companies must be an array').toBe(true);
    expect(data.companies.length).toBeGreaterThan(0);
    
    data.companies.forEach((company, index) => {
      expect(company.name, `Company ${index} name missing`).toBeTypeOf('string');
      expect(company.shortName, `Company ${index} shortName missing`).toBeTypeOf('string');
      
      // Color should be a valid hex string if present
      if (company.color) {
        expect(company.color).toMatch(/^#[0-9a-fA-F]{6}$/);
      }
    });

    // 4. Trains (optional)
    if (data.trains) {
      expect(Array.isArray(data.trains)).toBe(true);
      data.trains.forEach((train, index) => {
        expect(train.name, `Train ${index} name missing`).toBeTypeOf('string');
        expect(train.cost, `Train ${index} cost missing`).toBeTypeOf('number');
      });
    }

    // 5. Revenue Bonuses (optional)
    if (data.revenueBonuses) {
      expect(Array.isArray(data.revenueBonuses)).toBe(true);
      data.revenueBonuses.forEach((bonus, index) => {
        expect(bonus.label, `Bonus ${index} label missing`).toBeTypeOf('string');
        expect(Array.isArray(bonus.adds), `Bonus ${index} adds missing`).toBe(true);
        expect(bonus.adds.every(a => typeof a === 'number')).toBe(true);
      });
    }
  });
});
