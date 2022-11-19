const express = require("express");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const cors = require("cors");
const app = express();
const jwt = require("jsonwebtoken");
const port = process.env.PORT || 5000;
require("dotenv").config();

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("Welcome to Doctors Portal Server");
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
    const Doctors = client.db("doctorsPortal").collection("doctors");

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

    const verifyAdmin = async (req, res, next) => {
      const decodedEmail = req.decoded.email;
      const filterEmail = { email: decodedEmail };
      const user = await Users.findOne(filterEmail);

      if (user?.role !== "Admin") {
        return res.status(401).send({ message: "Unauthorized Access" });
      }
      next();
    };

    app.get("/doctors", JWTVerify, verifyAdmin, async (req, res) => {
      const query = {};
      const doctors = await Doctors.find(query).toArray();
      res.send(doctors);
    });

    app.post("/doctors", JWTVerify, verifyAdmin, async (req, res) => {
      const doctor = req.body;
      const result = await Doctors.insertOne(doctor);
      res.send(result);
    });

    app.delete("/doctors/:id", JWTVerify, verifyAdmin, async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const result = await Doctors.deleteOne(query);
      res.send(result);
    });

    app.get("/jwt", async (req, res) => {
      const email = req.query.email;
      const query = { email: email };
      const user = await Users.findOne(query);
      if (user) {
        const token = jwt.sign({ email }, process.env.JWT_ACCESS_TOKEN, {
          expiresIn: "1d",
        });
        return res.send({ accessToken: token });
      }
      res.status(401).send({ message: "unauthorized access" });
    });

    app.get("/appointmentSpeciality", async (req, res) => {
      const query = {};
      const result = await AppointmentOptions.find(query)
        .project({ name: 1 })
        .toArray();
      res.send(result);
    });

    app.get("/appointmentOptions", async (req, res) => {
      const query = {};
      const date = req.query.date;
      const options = await AppointmentOptions.find(query)
        .sort({ price: 1 })
        .toArray();
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

    app.get("/bookings/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const booking = await Bookings.findOne(query);
      res.send(booking);
    });

    app.get("/users", JWTVerify, async (req, res) => {
      const query = {};
      const users = await Users.find(query).toArray();
      res.send(users);
    });

    app.get("/users/admin/:email", async (req, res) => {
      const email = req.params.email;
      const query = { email };
      const user = await Users.findOne(query);
      res.send({ isAdmin: user?.role === "Admin" });
    });

    app.post("/users", async (req, res) => {
      const user = req.body;
      const result = await Users.insertOne(user);
      res.send(result);
    });

    app.put("/users/admin/:id", JWTVerify, verifyAdmin, async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const option = { upsert: true };
      const updateInfo = {
        $set: {
          role: "Admin",
        },
      };
      const result = await Users.updateOne(query, updateInfo, option);
      res.send(result);
    });
  } finally {
  }
};

dbConnect().catch((err) => console.log(err.name, err, message));

// console.log(process.env.JWT_ACCESS_TOKEN);

app.listen(port, () => {
  console.log(`Doctors Portal Server Running On: ${port}`);
});
