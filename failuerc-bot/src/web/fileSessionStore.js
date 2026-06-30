const fs = require('node:fs');
const path = require('node:path');
const session = require('express-session');

class FileSessionStore extends session.Store {
  constructor(options = {}) {
    super();
    this.dir = options.dir;
    fs.mkdirSync(this.dir, { recursive: true });
  }

  filePath(sid) {
    const safe = sid.replace(/[^a-zA-Z0-9._-]/g, '');
    return path.join(this.dir, `${safe}.json`);
  }

  get(sid, callback) {
    fs.readFile(this.filePath(sid), 'utf8', (err, raw) => {
      if (err) return callback(null);
      try {
        const data = JSON.parse(raw);
        return callback(null, data);
      } catch (parseErr) {
        return callback(parseErr);
      }
    });
  }

  set(sid, sessionData, callback) {
    fs.writeFile(this.filePath(sid), JSON.stringify(sessionData), callback);
  }

  destroy(sid, callback) {
    fs.unlink(this.filePath(sid), () => callback?.());
  }

  touch(sid, sessionData, callback) {
    this.set(sid, sessionData, callback || (() => {}));
  }
}

module.exports = { FileSessionStore };
