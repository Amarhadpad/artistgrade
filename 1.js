const express = require("express");
const path = require("path");

const app = express();
const PORT = 3000;

// Middleware to serve static files (CSS, JS, Images)
app.use("/public", express.static(path.join(__dirname, "public")));

// Routes to render your HTML pages

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "views/pages/index.html"));
});

app.get("/about", (req, res) => {
  res.sendFile(path.join(__dirname, "views/pages/about.html"));
});

app.get("/contactus", (req, res) => {
  res.sendFile(path.join(__dirname, "views/pages/contactus.html"));
});

app.get("/login", (req, res) => {
  res.sendFile(path.join(__dirname, "views/pages/login.html"));
});

app.get("/shop", (req, res) => {
  res.sendFile(path.join(__dirname, "views/pages/shop.html"));
});
app.get("/shop1", (req, res) => {
  res.sendFile(path.join(__dirname, "views/pages/collection.html"));
});

app.get("/privacy", (req, res) => {
  const filePath = path.join(__dirname, "Documents", "ArtistGrade_Privacy_Policy.pdf");
  res.download(filePath, "ArtistGrade_Privacy_Policy.pdf", (err) => {
    if (err) {
      console.error("Error sending the file:", err);
      res.status(500).send("Could not download the file.");
    }
  });
});
app.get("/product_details", (req, res) => {
  res.sendFile(path.join(__dirname, "views/pages/product_details.html"));
});

//login and register pages
app.get("/login", (req, res) => {
  res.sendFile(path.join(__dirname, "views/pages/login.html"));
});

app.get("/register", (req, res) => {       
  res.sendFile(path.join(__dirname, "views/pages/register.html"));
});

// Admin panel routes
app.get("/Admin", (req, res) => {
  res.sendFile(path.join(__dirname, "views/pages/adminpanel/dashboard.html"));
});
// Admin panel products route
app.get("/products", (req, res) => {
  res.sendFile(path.join(__dirname, "views/pages/adminpanel/products.html"));
});
// Admin panel order route
app.get("/orders", (req, res) => {
  res.sendFile(path.join(__dirname, "views/pages/adminpanel/orders.html"));
});
// Admin panel users route
app.get("/user", (req, res) => { 
  res.sendFile(path.join(__dirname, "views/pages/adminpanel/users.html"));
});
// Serve shop.html
app.get("/shop", (req, res) => {
  res.sendFile(path.join(__dirname, "views/pages/shop.html"));
});
// Google login route
app.get("/auth/google",
  passport.authenticate("google", { scope: ["profile", "email"] })
);

// Callback
app.get("/auth/google/callback",
  passport.authenticate("google", { failureRedirect: "/login" }),
  (req, res) => {
    res.redirect("/"); // Redirect to homepage after login
  }
);

// Logout
app.get("/logout", (req, res) => {
  req.logout(() => res.redirect("/"));
});


// ...add more routes here for other pages as needed...

// Start server
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
