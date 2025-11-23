import { MongoClient, ObjectId } from 'mongodb';

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

export async function POST(request, { params }) {
    try {
        const { id } = params;
        const { db } = await connectToDatabase();
        
        const result = await db.collection('compliments').updateOne(
            { _id: new ObjectId(id) },
            { $inc: { likes: 1 } }
        );
        
        if (result.modifiedCount === 1) {
            return new Response(JSON.stringify({ success: true }), {
                status: 200,
                headers: { 'Content-Type': 'application/json' }
            });
        } else {
            return new Response(JSON.stringify({ error: 'Compliment not found' }), {
                status: 404,
                headers: { 'Content-Type': 'application/json' }
            });
        }
    } catch (error) {
        console.error('Error liking compliment:', error);
        return new Response(JSON.stringify({ error: 'Failed to like compliment' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}