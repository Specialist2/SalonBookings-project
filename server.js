const express = require("express");
const app = express();
const mysql = require("mysql");
const bcrypt = require("bcrypt");
const session = require("express-session");
const path = require("path");
const util = require("util");

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

const connection = mysql.createConnection({
  host: process.env.DB_HOST || "localhost",
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASS || "",
  database: process.env.DB_NAME || "salonbooking",
});
connection.connect((err) => {
  if (err) {
    console.error("DB connection error:", err);
    process.exit(1);
  } else {
    console.log("Connected to MySQL DB");
  }
});
const query = util.promisify(connection.query).bind(connection);

app.use(
  session({
    secret: process.env.SESSION_SECRET || "your-strong-secret",
    resave: false,
    saveUninitialized: false,
    cookie: { httpOnly: true, secure: false, maxAge: 1000 * 60 * 60 * 24 },
  })
);

function checkForProtectedRoutes(req, res, next) {
  res.locals.user = req.session.user;
  res.locals.isLoggedIn = !!req.session.user;
  next();
}
app.use(checkForProtectedRoutes);

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.static(path.join(__dirname, "public")));

app.get("/", (req, res) => res.render("index"));
app.get("/login", (req, res) => res.render("login"));
app.get("/register", (req, res) => res.render("register"));
app.get("/about", (req, res) => res.render("about"));
app.get("/services", (req, res) => res.render("service"));
app.get("/careers", (req, res) => res.render("careers"));
app.get("/privacy", (req, res) => res.render("privacy"));
app.get("/logout", (req, res) => {
  req.session.destroy(() => res.redirect("/"));
});

app.post("/login", async (req, res) => {
  const { email, password } = req.body;
  try {
    const rows = await query("SELECT * FROM customers WHERE email = ?", [
      email,
    ]);
    if (!rows.length) return res.status(404).send("User not found");

    const user = rows[0];
    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(401).send("Wrong password");

    req.session.user = {
      customer_id: user.customer_id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      loyalty_points: user.loyalty_points,
    };
    res.redirect("/");
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).send("Internal server error");
  }
});

app.post("/register", async (req, res) => {
  const {
    customer_id,
    fullname,
    email,
    phone,
    password,
    loyalty_points = 0,
  } = req.body;
  if (!customer_id || !fullname || !email || !phone || !password) {
    return res.status(400).send("All fields are required");
  }
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    await query(
      `INSERT INTO customers (customer_id, name, email, phone, password, loyalty_points)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [customer_id, fullname, email, phone, hashedPassword, loyalty_points]
    );
    res.send("SignUp Successful!!");
  } catch (err) {
    if (err.code === "ER_DUP_ENTRY")
      return res.status(409).send("Email already registered");
    console.error("Registration error:", err);
    res.status(500).send("Internal server error");
  }
});

app.get("/book", (req, res) => {
  const isLoggedIn = req.session && req.session.user;
  res.render("index", { isLoggedIn });
});

app.post("/preview", (req, res) => {
  const { service, date, time, name, email, phone } = req.body;
  const appointment_datetime = `${date} ${time}`;

  req.session.previewBooking = {
    service,
    appointment_datetime,
    name,
    email,
    phone,
  };
  res.render("confirm", {
    service,
    appointment_datetime,
    name,
    email,
    phone,
    isLoggedIn: !!req.session.user,
  });
});

app.post("/confirm", async (req, res) => {
  const data = req.session.previewBooking;
  if (!data) return res.redirect("/book");

  try {
    if (req.session.user) {
      await query(
        `INSERT INTO appointment (customer_id, service, appointment_datetime, created_at)
         VALUES (?, ?, ?, NOW())`,
        [req.session.user.customer_id, data.service, data.appointment_datetime]
      );
    } else {
      const result = await query(
        `INSERT INTO guest_customer (name, email, phone) VALUES (?, ?, ?)`,
        [data.name, data.email, data.phone]
      );
      const guestId = result.insertId;

      await query(
        `INSERT INTO appointment (guest_customer_id, service, appointment_datetime, created_at)
         VALUES (?, ?, ?, NOW())`,
        [guestId, data.service, data.appointment_datetime]
      );
    }
    delete req.session.previewBooking;
  const userName = data.name || (req.session.user?.name) || "Guest";
res.render("success", { name: userName });

  } catch (err) {
    console.error("Error confirming booking:", err);
    res.status(500).send("Booking failed");
  }
});

const PORT = process.env.PORT || 8000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
