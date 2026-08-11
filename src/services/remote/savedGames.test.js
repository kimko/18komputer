import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
  hasSavedGame,
  matchesSaved,
  rememberSaved,
  forgetSaved,
  forgetAllSaved
} from './savedGames.js';

const TOKEN = 'N4IgdghgtgpiBcIByBLAxgFwPYFcAmAzhAJ4gA0IAxgPQCuAJgO4gC0';

beforeEach(() => localStorage.clear());
afterEach(() => vi.restoreAllMocks());

describe('remembering what is in the sheet', () => {
  it('knows nothing about a game it has never seen', () => {
    expect(hasSavedGame('game_1_2')).toBe(false);
    expect(matchesSaved('game_1_2', TOKEN)).toBe(false);
  });

  it('recognises the exact game it recorded', () => {
    rememberSaved('game_1_2', TOKEN);

    expect(hasSavedGame('game_1_2')).toBe(true);
    expect(matchesSaved('game_1_2', TOKEN)).toBe(true);
  });

  it('notices a game that changed by a single character', () => {
    rememberSaved('game_1_2', TOKEN);

    expect(matchesSaved('game_1_2', TOKEN.slice(0, -1) + 'X')).toBe(false);
  });

  it('notices a game that grew or shrank', () => {
    rememberSaved('game_1_2', TOKEN);

    expect(matchesSaved('game_1_2', TOKEN + 'A')).toBe(false);
    expect(matchesSaved('game_1_2', TOKEN.slice(0, -1))).toBe(false);
  });

  it('keeps games apart', () => {
    rememberSaved('game_1_2', TOKEN);
    rememberSaved('game_3_4', TOKEN + 'other');

    expect(matchesSaved('game_1_2', TOKEN)).toBe(true);
    expect(matchesSaved('game_3_4', TOKEN)).toBe(false);
  });

  it('replaces the record when the same game is saved again', () => {
    rememberSaved('game_1_2', TOKEN);
    rememberSaved('game_1_2', TOKEN + 'later');

    expect(matchesSaved('game_1_2', TOKEN)).toBe(false);
    expect(matchesSaved('game_1_2', TOKEN + 'later')).toBe(true);
  });

  it('forgets one game without touching the rest', () => {
    rememberSaved('game_1_2', TOKEN);
    rememberSaved('game_3_4', TOKEN);

    forgetSaved('game_1_2');

    expect(hasSavedGame('game_1_2')).toBe(false);
    expect(matchesSaved('game_3_4', TOKEN)).toBe(true);
  });

  it('forgets everything on request', () => {
    rememberSaved('game_1_2', TOKEN);
    rememberSaved('game_3_4', TOKEN);

    forgetAllSaved();

    expect(hasSavedGame('game_1_2')).toBe(false);
    expect(hasSavedGame('game_3_4')).toBe(false);
  });

  it('treats a corrupted record as never saved rather than falling over', () => {
    localStorage.setItem('sheet.savedGames', 'not json at all');

    expect(hasSavedGame('game_1_2')).toBe(false);
    expect(() => rememberSaved('game_1_2', TOKEN)).not.toThrow();
    expect(matchesSaved('game_1_2', TOKEN)).toBe(true);
  });

  it('carries on when storage refuses to take any more', () => {
    const complain = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(localStorage, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError');
    });

    expect(() => rememberSaved('game_1_2', TOKEN)).not.toThrow();
    expect(complain).toHaveBeenCalled();
  });
});
