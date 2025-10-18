require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const multer = require('multer');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const session = require('express-session');
const passport = require('passport');
const nodemailer = require('nodemailer');
const router = express.Router();
const streamifier = require('streamifier');

const app = express();
const PORT = process.env.PORT || 5;
module.exports = app
const cloudinary = require('cloudinary').v2;

// Static admin credentials
const ADMIN_CREDENTIALS = {
  username: 'Admin',
  password: 'Admin@0000'
};

// ---------------------
// Safe Cloudinary config
// ---------------------
try {
  if (process.env.CLOUDINARY_URL) {
    cloudinary.config({ secure: true });
  } else {
    cloudinary.config({
      cloud_name: process.env.CLOUD_NAME || '',
      api_key: process.env.CLOUD_API_KEY || '',
      api_secret: process.env.CLOUD_API_SECRET || '',
      secure: true
    });
  }
  console.log('✅ Cloudinary configured');
} catch (err) {
  console.error('⚠️ Cloudinary config error:', err.message);
}

// ---------------------
// Ensure uploads dir exists
// ---------------------
const UPLOAD_DIR = path.join(__dirname, 'uploads');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR);


// ---------------------
// Middleware
// ---------------------
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/public', express.static(path.join(__dirname, 'public')));

// ---------------------
// MongoDB connection
// ---------------------
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log('✅ MongoDB Connected'))
.catch(err => console.error('❌ MongoDB connection error:', err));


// ---------------------
// Schemas
// ---------------------
const ProductSchema = new mongoose.Schema({
  name: { type: String, required: true },
  category: String,
  price: { type: Number, default: 0 },
  stock: { type: Number, default: 0 },
  image: String
}, { timestamps: true });

const Product = mongoose.model('Product', ProductSchema);

// Placeholder Order & User
const Order = mongoose.model('Order', new mongoose.Schema({}, { strict: false }));
const User = mongoose.model('User', new mongoose.Schema({}, { strict: false }));



// ---------------------
// FRONTEND ROUTES
// ---------------------
const pages = ['index', 'about', 'contactus', 'login', 'shop', 'product_details', 'register' ,'checkout'];
pages.forEach(page => {
  app.get(`/${page === 'index' ? '' : page}`, (req, res) => {
    res.sendFile(path.join(__dirname, `views/pages/${page}.html`));
  });
});
// Basic Auth middleware
function basicAuth(req, res, next) {
  const auth = req.headers['authorization'];

  if (!auth) {
    res.setHeader('WWW-Authenticate', 'Basic realm="Admin Area"');
    return res.status(401).send('Authentication required.');
  }

  // Decode base64
  const base64Credentials = auth.split(' ')[1];
  const credentials = Buffer.from(base64Credentials, 'base64').toString('ascii');
  const [username, password] = credentials.split(':');

  // Check credentials
  if (username === 'Admin' && password === 'Admin@0000') {
    next(); // Access granted
  } else {
    res.setHeader('WWW-Authenticate', 'Basic realm="Admin Area"');
    return res.status(401).send('Invalid credentials.');
  }
}

// Admin pages with basic auth
const adminPages = ['dashboard', 'products', 'orders', 'users','images'];
adminPages.forEach(page => {
  app.get(`/${page}`, basicAuth, (req, res) => {
    res.sendFile(path.join(__dirname, `views/pages/Admin/${page}.html`));
  });
});

app.get('/admin', basicAuth, (req, res) => res.redirect('/dashboard'));

// ---------------------
// DASHBOARD COUNTS
// ---------------------
app.get('/api/dashboard-counts', async (req, res) => {
  try {
    const [totalProducts, totalOrders, totalUsers] = await Promise.all([
      Product.countDocuments(),
      Order.countDocuments(),
      User.countDocuments()
    ]);
    res.json({ totalProducts, totalOrders, totalUsers });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ---------------------
// CRUD API for Products (Cloudinary version)
// ---------------------

// Get all products
app.get('/api/products', async (req, res) => {
  try {
    const products = await Product.find().sort({ createdAt: -1 });
    res.json(products);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error fetching products' });
  }
});

// Get single product by ID
app.get('/api/products/:id', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: 'Product not found' });
    res.json(product);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error fetching product' });
  }
});

// Create new product (Cloudinary image URL from frontend)
app.post('/api/products', async (req, res) => {
  try {
    const { name, category, price, stock, image } = req.body;

    // Validate required fields
    if (!name || !price || !stock) {
      return res.status(400).json({ message: 'Name, price, and stock are required' });
    }

    // Handle image format - could be string or object
    let imageUrl = '';
    if (typeof image === 'string') {
      imageUrl = image;
    } else if (image && image.url) {
      imageUrl = image.url;
    }

    // Create product document
    const product = new Product({
      name,
      category,
      price: Number(price),
      stock: Number(stock),
      image: imageUrl // ✅ Store as simple string URL
    });

    await product.save();
    res.json(product);

  } catch (err) {
    console.error('Error creating product:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update product
app.put('/api/products/:id', async (req, res) => {
  try {
    const { name, category, price, stock, image } = req.body;

    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: 'Product not found' });

    // Update fields
    product.name = name || product.name;
    product.category = category || product.category;
    product.price = price ? Number(price) : product.price;
    product.stock = stock ? Number(stock) : product.stock;

    // ✅ Handle image format - could be string or object
    if (image) {
      if (typeof image === 'string') {
        product.image = image;
      } else if (image.url) {
        product.image = image.url;
      }
    }

    const updated = await product.save();
    res.json({ message: 'Product updated successfully', product: updated });

  } catch (err) {
    console.error('Error updating product:', err);
    res.status(500).json({ message: 'Server error while updating product' });
  }
});

// Delete product
app.delete('/api/products/:id', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: 'Product not found' });

    // ⚠️ Optional: Delete image from Cloudinary using API if needed (advanced)
    await Product.deleteOne({ _id: req.params.id });

    res.json({ message: 'Product deleted successfully' });
  } catch (err) {
    console.error('Error deleting product:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// ---------------------
// Sessions + Passport
// ---------------------
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: true
}));
app.use(passport.initialize());
app.use(passport.session());

// Logout
app.get("/logout", (req, res, next) => {
  req.logout(err => {
    if (err) return next(err);
    res.redirect("/");
  });
});
//current user
app.get('/api/current_user', (req, res) => {
  if (req.session.userId) {
    return res.json({ name: req.session.fullname || "User" }); 
  }
  res.json(null);
});


app.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).send("Email and password are required");
    }
    if (email === 'admin@admin.com' && password === 'admin123') {
      req.session.userId = 'admin';   // special admin ID
      req.session.fullname = 'Admin';
      req.session.isAdmin = true;     // admin flag
      return res.redirect('/dashboard'); // admin dashboard
    }   

    // Find user
    const user = await UserReg.findOne({ email });
    if (!user) {
      return res.status(401).send("Invalid credentials");
    }

    // Check password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).send("Invalid credentials");
    }

    // Login successful — save session
    req.session.userId = user._id;
    req.session.fullname = user.fullname;

    res.redirect('/'); // Redirect to home or dashboard

  } catch (err) {
    console.error(err);
    res.status(500).send("Server error");
  }
});



// ---------------------
// Custom Product Requests
// ---------------------
const CustomRequestSchema = new mongoose.Schema({
  name: String,
  email: String,
  product: String,
  category: String,
  details: String,
  image: String
}, { timestamps: true });

const CustomRequest = mongoose.model("CustomRequest", CustomRequestSchema);

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

app.post("/submit-request", async (req, res) => {
  try {
    const { name, email, product, category, details, image } = req.body;

    if (!name || !email || !product) {
      return res.status(400).json({ message: "Name, email, and product are required" });
    }

    const request = new CustomRequest({ name, email, product, category, details, image });
    await request.save();

    await transporter.sendMail({
      from: `"ArtistGrade" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: "Custom Product Request Received",
      html: `<h3>Hi ${name},</h3>
             <p>We received your request for "<strong>${product}</strong>". Our team will contact you soon.</p>`
    });

    res.json({ message: "Request submitted and confirmation email sent!" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// ---------------------
// User Registration Schema
// ---------------------  
const UserSchema = new mongoose.Schema({
  fullname: { type: String, required: true },
  username: { type: String, required: true, unique: true },
  email:    { type: String, required: true, unique: true },
  phone:    { type: String },
  password: { type: String, required: true },
  gender:   { type: String }
}, { timestamps: true });

const UserReg = mongoose.model("UserReg", UserSchema);
const bcrypt = require('bcryptjs');

app.post("/api/register", async (req, res) => {
  try {
    const { fullname, username, email, phone, password, confirmPassword, gender } = req.body;

    // Basic validation
    if (!fullname || !username || !email || !password || !confirmPassword) {
      return res.status(400).json({ message: "All required fields must be filled" });
    }
    if (password !== confirmPassword) {
      return res.status(400).json({ message: "Passwords do not match" });
    }

    // Check if user already exists
    const existingUser = await UserReg.findOne({ $or: [{ email }, { username }] });
    if (existingUser) {
      return res.status(400).json({ message: "Email or username already exists" });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Save user
    const user = new UserReg({
      fullname,
      username,
      email,
      phone,
      password: hashedPassword,
      gender
    });
    await user.save();

    res.json({ message: "User registered successfully!" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// Get all users
app.get("/api/users", async (req, res) => {
  try {
    const users = await UserReg.find().sort({ createdAt: -1 });
    res.json(users);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error fetching users" });
  }
});

// Delete a user
app.delete("/api/users/:id", async (req, res) => {
  try {
    await UserReg.findByIdAndDelete(req.params.id);
    res.json({ message: "User deleted successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error deleting user" });
  }
});
// Update user details
app.put("/api/users/:id", async (req, res) => {
  try {
    const { fullname, email, username, role, isActive } = req.body;

    const updatedUser = await UserReg.findByIdAndUpdate(
      req.params.id,
      {
        fullname,
        email,
        username,
        role,
        isActive: isActive === "true", // Convert string to boolean
      },
      { new: true }
    );

    if (!updatedUser)
      return res.status(404).json({ message: "User not found" });

    res.json({ message: "User updated successfully", user: updatedUser });
  } catch (err) {
    console.error("Error updating user:", err);
    res.status(500).json({ message: "Error updating user" });
  }
});

// routes/adminRoutes.js


// Get all users
router.get('/api/users', async (req, res) => {
  try {
    const users = await User.find().sort({ createdAt: -1 });
    res.json(users);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete user
router.delete('/api/users/:id', async (req, res) => {
  try {
    await User.findByIdAndDelete(req.params.id);
    res.json({ message: 'User deleted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
// Update user info
router.put('/api/users/:id', async (req, res) => {
  try {
    const { fullname, email, username, role, isActive } = req.body;
    const user = await User.findById(req.params.id);
    if(!user) return res.status(404).json({ message: 'User not found' });

    user.fullname = fullname;
    user.email = email;
    user.username = username;
    user.role = role;
    user.isActive = isActive;

    await user.save();
    res.json({ message: 'User updated successfully' });
  } catch(err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

const orderSchema = new mongoose.Schema({
    orderId: { type: String, unique: true },
    fullName: { type: String, required: true },
    email: { type: String, required: true },
    phone: { type: String, required: true },
    address: { type: String, required: true },
    city: { type: String, required: true },
    state: { type: String, required: true },
    zip: { type: String, required: true },
    transactionId: { type: String, required: true },
    cartItems: [
        {
            name: String,
            price: Number,
            quantity: Number
        }
    ],
    totalAmount: { type: Number, required: true },
    status: { type: String, enum: ['Pending', 'Completed', 'Canceled'], default: 'Pending' },
    date: { type: Date, default: Date.now } 
});


// Get all orders
app.get('/api/orders', async (req, res) => {
    try {
        const orders = await Order.find().sort({ date: -1 });
        res.json(orders);
    } catch(err) {
        res.status(500).json({ message: err.message });
    }
});

// Get single order by ID
app.get('/api/orders/:id', async (req, res) => {
    try {
        const order = await Order.findById(req.params.id);
        if(!order) return res.status(404).json({ message: 'Order not found' });
        res.json(order);
    } catch(err) {
        res.status(500).json({ message: err.message });
    }
});

// Delete order by ID
app.delete('/api/orders/:id', async (req, res) => {
    try {
        const order = await Order.findByIdAndDelete(req.params.id);
        if(!order) return res.status(404).json({ message: 'Order not found' });
        res.json({ message: 'Order deleted' });
    } catch(err) {
        res.status(500).json({ message: err.message });
    }
});

app.post('/api/orders', async (req, res) => {
    try {
        const count = await Order.countDocuments(); // Get total orders
        const orderId = `ORD${(count + 1).toString().padStart(3, '0')}`; // e.g., ORD001

        const newOrder = new Order({
            orderId,
            ...req.body
        });

        await newOrder.save();
        res.status(201).json({ message: 'Order saved successfully!', orderId });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Failed to save order' });
    }
});

// Update order status and send email
app.put('/api/orders/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    // Update the order
    const order = await Order.findByIdAndUpdate(id, { status }, { new: true });
    if (!order) return res.status(404).json({ message: 'Order not found' });

    // Configure NodeMailer
    const transporter = nodemailer.createTransport({
      service: 'Gmail', // or any SMTP service
      auth: {
        user: process.env.EMAIL_USER, // your email
        pass: process.env.EMAIL_PASS  // your app password
      }
    });

    // Email content
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: order.email,
      subject: `Your Order ${order.orderId} Status Updated`,
      text: `Hello ${order.fullName},\n\nYour order status has been updated to: ${status}.\n\nThank you for shopping with us!\n\n- ArtistGrade`
    };

    // Send email
    transporter.sendMail(mailOptions, (err, info) => {
      if (err) console.error('Email error:', err);
      else console.log('Email sent:', info.response);
    });

    res.json({ status: order.status });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// images management page

// Multer setup (memory storage)
const storage = multer.memoryStorage();
const upload = multer({ storage });

// Upload image endpoint
app.post('/api/admin/upload', upload.single('file'), async (req, res) => {
  try {
    const { type } = req.body; // background, spinner, gp
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    // Function to upload buffer to Cloudinary via stream
    const streamUpload = (buffer) => {
      return new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          { folder: 'artistgrade-site' },
          (error, result) => {
            if (result) resolve(result);
            else reject(error);
          }
        );
        streamifier.createReadStream(buffer).pipe(stream);
      });
    };

    const result = await streamUpload(req.file.buffer);
    res.json({ url: result.secure_url, public_id: result.public_id });

  } catch (err) {
    console.error('Upload error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Get all uploaded images
app.get('/api/admin/images', async (req, res) => {
  try {
    const resources = await cloudinary.api.resources({
      type: 'upload',
      prefix: 'artistgrade-site/'
    });

    const images = resources.resources.map(r => ({
      url: r.secure_url,
      public_id: r.public_id
    }));

    res.json(images);
  } catch (err) {
    console.error('Fetch images error:', err);
    res.status(500).json({ error: err.message });
  }
});


// ---------------------
// Start Server
// ---------------------
//app.listen(PORT, () => console.log(`🚀 Server running at http://localhost:${PORT}`));
