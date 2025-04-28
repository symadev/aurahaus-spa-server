const express = require('express')
const cors = require('cors')
const app = express()
require('dotenv').config()
const port = process.env.PORT || 5000



//middleware
app.use(cors());
app.use(express.json());







const { MongoClient, ServerApiVersion } = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.cn4mz.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();
    const userCollection = client.db("spaUser").collection("spaDoc");





//for create user
    app.post('/users', async (req, res) => {
        try {
          const user = req.body;
          console.log("Adding user:", user);
          
          // Check if user already exists
          const existingUser = await userCollection.findOne({ email: user.email });
          if (existingUser) {
            return res.status(400).send({ message: 'User already exists' });
          }
          
          const result = await userCollection.insertOne(user);
          res.send(result);
        } catch (error) {
          console.error("Error adding user:", error);
          res.status(500).send({ error: "Failed to add user" });
        }
      });



//get al user--> we can check apis in localhost through that
      app.get('/users', async (req, res) => {
        try {
          const users = await userCollection.find().toArray();
          res.send(users);
        } catch (error) {
          console.error("Error getting users:", error);
          res.status(500).send({ error: "Failed to get users" });
        }
      });
      




//Check if a user is admin
    app.get('/users/admin/:email', async (req, res) => {
        const email = req.params.email;
        const user = await userCollection.findOne({ email: email });
        const isAdmin = user?.role === 'admin';
        res.send({ admin: isAdmin });
      });
















    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);




app.get('/', (req, res) => {
  res.send('Spa here!')
})

app.listen(port, () => {
  console.log(`ready for your treatment ${port}`)
})