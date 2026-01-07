import clientPromise from '@/lib/mongodb';
import { Subscription, CreateSubscriptionDTO } from '@/models/Subscription';

export class SubscriptionService {
  private collection = 'subscriptions';

  private getEndDate(startDate: Date, subscriptionType: Subscription['subscriptionType']): Date {
    const endDate = new Date(startDate);
    switch (subscriptionType) {
      case 'monthly':
        endDate.setMonth(endDate.getMonth() + 1);
        break;
      case '6months':
        endDate.setMonth(endDate.getMonth() + 6);
        break;
      case 'yearly':
        endDate.setFullYear(endDate.getFullYear() + 1);
        break;
    }
    return endDate;
  }

  async createSubscription(data: CreateSubscriptionDTO, session?: any): Promise<Subscription> {
    const client = await clientPromise;
    const db = client.db('AdminDB');
    
    const startDate = new Date();
    const subscription: Subscription = {
      ...data,
      startDate,
      endDate: this.getEndDate(startDate, data.subscriptionType),
      status: 'active',
      dbProvisioned: false,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const result = await db.collection(this.collection).insertOne(
      subscription,
      session ? { session } : {}
    );
    return { ...subscription, _id: result.insertedId } as Subscription;
  }

  async getSubscriptionByUserId(userId: string): Promise<Subscription | null> {
    const client = await clientPromise;
    const db = client.db('AdminDB');
    
    return db.collection(this.collection).findOne({ userId }) as Promise<Subscription | null>;
  }

  async updateSubscription(userId: string, data: Partial<Subscription>): Promise<Subscription | null> {
    const client = await clientPromise;
    const db = client.db('AdminDB');
    
    const updateData = {
      ...data,
      updatedAt: new Date()
    };

    const result = await db.collection(this.collection).findOneAndUpdate(
      { userId },
      { $set: updateData },
      { returnDocument: 'after' }
    );

    return result?.value as Subscription | null;
  }

  async isSubscriptionActive(userId: string): Promise<boolean> {
    const subscription = await this.getSubscriptionByUserId(userId);
    if (!subscription) return false;

    const now = new Date();
    return subscription.status === 'active' && subscription.endDate > now;
  }
} 