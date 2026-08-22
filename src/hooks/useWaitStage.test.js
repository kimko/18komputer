import { describe, it, expect, vi, afterEach } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useWaitStage } from './useWaitStage.js';

const STAGES = [
  { after: 0, message: 'Working...' },
  { after: 3, message: 'Taking a while...', showElapsed: true },
  { after: 15, message: 'Still going...', showElapsed: true }
];

const tick = async (seconds) => {
  await act(async () => { await vi.advanceTimersByTimeAsync(seconds * 1000); });
};

describe('useWaitStage', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('starts on the first stage, with nothing to count yet', () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useWaitStage(true, STAGES));

    expect(result.current).toEqual({ elapsed: 0, message: 'Working...', showElapsed: false });
  });

  it('escalates through the stages as the wait drags on', async () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useWaitStage(true, STAGES));

    await tick(2);
    expect(result.current.message).toBe('Working...');

    await tick(1);
    expect(result.current).toEqual({ elapsed: 3, message: 'Taking a while...', showElapsed: true });

    await tick(12);
    expect(result.current).toEqual({ elapsed: 15, message: 'Still going...', showElapsed: true });
  });

  it('keeps counting the seconds while it waits', async () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useWaitStage(true, STAGES));

    await tick(4);
    expect(result.current.elapsed).toBe(4);

    await tick(1);
    expect(result.current.elapsed).toBe(5);
  });

  // A tick tally would under-report a wait the user sat through, because a backgrounded tab
  // throttles the interval.
  it('counts wall-clock seconds, not interval ticks', async () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useWaitStage(true, STAGES));

    // Only one tick fires, but eight seconds of wall clock have gone by.
    await act(async () => {
      vi.setSystemTime(Date.now() + 7000);
      await vi.advanceTimersByTimeAsync(1000);
    });

    expect(result.current.elapsed).toBe(8);
    expect(result.current.message).toBe('Taking a while...');
  });

  it('resets when the wait ends, so the next one starts from the top', async () => {
    vi.useFakeTimers();
    const { result, rerender } = renderHook(({ active }) => useWaitStage(active, STAGES), {
      initialProps: { active: true }
    });

    await tick(5);
    expect(result.current.message).toBe('Taking a while...');

    await act(async () => { rerender({ active: false }); });
    expect(result.current).toEqual({ elapsed: 0, message: 'Working...', showElapsed: false });
  });

  it('stops its timer when it goes away', async () => {
    vi.useFakeTimers();
    const { unmount } = renderHook(() => useWaitStage(true, STAGES));

    unmount();
    await act(async () => { await vi.advanceTimersByTimeAsync(10000); });

    expect(vi.getTimerCount()).toBe(0);
  });
});
