// Test script for payment-success API
// Usage: node test-payment-api.js

const testPayload = {
  razorpay_payment_id: "pay_test123456",
  razorpay_order_id: "order_test123456", 
  razorpay_signature: "test_signature_12345",
  userId: "test_user_123",
  username: "test@example.com",
  plan: "Basic",
  billingPeriod: "monthly",
  isUpgrade: false,
  isRenewal: false
};

async function testPaymentAPI() {
  try {
    const response = await fetch('http://localhost:3000/api/payment-success', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testPayload)
    });

    console.log('Response status:', response.status);
    console.log('Response headers:', Object.fromEntries(response.headers.entries()));
    
    const responseData = await response.json();
    console.log('Response data:', responseData);

    if (response.ok) {
      console.log('✅ Payment API test passed');
    } else {
      console.log('❌ Payment API test failed');
    }
  } catch (error) {
    console.error('❌ Error testing payment API:', error);
  }
}

testPaymentAPI();
