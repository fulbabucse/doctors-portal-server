const express = require("express");
const cors = require("cors");
const app = express();
const jwt = require("jsonwebtoken");
const port = process.env.PORT || 5000;
require("dotenv").config();

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("Doctors Portal Server Running");
});

const JWTVerify = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).send({ message: "unauthorized access" });
  }
  const token = authHeader.split(" ")[1];
  jwt.verify(token, process.env.JWT_ACCESS_TOKEN, (err, decoded) => {
    if (err) {
      return res.status(403).send({ message: "Forbidden access" });
    }
    req.decoded = decoded;
    next();
  });
};

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
    const Users = client.db("doctorsPortal").collection("users");

    // Main Branches Booking Appointment
    // app.get("/appointmentOptions", async (req, res) => {
    //   const date = req.query.date;
    //   const query = {};
    //   const options = await AppointmentOptions.find(query).toArray();
    //   const bookingQuery = {
    //     bookingDate: date,
    //   };
    //   const alreadyBooked = await Bookings.find(bookingQuery).toArray();

    //   options.map((option) => {
    //     const optionBooked = alreadyBooked.filter(
    //       (book) => book.treatment === option.name
    //     );
    //     const bookingTime = optionBooked.map((book) => book.appointmentTime);
    //     const restBookingTime = option.slots.filter(
    //       (appointmentTime) => !bookingTime.includes(appointmentTime)
    //     );
    //     option.slots = restBookingTime;
    //   });
    //   res.send(options);
    // });

    app.get("/jwt", async (req, res) => {
      const email = req.query.email;
      const query = { email: email };
      const user = await Users.findOne(query);
      if (user) {
        const token = jwt.sign({ email }, process.env.JWT_ACCESS_TOKEN, {
          expiresIn: "2hr",
        });
        return res.send({ accessToken: token });
      }
      res.status(401).send({ message: "unauthorized access" });
    });

    app.get("/appointmentOptions", async (req, res) => {
      const query = {};
      const date = req.query.date;
      const options = await AppointmentOptions.find(query).toArray();
      const bookingQuery = { bookingDate: date };
      const alreadyBooked = await Bookings.find(bookingQuery).toArray();
      options.map((option) => {
        const optionBooked = alreadyBooked.filter(
          (book) => book.treatment === option.name
        );
        const appointmentTime = optionBooked.map(
          (book) => book.appointmentTime
        );

        const restAppointmentTime = option.slots.filter(
          (slot) => !appointmentTime.includes(slot)
        );

        return (option.slots = restAppointmentTime);
      });
      res.send(options);
    });

    app.post("/bookings", async (req, res) => {
      const bookings = req.body;
      const query = {
        bookingDate: bookings.bookingDate,
        treatment: bookings.treatment,
        email: bookings.email,
      };

      const alreadyBooked = await Bookings.find(query).toArray();

      if (alreadyBooked.length) {
        const message = `You already have a booking on ${bookings.bookingDate}`;
        return res.send({ acknowledged: false, message });
      }

      const result = await Bookings.insertOne(bookings);
      res.send(result);
    });

    app.get("/bookings", JWTVerify, async (req, res) => {
      const email = req.query.email;
      const decodedEmail = req.decoded.email;
      if (email !== decodedEmail) {
        return res.status(403).send({ message: "Forbidden access" });
      }
      const query = { email: email };
      const bookings = await Bookings.find(query).toArray();
      res.send(bookings);
    });

    app.post("/users", async (req, res) => {
      const user = req.body;
      const result = await Users.insertOne(user);
      res.send(result);
      console.log(user);
    });
  } finally {
  }
};

dbConnect().catch((err) => console.log(err.name, err, message));

// console.log(process.env.JWT_ACCESS_TOKEN);

app.listen(port, () => {
  console.log(`Doctors Portal Server Running On: ${port}`);
});
