const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const bodyParser = require("body-parser");

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(bodyParser.json());

// MongoDB Connection
mongoose.connect('mongodb+srv://tadakuni761:Knave21@school.osancrw.mongodb.net/GuitarStore?appName=School')
  .then(() => console.log('✅ MongoDB connected successfully!'))
  .catch(err => console.error('❌ MongoDB connection error:', err));

// =======================================================
// 🧑 USER SCHEMA (Basic CRUD)
// =======================================================
const UserSchema = new mongoose.Schema({
  name: String,
  email: String
});
const User = mongoose.model("User", UserSchema);

// ==== CRUD Routes for Users ====
app.post("/api/users", async (req, res) => {
  const { name, email } = req.body;
  try {
    const newUser = new User({ name, email });
    await newUser.save();
    res.json(newUser);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/users", async (req, res) => {
  try {
    const users = await User.find();
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put("/api/users/:id", async (req, res) => {
  try {
    const updateUser = await User.findByIdAndUpdate(
      req.params.id,
      { name: req.body.name, email: req.body.email },
      { new: true }
    );
    res.json(updateUser);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete("/api/users/:id", async (req, res) => {
  try {
    await User.findByIdAndDelete(req.params.id);
    res.json({ message: "User deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// =======================================================
// 🎸 PRODUCT SCHEMA & ROUTES
// =======================================================
const ProductSchema = new mongoose.Schema({
  name: String,
  brand: String,
  type: String,
  price: Number,
  stock: Number,
  image: String,
  description: String
});
const Product = mongoose.model("Product", ProductSchema);

// CREATE Product
app.post("/api/products", async (req, res) => {
  try {
    const newProduct = new Product(req.body);
    await newProduct.save();
    res.json(newProduct);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// READ Products
app.get("/api/products", async (req, res) => {
  try {
    const products = await Product.find();
    res.json(products);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// UPDATE Product
app.put("/api/products/:id", async (req, res) => {
  try {
    const updatedProduct = await Product.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );
    res.json(updatedProduct);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE Product
app.delete("/api/products/:id", async (req, res) => {
  try {
    await Product.findByIdAndDelete(req.params.id);
    res.json({ message: "Product deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// =======================================================
// 👤 SIMPLE AUTH (no hashing, no JWT)
// =======================================================
const AuthSchema = new mongoose.Schema({
  name: String,
  email: { type: String, unique: true },
  password: String
});
const AuthUser = mongoose.model("AuthUser", AuthSchema);

// REGISTER
app.post("/api/auth/register", async (req, res) => {
  try {
    const { name, email, password } = req.body;
    const existing = await AuthUser.findOne({ email });
    if (existing) return res.status(400).json({ message: "Email already registered." });

    const newUser = new AuthUser({ name, email, password });
    await newUser.save();

    res.json({ message: "Registration successful!" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// LOGIN
app.post("/api/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await AuthUser.findOne({ email, password });
    if (!user) return res.status(401).json({ message: "Invalid email or password." });

    res.json({ message: "Login successful!", user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// =======================================================
// 🌐 DEPLOYMENT FIXES
// =======================================================

// Root route
app.get("/", (req, res) => {
  res.json({
    message: "Welcome to the KnaveTone MERN API!",
    available_endpoints: ["/api/users", "/api/products", "/api/auth"]
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: "Not Found",
    message: `The endpoint ${req.originalUrl} does not exist.`
  });
});

// Start Server
app.listen(PORT, "0.0.0.0", () =>
  console.log(`🚀 Server running on port ${PORT}`)
);
