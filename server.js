const express = require("express");
const app = express();
const mysql = require("mysql");
const bcrypt = require("bcrypt");
const session = require("express-session");
const path = require("path");

const connection = mysql.createConnection({
  host: "localhost",
  port: 3306,
  user: "root",
  password: "",
  database: "salonbooking",
});

// Middleware
app.use(
  session({
    secret: "secret",
    resave: false,
    saveUninitialized: false,
  })
);

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

const protectedRoutes = [];

function checkForProtectedRoutes(req, res, next) {
  if (protectedRoutes.includes(req.originalUrl) && !req.session.user) {
    return res.redirect("/");
  }
  res.locals.user = req.session.user;
  res.locals.isLoggedIn = !!req.session.user;
  next();
}

// Views & static
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.static("public"));
app.use(checkForProtectedRoutes);

// Routes
app.get("/", (req, res) => res.render("index.ejs"));
app.get("/login", (req, res) => res.render("login.ejs"));
app.get("/register", (req, res) => res.render("register.ejs"));
app.get("/about", (req, res) => res.render("about.ejs"));
app.get("/services", (req, res) => res.render("service.ejs"));
app.get("/careers", (req, res) =>
  res.render("careers", { siteName: "GlowMe Beauty Parlour" })
);
app.get("/privacy", (req, res) =>
  res.render("privacy", { siteName: "GlowMe Beauty Parlour" })
);

app.get("/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) return res.status(500).send("Error logging out");
    res.redirect("/");
  });
});

// Login handler
app.post("/login", (req, res) => {
  const { email, password } = req.body;
  connection.query(
    `SELECT * FROM customers WHERE email = ?`,
    [email],
    (err, data) => {
      if (err) return res.status(500).send("Internal server error");
      if (data.length === 0) return res.send("User not found");

      bcrypt.compare(password, data[0].password, (err, result) => {
        if (err) return res.status(500).send("Internal server error");
        if (result) {
          req.session.user = data[0];
          return res.redirect("/");
        } else {
          return res.send("Wrong password provided");
        }
      });
    }
  );
});

// Register
app.post("/register", (req, res) => {
  const { customer_id, fullname, email, phone, password, loyalty_points } =
    req.body;
  bcrypt.hash(password, 10, (err, hashedPassword) => {
    if (err) return res.status(500).send("Password hashing failed");

    connection.query(
      `INSERT INTO customers (customer_id, name, email, phone, password, loyalty_points) VALUES (?, ?, ?, ?, ?, ?)`,
      [customer_id, fullname, email, phone, hashedPassword, loyalty_points],
      (err) => {
        if (err) return res.json(err);
        res.send("SignUp Successful!!");
      }
    );
  });
});

// Helper: Convert 12-hour to 24-hour format
function convertTo24Hour(timeStr) {
  const [time, modifier] = timeStr.split(" ");
  let [hours, minutes] = time.split(":");
  if (modifier === "PM" && hours !== "12") hours = parseInt(hours, 10) + 12;
  if (modifier === "AM" && hours === "12") hours = "00";
  return `${hours}:${minutes}`;
}

// Appointment handler
app.post("/api/appointments", (req, res) => {
  const { name, email, phone, service, date, time } = req.body;

  if (!service || !date || !time) {
    return res.status(400).send("Missing required fields");
  }

  // Map service names directly
  const serviceTypeMap = {
    Facial: "Facial",
    Massage: "Massage",
    Pedicures: "Pedicures",
    Braiding: "Braiding",
    Haircut: "Haircut",
    // Add any other services here
  };

  const serviceType = serviceTypeMap[service];
  if (!serviceType) {
    return res.status(400).json({ error: "Invalid service selected" });
  }

  const appointmentDate = `${date} ${convertTo24Hour(time)}:00`;
  const customerId = req.session.user ? req.session.user.customer_id : null;

  if (!customerId && (!name || !email || !phone)) {
    return res
      .status(400)
      .json({ error: "Guest must provide name, email, and phone" });
  }

  if (!customerId) {
    // Guest booking
    connection.query(
      "INSERT INTO guest_customers (name, email, phone) VALUES (?, ?, ?)",
      [name, email, phone],
      (err, result) => {
        if (err) {
          console.error("Guest insert error:", err);
          return res.status(500).json({ error: "Guest creation failed" });
        }

        const guestCustomerId = result.insertId;
        connection.query(
          `INSERT INTO appointments (customer_id, guest_customer_id, service_type, appointment_date, status)
           VALUES (?, ?, ?, ?, 'pending')`,
          [null, guestCustomerId, serviceType, appointmentDate],
          (err) => {
            if (err) {
              console.error("Appointment insert error:", err);
              return res
                .status(500)
                .json({ error: "Appointment creation failed" });
            }
            res.redirect("/?booking=success");
          }
        );
      }
    );
  } else {
    // Logged-in customer booking
    connection.query(
      `INSERT INTO appointments (customer_id, guest_customer_id, service_type, appointment_date, status)
       VALUES (?, ?, ?, ?, 'pending')`,
      [customerId, null, serviceType, appointmentDate],
      (err) => {
        if (err) {
          console.error("Appointment insert error:", err);
          return res.status(500).json({ error: "Appointment creation failed" });
        }
        res.json({ message: "Appointment booked (customer)" });
      }
    );
  }
});

app.listen(8000, () => {
  console.log("Server is running on port 8000");
});
