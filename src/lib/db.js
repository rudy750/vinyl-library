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

  // Cover art will be resolved on demand via /api/cover-art or /api/cover-art/resolve-all
  const samples = [
    // Classic Rock
    ['Abbey Road', 'The Beatles', 1969, 'Classic Rock', 'Apple Records', 'Very Good', 'Original UK pressing. Side two medley is pristine.', null],
    ['Led Zeppelin IV', 'Led Zeppelin', 1971, 'Classic Rock', 'Atlantic', 'Near Mint', 'Includes "Stairway to Heaven". Gatefold sleeve in great shape.', null],
    ['Dark Side of the Moon', 'Pink Floyd', 1973, 'Classic Rock', 'Harvest', 'Very Good', 'Complete with original posters and stickers.', null],
    ['Rumours', 'Fleetwood Mac', 1977, 'Classic Rock', 'Warner Bros.', 'Near Mint', 'Textured gatefold cover. Vinyl plays beautifully.', null],
    ['Who\'s Next', 'The Who', 1971, 'Classic Rock', 'Decca', 'Good', 'Some surface noise but "Baba O\'Riley" still hits hard.', null],
    ['Back in Black', 'AC/DC', 1980, 'Classic Rock', 'Atlantic', 'Very Good', 'All-black sleeve. One of the best-selling albums of all time.', null],
    ['Hotel California', 'Eagles', 1976, 'Classic Rock', 'Asylum', 'Near Mint', 'Gatefold with original inner sleeve. Title track is flawless.', null],
    // Alternative
    ['OK Computer', 'Radiohead', 1997, 'Alternative', 'Parlophone', 'Mint', 'Original pressing. A masterpiece from start to finish.', null],
    ['Nevermind', 'Nirvana', 1991, 'Alternative', 'DGC', 'Very Good', 'First pressing with "Endless, Nameless" hidden track.', null],
    ['The Bends', 'Radiohead', 1995, 'Alternative', 'Parlophone', 'Near Mint', 'Often overshadowed by OK Computer but equally brilliant.', null],
    ['Disintegration', 'The Cure', 1989, 'Alternative', 'Fiction', 'Very Good', 'Double LP. Atmospheric and haunting. Robert Smith at his best.', null],
    ['Automatic for the People', 'R.E.M.', 1992, 'Alternative', 'Warner Bros.', 'Near Mint', 'Beautiful string arrangements. "Everybody Hurts" is timeless.', null],
    ['Siamese Dream', 'The Smashing Pumpkins', 1993, 'Alternative', 'Virgin', 'Good', 'Heavy guitars meet dreamy melodies. Killer production by Butch Vig.', null],
    ['Morning Glory', 'Oasis', 1995, 'Alternative', 'Creation', 'Very Good', 'Peak Britpop. "Wonderwall" and "Champagne Supernova" are iconic.', null],
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
