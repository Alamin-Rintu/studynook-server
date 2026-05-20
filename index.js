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

    app.delete("/rooms/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await roomsCollection.deleteOne(query);
      res.send(result);
    });

    app.patch("/rooms/:id", async (req, res) => {
      const id = req.params.id;
      const updateRoom = req.body;
      const query = { _id: new ObjectId(id) };
      const update = {
        $set: updateRoom,
      };
      const result = await roomsCollection.updateOne(query, update);
      res.send(result);
    });

    app.post("/booking", async (req, res) => {
      const { roomId, date, startTime, endTime, userId } = req.body;

      const start = +startTime;
      const end = +endTime;

      if (!roomId || !date || !userId || start >= end) {
        return res.status(400).send({
          success: false,
          message: "Invalid booking data",
        });
      }

      const conflict = await bookingCollection.findOne({
        roomId,
        date,
        startTime: { $lt: end },
        endTime: { $gt: start },
      });

      if (conflict) {
        return res.status(400).send({
          success: false,
          message: "This time slot is already booked",
        });
      }

      const result = await bookingCollection.insertOne({
        roomId,
        userId,
        date,
        startTime: start,
        endTime: end,
        createdAt: new Date(),
      });

      res.send({
        success: true,
        message: "Booking successful",
        id: result.insertedId,
      });
    });

    app.get("/booking/:userId", async (req, res) => {
      const userId = req.params.userId;
      const bookings = await bookingCollection
        .find({ userId })
        .sort({ createdAt: -1 })
        .toArray();

      res.send(bookings);
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
