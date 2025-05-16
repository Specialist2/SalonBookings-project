     Tittle:
Salon Booking- GlowMe Beauty Parlour.

 Project Description.
This is a web application for a salon that allows both (guests) and (registered users) to book services. 
It features a clean user interface, service browsing, appointment scheduling and an admin dashboard for managing all customer bookings.


 
         Features

      For Customers:
.Browse available services
. Book appointments as a guest or logged-in user
. Guests must enter name, phone number, and email
. Logged-in users use saved profile info
. Confirmation message after booking (on web page)
. Email/SMS reminder system (scheduled 30 minutes before booking time)

    For Admin:
.View all bookings (guest and logged-in)
. Separate tables for Upcoming and Past  bookings
. View customer name, phone, email, service, date, and time

      Tech Stack

| Layer        | Technology                         

 Frontend     - HTML, CSS, JavaScript, EJS          
 Backend      - Node.js, Express.js                 
 Database     - MySQL                               
 Auth         - express-session (for login)         
 Mail         - Nodemailer (for reminders/emails)   



    Project Structure

    index.js - this is the server
    package.json : dependencies



    Intallation/ set up Inrtuctions
    
    1. Clone the repository
   bash
   git clone https://github.com/specialist2/salon-booking.git
   cd salon-booking

2.Install dependencies
npm install

3. Setup MySQL Database

Create a database (salon_booking) or any other of your choice

Run provided schema 

Update db.js with your credentials

4. start the server
node server.js

5. Run the server
http://localhost:3000(for my case 8000)