const express = require("express");
const mongoose = require("mongoose");
const path = require("node:path");
require('dotenv').config();
const app = express();
const port = 3000;
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

mongoose.connect(process.env.MONGO_URL, {  
  useNewUrlParser: true,
  useUnifiedTopology: true,
});
const db = mongoose.connection;

const BucketSchema = new mongoose.Schema({
  name: String,
  volume: Number,
  filledVolume: Number,
});

const Bucket = mongoose.model("Bucket", BucketSchema);

const BallSchema = new mongoose.Schema({
  name: String,
  volume: Number,
});
const Ball = mongoose.model("Ball", BallSchema);

app.use(express.json());

function calculateEmptyVolume(bucket) {
  return bucket.volume - bucket.filledVolume;
}

// View Engine Setup
app.set("views", path.join(__dirname));
app.set("view engine", "ejs");

app.get("/",async (req, res) => {
  res.render("form");
});

app.get("/allBalls",async (req, res) => {
  const balls = await Ball.find({});
  res.send({balls})
});


// Save a bucket
app.post("/bucket", async (req, res) => {
  const { bucketName, volume } = req.body;
  try {
    await Bucket.create({
      name: bucketName,
      volume: parseFloat(volume),
      filledVolume: 0,
    });
    res.send("Bucket saved successfully");
  } catch (error) {
    console.error("Error saving bucket:", error);
    res.status(500).send("Error saving bucket");
  }
});

// Save a ball
app.post("/ball", async (req, res) => {
  const { ballName, volume } = req.body;
  try {
    await Ball.create({
      name: ballName,
      volume: parseFloat(volume),
    });
    res.send("Ball saved successfully");
  } catch (error) {
    console.error("Error saving ball:", error);
    res.status(500).send("Error saving ball");
  }
});

// Place balls in buckets
app.post("/place-balls", async (req, res) => {
  try {
    const buckets = await Bucket.find({});
    let balls = req.body.data;
    let resString = "";

    let bucketIndex = 0;
    let ballIndex = 0;

    while (bucketIndex < buckets.length && ballIndex < balls.length) {
      const bucket = buckets[bucketIndex];
      resString+=`Bucket ${bucket.name}: `;

      if (bucket.filledVolume === bucket.volume) {
        bucketIndex++;
        continue;
      }
      let emptyVolume = calculateEmptyVolume(bucket);
      do {
        const ball = balls[ballIndex];
        const total = ball.qty * ball.volume;

        if (emptyVolume > total) {
          bucket.filledVolume += total;
          emptyVolume -= total;
          balls.splice(ballIndex, 1);
          await bucket.save();
          resString += `Place ${total} ${ball.name} balls and`
        } else {
          const finalQty = Math.floor(emptyVolume / ball.volume);
          const remainingQty = ball.qty - finalQty;
          bucket.filledVolume += finalQty * ball.volume;
          emptyVolume = 0;

          if (remainingQty === 0) {
            balls.splice(ballIndex, 1);
          } else {
            balls[ballIndex].qty = remainingQty;
          }
          resString += ` Place ${total} ${ball.name} balls and`
          await bucket.save();
        }
      } while (emptyVolume > 0 && ballIndex < balls.length);
      resString = resString.slice(0, -3)+'\n';
      bucketIndex++;
    }

    res.send(resString);
  } catch (error) {
    console.error("Error placing balls in buckets:", error);
    res.status(500).send("Error placing balls in buckets");
  }
});


// Handle MongoDB connection errors
db.on("error", err => {
  console.error("Error connecting to MongoDB:", err);
});

// Handle MongoDB connection success
db.once("open", () => {
  console.log("Connected to MongoDB successfully");

  // Start the server
  app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
  });
});
