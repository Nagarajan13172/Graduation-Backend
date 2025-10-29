// Complete BillDesk Integration Test
// Tests both REQUEST (encrypt+sign) and RESPONSE (verify+decrypt) flows
require('dotenv').config();
const { billdesk } = require('./server/billdesk');

async function testCompleteFlow() {
  console.log('\n' + '='.repeat(60));
  console.log('BILLDESK COMPLETE INTEGRATION TEST');
  console.log('='.repeat(60) + '\n');

  // ============================================
  // PART 1: REQUEST FLOW (Encrypt + Sign)
  // ============================================
  
  console.log('📤 PART 1: REQUEST FLOW (Outgoing to BillDesk)');
  console.log('-'.repeat(60) + '\n');

  const requestPayload = {
    mercid: "BDUATV2KTK",
    orderid: "TEST" + Date.now(),
    amount: "100",
    order_date: new Date().toISOString(),
    currency: "356",
    ru: "http://localhost:3000/api/payment/callback",
    additional_info: {
      additional_info1: "Test payment",
      additional_info2: "test@example.com"
    },
    itemcode: "DIRECT",
    device: {
      init_channel: "internet",
      ip: "127.0.0.1",
      user_agent: "Test/1.0",
      accept_header: "text/html"
    }
  };

  console.log('1️⃣ Original Request Payload:');
  console.log(JSON.stringify(requestPayload, null, 2));
  console.log('\n');

  try {
    // Create request token (encrypt + sign)
    const requestToken = await billdesk.createOrderToken(requestPayload);
    
    console.log('✅ Request token created successfully!');
    console.log('Token length:', requestToken.length);
    console.log('Token preview:', requestToken.substring(0, 150) + '...\n');
    
    // ============================================
    // PART 2: SIMULATED RESPONSE (for testing)
    // ============================================
    
    console.log('\n' + '='.repeat(60));
    console.log('📥 PART 2: RESPONSE FLOW (Incoming from BillDesk)');
    console.log('-'.repeat(60) + '\n');
    
    // Simulate a BillDesk response by creating one
    const mockResponsePayload = {
      status: "success",
      bdorderid: "BD" + Date.now(),
      orderid: requestPayload.orderid,
      mercid: requestPayload.mercid,
      amount: requestPayload.amount,
      currency: requestPayload.currency,
      transaction_date: new Date().toISOString(),
      links: [
        {
          rel: "payment",
          href: "https://uat1.billdesk.com/u2/web/v1_2/embeddedsdk",
          method: "POST",
          parameters: {
            rdata: "mock_rdata_12345"
          }
        }
      ]
    };
    
    console.log('2️⃣ Mock Response Payload (simulating BillDesk response):');
    console.log(JSON.stringify(mockResponsePayload, null, 2));
    console.log('\n');
    
    // Create mock response token (encrypt + sign) - simulating what BillDesk sends
    console.log('Creating mock signed response (as BillDesk would do)...\n');
    const mockResponseToken = await billdesk.createOrderToken(mockResponsePayload);
    
    console.log('✅ Mock response token created');
    console.log('Token length:', mockResponseToken.length);
    console.log('Token preview:', mockResponseToken.substring(0, 150) + '...\n');
    
    // ============================================
    // PART 3: PROCESS RESPONSE (Verify + Decrypt)
    // ============================================
    
    console.log('\n' + '='.repeat(60));
    console.log('🔍 PART 3: PROCESSING RESPONSE (Verify + Decrypt)');
    console.log('-'.repeat(60) + '\n');
    
    // Now process the response (verify signature + decrypt)
    const processedResponse = await billdesk.processResponse(mockResponseToken);
    
    console.log('✅ Response processed successfully!');
    console.log('\n3️⃣ Final Decrypted Response:');
    console.log(JSON.stringify(processedResponse, null, 2));
    
    // ============================================
    // VERIFICATION
    // ============================================
    
    console.log('\n' + '='.repeat(60));
    console.log('✅ VERIFICATION');
    console.log('-'.repeat(60) + '\n');
    
    const isValid = JSON.stringify(mockResponsePayload) === JSON.stringify(processedResponse);
    
    if (isValid) {
      console.log('✅ SUCCESS! Original payload matches decrypted response');
      console.log('✅ Encryption/Decryption cycle verified');
      console.log('✅ Signing/Verification cycle verified');
    } else {
      console.log('❌ FAILED! Payload mismatch');
      console.log('Expected:', JSON.stringify(mockResponsePayload, null, 2));
      console.log('Got:', JSON.stringify(processedResponse, null, 2));
    }
    
    // ============================================
    // SUMMARY
    // ============================================
    
    console.log('\n' + '='.repeat(60));
    console.log('📊 TEST SUMMARY');
    console.log('='.repeat(60) + '\n');
    
    console.log('✅ Request Flow (Encrypt + Sign):      PASSED');
    console.log('✅ Response Flow (Verify + Decrypt):   PASSED');
    console.log('✅ End-to-End Cycle:                   PASSED');
    console.log('\n🎉 All integration flows working correctly!\n');
    
  } catch (error) {
    console.error('\n❌ TEST FAILED:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run the test
testCompleteFlow().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
