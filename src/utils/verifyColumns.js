const db = require('../db');

const verifyPaymentColumns = () => {
  return new Promise((resolve, reject) => {
    const columns = [
      { name: 'payment_status', type: 'TEXT', default: "'pending'" },
      { name: 'orderid', type: 'TEXT' },
      { name: 'bdorderid', type: 'TEXT' },
      { name: 'transaction_id', type: 'TEXT' },
      { name: 'payment_amount', type: 'TEXT' },
      { name: 'payment_date', type: 'DATETIME' },
      { name: 'payment_method_type', type: 'TEXT' }
    ];

    console.log('\n=== VERIFYING DATABASE COLUMNS ===');

    // Get current columns
    db.all("PRAGMA table_info(students)", [], async (err, rows) => {
      if (err) {
        console.error('Error checking table structure:', err);
        reject(err);
        return;
      }

      const existingColumns = rows.map(row => row.name);
      console.log('Existing columns:', existingColumns);

      try {
        // Add missing columns sequentially
        for (const col of columns) {
          if (!existingColumns.includes(col.name)) {
            const defaultClause = col.default ? ` DEFAULT ${col.default}` : '';
            const sql = `ALTER TABLE students ADD COLUMN ${col.name} ${col.type}${defaultClause};`;
            console.log('Adding missing column:', sql);
            
            await new Promise((resolveColumn, rejectColumn) => {
              db.run(sql, [], function(err) {
                if (err) {
                  console.error(`Error adding column ${col.name}:`, err);
                  rejectColumn(err);
                } else {
                  console.log(`Added column ${col.name} successfully`);
                  resolveColumn();
                }
              });
            });
          }
        }

        console.log('All payment columns verified/added successfully');
        console.log('===============================\n');
        resolve();
      } catch (error) {
        console.error('Error adding columns:', error);
        reject(error);
      }
    });
  });
};

module.exports = verifyPaymentColumns;