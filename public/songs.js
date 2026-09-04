// Songs from the Stardust Blues Jam Spotify playlist
// https://open.spotify.com/playlist/4QVsZ174uFZfdFxnzfJKTU
const BLUES_SONGS = [
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

// Songs from the Stardust Jazz Jam Spotify playlist
// https://open.spotify.com/playlist/1Ilnv9XH41Zt7IwXolCGVG
const JAZZ_SONGS = [
  "All of Me - Billie Holiday",
  "Beautiful Love - Benny Golson",
  "Black Orpheus - Paul Desmond",
  "Blue Bossa - Joe Henderson",
  "Blue Monk - Art Blakey & Thelonious Monk",
  "Bluesette - Yvonnick Prené & Pasquale Grasso",
  "Bluesette - Toots Thielemans",
  "But Not For Me - Chet Baker",
  "Bye Bye Blackbird - Etta Jones",
  "Cantaloupe Island - Herbie Hancock",
  "Caravan - Wynton Marsalis",
  "Chega de Saudade - João Gilberto",
  "Corcovado (Quiet Nights Of Quiet Stars) - Stan Getz & João Gilberto",
  "Days Of Wine And Roses - Dexter Gordon",
  "Estate - Bruno Martino",
  "Eu E A Brisa - Maria Creuza",
  "Fly Me To The Moon - Tete Montoliu Trio",
  "Goodbye Pork Pie Hat - Charles Mingus",
  "I Fall In Love Too Easily - Chet Baker",
  "I'll Remember April - Carmen McRae",
  "In A Sentimental Mood - Ella Fitzgerald",
  "It's Only A Paper Moon - Nat King Cole",
  "J'attendrai - Django Reinhardt",
  "Just Friends - Charlie Parker",
  "Laura - Helen Merrill",
  "Love Me Or Leave Me - Billie Holiday",
  "Lucky Southern - Atlantic Five Jazz Band",
  "Lucky Southern - Airto",
  "Lullaby of Birdland - Sarah Vaughan & Clifford Brown",
  "Misty - Samara Joy",
  "My Favourite Things - Tony Bennett",
  "My One And Only Love - John Coltrane & Johnny Hartman",
  "Nature Boy - Miles Davis",
  "Nature Boy - John Coltrane",
  "Nature Boy - Nat King Cole",
  "Night And Day - Django Reinhardt",
  "No Problem - Duke Jordan",
  "O Barquinho - Antônio Carlos Jobim & João Gilberto",
  "Old Devil Moon - Chet Baker",
  "On Green Dolphin Street - Dexter Gordon",
  "On Green Dolphin Street - Miles Davis",
  "On The Sunny Side Of The Street - Louis Armstrong",
  "One Note Samba - Al Jarreau",
  "Petite Fleur - Sidney Bechet",
  "Petite Fleur - The Hot Sardines",
  "Recado Bossa Nova - Andy Brown",
  "Sandu - Clifford Brown & Max Roach Quintet",
  "Satin Doll - Ella Fitzgerald",
  "Si tu savais - Django Reinhardt",
  "Si tu savais - Georges Ulmer",
  "Si tu vois ma mère - Sidney Bechet",
  "Softly As In A Morning Sunrise - The Modern Jazz Quartet",
  "St. Thomas - Tiny Stills Quartet",
  "Stardust - Gerry Mulligan & Chet Baker",
  "Summertime - Chet Baker",
  "Take The A Train - Anita O'Day",
  "Tenor Madness - Sonny Rollins Quartet & John Coltrane",
  "The Girl From Ipanema - Stan Getz & João Gilberto",
  "When Sunny Gets Blue - Nat King Cole",
  "When We Were Free - Pat Metheny Group",
  "Yesterdays - Jimmy Raney Quintet"
];

/**
 * The active playlist depends on the current jam mode.
 * getMode() comes from mode.js — fall back to the blues list if it's absent.
 */
function getPlaylistSongs() {
  try {
    if (typeof getMode === "function" && getMode() === "jazz") {
      return JAZZ_SONGS;
    }
  } catch (e) {}
  return BLUES_SONGS;
}

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

  // Playlist songs (blues or jazz depending on current mode)
  getPlaylistSongs().forEach(song => {
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
    if (getPlaylistSongs().includes(prefillSong)) {
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
