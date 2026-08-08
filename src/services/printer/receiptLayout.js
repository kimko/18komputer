export function trainLabel(train, index) {
  const stopCount = train.stopCount || 0;
  if (stopCount === 0) return `T${index + 1}`;
  return train.hasBonus ? `${stopCount}s+` : `${stopCount}s`;
}
