import { MongoClient, ObjectId } from "mongodb";
import cuid from "cuid";
import type { DatabaseEmails, Result, SimplifiedEmail } from "@/types";
import type { DatabaseInbox } from "@/types";
import { config } from "dotenv";
config();
// MongoDB connection
const mongoUser = process.env.MONGO_USERNAME;
const mongoPass = process.env.MONGO_PASSWORD;
const mongoHost = process.env.MONGO_HOST || "localhost";
const mongoPort = process.env.MONGO_PORT || "27017";
const mongoDbName = process.env.MONGO_DATABASE || "tempmail";
const mongoTlsCaPath = process.env.MONGO_TLS_CA_PATH;
const replicaSet = process.env.MONGO_REPLICASET;
const mongoTlsClientCertPath = process.env.MONGO_TLS_CLIENT_CERT_PATH;

const connectionString = `mongodb://${mongoUser}:${mongoPass}@${mongoHost}:${mongoPort}/${mongoDbName}?replicaSet=${replicaSet}`;

const client = new MongoClient(connectionString, {
  maxPoolSize: 10,
  serverSelectionTimeoutMS: 5000,
  tls: !!mongoTlsCaPath,
  tlsCAFile: mongoTlsCaPath,
  tlsCertificateKeyFile: mongoTlsClientCertPath,
});

let dbInstance: any;

async function initDB() {
  if (!dbInstance) {
    await client.connect();
    dbInstance = client.db(mongoDbName);
    console.log("Successfully connected to MongoDB.");

    await dbInstance.collection("emails").createIndex({ "recipients.address": 1 });
    await dbInstance.collection("emails").createIndex({ expiresAt: 1 });
    await dbInstance.collection("inboxes").createIndex({ emailId: 1 });
    await dbInstance.collection("inboxes").createIndex({ address: 1 });
  }
  return dbInstance;
}

// Optimized MongoDB Structure
// Collection: emails - store complete email data
interface EmailDocument {
  _id: ObjectId;
  subject: string;
  createdAt: number;
  expiresAt: number;
  from: string[];
  to: string[];
  textContent?: string;
  htmlContent?: string;
}

// Collection: inboxes - lightweight references for user mailboxes
interface InboxDocument {
  _id: string; // cuid
  emailId: ObjectId;
  address: string;
  createdAt: number;
}

interface AddressObjectType {
  address: string | null;
  name?: string | null;
}

// Cleanup expired emails
async function cleanupExpiredEmails() {
  try {
    const db = await initDB();
    const result = await db.collection("emails").deleteMany({ 
      expiresAt: { $lt: Date.now() } 
    });
    
    // Also cleanup orphaned inbox entries
    const emailIds = await db.collection("emails").distinct("_id");
    await db.collection("inboxes").deleteMany({ 
      emailId: { $nin: emailIds } 
    });
    
    console.log(`Cleaned up ${result.deletedCount} expired emails`);
  } catch (error) {
    console.error("Cleanup failed:", error);
  }
}

// INSERT EMAIL - Much simpler!
export async function insertEmail(emailData: SimplifiedEmail): Promise<Result<ObjectId>> {
  try {
    const db = await initDB();

    // Random cleanup
    if (Math.random() < 0.05) {
      cleanupExpiredEmails().catch(console.error);
    }

    const expiresAt = Date.now() + 3 * 24 * 60 * 60 * 1000;
    
    // Single insert with all email data
    const emailDoc: EmailDocument = {
      _id: new ObjectId(),
      subject: emailData.subject ?? "(No Subject)",
      createdAt: Date.now(),
      expiresAt,
      from: emailData.from?.value
      ?.map((v: AddressObjectType) => v.address)
      .filter((addr: string | null): addr is string => addr !== null) || [],

      to: emailData.to?.value
      ?.map((v: AddressObjectType) => v.address)
      .filter((addr: string | null): addr is string => addr !== null) || [],
      textContent: emailData.text ?? undefined,
      htmlContent: emailData.html ?? undefined
    };

    const emailResult = await db.collection("emails").insertOne(emailDoc);
    const emailId = emailResult.insertedId;

    // Create inbox entries for recipients
    const recipients = emailData.to?.value || [];
    if (recipients.length > 0) {
    const inboxDocs: InboxDocument[] = recipients
        .map((recipient: AddressObjectType) =>
        recipient.address
            ? {
                _id: cuid(),
                emailId,
                address: recipient.address, // chắc chắn là string
                createdAt: Date.now(),
            }
            : null
        )
        .filter((doc: InboxDocument | null): doc is InboxDocument => doc !== null); // lọc null ra

    await db.collection("inboxes").insertMany(inboxDocs);
    }

    return { success: true, data: emailId };
  } catch (error) {
    if (error instanceof Error) return { success: false, error };
    return { success: false, error: new Error("Unknown error") };
  }
}

// GET EMAILS FOR ADDRESS - Single query!
export async function getEmailsForAddress(address: string): Promise<Result<DatabaseEmails>> {
  try {
    const db = await initDB();

    // Simple aggregation - much faster
    const emails = await db.collection("inboxes").aggregate([
      { $match: { address } },
      {
        $lookup: {
          from: "emails",
          localField: "emailId",
          foreignField: "_id",
          as: "email"
        }
      },
      { $unwind: "$email" },
      // Filter expired emails
      { $match: { "email.expiresAt": { $gt: Date.now() } } },
      {
        $project: {
          id: "$_id",
          subject: "$email.subject",
          createdAt: "$email.createdAt",
          expiresAt: "$email.expiresAt",
          fromAddress: { $arrayElemAt: ["$email.from", 0] }, // First from address
          toAddress: "$email.to" // All to addresses as array
        }
      },
      { $sort: { createdAt: -1 } }
    ]).toArray();

    return { success: true, data: emails as DatabaseEmails };
  } catch (error) {
    if (error instanceof Error) return { success: false, error };
    return { success: false, error: new Error("Unknown error") };
  }
}

// GET INBOX BY ID - Single lookup!
export async function getInboxById(inboxId: string): Promise<Result<DatabaseInbox>> {
  try {
    const db = await initDB();

    const inbox = await db.collection("inboxes").aggregate([
      { $match: { _id: inboxId } },
      {
        $lookup: {
          from: "emails",
          localField: "emailId", 
          foreignField: "_id",
          as: "email"
        }
      },
      { $unwind: "$email" },
      // Check if not expired
      { $match: { "email.expiresAt": { $gt: Date.now() } } },
      {
        $project: {
          id: "$_id",
          textContent: "$email.textContent",
          htmlContent: "$email.htmlContent", 
          subject: "$email.subject",
          expiresAt: "$email.expiresAt",
          createdAt: "$email.createdAt",
          fromAddress: { $arrayElemAt: ["$email.from", 0] },
          toAddress: "$email.to"
        }
      }
    ]).next();

    if (!inbox) {
      return { success: false, error: new Error("Inbox not found or expired") };
    }

    return { success: true, data: inbox as DatabaseInbox };
  } catch (error) {
    if (error instanceof Error) return { success: false, error };
    return { success: false, error: new Error("Unknown error") };
  }
}

// DELETE INBOX - Simple delete
export async function deleteInbox(inboxId: string): Promise<Result<boolean>> {
  try {
    const db = await initDB();
    
    const result = await db.collection("inboxes").deleteOne({ _id: inboxId });
    
    if (result.deletedCount === 0) {
      return { success: false, error: new Error("Inbox not found") };
    }

    return { success: true, data: true };
  } catch (error) {
    if (error instanceof Error) return { success: false, error };
    return { success: false, error: new Error("Unknown error") };
  }
}

// ALTERNATIVE: Even simpler single collection approach
export const SimpleMongoQueries = {
  // Only use emails collection - no inbox collection needed
  async insertEmail(emailData: SimplifiedEmail): Promise<Result<ObjectId>> {
    try {
      const db = await initDB();
      
      const emailDoc = {
        subject: emailData.subject,
        createdAt: Date.now(),
        expiresAt: Date.now() + 3 * 24 * 60 * 60 * 1000,
        from: emailData.from?.value
        ?.map((v: AddressObjectType) => v.address)
        .filter((addr: string | null): addr is string => addr !== null) || [],

        to: emailData.to?.value
        ?.map((v: AddressObjectType) => v.address)
        .filter((addr: string | null): addr is string => addr !== null) || [],
        textContent: emailData.text,
        htmlContent: emailData.html
      };

      const result = await db.collection("emails").insertOne(emailDoc);
      return { success: true, data: result.insertedId };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error : new Error("Unknown error") };
    }
  },

  async getEmailsForAddress(address: string): Promise<Result<any[]>> {
    try {
      const db = await initDB();
      
      const emails = await db.collection("emails")
        .find({
          to: { $in: [address] },
          expiresAt: { $gt: Date.now() }
        })
        .sort({ createdAt: -1 })
        .project({
          _id: 1,
          subject: 1, 
          createdAt: 1,
          expiresAt: 1,
          from: 1,
          to: 1
        })
        .toArray();

      return { success: true, data: emails };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error : new Error("Unknown error") };
    }
  },

  async getEmailById(id: string): Promise<Result<any>> {
    try {
      const db = await initDB();
      
      if (!ObjectId.isValid(id)) {
        return { success: false, error: new Error("Invalid ID") };
      }

      const email = await db.collection("emails").findOne({
        _id: new ObjectId(id),
        expiresAt: { $gt: Date.now() }
      });

      if (!email) {
        return { success: false, error: new Error("Email not found or expired") };
      }

      return { success: true, data: email };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error : new Error("Unknown error") };
    }
  }
};

export async function closeDB() {
  if (dbInstance) {
    await client.close();
    dbInstance = null;
  }
}