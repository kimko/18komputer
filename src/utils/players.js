// Everything a player owns is keyed by their name, so two players sharing one would share a pile
// of shares and cash. Case and surrounding spaces are ignored, because those read as the same name.
export const nameKey = (name) => String(name).trim().toLowerCase();

export const isTaken = (players = [], name) =>
  players.some((player) => nameKey(player) === nameKey(name));

export function findDuplicateName(players = []) {
  const seen = new Set();
  return players.find((name) => {
    const key = nameKey(name);
    if (seen.has(key)) return true;
    seen.add(key);
    return false;
  }) || null;
}
