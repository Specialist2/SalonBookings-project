const { error } = require("console");
const express = require("express");
const app = express();
const mysql = require("mysql");
const connection = mysql.createConnection({
  host: "localhost",
  port: 3306,
  user: "root",
  password: "",
  database: "salonbooking",
});
app.get("/", (req, res) => {
  res.render("home.ejs");
});
app.get("/newCustomer", (req, res) => {
  res.render("login.ejs");
});
app.post("/newCustomer", express.urlencoded({ extended: true }), (req, res) => {
  console.log(req.body);
  connection.query(
    `INSERT INTO customers(customer_id, name, email, phone, password, loyalty_points) VALUES('${req.body.customer_id}',
    '${req.body.fullname}','${req.body.email}','${req.body.phone}','${req.body.password}','${req.body.loyalty}')`,
    (err) => {
      if (err) {
        res.json(err);
      } else {
        res.send("Login Successful!!");
      }
    }
  );
});
app.listen(8000, () => console.log("App is running on port 8000"));
