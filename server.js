require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const bodyParser = require("body-parser");
const jwt = require("jsonwebtoken");
const path = require('path');
const fs = require('fs');
const multer = require('multer');

const app = express();
const PORT = process.env.PORT || 5000;
const DEFAULT_PROFILE_PIC = "/uploads/default.png"; // Default profile picture path

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
    // Keep original filename but ensure it's unique
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
// ⚠️ NO PASSWORD HASHING (As requested by user for demo)
// =======================================================
// Passwords will be stored and compared as plain text strings.

// =======================================================
// 📦 MIDDLEWARE
// =======================================================
app.use(cors());
app.use(bodyParser.json());
// Serve static files from the 'uploads' directory
app.use('/uploads', express.static(uploadDir));
// For serving the frontend files
app.use(express.static(path.join(__dirname, 'frontend'))); 

// =======================================================
// 💿 MONGOOSE CONNECTION
// =======================================================
mongoose
    .connect(process.env.MONGODB_URI)
    .then(() => console.log("MongoDB Connected"))
    .catch((err) => console.error("MongoDB Connection Error:", err));

// =======================================================
// 📝 MONGOOSE SCHEMAS
// =======================================================

// 🧑 USER SCHEMA
const UserSchema = new mongoose.Schema({
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true, select: false }, // Password hidden by default
    isAdmin: { type: Boolean, default: false },
    profilePicture: { type: String, default: DEFAULT_PROFILE_PIC }, // Default path
    middleName: { type: String, default: "" },
    phoneNumber: { type: String, default: "" },
    age: { type: Number, default: null },
    address: { type: String, default: "" },
}, { timestamps: true });

const User = mongoose.model("User", UserSchema);


// 🎸 PRODUCT SCHEMA (Based on frontend data structure)
const ProductSchema = new mongoose.Schema({
    name: { type: String, required: true },
    brand: { type: String, required: true },
    type: { type: String, required: true }, // e.g., 'Electric Guitar', 'Bass', 'Amplifier'
    price: { type: Number, required: true },
    stock: { type: Number, required: true, default: 0 },
    image: { type: String, default: "" },
    description: { type: String, default: "" },
}, { timestamps: true });

const Product = mongoose.model("Product", ProductSchema);


// =======================================================
// 🛡️ AUTH MIDDLEWARE
// =======================================================
const authMiddleware = async (req, res, next) => {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith("Bearer")) {
        try {
            // Get token from header (format: "Bearer <token>")
            token = req.headers.authorization.split(" ")[1];

            // Verify token
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            
            // Attach user to the request (excluding password)
            req.user = await User.findById(decoded.id).select("-password");
            
            if (!req.user) {
                return res.status(401).json({ message: "Not authorized, user not found" });
            }

            next();
        } catch (error) {
            console.error(error);
            res.status(401).json({ message: "Not authorized, token failed" });
        }
    }

    if (!token) {
        res.status(401).json({ message: "Not authorized, no token" });
    }
};


// =======================================================
// 🧑 USER / AUTH ROUTES (/api/users)
// =======================================================

// 1. REGISTER User (POST /api/users)
app.post("/api/users", async (req, res) => {
    const { firstName, lastName, email, password } = req.body;
    if (!firstName || !lastName || !email || !password) {
        return res.status(400).json({ message: "Please enter all required fields" });
    }

    try {
        const userExists = await User.findOne({ email });
        if (userExists) {
            return res.status(400).json({ message: "User already exists" });
        }

        // 🚨 No Hashing: Storing password as plain text for demo simplicity
        const plainPassword = password; 
        
        // Note: The first user to register should be set as an Admin for initialization
        const userCount = await User.countDocuments();
        const isAdmin = userCount === 0;

        const user = await User.create({
            firstName,
            lastName,
            email,
            password: plainPassword,
            isAdmin, // First user is admin
        });

        if (user) {
            // Create JWT token
            const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: "7d" });

            // Respond without the password field
            res.status(201).json({
                _id: user._id,
                firstName: user.firstName,
                lastName: user.lastName,
                email: user.email,
                isAdmin: user.isAdmin,
                token,
                profilePicture: user.profilePicture
            });
        } else {
            res.status(400).json({ message: "Invalid user data" });
        }
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// 2. LOGIN User (POST /api/users/login)
app.post("/api/users/login", async (req, res) => {
    const { email, password } = req.body;

    try {
        // Fetch user, explicitly including the password for comparison
        const user = await User.findOne({ email }).select('+password'); 

        // 🚨 Plain text password comparison for demo simplicity
        if (user && user.password === password) {
            // Create JWT token
            const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: "7d" });

            res.json({
                _id: user._id,
                firstName: user.firstName,
                lastName: user.lastName,
                email: user.email,
                isAdmin: user.isAdmin,
                token,
                profilePicture: user.profilePicture
            });
        } else {
            res.status(401).json({ message: "Invalid email or password" });
        }
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// 3. GET All Users (GET /api/users) - ADMIN ONLY
app.get("/api/users", authMiddleware, async (req, res) => {
    try {
        if (!req.user.isAdmin) {
            return res.status(403).json({ message: "Admin access required" });
        }
        // Fetch all users, excluding their password
        const users = await User.find({}).select("-password");
        res.json(users);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// 4. GET User Profile (GET /api/users/profile) - LOGGED IN USER
app.get("/api/users/profile", authMiddleware, (req, res) => {
    // req.user is set by authMiddleware and already excludes the password
    res.json(req.user);
});

// 5. UPDATE User Profile (PUT /api/users/profile) - LOGGED IN USER
app.put("/api/users/profile", authMiddleware, upload.single('profilePicture'), async (req, res) => {
    try {
        const user = await User.findById(req.user._id);

        if (user) {
            const { firstName, middleName, lastName, email, phoneNumber, age, address, removePicture } = req.body;
            
            // Prevent email change if email is already taken by another user
            if (email && email.toLowerCase() !== user.email.toLowerCase()) {
                const emailExists = await User.findOne({ email });
                if (emailExists) {
                    return res.status(400).json({ message: "Email already taken by another account." });
                }
            }

            // Update fields
            user.firstName = firstName || user.firstName;
            user.middleName = middleName || "";
            user.lastName = lastName || user.lastName;
            user.email = email || user.email;
            user.phoneNumber = phoneNumber || "";
            // Ensure age is stored as a number
            user.age = age ? parseInt(age) : null; 
            user.address = address || "";
            
            // Handle Profile Picture logic
            if (req.file) {
                // A new file was uploaded: update the path
                // File path is relative to the project root, like 'uploads/filename.jpg'
                user.profilePicture = `/${req.file.path.replace(/\\/g, '/')}`; // Ensure forward slashes
            } else if (removePicture === 'true') {
                // User explicitly requested removal
                if (user.profilePicture !== DEFAULT_PROFILE_PIC) {
                    // OPTIONAL: Delete the old file from the filesystem 
                    const oldPath = path.join(__dirname, user.profilePicture);
                    if (fs.existsSync(oldPath) && oldPath.includes(uploadDir)) {
                        fs.unlinkSync(oldPath);
                    }
                }
                user.profilePicture = DEFAULT_PROFILE_PIC;
            }
            
            const updatedUser = await user.save();
            
            res.json({
                _id: updatedUser._id,
                firstName: updatedUser.firstName,
                lastName: updatedUser.lastName,
                email: updatedUser.email,
                isAdmin: updatedUser.isAdmin,
                profilePicture: updatedUser.profilePicture,
            });

        } else {
            res.status(404).json({ message: "User not found" });
        }
    } catch (err) {
        // If the error is from multer (e.g., file limit exceeded)
        if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({ message: "File size limit exceeded (5MB)." });
        }
        res.status(400).json({ message: err.message });
    }
});

// 6. UPDATE User Password (PUT /api/users/profile/password) - LOGGED IN USER
app.put("/api/users/profile/password", authMiddleware, async (req, res) => {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
        return res.status(400).json({ message: "Please provide both current and new passwords." });
    }

    try {
        // Fetch user explicitly including the password field for comparison
        const user = await User.findById(req.user._id).select('+password'); 
        
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        // 🚨 Plain text password comparison for demo simplicity
        if (user.password === currentPassword) {
            // Update password by storing new plain text password
            user.password = newPassword;
            await user.save();

            res.json({ message: "Password updated successfully." });
        } else {
            res.status(401).json({ message: "Invalid current password." });
        }

    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// 7. TOGGLE Admin Status (PUT /api/users/:id/admin) - ADMIN ONLY
app.put("/api/users/:id/admin", authMiddleware, async (req, res) => {
    const userIdToUpdate = req.params.id;
    const { isAdmin } = req.body;

    // Security check: Admin cannot demote themselves
    if (req.user._id.toString() === userIdToUpdate && isAdmin === false) {
        return res.status(403).json({ message: "Admins cannot demote themselves." });
    }

    try {
        if (!req.user.isAdmin) {
            return res.status(403).json({ message: "Admin access required" });
        }
        
        const user = await User.findById(userIdToUpdate).select("-password");

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        user.isAdmin = isAdmin;
        await user.save();

        res.json({ message: `User status updated to Admin: ${isAdmin}`, user });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});


// =======================================================
// 🎸 PRODUCT ROUTES (/api/products)
// =======================================================

// 1. GET All Products (GET /api/products) - PUBLIC
app.get("/api/products", async (req, res) => {
    try {
        const products = await Product.find({});
        res.json(products);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// 2. GET Single Product (GET /api/products/:id) - PUBLIC
app.get("/api/products/:id", async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);
        if (!product) {
            return res.status(404).json({ message: "Product not found" });
        }
        res.json(product);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// 3. CREATE Product (POST /api/products) - ADMIN ONLY
app.post("/api/products", authMiddleware, async (req, res) => {
    try {
        if (!req.user.isAdmin) {
            return res.status(403).json({ message: "Admin access required" });
        }
        const newProduct = await Product.create(req.body);
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


// =======================================================
// 🚀 SERVER START
// =======================================================
// 🟢 FIX: Using a regex pattern to reliably catch all non-matched routes for serving the frontend.
app.get(/.*/, (req, res) => {
    // Only redirect if the path does not start with /api and is not an uploaded file
    if (!req.path.startsWith('/api') && !req.path.startsWith('/uploads')) {
        res.sendFile(path.resolve(__dirname, 'frontend', 'index.html'));
    }
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});