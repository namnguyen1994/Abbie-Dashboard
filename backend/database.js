/*
  database.js — SQLite setup using sql.js (pure JavaScript, no native build needed).
  The DB is saved to metadata.db on disk and loaded on startup.
*/
const fs        = require('fs');
const path      = require('path');
const initSqlJs = require('sql.js');
 
const DB_PATH = path.join(__dirname, 'metadata.db');
 
let db; // set after initDB() is called
 
// Saves the in-memory DB to disk — called after every write so data persists
function saveToDisk() {
  fs.writeFileSync(DB_PATH, Buffer.from(db.export()));
}
 
/*
  initDB() — must be called once before any other function (on server startup).
  Loads metadata.db from disk if it exists, otherwise creates a fresh database.
*/
async function initDB() {
  const SQL = await initSqlJs();
  db = fs.existsSync(DB_PATH)
    ? new SQL.Database(fs.readFileSync(DB_PATH))
    : new SQL.Database();
 
  db.run(`
    CREATE TABLE IF NOT EXISTS ticket_metadata (
      ticket_id          TEXT PRIMARY KEY,
      docs_status        TEXT,
      docs_to_change     TEXT,
      rn_writeup         TEXT,
      notes              TEXT,
      docs_team_member   TEXT,
      sme                TEXT,
      review_process     TEXT,
      docs_changes_noted TEXT,
      wrike_card_added   TEXT,
      include_rn_sheet   TEXT,
      entered_into_rn    TEXT,
      plat_link_added    TEXT,
      updated_at         TEXT
    )
  `);
  
  //Settings table to store key/value app config like Google Sheet URL
  db.run(`
    CREATE TABLE IF NOT EXISTS app_settings (
      key        TEXT PRIMARY KEY,
      value      TEXT,
      updated_at TEXT
    )
  `);

  saveToDisk();
  console.log('✅ Database ready:', DB_PATH);
}
 
// Converts sql.js query result into plain JS objects
function rowsToObjects(result) {
  if (!result || result.length === 0) return [];
  const { columns, values } = result[0];
  return values.map(row => {
    const obj = {};
    columns.forEach((col, i) => { obj[col] = row[i]; });
    return obj;
  });
}
 
// Returns one ticket's metadata, or null
function getMetadata(ticketId) {
  const rows = rowsToObjects(
    db.exec('SELECT * FROM ticket_metadata WHERE ticket_id = ?', [ticketId])
  );
  return rows[0] || null;
}
 
// Returns all rows as a Map keyed by ticket_id — used for fast bulk merging
function getAllMetadata() {
  const map = new Map();
  rowsToObjects(db.exec('SELECT * FROM ticket_metadata'))
    .forEach(row => map.set(row.ticket_id, row));
  return map;
}
 
// Inserts or updates one ticket's metadata
function upsertMetadata(ticketId, fields) {
  const now = new Date().toISOString().replace('T', ' ').slice(0, 19);
 
  if (getMetadata(ticketId)) {
    const setClauses = Object.keys(fields).map(k => `${k} = ?`).join(', ');
    db.run(
      `UPDATE ticket_metadata SET ${setClauses}, updated_at = ? WHERE ticket_id = ?`,
      [...Object.values(fields), now, ticketId]
    );
  } else {
    const all  = { ticket_id: ticketId, ...fields, updated_at: now };
    const cols = Object.keys(all).join(', ');
    const ph   = Object.keys(all).map(() => '?').join(', ');
    db.run(`INSERT INTO ticket_metadata (${cols}) VALUES (${ph})`, Object.values(all));
  }
 
  saveToDisk();
  return getMetadata(ticketId);
}
 
// Bulk insert used by importSheet.js for the initial CSV load
function bulkInsert(rows) {
  const now = new Date().toISOString().replace('T', ' ').slice(0, 19);
  rows.forEach(row => {
    const all  = { ...row, updated_at: now };
    const cols = Object.keys(all).join(', ');
    const ph   = Object.keys(all).map(() => '?').join(', ');
    db.run(
      `INSERT OR REPLACE INTO ticket_metadata (${cols}) VALUES (${ph})`,
      Object.values(all)
    );
  });
  saveToDisk();
}

function getSetting(key) {
  const rows = rowsToObjects(db.exec('SELECT value FROM app_settings WHERE key = ?', [key]));
  return rows[0] ? rows[0].value : null;
}
 
// Saves or updates a setting value
function setSetting(key, value) {
  const now      = new Date().toISOString().replace('T', ' ').slice(0, 19);
  const existing = getSetting(key);
  if (existing !== null) {
    db.run('UPDATE app_settings SET value = ?, updated_at = ? WHERE key = ?', [value, now, key]);
  } else {
    db.run('INSERT INTO app_settings (key, value, updated_at) VALUES (?, ?, ?)', [key, value, now]);
  }
  saveToDisk();
}
 
module.exports = { initDB, getMetadata, getAllMetadata, upsertMetadata, bulkInsert, getSetting, setSetting };