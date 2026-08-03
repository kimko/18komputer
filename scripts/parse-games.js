/**
 * parseGameFile parses the custom .txt game files into a JSON structure.
 */
export function parseGameFile(content) {
  const result = {};
  
  // 1. Parse simple primitives
  const nameMatch = content.match(/Name:\s*'([^']+)'/);
  if (nameMatch) result.name = nameMatch[1];
  
  const bggIdMatch = content.match(/bggId:\s*(\d+)/);
  if (bggIdMatch) result.bggId = parseInt(bggIdMatch[1], 10);
  
  const maxOrMatch = content.match(/max or:\s*(\d+)/);
  if (maxOrMatch) result.maxOr = parseInt(maxOrMatch[1], 10);

  // 2. Parse arrays
  const parseArray = (key) => {
    const regex = new RegExp(key + ':\\s*\\[(.*?)\\]');
    const match = content.match(regex);
    if (!match) return undefined;
    return match[1].split(',')
      .map(s => s.trim())
      .filter(s => s !== '' && s !== 'null')
      .map(Number);
  };

  const revenueStops = parseArray('revenue stops');
  if (revenueStops) result.revenueStops = revenueStops;

  const parValues = parseArray('par values');
  if (parValues) result.parValues = parValues;

  const corporateStructures = parseArray('corporate structures');
  if (corporateStructures) result.corporateStructures = corporateStructures;

  // 3. Parse nested blocks
  // Helper to extract nested block content
  const extractBlock = (blockName) => {
    const regex = new RegExp(blockName + ':\\n([\\s\\S]*?)(?:\\n[a-z]+[a-z ]*:|$)');
    const match = content.match(regex);
    return match ? match[1] : '';
  };

  // Parse Companies
  const companiesBlock = extractBlock('companies');
  if (companiesBlock) {
    const companies = [];
    const chunks = companiesBlock.split(/\n\s*\n/).filter(c => c.trim().length > 0);
    
    for (const chunk of chunks) {
      const company = {};
      const cNameMatch = chunk.match(/name:\s*'([^']+)'/);
      if (cNameMatch) company.name = cNameMatch[1];

      const shortNameMatch = chunk.match(/short name:\s*'([^']+)'/);
      if (shortNameMatch) company.shortName = shortNameMatch[1];

      const colorMatch = chunk.match(/Color\(.*red:\s*([\d.]+),\s*green:\s*([\d.]+),\s*blue:\s*([\d.]+)/);
      if (colorMatch) {
        const r = Math.round(parseFloat(colorMatch[1]) * 255).toString(16).padStart(2, '0');
        const g = Math.round(parseFloat(colorMatch[2]) * 255).toString(16).padStart(2, '0');
        const b = Math.round(parseFloat(colorMatch[3]) * 255).toString(16).padStart(2, '0');
        company.color = `#${r}${g}${b}`;
      }
      
      if (Object.keys(company).length > 0) {
        companies.push(company);
      }
    }
    if (companies.length > 0) result.companies = companies;
  }

  // Parse Revenue Bonuses
  const bonusesBlock = extractBlock('revenue bonuses');
  if (bonusesBlock) {
    const bonuses = [];
    const chunks = bonusesBlock.split(/\n\s*\n/).filter(c => c.trim().length > 0);
    
    for (const chunk of chunks) {
      const bonus = {};
      const labelMatch = chunk.match(/label:\s*'([^']+)'/);
      if (labelMatch) bonus.label = labelMatch[1];
      const addsMatch = chunk.match(/adds:\s*\[(.*?)\]/);
      if (addsMatch) {
        bonus.adds = addsMatch[1].split(',')
          .map(s => s.trim())
          .filter(s => s !== '' && s !== 'null')
          .map(Number);
      }
      
      if (Object.keys(bonus).length > 0) {
        bonuses.push(bonus);
      }
    }
    if (bonuses.length > 0) result.revenueBonuses = bonuses;
  }

  return result;
}
