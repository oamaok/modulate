const sql = require('sql-template-strings')

exports.default = {
  async up(db) {
    await db.exec(`
    
    SELECT 1;
    
    `)
  },

  async down(db) {
    await db.exec(`
    
    SELECT 1;
    
    `)
  },
}
