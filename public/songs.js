// Songs from the Stardust Blues Jam Spotify playlist
// https://open.spotify.com/playlist/4QVsZ174uFZfdFxnzfJKTU
const PLAYLIST_SONGS = [
  "Ain't No Sunshine - Bill Withers",
  "All Your Love - Gary Moore",
  "Back To Black - Amy Winehouse",
  "Before You Accuse Me - Eric Clapton",
  "Boom Boom - John Lee Hooker",
  "Call Me The Breeze - J.J. Cale",
  "Crossroads - John Mayer",
  "Evil - Koko Taylor",
  "Fight - Joanna Connor",
  "Fisherman's Blues - The Waterboys",
  "Flyin' High (Yesterday) - Johnny Copeland",
  "Friar's Point - Susan Tedeschi",
  "Give Me One Reason - Tracy Chapman",
  "Going Down - Freddie King",
  "Got My Mojo Working - Muddy Waters",
  "Green River - CCR",
  "Highway's Holding Me Now - Samantha Fish",
  "I Put A Spell On You - Annie Lennox",
  "I'd Rather Go Blind - Beth Hart & Joe Bonamassa",
  "I'll Play The Blues For You - Albert King",
  "I'll Take Care Of You - Beth Hart & Joe Bonamassa",
  "La Grange - ZZ Top",
  "Let Me Love You Baby - Mike Farris",
  "Let The Good Times Roll - B.B. King",
  "Little Wing - Jimi Hendrix",
  "Midnight Blues - Gary Moore",
  "My Babe - Little Walter",
  "Nobody Knows You When You're Down And Out - Tedeschi Trucks Band",
  "Outside Of This Town - Christone Kingfish Ingram",
  "Pride and Joy - Stevie Ray Vaughan",
  "Route 66 - Natalie Cole",
  "Runaway - Samantha Fish",
  "Stormy Monday - Freddie King",
  "Sweet Home Chicago - The Blues Brothers",
  "Tennessee Whiskey - Chris Stapleton",
  "Texas Louisiana - Ally Venable & Buddy Guy",
  "The Thrill Is Gone - B.B. King",
  "Today's My Day - Samantha Fish",
  "Wagon Wheel - Darius Rucker",
  "Walking By Myself - Gary Moore",
  "Walking in the Sand - Jeff Beck",
  "What's the Matter with You - Elles Bailey",
  "Wildflowers & Wine - Marcus King",
  "Your Heart Is As Black As Night - Beth Hart & Joe Bonamassa"
];

/**
 * Build a song selector: a <select> dropdown + a hidden custom text input + key input.
 * Replaces the existing <input> element with the combo.
 * Optionally pre-fills a song and key (used when editing).
 */
function buildSongSelector(inputId, prefillSong, prefillKey) {
  const oldInput = document.getElementById(inputId);
  if (!oldInput) return;

  const wrapper = document.createElement("div");
  wrapper.className = "song-selector";

  // Select dropdown
  const select = document.createElement("select");
  select.id = inputId + "-select";

  // "No song" option
  const optNone = document.createElement("option");
  optNone.value = "";
  optNone.textContent = t("songOptional");
  select.appendChild(optNone);

  // Playlist songs
  PLAYLIST_SONGS.forEach(song => {
    const opt = document.createElement("option");
    opt.value = song;
    opt.textContent = song;
    select.appendChild(opt);
  });

  // "Custom song" option
  const optCustom = document.createElement("option");
  optCustom.value = "__custom__";
  optCustom.textContent = "✏️ " + (getLang() === "es" ? "Escribir otra canción..." : "Type a different song...");
  select.appendChild(optCustom);

  // Hidden custom input
  const customInput = document.createElement("input");
  customInput.type = "text";
  customInput.id = inputId + "-custom";
  customInput.placeholder = getLang() === "es" ? "Escribe el nombre de la canción" : "Type song name";
  customInput.style.display = "none";
  customInput.style.marginTop = "0.4rem";

  // Key input (default "Original Version")
  const keyInput = document.createElement("input");
  keyInput.type = "text";
  keyInput.id = inputId + "-key";
  keyInput.value = prefillKey || "Original Version";
  keyInput.placeholder = getLang() === "es" ? "Tono (ej. A, Em...)" : "Key (e.g. A, Em...)";
  keyInput.style.display = "none";
  keyInput.style.marginTop = "0.4rem";
  keyInput.title = getLang() === "es" ? "Tono" : "Key";
  // Select all text on focus so people can easily overwrite "Original Version"
  keyInput.addEventListener("focus", () => keyInput.select());

  function updateKeyVisibility() {
    const hasSong = select.value && select.value !== "";
    keyInput.style.display = hasSong ? "block" : "none";
  }

  // Toggle custom input visibility
  select.addEventListener("change", () => {
    if (select.value === "__custom__") {
      customInput.style.display = "block";
      customInput.focus();
    } else {
      customInput.style.display = "none";
      customInput.value = "";
    }
    updateKeyVisibility();
  });

  wrapper.appendChild(select);
  wrapper.appendChild(customInput);
  wrapper.appendChild(keyInput);

  // Pre-fill an existing song (used when editing)
  if (prefillSong) {
    if (PLAYLIST_SONGS.includes(prefillSong)) {
      select.value = prefillSong;
    } else {
      // Not in the playlist — use custom option
      select.value = "__custom__";
      customInput.style.display = "block";
      customInput.value = prefillSong;
    }
    updateKeyVisibility();
  }

  // Replace the old input
  oldInput.parentNode.replaceChild(wrapper, oldInput);
}

/**
 * Get the selected song value from a song selector combo.
 */
function getSongValue(inputId) {
  const select = document.getElementById(inputId + "-select");
  const customInput = document.getElementById(inputId + "-custom");
  if (!select) return "";
  if (select.value === "__custom__") {
    return ((customInput && customInput.value) || "").trim();
  }
  return select.value;
}

/**
 * Get the {song, key} object from a song selector combo.
 * Returns null if no song selected.
 */
function getSongObject(inputId) {
  const song = getSongValue(inputId);
  if (!song) return null;
  const keyInput = document.getElementById(inputId + "-key");
  let key = ((keyInput && keyInput.value) || "").trim();
  if (!key) key = "Original Version";
  return { song, key };
}
