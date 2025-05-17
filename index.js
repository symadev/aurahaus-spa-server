const express = require('express');
const cors = require('cors');
const app = express();
require('dotenv').config();
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const jwt = require('jsonwebtoken');
const { MongoClient, ServerApiVersion } = require('mongodb');
const port = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB Connection URI
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.cn4mz.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// MongoDB Client
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

// Connect to MongoDB and set up routes
async function run() {
  try {
    await client.connect();
    const userCollection = client.db("spaUser").collection("spaDoc");
    const paymentCollection = client.db("spaUser").collection("payment");
    const ManageCollection = client.db("spaUser").collection("manageItems");
    const servicesCollection = client.db("spaUser").collection("services");





    // JWT Token generation
    app.post('/jwt', async (req, res) => {
      const user = req.body; // client থেকে আসা data
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' });
      res.send({ token });

      
    });




    // Middleware to check if user is admin
const verifyAdmin = async (req, res, next) => {
  const email = req.decoded.email;
  const user = await userCollection.findOne({ email });

  if (user?.role !== 'admin') {
    return res.status(403).send({ message: 'forbidden: admin only' });
  }

  next();
};






    // Verify Token Middleware
    const verifyToken = (req, res, next) => {
      if (!req.headers.authorization) {
        return res.status(401).send({ message: 'unauthorized access' });
      }
      const token = req.headers.authorization.split(' ')[1];
      jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
        if (err) {
          return res.status(401).send({ message: 'unauthorized access' });
        }
        req.decoded = decoded;
        next();
      });
    };





    // Payment Method Implementation
    app.post('/create-payment-intent', async (req, res) => {
      const { amount } = req.body;
      try {
        const paymentIntent = await stripe.paymentIntents.create({
          amount: amount,  // amount in cents
          currency: 'usd',
          payment_method_types: ['card'],
        });

        res.send({ clientSecret: paymentIntent.client_secret });
      } catch (err) {
        res.status(500).send({ error: err.message });
      }
    });






    // Save Payment Record
    app.post('/payments', async (req, res) => {
      const payment = req.body;

      // Make sure to check if payment data exists
      if (!payment.email || !payment.transactionId) {
        return res.status(400).send({ message: 'Missing payment information' });
      }

      try {
        const result = await paymentCollection.insertOne(payment);
        res.send({ insertedId: result.insertedId });
      } catch (err) {
        console.error("Error inserting payment data: ", err);
        res.status(500).send({ message: 'Failed to save payment data' });
      }
    });




    // Get Bookings for Authenticated User
    app.get('/bookingList', verifyToken, async (req, res) => {
      const email = req.decoded.email;  // Ensure this is the correct email used for auth
      try {
        const bookings = await paymentCollection.find({ email }).toArray();
        res.send(bookings);
      } catch (error) {
        console.error('Error fetching bookings:', error);
        res.status(500).send({ message: 'Internal Server Error' });
      }
    });





    // Check if user is admin
 app.get('/users/admin/:email', verifyToken, async (req, res) => {
  const email = req.params.email;

  // Make sure the token belongs to this email
  if (req.decoded.email !== email) {
    return res.status(403).send({ admin: false, message: 'Forbidden access' });
  }

  const user = await userCollection.findOne({ email });
  const isAdmin = user?.role === 'admin';
  res.send({ admin: isAdmin });
});




    app.post('/users', async (req, res) => {
      const user = req.body;
      const result = await userCollection.insertOne(user);
      res.send(result);

    });



    // Get all manage-Items
    app.get('/manageItems', async (req, res) => {
      const result = await ManageCollection.find().toArray();
      res.send(result);

    });

    app.post('/services', async (req, res) => {
      const service = req.body;
      const result = await servicesCollection.insertOne(service);
      res.send(result);
    });



    // GET: Get all services
   app.get('/services', async (req, res) => {
  const result = await servicesCollection.find().toArray();
  res.send(result);
});






// Promote a user to admin
// Promote a user to admin
app.put('/users/admin',verifyToken, verifyAdmin, async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).send({ success: false, message: 'Email is required' });
  }

  const filter = { email: email };
  const updateDoc = {
    $set: { role: 'admin' },
  };

  const result = await userCollection.updateOne(filter, updateDoc);

  if (result.matchedCount === 0) {
    return res.send({ success: false, message: 'User not found' });
  }

  if (result.modifiedCount > 0) {
    res.send({ success: true, message: 'User promoted to admin' });
  } else {
    res.send({ success: false, message: 'User is already an admin or no changes made' });
  }
});







    // Test MongoDB connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } catch (error) {
    console.error('MongoDB connection failed', error);
  }
}

run().catch(console.dir);

// API Root
app.get('/', (req, res) => {
  res.send('Spa here!');
});

// Start server
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
