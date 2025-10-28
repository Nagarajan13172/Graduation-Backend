// Test script to verify BillDesk encryption + signing flow
require('dotenv').config();
const { billdesk } = require('./server/billdesk');

async function testTokenCreation() {
  console.log('\n===========================================');
  console.log('Testing BillDesk Token Creation Flow');
  console.log('===========================================\n');

  // Test payload similar to your example
  const testPayload = {
    mercid: "BDUATV2KTK",
    orderid: "NIGA" + Date.now(),
    amount: "1",
    order_date: new Date().toISOString(),
    currency: "356",
    ru: "http://localhost/api/v1/pgcalk",
    additional_info: {
      additional_info1: "bduatv2ktksj1"
    },
    itemcode: "DIRECT",
    device: {
      init_channel: "internet",
      ip: "134.7.1.1",
      user_agent: "PostmanRuntime/7.46.0",
      accept_header: "text/html"
    }
  };

  try {
    console.log('Step 1: Creating test payload...');
    console.log(JSON.stringify(testPayload, null, 2));
    console.log('\n');

    console.log('Step 2: Encrypting with encryption password...');
    const encryptedToken = await billdesk.encryptPayload(testPayload);
    console.log('Encrypted Token (JWE):');
    console.log(encryptedToken);
    console.log('\n');

    console.log('Step 3: Signing with signing password...');
    const finalToken = billdesk.signEncryptedToken(encryptedToken);
    console.log('Final Signed Token (JWS):');
    console.log(finalToken);
    console.log('\n');

    console.log('===========================================');
    console.log('Complete Flow Test:');
    console.log('===========================================\n');
    
    const completeToken = await billdesk.createOrderToken(testPayload);
    console.log('Token created successfully!');
    console.log('Token length:', completeToken.length);
    console.log('\nFirst 200 characters:');
    console.log(completeToken.substring(0, 200) + '...');
    
    console.log('\n✅ Test completed successfully!\n');

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error(error.stack);
  }
}

testTokenCreation();
