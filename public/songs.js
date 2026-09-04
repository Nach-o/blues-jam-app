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
// https://open.spotify.com/playlist/74kSBG21OQPQRl2Q6YATIX
const JAZZ_SONGS = [
  "A Foggy Day - Oscar Peterson",
  "A Night In Tunisia - Dizzy Gillespie",
  "All Blues - Miles Davis",
  "All Of Me - Billie Holiday & Lester Young",
  "All The Things You Are - Coleman Hawkins",
  "Anthropology - Charlie Parker",
  "Autumn Leaves - Stan Getz",
  "Billie's Bounce - Charlie Parker",
  "Blue Bossa - Dexter Gordon",
  "Blue Train - John Coltrane",
  "Blues For Alice - Charlie Parker",
  "Body and Soul - Coleman Hawkins",
  "C-Jam Blues - Dexter Gordon & Ben Webster",
  "Caravan - John Wasson",
  "Chelsea Bridge - Gerry Mulligan & Ben Webster",
  "Cherokee - Wynton Marsalis",
  "Confirmation - Charlie Parker",
  "Darn That Dream - Sarah Vaughan",
  "Days Of Wine And Roses - Frank Sinatra",
  "Desafinado - Stan Getz & João Gilberto",
  "Dolphin Dance - Herbie Hancock",
  "Donna Lee - Charlie Parker",
  "Don't Get Around Much Anymore - Tony Bennett & Michael Bublé",
  "Doxy - Miles Davis & Sonny Rollins",
  "E.S.P. - Miles Davis",
  "Footprints - Wayne Shorter",
  "Four - Miles Davis Quintet",
  "Freddie Freeloader - Miles Davis",
  "Freedom Jazz Dance - Miles Davis",
  "Giant Steps - John Coltrane",
  "Goodbye Pork Pie Hat - Charles Mingus",
  "Have You Met Miss Jones? - Frank Sinatra",
  "I Mean You - Thelonious Monk",
  "I Thought About You - Miles Davis",
  "If I Were A Bell - Miles Davis Quintet",
  "Impressions - John Coltrane",
  "In A Sentimental Mood - Duke Ellington & John Coltrane",
  "In Walked Bud - Thelonious Monk",
  "It Don't Mean a Thing - Louis Armstrong & Duke Ellington",
  "Joy Spring - Clifford Brown",
  "Just Friends - Charlie Parker",
  "Killer Joe - Benny Golson",
  "Lady Bird - Stan Getz",
  "Light Blue - Thelonious Monk Quartet",
  "Love For Sale - Cannonball Adderley",
  "Lover Man - Billie Holiday",
  "Lullaby Of Birdland - Ella Fitzgerald",
  "Maiden Voyage - Herbie Hancock",
  "Mercy, Mercy, Mercy - The Cannonball Adderley Quintet",
  "Misty - Ella Fitzgerald",
  "Moment's Notice - John Coltrane",
  "Moritat - Sonny Rollins",
  "Mr. P.C. - John Coltrane",
  "My Favorite Things - John Coltrane",
  "My Funny Valentine - Art Blakey & Wynton Marsalis",
  "My Romance - Chet Baker & Red Mitchell",
  "Naima - John Coltrane",
  "Nostalgia In Times Square - Charles Mingus",
  "Now's The Time - Charlie Parker",
  "Oleo - Miles Davis & Sonny Rollins",
  "On Green Dolphin Street - Miles Davis",
  "On The Sunny Side Of The Street - Louis Armstrong",
  "Ornithology - Charlie Parker",
  "Pent-Up House - Sonny Rollins",
  "Recorda Me - Joe Henderson",
  "'Round Midnight - Miles Davis",
  "Samba de Orpheus - Vince Guaraldi Trio",
  "Satin Doll - McCoy Tyner",
  "Scrapple From The Apple - Charlie Parker",
  "Softly As In A Morning Sunrise - John Coltrane Quartet",
  "Solar - Miles Davis Quintet",
  "So What - Miles Davis",
  "Some Other Blues - John Coltrane",
  "Someday My Prince Will Come - Miles Davis",
  "Song For My Father - Horace Silver",
  "Sophisticated Lady - Duke Ellington",
  "Speak No Evil - Wayne Shorter",
  "St. Thomas - Sonny Rollins",
  "Stella By Starlight - Miles Davis",
  "Stolen Moments - Oliver Nelson",
  "Stompin At The Savoy - Benny Goodman",
  "Straight, No Chaser - Thelonious Monk",
  "Sugar - Stanley Turrentine",
  "Summertime - Sidney Bechet",
  "Take Five - Dave Brubeck",
  "Take the \"A\" Train - Duke Ellington",
  "The Girl From Ipanema - Stan Getz",
  "The Sidewinder - Lee Morgan",
  "There Will Never Be Another You - Bud Powell",
  "Tune Up - Miles Davis & John Coltrane",
  "Up Jumped Spring - Freddie Hubbard",
  "Waltz For Debby - Bill Evans",
  "Watermelon Man - Herbie Hancock",
  "Wave - Antônio Carlos Jobim",
  "Well You Needn't - Miles Davis Quintet",
  "What Is This Thing Called Love - Frank Sinatra",
  "What's New - John Coltrane Quartet",
  "When I Fall In Love - Nat King Cole"
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
