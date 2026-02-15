# ⚠️ IMPORTANT: Please configure these values for the Support System to work

# 1. Brevo API Configuration
# Sign up at https://www.brevo.com (free tier: 300 emails/day)
# Get your API key from: https://app.brevo.com/settings/keys/api
BREVO_API_KEY=

# 2. Admin Configuration
# Email address(es) where you want to receive support ticket notifications
# You can specify multiple emails separated by commas: email1@domain.com,email2@domain.com
ADMIN_EMAILS=

# 3. Admin API Security
# Generate a random secure token for admin API authentication
# You can use: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
ADMIN_SECRET_TOKEN=

# Note: Add these to your .env.local file (not committed to git)
