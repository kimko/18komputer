export function isLightColor(hex) {
  if (!hex) return false;
  
  // Remove the hash at the start if it's there
  hex = hex.replace('#', '');
  
  // If it's 3 digits, expand it
  if (hex.length === 3) {
    hex = hex.split('').map(char => char + char).join('');
  }

  // Parse RGB
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  
  // Handle invalid parsing
  if (isNaN(r) || isNaN(g) || isNaN(b)) return false;

  // Calculate relative luminance using the YIQ equation
  const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
  
  // Return true if light
  return yiq >= 128;
}

export function getContrastColor(hex) {
  return isLightColor(hex) ? 'gray.900' : 'white';
}
