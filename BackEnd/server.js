const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const bodyParser = require("body-parser");

const app = express();
// Use process.env.PORT for Render, and default to 5000 locally
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(bodyParser.json());

// MongoDB Connection
mongoose.connect('mongodb+srv://tadakuni761:Knave21@school.osancrw.mongodb.net/GuitarStore?appName=School', {
    // The options are deprecated, so we can remove them
})
.then(() => console.log('✅ MongoDB connected successfully!'))
.catch(err => console.error('❌ MongoDB connection error:', err));

// Schema & Model for Users
const UserSchema = new mongoose.Schema({
    name: String,
    email: String
});
const User = mongoose.model("User", UserSchema);

// ==== CRUD Routes for Users ====
app.post("/api/users", async (req, res) => {
    const {name, email} = req.body;
    try {
        const newUser = new User ({ name, email});
        await newUser.save();
        res.json(newUser);
    } catch (err) {
        res.status(500).json({ error: err.message});
    }
});

app.get("/api/users", async (req, res) => {
    try {
        const users = await User.find();
        res.json(users);
    } catch (err) {
        res.status(500).json({error: err.message});
    }
});

app.put("/api/users/:id", async(req, res) => {
    try{
        const updateUser = await User.findByIdAndUpdate(
            req.params.id,
            { name: req.body.name, email: req.body.email},
            { new: true}
        );
        res.json(updateUser);
    } catch (err) {
        res.status(500).json({ error: err.message});
    }
});

app.delete("/api/users/:id", async (req, res) => {
    try {
        await User.findByIdAndDelete(req.params.id);
        res.json({message: "User deleted successfully"});
    } catch (err) {
        res.status(500).json({error: err.message});
    }
});

// 🎸 PRODUCT SCHEMA & ROUTES
const ProductSchema = new mongoose.Schema({
    name: String,
    brand: String,
    type: String,      // Electric, Acoustic, Bass, Drums, Effects
    price: Number,
    stock: Number,
    image: String,     // Product image URL
    description: String // Product description
});
const Product = mongoose.model("Product", ProductSchema);

// ==== CRUD Routes for Products ====
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
// ✅ FIXES FOR DEPLOYMENT (MUST BE HERE)
// =======================================================

// 1. Root Route Handler (Fixes "Cannot GET /")
app.get("/", (req, res) => {
    res.json({ 
        message: "Welcome to the MERN Backend API!", 
        available_endpoints: ["/api/users", "/api/products"] 
    });
});

// 2. 404 Not Found Handler (MUST be the last route/middleware)
app.use((req, res, next) => {
    res.status(404).json({
        error: "Not Found",
        message: `The endpoint ${req.originalUrl} does not exist.`
    });
});

//Start Server
// Note: We MUST explicitly bind to '0.0.0.0' for Render
app.listen(PORT, '0.0.0.0', () => console.log(`🚀 Server running on port ${PORT}`));