import Database from 'better-sqlite3';
import path from 'path';

const dbPath = path.join(process.cwd(), 'vinyl-library.db');
const db = new Database(dbPath);

// Enable WAL mode for better concurrent performance
db.pragma('journal_mode = WAL');

// Create tables if they don't exist
db.exec(`
  CREATE TABLE IF NOT EXISTS vinyls (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    artist TEXT NOT NULL,
    year INTEGER,
    genre TEXT,
    label TEXT,
    condition TEXT CHECK(condition IN ('Mint', 'Near Mint', 'Very Good', 'Good', 'Fair', 'Poor')),
    notes TEXT,
    cover_url TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

// Seed with sample records if the table is empty
const count = db.prepare('SELECT COUNT(*) as count FROM vinyls').get().count;
if (count === 0) {
  const insert = db.prepare(`
    INSERT INTO vinyls (title, artist, year, genre, label, condition, notes, cover_url)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  // Cover Art Archive URLs using release-group MBIDs (free, no auth needed)
  const caa = (mbid) => `https://coverartarchive.org/release-group/${mbid}/front-500`;

  const samples = [
    // Classic Rock
    ['Abbey Road', 'The Beatles', 1969, 'Classic Rock', 'Apple Records', 'Very Good', 'Original UK pressing. Side two medley is pristine.', caa('9162580e-5df4-32de-80cc-f45a8d8a9b1d')],
    ['Led Zeppelin IV', 'Led Zeppelin', 1971, 'Classic Rock', 'Atlantic', 'Near Mint', 'Includes "Stairway to Heaven". Gatefold sleeve in great shape.', caa('3cc3e2de-faf2-3e4a-9fb4-87506e467810')],
    ['Dark Side of the Moon', 'Pink Floyd', 1973, 'Classic Rock', 'Harvest', 'Very Good', 'Complete with original posters and stickers.', caa('f5093c06-23e3-404f-aeaa-40f72885ee3a')],
    ['Rumours', 'Fleetwood Mac', 1977, 'Classic Rock', 'Warner Bros.', 'Near Mint', 'Textured gatefold cover. Vinyl plays beautifully.', caa('52ae9003-f862-3920-bf13-6a6253e25c67')],
    ['Who\'s Next', 'The Who', 1971, 'Classic Rock', 'Decca', 'Good', 'Some surface noise but "Baba O\'Riley" still hits hard.', caa('8cc2c63e-9ef0-3a40-837b-dae8a9e02dc7')],
    ['Back in Black', 'AC/DC', 1980, 'Classic Rock', 'Atlantic', 'Very Good', 'All-black sleeve. One of the best-selling albums of all time.', caa('7ef82fc9-a37e-3e53-b2e3-acd6a232e3a3')],
    ['Hotel California', 'Eagles', 1976, 'Classic Rock', 'Asylum', 'Near Mint', 'Gatefold with original inner sleeve. Title track is flawless.', caa('04b66c2a-9c31-3b03-8c76-e2ef88f07a12')],
    // Alternative
    ['OK Computer', 'Radiohead', 1997, 'Alternative', 'Parlophone', 'Mint', 'Original pressing. A masterpiece from start to finish.', caa('70664047-2545-3e73-b4c7-0a0e0b5e197c')],
    ['Nevermind', 'Nirvana', 1991, 'Alternative', 'DGC', 'Very Good', 'First pressing with "Endless, Nameless" hidden track.', caa('1b022e01-4da6-387b-8658-8678046e4cef')],
    ['The Bends', 'Radiohead', 1995, 'Alternative', 'Parlophone', 'Near Mint', 'Often overshadowed by OK Computer but equally brilliant.', caa('f1a98de4-9f18-343b-9b25-bd6e3a3dc308')],
    ['Disintegration', 'The Cure', 1989, 'Alternative', 'Fiction', 'Very Good', 'Double LP. Atmospheric and haunting. Robert Smith at his best.', caa('be28ed10-f578-362b-8af5-6a61ce3b4015')],
    ['Automatic for the People', 'R.E.M.', 1992, 'Alternative', 'Warner Bros.', 'Near Mint', 'Beautiful string arrangements. "Everybody Hurts" is timeless.', caa('5a80de61-3c83-34e3-b4a1-2c74a1e6cf3e')],
    ['Siamese Dream', 'The Smashing Pumpkins', 1993, 'Alternative', 'Virgin', 'Good', 'Heavy guitars meet dreamy melodies. Killer production by Butch Vig.', caa('4d1e1085-2aff-3ec4-a534-2aabd8e1d612')],
    ['Morning Glory', 'Oasis', 1995, 'Alternative', 'Creation', 'Very Good', 'Peak Britpop. "Wonderwall" and "Champagne Supernova" are iconic.', caa('8ec61d33-4014-3b47-b4d9-ed37e668d790')],
  ];

  const insertMany = db.transaction((records) => {
    for (const record of records) {
      insert.run(...record);
    }
  });

  insertMany(samples);
}

export default db;

// Helper functions for vinyl operations
export function getAllVinyls() {
  return db.prepare('SELECT * FROM vinyls ORDER BY created_at DESC').all();
}

export function getVinylById(id) {
  return db.prepare('SELECT * FROM vinyls WHERE id = ?').get(id);
}

export function createVinyl({ title, artist, year, genre, label, condition, notes, cover_url }) {
  const stmt = db.prepare(`
    INSERT INTO vinyls (title, artist, year, genre, label, condition, notes, cover_url)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const result = stmt.run(title, artist, year, genre, label, condition, notes, cover_url);
  return getVinylById(result.lastInsertRowid);
}

export function updateVinyl(id, { title, artist, year, genre, label, condition, notes, cover_url }) {
  const stmt = db.prepare(`
    UPDATE vinyls 
    SET title = ?, artist = ?, year = ?, genre = ?, label = ?, condition = ?, notes = ?, cover_url = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `);
  stmt.run(title, artist, year, genre, label, condition, notes, cover_url, id);
  return getVinylById(id);
}

export function deleteVinyl(id) {
  const vinyl = getVinylById(id);
  db.prepare('DELETE FROM vinyls WHERE id = ?').run(id);
  return vinyl;
}

export function searchVinyls(query) {
  const searchTerm = `%${query}%`;
  return db.prepare(`
    SELECT * FROM vinyls 
    WHERE title LIKE ? OR artist LIKE ? OR genre LIKE ? OR label LIKE ?
    ORDER BY created_at DESC
  `).all(searchTerm, searchTerm, searchTerm, searchTerm);
}
