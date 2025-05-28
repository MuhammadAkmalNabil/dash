// Animasi Scroll untuk Hero Section
document.addEventListener("DOMContentLoaded", () => {
    const heroSection = document.getElementById("hero-section");

    // Tambahkan animasi ketika Hero Section masuk viewport
    const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
            if (entry.isIntersecting) {
                heroSection.classList.add("animate-hero");
            }
        });
    });

    observer.observe(heroSection);

    // Event Listener untuk tombol CTA
    const ctaButton = document.getElementById("cta-button");
    ctaButton.addEventListener("click", () => {
        alert("Anda akan diarahkan ke dashboard!");
        window.scrollTo({
            top: document.body.scrollHeight,
            behavior: "smooth",
        });
    });
});

document.addEventListener("DOMContentLoaded", () => {
    const menuIcon = document.getElementById("menu-icon");
    const navMenu = document.getElementById("nav-menu");

    // Toggle navigasi saat ikon menu diklik
    menuIcon.addEventListener("click", () => {
        menuIcon.classList.toggle("active");
        navMenu.classList.toggle("active");
    });
});