require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const bodyParser = require("body-parser");
const jwt = require("jsonwebtoken"); 
const path = require('path');
const fs = require('fs');
// const bcrypt = require("bcryptjs"); // Omitted as per user's preference for plain-text passwords
const multer = require('multer'); 

const app = express();
const PORT = process.env.PORT || 5000;

// =======================================================
// ⬇️ MULTER CONFIGURATION (For Profile Picture Upload)
// =======================================================
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)){
    fs.mkdirSync(uploadDir);
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname));
  }
});

const upload = multer({ 
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    fileFilter: (req, file, cb) => {
        if (!file.mimetype.startsWith('image/')) {
            return cb(new Error('Only image files are allowed!'), false);
        }
        cb(null, true);
    }
});
// =======================================================

// Middleware
app.use(cors());
// Serve static files from the 'uploads' directory
app.use('/uploads', express.static(path.join(__dirname, 'uploads'))); 
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

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
  firstName: { type: String, required: true },
  middleName: String,
  lastName: { type: String, required: true },
  email: { type: String, unique: true, required: true },
  password: { type: String, required: true }, 
  profilePicture: String, 
  phoneNumber: String,
  address: String,
  age: Number,
  isAdmin: { type: Boolean, default: false },
}, { timestamps: true });

const User = mongoose.model("User", UserSchema);

// =======================================================
// 🎸 PRODUCT SCHEMA
// =======================================================
const ProductSchema = new mongoose.Schema({
    name: { type: String, required: true },
    brand: { type: String, required: true },
    type: { type: String, required: true }, 
    price: { type: Number, required: true },
    stock: { type: Number, required: true, min: 0, default: 0 },
    image: { type: String, required: true }, 
    description: String,
}, { timestamps: true });

const Product = mongoose.model("Product", ProductSchema);

// =======================================================
// 🛡️ AUTH MIDDLEWARE
// =======================================================
const authMiddleware = (req, res, next) => {
    const token = req.header('Authorization');
    if (!token) {
        return res.status(401).json({ message: 'No token, authorization denied' });
    }
    try {
        const tokenString = token.replace('Bearer ', '');
        const decoded = jwt.verify(tokenString, process.env.JWT_SECRET);
        req.user = decoded;
        next();
    } catch (e) {
        res.status(401).json({ message: 'Token is not valid' });
    }
};

// =======================================================
// 🧑 USER ROUTES
// =======================================================

// 1. REGISTER User (POST /api/users) - PUBLIC
app.post("/api/users", async (req, res) => {
  const { firstName, middleName, lastName, email, password, phoneNumber, address, age } = req.body; 

  try {
    let user = await User.findOne({ email });
    if (user) {
      return res.status(400).json({ error: "Email already registered" });
    }

    // WARNING: Plain text password storage is insecure!
    user = new User({
        firstName, middleName, lastName, email, password, phoneNumber, address, age
    });

    await user.save();
    res.status(201).json({ message: "User registered successfully" });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error during registration." });
  }
});


// 2. LOGIN User (POST /api/users/login) - PUBLIC
app.post("/api/users/login", async (req, res) => {
    const { email, password } = req.body;

    try {
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ message: "Invalid Credentials" });
        }

        // Non-hashed password comparison
        const isMatch = (password === user.password); 
        if (!isMatch) {
            return res.status(400).json({ message: "Invalid Credentials" });
        }

        const token = jwt.sign(
            { id: user._id, isAdmin: user.isAdmin },
            process.env.JWT_SECRET,
            { expiresIn: '1h' }
        );

        res.json({ token, isAdmin: user.isAdmin, firstName: user.firstName });

    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error during login." });
    }
});

// 3. GET Profile (GET /api/users/profile) - PROTECTED
app.get('/api/users/profile', authMiddleware, async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('-password'); 
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        
        if (user.profilePicture && !user.profilePicture.startsWith('http')) {
            const fullUrl = `${req.protocol}://${req.get('host')}/${user.profilePicture}`;
            user._doc.profilePicture = fullUrl; 
        }

        res.json(user);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error fetching profile.' });
    }
});


// 4. UPDATE Profile (PUT /api/users/profile) - PROTECTED
app.put('/api/users/profile', authMiddleware, upload.single('profilePictureFile'), async (req, res) => {
    try {
        const updates = req.body;
        
        if (req.file) {
            updates.profilePicture = 'uploads/' + req.file.filename;
        } else if (updates.clearProfilePicture === 'true') {
            const user = await User.findById(req.user.id);
            if (user && user.profilePicture && user.profilePicture.startsWith('uploads/')) {
                const oldPath = path.join(__dirname, user.profilePicture);
                if (fs.existsSync(oldPath)) {
                    fs.unlinkSync(oldPath);
                }
            }
            updates.profilePicture = ''; 
        }

        delete updates.email;
        delete updates.password;
        delete updates.isAdmin;
        delete updates.clearProfilePicture; 

        const updatedUser = await User.findByIdAndUpdate(
            req.user.id,
            { $set: updates },
            { new: true, runValidators: true }
        ).select('-password');

        if (!updatedUser) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.json({ message: 'Profile updated successfully', firstName: updatedUser.firstName });

    } catch (err) {
        if (err instanceof multer.MulterError || err.message === 'Only image files are allowed!') {
            return res.status(400).json({ message: err.message });
        }
        console.error(err);
        res.status(500).json({ message: 'Server error updating profile.' });
    }
});


// 5. GET All Users (GET /api/users) - ADMIN ONLY
app.get("/api/users", authMiddleware, async (req, res) => { 
    try {
        if (!req.user.isAdmin) {
            return res.status(403).json({ message: "Admin access required" });
        }
        const users = await User.find({}).select('-password'); 
        res.json(users);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Server error fetching users." });
    }
});

// 6. UPDATE User Admin Status (PUT /api/users/:id/admin) - ADMIN ONLY
app.put("/api/users/:id/admin", authMiddleware, async (req, res) => { 
    try {
        if (!req.user.isAdmin) {
            return res.status(403).json({ message: "Admin access required" });
        }
        
        const targetUserId = req.params.id;
        const { isAdmin } = req.body;
        
        // Prevent an Admin from demoting themselves
        if (targetUserId === req.user.id.toString() && isAdmin === false) {
             return res.status(403).json({ message: "Error: An admin cannot demote themselves." });
        }

        const updatedUser = await User.findByIdAndUpdate(
            targetUserId,
            { isAdmin },
            { new: true, runValidators: true }
        ).select('-password');

        if (!updatedUser) {
            return res.status(404).json({ message: "User not found" });
        }
        
        res.json({ message: `User status updated successfully to isAdmin: ${updatedUser.isAdmin}`, isAdmin: updatedUser.isAdmin });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Server error updating user status." });
    }
});


// =======================================================
// 🎸 PRODUCT ROUTES
// =======================================================

// 1. GET All Products (GET /api/products) - PUBLIC
app.get("/api/products", async (req, res) => { 
    try {
        const products = await Product.find({});
        res.json(products);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 2. GET Product by ID (GET /api/products/:id) - PUBLIC
app.get("/api/products/:id", async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);
        if (!product) {
            return res.status(404).json({ message: "Product not found" });
        }
        res.json(product);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 3. POST Product (POST /api/products) - ADMIN ONLY
app.post("/api/products", authMiddleware, async (req, res) => { 
    try {
        if (!req.user.isAdmin) {
            return res.status(403).json({ message: "Admin access required" });
        }
        const newProduct = new Product(req.body);
        await newProduct.save();
        res.status(201).json(newProduct);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// 4. UPDATE Product (PUT /api/products/:id) - ADMIN ONLY
app.put("/api/products/:id", authMiddleware, async (req, res) => { 
    try {
        if (!req.user.isAdmin) {
            return res.status(403).json({ message: "Admin access required" });
        }
        const updatedProduct = await Product.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true }
        );
        if (!updatedProduct) {
            return res.status(404).json({ message: "Product not found" });
        }
        res.json(updatedProduct);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 5. DELETE Product (DELETE /api/products/:id) - ADMIN ONLY
app.delete("/api/products/:id", authMiddleware, async (req, res) => { 
    try {
        if (!req.user.isAdmin) {
            return res.status(403).json({ message: "Admin access required" });
        }
        await Product.findByIdAndDelete(req.params.id);
        res.json({ message: "Product deleted successfully" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 🌐 Fallback for unhandled routes
app.use((req, res, next) => {
    // Send a simple 404 JSON response instead of default HTML
    res.status(404).json({ message: "API endpoint not found." });
});


app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));