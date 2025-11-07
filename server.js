const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const bodyParser = require("body-parser");

const app = express();
const PORT = process.env.PORT || 5000;

//Middleware
app.use(cors());
app.use(bodyParser.json());

//MongoDB Connection
mongoose.connect('mongodb+srv://tadakuni761:Knave21@school.osancrw.mongodb.net/?appName=School', {
    useNewUrlParser: true,
    useUnifiedTopology: true
})
.then(() => console.log('✅ MongoDB connected successfully!'))
.catch(err => console.error('❌ MongoDB connection error:', err));

//Schema & Model
const UserSchema = new mongoose.Schema({
    name: String,
    email: String
});
const User = mongoose.model("User", UserSchema);

// ==== CRUD Routes ====

//CREATE 
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

//Read
app.get("/api/users", async (req, res) => {
    try {
        const users = await User.find();
        res.json(users);
    } catch (err) {
        res.status(500).json({error: err.message});
    }
});

//UPDATE
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

//DELETE
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
    type: String,       // Electric, Acoustic, Bass, Drums, Effects
    price: Number,
    stock: Number,
    image: String,      // Product image URL
    description: String // Product description
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


//Start Server
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));