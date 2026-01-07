/**
 * Input validation utilities for API routes
 * Prevents invalid data from reaching business logic
 */

export interface ValidationError {
  field: string;
  message: string;
}

export class ValidationResult {
  errors: ValidationError[] = [];

  isValid(): boolean {
    return this.errors.length === 0;
  }

  addError(field: string, message: string): void {
    this.errors.push({ field, message });
  }

  getFirstError(): ValidationError | null {
    return this.errors[0] || null;
  }
}

/**
 * Validate required fields
 */
export function validateRequired(
  data: any,
  fields: string[]
): ValidationResult {
  const result = new ValidationResult();

  for (const field of fields) {
    const value = data[field];
    if (value === undefined || value === null || value === '') {
      result.addError(field, `${field} is required`);
    }
  }

  return result;
}

/**
 * Validate email format
 */
export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate object fields with specific validators
 */
export function validateObject(
  data: any,
  schema: Record<string, (value: any) => boolean | string>
): ValidationResult {
  const result = new ValidationResult();

  for (const [field, validator] of Object.entries(schema)) {
    const value = data[field];
    const validationResult = validator(value);

    if (validationResult !== true) {
      const message =
        typeof validationResult === 'string' ? validationResult : `Invalid ${field}`;
      result.addError(field, message);
    }
  }

  return result;
}

/**
 * Sanitize string input (basic XSS prevention)
 */
export function sanitizeString(input: string): string {
  if (typeof input !== 'string') {
    return '';
  }

  return input
    .replace(/[<>]/g, '') // Remove angle brackets
    .trim()
    .substring(0, 1000); // Limit length
}

/**
 * Validate plan names
 */
export function validatePlan(plan: string): boolean {
  const validPlans = ['Basic', 'Pro', 'Enterprise'];
  return validPlans.includes(plan);
}

/**
 * Validate billing period
 */
export function validateBillingPeriod(period: string): boolean {
  return ['monthly', 'annually'].includes(period);
}

/**
 * Validate amount (positive number)
 */
export function validateAmount(amount: any): boolean {
  return typeof amount === 'number' && amount > 0;
}

/**
 * Validate userId (should be non-empty string)
 */
export function validateUserId(userId: any): boolean {
  return typeof userId === 'string' && userId.trim().length > 0;
}

/**
 * Validate payment response from Razorpay
 */
export function validatePaymentResponse(data: any): ValidationResult {
  const result = new ValidationResult();

  const requiredFields = [
    'razorpay_payment_id',
    'razorpay_order_id',
    'userId',
    'username',
    'plan',
  ];

  for (const field of requiredFields) {
    if (!data[field]) {
      result.addError(field, `${field} is required`);
    }
  }

  // Validate plan
  if (data.plan && !validatePlan(data.plan)) {
    result.addError('plan', 'Invalid plan');
  }

  // Validate billing period if provided
  if (data.billingPeriod && !validateBillingPeriod(data.billingPeriod)) {
    result.addError('billingPeriod', 'Invalid billing period');
  }

  return result;
}

/**
 * Validate order creation request
 */
export function validateOrderRequest(data: any): ValidationResult {
  const result = new ValidationResult();

  if (!data.plan) {
    result.addError('plan', 'Plan is required');
  } else if (!validatePlan(data.plan)) {
    result.addError('plan', 'Invalid plan');
  }

  if (data.billingPeriod && !validateBillingPeriod(data.billingPeriod)) {
    result.addError('billingPeriod', 'Invalid billing period');
  }

  if (data.amount && !validateAmount(data.amount)) {
    result.addError('amount', 'Amount must be a positive number');
  }

  return result;
}

/**
 * Validate cancellation request
 */
export function validateCancellationRequest(data: any): ValidationResult {
  const result = new ValidationResult();

  // Reason is optional but if provided must be a string
  if (data.reason && typeof data.reason !== 'string') {
    result.addError('reason', 'Reason must be a string');
  }

  return result;
}

/**
 * Validate upgrade plan request
 */
export function validateUpgradeRequest(data: any): ValidationResult {
  const result = new ValidationResult();

  if (!data.newPlan) {
    result.addError('newPlan', 'New plan is required');
  } else if (!validatePlan(data.newPlan)) {
    result.addError('newPlan', 'Invalid plan selected');
  }

  if (data.billingPeriod && !validateBillingPeriod(data.billingPeriod)) {
    result.addError('billingPeriod', 'Invalid billing period');
  }

  return result;
}
