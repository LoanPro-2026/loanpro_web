const SibApiV3Sdk = require('@getbrevo/brevo');

interface TicketData {
  ticketId: string;
  userName: string;
  userEmail: string;
  subject: string;
  description: string;
  issueType: string;
  priority: string;
  appVersion: string;
}

interface TicketUpdateData {
  ticketId: string;
  userName: string;
  userEmail: string;
  subject: string;
  status: string;
  message: string;
  issueType?: string;
}

interface PaymentIncidentAlertData {
  incidentType: string;
  severity: string;
  message: string;
  orderId: string;
  paymentId?: string;
  userId?: string;
  plan?: string;
  billingPeriod?: string;
  paymentContext?: string;
  ageMinutes?: number;
  source?: string;
}

interface SubscriptionEmailData {
  userName: string;
  userEmail: string;
  plan: string;
  billingPeriod: 'monthly' | 'annually';
  amount: number;
  orderId?: string;
  paymentId?: string;
  receiptUrl?: string;
  startDate?: Date;
  endDate?: Date;
}

interface CancellationEmailData {
  userName: string;
  userEmail: string;
  plan: string;
  billingPeriod: 'monthly' | 'annually';
  cancellationId: string;
  refundAmount: number;
  refundStatus: string;
  requestedAt: Date;
  endDate?: Date;
}

interface RefundProcessedEmailData {
  userName: string;
  userEmail: string;
  cancellationId: string;
  refundAmount: number;
  refundPaymentId?: string;
  processedAt: Date;
}

interface TrialCancellationEmailData {
  userName: string;
  userEmail: string;
  cancelledAt: Date;
}

interface DeviceEmailData {
  userName: string;
  userEmail: string;
  deviceName: string;
  deviceId: string;
  organizationName?: string;
  reason?: string;
  requestedAt?: Date;
}

interface ContactLeadEmailData {
  requestId: string;
  name: string;
  email: string;
  phone: string;
  organization: string;
  inquiryType: string;
  message: string;
  preferredCallbackTime?: string;
  timezone?: string;
  createdAt: Date;
}

class EmailService {
  private apiInstance: any;
  private isConfigured: boolean = false;

  constructor() {
    this.initialize();
  }

  private initialize() {
    if (!process.env.BREVO_API_KEY) {
      console.warn('⚠️ BREVO_API_KEY not configured. Email notifications will be skipped.');
      return;
    }

    try {
      this.apiInstance = new SibApiV3Sdk.TransactionalEmailsApi();
      this.apiInstance.setApiKey(
        SibApiV3Sdk.TransactionalEmailsApiApiKeys.apiKey,
        process.env.BREVO_API_KEY
      );
      this.isConfigured = true;
      console.log('✅ Brevo email service initialized');
    } catch (error) {
      console.error('❌ Failed to initialize Brevo:', error);
    }
  }

  private formatCurrency(amount: number) {
    return `INR ${amount.toLocaleString('en-IN')}`;
  }

  private formatDate(date?: Date) {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: '2-digit'
    });
  }

  private getSupportMailbox(issueType?: string) {
    const normalized = String(issueType || '').trim().toLowerCase();
    if (normalized === 'bug') {
      return {
        email: 'help@loanpro.tech',
        label: 'Help',
        senderName: 'LoanPro Help Desk'
      };
    }

    return {
      email: 'support@loanpro.tech',
      label: 'Support',
      senderName: 'LoanPro Support'
    };
  }

  /**
    * Send the initial ticket email to the support/help mailbox
   */
  async sendNewTicketNotificationToAdmin(ticket: TicketData): Promise<boolean> {
    if (!this.isConfigured) {
      console.log('Email service not configured, skipping admin notification');
      return false;
    }

    try {
      const mailbox = this.getSupportMailbox(ticket.issueType);
      const priorityEmoji = {
        low: '🟢',
        medium: '🟡',
        high: '🟠',
        urgent: '🔴'
      }[ticket.priority] || '⚪';

      const issueTypeLabel = {
        bug: '🐛 Bug Report',
        feature: '✨ Feature Request',
        question: '❓ Question',
        billing: '💳 Billing',
        other: '📝 Other'
      }[ticket.issueType] || ticket.issueType;

      const htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center;">
            <h1 style="color: white; margin: 0;">🎫 New Support Ticket</h1>
          </div>
          
          <div style="background: #f8f9fa; padding: 30px; border: 1px solid #e9ecef;">
            <h2 style="color: #333; margin-top: 0;">Ticket Details</h2>
            
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
              <tr>
                <td style="padding: 10px; background: white; border: 1px solid #dee2e6; font-weight: bold; width: 150px;">Ticket ID</td>
                <td style="padding: 10px; background: white; border: 1px solid #dee2e6;">${ticket.ticketId}</td>
              </tr>
              <tr>
                <td style="padding: 10px; background: white; border: 1px solid #dee2e6; font-weight: bold;">Priority</td>
                <td style="padding: 10px; background: white; border: 1px solid #dee2e6;">${priorityEmoji} ${ticket.priority.toUpperCase()}</td>
              </tr>
              <tr>
                <td style="padding: 10px; background: white; border: 1px solid #dee2e6; font-weight: bold;">Issue Type</td>
                <td style="padding: 10px; background: white; border: 1px solid #dee2e6;">${issueTypeLabel}</td>
              </tr>
              <tr>
                <td style="padding: 10px; background: white; border: 1px solid #dee2e6; font-weight: bold;">User</td>
                <td style="padding: 10px; background: white; border: 1px solid #dee2e6;">${ticket.userName} (${ticket.userEmail})</td>
              </tr>
              <tr>
                <td style="padding: 10px; background: white; border: 1px solid #dee2e6; font-weight: bold;">App Version</td>
                <td style="padding: 10px; background: white; border: 1px solid #dee2e6;">${ticket.appVersion}</td>
              </tr>
            </table>
            
            <h3 style="color: #333; margin-top: 30px;">Subject</h3>
            <p style="background: white; padding: 15px; border-left: 4px solid #667eea; margin: 10px 0;">${ticket.subject}</p>
            
            <h3 style="color: #333; margin-top: 30px;">Description</h3>
            <div style="background: white; padding: 15px; border: 1px solid #dee2e6; white-space: pre-wrap;">${ticket.description}</div>
            
            <div style="margin-top: 30px; text-align: center;">
              <a href="https://www.loanpro.tech/admin/support/${ticket.ticketId}" 
                 style="display: inline-block; padding: 12px 30px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; font-weight: bold;">
                View & Respond
              </a>
            </div>
          </div>
          
          <div style="background: #e9ecef; padding: 20px; text-align: center; font-size: 12px; color: #6c757d;">
            LoanPro Support System • <a href="https://www.loanpro.tech" style="color: #667eea;">www.loanpro.tech</a>
          </div>
        </div>
      `;

      const sendSmtpEmail = {
        sender: { email: mailbox.email, name: `${mailbox.senderName} System` },
        to: [{ email: mailbox.email }],
        replyTo: { email: ticket.userEmail, name: ticket.userName },
        subject: `🎫 New ${mailbox.label} Ticket: ${ticket.ticketId} - ${ticket.subject}`,
        htmlContent
      };

      await this.apiInstance.sendTransacEmail(sendSmtpEmail);
      console.log(`✅ Admin notification sent for ticket ${ticket.ticketId}`);
      return true;
    } catch (error) {
      console.error('❌ Failed to send admin notification:', error);
      return false;
    }
  }

  /**
    * Send the user confirmation for the support/help ticket
   */
  async sendTicketConfirmationToUser(ticket: TicketData): Promise<boolean> {
    if (!this.isConfigured) {
      console.log('Email service not configured, skipping user confirmation');
      return false;
    }

    try {
      const mailbox = this.getSupportMailbox(ticket.issueType);
      const htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center;">
            <h1 style="color: white; margin: 0;">✅ Ticket Received</h1>
          </div>
          
          <div style="background: #f8f9fa; padding: 30px; border: 1px solid #e9ecef;">
            <p style="font-size: 16px; color: #333;">Hi <strong>${ticket.userName}</strong>,</p>
            
            <p style="font-size: 16px; color: #333;">Thank you for contacting LoanPro support. We've received your support request and our team will respond shortly.</p>
            
            <div style="background: white; padding: 20px; border-left: 4px solid #667eea; margin: 20px 0;">
              <p style="margin: 0; font-size: 14px; color: #6c757d;">Your Ticket ID</p>
              <p style="margin: 5px 0 0 0; font-size: 24px; color: #667eea; font-weight: bold;">${ticket.ticketId}</p>
            </div>
            
            <h3 style="color: #333; margin-top: 30px;">Your Request</h3>
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
              <tr>
                <td style="padding: 10px; background: white; border: 1px solid #dee2e6; font-weight: bold; width: 120px;">Subject</td>
                <td style="padding: 10px; background: white; border: 1px solid #dee2e6;">${ticket.subject}</td>
              </tr>
              <tr>
                <td style="padding: 10px; background: white; border: 1px solid #dee2e6; font-weight: bold;">Issue Type</td>
                <td style="padding: 10px; background: white; border: 1px solid #dee2e6;">${ticket.issueType}</td>
              </tr>
              <tr>
                <td style="padding: 10px; background: white; border: 1px solid #dee2e6; font-weight: bold;">Priority</td>
                <td style="padding: 10px; background: white; border: 1px solid #dee2e6;">${ticket.priority}</td>
              </tr>
            </table>
            
            <div style="background: #e7f3ff; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <p style="margin: 0; color: #0066cc; font-size: 14px;"><strong>⏱️ Expected Response Time:</strong></p>
              <p style="margin: 5px 0 0 0; color: #333;">We typically respond within 24-48 hours during business days.</p>
            </div>
            
            <p style="font-size: 14px; color: #6c757d; margin-top: 30px;">
              Please save your ticket ID for future reference. You can check your ticket status anytime from within your LoanPro application.
            </p>
          </div>
          
          <div style="background: #e9ecef; padding: 20px; text-align: center; font-size: 12px; color: #6c757d;">
            <p style="margin: 0 0 10px 0;">Need immediate assistance? Reply to this email.</p>
            LoanPro Support • <a href="https://www.loanpro.tech" style="color: #667eea;">www.loanpro.tech</a>
          </div>
        </div>
      `;

      const sendSmtpEmail = {
        sender: { email: mailbox.email, name: mailbox.senderName },
        to: [{ email: ticket.userEmail, name: ticket.userName }],
        subject: `Ticket ${ticket.ticketId} - We've received your ${mailbox.label.toLowerCase()} request`,
        htmlContent
      };

      await this.apiInstance.sendTransacEmail(sendSmtpEmail);
      console.log(`✅ Confirmation email sent to ${ticket.userEmail}`);
      return true;
    } catch (error) {
      console.error('❌ Failed to send user confirmation:', error);
      return false;
    }
  }

  /**
    * Send the user update email when admin responds or changes status
   */
  async sendTicketUpdateToUser(data: TicketUpdateData): Promise<boolean> {
    if (!this.isConfigured) {
      console.log('Email service not configured, skipping update notification');
      return false;
    }

    try {
      const mailbox = this.getSupportMailbox(data.issueType);
      const statusBadge = {
        open: '<span style="background: #28a745; color: white; padding: 5px 10px; border-radius: 3px;">Open</span>',
        'in-progress': '<span style="background: #ffc107; color: black; padding: 5px 10px; border-radius: 3px;">In Progress</span>',
        resolved: '<span style="background: #17a2b8; color: white; padding: 5px 10px; border-radius: 3px;">Resolved</span>',
        closed: '<span style="background: #6c757d; color: white; padding: 5px 10px; border-radius: 3px;">Closed</span>'
      }[data.status] || data.status;

      const htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center;">
            <h1 style="color: white; margin: 0;">📬 Support Ticket Update</h1>
          </div>
          
          <div style="background: #f8f9fa; padding: 30px; border: 1px solid #e9ecef;">
            <p style="font-size: 16px; color: #333;">Hi <strong>${data.userName}</strong>,</p>
            
            <p style="font-size: 16px; color: #333;">There's an update on your support ticket <strong>${data.ticketId}</strong>.</p>
            
            <div style="background: white; padding: 20px; border: 1px solid #dee2e6; margin: 20px 0;">
              <p style="margin: 0; font-size: 14px; color: #6c757d;">Subject</p>
              <p style="margin: 5px 0; font-size: 18px; color: #333; font-weight: bold;">${data.subject}</p>
              <p style="margin: 10px 0 0 0; font-size: 14px;">Status: ${statusBadge}</p>
            </div>
            
            <h3 style="color: #333; margin-top: 30px;">Response from Support Team</h3>
            <div style="background: white; padding: 20px; border-left: 4px solid #667eea; white-space: pre-wrap;">${data.message}</div>
            
            <p style="font-size: 14px; color: #6c757d; margin-top: 30px;">
              You can view the full conversation and reply to this ticket from within your LoanPro application.
            </p>
          </div>
          
          <div style="background: #e9ecef; padding: 20px; text-align: center; font-size: 12px; color: #6c757d;">
            <p style="margin: 0 0 10px 0;">Reply to this email to add to the conversation.</p>
            LoanPro Support • <a href="https://www.loanpro.tech" style="color: #667eea;">www.loanpro.tech</a>
          </div>
        </div>
      `;

      const sendSmtpEmail = {
        sender: { email: mailbox.email, name: mailbox.senderName },
        to: [{ email: data.userEmail, name: data.userName }],
        replyTo: { email: mailbox.email },
        subject: `Ticket ${data.ticketId} - Update on your ${mailbox.label.toLowerCase()} request`,
        htmlContent
      };

      await this.apiInstance.sendTransacEmail(sendSmtpEmail);
      console.log(`✅ Update email sent to ${data.userEmail}`);
      return true;
    } catch (error) {
      console.error('❌ Failed to send update notification:', error);
      return false;
    }
  }

  async sendNewContactLeadNotificationToAdmin(data: ContactLeadEmailData): Promise<boolean> {
    if (!this.isConfigured) {
      console.log('Email service not configured, skipping contact lead admin notification');
      return false;
    }

    try {
      const inquiryTypeLabel = {
        sales: 'Sales',
        'demo-request': 'Demo Request',
        pricing: 'Pricing',
        'application-setup': 'Application Setup',
        partnership: 'Partnership',
        other: 'Other'
      }[data.inquiryType] || data.inquiryType;

      const htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 700px; margin: 0 auto;">
          <div style="background: #0f172a; padding: 24px; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 22px;">📞 New Contact Lead</h1>
          </div>

          <div style="background: #f8fafc; padding: 24px; border: 1px solid #e2e8f0;">
            <p style="font-size: 14px; color: #334155; margin-top: 0;">A new website contact request has been submitted and needs callback follow-up.</p>

            <table style="width: 100%; border-collapse: collapse; font-size: 14px; margin-top: 12px;">
              <tr>
                <td style="padding: 10px; background: #fff; border: 1px solid #e2e8f0; font-weight: 600; width: 180px;">Reference ID</td>
                <td style="padding: 10px; background: #fff; border: 1px solid #e2e8f0;">${data.requestId}</td>
              </tr>
              <tr>
                <td style="padding: 10px; background: #fff; border: 1px solid #e2e8f0; font-weight: 600;">Name</td>
                <td style="padding: 10px; background: #fff; border: 1px solid #e2e8f0;">${data.name}</td>
              </tr>
              <tr>
                <td style="padding: 10px; background: #fff; border: 1px solid #e2e8f0; font-weight: 600;">Email</td>
                <td style="padding: 10px; background: #fff; border: 1px solid #e2e8f0;">${data.email}</td>
              </tr>
              <tr>
                <td style="padding: 10px; background: #fff; border: 1px solid #e2e8f0; font-weight: 600;">Phone</td>
                <td style="padding: 10px; background: #fff; border: 1px solid #e2e8f0;">${data.phone}</td>
              </tr>
              <tr>
                <td style="padding: 10px; background: #fff; border: 1px solid #e2e8f0; font-weight: 600;">Organization</td>
                <td style="padding: 10px; background: #fff; border: 1px solid #e2e8f0;">${data.organization}</td>
              </tr>
              <tr>
                <td style="padding: 10px; background: #fff; border: 1px solid #e2e8f0; font-weight: 600;">Inquiry Type</td>
                <td style="padding: 10px; background: #fff; border: 1px solid #e2e8f0;">${inquiryTypeLabel}</td>
              </tr>
              <tr>
                <td style="padding: 10px; background: #fff; border: 1px solid #e2e8f0; font-weight: 600;">Preferred Callback</td>
                <td style="padding: 10px; background: #fff; border: 1px solid #e2e8f0;">${data.preferredCallbackTime || 'Not provided'}</td>
              </tr>
              <tr>
                <td style="padding: 10px; background: #fff; border: 1px solid #e2e8f0; font-weight: 600;">Timezone</td>
                <td style="padding: 10px; background: #fff; border: 1px solid #e2e8f0;">${data.timezone || 'Not provided'}</td>
              </tr>
            </table>

            <h3 style="font-size: 16px; color: #111827; margin-top: 20px; margin-bottom: 10px;">Message</h3>
            <div style="background: #fff; border: 1px solid #e2e8f0; padding: 12px; white-space: pre-wrap; color: #334155; font-size: 14px;">${data.message}</div>

            <div style="margin-top: 20px; text-align: center;">
              <a href="https://www.loanpro.tech/admin" style="display: inline-block; padding: 10px 18px; background: #2563eb; color: #fff; text-decoration: none; border-radius: 6px; font-weight: 600;">Open Admin Panel</a>
            </div>
          </div>
        </div>
      `;

      const recipients = (process.env.ADMIN_EMAILS || process.env.ADMIN_EMAIL || 'admin@loanpro.tech')
        .split(',')
        .map((email: string) => email.trim())
        .filter(Boolean)
        .map((email: string) => ({ email }));

      const sendSmtpEmail = {
        sender: { email: 'noreply@loanpro.tech', name: 'LoanPro' },
        to: recipients,
        subject: `📞 New Contact Lead: ${data.requestId} (${inquiryTypeLabel})`,
        htmlContent
      };

      await this.apiInstance.sendTransacEmail(sendSmtpEmail);
      console.log(`✅ Contact lead admin notification sent for ${data.requestId}`);
      return true;
    } catch (error) {
      console.error('❌ Failed to send contact lead admin notification:', error);
      return false;
    }
  }

  async sendContactLeadAcknowledgementToUser(data: ContactLeadEmailData): Promise<boolean> {
    if (!this.isConfigured) {
      console.log('Email service not configured, skipping contact lead acknowledgement');
      return false;
    }

    try {
      const inquiryTypeLabel = {
        sales: 'Sales',
        'demo-request': 'Demo Request',
        pricing: 'Pricing',
        'application-setup': 'Application Setup',
        partnership: 'Partnership',
        other: 'Other'
      }[data.inquiryType] || data.inquiryType;

      const htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: #0f172a; padding: 24px; text-align: center;">
            <h1 style="color: #fff; margin: 0; font-size: 22px;">✅ Request Received</h1>
          </div>

          <div style="background: #f8fafc; border: 1px solid #e2e8f0; padding: 24px;">
            <p style="font-size: 16px; color: #111827;">Hi <strong>${data.name}</strong>,</p>
            <p style="font-size: 14px; color: #334155;">Thank you for contacting LoanPro. Our team will call you within 24 business hours to discuss your request.</p>

            <div style="background: #fff; border-left: 4px solid #2563eb; padding: 14px; margin: 18px 0;">
              <p style="margin: 0; font-size: 12px; color: #64748b;">Reference ID</p>
              <p style="margin: 4px 0 0 0; font-size: 20px; font-weight: 700; color: #1d4ed8;">${data.requestId}</p>
            </div>

            <table style="width: 100%; border-collapse: collapse; font-size: 14px; margin-top: 10px;">
              <tr>
                <td style="padding: 10px; background: #fff; border: 1px solid #e2e8f0; font-weight: 600; width: 160px;">Inquiry Type</td>
                <td style="padding: 10px; background: #fff; border: 1px solid #e2e8f0;">${inquiryTypeLabel}</td>
              </tr>
              <tr>
                <td style="padding: 10px; background: #fff; border: 1px solid #e2e8f0; font-weight: 600;">Phone</td>
                <td style="padding: 10px; background: #fff; border: 1px solid #e2e8f0;">${data.phone}</td>
              </tr>
              <tr>
                <td style="padding: 10px; background: #fff; border: 1px solid #e2e8f0; font-weight: 600;">Preferred Callback</td>
                <td style="padding: 10px; background: #fff; border: 1px solid #e2e8f0;">${data.preferredCallbackTime || 'Not specified'}</td>
              </tr>
            </table>

            <p style="margin-top: 18px; font-size: 13px; color: #64748b;">Please keep your reference ID for future follow-up.</p>
          </div>
        </div>
      `;

      const sendSmtpEmail = {
        sender: { email: 'noreply@loanpro.tech', name: 'LoanPro' },
        to: [{ email: data.email, name: data.name }],
        subject: `We received your request (${data.requestId})`,
        htmlContent
      };

      await this.apiInstance.sendTransacEmail(sendSmtpEmail);
      console.log(`✅ Contact lead acknowledgement sent to ${data.email}`);
      return true;
    } catch (error) {
      console.error('❌ Failed to send contact lead acknowledgement:', error);
      return false;
    }
  }

  async sendSubscriptionPurchaseEmail(data: SubscriptionEmailData): Promise<boolean> {
    if (!this.isConfigured) {
      console.log('Email service not configured, skipping purchase email');
      return false;
    }

    try {
      const htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: #0f172a; padding: 24px; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 22px;">Subscription Activated</h1>
          </div>
          <div style="background: #f8fafc; padding: 24px; border: 1px solid #e2e8f0;">
            <p style="font-size: 16px; color: #111827;">Hi <strong>${data.userName}</strong>,</p>
            <p style="font-size: 14px; color: #334155;">Your LoanPro subscription is now active.</p>

            <table style="width: 100%; border-collapse: collapse; margin: 16px 0; font-size: 14px;">
              <tr>
                <td style="padding: 10px; background: #fff; border: 1px solid #e2e8f0; font-weight: 600; width: 160px;">Plan</td>
                <td style="padding: 10px; background: #fff; border: 1px solid #e2e8f0;">${data.plan}</td>
              </tr>
              <tr>
                <td style="padding: 10px; background: #fff; border: 1px solid #e2e8f0; font-weight: 600;">Billing</td>
                <td style="padding: 10px; background: #fff; border: 1px solid #e2e8f0;">${data.billingPeriod}</td>
              </tr>
              <tr>
                <td style="padding: 10px; background: #fff; border: 1px solid #e2e8f0; font-weight: 600;">Amount</td>
                <td style="padding: 10px; background: #fff; border: 1px solid #e2e8f0;">${this.formatCurrency(data.amount)}</td>
              </tr>
              <tr>
                <td style="padding: 10px; background: #fff; border: 1px solid #e2e8f0; font-weight: 600;">Active Until</td>
                <td style="padding: 10px; background: #fff; border: 1px solid #e2e8f0;">${this.formatDate(data.endDate)}</td>
              </tr>
            </table>

            <p style="font-size: 13px; color: #475569;">Order ID: ${data.orderId || 'N/A'} | Payment ID: ${data.paymentId || 'N/A'}</p>

            ${data.receiptUrl ? `<p style="margin-top: 16px;"><a href="${data.receiptUrl}" style="color: #2563eb;">View receipt</a></p>` : ''}
          </div>
        </div>
      `;

      const sendSmtpEmail = {
        sender: { email: 'noreply@loanpro.tech', name: 'LoanPro' },
        to: [{ email: data.userEmail, name: data.userName }],
        subject: 'Your LoanPro subscription is active',
        htmlContent
      };

      await this.apiInstance.sendTransacEmail(sendSmtpEmail);
      console.log(`✅ Subscription purchase email sent to ${data.userEmail}`);
      return true;
    } catch (error) {
      console.error('❌ Failed to send purchase email:', error);
      return false;
    }
  }

  async sendSubscriptionRenewalEmail(data: SubscriptionEmailData): Promise<boolean> {
    if (!this.isConfigured) {
      console.log('Email service not configured, skipping renewal email');
      return false;
    }

    try {
      const htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: #0f172a; padding: 24px; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 22px;">Subscription Renewed</h1>
          </div>
          <div style="background: #f8fafc; padding: 24px; border: 1px solid #e2e8f0;">
            <p style="font-size: 16px; color: #111827;">Hi <strong>${data.userName}</strong>,</p>
            <p style="font-size: 14px; color: #334155;">Your subscription has been renewed successfully.</p>

            <table style="width: 100%; border-collapse: collapse; margin: 16px 0; font-size: 14px;">
              <tr>
                <td style="padding: 10px; background: #fff; border: 1px solid #e2e8f0; font-weight: 600; width: 160px;">Plan</td>
                <td style="padding: 10px; background: #fff; border: 1px solid #e2e8f0;">${data.plan}</td>
              </tr>
              <tr>
                <td style="padding: 10px; background: #fff; border: 1px solid #e2e8f0; font-weight: 600;">Billing</td>
                <td style="padding: 10px; background: #fff; border: 1px solid #e2e8f0;">${data.billingPeriod}</td>
              </tr>
              <tr>
                <td style="padding: 10px; background: #fff; border: 1px solid #e2e8f0; font-weight: 600;">Amount</td>
                <td style="padding: 10px; background: #fff; border: 1px solid #e2e8f0;">${this.formatCurrency(data.amount)}</td>
              </tr>
              <tr>
                <td style="padding: 10px; background: #fff; border: 1px solid #e2e8f0; font-weight: 600;">Next Renewal</td>
                <td style="padding: 10px; background: #fff; border: 1px solid #e2e8f0;">${this.formatDate(data.endDate)}</td>
              </tr>
            </table>

            <p style="font-size: 13px; color: #475569;">Order ID: ${data.orderId || 'N/A'} | Payment ID: ${data.paymentId || 'N/A'}</p>
          </div>
        </div>
      `;

      const sendSmtpEmail = {
        sender: { email: 'noreply@loanpro.tech', name: 'LoanPro' },
        to: [{ email: data.userEmail, name: data.userName }],
        subject: 'Your LoanPro subscription is renewed',
        htmlContent
      };

      await this.apiInstance.sendTransacEmail(sendSmtpEmail);
      console.log(`✅ Subscription renewal email sent to ${data.userEmail}`);
      return true;
    } catch (error) {
      console.error('❌ Failed to send renewal email:', error);
      return false;
    }
  }

  async sendSubscriptionUpgradeEmail(data: SubscriptionEmailData): Promise<boolean> {
    if (!this.isConfigured) {
      console.log('Email service not configured, skipping upgrade email');
      return false;
    }

    try {
      const htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: #0f172a; padding: 24px; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 22px;">Plan Upgraded</h1>
          </div>
          <div style="background: #f8fafc; padding: 24px; border: 1px solid #e2e8f0;">
            <p style="font-size: 16px; color: #111827;">Hi <strong>${data.userName}</strong>,</p>
            <p style="font-size: 14px; color: #334155;">Your plan has been upgraded successfully.</p>

            <table style="width: 100%; border-collapse: collapse; margin: 16px 0; font-size: 14px;">
              <tr>
                <td style="padding: 10px; background: #fff; border: 1px solid #e2e8f0; font-weight: 600; width: 160px;">Plan</td>
                <td style="padding: 10px; background: #fff; border: 1px solid #e2e8f0;">${data.plan}</td>
              </tr>
              <tr>
                <td style="padding: 10px; background: #fff; border: 1px solid #e2e8f0; font-weight: 600;">Billing</td>
                <td style="padding: 10px; background: #fff; border: 1px solid #e2e8f0;">${data.billingPeriod}</td>
              </tr>
              <tr>
                <td style="padding: 10px; background: #fff; border: 1px solid #e2e8f0; font-weight: 600;">Amount</td>
                <td style="padding: 10px; background: #fff; border: 1px solid #e2e8f0;">${this.formatCurrency(data.amount)}</td>
              </tr>
              <tr>
                <td style="padding: 10px; background: #fff; border: 1px solid #e2e8f0; font-weight: 600;">Active Until</td>
                <td style="padding: 10px; background: #fff; border: 1px solid #e2e8f0;">${this.formatDate(data.endDate)}</td>
              </tr>
            </table>

            <p style="font-size: 13px; color: #475569;">Order ID: ${data.orderId || 'N/A'} | Payment ID: ${data.paymentId || 'N/A'}</p>
          </div>
        </div>
      `;

      const sendSmtpEmail = {
        sender: { email: 'noreply@loanpro.tech', name: 'LoanPro' },
        to: [{ email: data.userEmail, name: data.userName }],
        subject: 'Your LoanPro plan was upgraded',
        htmlContent
      };

      await this.apiInstance.sendTransacEmail(sendSmtpEmail);
      console.log(`✅ Subscription upgrade email sent to ${data.userEmail}`);
      return true;
    } catch (error) {
      console.error('❌ Failed to send upgrade email:', error);
      return false;
    }
  }

  async sendSubscriptionCancellationEmail(data: CancellationEmailData): Promise<boolean> {
    if (!this.isConfigured) {
      console.log('Email service not configured, skipping cancellation email');
      return false;
    }

    try {
      const htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: #0f172a; padding: 24px; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 22px;">Subscription Cancelled</h1>
          </div>
          <div style="background: #f8fafc; padding: 24px; border: 1px solid #e2e8f0;">
            <p style="font-size: 16px; color: #111827;">Hi <strong>${data.userName}</strong>,</p>
            <p style="font-size: 14px; color: #334155;">Your subscription has been cancelled. Our team will review your refund request if applicable.</p>

            <table style="width: 100%; border-collapse: collapse; margin: 16px 0; font-size: 14px;">
              <tr>
                <td style="padding: 10px; background: #fff; border: 1px solid #e2e8f0; font-weight: 600; width: 160px;">Plan</td>
                <td style="padding: 10px; background: #fff; border: 1px solid #e2e8f0;">${data.plan}</td>
              </tr>
              <tr>
                <td style="padding: 10px; background: #fff; border: 1px solid #e2e8f0; font-weight: 600;">Billing</td>
                <td style="padding: 10px; background: #fff; border: 1px solid #e2e8f0;">${data.billingPeriod}</td>
              </tr>
              <tr>
                <td style="padding: 10px; background: #fff; border: 1px solid #e2e8f0; font-weight: 600;">Cancellation ID</td>
                <td style="padding: 10px; background: #fff; border: 1px solid #e2e8f0;">${data.cancellationId}</td>
              </tr>
              <tr>
                <td style="padding: 10px; background: #fff; border: 1px solid #e2e8f0; font-weight: 600;">Refund Status</td>
                <td style="padding: 10px; background: #fff; border: 1px solid #e2e8f0;">${data.refundStatus}</td>
              </tr>
              <tr>
                <td style="padding: 10px; background: #fff; border: 1px solid #e2e8f0; font-weight: 600;">Refund Amount</td>
                <td style="padding: 10px; background: #fff; border: 1px solid #e2e8f0;">${this.formatCurrency(data.refundAmount)}</td>
              </tr>
              <tr>
                <td style="padding: 10px; background: #fff; border: 1px solid #e2e8f0; font-weight: 600;">Active Until</td>
                <td style="padding: 10px; background: #fff; border: 1px solid #e2e8f0;">${this.formatDate(data.endDate)}</td>
              </tr>
            </table>

            <p style="font-size: 13px; color: #475569;">Requested on ${this.formatDate(data.requestedAt)}.</p>
          </div>
        </div>
      `;

      const sendSmtpEmail = {
        sender: { email: 'noreply@loanpro.tech', name: 'LoanPro' },
        to: [{ email: data.userEmail, name: data.userName }],
        subject: 'Your LoanPro subscription was cancelled',
        htmlContent
      };

      await this.apiInstance.sendTransacEmail(sendSmtpEmail);
      console.log(`✅ Subscription cancellation email sent to ${data.userEmail}`);
      return true;
    } catch (error) {
      const errorDetails = (error as any)?.response?.body || (error as any)?.response?.data || error;
      console.error('❌ Failed to send cancellation email:', errorDetails);
      return false;
    }
  }

  async sendRefundProcessedEmail(data: RefundProcessedEmailData): Promise<boolean> {
    if (!this.isConfigured) {
      console.log('Email service not configured, skipping refund processed email');
      return false;
    }

    try {
      const htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: #0f172a; padding: 24px; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 22px;">Refund Processed</h1>
          </div>
          <div style="background: #f8fafc; padding: 24px; border: 1px solid #e2e8f0;">
            <p style="font-size: 16px; color: #111827;">Hi <strong>${data.userName}</strong>,</p>
            <p style="font-size: 14px; color: #334155;">Your refund has been processed. Please allow 3-5 business days for the amount to reflect in your account.</p>

            <table style="width: 100%; border-collapse: collapse; margin: 16px 0; font-size: 14px;">
              <tr>
                <td style="padding: 10px; background: #fff; border: 1px solid #e2e8f0; font-weight: 600; width: 160px;">Cancellation ID</td>
                <td style="padding: 10px; background: #fff; border: 1px solid #e2e8f0;">${data.cancellationId}</td>
              </tr>
              <tr>
                <td style="padding: 10px; background: #fff; border: 1px solid #e2e8f0; font-weight: 600;">Refund Amount</td>
                <td style="padding: 10px; background: #fff; border: 1px solid #e2e8f0;">${this.formatCurrency(data.refundAmount)}</td>
              </tr>
              <tr>
                <td style="padding: 10px; background: #fff; border: 1px solid #e2e8f0; font-weight: 600;">Processed On</td>
                <td style="padding: 10px; background: #fff; border: 1px solid #e2e8f0;">${this.formatDate(data.processedAt)}</td>
              </tr>
            </table>

            ${data.refundPaymentId ? `<p style="font-size: 13px; color: #475569;">Refund Payment ID: ${data.refundPaymentId}</p>` : ''}
          </div>
        </div>
      `;

      const sendSmtpEmail = {
        sender: { email: 'noreply@loanpro.tech', name: 'LoanPro' },
        to: [{ email: data.userEmail, name: data.userName }],
        subject: 'Your LoanPro refund is processed',
        htmlContent
      };

      await this.apiInstance.sendTransacEmail(sendSmtpEmail);
      console.log(`✅ Refund processed email sent to ${data.userEmail}`);
      return true;
    } catch (error) {
      console.error('❌ Failed to send refund processed email:', error);
      return false;
    }
  }

  async sendTrialCancellationEmail(data: TrialCancellationEmailData): Promise<boolean> {
    if (!this.isConfigured) {
      console.log('Email service not configured, skipping trial cancellation email');
      return false;
    }

    try {
      const htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: #0f172a; padding: 24px; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 22px;">Trial Cancelled</h1>
          </div>
          <div style="background: #f8fafc; padding: 24px; border: 1px solid #e2e8f0;">
            <p style="font-size: 16px; color: #111827;">Hi <strong>${data.userName}</strong>,</p>
            <p style="font-size: 14px; color: #334155;">Your trial has been cancelled and access has been removed.</p>
            <p style="font-size: 13px; color: #475569;">Cancelled on ${this.formatDate(data.cancelledAt)}.</p>
          </div>
        </div>
      `;

      const sendSmtpEmail = {
        sender: { email: 'noreply@loanpro.tech', name: 'LoanPro' },
        to: [{ email: data.userEmail, name: data.userName }],
        subject: 'Your LoanPro trial was cancelled',
        htmlContent
      };

      await this.apiInstance.sendTransacEmail(sendSmtpEmail);
      console.log(`✅ Trial cancellation email sent to ${data.userEmail}`);
      return true;
    } catch (error) {
      console.error('❌ Failed to send trial cancellation email:', error);
      return false;
    }
  }

  async sendDeviceBoundEmail(data: DeviceEmailData): Promise<boolean> {
    if (!this.isConfigured) {
      console.log('Email service not configured, skipping device bound email');
      return false;
    }

    try {
      const htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: #0f172a; padding: 24px; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 22px;">Device Added</h1>
          </div>
          <div style="background: #f8fafc; padding: 24px; border: 1px solid #e2e8f0;">
            <p style="font-size: 16px; color: #111827;">Hi <strong>${data.userName}</strong>,</p>
            <p style="font-size: 14px; color: #334155;">A new device was added to your account.</p>

            <table style="width: 100%; border-collapse: collapse; margin: 16px 0; font-size: 14px;">
              <tr>
                <td style="padding: 10px; background: #fff; border: 1px solid #e2e8f0; font-weight: 600; width: 160px;">Device Name</td>
                <td style="padding: 10px; background: #fff; border: 1px solid #e2e8f0;">${data.deviceName}</td>
              </tr>
              <tr>
                <td style="padding: 10px; background: #fff; border: 1px solid #e2e8f0; font-weight: 600;">Device ID</td>
                <td style="padding: 10px; background: #fff; border: 1px solid #e2e8f0;">${data.deviceId}</td>
              </tr>
              ${data.organizationName ? `<tr><td style="padding: 10px; background: #fff; border: 1px solid #e2e8f0; font-weight: 600;">Organization</td><td style="padding: 10px; background: #fff; border: 1px solid #e2e8f0;">${data.organizationName}</td></tr>` : ''}
            </table>
          </div>
        </div>
      `;

      const sendSmtpEmail = {
        sender: { email: 'noreply@loanpro.tech', name: 'LoanPro' },
        to: [{ email: data.userEmail, name: data.userName }],
        subject: 'A new device was added to your LoanPro account',
        htmlContent
      };

      await this.apiInstance.sendTransacEmail(sendSmtpEmail);
      console.log(`✅ Device bound email sent to ${data.userEmail}`);
      return true;
    } catch (error) {
      console.error('❌ Failed to send device bound email:', error);
      return false;
    }
  }

  async sendDeviceUpdatedEmail(data: DeviceEmailData): Promise<boolean> {
    if (!this.isConfigured) {
      console.log('Email service not configured, skipping device update email');
      return false;
    }

    try {
      const htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: #0f172a; padding: 24px; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 22px;">Device Updated</h1>
          </div>
          <div style="background: #f8fafc; padding: 24px; border: 1px solid #e2e8f0;">
            <p style="font-size: 16px; color: #111827;">Hi <strong>${data.userName}</strong>,</p>
            <p style="font-size: 14px; color: #334155;">A device on your account was updated.</p>

            <table style="width: 100%; border-collapse: collapse; margin: 16px 0; font-size: 14px;">
              <tr>
                <td style="padding: 10px; background: #fff; border: 1px solid #e2e8f0; font-weight: 600; width: 160px;">Device Name</td>
                <td style="padding: 10px; background: #fff; border: 1px solid #e2e8f0;">${data.deviceName}</td>
              </tr>
              <tr>
                <td style="padding: 10px; background: #fff; border: 1px solid #e2e8f0; font-weight: 600;">Device ID</td>
                <td style="padding: 10px; background: #fff; border: 1px solid #e2e8f0;">${data.deviceId}</td>
              </tr>
              ${data.organizationName ? `<tr><td style="padding: 10px; background: #fff; border: 1px solid #e2e8f0; font-weight: 600;">Organization</td><td style="padding: 10px; background: #fff; border: 1px solid #e2e8f0;">${data.organizationName}</td></tr>` : ''}
            </table>
          </div>
        </div>
      `;

      const sendSmtpEmail = {
        sender: { email: 'noreply@loanpro.tech', name: 'LoanPro' },
        to: [{ email: data.userEmail, name: data.userName }],
        subject: 'A device was updated on your LoanPro account',
        htmlContent
      };

      await this.apiInstance.sendTransacEmail(sendSmtpEmail);
      console.log(`✅ Device update email sent to ${data.userEmail}`);
      return true;
    } catch (error) {
      console.error('❌ Failed to send device update email:', error);
      return false;
    }
  }

  async sendDeviceRevokedEmail(data: DeviceEmailData): Promise<boolean> {
    if (!this.isConfigured) {
      console.log('Email service not configured, skipping device revoke email');
      return false;
    }

    try {
      const htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: #0f172a; padding: 24px; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 22px;">Device Removed</h1>
          </div>
          <div style="background: #f8fafc; padding: 24px; border: 1px solid #e2e8f0;">
            <p style="font-size: 16px; color: #111827;">Hi <strong>${data.userName}</strong>,</p>
            <p style="font-size: 14px; color: #334155;">A device was removed from your account.</p>

            <table style="width: 100%; border-collapse: collapse; margin: 16px 0; font-size: 14px;">
              <tr>
                <td style="padding: 10px; background: #fff; border: 1px solid #e2e8f0; font-weight: 600; width: 160px;">Device Name</td>
                <td style="padding: 10px; background: #fff; border: 1px solid #e2e8f0;">${data.deviceName}</td>
              </tr>
              <tr>
                <td style="padding: 10px; background: #fff; border: 1px solid #e2e8f0; font-weight: 600;">Device ID</td>
                <td style="padding: 10px; background: #fff; border: 1px solid #e2e8f0;">${data.deviceId}</td>
              </tr>
              ${data.reason ? `<tr><td style="padding: 10px; background: #fff; border: 1px solid #e2e8f0; font-weight: 600;">Reason</td><td style="padding: 10px; background: #fff; border: 1px solid #e2e8f0;">${data.reason}</td></tr>` : ''}
            </table>
          </div>
        </div>
      `;

      const sendSmtpEmail = {
        sender: { email: 'noreply@loanpro.tech', name: 'LoanPro' },
        to: [{ email: data.userEmail, name: data.userName }],
        subject: 'A device was removed from your LoanPro account',
        htmlContent
      };

      await this.apiInstance.sendTransacEmail(sendSmtpEmail);
      console.log(`✅ Device revoke email sent to ${data.userEmail}`);
      return true;
    } catch (error) {
      console.error('❌ Failed to send device revoke email:', error);
      return false;
    }
  }

  async sendDeviceSwitchRequestedEmail(data: DeviceEmailData): Promise<boolean> {
    if (!this.isConfigured) {
      console.log('Email service not configured, skipping device switch email');
      return false;
    }

    try {
      const htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: #0f172a; padding: 24px; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 22px;">Device Switch Requested</h1>
          </div>
          <div style="background: #f8fafc; padding: 24px; border: 1px solid #e2e8f0;">
            <p style="font-size: 16px; color: #111827;">Hi <strong>${data.userName}</strong>,</p>
            <p style="font-size: 14px; color: #334155;">We received a request to switch devices on your account.</p>

            <table style="width: 100%; border-collapse: collapse; margin: 16px 0; font-size: 14px;">
              <tr>
                <td style="padding: 10px; background: #fff; border: 1px solid #e2e8f0; font-weight: 600; width: 160px;">Device Name</td>
                <td style="padding: 10px; background: #fff; border: 1px solid #e2e8f0;">${data.deviceName}</td>
              </tr>
              <tr>
                <td style="padding: 10px; background: #fff; border: 1px solid #e2e8f0; font-weight: 600;">Device ID</td>
                <td style="padding: 10px; background: #fff; border: 1px solid #e2e8f0;">${data.deviceId}</td>
              </tr>
              ${data.requestedAt ? `<tr><td style="padding: 10px; background: #fff; border: 1px solid #e2e8f0; font-weight: 600;">Requested On</td><td style="padding: 10px; background: #fff; border: 1px solid #e2e8f0;">${this.formatDate(data.requestedAt)}</td></tr>` : ''}
            </table>
          </div>
        </div>
      `;

      const sendSmtpEmail = {
        sender: { email: 'noreply@loanpro.tech', name: 'LoanPro' },
        to: [{ email: data.userEmail, name: data.userName }],
        subject: 'Device switch requested for your LoanPro account',
        htmlContent
      };

      await this.apiInstance.sendTransacEmail(sendSmtpEmail);
      console.log(`✅ Device switch email sent to ${data.userEmail}`);
      return true;
    } catch (error) {
      console.error('❌ Failed to send device switch email:', error);
      return false;
    }
  }

  /**
   * Send critical payment incident alert to operations/admin
   */
  async sendPaymentIncidentAlert(data: PaymentIncidentAlertData): Promise<boolean> {
    if (!this.isConfigured) {
      console.log('Email service not configured, skipping payment incident alert');
      return false;
    }

    try {
      const severityEmoji = {
        low: '🟢',
        medium: '🟡',
        high: '🟠',
        critical: '🔴'
      }[data.severity] || '⚪';

      const safe = (value?: string | number) => (value === undefined || value === null || value === '' ? 'N/A' : String(value));

      const htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 700px; margin: 0 auto;">
          <div style="background: #111827; padding: 24px; text-align: center;">
            <h1 style="color: #fff; margin: 0; font-size: 22px;">${severityEmoji} Payment Incident Alert</h1>
          </div>

          <div style="background: #f8fafc; padding: 24px; border: 1px solid #e2e8f0;">
            <p style="margin: 0 0 16px 0; color: #111827; font-size: 16px;"><strong>${safe(data.incidentType)}</strong></p>
            <p style="margin: 0 0 20px 0; color: #334155;">${safe(data.message)}</p>

            <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
              <tr>
                <td style="padding: 10px; border: 1px solid #e2e8f0; background: #fff; font-weight: 600; width: 180px;">Severity</td>
                <td style="padding: 10px; border: 1px solid #e2e8f0; background: #fff;">${safe(data.severity)}</td>
              </tr>
              <tr>
                <td style="padding: 10px; border: 1px solid #e2e8f0; background: #fff; font-weight: 600;">Order ID</td>
                <td style="padding: 10px; border: 1px solid #e2e8f0; background: #fff;">${safe(data.orderId)}</td>
              </tr>
              <tr>
                <td style="padding: 10px; border: 1px solid #e2e8f0; background: #fff; font-weight: 600;">Payment ID</td>
                <td style="padding: 10px; border: 1px solid #e2e8f0; background: #fff;">${safe(data.paymentId)}</td>
              </tr>
              <tr>
                <td style="padding: 10px; border: 1px solid #e2e8f0; background: #fff; font-weight: 600;">User ID</td>
                <td style="padding: 10px; border: 1px solid #e2e8f0; background: #fff;">${safe(data.userId)}</td>
              </tr>
              <tr>
                <td style="padding: 10px; border: 1px solid #e2e8f0; background: #fff; font-weight: 600;">Plan / Billing</td>
                <td style="padding: 10px; border: 1px solid #e2e8f0; background: #fff;">${safe(data.plan)} / ${safe(data.billingPeriod)}</td>
              </tr>
              <tr>
                <td style="padding: 10px; border: 1px solid #e2e8f0; background: #fff; font-weight: 600;">Context</td>
                <td style="padding: 10px; border: 1px solid #e2e8f0; background: #fff;">${safe(data.paymentContext)}</td>
              </tr>
              <tr>
                <td style="padding: 10px; border: 1px solid #e2e8f0; background: #fff; font-weight: 600;">Age (minutes)</td>
                <td style="padding: 10px; border: 1px solid #e2e8f0; background: #fff;">${safe(data.ageMinutes)}</td>
              </tr>
              <tr>
                <td style="padding: 10px; border: 1px solid #e2e8f0; background: #fff; font-weight: 600;">Source</td>
                <td style="padding: 10px; border: 1px solid #e2e8f0; background: #fff;">${safe(data.source)}</td>
              </tr>
            </table>

            <div style="margin-top: 24px; text-align: center;">
              <a href="https://www.loanpro.tech/admin" style="display: inline-block; padding: 10px 20px; background: #2563eb; color: #fff; text-decoration: none; border-radius: 6px; font-weight: 600;">Open Admin Dashboard</a>
            </div>
          </div>
        </div>
      `;

      const recipients = (process.env.ADMIN_EMAILS || process.env.ADMIN_EMAIL || 'admin@loanpro.tech')
        .split(',')
        .map((email: string) => email.trim())
        .filter(Boolean)
        .map((email: string) => ({ email }));

      const sendSmtpEmail = {
        sender: { email: 'support@loanpro.tech', name: 'LoanPro Payment Monitor' },
        to: recipients,
        subject: `${severityEmoji} [${data.severity?.toUpperCase() || 'ALERT'}] Payment Incident: ${data.incidentType}`,
        htmlContent
      };

      await this.apiInstance.sendTransacEmail(sendSmtpEmail);
      console.log(`✅ Payment incident alert sent for order ${data.orderId}`);
      return true;
    } catch (error) {
      console.error('❌ Failed to send payment incident alert:', error);
      return false;
    }
  }
}

export default new EmailService();
