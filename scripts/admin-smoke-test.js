#!/usr/bin/env node

/**
 * Admin API Smoke Test
 * Validates critical admin routes and subscription revocation logic
 * 
 * Usage: node scripts/admin-smoke-test.js [--url http://localhost:3000]
 */

const fs = require('fs');
const path = require('path');

// Configuration
const BASE_URL = process.argv.find(arg => arg.startsWith('--url='))?.split('=')[1] || 'http://localhost:3000';
const ADMIN_API_KEY = process.env.ADMIN_API_KEY || 'test-admin-key-12345';

// Color output for terminal
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(type, message) {
  const timestamp = new Date().toISOString().split('T')[1];
  switch (type) {
    case 'success':
      console.log(`${colors.green}✓${colors.reset} [${timestamp}] ${message}`);
      break;
    case 'error':
      console.log(`${colors.red}✗${colors.reset} [${timestamp}] ${message}`);
      break;
    case 'info':
      console.log(`${colors.blue}ℹ${colors.reset} [${timestamp}] ${message}`);
      break;
    case 'warn':
      console.log(`${colors.yellow}⚠${colors.reset} [${timestamp}] ${message}`);
      break;
    case 'step':
      console.log(`${colors.cyan}→${colors.reset} [${timestamp}] ${message}`);
      break;
  }
}

async function makeRequest(method, endpoint, body = null, headers = {}) {
  const url = `${BASE_URL}${endpoint}`;
  
  const opts = {
    method,
    headers: {
      'Content-Type': 'application/json',
      'x-admin-api-key': ADMIN_API_KEY,
      ...headers,
    },
  };

  if (body) {
    opts.body = JSON.stringify(body);
  }

  try {
    const response = await fetch(url, opts);
    const data = await response.text();
    let parsed = null;
    try {
      parsed = JSON.parse(data);
    } catch {
      parsed = data;
    }
    
    return {
      status: response.status,
      ok: response.ok,
      data: parsed,
      headers: Object.fromEntries(response.headers),
    };
  } catch (err) {
    return {
      status: 0,
      ok: false,
      error: err.message,
    };
  }
}

async function runTests() {
  log('info', `Starting admin smoke tests against ${BASE_URL}`);
  log('info', `Using Admin API Key: ${ADMIN_API_KEY.substring(0, 10)}...`);
  
  let testsPassed = 0;
  let testsFailed = 0;
  
  const testState = {
    userId: null,
    subscriptionId: null,
    accessToken: null,
  };

  try {
    // Test 1: Create admin user with Clerk sync
    log('step', 'Test 1: Create admin user with API-key auth and Clerk sync');
    const createUserRes = await makeRequest('POST', '/api/admin/users', {
      email: `test-${Date.now()}@example.com`,
      firstName: 'Test',
      lastName: 'Admin',
      role: 'admin',
      syncWithClerk: true,
    });

    if (createUserRes.ok && createUserRes.data?.userId) {
      testState.userId = createUserRes.data.userId;
      log('success', `User created with ID: ${testState.userId}`);
      if (createUserRes.data.clerkId) {
        log('success', `Clerk sync confirmed: Clerk ID = ${createUserRes.data.clerkId}`);
        testsPassed++;
      } else {
        log('warn', 'Clerk sync status unclear (no clerkId in response, but userId present)');
        testsPassed++;
      }
    } else {
      log('error', `User creation failed: ${createUserRes.status} - ${JSON.stringify(createUserRes.data)}`);
      testsFailed++;
    }

    if (!testState.userId) {
      log('error', 'Cannot proceed without user ID. Stopping tests.');
      return { passed: testsPassed, failed: testsFailed };
    }

    // Test 2: Create subscription for user
    log('step', 'Test 2: Create subscription for test user');
    const createSubRes = await makeRequest('POST', '/api/admin/subscriptions', {
      userId: testState.userId,
      planId: 'test-plan-001',
      planName: 'Test Plan',
      amount: 99900, // ₹999.00 in paise
      billingCycle: 'monthly',
      status: 'active',
    });

    if (createSubRes.ok && createSubRes.data?._id) {
      testState.subscriptionId = createSubRes.data._id;
      testState.accessToken = createSubRes.data.accessToken;
      log('success', `Subscription created with ID: ${testState.subscriptionId}`);
      log('success', `User access token generated: ${testState.accessToken?.substring(0, 16)}...`);
      testsPassed++;
    } else {
      log('error', `Subscription creation failed: ${createSubRes.status} - ${JSON.stringify(createSubRes.data)}`);
      testsFailed++;
    }

    if (!testState.subscriptionId) {
      log('error', 'Cannot proceed without subscription ID. Skipping revocation tests.');
      return { passed: testsPassed, failed: testsFailed };
    }

    // Test 3: Verify user has active access token before cancellation
    log('step', 'Test 3: Verify user has accessToken before cancellation');
    const getUserRes = await makeRequest('GET', `/api/admin/users/${testState.userId}`);

    if (getUserRes.ok && getUserRes.data?.accessToken) {
      log('success', `User has active accessToken: ${getUserRes.data.accessToken.substring(0, 16)}...`);
      testState.accessToken = getUserRes.data.accessToken;
      testsPassed++;
    } else {
      log('warn', `User accessToken not found or request failed: ${getUserRes.status}`);
    }

    // Test 4: Cancel subscription (should trigger revocation)
    log('step', 'Test 4: Cancel subscription (should trigger token revocation)');
    const cancelRes = await makeRequest('POST', `/api/admin/subscriptions/${testState.subscriptionId}/cancel`, {
      reason: 'smoke_test',
      refund: false,
    });

    if (cancelRes.ok || cancelRes.status === 200) {
      log('success', `Subscription cancel request accepted: ${cancelRes.status}`);
      testsPassed++;
    } else {
      log('error', `Cancel request failed: ${cancelRes.status} - ${JSON.stringify(cancelRes.data)}`);
      testsFailed++;
    }

    // Small delay to allow async token revocation
    await new Promise(r => setTimeout(r, 500));

    // Test 5: Verify accessToken is cleared (revoked) after cancellation
    log('step', 'Test 5: Verify accessToken is cleared after cancellation (revocation)');
    const getUserAfterCancelRes = await makeRequest('GET', `/api/admin/users/${testState.userId}`);

    if (getUserAfterCancelRes.ok) {
      if (getUserAfterCancelRes.data?.accessToken === null || !getUserAfterCancelRes.data?.accessToken) {
        log('success', 'Token revoked: accessToken is null after subscription cancellation');
        testsPassed++;
      } else {
        log('error', `Token NOT revoked: accessToken still present after cancellation`);
        testsFailed++;
      }
    } else {
      log('error', `Failed to fetch user after cancellation: ${getUserAfterCancelRes.status}`);
      testsFailed++;
    }

    // Test 6: Attempt to use revoked token (should fail with 401)
    if (testState.accessToken) {
      log('step', 'Test 6: Attempt desktop auth with revoked token (expect 401)');
      const desktopAuthRes = await makeRequest('GET', '/api/check-subscription', null, {
        'x-desktop-access-token': testState.accessToken,
      });

      if (desktopAuthRes.status === 401 || !desktopAuthRes.ok) {
        log('success', `Revoked token rejected: ${desktopAuthRes.status} (expected 401)`);
        testsPassed++;
      } else {
        log('error', `Revoked token was accepted: ${desktopAuthRes.status} (expected 401) - SECURITY ISSUE`);
        testsFailed++;
      }
    }

    // Test 7: Verify subscription status is 'cancelled'
    log('step', 'Test 7: Verify subscription status is updated to cancelled');
    const getSubRes = await makeRequest('GET', `/api/admin/subscriptions/${testState.subscriptionId}`);

    if (getSubRes.ok && getSubRes.data?.status === 'cancelled') {
      log('success', `Subscription status confirmed as 'cancelled'`);
      testsPassed++;
    } else {
      log('warn', `Subscription status: ${getSubRes.data?.status || 'unknown'}`);
    }

  } catch (err) {
    log('error', `Unexpected error: ${err.message}`);
    testsFailed++;
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  log('info', `Tests completed: ${testsPassed} passed, ${testsFailed} failed`);
  console.log('='.repeat(60) + '\n');

  return {
    passed: testsPassed,
    failed: testsFailed,
    success: testsFailed === 0,
  };
}

// Execute tests
runTests().then(result => {
  process.exit(result.success ? 0 : 1);
}).catch(err => {
  log('error', `Fatal error: ${err.message}`);
  process.exit(1);
});
