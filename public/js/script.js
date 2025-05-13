const images = [
  "images/pic11.jpg",
  "images/pic8-removebg-preview.png",
  "images/pic22-removebg-preview.png",
];

let index = 0;
const img = document.querySelector("#style img");

setInterval(() => {
  index = (index + 1) % images.length;
  console.log(images[index]);
  img.src = images[index];
  img.style.width = "250px";
  img.style.height = "180px";
  img.style.objectFit = "cover";
  img.style.margin = "10px";
  img.style.borderRadius = "12px";
  // img.setAttribute("src", images[index]);
}, 1500);
const form = document.getElementById("booking-form");
const guestFields = document.getElementById("guest-fields");

form.addEventListener("submit", function (e) {
  if (!isLoggedIn && guestFields.style.display === "none") {
    e.preventDefault(); // Stop first submit
    guestFields.style.display = "block"; // Show guest fields
    alert("Please enter your name, email, and phone to complete the booking.");
  }
});

function toggleMenu() {
  document.getElementById("navbarLinks").classList.toggle("active");
}
