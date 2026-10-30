import React from "react";
import { useVoice } from "../context/VoiceContext";
import { canSpeak } from "../voice/speech";
import { formatPrice } from "../utils/formatPrice";
import { useLocation } from "react-router-dom";
import { examplesFor, pageFromPath } from "../voice/examples";


// One line per known trip detail, so the user can see what's been understood.
function draftSummary(draft) {
  return [
    draft.city && `📍 ${draft.city}`,
    draft.checkIn && `📅 ${draft.checkIn}${draft.checkOut ? ` → ${draft.checkOut}` : ""}`,
    draft.guests && `👥 ${draft.guests} guest${draft.guests === "1" ? "" : "s"}`,
    draft.maxPrice && `💰 under ${formatPrice(draft.maxPrice)}`,
    draft.near && `🧭 near ${draft.near}`,
    draft.amenities.length > 0 && `✨ ${draft.amenities.join(", ")}`,
    draft.hotelName && `🏨 ${draft.hotelName}${draft.roomName ? ` · ${draft.roomName}` : ""}`,
  ].filter(Boolean);
}

function VoiceAssistant() {
  const {
    listening,
    speaking,
    aiOffline,
    drawerOpen,
    transcript,
    processing,
    toggleListening,
    closeDrawer,
    recentCommands,
    browserSupportsSpeechRecognition,
    draft,
    lastReply,
    pendingConfirm,
    answerConfirm,
    repliesOn,
    toggleReplies,
    clearTrip,
    getPageView,
  } = useVoice();
  const location = useLocation();

  if (!browserSupportsSpeechRecognition) {
    return null;
  }

  const summary = draftSummary(draft);
  // Examples for this page, using the hotel/room names on screen.
  const examples = examplesFor(pageFromPath(location.pathname), getPageView());

  return (
    <>
      <button
        className={`mic-button position-fixed ${listening ? "listening" : ""}`}
        style={{
          bottom: "28px",
          right: "28px",
          width: "64px",
          height: "64px",
          borderRadius: "50%",
          fontSize: "26px",
          zIndex: 1040,
        }}
        onClick={toggleListening}
        title={listening ? "Stop voice assistant" : "Start voice assistant"}
        aria-label={listening ? "Stop voice assistant" : "Start voice assistant"}
      >
        🎤
      </button>

      {drawerOpen && (
        <div
          className="glass-dark shadow-lg position-fixed p-4"
          style={{
            bottom: "104px",
            right: "28px",
            width: "340px",
            maxWidth: "calc(100vw - 32px)",
            maxHeight: "70vh",
            overflowY: "auto",
            zIndex: 1040,
          }}
        >
          <div className="d-flex justify-content-between align-items-center mb-3">
            <h5 className="mb-0">Voice Assistant</h5>
            <div className="d-flex gap-2">
              {canSpeak && (
                <button
                  className="btn btn-sm btn-outline-light"
                  onClick={toggleReplies}
                  title={repliesOn ? "Mute spoken replies" : "Turn on spoken replies"}
                  aria-pressed={repliesOn}
                >
                  {repliesOn ? "🔊" : "🔇"}
                </button>
              )}
              <button className="btn btn-sm btn-outline-light" onClick={closeDrawer} aria-label="Close">
                ✕
              </button>
            </div>
          </div>

          <p className="mb-2" aria-live="polite">
            {speaking ? (
              <span className="text-info">🔊 Speaking… (mic paused, answer when I finish)</span>
            ) : listening ? (
              <span className="text-gold">🔴 Listening... go ahead</span>
            ) : (
              <span className="text-white-50">Tap the mic to start</span>
            )}
          </p>

          {listening && transcript && (
            <p className="small text-white-50 mb-2">Heard: {transcript}</p>
          )}

          {processing && <p className="small text-gold mb-2">🤖 Thinking...</p>}

          {aiOffline && (
            <p className="small mb-2 p-2 rounded text-warning" style={{ background: "rgba(255,193,7,0.12)" }}>
              ⚠️ Smart understanding is offline for now (AI limit reached). Simple phrases like the ones below still work.
            </p>
          )}

          {lastReply && (
            <div className="small mb-3 p-2 rounded" style={{ background: "rgba(255,255,255,0.08)" }} aria-live="polite">
              💬 {lastReply}
            </div>
          )}

          {pendingConfirm && (
            <div className="mb-3 p-3 rounded border border-warning">
              <p className="small fw-semibold mb-2">Confirm booking</p>
              <p className="small mb-2">{pendingConfirm.text}</p>
              <div className="d-flex gap-2">
                <button className="btn btn-sm btn-gold" onClick={() => answerConfirm(true)}>Yes, book it</button>
                <button className="btn btn-sm btn-outline-light" onClick={() => answerConfirm(false)}>No</button>
              </div>
            </div>
          )}

          {summary.length > 0 && (
            <>
              <div className="d-flex justify-content-between align-items-center mb-1">
                <p className="fw-bold mb-0 small">Your trip so far</p>
                <button
                  type="button"
                  className="btn btn-sm btn-link text-white-50 p-0"
                  onClick={clearTrip}
                  title="Clear the trip and start a new search"
                >
                  Clear
                </button>
              </div>
              <ul className="list-unstyled small text-white-50 mb-3">
                {summary.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            </>
          )}

          <p className="fw-bold mb-2 small">On this page you can say:</p>
          <ul className="small text-white-50 mb-3" style={{ paddingLeft: "18px" }}>
            {examples.map((cmd) => (
              <li key={cmd}>{cmd}</li>
            ))}
          </ul>

          {recentCommands.length > 0 && (
            <>
              <p className="fw-bold mb-2 small">Recent Commands</p>
              <ul className="small mb-0" style={{ paddingLeft: "18px" }}>
                {recentCommands.map((cmd, idx) => (
                  <li key={idx} className="text-gold">{cmd}</li>
                ))}
              </ul>
            </>
          )}
        </div>
      )}
    </>
  );
}

export default VoiceAssistant;
