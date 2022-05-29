const express = require("express");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const cors = require("cors");
require("dotenv").config();
const port = process.env.PORT || 5000;
const app = express();
const jwt = require("jsonwebtoken");
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.5eiql.mongodb.net/?retryWrites=true&w=majority`;

const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverApi: ServerApiVersion.v1,
});

function verifyJWT(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).send({ message: "unauthorized access" });
  }
  const token = authHeader.split(" ")[1];
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, function (err, decoded) {
    if (err) {
      return res.status(403).send({ message: "Forbidden access" });
    }
    req.decoded = decoded;
    next();
  });
}

async function run() {
  try {
    await client.connect();
    const productsCollection = client.db("partsCollection").collection("parts");
    const bookingCollection = client
    .db("partsCollection")
    .collection("booking");
  const usersCollection = client.db("partsCollection").collection("users");
  const paymentCollection = client
    .db("partsCollection")
    .collection("payments");
  const reviewsCollection = client
    .db("partsCollection")
    .collection("reviews");



    app.get("/allParts", async (req, res) => {
      const query = {};
      const cursor = productsCollection.find(query);
      const products = await cursor.toArray();
      res.send(products);
    });


    app.post("/addPart", async (req, res) => {
      const item = req.body;
      const result = await productsCollection.insertOne(item);
      res.send(result);
    });


    app.get("/parts/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const result = await productsCollection.findOne(query);
      res.send(result);
    });


    app.delete("/parts/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const result = await bookingCollection.deleteOne(query);
      res.send(result);
    });


    app.get("/user", async (req, res) => {
      const users = await usersCollection.find().toArray();
      res.send(users);
    });


    app.get("/user/:email", async (req, res) => {
      const email = req.params.email;
      const query = { email: email };
      const user = await usersCollection.findOne(query);
      res.send(user);
    });

    app.put("/user/:email", async (req, res) => {
      const email = req.params.email;
      const user = req.body;
      const filter = { email: email };
      const options = { upsert: true };
      const updateDoc = {
        $set: user,
      };
      const result = await usersCollection.updateOne(
        filter,
        updateDoc,
        options
      );

      const token = jwt.sign(
        { email: email },
        process.env.ACCESS_TOKEN_SECRET,
        { expiresIn: "1d" }
      );
      res.send({ result, token });
    });


    app.get("/admin/:email", async (req, res) => {
      const email = req.params.email;
      const user = await usersCollection.findOne({ email: email });
      const isAdmin = user.role === "admin";
      res.send({ admin: isAdmin });
    });



    app.put("/user/admin/:email", verifyJWT, async (req, res) => {
      const email = req.params.email;
      const requester = req.decoded.email;
      // console.log(requester);
      const requesterAccount = await usersCollection.findOne({
        email: requester,
      });
      if (requesterAccount.role === "admin") {
        const filter = { email: email };
        const updateDoc = {
          $set: { role: "admin" },
        };
        const result = await usersCollection.updateOne(filter, updateDoc);
        res.send(result);
      } else {
        res.send(403).send({ message: "forbidden access bro" });
      }

      app.post("/booking", async (req, res) => {
        const booking = req.body;
        const result = await bookingCollection.insertOne(booking);
        res.send(result);
      });

      app.get("/booking", async (req, res) => {
        const buyer = req.query.buyer;
        const query = { buyerMail: buyer };
        const bookings = await bookingCollection.find(query).toArray();
        res.send(bookings);
      });

      app.get("/booking/:id", async (req, res) => {
        const id = req.params.id;
        const query = { _id: ObjectId(id) };
        const booking = await bookingCollection.findOne(query);
        res.send(booking);
      });
  


      app.patch("/booking/:id", async (req, res) => {
        const id = req.params.id;
        const payment = req.body;
        const filter = { _id: ObjectId(id) };
        const updatedDoc = {
          $set: {
            paid: true,
            transactionId: payment.transactionId,
          },
        };
        const result = await paymentCollection.insertOne(payment);
        const updatedBooking = await bookingCollection.updateOne(
          filter,
          updatedDoc
        );
        res.send(updatedDoc);
      });


      app.post("/review", async (req, res) => {
        const review = req.body;
        const result = await reviewsCollection.insertOne(review);
        res.send(result);
      });


      app.get("/review", async (req, res) => {
        const review = await reviewsCollection.find().toArray();
        res.send(review);
      });


      app.post("/create-payment-intent", async (req, res) => {
        const order = req.body;
        const price = order.pPrice;
        const amount = parseInt(price) * 100;
        const paymentIntent = await stripe.paymentIntents.create({
          amount: amount,
          currency: "usd",
          payment_method_types: ["card"],
        });
        res.send({ clientSecret: paymentIntent.client_secret });
      });

    });

  } finally {
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Computer Parts SERVER Side!");
});

app.listen(port, () => {
  console.log(`Parts manufacture listening on port ${port}`);
});
