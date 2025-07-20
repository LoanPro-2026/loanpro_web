// Database indexes and setup for device revoke functionality
// Run this in MongoDB compass or mongo shell to optimize performance

// 1. Index on device_revokes collection for efficient monthly queries
db.device_revokes.createIndex({ "userId": 1, "revokedAt": 1 })

// 2. Index on users collection for device management
db.users.createIndex({ "devices.deviceId": 1 })
db.users.createIndex({ "accessToken": 1 })

// 3. Compound index for user and email lookups
db.users.createIndex({ "userId": 1, "email": 1 })

/* 
 * Sample document structure in device_revokes collection:
 * {
 *   "_id": ObjectId("..."),
 *   "userId": "user_clerk_id_here", 
 *   "deviceId": "device_uuid_here",
 *   "deviceName": "John's Laptop",
 *   "deviceInfo": { "platform": "Windows", "osVersion": "10.0.19042" },
 *   "reason": "Lost device",
 *   "revokedAt": ISODate("2025-07-20T10:30:00Z"),
 *   "createdAt": ISODate("2025-07-20T10:30:00Z")
 * }
 */

// Sample query to check monthly revokes for a user
// db.device_revokes.find({
//   "userId": "user_clerk_id_here",
//   "revokedAt": { $gte: ISODate("2025-07-01T00:00:00Z") }
// }).count()
