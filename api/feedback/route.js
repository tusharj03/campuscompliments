import { MongoClient } from 'mongodb';

const MONGODB_URI = process.env.MONGODB_URI;
const DB_NAME = 'campusCrush';

let cachedClient = null;
let cachedDb = null;

async function connectToDatabase() {
    if (cachedClient && cachedDb) {
        return { client: cachedClient, db: cachedDb };
    }

    const client = await MongoClient.connect(MONGODB_URI);
    const db = client.db(DB_NAME);
    
    cachedClient = client;
    cachedDb = db;
    
    return { client, db };
}

export async function POST(request) {
    try {
        const { db } = await connectToDatabase();
        const body = await request.json();
        
        const feedback = {
            ...body,
            timestamp: new Date()
        };
        
        await db.collection('feedback').insertOne(feedback);
        
        return new Response(JSON.stringify({ success: true }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (error) {
        console.error('Error saving feedback:', error);
        return new Response(JSON.stringify({ error: 'Failed to save feedback' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}