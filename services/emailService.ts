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

  /**
   * Send notification to admin when new ticket is created
   */
  async sendNewTicketNotificationToAdmin(ticket: TicketData): Promise<boolean> {
    if (!this.isConfigured) {
      console.log('Email service not configured, skipping admin notification');
      return false;
    }

    try {
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
        sender: { email: 'support@loanpro.tech', name: 'LoanPro Support System' },
        to: (process.env.ADMIN_EMAILS || 'admin@loanpro.tech')
          .split(',')
          .map(email => ({ email: email.trim() })),
        subject: `🎫 New Support Ticket: ${ticket.ticketId} - ${ticket.subject}`,
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
   * Send confirmation email to user when ticket is created
   */
  async sendTicketConfirmationToUser(ticket: TicketData): Promise<boolean> {
    if (!this.isConfigured) {
      console.log('Email service not configured, skipping user confirmation');
      return false;
    }

    try {
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
        sender: { email: 'support@loanpro.tech', name: 'LoanPro Support' },
        to: [{ email: ticket.userEmail, name: ticket.userName }],
        subject: `Ticket ${ticket.ticketId} - We've received your support request`,
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
   * Send email to user when admin responds or updates status
   */
  async sendTicketUpdateToUser(data: TicketUpdateData): Promise<boolean> {
    if (!this.isConfigured) {
      console.log('Email service not configured, skipping update notification');
      return false;
    }

    try {
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
        sender: { email: 'support@loanpro.tech', name: 'LoanPro Support' },
        to: [{ email: data.userEmail, name: data.userName }],
        replyTo: { email: (process.env.ADMIN_EMAILS || 'support@loanpro.tech').split(',')[0].trim() },
        subject: `Ticket ${data.ticketId} - Update on your support request`,
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
}

export default new EmailService();
