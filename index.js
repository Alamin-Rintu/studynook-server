const express = require("express");
const dotenv = require("dotenv");
var cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());
const port = process.env.PORT;

const uri = process.env.MONGODB_URI;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    await client.connect();

    const db = client.db("studyNook");
    const roomsCollection = db.collection("rooms");
    const bookingCollection = db.collection("booking");

    app.post("/rooms", async (req, res) => {
      const roomsData = req.body;
      const result = await roomsCollection.insertOne(roomsData);
      res.send(result);
    });

    app.get("/rooms", async (req, res) => {
      const cursor = roomsCollection.find();
      const result = await cursor.toArray();
      res.send(result);
    });

    app.get("/rooms/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await roomsCollection.findOne(query);
      res.send(result);
    });

    app.get("/my-rooms/:id", async (req, res) => {
      const id = req.params.id;
      const query = {
        ownerId: id,
      };
      const result = await roomsCollection.find(query).toArray();
      res.send(result);
    });

    app.post("/booking", async (req, res) => {
      const bookingData = req.body;
      const result = await bookingCollection.insertOne(bookingData);
      res.send(result);
    });

    app.get("/booking/:userId", async (req, res) => {
      const userId = req.params.userId;
      const result = await bookingCollection.find({ userId }).toArray();
      res.send(result);
    });

    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!",
    );
  } finally {
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Hello World!");
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
