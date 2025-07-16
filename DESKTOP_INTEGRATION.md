# Desktop App Integration Guide

## Overview
This document outlines the backend API integration for the LoanPro desktop application to handle subscription management, access control, and data synchronization.

## Authentication Flow
The desktop app uses access tokens for authentication. These tokens are generated during:
1. Free trial activation
2. Successful payment completion

## API Endpoints

### 1. Check Subscription Status
**Endpoint:** `POST /api/check-subscription`

**Purpose:** Verify user subscription status and retrieve feature permissions

**Request Body:**
```json
{
  "accessToken": "user_access_token_here"
}
```

**Response:**
```json
{
  "success": true,
  "subscriptionStatus": "active_trial|active_subscription|grace_period|expired",
  "subscriptionPlan": "Basic|Pro|Enterprise",
  "daysRemaining": 14,
  "isInGracePeriod": false,
  "features": {
    "biometrics": false,
    "autoSync": false,
    "cloudDatabase": true,
    "analytics": true,
    "prioritySupport": true,
    "customSubdomain": true,
    "apiAccess": true
  },
  "maxDevices": 1,
  "cloudStorageLimit": 1073741824,
  "dataUsage": 0,
  "devices": [],
  "user": {
    "username": "user123",
    "email": "user@example.com",
    "createdAt": "2025-01-01T00:00:00.000Z"
  }
}
```

### 2. Start Free Trial
**Endpoint:** `POST /api/start-free-trial`

**Purpose:** Activate 14-day Pro trial for new users

**Request Body:**
```json
{
  "username": "user123",
  "email": "user@example.com"
}
```

**Response:**
```json
{
  "success": true,
  "message": "14-day Pro trial started successfully!",
  "trialExpiresAt": "2025-01-15T00:00:00.000Z",
  "accessToken": "generated_access_token",
  "features": { ... },
  "redirectUrl": "/download"
}
```

## Subscription Plans & Features

### Basic Plan (₹499/month)
- **Features:** Core functionality, basic analytics, local storage
- **Limitations:** No cloud, no biometrics, single device, limited support
- **Max Devices:** 1
- **Cloud Storage:** 0GB

### Pro Plan (₹999/month)
- **Features:** All Basic + cloud database (1GB), priority support, API access
- **Limitations:** No auto-sync, no biometrics, single device
- **Max Devices:** 1
- **Cloud Storage:** 1GB

### Enterprise Plan (₹1499/month)
- **Features:** All Pro + unlimited cloud, biometrics, auto-sync, 2 devices
- **Limitations:** None
- **Max Devices:** 2
- **Cloud Storage:** Unlimited

### Free Trial (14 days)
- **Features:** Core functionality + biometric authentication + analytics + priority support
- **Limitations:** No cloud database, no auto-sync, single device
- **Max Devices:** 1
- **Cloud Storage:** None (local storage only)
- **Note:** No credit card required

## Desktop App Integration Points

### 1. Application Startup
```python
# Check subscription status on app launch
response = requests.post(API_BASE_URL + '/check-subscription', 
                        json={'accessToken': stored_access_token})

if response.json()['subscriptionStatus'] == 'expired':
    show_upgrade_dialog()
elif response.json()['subscriptionStatus'] == 'grace_period':
    show_grace_period_warning(response.json()['daysRemaining'])
```

### 2. Feature Access Control
```python
def check_feature_access(feature_name):
    if current_subscription['features'].get(feature_name, False):
        return True
    else:
        show_upgrade_dialog(f"This feature requires {feature_name}")
        return False

# Example usage
if check_feature_access('biometrics'):
    enable_biometric_auth()
```

### 3. Device Limitation
```python
def register_device():
    current_devices = len(subscription_data['devices'])
    max_devices = subscription_data['maxDevices']
    
    if current_devices >= max_devices:
        show_error(f"Maximum {max_devices} device(s) allowed for your plan")
        return False
    
    # Register current device
    return True
```

### 4. Cloud Storage Management
```python
def check_storage_limit(file_size):
    if subscription_data['cloudStorageLimit'] == -1:  # Unlimited
        return True
    
    current_usage = subscription_data['dataUsage']
    limit = subscription_data['cloudStorageLimit']
    
    if current_usage + file_size > limit:
        show_error("Cloud storage limit exceeded")
        return False
    
    return True
```

## Subscription Lifecycle

### Trial Period (14 days)
1. User starts free trial
2. Biometric authentication + analytics + priority support enabled
3. No cloud database or auto-sync features
4. Daily status checks
5. Expiry warnings at 3, 1 days remaining

### Grace Period (10 days after expiry)
1. All features disabled
2. Data remains intact
3. Upgrade prompts shown
4. Daily countdown warnings

### Data Deletion (After grace period)
1. User data marked for deletion
2. Cleanup service removes all data
3. Access completely revoked

## Error Handling

### Common Error Responses
```json
{
  "error": "Invalid access token",
  "status": "invalid_token"
}

{
  "error": "Subscription expired",
  "status": "expired",
  "gracePeriodEnds": "2025-01-25T00:00:00.000Z"
}

{
  "error": "User already has an active trial or subscription",
  "status": "already_subscribed"
}
```

### Desktop App Error Handling
```python
def handle_api_error(response):
    if response.status_code == 401:
        if response.json().get('status') == 'invalid_token':
            logout_user()
            show_login_screen()
    elif response.status_code == 400:
        error_msg = response.json().get('error', 'Unknown error')
        show_error_dialog(error_msg)
```

## Security Considerations

1. **Access Token Storage:** Store tokens securely in encrypted local storage
2. **API Calls:** Always use HTTPS
3. **Token Validation:** Validate tokens on every critical operation
4. **Rate Limiting:** Implement client-side rate limiting for API calls
5. **Error Logging:** Log authentication failures for security monitoring

## Monitoring & Analytics

### Key Metrics to Track
- Subscription status checks per day
- Feature usage by plan type
- Trial conversion rates
- Grace period recovery rates
- Device registration patterns

### Recommended Logging
```python
logger.info(f"Subscription check: {user_id}, status: {status}, days_remaining: {days}")
logger.warning(f"Feature access denied: {user_id}, feature: {feature_name}")
logger.error(f"API error: {user_id}, endpoint: {endpoint}, error: {error}")
```

## Testing

### Test Scenarios
1. Fresh trial activation
2. Subscription expiry handling
3. Grace period behavior
4. Device limit enforcement
5. Feature access control
6. Network failure handling

### Mock API Responses
Use provided test endpoints with different subscription states for comprehensive testing.

---

This integration ensures seamless subscription management between your web platform and desktop application while maintaining security and user experience.
