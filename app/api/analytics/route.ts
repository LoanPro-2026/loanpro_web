import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { getCorsHeaders } from '../devices/cors';

// Analytics endpoint for desktop app usage tracking
export async function POST(req: Request) {
  const corsHeaders = getCorsHeaders(req);
  
  try {
    const { accessToken, events, sessionData } = await req.json();
    
    if (!accessToken) {
      return NextResponse.json({ error: 'Missing accessToken' }, { status: 400, headers: corsHeaders });
    }
    
    const client = await clientPromise;
    const db = client.db('AdminDB');
    
    // Verify access token
    const user = await db.collection('users').findOne({ accessToken });
    if (!user) {
      return NextResponse.json({ error: 'Invalid access token' }, { status: 401, headers: corsHeaders });
    }
    
    const timestamp = new Date();
    
    // Store analytics data
    if (events && events.length > 0) {
      const analyticsEvents = events.map((event: any) => ({
        ...event,
        userId: user.userId,
        timestamp: new Date(event.timestamp || timestamp),
        deviceId: sessionData?.deviceId,
        appVersion: sessionData?.appVersion
      }));
      
      await db.collection('analytics').insertMany(analyticsEvents);
    }
    
    // Update session data
    if (sessionData) {
      await db.collection('userSessions').updateOne(
        { 
          userId: user.userId,
          deviceId: sessionData.deviceId,
          sessionId: sessionData.sessionId
        },
        {
          $set: {
            ...sessionData,
            lastActivity: timestamp
          },
          $inc: {
            duration: sessionData.duration || 0
          }
        },
        { upsert: true }
      );
    }
    
    return NextResponse.json({
      success: true,
      message: 'Analytics data recorded'
    }, { headers: corsHeaders });
    
  } catch (error) {
    console.error('Analytics API error:', error);
    return NextResponse.json({ error: 'Failed to record analytics' }, { status: 500, headers: corsHeaders });
  }
}

// Get analytics insights for web dashboard
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const timeframe = searchParams.get('timeframe') || '30d';
    const userId = searchParams.get('userId');
    
    if (!userId) {
      return NextResponse.json({ error: 'Missing userId' }, { status: 400 });
    }
    
    const client = await clientPromise;
    const db = client.db('AdminDB');
    
    const dateFilter = getDateFilter(timeframe);
    
    // Get usage analytics
    const analytics = await db.collection('analytics').aggregate([
      {
        $match: {
          userId,
          timestamp: { $gte: dateFilter }
        }
      },
      {
        $group: {
          _id: {
            $dateToString: { format: "%Y-%m-%d", date: "$timestamp" }
          },
          events: { $sum: 1 },
          uniqueFeatures: { $addToSet: "$eventType" }
        }
      },
      { $sort: { _id: 1 } }
    ]).toArray();
    
    // Get session data
    const sessions = await db.collection('userSessions').find({
      userId,
      lastActivity: { $gte: dateFilter }
    }).toArray();
    
    const insights = {
      totalEvents: analytics.reduce((sum, day) => sum + day.events, 0),
      avgDailyUsage: analytics.length > 0 ? Math.round(analytics.reduce((sum, day) => sum + day.events, 0) / analytics.length) : 0,
      totalSessions: sessions.length,
      avgSessionDuration: sessions.length > 0 ? Math.round(sessions.reduce((sum, s) => sum + (s.duration || 0), 0) / sessions.length) : 0,
      dailyActivity: analytics,
      topFeatures: await getTopFeatures(db, userId, dateFilter),
      deviceUsage: await getDeviceUsage(db, userId, dateFilter)
    };
    
    return NextResponse.json(insights);
    
  } catch (error) {
    console.error('Analytics GET API error:', error);
    return NextResponse.json({ error: 'Failed to get analytics' }, { status: 500 });
  }
}

function getDateFilter(timeframe: string) {
  const now = new Date();
  switch (timeframe) {
    case '7d':
      return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    case '30d':
      return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    case '90d':
      return new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    default:
      return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  }
}

async function getTopFeatures(db: any, userId: string, dateFilter: Date) {
  return await db.collection('analytics').aggregate([
    {
      $match: {
        userId,
        timestamp: { $gte: dateFilter }
      }
    },
    {
      $group: {
        _id: "$eventType",
        count: { $sum: 1 }
      }
    },
    { $sort: { count: -1 } },
    { $limit: 10 }
  ]).toArray();
}

async function getDeviceUsage(db: any, userId: string, dateFilter: Date) {
  return await db.collection('userSessions').aggregate([
    {
      $match: {
        userId,
        lastActivity: { $gte: dateFilter }
      }
    },
    {
      $group: {
        _id: "$deviceId",
        sessions: { $sum: 1 },
        totalDuration: { $sum: "$duration" },
        lastUsed: { $max: "$lastActivity" }
      }
    }
  ]).toArray();
}

export function OPTIONS(req: Request) {
  const corsHeaders = getCorsHeaders(req);
  return new Response(null, { status: 204, headers: corsHeaders });
}
