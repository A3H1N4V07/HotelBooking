import React from "react";
import { useVoice } from "../context/VoiceContext";

const EXAMPLE_PHRASES = [
  "Show me hotels in Goa",
  "I want a budget hotel",
  "Book the first one",
  "Book Blue Orchid Palace",
  "My check-in is next Friday",
  "We're 2 guests",
  "My name is Abhinav",
  "My number is 9876543210",
  "Confirm my booking",
  "Show my bookings",
  "Download my invoice",
  "Log me out",
];

function VoiceAssistant() {
  const {
    listening,
    drawerOpen,
    transcript,
    processing,
    toggleListening,
    closeDrawer,
    recentCommands,
    browserSupportsSpeechRecognition,
  } = useVoice();

  if (!browserSupportsSpeechRecognition) {
    return null;
  }

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
        title="Voice Assistant"
      >
        🎤
      </button>

      {drawerOpen && (
        <div
          className="glass-dark shadow-lg position-fixed p-4"
          style={{
            bottom: "104px",
            right: "28px",
            width: "320px",
            maxHeight: "60vh",
            overflowY: "auto",
            zIndex: 1040,
          }}
        >
          <div className="d-flex justify-content-between align-items-center mb-3">
            <h5 className="mb-0">Voice Assistant</h5>
            <button className="btn btn-sm btn-outline-light" onClick={closeDrawer}>
              ✕
            </button>
          </div>

          <p className="mb-2">
            {listening ? (
              <span className="text-gold">🔴 Listening...</span>
            ) : (
              <span className="text-white-50">Tap the mic to start</span>
            )}
          </p>

          {listening && transcript && (
            <p className="small text-white-50 mb-2">Heard: {transcript}</p>
          )}

          {processing && <p className="small text-gold mb-3">🤖 Thinking...</p>}

          <p className="fw-bold mb-2 small">Speak naturally, e.g.:</p>
          <ul className="small text-white-50 mb-3" style={{ paddingLeft: "18px" }}>
            {EXAMPLE_PHRASES.map((cmd) => (
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