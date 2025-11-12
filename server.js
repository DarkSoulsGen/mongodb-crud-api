require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const bodyParser = require("body-parser");

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(bodyParser.json());

// =======================================================
// 🧠 MONGO CONNECTION
// =======================================================
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
  .then(() => console.log('✅ MongoDB connected successfully!'))
  .catch(err => console.error('❌ MongoDB connection error:', err));

// =======================================================
// 🧑 USER SCHEMA (Unified for Auth)
// =======================================================
// The schema now correctly includes the password field for all user operations.
const UserSchema = new mongoose.Schema({
  name: String,
  email: { type: String, unique: true, required: true },
  password: { type: String, required: true } 
});
const User = mongoose.model("User", UserSchema);

// =======================================================
// ➡️ USER AUTH ROUTES
// (All using the /api/users base path)
// =======================================================

// 1. ✍️ REGISTER / CREATE User (POST /api/users)
app.post("/api/users", async (req, res) => {
  try {
    const { name, email, password } = req.body;
    
    // Check for existing user with the same email
    const existing = await User.findOne({ email });
    if (existing) {
        return res.status(400).json({ 
            error: "Email already registered.", 
            message: "This email is already in use." 
        });
    }

    // Create and save new user
    const newUser = new User({ name, email, password });
    await newUser.save();

    res.json({ message: "Registration successful!", user: newUser });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 2. 🔑 LOGIN User (POST /api/users/login)
app.post("/api/users/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Find a user with matching email AND password
    const user = await User.findOne({ email, password });
    
    if (!user) {
      return res.status(401).json({ message: "Invalid email or password." });
    }

    // Login successful
    res.json({ 
        message: "Login successful!", 
        user: { id: user._id, name: user.name, email: user.email },
        token: "fake-jwt-token" // Placeholder token
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 3. 👓 READ Users (GET /api/users)
app.get("/api/users", async (req, res) => {
  try {
    // Exclude password from query result
    const users = await User.find().select('-password'); 
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// =======================================================
// 🎸 PRODUCT SCHEMA & ROUTES (No Change)
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
// 🌐 DEPLOYMENT FIXES
// =======================================================

// Root route
app.get("/", (req, res) => {
  res.json({
    message: "Welcome to the KnaveTone MERN API!",
    available_endpoints: ["/api/users", "/api/users/login", "/api/products"]
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