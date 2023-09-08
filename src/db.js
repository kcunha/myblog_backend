import { MongoClient } from "mongodb"; 

let db;

async function connectToDb(cb){
    //const client = new MongoClient('mongodb://writer:password@127.0.0.1:27017/react-blog-db');
    const client = new MongoClient(`mongodb+srv://${process.env.MONGO_USERNAME}:${process.env.MONGO_PASSWORD}@applications.zsgdeil.mongodb.net/?retryWrites=true&w=majority`);

    await client.connect();

    db = client.db('react-blog-db');

    cb();
}

export {
    db,
    connectToDb,
};