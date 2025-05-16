const heroImages = [
  "/images/imagehero.jpg",
  "/images/imagehero2.jpg",
  "/images/imagehero3.jpg",
];

let currentIndex = 0;

setInterval(() => {
  currentIndex = (currentIndex + 1) % heroImages.length;
  document
    .querySelector(".hero-section")
    .style.setProperty("--hero-bg", `url('${heroImages[currentIndex]}')`);
}, 10000); // Change every 10 seconds
