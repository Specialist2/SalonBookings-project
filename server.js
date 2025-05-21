const express = require("express");
const app = express();
const mysql = require("mysql");
const bcrypt = require("bcrypt");
const session = require("express-session");
const path = require("path");
const util = require("util");
const saltRounds = 10;
const multer = require("multer");

require("dotenv").config(); // Load .env

const upload = multer({ dest: "uploads/" }); // Temporary storage

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

// Updated login route (only one, with success message support)
app.get("/login", (req, res) => {
  const success = req.query.success || null;
  res.render("login", { success });
});

app.get("/register", (req, res) => res.render("register"));
app.get("/about", (req, res) => res.render("about"));
app.get("/services", (req, res) => res.render("service"));
app.get("/careers", (req, res) => {
  res.render("careers", { siteName: "GlowMe Beauty Parlour" });
});
app.get("/contact", (req, res) => {
  res.render("contact", { siteName: "GlowMe Beauty Parlour" });
});

app.get("/privacy", (req, res) => {
  res.render("privacy", { siteName: "GlowMe Beauty Parlour" });
});

app.get("/logout", (req, res) => {
  req.session.destroy(() => res.redirect("/"));
});
app.get("/admin", (req, res) => {
  res.redirect("/admin/login");
});
app.get("/admin/login", (req, res) => {
  res.render("adminLogin", { error: null });
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
  const { fullname, email, phone, password } = req.body;

  if (!fullname || !email || !phone || !password) {
    return res.status(400).send("All fields are required");
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    await query(
      `INSERT INTO customers (name, email, phone, password)
       VALUES (?, ?, ?, ?)`,
      [fullname, email, phone, hashedPassword]
    );
    res.redirect("/login?success=Sign-up successful. Please proceed to login");
  } catch (err) {
    if (err.code === "ER_DUP_ENTRY") {
      return res.status(409).send("Email already registered");
    }
    console.error("Registration error:", err);
    res.status(500).send("Internal server error");
  }
});
// Show admin registration form
app.get("/admin/register", (req, res) => {
  res.render("adminRegister", { error: null });
});

// Handle admin registration form submit
app.post("/admin/register", async (req, res) => {
  const { name, email, phone, password, confirmPassword } = req.body;

  if (!name || !email || !phone || !password || !confirmPassword) {
    return res.render("adminRegister", { error: "All fields are required." });
  }

  if (password !== confirmPassword) {
    return res.render("adminRegister", { error: "Passwords do not match." });
  }

  try {
    // Hash password
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Save admin in DB (adjust to your DB query method)
    const sql =
      "INSERT INTO admin (name, email, phone, password) VALUES (?, ?, ?, ?)";
    connection.query(
      sql,
      [name, email, phone, hashedPassword],
      (err, results) => {
        if (err) {
          if (err.code === "ER_DUP_ENTRY") {
            return res.render("adminRegister", {
              error: "Email already exists.",
            });
          }
          return res.render("adminRegister", { error: "Database error." });
        }
        res.redirect("/admin/login");
      }
    );
  } catch (error) {
    res.render("adminRegister", { error: "Server error." });
  }
});

app.get("/book", (req, res) => {
  const isLoggedIn = req.session && req.session.user;
  res.render("booking", { isLoggedIn });
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
    const userName = data.name || req.session.user?.name || "Guest";
    res.render("success", { name: userName });
  } catch (err) {
    console.error("Error confirming booking:", err);
    res.status(500).send("Booking failed");
  }
});
app.post("/contact", async (req, res) => {
  const { name, phone, email, message } = req.body;

  if (!name || !phone || !email || !message) {
    return res.status(400).send("All fields are required");
  }

  try {
    await query(
      "INSERT INTO contact_messages (name, phone, email, message, created_at) VALUES (?, ?, ?, ?, NOW())",
      [name, phone, email, message]
    );

    // Respond with a thank you page
    res.render("contact-success", {
      username: name,
      phone: phone,
    });
  } catch (err) {
    console.error("Contact form error:", err);
    res.status(500).send("Internal server error");
  }
});

app.post("/admin/login", async (req, res) => {
  const { email, password } = req.body;

  connection.query(
    "SELECT * FROM admin WHERE email = ?",
    [email],
    async (err, results) => {
      if (err) return res.status(500).send("Server error");
      if (results.length === 0) return res.status(401).send("Admin not found");

      const admin = results[0];

      const isMatch = await bcrypt.compare(password, admin.password);
      if (!isMatch) return res.status(401).send("Incorrect password");

      // Save admin session
      req.session.adminId = admin.id;
      req.session.isAdmin = true;

      // Save admin name for displaying in dashboard
      req.session.adminName = admin.name; // <--- Add this

      res.redirect("/admin/dashboard");
    }
  );
});

function isAdmin(req, res, next) {
  if (req.session && req.session.isAdmin) return next();
  res.redirect("/admin/login");
}

app.get("/admin/dashboard", (req, res) => {
  const adminName = req.session.adminName || "Admin";
  res.render("adminDashboard", { adminName });
});
app.get("/admin/logout", (req, res) => {
  req.session.destroy();
  res.redirect("/admin/login");
});
app.get("/admin/bookings", isAdmin, async (req, res) => {
  try {
    const bookings = await query(
      `SELECT appointment.id, appointment.service, appointment.appointment_datetime, appointment.created_at,
        customers.name AS customer_name, customers.email AS customer_email, customers.phone AS customer_phone,
        guest_customer.name AS guest_name, guest_customer.email AS guest_email, guest_customer.phone AS guest_phone
      FROM appointment
      LEFT JOIN customers ON appointment.customer_id = customers.customer_id
      LEFT JOIN guest_customer ON appointment.guest_customer_id = guest_customer.id
      ORDER BY appointment.appointment_datetime DESC`
    );
    res.render("adminBookings", { adminName: req.session.adminName, bookings });
  } catch (err) {
    console.error("Error fetching bookings:", err);
    res.status(500).send("Internal server error");
  }
});
app.post("/admin/bookings/delete", isAdmin, async (req, res) => {
  const { id } = req.body;
  if (!id) return res.status(400).send("Booking ID required");

  try {
    await query("DELETE FROM appointment WHERE id = ?", [id]);
    res.redirect("/admin/bookings");
  } catch (err) {
    console.error("Error deleting booking:", err);
    res.status(500).send("Internal server error");
  }
});

// View users
app.get("/admin/users", isAdmin, async (req, res) => {
  try {
    const users = await query("SELECT * FROM customers");
    res.render("adminUsers", { adminName: req.session.adminName, users });
  } catch (err) {
    console.error("Error fetching users:", err);
    res.status(500).send("Internal server error");
  }
});

// Block/unblock user
app.post("/admin/users/toggle-block", isAdmin, async (req, res) => {
  const { userId, block } = req.body;
  if (!userId) return res.status(400).send("User ID required");

  try {
    await query("UPDATE customers SET blocked = ? WHERE customer_id = ?", [
      block === "true" ? 1 : 0,
      userId,
    ]);
    res.redirect("/admin/users");
  } catch (err) {
    console.error("Error updating user block status:", err);
    res.status(500).send("Internal server error");
  }
});
app.get("/admin/reports", isAdmin, async (req, res) => {
  try {
    // Example: Bookings per day last 7 days
    const stats = await query(
      `SELECT DATE(appointment_datetime) AS day, COUNT(*) AS total_bookings
       FROM appointment
       WHERE appointment_datetime >= CURDATE() - INTERVAL 7 DAY
       GROUP BY day
       ORDER BY day DESC`
    );

    res.render("adminReports", { adminName: req.session.adminName, stats });
  } catch (err) {
    console.error("Error fetching reports:", err);
    res.status(500).send("Internal server error");
  }
});
app.get("/admin/messages", isAdmin, async (req, res) => {
  try {
    const messages = await query(
      "SELECT * FROM contact_messages ORDER BY created_at DESC"
    );
    res.render("clientMessages", {
      messages,
      adminName: req.session.adminName,
    });
  } catch (err) {
    console.error("Error loading messages:", err);
    res.status(500).send("Internal server error");
  }
});

const PORT = process.env.PORT || 8000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
