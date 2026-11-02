import React, { useState } from "react";
import { useVoice } from "../context/VoiceContext";
import { canSpeak } from "../voice/speech";
import { formatPrice } from "../utils/formatPrice";
import { useLocation } from "react-router-dom";
import { examplesFor, pageFromPath } from "../voice/examples";
import { formatDistance } from "../utils/stay";
import { CloseIcon, MicIcon, MuteIcon, SparkleIcon, SpeakerIcon, StopIcon } from "./Icons";


const MIC_STYLE = {
  bottom: "28px",
  right: "28px",
  width: "64px",
  height: "64px",
  borderRadius: "50%",
  zIndex: 1040,
};

const PANEL_STYLE = {
  bottom: "104px",
  right: "28px",
  width: "360px",
  maxWidth: "calc(100vw - 32px)",
  maxHeight: "70vh",
  overflowY: "auto",
  zIndex: 1040,
};

const SECTION_TITLE = "text-uppercase fw-bold text-white-50 small mb-2";

// "2026-12-10" -> "10 Dec" (read as a local date, not UTC).
function shortDate(iso) {
  const [y, m, d] = String(iso).split("-").map(Number);
  if (!y || !m || !d) return iso;
  return new Date(y, m - 1, d).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

// One chip per known trip detail, so the user can see what's been understood.
function draftSummary(draft) {
  return [
    draft.city && ["Where", draft.city],
    draft.checkIn && ["When", `${shortDate(draft.checkIn)}${draft.checkOut ? ` → ${shortDate(draft.checkOut)}` : ""}`],
    draft.guests && ["Guests", draft.guests],
    draft.maxPrice && ["Budget", `under ${formatPrice(draft.maxPrice)}`],
    draft.near && ["Near", draft.near],
    draft.amenities.length > 0 && ["With", draft.amenities.map((a) => a.replace(/_/g, " ")).join(", ")],
    draft.hotelName && ["Hotel", `${draft.hotelName}${draft.roomName ? ` · ${draft.roomName}` : ""}`],
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
          <MicIcon size={26} />
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

  const status = speaking
    ? { dot: "bg-info", text: "Speaking · talk over me, or tap the mic to skip" }
    : processing
      ? { dot: "bg-warning", text: "Thinking…" }
      : listening
        ? { dot: "bg-danger", text: "Listening… go ahead" }
        : { dot: "bg-secondary", text: "Tap the mic to start" };

  return (
    <>
      <button
        className={`mic-button position-fixed ${listening ? "listening" : ""}`}
        style={MIC_STYLE}
        onClick={toggleListening}
        title={speaking ? "Skip this reply" : listening ? "Stop voice assistant" : "Start voice assistant"}
        aria-label={speaking ? "Skip this reply" : listening ? "Stop voice assistant" : "Start voice assistant"}
      >
        {speaking ? <StopIcon size={24} /> : <MicIcon size={26} />}
      </button>

      {drawerOpen && (
        <div className="glass-dark shadow-lg position-fixed p-0" style={PANEL_STYLE}>
          <div className="d-flex align-items-center gap-3 p-3 border-bottom border-light border-opacity-10">
            <div
              className="rounded-circle gradient-accent d-flex align-items-center justify-content-center flex-shrink-0"
              style={{ width: 38, height: 38 }}
            >
              <SparkleIcon size={18} />
            </div>
            <div className="flex-grow-1" style={{ minWidth: 0 }}>
              <h6 className="fw-bold mb-0">EchoStay Assistant</h6>
              <div className="small text-white-50 d-flex align-items-center gap-2" aria-live="polite">
                <span className={`rounded-circle d-inline-block flex-shrink-0 ${status.dot}`} style={{ width: 8, height: 8 }} />
                <span className="text-truncate">{status.text}</span>
              </div>
            </div>
            <div className="d-flex gap-2">
              {canSpeak && (
                <button
                  className="btn btn-sm btn-outline-glass rounded-circle p-0 d-inline-flex align-items-center justify-content-center"
                  style={{ width: 32, height: 32 }}
                  onClick={toggleReplies}
                  title={repliesOn ? "Mute spoken replies" : "Turn on spoken replies"}
                  aria-label={repliesOn ? "Mute spoken replies" : "Turn on spoken replies"}
                  aria-pressed={repliesOn}
                >
                  {repliesOn ? <SpeakerIcon size={16} /> : <MuteIcon size={16} />}
                </button>
              )}
              <button
                className="btn btn-sm btn-outline-glass rounded-circle p-0 d-inline-flex align-items-center justify-content-center"
                style={{ width: 32, height: 32 }}
                onClick={closeDrawer}
                aria-label="Close"
              >
                <CloseIcon size={16} />
              </button>
            </div>
          </div>

          <div className="p-3">
            {!isMicrophoneAvailable && (
              <p className="small mb-3 p-2 rounded-3 text-warning bg-warning bg-opacity-10 border border-warning border-opacity-25">
                The microphone is blocked. Allow it from the icon in the address bar, then tap the mic again.
              </p>
            )}

            {aiOffline && (
              <p className="small mb-3 p-2 rounded-3 text-warning bg-warning bg-opacity-10 border border-warning border-opacity-25">
                Smart understanding is offline for now (AI limit reached). Simple phrases like the ones below still work.
              </p>
            )}

            {listening && transcript && (
              <div className="d-flex justify-content-end mb-2">
                <div className="small rounded-4 px-3 py-2 bg-warning text-dark" style={{ maxWidth: "85%" }}>
                  {transcript}
                </div>
              </div>
            )}

            {processing && (
              <div className="d-flex align-items-center gap-2 small text-white-50 mb-2">
                <span className="spinner-grow spinner-grow-sm text-warning" role="status" /> Thinking…
              </div>
            )}

            {lastReply && (
              <div
                className="small mb-3 rounded-4 px-3 py-2 bg-white bg-opacity-10 border border-light border-opacity-10"
                style={{ maxWidth: "92%" }}
                aria-live="polite"
              >
                {lastReply}

                {/* Details behind the last answer, when it's still the one shown. */}
                {answerCard?.text === lastReply && (
                  <>
                    {answerCard.places?.items?.length > 0 && (
                      <ul className="list-unstyled mb-1 mt-2">
                        {answerCard.places.items.map((p) => (
                          <li key={p.name} className="d-flex justify-content-between gap-2 border-top border-light border-opacity-10 py-1">
                            <span>{p.name}</span>
                            <span className="text-white-50 text-nowrap">{formatDistance(p.km)}</span>
                          </li>
                        ))}
                      </ul>
                    )}

                    {answerCard.place?.distances?.length > 1 && (
                      <ul className="list-unstyled mb-1 mt-2">
                        {answerCard.place.distances.map((d) => (
                          <li key={d.hotelId} className="d-flex justify-content-between gap-2 border-top border-light border-opacity-10 py-1">
                            <span>{d.hotelName}</span>
                            <span className="text-white-50 text-nowrap">{formatDistance(d.km)}</span>
                          </li>
                        ))}
                      </ul>
                    )}

                    {answerCard.comparison && (
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-glass rounded-pill mt-2"
                        onClick={() => reopenComparison(answerCard.comparison)}
                      >
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
              <div className="mb-3 p-3 rounded-4 border border-warning bg-warning bg-opacity-10">
                <p className="small fw-bold text-warning text-uppercase mb-1">{pendingConfirm.title || "Confirm booking"}</p>
                <p className="small mb-3">{pendingConfirm.text}</p>
                <div className="d-flex gap-2">
                  <button className="btn btn-sm btn-accent rounded-pill px-3" onClick={() => answerConfirm(true)}>
                    {pendingConfirm.yesLabel || "Yes, book it"}
                  </button>
                  <button className="btn btn-sm btn-outline-glass rounded-pill px-3" onClick={() => answerConfirm(false)}>No</button>
                </div>
              </div>
            )}

            {summary.length > 0 && (
              <div className="mb-3">
                <div className="d-flex justify-content-between align-items-center">
                  <p className={SECTION_TITLE}>Your trip so far</p>
                  <button
                    type="button"
                    className="btn btn-sm btn-link text-white-50 text-decoration-none p-0 mb-2"
                    onClick={clearTrip}
                    title="Clear the trip and start a new search"
                  >
                    Clear
                  </button>
                </div>
                <div className="d-flex flex-wrap gap-2">
                  {summary.map(([key, value]) => (
                    <span key={key} className="badge rounded-pill bg-white bg-opacity-10 border border-light border-opacity-10 fw-normal text-start text-wrap px-3 py-2">
                      <span className="text-warning text-uppercase me-1">{key}</span> {value}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <p className={SECTION_TITLE}>On this page you can say</p>
            <div className="d-flex flex-wrap gap-2 mb-3">
              {examples.map((cmd) => (
                <span key={cmd} className="badge rounded-pill border border-warning border-opacity-50 fw-normal text-wrap text-start px-3 py-2">
                  {cmd}
                </span>
              ))}
            </div>

            {recentCommands.length > 0 && (
              <>
                <p className={SECTION_TITLE}>Recent</p>
                <ul className="list-unstyled small text-white-50 mb-0 d-flex flex-column gap-1">
                  {recentCommands.map((cmd, idx) => (
                    <li key={idx} className="text-truncate">› {cmd}</li>
                  ))}
                </ul>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}

export default VoiceAssistant;
