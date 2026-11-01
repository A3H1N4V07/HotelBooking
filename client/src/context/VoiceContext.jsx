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
import { understand } from "../voice/understand";
import { loadDraft, saveDraft, applyDraftPatch, EMPTY_DRAFT } from "../voice/draft";
import { speak, stopSpeaking, canSpeak } from "../voice/speech";
import { nextPrompt } from "../voice/conversation";
import useAmenities from "../hooks/useAmenities";
import NoticeToast from "../components/NoticeToast";
import ComparisonModal from "../components/ComparisonModal";
import { hintExamples, pageFromPath } from "../voice/examples";
import { logVoiceEvent } from "../voice/usageLog";
import { isEcho, isBargeIn } from "../voice/echo";

const VoiceContext = createContext(null);

// Unmatched phrases wait this long for the rest of the sentence before the AI is asked.
const AI_FALLBACK_DEBOUNCE_MS = 900;
// After the AI quota runs out, don't call it again for this long, unless the
// server says it'll be back sooner (then at least MIN_AI_PAUSE_MS).
const AI_PAUSE_MS = 10 * 60 * 1000;
const MIN_AI_PAUSE_MS = 5000;
const NOTICE_MS = 6000;
const REPLIES_PREF_KEY = "voiceReplies";
const PROMPT_REPEAT_MS = 6000;
const RESPOND_DELAY_MS = 600;
// How long after a reply ends a heard phrase may still be its echo.
const ECHO_GRACE_MS = 1500;

// "Didn't get that" with suggestions for the page you're on. When the AI is
// offline (quota used up), say so plainly: it's not the user's phrasing.
const hintFor = (text, view, aiOffline = false) => {
  const tries = hintExamples(pageFromPath(window.location.pathname), view).map((e) => `"${e}"`);
  const lead = aiOffline
    ? `My smart understanding is offline right now, so I only know simple phrases and couldn't follow "${text}".`
    : `Sorry, I didn't get "${text}".`;
  return `${lead} Here you can say ${tries.join(", ")}, or "what's next".`;
};

export function VoiceProvider({ children }) {
  const navigate = useNavigate();
  const { labels: amenityLabels } = useAmenities();

  const [recentCommands, setRecentCommands] = useState([]);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  // True while the AI quota is used up (only simple, local phrases work).
  const [aiOffline, setAiOffline] = useState(false);
  // Last answer to a question (text + any places/distances to list), the
  // comparison table being shown, and hotels to highlight on the page.
  const [answerCard, setAnswerCard] = useState(null);
  const [comparison, setComparison] = useState(null);
  const [highlightIds, setHighlightIds] = useState([]);

  const [draft, setDraft] = useState(loadDraft);
  const draftRef = useRef(draft);

  const [lastReply, setLastReply] = useState("");
  const [notice, setNotice] = useState(null);
  const [pendingConfirm, setPendingConfirm] = useState(null);
  const pendingConfirmRef = useRef(null);

  const [repliesOn, setRepliesOn] = useState(() => {
    try {
      return localStorage.getItem(REPLIES_PREF_KEY) !== "off";
    } catch {
      return true;
    }
  });

  const pageRef = useRef({});
  const resetTranscriptRef = useRef(() => {});
  const listeningRef = useRef(false);
  // What the user wants (mic on/off). Recognition is paused while the
  // assistant speaks, so `listening` alone can't tell us this.
  const wantListeningRef = useRef(false);
  const speakingRef = useRef(false);
  // The reply being read (to recognise its echo), which say() call owns the
  // speaking state, and when the last reply finished.
  const replyRef = useRef("");
  const sayIdRef = useRef(0);
  const spokeUntilRef = useRef(0);
  const bargedInRef = useRef(false);
  const noticeTimerRef = useRef(null);
  const lastPromptRef = useRef({ text: "", at: 0 });
  // What the assistant last asked for, so a bare answer ("3") can be understood.
  const expectsRef = useRef(null);
  // The detail set most recently, for "no, I meant the 15th".
  const lastFieldRef = useRef(null);
  const setLastField = useCallback((field) => {
    lastFieldRef.current = field;
  }, []);
  const citiesRef = useRef([]);
  const processedRef = useRef(0);
  const aiBufferRef = useRef("");
  const aiTimerRef = useRef(null);
  const aiPausedUntilRef = useRef(0);
  const aiOfflineTimerRef = useRef(null);
  const amenityLabelsRef = useRef(amenityLabels);
  amenityLabelsRef.current = amenityLabels;

  // Known city names, for recognising "Goa" in a sentence locally.
  useEffect(() => {
    api
      .get("/hotels/cities")
      .then((response) => {
        citiesRef.current = response.data;
      })
      .catch((error) => console.error(error));
  }, []);

  // Snapshot of what the current page shows (for page-specific examples).
  const getPageView = useCallback(() => pageRef.current.describe?.() || {}, []);

  const setPageContext = useCallback((context) => {
    pageRef.current = context || {};
  }, []);

  // ----- Booking draft -----
  const updateDraft = useCallback((patch) => {
    const next = applyDraftPatch(draftRef.current, patch);
    draftRef.current = next;
    saveDraft(next);
    setDraft(next);
  }, []);

  const resetDraft = useCallback(() => {
    draftRef.current = { ...EMPTY_DRAFT };
    saveDraft(draftRef.current);
    setDraft(draftRef.current);
  }, []);

  // A fresh trip, keeping who's booking (name/phone) for convenience.
  const clearTrip = useCallback(() => {
    const { guestName, guestPhone } = draftRef.current;
    draftRef.current = { ...EMPTY_DRAFT, guestName, guestPhone };
    saveDraft(draftRef.current);
    setDraft(draftRef.current);
    expectsRef.current = null;
    lastFieldRef.current = null;
  }, []);

  const getDraft = useCallback(() => draftRef.current, []);

  const logCommand = useCallback((text) => {
    setRecentCommands((prev) => [text, ...prev].slice(0, 5));
  }, []);

  // ----- Speaking -----
  // Shows the reply in the drawer and, while the conversation is on (mic
  // listening), reads it aloud. The mic stays on so the user can talk over
  // the reply (see the barge-in effect below); what it hears of the reply
  // itself is dropped as echo.
  const say = useCallback(async (text) => {
    if (!text) return;

    setLastReply(text);

    if (!repliesOn || !canSpeak || (!listeningRef.current && !speakingRef.current)) return;

    const id = ++sayIdRef.current;
    replyRef.current = text;
    speakingRef.current = true;
    setSpeaking(true);

    try {
      await speak(text);
    } finally {
      // A newer reply replaced this one (speak() cancels the previous): it
      // owns the speaking state now.
      if (id === sayIdRef.current) {
        speakingRef.current = false;
        setSpeaking(false);
        spokeUntilRef.current = Date.now();
        // Clears the echo from "Heard:"; kept after a barge-in, whose words
        // are still to be handled.
        if (!bargedInRef.current) resetTranscriptRef.current();

        // Chrome sometimes ends recognition on its own; resume if the user
        // hasn't switched the mic off meanwhile.
        if (wantListeningRef.current && !listeningRef.current) {
          SpeechRecognition.startListening({ continuous: true }).catch(() => {});
        }
      }
    }
  }, [repliesOn]);

  // Stops the reply being read, keeping the conversation on.
  const skipReply = useCallback(() => {
    if (speakingRef.current) stopSpeaking();
  }, []);

  // A question whose short answer should be read as `expects` ("city", ...).
  const ask = useCallback((text, expects) => {
    expectsRef.current = expects;
    lastPromptRef.current = { text, at: Date.now() };
    say(text);
  }, [say]);

  // Non-blocking replacement for alert(): a toast, also spoken when voice is on.
  const notify = useCallback((text, type = "info") => {
    setNotice({ text, type });
    clearTimeout(noticeTimerRef.current);
    noticeTimerRef.current = setTimeout(() => setNotice(null), NOTICE_MS);
    say(text);
  }, [say]);

  // ----- Confirmation -----
  // Booking only ever happens after an explicit "yes" (or button click).
  // `options` adapt the card and the "no" reply to other questions than
  // booking (e.g. cancelling): { title, yesLabel, yesText, noText }.
  const askConfirm = useCallback((text, onYes, options = {}) => {
    const pending = { text, onYes, ...options };
    pendingConfirmRef.current = pending;
    expectsRef.current = "confirm";
    setPendingConfirm(pending);
    say(text);
  }, [say]);

  const answerConfirm = useCallback((yes, quiet = false) => {
    const pending = pendingConfirmRef.current;
    pendingConfirmRef.current = null;
    expectsRef.current = null;
    setPendingConfirm(null);

    if (!pending) return false;

    if (yes) {
      say(pending.yesText || "Booking it now.");
      pending.onYes();
    } else if (!quiet) {
      say(pending.noText || 'Okay, not booked. Tell me what to change, for example "check out on the 14th" or "my phone number is ...".');
    }

    return true;
  }, [say]);

  const hasPendingConfirm = useCallback(() => Boolean(pendingConfirmRef.current), []);

  // ----- Guided conversation -----
  // Asks for the next missing detail (or describes what's on screen).
  const promptNext = useCallback(() => {
    const view = pageRef.current.describe?.() || {};
    const step = nextPrompt(draftRef.current, view, amenityLabelsRef.current);

    if (!step) return;

    // An action and a page that just finished loading can both ask; say it once.
    const last = lastPromptRef.current;
    if (last.text === step.say && Date.now() - last.at < PROMPT_REPEAT_MS) return;
    lastPromptRef.current = { text: step.say, at: Date.now() };

    if (step.action === "search") {
      expectsRef.current = null;
      say(step.say);
      navigate("/hotels");
    } else if (step.action === "confirm") {
      askConfirm(step.say, () => pageRef.current.submitBooking?.());
    } else {
      expectsRef.current = step.expects || null;
      say(step.say);
    }
  }, [say, askConfirm, navigate]);

  // For pages: call when async data settles (results/rooms loaded) so the
  // assistant can describe it, but only while a voice conversation is on.
  const promptIfActive = useCallback(() => {
    if (listeningRef.current || speakingRef.current) promptNext();
  }, [promptNext]);

  const actions = useMemo(
    () =>
      createVoiceActions({
        pageRef,
        navigate,
        logCommand,
        updateDraft,
        resetDraft,
        clearTrip,
        getDraft,
        say,
        ask,
        notify,
        promptNext,
        answerConfirm,
        hasPendingConfirm,
        askConfirm,
        setLastField,
      }),
    [navigate, logCommand, updateDraft, resetDraft, clearTrip, getDraft, say, ask, notify, promptNext, answerConfirm, hasPendingConfirm, askConfirm, setLastField]
  );

  const actionsRef = useRef(actions);
  actionsRef.current = actions;

  // "stop" / mic button off: stop listening AND speaking, and stay off.
  const stopConversation = useCallback((farewell) => {
    wantListeningRef.current = false;
    listeningRef.current = false;
    clearTimeout(aiTimerRef.current);
    aiBufferRef.current = "";
    SpeechRecognition.stopListening();
    stopSpeaking();

    if (farewell) {
      setLastReply(farewell);
      if (repliesOn && canSpeak) speak(farewell);
    }
  }, [repliesOn]);

  const closeComparison = useCallback(() => setComparison(null), []);
  const reopenComparison = useCallback((rows) => setComparison(rows), []);

  // An answer to a question: spoken, shown in the panel, reflected on the page.
  const showAnswer = useCallback((answer) => {
    setAnswerCard(answer);
    setHighlightIds(answer.hotelIds || []);
    if (answer.comparison) setComparison(answer.comparison);
    say(answer.text);
  }, [say]);

  // ----- Running what was understood -----
  const runSteps = useCallback((steps) => {
    const a = actionsRef.current;

    for (const step of steps) {
      switch (step.type) {
        case "yes": a.yes(); break;
        case "no": a.no(step.quiet); break;
        case "openMyBookings": a.openMyBookings(); break;
        case "downloadInvoice": a.downloadInvoice(); break;
        case "logout": a.logout(); break;
        case "startOver": a.startOver(); break;
        case "changeCity": a.changeCity(); break;
        case "changeDates": a.changeDates(); break;
        case "goHome": a.goHome(); break;
        case "cancelBooking": a.cancelBooking(); break;
        case "whatNext": a.whatNext(); break;
        case "stopListening": stopConversation("Okay, I've stopped listening. Tap the mic whenever you need me."); break;
        case "search": a.searchHotels(); break;
        case "book": a.bookHotel(step.name ? String(step.name).toLowerCase() : null); break;
        case "chooseRoom": a.chooseRoom(step.value); break;
        case "setGuestName": a.setGuestName(step.value); break;
        case "setGuestPhone": a.setGuestPhone(step.value); break;
        case "answer": showAnswer({ text: step.text, hotelIds: step.hotelIds }); break;
        case "cantAnswer":
          say("My smart understanding is offline right now, so I can only answer simple questions, like \"does it have a pool?\" or \"which one is cheapest?\".");
          break;
        case "details":
          if (a.applyDetails(step.fields)) {
            if (step.search) a.searchHotels();
            else setTimeout(promptNext, RESPOND_DELAY_MS);
          }
          break;
        default:
      }
    }
  }, [promptNext, stopConversation, showAnswer, say]);

  // The AI fallback, for phrasing the local rules don't cover.
  const askAi = useCallback(async () => {
    const text = aiBufferRef.current.trim();
    aiBufferRef.current = "";
    if (!text) return;

    const view = pageRef.current.describe?.() || {};
    const startedAt = performance.now();
    // Usage stats keep missed phrases, but never a name or phone answer.
    const phrase = ["guestName", "guestPhone"].includes(expectsRef.current) ? undefined : text;
    const track = (handledBy, action) =>
      logVoiceEvent({ handledBy, page: view.page, action, ms: performance.now() - startedAt, phrase });

    if (Date.now() < aiPausedUntilRef.current) {
      track("offline");
      logCommand(`Not understood: ${text}`);
      say(hintFor(text, view, true));
      return;
    }

    try {
      setProcessing(true);
      // What the user is looking at (ids only: the server loads the facts).
      const d = draftRef.current;
      const response = await api.post("/voice/interpret", {
        transcript: text,
        page: view.page,
        hotelId: view.hotelId,
        resultIds: (view.results || []).slice(0, 10).map((h) => h.id),
        draft: { city: d.city, checkIn: d.checkIn, checkOut: d.checkOut, guests: d.guests },
      });
      const result = response.data;

      if (result.answer) {
        track("ai", result.intent);
        logCommand(`Q: ${text}`);
        showAnswer({
          text: result.answer,
          hotelIds: result.hotelIds,
          places: result.places,
          place: result.place,
          comparison: result.comparison,
          attribution: result.attribution,
        });
      } else {
        const understood = dispatchIntent(actionsRef.current, result);
        track(understood ? "ai" : "missed", result.intent);
      }
      setAiOffline(false);
    } catch (error) {
      console.error(error);

      // AI_LIMIT: no provider could answer. 429: our own per-minute limit.
      const limited = error.response?.data?.code === "AI_LIMIT" || error.response?.status === 429;
      if (limited) {
        // Stop calling for as long as the server says (a per-minute limit
        // clears in seconds), or a while if unknown; local phrases keep working.
        // (Our limiter's window is a minute; its Retry-After header isn't
        // readable cross-origin.)
        const retryAfter = Number(error.response.data?.retryAfter) || (error.response.status === 429 ? 60 : 0);
        const pauseMs = retryAfter > 0 ? Math.min(Math.max(retryAfter * 1000, MIN_AI_PAUSE_MS), AI_PAUSE_MS) : AI_PAUSE_MS;
        aiPausedUntilRef.current = Date.now() + pauseMs;
        setAiOffline(true);
        clearTimeout(aiOfflineTimerRef.current);
        aiOfflineTimerRef.current = setTimeout(() => setAiOffline(false), pauseMs);
      }

      track(limited ? "offline" : "missed");
      logCommand(`Not understood: ${text}`);
      say(hintFor(text, view, limited));
    } finally {
      setProcessing(false);
    }
  }, [logCommand, say, showAnswer]);

  // One finished phrase from the speech recogniser.
  const handleUtterance = useCallback((text) => {
    const view = pageRef.current.describe?.() || {};
    const startedAt = performance.now();

    const steps = understand(text, {
      pending: Boolean(pendingConfirmRef.current),
      expects: expectsRef.current,
      lastField: lastFieldRef.current,
      page: view.page,
      cities: citiesRef.current,
      hotelNames: (view.results || []).map((h) => h.name),
      roomNames: (view.rooms || []).map((r) => r.name),
      hotelName: view.hotelName,
      // For answering simple questions locally.
      hotels: view.results || [],
      openHotel: view.openHotel || null,
      amenityLabels: amenityLabelsRef.current,
      aiAvailable: Date.now() >= aiPausedUntilRef.current,
    });

    if (steps.length) {
      clearTimeout(aiTimerRef.current);
      aiBufferRef.current = "";
      logVoiceEvent({
        handledBy: "local",
        page: view.page,
        action: steps.map((s) => s.type).join("+"),
        ms: performance.now() - startedAt,
      });
      runSteps(steps);
      return;
    }

    // Not understood locally: wait briefly for the rest of the sentence,
    // then ask the AI about all of it.
    aiBufferRef.current = `${aiBufferRef.current} ${text}`;
    clearTimeout(aiTimerRef.current);
    aiTimerRef.current = setTimeout(askAi, AI_FALLBACK_DEBOUNCE_MS);
  }, [runSteps, askAi]);

  const {
    transcript,
    interimTranscript,
    finalTranscript,
    listening,
    resetTranscript,
    browserSupportsSpeechRecognition,
    isMicrophoneAvailable,
  } = useSpeechRecognition();

  useEffect(() => {
    resetTranscriptRef.current = resetTranscript;
  }, [resetTranscript]);

  useEffect(() => {
    listeningRef.current = listening;
  }, [listening]);

  // Each newly finished part of the transcript is one utterance.
  useEffect(() => {
    if (finalTranscript.length < processedRef.current) processedRef.current = 0; // transcript was reset

    const fresh = finalTranscript.slice(processedRef.current).trim();
    processedRef.current = finalTranscript.length;

    if (!fresh || speakingRef.current) return;

    // The recogniser can deliver the reply's echo just after it ends (but
    // after a barge-in, this is what the user said over the reply).
    const bargedIn = bargedInRef.current;
    bargedInRef.current = false;
    if (!bargedIn && Date.now() - spokeUntilRef.current < ECHO_GRACE_MS && isEcho(fresh, replyRef.current)) return;

    handleUtterance(fresh);
  }, [finalTranscript, handleUtterance]);

  // Barge-in: the user talking over the reply stops it, and what they say
  // is then handled as usual (its final transcript arrives after the stop).
  useEffect(() => {
    if (speakingRef.current && interimTranscript && isBargeIn(interimTranscript, replyRef.current)) {
      bargedInRef.current = true;
      stopSpeaking();
    }
  }, [interimTranscript]);

  const toggleListening = useCallback(() => {
    // While a reply is read, a tap skips it (another tap turns the mic off).
    if (wantListeningRef.current && speakingRef.current) {
      skipReply();
      return;
    }

    if (wantListeningRef.current || listening) {
      stopConversation();
      setDrawerOpen(false);
    } else {
      wantListeningRef.current = true;
      resetTranscript();
      processedRef.current = 0;
      SpeechRecognition.startListening({ continuous: true });
      setDrawerOpen(true);
      listeningRef.current = true;
      // Open with the next useful question for this page.
      lastPromptRef.current = { text: "", at: 0 };
      setTimeout(promptNext, 300);
    }
  }, [listening, resetTranscript, promptNext, stopConversation, skipReply]);

  const closeDrawer = useCallback(() => {
    setDrawerOpen(false);
    stopConversation();
  }, [stopConversation]);

  const toggleReplies = useCallback(() => {
    setRepliesOn((on) => {
      try {
        localStorage.setItem(REPLIES_PREF_KEY, on ? "off" : "on");
      } catch {
        // ignore
      }
      if (on) stopSpeaking();
      return !on;
    });
  }, []);

  const value = useMemo(
    () => ({
      transcript,
      listening,
      speaking,
      aiOffline,
      answerCard,
      comparison,
      closeComparison,
      reopenComparison,
      highlightIds,
      drawerOpen,
      recentCommands,
      processing,
      logCommand,
      toggleListening,
      closeDrawer,
      setPageContext,
      getPageView,
      browserSupportsSpeechRecognition,
      isMicrophoneAvailable,
      draft,
      updateDraft,
      resetDraft,
      clearTrip,
      lastReply,
      notify,
      pendingConfirm,
      answerConfirm,
      promptIfActive,
      repliesOn,
      toggleReplies,
    }),
    [
      transcript,
      listening,
      speaking,
      aiOffline,
      answerCard,
      comparison,
      closeComparison,
      reopenComparison,
      highlightIds,
      drawerOpen,
      recentCommands,
      processing,
      logCommand,
      toggleListening,
      closeDrawer,
      setPageContext,
      getPageView,
      browserSupportsSpeechRecognition,
      isMicrophoneAvailable,
      draft,
      updateDraft,
      resetDraft,
      clearTrip,
      lastReply,
      notify,
      pendingConfirm,
      answerConfirm,
      promptIfActive,
      repliesOn,
      toggleReplies,
    ]
  );

  return (
    <VoiceContext.Provider value={value}>
      {children}
      <NoticeToast notice={notice} onClose={() => setNotice(null)} />
      {comparison && <ComparisonModal rows={comparison} onClose={closeComparison} labels={amenityLabels} />}
    </VoiceContext.Provider>
  );
}

export function useVoice() {
  const ctx = useContext(VoiceContext);

  if (!ctx) {
    throw new Error("useVoice must be used within a VoiceProvider");
  }

  return ctx;
}
