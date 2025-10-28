// Test script to decrypt BillDesk error response
require('dotenv').config();
const { billdesk } = require('./server/billdesk');

const encryptedError = 'eyJhbGciOiJIUzI1NiIsImNsaWVudGlkIjoiYmR1YXR2Mmt0a3NqMSIsImtpZCI6IkhNQUMifQ.ZXlKamJHbGxiblJwWkNJNkltSmtkV0YwZGpKcmRHdHphakVpTENKbGJtTWlPaUpCTWpVMlIwTk5JaXdpWVd4bklqb2laR2x5SWl3aWEybGtJam9pY210dlIyRTBVMFI0WTNSSUluMC4uUFVxZ2xLUjdSTmtMVTgyNC42TnpSTzVYcENWYTR0eEVJUkpPREJ5andOZlNPNUpfc0lfYl9vV1hjWG5rSlVmMVBxMG9sVTBHaDF2cUc1SXppSEZwYWRxeUJVZnMtTG1lUmxoLWJtR29EaFJKQktzek9TX1Z5X0dVZlNQU1g3VlZaMExYYVN1cDg3U3MwSW0yNl9nWWNaUk1fLS1iNVlRRERYRnZ1RjYtV18zOC55Sld1bW0wLURDM05sWXlQTXVyc2tn.RFv0ZRPYdbHXaQ11vchGrHcghsApktY0MGttR7Wpvnc';

async function decryptError() {
  console.log('\n========================================');
  console.log('Decrypting BillDesk Error Response');
  console.log('========================================\n');

  console.log('Encrypted error token (first 100 chars):');
  console.log(encryptedError.substring(0, 100) + '...\n');

  try {
    const decryptedError = await billdesk.processResponse(encryptedError);
    
    console.log('========================================');
    console.log('✅ Decryption Successful!');
    console.log('========================================\n');
    
    console.log('Decrypted Error Response:');
    console.log(JSON.stringify(decryptedError, null, 2));
    
    console.log('\n========================================');
    console.log('Error Details:');
    console.log('========================================');
    if (decryptedError.error_code) {
      console.log('Error Code:', decryptedError.error_code);
    }
    if (decryptedError.error_desc || decryptedError.error_message) {
      console.log('Error Description:', decryptedError.error_desc || decryptedError.error_message);
    }
    if (decryptedError.message) {
      console.log('Message:', decryptedError.message);
    }
    
    console.log('\n✅ Test completed successfully!\n');
    
  } catch (error) {
    console.error('\n❌ Decryption failed:', error.message);
    console.error(error.stack);
  }
}

decryptError();
