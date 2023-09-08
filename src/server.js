import express from "express";
import { db, connectToDb } from './db.js';
import fs from 'fs';
import admin from 'firebase-admin';
import path from 'path';
import 'dotenv/config';

import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const credentials = JSON.parse(
    fs.readFileSync('./credentials.json')
);

admin.initializeApp({
        credential: admin.credential.cert(credentials),
});

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, '../build')));

app.get(/ˆ(!\/api).+/, (req, res) =>{
    res.sendFile(path.join(__dirname, '../build/index.html'));
})

app.use(async (req, res, next) =>{
   const { authtoken } = req.headers;

   if(authtoken){
       try {
           req.user = await admin.auth().verifyIdToken(authtoken);
       }catch (e) {
           console.log(e);
           return res.sendStatus(400);
       }
   }

   req.user = req.user || {};

   next();
});

app.get('/api/articles/:name', async (req, res) => {
    const { name } = req.params;
    const { uid } = req.user;

    const article = await db.collection('articles').findOne({name});
    
    if(article){
        const upvoteIds = article.upvoteIds || [];
        article.canUpvote = uid && !upvoteIds.includes(uid);
        res.json(article);
    }else{
        res.sendStatus(404).send(`That ${name} article does not exist!`);
    }
})

app.put('/api/articles/:name/upvote', async (req, res) => {
    const { name } = req.params;
    const { uid } = req.user;

    //Get the article updated
    const article = await db.collection('articles').findOne({name});

    if(article){
        const upvoteIds = article.upvoteIds || [];
        const canUpvote = uid && !upvoteIds.includes(uid);

        if (canUpvote){
            //Update
            await db.collection('articles').updateOne({ name }, {
                $inc: { upvotes: 1 },
                $push: { upvoteIds: uid}
            });
        }
        //Get the article updated
        const updatedArticle = await db.collection('articles').findOne({name});
        res.json(updatedArticle);
    }else {
        res.send(`That ${name} article does not exist!`);
    }
});

app.use((req, res, next)=>{
   if(req.user){
       next();
   } else{
       res.sendStatus(401);
   }
});

app.post('/api/articles/:name/comments', async (req, res) => {
    const { name } = req.params;
    const { text } = req.body;
    const { email } = req.user;

       
    //Update
    await db.collection('articles').updateOne({ name }, { 
        $push: { comments: { postedBy: email, text } }
    });

    //Get the article updated
    const article = await db.collection('articles').findOne({name});
    
    if (article){               
        res.json(article);
    }else{
        res.send(`That ${name} article does not exist!`);
    }    
})

const PORT = process.env.PORT || 8000;

connectToDb(() => {
    console.log('Connected to the database sucessfully!');
    app.listen(PORT, ()=> {
        console.log('Server is listening on port ' + PORT);
    });
});

