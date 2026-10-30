import { useEffect, useState } from "react";

// Seconds left until `until` (a date or ISO string), updated every second.
// null when there's no deadline.
function useCountdown(until) {
  const target = until ? new Date(until).getTime() : null;

  const [secondsLeft, setSecondsLeft] = useState(() =>
    target === null ? null : Math.max(0, (target - Date.now()) / 1000)
  );

  useEffect(() => {
    if (target === null) {
      setSecondsLeft(null);
      return undefined;
    }

    const tick = () => setSecondsLeft(Math.max(0, (target - Date.now()) / 1000));
    tick();

    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [target]);

  return secondsLeft;
}

export default useCountdown;
