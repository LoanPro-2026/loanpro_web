import Razorpay from 'razorpay';

export interface RazorpayClientResult {
  client: Razorpay | null;
  keyId: string;
  isTestMode: boolean;
  error?: string;
}

export function getRazorpayClient(): RazorpayClientResult {
  const keyId = (process.env.RAZORPAY_KEY_ID || '').trim();
  const keySecret = (process.env.RAZORPAY_KEY_SECRET || '').trim();
  const isTestMode = keyId.includes('test');

  if (!keyId || !keySecret) {
    return {
      client: null,
      keyId,
      isTestMode,
      error: 'Razorpay key configuration is missing',
    };
  }

  try {
    return {
      client: new Razorpay({
        key_id: keyId,
        key_secret: keySecret,
      }),
      keyId,
      isTestMode,
    };
  } catch {
    return {
      client: null,
      keyId,
      isTestMode,
      error: 'Failed to initialize Razorpay client',
    };
  }
}
