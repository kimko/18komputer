import { useEffect, useState } from 'react';

// Which message a wait has escalated to, and how long it has been going.
//
// `stages` is ordered by `after` (whole seconds) ascending; the last stage whose `after` has
// passed is the live one. The elapsed count comes off a wall-clock stamp rather than a tick
// tally, because a backgrounded tab throttles the interval and would otherwise under-report a
// wait the user actually sat through.
export function useWaitStage(active, stages) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!active) {
      setElapsed(0);
      return;
    }

    const startedAt = Date.now();
    const timer = setInterval(
      () => setElapsed(Math.floor((Date.now() - startedAt) / 1000)),
      1000
    );
    return () => clearInterval(timer);
  }, [active]);

  const stage = stages.reduce(
    (reached, candidate) => (elapsed >= candidate.after ? candidate : reached),
    stages[0]
  );

  return { elapsed, message: stage.message, showElapsed: Boolean(stage.showElapsed) };
}
