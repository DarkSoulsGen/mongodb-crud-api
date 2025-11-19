require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const bodyParser = require("body-parser");
const jwt = require("jsonwebtoken");
const path = require("path");
const fs = require("fs");
const multer = require("multer");

const app = express();
const PORT = process.env.PORT || 5000;
const DEFAULT_PROFILE_PIC = "/uploads/default.png";

// ✅ FIX 1: Set Base URL to Render (Fallbacks to localhost only if running locally)
const BASE_URL = process.env.BASE_URL || "https://mongodb-crud-api-azs9.onrender.com";

// =======================================================
// ⬇️ MULTER CONFIGURATION (Memory Storage for Base64)
// =======================================================
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB limit
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith("image/")) {
      return cb(new Error("Only image files are allowed!"), false);
    }
    cb(null, true);
  },
});

// =======================================================
// 📦 MIDDLEWARE
// =======================================================
// ✅ FIX 2: Allow Netlify to talk to Render
app.use(cors({
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true
}));

app.use(bodyParser.json());
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// ❌ REMOVED: app.use(express.static... frontend) 
// Reason: Netlify is now doing this job.

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

// Cart item
const CartItemSchema = new mongoose.Schema({
  productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
  quantity: { type: Number, required: true, default: 1, min: 1 },
});

// User
const UserSchema = new mongoose.Schema(
  {
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true, select: false },
    isAdmin: { type: Boolean, default: false },
    profilePicture: { type: String, default: DEFAULT_PROFILE_PIC },
    middleName: { type: String, default: "" },
    phoneNumber: { type: String, default: "" },
    age: { type: Number, default: null },
    address: { type: String, default: "" },
    cart: [CartItemSchema],
  },
  { timestamps: true }
);

const User = mongoose.model("User", UserSchema);

// Product
const ProductSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    brand: { type: String, required: true },
    type: { type: String, required: true },
    price: { type: Number, required: true },
    stock: { type: Number, required: true, default: 0 },
    image: { type: String, default: "" },
    description: { type: String, default: "" },
  },
  { timestamps: true }
);
const Product = mongoose.model("Product", ProductSchema);

// Order
const OrderItemSchema = new mongoose.Schema({
  productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
  name: String,
  price: Number,
  quantity: Number,
  image: String,
});

const OrderSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    items: [OrderItemSchema],
    totalAmount: { type: Number, required: true },
    coords: { lat: Number, lng: Number, label: String },
    status: {
      type: String,
      enum: ["Pending", "Processing", "Shipped", "Delivered", "Cancelled"],
      default: "Pending",
    },
  },
  { timestamps: true }
);

const Order = mongoose.model("Order", OrderSchema);

// =======================================================
// 🛡️ AUTH MIDDLEWARE
// =======================================================
const authMiddleware = async (req, res, next) => {
  let token;
  if (req.headers.authorization && req.headers.authorization.startsWith("Bearer")) {
    try {
      token = req.headers.authorization.split(" ")[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = await User.findById(decoded.id).select("-password");
      if (!req.user)
        return res.status(401).json({ message: "Not authorized, user not found" });
      return next();
    } catch (error) {
      console.error(error);
      return res.status(401).json({ message: "Not authorized, token failed" });
    }
  }
  if (!token) res.status(401).json({ message: "Not authorized, no token" });
};

// =======================================================
// 🧑 USER / AUTH ROUTES
// =======================================================

// 1. REGISTER User
app.post("/api/users", async (req, res) => {
  const {
    firstName,
    lastName,
    email,
    password,
    middleName,
    phoneNumber,
    age,
    address,
  } = req.body;
  if (!firstName || !lastName || !email || !password) {
    return res.status(400).json({ message: "Please enter all required fields" });
  }
  try {
    const userExists = await User.findOne({ email });
    if (userExists) return res.status(400).json({ message: "User already exists" });

    const userCount = await User.countDocuments();
    const isAdmin = userCount === 0;

    const user = await User.create({
      firstName,
      lastName,
      email,
      password,
      isAdmin,
      middleName,
      phoneNumber,
      age,
      address,
    });

    if (user) {
      const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
        expiresIn: "7d",
      });
      res.status(201).json({
        _id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        isAdmin: user.isAdmin,
        token,
        profilePicture: user.profilePicture,
      });
    } else {
      res.status(400).json({ message: "Invalid user data" });
    }
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// 2. LOGIN User
app.post("/api/users/login", async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email }).select("+password");
    if (user && user.password === password) {
      const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
        expiresIn: "7d",
      });
      res.json({
        _id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        isAdmin: user.isAdmin,
        token,
        profilePicture: user.profilePicture,
      });
    } else {
      res.status(401).json({ message: "Invalid email or password" });
    }
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// 3. GET All Users (Admin)
app.get("/api/users", authMiddleware, async (req, res) => {
  try {
    if (!req.user.isAdmin)
      return res.status(403).json({ message: "Admin access required" });
    const users = await User.find({}).select("-password");
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// 4. GET User Profile
app.get("/api/users/profile", authMiddleware, (req, res) => {
  res.json(req.user);
});

// 5. UPDATE User Profile
app.put(
  "/api/users/profile",
  authMiddleware,
  upload.single("profilePicture"),
  async (req, res) => {
    try {
      const user = await User.findById(req.user._id);
      if (!user) return res.status(404).json({ message: "User not found" });

      const {
        firstName,
        middleName,
        lastName,
        email,
        phoneNumber,
        age,
        address,
        removePicture,
      } = req.body;

      if (email && email.toLowerCase() !== user.email.toLowerCase()) {
        const emailExists = await User.findOne({ email });
        if (emailExists)
          return res.status(400).json({ message: "Email already taken." });
      }

      user.firstName = firstName || user.firstName;
      user.middleName = middleName || "";
      user.lastName = lastName || user.lastName;
      user.email = email || user.email;
      user.phoneNumber = phoneNumber || "";
      user.age = age ? parseInt(age) : null;
      user.address = address || "";

      if (req.file) {
        const b64 = Buffer.from(req.file.buffer).toString("base64");
        const mimeType = req.file.mimetype;
        user.profilePicture = `data:${mimeType};base64,${b64}`;
      } else if (removePicture === "true") {
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
    } catch (err) {
      if (err.code === "LIMIT_FILE_SIZE") {
        return res
          .status(400)
          .json({ message: "File size too large. Max limit is 2MB." });
      }
      res.status(400).json({ message: err.message });
    }
  }
);

// 6. UPDATE Password
app.put("/api/users/profile/password", authMiddleware, async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword)
    return res.status(400).json({ message: "Provide both passwords." });

  try {
    const user = await User.findById(req.user._id).select("+password");
    if (!user) return res.status(404).json({ message: "User not found" });

    if (user.password === currentPassword) {
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

// 7. TOGGLE Admin
app.put("/api/users/:id/admin", authMiddleware, async (req, res) => {
  try {
    if (!req.user.isAdmin)
      return res.status(403).json({ message: "Admin access required" });
    if (req.user._id.toString() === req.params.id && req.body.isAdmin === false) {
      return res.status(403).json({ message: "Admins cannot demote themselves." });
    }
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: "User not found" });
    user.isAdmin = req.body.isAdmin;
    await user.save();
    res.json({ message: "User status updated." });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// 8. DELETE User
app.delete("/api/users/:id", authMiddleware, async (req, res) => {
  try {
    if (!req.user.isAdmin)
      return res.status(403).json({ message: "Admin access required" });
    if (req.user._id.toString() === req.params.id)
      return res.status(403).json({ message: "Admins cannot delete self." });
    await User.findByIdAndDelete(req.params.id);
    res.json({ message: "User deleted successfully." });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// =======================================================
// 🛒 CART ROUTES
// =======================================================

// 1. GET User Cart
app.get("/api/cart", authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('cart').populate('cart.productId');
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    res.json(user.cart);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 2. ADD/UPDATE Cart Item
app.post("/api/cart", authMiddleware, async (req, res) => {
  const { productId, quantity } = req.body;
  if (!productId || typeof quantity !== "number" || quantity < 1) {
    return res.status(400).json({ message: "Invalid product or quantity" });
  }
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    const product = await Product.findById(productId);
    if (!product) return res.status(404).json({ message: "Product not found." });

    // Find existing cart item (if any)
    const itemIndex = user.cart.findIndex(
      (item) => item.productId.toString() === productId
    );

    const currentQtyInCart = itemIndex > -1 ? user.cart[itemIndex].quantity : 0;

    // We want to set the new cart quantity to `quantity`
    const delta = quantity - currentQtyInCart; // how much we are changing

    if (delta > 0) {
      // We are increasing cart quantity, need to reduce stock
      if (product.stock < delta) {
        return res.status(400).json({
          message: `Not enough stock. Only ${product.stock} left.`,
        });
      }
      product.stock -= delta;
    } else if (delta < 0) {
      // We are decreasing cart quantity, give stock back
      product.stock += Math.abs(delta);
    }

    // Now update the user cart entry
    if (quantity === 0) {
      user.cart = user.cart.filter((item) => item.productId.toString() !== productId);
    } else if (itemIndex > -1) {
      user.cart[itemIndex].quantity = quantity;
    } else {
      user.cart.push({ productId, quantity });
    }

    await product.save();
    await user.save();
    res.status(200).json({ message: "Cart and stock updated successfully" });

  } catch (err) {
    console.error("Cart update error:", err);
    res.status(500).json({ error: err.message });
  }
});

// 3. REMOVE Cart Item
app.delete("/api/cart/:productId", authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    const productId = req.params.productId;
    const item = user.cart.find((i) => i.productId.toString() === productId);

    if (!item) {
      return res.status(404).json({ message: "Item not found in cart" });
    }

    // Restore stock
    const product = await Product.findById(productId);
    if (product) {
      product.stock += item.quantity;
      await product.save();
    }

    // Remove from cart
    user.cart = user.cart.filter((i) => i.productId.toString() !== productId);
    await user.save();

    res.status(200).json({ message: "Item removed and stock restored" });

  } catch (err) {
    console.error("Remove cart item error:", err);
    res.status(500).json({ error: err.message });
  }
});

// =======================================================
// 📦 ORDER ROUTES
// =======================================================

// Create order
app.post("/api/orders", authMiddleware, async (req, res) => {
  try {
    const { itemIds, coords } = req.body;
    if (!Array.isArray(itemIds) || itemIds.length === 0) {
      return res.status(400).json({ message: "No items selected for order." });
    }

    const user = await User.findById(req.user.id).populate("cart.productId");
    if (!user) return res.status(404).json({ message: "User not found" });

    const selectedItems = user.cart
      .filter((ci) => itemIds.includes(ci.productId._id.toString()))
      .map((ci) => ({
        productId: ci.productId._id,
        name: ci.productId.name,
        price: ci.productId.price,
        quantity: ci.quantity,
        image: ci.productId.image || null,
      }));

    if (!selectedItems.length) {
      return res
        .status(400)
        .json({ message: "Selected cart items not found." });
    }

    const totalAmount = selectedItems.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0
    );

    const order = await Order.create({
      userId: req.user.id,
      items: selectedItems,
      totalAmount,
      coords: coords || null,
      status: "Pending",
    });

    user.cart = user.cart.filter(
      (ci) => !itemIds.includes(ci.productId._id.toString())
    );
    await user.save();

    res.status(201).json(order);
  } catch (err) {
    console.error("Create order error:", err);
    res.status(500).json({ message: err.message });
  }
});

// Get my orders
app.get("/api/orders/my", authMiddleware, async (req, res) => {
  try {
    const orders = await Order.find({ userId: req.user.id })
      .populate("items.productId", "name price image")
      .sort({ createdAt: -1 });

    const fixedOrders = orders.map((o) => ({
      ...o.toObject(),
      items: o.items.map((i) => {
        const src = i.image || i.productId?.image || null;
        let img = src;
        // Fix for legacy images stored as paths:
        if (img && !img.startsWith("data:") && !img.startsWith("http")) {
          img = `${BASE_URL}${img.startsWith("/") ? "" : "/"}${img}`;
        }
        return {
          name: i.name || i.productId?.name || "Unnamed Product",
          price: i.price || i.productId?.price || 0,
          quantity: i.quantity || 0,
          image: img,
        };
      }),
    }));
    res.json(fixedOrders);
  } catch (err) {
    console.error("Error fetching user orders:", err);
    res.status(500).json({ message: err.message });
  }
});

// Admin: get all orders
app.get("/api/orders", authMiddleware, async (req, res) => {
  try {
    if (!req.user.isAdmin)
      return res.status(403).json({ message: "Admin access required" });

    const orders = await Order.find({})
      .populate("userId", "firstName lastName email")
      .sort({ createdAt: -1 });
    res.json(orders);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ✅ NEW: Get single order for "View" button
app.get("/api/orders/:id", authMiddleware, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate("userId", "firstName lastName email")
      .populate("items.productId", "name price image");

    if (!order) return res.status(404).json({ message: "Order not found" });

    if (!req.user.isAdmin && order.userId._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Access denied" });
    }

    res.json(order);
  } catch (err) {
    console.error("GET /api/orders/:id error:", err);
    res.status(500).json({ message: err.message });
  }
});

// Admin: update order status
app.put("/api/orders/:id/status", authMiddleware, async (req, res) => {
  try {
    if (!req.user.isAdmin)
      return res.status(403).json({ message: "Admin access required" });

    const { status } = req.body;
    const allowedStatuses = [
      "Pending",
      "Processing",
      "Shipped",
      "Delivered",
      "Cancelled",
    ];
    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }

    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: "Order not found" });

    order.status = status;
    await order.save();

    res.json({ message: "Order status updated", order });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// =======================================================
// 🎸 PRODUCT ROUTES
// =======================================================

app.get("/api/products", async (req, res) => {
  const products = await Product.find({});
  res.json(products);
});

app.get("/api/products/:id", async (req, res) => {
  const product = await Product.findById(req.params.id);
  if (!product) return res.status(404).json({ message: "Product not found" });
  res.json(product);
});

// Create Product
app.post("/api/products", authMiddleware, upload.single('imageFile'), async (req, res) => {
  if (!req.user.isAdmin) return res.status(403).json({ message: "Admin access required" });
  try {
    const { name, brand, type, price, stock, description, imageURL } = req.body;

    const newProductData = {
      name, brand, type,
      price: parseFloat(price),
      stock: parseInt(stock),
      description: description || ''
    };

    // If a file is uploaded, convert to Base64
    if (req.file) {
      const b64 = Buffer.from(req.file.buffer).toString('base64');
      const mimeType = req.file.mimetype;
      newProductData.image = `data:${mimeType};base64,${b64}`;
    } else if (imageURL) {
      newProductData.image = imageURL;
    }

    const newProduct = await Product.create(newProductData);
    res.status(201).json(newProduct);
  } catch (err) {
    console.error('Product upload error:', err);
    res.status(400).json({ message: err.message });
  }
});

// Update Product
app.put("/api/products/:id", authMiddleware, upload.single('imageFile'), async (req, res) => {
  if (!req.user.isAdmin) return res.status(403).json({ message: "Admin access required" });
  try {
    const { name, brand, type, price, stock, description, imageURL } = req.body;
    const updateFields = {
      name, brand, type,
      price: parseFloat(price),
      stock: parseInt(stock),
      description
    };

    // handle new image upload (file replacement)
    if (req.file) {
      const b64 = Buffer.from(req.file.buffer).toString('base64');
      const mimeType = req.file.mimetype;
      updateFields.image = `data:${mimeType};base64,${b64}`;
    } else if (imageURL) {
      updateFields.image = imageURL;
    }

    const updatedProduct = await Product.findByIdAndUpdate(
      req.params.id,
      updateFields,
      { new: true }
    );
    if (!updatedProduct) return res.status(404).json({ message: "Product not found" });
    res.json(updatedProduct);
  } catch (err) {
    console.error('Product update error:', err);
    res.status(500).json({ message: err.message });
  }
});

// Delete Product
app.delete("/api/products/:id", authMiddleware, async (req, res) => {
  if (!req.user.isAdmin) return res.status(403).json({ message: "Admin access required" });
  try {
    await Product.findByIdAndDelete(req.params.id);
    res.json({ message: "Product deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// =======================================================
// 🚀 SERVER START
// =======================================================

// Simple route to check if server is alive
app.get("/", (req, res) => {
  res.send("Guitar Store API is running...");
});

// NOTE: Do not host frontend files here anymore. Netlify does that.
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));