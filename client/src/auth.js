// Client-side view of the login session. The server still checks every
// request; this only keeps the UI from acting on a stale or expired token.

function decodeTokenPayload(token) {
  try {
    const base64 = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    return JSON.parse(atob(base64));
  } catch {
    return null;
  }
}

export function clearSession() {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
  localStorage.removeItem("travelData");
}

// Returns { token, role } for a usable token, or null (clearing an expired one).
export function getSession() {
  const token = localStorage.getItem("token");

  if (!token) return null;

  const payload = decodeTokenPayload(token);

  if (!payload || (payload.exp && payload.exp * 1000 <= Date.now())) {
    clearSession();
    return null;
  }

  return { token, role: payload.role };
}
