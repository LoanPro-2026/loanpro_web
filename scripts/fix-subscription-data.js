// Database cleanup script to fix subscription data inconsistency
// Run this script to ensure consistent data structure

const { MongoClient } = require('mongodb');

async function fixSubscriptionData() {
  const client = new MongoClient(process.env.MONGODB_URI);
  
  try {
    await client.connect();
    const db = client.db();
    
    console.log('Starting subscription data cleanup...');
    
    // Fix subscriptions collection
    const subscriptions = db.collection('subscriptions');
    const subscriptionDocs = await subscriptions.find({}).toArray();
    
    for (const doc of subscriptionDocs) {
      const updates = {};
      
      // If subscriptionPlan contains billing period instead of plan name
      if (doc.subscriptionPlan && ['monthly', 'annually'].includes(doc.subscriptionPlan)) {
        // Move billing period to correct field if needed
        if (!doc.billingPeriod) {
          updates.billingPeriod = doc.subscriptionPlan;
        }
        
        // If subscriptionType has the actual plan name, use it
        if (doc.subscriptionType && ['Basic', 'Pro', 'Enterprise'].includes(doc.subscriptionType)) {
          updates.subscriptionPlan = doc.subscriptionType;
          updates.subscriptionType = 'paid'; // Set to proper subscription type
        } else {
          // Default to Basic if we can't determine
          updates.subscriptionPlan = 'Basic';
          updates.subscriptionType = 'paid';
        }
      }
      
      if (Object.keys(updates).length > 0) {
        console.log(`Updating subscription ${doc._id}:`, updates);
        await subscriptions.updateOne({ _id: doc._id }, { $set: updates });
      }
    }
    
    // Fix users collection
    const users = db.collection('users');
    const userDocs = await users.find({}).toArray();
    
    for (const doc of userDocs) {
      const updates = {};
      
      // If subscriptionType contains billing period instead of plan name
      if (doc.subscriptionType && ['monthly', 'annually'].includes(doc.subscriptionType)) {
        // Move billing period to correct field if needed
        if (!doc.billingPeriod) {
          updates.billingPeriod = doc.subscriptionType;
        }
        
        // Check if we have plan info in features.subscriptionPlan
        if (doc.features?.subscriptionPlan && ['Basic', 'Pro', 'Enterprise'].includes(doc.features.subscriptionPlan)) {
          updates.subscriptionType = doc.features.subscriptionPlan;
        } else {
          // Default to Basic if we can't determine
          updates.subscriptionType = 'Basic';
        }
      }
      
      if (Object.keys(updates).length > 0) {
        console.log(`Updating user ${doc._id}:`, updates);
        await users.updateOne({ _id: doc._id }, { $set: updates });
      }
    }
    
    console.log('Subscription data cleanup completed!');
    
  } catch (error) {
    console.error('Error during cleanup:', error);
  } finally {
    await client.close();
  }
}

// Run the cleanup
fixSubscriptionData();
