import React from "react";
import useCountdown from "../hooks/useCountdown";
import { formatCountdown } from "../utils/stay";

// How long an unpaid booking keeps its room. After the hold runs out the
// server re-checks availability when the guest pays.
function HoldNotice({ holdExpiresAt, compact = false }) {
  const secondsLeft = useCountdown(holdExpiresAt);

  if (secondsLeft === null) return null;

  if (secondsLeft > 0) {
    return compact ? (
      <span className="badge text-bg-warning">Room held · {formatCountdown(secondsLeft)} left</span>
    ) : (
      <div className="alert alert-warning py-2 small mb-3">
        ⏳ Your room is held for <strong>{formatCountdown(secondsLeft)}</strong>. Pay before then to keep it.
      </div>
    );
  }

  return compact ? (
    <span className="badge text-bg-secondary">Hold expired</span>
  ) : (
    <div className="alert alert-secondary py-2 small mb-3">
      Your 15-minute hold has expired. You can still pay: we'll check the room is free first, and you won't be
      charged if it isn't.
    </div>
  );
}

export default HoldNotice;
