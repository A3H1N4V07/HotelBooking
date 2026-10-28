import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
  useRef,
  useEffect,
} from "react";
import { useNavigate } from "react-router-dom";
import SpeechRecognition, {
  useSpeechRecognition,
} from "react-speech-recognition";
import api from "../api";
import { createVoiceActions } from "../voice/voiceActions";
import { dispatchIntent } from "../voice/dispatchIntent";
import { buildLocalCommands } from "../voice/localCommands";

const VoiceContext = createContext(null);

const AI_FALLBACK_DEBOUNCE_MS = 1300;

export function VoiceProvider({ children }) {
  const navigate = useNavigate();

  const [recentCommands, setRecentCommands] = useState([]);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [processing, setProcessing] = useState(false);

  const pageRef = useRef({});
  const resetTranscriptRef = useRef(() => {});
  const debounceRef = useRef(null);
  const localMatchCounterRef = useRef(0);

  const setPageContext = useCallback((context) => {
    pageRef.current = context || {};
  }, []);

  const logCommand = useCallback((text) => {
    setRecentCommands((prev) => [text, ...prev].slice(0, 5));
    localMatchCounterRef.current += 1;
    resetTranscriptRef.current();
  }, []);

  const actions = useMemo(
    () => createVoiceActions({ pageRef, navigate, logCommand }),
    [navigate, logCommand]
  );

  // ----- Local, instant, free, unlimited command matching (primary path).
  // Built once: actions read the page through pageRef, so they never go stale.
  const commands = useMemo(
    () => buildLocalCommands(actions, pageRef),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const {
    transcript,
    listening,
    resetTranscript,
    browserSupportsSpeechRecognition,
  } = useSpeechRecognition({ commands });

  useEffect(() => {
    resetTranscriptRef.current = resetTranscript;
  }, [resetTranscript]);

  // ----- AI fallback: only spends a Gemini call on speech NO local command
  // matched. A local match increments localMatchCounterRef and resets the
  // transcript immediately, so if the counter changed during the debounce
  // window, we know something local already handled it and skip Gemini. -----
  useEffect(() => {
    if (!transcript || !transcript.trim()) return;

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    const counterAtStart = localMatchCounterRef.current;

    debounceRef.current = setTimeout(async () => {
      if (localMatchCounterRef.current !== counterAtStart) {
        return;
      }

      const spoken = transcript.trim();
      if (!spoken) return;

      resetTranscript();

      try {
        setProcessing(true);
        const response = await api.post("/voice/interpret", { transcript: spoken });
        dispatchIntent(actions, response.data);
      } catch (error) {
        console.error(error);
        const message =
          error.response?.data?.message || error.message || "Unknown error";
        logCommand(`Voice error: ${message}`);
      } finally {
        setProcessing(false);
      }
    }, AI_FALLBACK_DEBOUNCE_MS);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [transcript, resetTranscript, actions, logCommand]);

  const toggleListening = useCallback(() => {
    if (listening) {
      SpeechRecognition.stopListening();
      setDrawerOpen(false);
    } else {
      resetTranscript();
      SpeechRecognition.startListening({ continuous: true });
      setDrawerOpen(true);
    }
  }, [listening, resetTranscript]);

  const closeDrawer = useCallback(() => {
    setDrawerOpen(false);
    if (listening) {
      SpeechRecognition.stopListening();
    }
  }, [listening]);

  const value = useMemo(
    () => ({
      transcript,
      listening,
      drawerOpen,
      recentCommands,
      processing,
      logCommand,
      toggleListening,
      closeDrawer,
      setPageContext,
      browserSupportsSpeechRecognition,
    }),
    [
      transcript,
      listening,
      drawerOpen,
      recentCommands,
      processing,
      logCommand,
      toggleListening,
      closeDrawer,
      setPageContext,
      browserSupportsSpeechRecognition,
    ]
  );

  return (
    <VoiceContext.Provider value={value}>{children}</VoiceContext.Provider>
  );
}

export function useVoice() {
  const ctx = useContext(VoiceContext);

  if (!ctx) {
    throw new Error("useVoice must be used within a VoiceProvider");
  }

  return ctx;
}
