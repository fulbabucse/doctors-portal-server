const express = require("express");
const cors = require("cors");
const app = express();
const port = process.env.PORT || 5000;
require("dotenv").config();

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("Doctors Portal Server Running");
});

const { MongoClient, ServerApiVersion } = require("mongodb");
const url = `mongodb+srv://${process.env.DB_USERNAME}:${process.env.DB_PASSWORD}@cluster0.7ywptfp.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(url, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverApi: ServerApiVersion.v1,
});

const dbConnect = async () => {
  try {
    const AppointmentOptions = client
      .db("doctorsPortal")
      .collection("appointmentOptions");

    const Bookings = client.db("doctorsPortal").collection("bookings");

    app.get("/appointmentOptions", async (req, res) => {
      const date = req.query.date;
      const query = {};
      const options = await AppointmentOptions.find(query).toArray();
      const bookingQuery = {
        bookingDate: date,
      };
      const alreadyBooked = await Bookings.find(bookingQuery).toArray();

      options.map((option) => {
        const optionBooked = alreadyBooked.filter(
          (book) => book.treatment === option.name
        );
        const bookingTime = optionBooked.map((book) => book.appointmentTime);
        const restBookingTime = option.slots.filter(
          (appointmentTime) => !bookingTime.includes(appointmentTime)
        );
        option.slots = restBookingTime;
      });
      res.send(options);
    });

    app.post("/bookings", async (req, res) => {
      const bookings = req.body;
      const result = await Bookings.insertOne(bookings);
      res.send(result);
    });
  } finally {
  }
};

dbConnect().catch((err) => console.log(err.name, err, message));

app.listen(port, () => {
  console.log(`Doctors Portal Server Running On: ${port}`);
});
