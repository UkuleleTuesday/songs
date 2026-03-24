const DATA_URL = "./data.jsonl";

async function fetchSongs() {
  const res = await fetch(DATA_URL);
  if (!res.ok) throw new Error(`HTTP ${res.status} – could not fetch dataset`);
  const text = await res.text();
  return text.trim().split("\n")
    .filter(Boolean)
    .map(line => JSON.parse(line));
}

function buildIndex(songs) {
  return lunr(function () {
    this.ref("id");
    this.field("song",         { boost: 10 });
    this.field("artist",       { boost: 8  });
    this.field("chords",       { boost: 3  });
    this.field("tabber",       { boost: 2  });
    this.field("specialbooks", { boost: 2  });
    this.field("language");
    this.field("features");

    songs.forEach(s => {
      const p = s.properties || {};
      this.add({
        id:           s.id,
        song:         p.song         || "",
        artist:       p.artist       || "",
        chords:       (p.chords || "").replace(/,/g, " "),
        tabber:       p.tabber       || "",
        specialbooks: (p.specialbooks || "").replace(/,/g, " "),
        language:     p.language     || "",
        features:     p.features     || "",
      });
    });
  });
}

function lunrSearch(lunrIndex, allSongs, query) {
  try {
    const hits = lunrIndex.search(query);
    if (hits.length > 0) return new Set(hits.map(h => h.ref));
  } catch (_) { /* fall through */ }

  try {
    const wildcardQuery = query.trim().split(/\s+/).map(t => `${t}*`).join(" ");
    const hits = lunrIndex.search(wildcardQuery);
    return new Set(hits.map(h => h.ref));
  } catch (_) { /* fall through */ }

  const q = query.toLowerCase();
  return new Set(
    allSongs
      .filter(s => {
        const p = s.properties || {};
        return (
          (p.song   || "").toLowerCase().includes(q) ||
          (p.artist || "").toLowerCase().includes(q) ||
          (p.chords || "").toLowerCase().includes(q)
        );
      })
      .map(s => s.id)
  );
}

function applyFilters(songs, lunrIndex, allSongs, filters) {
  let result = songs;

  if (filters.query && lunrIndex) {
    const hitIds = lunrSearch(lunrIndex, allSongs, filters.query);
    result = result.filter(s => hitIds.has(s.id));
  }

  if (filters.difficulty) {
    result = result.filter(s => {
      const band = difficultyBand((s.properties || {}).difficulty);
      return band === filters.difficulty;
    });
  }

  if (filters.book) {
    result = result.filter(s => {
      const books = ((s.properties || {}).specialbooks || "")
        .split(",").map(b => b.trim());
      return books.includes(filters.book);
    });
  }

  return result;
}
