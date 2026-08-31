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
 * Build a song selector: a <select> dropdown + a hidden custom text input.
 * Replaces the existing <input> element with the combo.
 */
function buildSongSelector(inputId) {
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

  // Toggle custom input visibility
  select.addEventListener("change", () => {
    if (select.value === "__custom__") {
      customInput.style.display = "block";
      customInput.focus();
    } else {
      customInput.style.display = "none";
      customInput.value = "";
    }
  });

  wrapper.appendChild(select);
  wrapper.appendChild(customInput);

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
    return (customInput?.value || "").trim();
  }
  return select.value;
}
