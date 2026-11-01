import React, { useState } from "react";
import { useVoice } from "../context/VoiceContext";
import { canSpeak } from "../voice/speech";
import { formatPrice } from "../utils/formatPrice";
import { useLocation } from "react-router-dom";
import { examplesFor, pageFromPath } from "../voice/examples";
import { formatDistance } from "../utils/stay";


const MIC_STYLE = {
  bottom: "28px",
  right: "28px",
  width: "64px",
  height: "64px",
  borderRadius: "50%",
  fontSize: "26px",
  zIndex: 1040,
};

const PANEL_STYLE = {
  bottom: "104px",
  right: "28px",
  width: "340px",
  maxWidth: "calc(100vw - 32px)",
  maxHeight: "70vh",
  overflowY: "auto",
  zIndex: 1040,
};

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
    isMicrophoneAvailable,
    draft,
    lastReply,
    answerCard,
    reopenComparison,
    pendingConfirm,
    answerConfirm,
    repliesOn,
    toggleReplies,
    clearTrip,
    getPageView,
  } = useVoice();
  const location = useLocation();
  const [showUnsupported, setShowUnsupported] = useState(false);

  // No speech recognition (Firefox, Safari on some versions): say why
  // instead of hiding the mic, and point to what still works.
  if (!browserSupportsSpeechRecognition) {
    return (
      <>
        <button
          className="mic-button position-fixed"
          style={{ ...MIC_STYLE, opacity: 0.6 }}
          onClick={() => setShowUnsupported((open) => !open)}
          title="Voice booking isn't available in this browser"
          aria-label="Voice booking isn't available in this browser"
        >
          🎤
        </button>

        {showUnsupported && (
          <div className="glass-dark shadow-lg position-fixed p-3 small" style={PANEL_STYLE} role="status">
            Voice booking needs speech recognition, which this browser doesn't support.
            Use Chrome or Edge (desktop or Android) to book by voice. Search and booking forms work here as usual.
          </div>
        )}
      </>
    );
  }

  const summary = draftSummary(draft);
  // Examples for this page, using the hotel/room names on screen.
  const examples = examplesFor(pageFromPath(location.pathname), getPageView());

  return (
    <>
      <button
        className={`mic-button position-fixed ${listening ? "listening" : ""}`}
        style={MIC_STYLE}
        onClick={toggleListening}
        title={speaking ? "Skip this reply" : listening ? "Stop voice assistant" : "Start voice assistant"}
        aria-label={speaking ? "Skip this reply" : listening ? "Stop voice assistant" : "Start voice assistant"}
      >
        🎤
      </button>

      {drawerOpen && (
        <div className="glass-dark shadow-lg position-fixed p-4" style={PANEL_STYLE}>
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
              <span className="text-info">🔊 Speaking… talk over me, or tap the mic to skip</span>
            ) : listening ? (
              <span className="text-gold">🔴 Listening... go ahead</span>
            ) : (
              <span className="text-white-50">Tap the mic to start</span>
            )}
          </p>

          {!isMicrophoneAvailable && (
            <p className="small mb-2 p-2 rounded text-warning" style={{ background: "rgba(255,193,7,0.12)" }}>
              🎙️ The microphone is blocked. Allow it from the icon in the address bar, then tap the mic again.
            </p>
          )}

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

              {/* Details behind the last answer, when it's still the one shown. */}
              {answerCard?.text === lastReply && (
                <>
                  {answerCard.places?.items?.length > 0 && (
                    <ul className="mb-1 mt-2 ps-3">
                      {answerCard.places.items.map((p) => (
                        <li key={p.name}>
                          {p.name} · {formatDistance(p.km)}
                        </li>
                      ))}
                    </ul>
                  )}

                  {answerCard.place?.distances?.length > 1 && (
                    <ul className="mb-1 mt-2 ps-3">
                      {answerCard.place.distances.map((d) => (
                        <li key={d.hotelId}>{d.hotelName} · {formatDistance(d.km)}</li>
                      ))}
                    </ul>
                  )}

                  {answerCard.comparison && (
                    <button type="button" className="btn btn-sm btn-outline-light mt-2" onClick={() => reopenComparison(answerCard.comparison)}>
                      Show comparison
                    </button>
                  )}

                  {answerCard.attribution && (
                    <div className="text-white-50 mt-1" style={{ fontSize: "0.75rem" }}>
                      Map data {answerCard.attribution} · straight-line distances
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {pendingConfirm && (
            <div className="mb-3 p-3 rounded border border-warning">
              <p className="small fw-semibold mb-2">{pendingConfirm.title || "Confirm booking"}</p>
              <p className="small mb-2">{pendingConfirm.text}</p>
              <div className="d-flex gap-2">
                <button className="btn btn-sm btn-gold" onClick={() => answerConfirm(true)}>{pendingConfirm.yesLabel || "Yes, book it"}</button>
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
