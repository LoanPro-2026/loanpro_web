import mongoose, { Document, Model, Schema } from 'mongoose';

export type ContactInquiryType =
  | 'sales'
  | 'demo-request'
  | 'pricing'
  | 'application-setup'
  | 'partnership'
  | 'other';

export type ContactLeadStatus = 'new' | 'called' | 'follow-up' | 'converted' | 'closed';

export interface ICallNote {
  note: string;
  by: string;
  createdAt: Date;
}

export interface IContactRequest extends Document {
  requestId: string;
  name: string;
  email: string;
  phone: string;
  organization: string;
  inquiryType: ContactInquiryType;
  message: string;
  preferredCallbackTime?: string;
  timezone?: string;
  consentAccepted: boolean;
  consentAt: Date;
  source: 'website_contact_form';
  status: ContactLeadStatus;
  priority: 'normal' | 'high';
  assignedTo?: string;
  callNotes: ICallNote[];
  firstCalledAt?: Date;
  lastCalledAt?: Date;
  nextFollowUpAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const CallNoteSchema = new Schema<ICallNote>(
  {
    note: { type: String, required: true },
    by: { type: String, required: true },
    createdAt: { type: Date, default: Date.now }
  },
  { _id: false }
);

const ContactRequestSchema = new Schema<IContactRequest>(
  {
    requestId: {
      type: String,
      required: true,
      unique: true,
      index: true
    },
    name: {
      type: String,
      required: true,
      trim: true
    },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      index: true
    },
    phone: {
      type: String,
      required: true,
      trim: true,
      index: true
    },
    organization: {
      type: String,
      required: true,
      trim: true
    },
    inquiryType: {
      type: String,
      enum: ['sales', 'demo-request', 'pricing', 'application-setup', 'partnership', 'other'],
      required: true,
      index: true
    },
    message: {
      type: String,
      required: true,
      trim: true
    },
    preferredCallbackTime: {
      type: String,
      trim: true
    },
    timezone: {
      type: String,
      trim: true
    },
    consentAccepted: {
      type: Boolean,
      required: true,
      default: false
    },
    consentAt: {
      type: Date,
      required: true,
      default: Date.now
    },
    source: {
      type: String,
      enum: ['website_contact_form'],
      default: 'website_contact_form',
      required: true
    },
    status: {
      type: String,
      enum: ['new', 'called', 'follow-up', 'converted', 'closed'],
      default: 'new',
      index: true
    },
    priority: {
      type: String,
      enum: ['normal', 'high'],
      default: 'normal',
      index: true
    },
    assignedTo: {
      type: String,
      trim: true
    },
    callNotes: {
      type: [CallNoteSchema],
      default: []
    },
    firstCalledAt: Date,
    lastCalledAt: Date,
    nextFollowUpAt: Date
  },
  {
    timestamps: true
  }
);

ContactRequestSchema.index({ createdAt: -1 });
ContactRequestSchema.index({ status: 1, createdAt: -1 });
ContactRequestSchema.index({ inquiryType: 1, createdAt: -1 });

ContactRequestSchema.pre('validate', async function preValidate() {
  if (!this.isNew || this.requestId) {
    return;
  }

  const date = new Date();
  const dateStr = date.toISOString().split('T')[0].replace(/-/g, '');
  const ContactRequestModel = mongoose.models.ContactRequest as Model<IContactRequest>;

  const lastRequest = await ContactRequestModel.findOne({
    requestId: new RegExp(`^LQ-${dateStr}-`)
  }).sort({ requestId: -1 });

  let sequence = 1;
  if (lastRequest?.requestId) {
    const lastSequence = parseInt(lastRequest.requestId.split('-')[2], 10);
    if (!Number.isNaN(lastSequence)) {
      sequence = lastSequence + 1;
    }
  }

  this.requestId = `LQ-${dateStr}-${sequence.toString().padStart(6, '0')}`;
});

const ContactRequest: Model<IContactRequest> =
  mongoose.models.ContactRequest ||
  mongoose.model<IContactRequest>('ContactRequest', ContactRequestSchema);

export default ContactRequest;