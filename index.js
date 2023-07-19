const express = require("express");
const mongoose = require("mongoose");
const path = require("node:path");

const app = express();
const port = 3000;
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

mongoose.connect("mongodb://localhost:27017/bucketApp", {
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
// app.post("/place-balls", async (req, res) => {
//   try {
//     const buckets = await Bucket.find({});
//     const balls = req.body.data;

//     buckets.sort((a, b) => calculateEmptyVolume(b) - calculateEmptyVolume(a));
//     const totalEmptyVolume = buckets.reduce(
//       (sum, bucket) => sum + calculateEmptyVolume(bucket),
//       0
//     );

//     let ballsPlaced = 0;
//     let resString="";
//     for (const bucket of buckets) {
//       const emptyVolume = calculateEmptyVolume(bucket);
//       let butcketString=""; 
//       const ballsToPlace = Math.min(
//         balls.length - ballsPlaced,
//         Math.floor(emptyVolume / (balls[0].volume * balls[0].qty))
//       );

//       if (ballsToPlace === 0) {
//         continue;
//       }
//       bucket.filledVolume += ballsToPlace * (balls[0].volume * balls[0].qty);
//       butcketString +=`Bucket ${bucket.name}: Place ${balls[0].qty} ${balls[0].name} Balls`;
//       await bucket.save();
//       ballsPlaced += ballsToPlace;
    
//       balls.splice(0, ballsToPlace);

//       if (balls.length === 0) {
//         break;
//       }
//       resString +=butcketString;
//     }
//     res.send(resString);
//   } catch (error) {
//     console.error("Error placing balls in buckets:", error);
//     res.status(500).send("Error placing balls in buckets");
//   }
// });

// Place balls in buckets
app.post("/place-balls", async (req, res) => {
  try {
    const buckets = await Bucket.find({});
    const balls = req.body.data;

    // buckets.sort((a, b) => calculateEmptyVolume(b) - calculateEmptyVolume(a));
    const totalEmptyVolume = buckets.reduce(
      (sum, bucket) => sum + calculateEmptyVolume(bucket),
      0
    );

    let ballsPlaced = 0;
    let resString = "";
    for (const bucket of buckets) {
      const emptyVolume = calculateEmptyVolume(bucket);
      let bucketString = "";
      const ballsToPlace = Math.min(        
        balls.length - ballsPlaced,
        Math.floor(emptyVolume / (balls[0].volume * balls[0].qty))
      );
      
      if (ballsToPlace === 0) {
        continue;
      }

      const placedBalls = balls.slice(0, ballsToPlace);
      bucket.filledVolume += ballsToPlace * (balls[0].volume * balls[0].qty);
      await bucket.save();
      ballsPlaced += ballsToPlace;
      balls.splice(0, ballsToPlace);

      bucketString += `Bucket ${bucket.name}: Place `;
      for (const ball of placedBalls) {
        bucketString += `${ball.qty} ${ball.name} balls`;
        if (balls.length > 0) {
          bucketString += " and ";
        }
      }
      bucketString += ".\n";
      resString += bucketString;

      if (balls.length === 0) {
        break;
      }
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
