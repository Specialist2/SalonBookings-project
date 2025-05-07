const express = require("express");
const app = express();
const mysql = require("mysql");
const bcrypt = require("bcrypt");
const session = require("express-session");

const connection = mysql.createConnection({
  host: "localhost",
  port: 3306,
  user: "root",
  password: "",
  database: "salonbooking",
});

app.use(
  session({
    secret: "secret",
    resave: false,
    saveUninitialized: false,
  })
);

const protectedRoutes = [];

// Middleware to check for protected routes
function checkForProtectedRoutes(req, res, next) {
  if (protectedRoutes.includes(req.originalUrl) && !req.session.user) {
    // If user is not logged in, redirect to login page
    return res.redirect("/");
  }
  // Make user info available in views
  res.locals.user = req.session.user;
  res.locals.isLoggedIn = !!req.session.user;
  next();
}

app.use(checkForProtectedRoutes);

app.use(express.static("public"));
app.get("/", (req, res) => {
  res.render("index.ejs");
});

app.get("/login", (req, res) => {
  res.render("login.ejs");
});

// Handle login
app.post("/login", express.urlencoded({ extended: true }), (req, res) => {
  const { email, password } = req.body;

  // Query the database to find the user by email
  connection.query(
    `SELECT * FROM customers WHERE email = ?`,
    [email],
    (err, data) => {
      if (err) {
        return res.status(500).send("Internal server error");
      }

      // If user is not found
      if (data.length === 0) {
        return res.send("User not found for the email provided");
      }

      // Compare the entered password with the hashed password in the database
      bcrypt.compare(password, data[0].password, (err, result) => {
        if (err) {
          return res.status(500).send("Internal server error");
        }

        // If the password is correct, log the user in and redirect
        if (result) {
          console.log("Successful login");
          req.session.user = data[0]; // Save user info in session
          return res.redirect("/"); // Redirect to the home page
        } else {
          console.log("Wrong password");
          return res.send("Wrong password provided");
        }
      });
    }
  );
});

app.get("/register", (req, res) => {
  res.render("register.ejs");
});

app.get("/about", (req, res) => {
  res.render("about.ejs");
});
app.get("/services", (req, res) => {
  res.render("service.ejs");
});

// Handle register
app.post("/register", express.urlencoded({ extended: true }), (req, res) => {
  const { customer_id, fullname, email, phone, password, loyalty_points } =
    req.body;

  // Hash the password before saving to database
  bcrypt.hash(password, 10, (err, hashedPassword) => {
    if (err) {
      return res
        .status(500)
        .send("Internal server error during password hashing");
    }

    connection.query(
      `INSERT INTO customers (customer_id, name, email, phone, password, loyalty_points) VALUES (?, ?, ?, ?, ?, ?)`,
      [customer_id, fullname, email, phone, hashedPassword, loyalty_points],
      (err) => {
        if (err) {
          return res.json(err);
        } else {
          return res.send("SignUp Successful!!");
        }
      }
    );
  });
});

app.get("/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).send("Error logging out");
    }
    res.redirect("/"); // Redirect to the home page after logout
  });
});

app.listen(8000, () => {
  console.log("Server is running on port 8000");
});
