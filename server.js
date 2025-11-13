require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const bodyParser = require("body-parser");
const jwt = require("jsonwebtoken"); // <-- ADDED: JWT library

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Debug: check if env is loaded
console.log("🔍 MONGODB_URI:", process.env.MONGODB_URI);

// =======================================================
// 🧠 MONGO CONNECTION
// =======================================================
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('✅ MongoDB connected successfully!'))
  .catch(err => console.error('❌ MongoDB connection error:', err));

// =======================================================
// 🧑 USER SCHEMA
// =======================================================
const UserSchema = new mongoose.Schema({
  name: String,
  email: { type: String, unique: true, required: true },
  password: { type: String, required: true },
  isAdmin: { type: Boolean, default: false}
});
const User = mongoose.model("User", UserSchema);

// =======================================================
// 🔒 AUTHENTICATION MIDDLEWARE
// =======================================================

// NEW: Middleware to verify JWT and check for admin status
const authMiddleware = (req, res, next) => {
    // 1. Get the token from the header (Authorization: Bearer <token>)
    const token = req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
        return res.status(401).json({ message: 'Access denied. No token provided.' });
    }

    try {
        // 2. Verify and decode the token using your JWT_SECRET
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded; // Contains { userId: ..., isAdmin: ... }
        
        // 3. Check if the user is an administrator
        if (!req.user.isAdmin) {
             return res.status(403).json({ message: 'Access denied. Administrator privileges required.' });
        }
        next();
    } catch (ex) {
        // Token is invalid (expired, wrong secret, etc.)
        res.status(400).json({ message: 'Invalid token.' });
    }
};

// =======================================================
// ➡️ USER AUTH ROUTES
// =======================================================

// 1. ✍️ REGISTER / CREATE User (POST /api/users) - OPEN ROUTE
app.post("/api/users", async (req, res) => {
    // ... (rest of registration logic remains the same) ...
    try {
        const { name, email, password } = req.body;
        
        const existing = await User.findOne({ email });
        if (existing) {
            return res.status(400).json({ 
                error: "Email already registered.", 
                message: "This email is already in use." 
            });
        }
        
        // NOTE: In a real app, you must hash the password here (e.g., using bcryptjs)
        const newUser = new User({ name, email, password });
        await newUser.save();

        res.json({ message: "Registration successful!", user: newUser });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 2. 🔑 LOGIN User (POST /api/users/login) - FIXED TO USE JWT
app.post("/api/users/login", async (req, res) => {
    try {
        const { email, password } = req.body;
        
        const user = await User.findOne({ email, password });
        
        if (!user) {
            return res.status(401).json({ message: "Invalid email or password." });
        }

        // --- NEW: CREATE REAL JWT TOKEN ---
        const token = jwt.sign(
            { 
                userId: user._id, 
                isAdmin: user.isAdmin // Include admin status in the payload
            }, 
            process.env.JWT_SECRET, 
            { expiresIn: '1d' }
        );

        // Login successful - send token and user info
        res.json({ 
            message: "Login successful!", 
            user: { id: user._id, name: user.name, email: user.email, isAdmin: user.isAdmin },
            token: token // <-- Real token sent here
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 3. 👓 READ Users (GET /api/users) - ADMIN ONLY
app.get("/api/users", authMiddleware, async (req, res) => { // <-- PROTECTED
    try {
        // Exclude password from query result
        const users = await User.find().select('-password'); 
        res.json(users);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 4. 🔄 UPDATE User Status (PUT /api/users/:id/admin) - ADMIN ONLY
app.put("/api/users/:id/admin", authMiddleware, async (req, res) => { // <-- PROTECTED
    try {
        const userId = req.params.id;
        const { isAdmin } = req.body;
        const requestingUserId = req.user.userId;

        // Security check: Prevent an admin from removing their OWN admin status
        if (requestingUserId === userId && isAdmin === false) {
             return res.status(403).json({ message: "Cannot remove your own admin status." });
        }

        const user = await User.findById(userId);

        if (!user) {
            return res.status(404).json({ message: "User not found." });
        }

        user.isAdmin = isAdmin;
        await user.save();

        res.json({ message: `User ${user.email} admin status updated to ${isAdmin}.`, user: { id: user._id, name: user.name, email: user.email, isAdmin: user.isAdmin } });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// =======================================================
// 🎸 PRODUCT SCHEMA & ADMIN ROUTES
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

// CREATE Product - ADMIN ONLY
app.post("/api/products", authMiddleware, async (req, res) => { // <-- PROTECTED
    try {
        const newProduct = new Product(req.body);
        await newProduct.save();
        res.json(newProduct);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// READ Products - OPEN ROUTE
app.get("/api/products", async (req, res) => {
    try {
        const products = await Product.find();
        res.json(products);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// UPDATE Product - ADMIN ONLY
app.put("/api/products/:id", authMiddleware, async (req, res) => { // <-- PROTECTED
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

// DELETE Product - ADMIN ONLY
app.delete("/api/products/:id", authMiddleware, async (req, res) => { // <-- PROTECTED
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