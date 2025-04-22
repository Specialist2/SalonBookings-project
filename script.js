const images = [
  "images/pic8.jpg",
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
document.getElementById("showLoginBtn").addEventListener("click", function () {
  document.getElementById("loginForm").style.display = "block";
});

document.getElementById("forgot").addEventListener("click", function () {
  alert("Password reset link sent to your email (simulation).");
});
const hamburger = document.getElementById("hamburger");
const navMenu = document.getElementById("navMenu");

hamburger.addEventListener("click", () => {
  navMenu.classList.toggle("active");
});
