import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ITicketResponse {
  from: 'user' | 'admin';
  message: string;
  timestamp: Date;
  adminName?: string;
}

export interface ISupportTicket extends Document {
  ticketId: string;
  userId: string;
  userEmail: string;
  userName: string;
  subject: string;
  description: string;
  issueType: 'bug' | 'feature' | 'question' | 'billing' | 'other';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'open' | 'in-progress' | 'resolved' | 'closed';
  appVersion: string;
  browserInfo?: string;
  deviceInfo?: string;
  attachments: string[];
  responses: ITicketResponse[];
  assignedTo?: string;
  tags: string[];
  viewedByUser: boolean;
  viewedByAdmin: boolean;
  lastUpdatedBy: 'user' | 'admin';
  createdAt: Date;
  updatedAt: Date;
}

const TicketResponseSchema = new Schema({
  from: {
    type: String,
    enum: ['user', 'admin'],
    required: true
  },
  message: {
    type: String,
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  adminName: String
});

const SupportTicketSchema = new Schema<ISupportTicket>({
  ticketId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  userId: {
    type: String,
    required: true,
    index: true
  },
  userEmail: {
    type: String,
    required: true,
    index: true
  },
  userName: {
    type: String,
    required: true
  },
  subject: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  issueType: {
    type: String,
    enum: ['bug', 'feature', 'question', 'billing', 'other'],
    required: true,
    index: true
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium',
    index: true
  },
  status: {
    type: String,
    enum: ['open', 'in-progress', 'resolved', 'closed'],
    default: 'open',
    index: true
  },
  appVersion: {
    type: String,
    required: true
  },
  browserInfo: String,
  deviceInfo: String,
  attachments: [String],
  responses: [TicketResponseSchema],
  assignedTo: String,
  tags: [String],
  viewedByUser: {
    type: Boolean,
    default: false
  },
  viewedByAdmin: {
    type: Boolean,
    default: false
  },
  lastUpdatedBy: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user'
  }
}, {
  timestamps: true
});

// Indexes for efficient queries
SupportTicketSchema.index({ createdAt: -1 });
SupportTicketSchema.index({ status: 1, createdAt: -1 });
SupportTicketSchema.index({ userId: 1, createdAt: -1 });

// Generate unique ticket ID
SupportTicketSchema.pre('validate', async function() {
  if (this.isNew && !this.ticketId) {
    const date = new Date();
    const dateStr = date.toISOString().split('T')[0].replace(/-/g, '');
    
    // Find the last ticket created today
    const SupportTicketModel = mongoose.models.SupportTicket as Model<ISupportTicket>;
    const lastTicket = await SupportTicketModel.findOne({
      ticketId: new RegExp(`^TKT-${dateStr}-`)
    }).sort({ ticketId: -1 });
    
    let sequence = 1;
    if (lastTicket) {
      const lastSequence = parseInt(lastTicket.ticketId.split('-')[2]);
      sequence = lastSequence + 1;
    }
    
    this.ticketId = `TKT-${dateStr}-${sequence.toString().padStart(3, '0')}`;
  }
});

const SupportTicket: Model<ISupportTicket> = 
  mongoose.models.SupportTicket || mongoose.model<ISupportTicket>('SupportTicket', SupportTicketSchema);

export default SupportTicket;
