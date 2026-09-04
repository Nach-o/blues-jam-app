// Jam mode: "blues" (default) or "jazz".
// Controls theme colors, page branding, and which song playlist is shown.
// The mode is stored server-side (see /api/settings/mode) so every device
// switches together. We also cache it in localStorage so pages can theme
// themselves instantly on load before the network request returns.

const MODE_BLUES = "blues";
const MODE_JAZZ = "jazz";

const MODE_META = {
  blues: {
    brand: "Stardust Blues Jam",
    themeClass: "", // default theme (gold) — no extra class needed
    spotify: "https://open.spotify.com/playlist/4QVsZ174uFZfdFxnzfJKTU",
    accent: "#d4a647",
  },
  jazz: {
    brand: "Stardust Jazz Jam",
    themeClass: "theme-jazz",
    spotify: "https://open.spotify.com/playlist/74kSBG21OQPQRl2Q6YATIX",
    accent: "#4caf50",
  },
};

function getMode() {
  const m = localStorage.getItem("blues-jam-mode");
  return m === MODE_JAZZ ? MODE_JAZZ : MODE_BLUES;
}

function getModeMeta() {
  return MODE_META[getMode()] || MODE_META.blues;
}

// Apply the theme class + branding to the current page.
function applyMode() {
  const mode = getMode();
  const meta = MODE_META[mode] || MODE_META.blues;

  // Theme class toggles the CSS palette
  document.body.classList.toggle("theme-jazz", mode === MODE_JAZZ);

  // Update any element that opts into mode branding
  document.querySelectorAll("[data-mode-brand]").forEach((el) => {
    el.textContent = meta.brand;
  });

  // Update the document <title> if it references the brand
  document.querySelectorAll("[data-mode-title]").forEach((el) => {
    const suffix = el.getAttribute("data-mode-title");
    document.title = suffix ? `${meta.brand}${suffix}` : meta.brand;
  });

  // Update Spotify playlist links
  document.querySelectorAll("[data-mode-spotify]").forEach((el) => {
    el.href = meta.spotify;
  });

  // Swap the literal brand word inside translated strings.
  // i18n strings hardcode "Blues" (e.g. "Join Stardust Blues Jam" / "Unirse al
  // Stardust Blues Jam"). In jazz mode we replace the "Blues" token with "Jazz"
  // wherever it appears next to "Stardust ... Jam".
  const wrongWord = mode === MODE_JAZZ ? "Blues" : "Jazz";
  const rightWord = mode === MODE_JAZZ ? "Jazz" : "Blues";
  document.querySelectorAll("[data-i18n]").forEach((el) => {
    if (el.textContent && el.textContent.indexOf("Stardust") !== -1) {
      el.textContent = el.textContent.split(wrongWord).join(rightWord);
    }
  });
}

// Fetch the authoritative mode from the server, cache it, apply the theme,
// and (optionally) call a callback when the mode changes so callers can
// rebuild UI such as song selectors.
function syncMode(onChange) {
  fetch("/api/settings/mode")
    .then((r) => r.json())
    .then((d) => {
      const server = d.mode === MODE_JAZZ ? MODE_JAZZ : MODE_BLUES;
      const changed = server !== getMode();
      localStorage.setItem("blues-jam-mode", server);
      applyMode();
      if (changed && typeof onChange === "function") onChange(server);
    })
    .catch(() => {
      // Offline / older browser — just apply the cached mode
      applyMode();
    });
}

// Handle a mode-change message coming over the SSE queue channel.
// Returns true if the payload was a mode message (and was handled).
function handleModeEvent(payload, onChange) {
  if (payload && payload.type === "mode") {
    const mode = payload.mode === MODE_JAZZ ? MODE_JAZZ : MODE_BLUES;
    const changed = mode !== getMode();
    localStorage.setItem("blues-jam-mode", mode);
    applyMode();
    if (changed && typeof onChange === "function") onChange(mode);
    return true;
  }
  return false;
}

// Re-apply mode branding whenever translations are re-applied (e.g. on a
// language switch), so the "Blues"/"Jazz" token stays correct.
if (typeof applyTranslations === "function") {
  const _origApplyTranslations = applyTranslations;
  applyTranslations = function () {
    _origApplyTranslations.apply(this, arguments);
    applyMode();
  };
}

// Show a small banner at the top of the page when this browser is logged in
// as admin. Loaded on every page via mode.js, so it appears everywhere.
function showAdminNotice() {
  if (localStorage.getItem("blues-jam-admin") !== "true") return;
  if (document.getElementById("admin-notice")) return; // avoid duplicates

  const bar = document.createElement("div");
  bar.id = "admin-notice";
  bar.className = "admin-notice";
  bar.textContent = "🔑 You are logged in as admin";
  document.body.insertBefore(bar, document.body.firstChild);
}

// Apply cached theme immediately on load (before the server sync returns).
document.addEventListener("DOMContentLoaded", function () {
  applyMode();
  showAdminNotice();
});
