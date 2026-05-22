const express = require("express");
const dotenv = require("dotenv");
var cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const { createRemoteJWKSet, jwtVerify } = require("jose-cjs");
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

const JWKS = createRemoteJWKSet(
  new URL(`${process.env.CLIENT_URL}/api/auth/jwks`),
);

const varifyToken = async (req, res, next) => {
  const authHeader = req?.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  const token = authHeader.split(" ")[1];
  if (!token) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  console.log(token);
  try {
    const { payload } = await jwtVerify(token, JWKS);
    console.log(payload);
    next();
  } catch (error) {
    console.log(error);
    return res.status(403).json({
      message: "Forbidden",
    });
  }
};

async function run() {
  try {
    // await client.connect();

    const db = client.db("studyNook");
    const roomsCollection = db.collection("rooms");
    const bookingCollection = db.collection("booking");

    app.post("/rooms", async (req, res) => {
      try {
        const roomsData = req.body;
        console.log(roomsData, "from backend");
        roomsData.hourlyRate = Number(roomsData.hourlyRate);

        const result = await roomsCollection.insertOne(roomsData);

        res.send(result);
      } catch (error) {
        console.log(error);
        res.status(500).send({ success: false });
      }
    });

    app.get("/rooms", async (req, res) => {
      try {
        const { search, amenities, floor } = req.query;
        let query = {};
        if (search) {
          query.roomName = {
            $regex: search,
            $options: "i",
          };
        }

        if (amenities) {
          query.amenities = {
            $in: amenities.split(","),
          };
        }

        if (floor) {
          query.floor = floor;
        }

        const result = await roomsCollection.find(query).toArray();

        res.send(result);
      } catch (error) {
        console.log(error);
        res.status(500).send({
          success: false,
          message: "Failed to fetch rooms",
        });
      }
    });

    app.get("/my-rooms/:id", async (req, res) => {
      try {
        const id = req.params.id;

        const query = {
          ownerId: id,
        };

        const result = await roomsCollection.find(query).toArray();

        res.send(result);
      } catch (error) {
        res.status(500).send({
          success: false,
          message: error.message,
        });
      }
    });

    app.get("/rooms/:id", async (req, res) => {
      try {
        const id = req.params.id;

        if (!ObjectId.isValid(id)) {
          return res.status(400).send({
            success: false,
            message: "Invalid room id",
          });
        }

        const query = {
          _id: new ObjectId(id),
        };

        const result = await roomsCollection.findOne(query);

        res.send(result);
      } catch (error) {
        res.status(500).send({
          success: false,
          message: error.message,
        });
      }
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

    app.post("/booking", varifyToken, async (req, res) => {
      const {
        roomId,
        date,
        startTime,
        endTime,
        userId,
        roomName,
        imageUrl,
        pricePerHour,
      } = req.body;

      const start = +startTime;
      const end = +endTime;

      if (!roomId || !date || !userId || start >= end) {
        return res.status(400).send({
          success: false,
          message: "Invalid booking data",
        });
      }

      const totalHours = end - start;
      const totalCost = totalHours * pricePerHour;

      const conflict = await bookingCollection.findOne({
        roomId,
        date,
        startTime: { $lt: end },
        endTime: { $gt: start },
        status: "confirmed",
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

        roomName,
        imageUrl,
        pricePerHour,
        totalHours,
        totalCost,

        status: "confirmed",

        createdAt: new Date(),
      });

      res.send({
        success: true,
        message: "Booking successful",
        id: result.insertedId,
      });
    });

    app.get("/booking/:userId", varifyToken, async (req, res) => {
      const userId = req.params.userId;
      console.log(userId);
      const bookings = await bookingCollection
        .find({ userId })
        .sort({ createdAt: -1 })
        .toArray();

      res.send(bookings);
    });

    app.delete("/booking/:id", async (req, res) => {
      const id = req.params.id;

      const query = { _id: new ObjectId(id) };

      const result = await bookingCollection.deleteOne(query);

      res.send(result);
    });

    // await client.db("admin").command({ ping: 1 });
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
