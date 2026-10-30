import React from "react";

// Non-blocking message (replaces alert()). Disappears on its own.
function NoticeToast({ notice, onClose }) {
  if (!notice) return null;

  const tone = { info: "text-bg-dark", error: "text-bg-danger", success: "text-bg-success" }[notice.type] || "text-bg-dark";

  return (
    <div
      className={`toast show position-fixed ${tone}`}
      style={{ top: 84, left: "50%", transform: "translateX(-50%)", zIndex: 1080, maxWidth: "min(480px, 92vw)" }}
      role="status"
      aria-live="polite"
    >
      <div className="d-flex align-items-start p-3 gap-2">
        <div className="flex-grow-1">{notice.text}</div>
        <button type="button" className="btn-close btn-close-white" aria-label="Close" onClick={onClose} />
      </div>
    </div>
  );
}

export default NoticeToast;
