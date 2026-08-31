// Songs from the Stardust Blues Jam Spotify playlist
// https://open.spotify.com/playlist/4QVsZ174uFZfdFxnzfJKTU
const PLAYLIST_SONGS = [
  { title: "Ain't No Sunshine", artist: "Bill Withers" },
  { title: "All Your Love", artist: "Gary Moore" },
  { title: "Back To Black", artist: "Amy Winehouse" },
  { title: "Before You Accuse Me", artist: "Eric Clapton" },
  { title: "Boom Boom", artist: "John Lee Hooker" },
  { title: "Call Me The Breeze", artist: "J.J. Cale" },
  { title: "Crossroads", artist: "John Mayer" },
  { title: "Evil", artist: "Koko Taylor" },
  { title: "Fight", artist: "Joanna Connor" },
  { title: "Fisherman's Blues", artist: "The Waterboys" },
  { title: "Flyin' High (Yesterday)", artist: "Johnny Copeland" },
  { title: "Friar's Point", artist: "Susan Tedeschi" },
  { title: "Give Me One Reason", artist: "Tracy Chapman" },
  { title: "Going Down", artist: "Freddie King" },
  { title: "Got My Mojo Working", artist: "Muddy Waters" },
  { title: "Green River", artist: "Creedence Clearwater Revival" },
  { title: "Highway's Holding Me Now", artist: "Samantha Fish" },
  { title: "I Put A Spell On You", artist: "Annie Lennox" },
  { title: "I'd Rather Go Blind", artist: "Beth Hart & Joe Bonamassa" },
  { title: "I'll Play The Blues For You", artist: "Albert King" },
  { title: "I'll Take Care Of You", artist: "Beth Hart & Joe Bonamassa" },
  { title: "La Grange", artist: "ZZ Top" },
  { title: "Let Me Love You Baby", artist: "Mike Farris" },
  { title: "Let The Good Times Roll", artist: "B.B. King" },
  { title: "Little Wing", artist: "Jimi Hendrix" },
  { title: "Midnight Blues", artist: "Gary Moore" },
  { title: "My Babe", artist: "Little Walter" },
  { title: "Nobody Knows You When You're Down And Out", artist: "Tedeschi Trucks Band" },
  { title: "Outside Of This Town", artist: "Christone 'Kingfish' Ingram" },
  { title: "Pride and Joy", artist: "Stevie Ray Vaughan" },
  { title: "Route 66", artist: "Natalie Cole" },
  { title: "Runaway", artist: "Samantha Fish" },
  { title: "Stormy Monday", artist: "Freddie King" },
  { title: "Sweet Home Chicago", artist: "The Blues Brothers" },
  { title: "Tennessee Whiskey", artist: "Chris Stapleton" },
  { title: "Texas Louisiana", artist: "Ally Venable & Buddy Guy" },
  { title: "The Thrill Is Gone", artist: "B.B. King" },
  { title: "Today's My Day", artist: "Samantha Fish" },
  { title: "Wagon Wheel", artist: "Darius Rucker" },
  { title: "Walking By Myself", artist: "Gary Moore" },
  { title: "Walking in the Sand", artist: "Jeff Beck" },
  { title: "What's the Matter with You", artist: "Elles Bailey" },
  { title: "Wildflowers & Wine", artist: "Marcus King" },
  { title: "Your Heart Is As Black As Night", artist: "Beth Hart & Joe Bonamassa" }
];

function buildSongSelector(inputId, listId) {
  const input = document.getElementById(inputId);
  if (!input) return;

  // Create datalist for autocomplete
  let datalist = document.getElementById(listId);
  if (!datalist) {
    datalist = document.createElement("datalist");
    datalist.id = listId;
    input.parentNode.appendChild(datalist);
  }

  datalist.innerHTML = PLAYLIST_SONGS.map(s =>
    `<option value="${s.title} - ${s.artist}">`
  ).join("");

  input.setAttribute("list", listId);
  input.setAttribute("autocomplete", "off");
}
