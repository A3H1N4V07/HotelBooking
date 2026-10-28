import { useEffect } from "react";
import { useVoice } from "../context/VoiceContext";

function useVoicePageContext(context) {
  const { setPageContext } = useVoice();

  // Runs after every render, so pageRef always reflects this page's latest
  // state/closures — no manual dependency tracking needed.
  useEffect(() => {
    setPageContext(context);
  });

  // Clears the shared context when this page unmounts, so a stale
  // function from the previous page can never fire on a new one.
  useEffect(() => {
    return () => setPageContext({});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}

export default useVoicePageContext;