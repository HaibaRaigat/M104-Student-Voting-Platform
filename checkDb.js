const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const db = new sqlite3.Database(path.join(__dirname, 'votes.db'));

console.log("Pages in submissions table:");
db.all("SELECT * FROM submissions", (err, rows) => {
  if(err) console.error(err.message);
  else console.table(rows);

  console.log("Votes table:");
  db.all("SELECT * FROM votes", (err2, rows2) => {
    if(err2) console.error(err2.message);
    else console.table(rows2);

    db.close();
  });
});
