// server.js
require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const multer = require('multer');
const cors = require('cors');
const path = require('path');
const session = require('express-session');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const nodemailer = require('nodemailer');
const bcrypt = require('bcryptjs');
const cloudinary = require('cloudinary').v2;

const app = express();
const PORT = process.env.PORT || 3000;

/**
 * Required .env variables:
 * MONGO_URI
 * SESSION_SECRET
 * EMAIL_USER
 * EMAIL_PASS
 * (optional for Cloudinary)
 * CLOUDINARY_URL  or  CLOUD_NAME, CLOUD_API_KEY, CLOUD_API_SECRET
 * (optional for Google)
 * GOOGLE_CLIENT_ID
 * GOOGLE_CLIENT_SECRET
 */

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
// Schemas & Models
// ---------------------
const ProductSchema = new mongoose.Schema({
  name: { type: String, required: true },
  category: String,
  price: { type: Number, default: 0 },
  stock: { type: Number, default: 0 },
  image: {
    url: { type: String, default: '' },
    public_id: { type: String, default: '' }
  }
}, { timestamps: true });
const Product = mongoose.model('Product', ProductSchema);

const UserSchema = new mongoose.Schema({
  fullname: { type: String, required: true },
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  phone: String,
  password: { type: String, required: true },
  gender: String,
  role: { type: String, default: 'user' },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });
const UserReg = mongoose.model('UserReg', UserSchema);

const GUserSchema = new mongoose.Schema({
  googleId: String,
  name: String,
  email: String,
  picture: String
}, { timestamps: true });
const GUser = mongoose.model('UserAuth', GUserSchema);

const CustomRequestSchema = new mongoose.Schema({
  name: String,
  email: String,
  product: String,
  category: String,
  details: String,
  image: {
    url: String,
    public_id: String
  }
}, { timestamps: true });
const CustomRequest = mongoose.model('CustomRequest', CustomRequestSchema);

const Order = mongoose.model('Order', new mongoose.Schema({}, { strict: false }));

// ---------------------
// Multer (memory storage for Cloudinary)
// ---------------------
const storage = multer.memoryStorage();
const upload = multer({ storage });

// ---------------------
// Session & Passport
// ---------------------
app.use(session({
  secret: process.env.SESSION_SECRET || 'keyboard cat',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 1000 * 60 * 60 * 24 }
}));
app.use(passport.initialize());
app.use(passport.session());

// Google OAuth setup
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: '/auth/google/callback'
  }, async (accessToken, refreshToken, profile, done) => {
    try {
      let user = await GUser.findOne({ googleId: profile.id });
      if (!user) {
        user = await GUser.create({
          googleId: profile.id,
          name: profile.displayName,
          email: profile.emails?.[0]?.value || '',
          picture: profile.photos?.[0]?.value || ''
        });
      }
      return done(null, user);
    } catch (err) {
      return done(err, null);
    }
  }));

  passport.serializeUser((user, done) => done(null, { id: user.id, provider: 'google' }));
  passport.deserializeUser(async (obj, done) => {
    try {
      if (obj.provider === 'google') {
        const user = await GUser.findById(obj.id);
        return done(null, user);
      }
      done(null, null);
    } catch (err) {
      done(err, null);
    }
  });

  app.get('/auth/google', passport.authenticate('google', { scope: ['profile', 'email'] }));
  app.get('/auth/google/callback',
    passport.authenticate('google', { failureRedirect: '/login' }),
    (req, res) => {
      req.session.userId = req.user?._id;
      req.session.fullname = req.user?.name;
      res.redirect('/');
    });
}

// ---------------------
// Cloudinary helpers
// ---------------------
async function uploadToCloudinaryBuffer(buffer, folder = 'artistgrade/uploads') {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream({ folder }, (err, result) => {
      if (err) return reject(err);
      resolve(result);
    });
    stream.end(buffer);
  });
}

async function destroyFromCloudinary(public_id) {
  if (!public_id) return;
  try {
    await cloudinary.uploader.destroy(public_id);
  } catch (err) {
    console.warn('⚠️ Cloudinary destroy failed:', err.message);
  }
}

// ---------------------
// Nodemailer transporter
// ---------------------
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// ---------------------
// Static frontend routes
// ---------------------
const pages = ['index', 'about', 'contactus', 'login', 'shop', 'product_details', 'register'];
pages.forEach(page => {
  app.get(`/${page === 'index' ? '' : page}`, (req, res) => {
    res.sendFile(path.join(__dirname, `views/pages/${page}.html`));
  });
});

const adminPages = ['dashboard', 'products', 'orders', 'users'];
adminPages.forEach(page => {
  app.get(`/${page}`, (req, res) => {
    res.sendFile(path.join(__dirname, `views/pages/Admin/${page}.html`));
  });
});
app.get('/admin', (req, res) => res.redirect('/dashboard'));

// ---------------------
// API routes
// ---------------------

// Dashboard counts
app.get('/api/dashboard-counts', async (req, res) => {
  try {
    const [totalProducts, totalOrders, totalUsers] = await Promise.all([
      Product.countDocuments(),
      Order.countDocuments(),
      UserReg.countDocuments()
    ]);
    res.json({ totalProducts, totalOrders, totalUsers });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Get all products
app.get('/api/products', async (req, res) => {
  try {
    const products = await Product.find().sort({ createdAt: -1 });
    res.json(products);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching products' });
  }
});

// Get single product
app.get('/api/products/:id', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: 'Product not found' });
    res.json(product);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching product' });
  }
});

// Create product (with optional image)
app.post('/api/products', upload.single('image'), async (req, res) => {
  try {
    const { name, category, price, stock } = req.body;
    if (!name || !price || !stock) return res.status(400).json({ message: 'Missing required fields' });

    let image = { url: '', public_id: '' };
    if (req.file?.buffer) {
      const result = await uploadToCloudinaryBuffer(req.file.buffer);
      image = { url: result.secure_url, public_id: result.public_id };
    }

    const product = new Product({ name, category, price, stock, image });
    await product.save();
    res.json(product);
  } catch (err) {
    res.status(500).json({ message: 'Error creating product' });
  }
});

// Update product
app.put('/api/products/:id', upload.single('image'), async (req, res) => {
  try {
    const { name, category, price, stock } = req.body;
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: 'Product not found' });

    product.name = name || product.name;
    product.category = category || product.category;
    product.price = price || product.price;
    product.stock = stock || product.stock;

    if (req.file?.buffer) {
      if (product.image?.public_id) await destroyFromCloudinary(product.image.public_id);
      const result = await uploadToCloudinaryBuffer(req.file.buffer);
      product.image = { url: result.secure_url, public_id: result.public_id };
    }

    await product.save();
    res.json(product);
  } catch (err) {
    res.status(500).json({ message: 'Error updating product' });
  }
});

// Delete product
app.delete('/api/products/:id', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: 'Product not found' });

    if (product.image?.public_id) await destroyFromCloudinary(product.image.public_id);
    await Product.deleteOne({ _id: req.params.id });
    res.json({ message: 'Product deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Error deleting product' });
  }
});

// Custom product requests
app.post('/submit-request', upload.single('image'), async (req, res) => {
  try {
    const { name, email, product: productName, category, details } = req.body;
    if (!name || !email || !productName)
      return res.status(400).json({ message: 'Name, email, and product required' });

    let image = { url: '', public_id: '' };
    if (req.file?.buffer) {
      const result = await uploadToCloudinaryBuffer(req.file.buffer, 'artistgrade/requests');
      image = { url: result.secure_url, public_id: result.public_id };
    }

    const request = new CustomRequest({ name, email, product: productName, category, details, image });
    await request.save();

    // Send confirmation email
    if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
      await transporter.sendMail({
        from: `"ArtistGrade" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: 'Custom Product Request Received',
        html: `<h3>Hi ${name},</h3>
               <p>We received your request for <strong>${productName}</strong>. We'll contact you soon.</p>`
      });
    }

    res.json({ message: 'Request submitted successfully!' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Register
app.post('/api/register', async (req, res) => {
  try {
    const { fullname, username, email, phone, password, confirmPassword, gender } = req.body;
    if (!fullname || !username || !email || !password || !confirmPassword)
      return res.status(400).json({ message: 'All fields required' });
    if (password !== confirmPassword)
      return res.status(400).json({ message: 'Passwords do not match' });

    const existingUser = await UserReg.findOne({ $or: [{ email }, { username }] });
    if (existingUser)
      return res.status(400).json({ message: 'Email or username already exists' });

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new UserReg({ fullname, username, email, phone, password: hashedPassword, gender });
    await user.save();
    res.json({ message: 'User registered successfully!' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Login
app.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).send('Email and password required');

    const user = await UserReg.findOne({ email: email.toLowerCase() });
    if (!user) return res.status(401).send('Invalid credentials');

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).send('Invalid credentials');

    req.session.userId = user._id;
    req.session.fullname = user.fullname;
    req.session.role = user.role;

    res.json({ message: 'Login successful', user: { id: user._id, fullname: user.fullname } });
  } catch (err) {
    res.status(500).send('Server error');
  }
});

// Logout
app.get('/logout', (req, res, next) => {
  req.logout?.(err => {
    if (err) return next(err);
    req.session.destroy(() => {
      res.clearCookie('connect.sid');
      res.redirect('/');
    });
  }) ?? req.session.destroy(() => {
    res.clearCookie('connect.sid');
    res.redirect('/');
  });
});

// Current user
app.get('/api/current_user', async (req, res) => {
  try {
    if (req.session?.userId) {
      const user = await UserReg.findById(req.session.userId).select('-password');
      return res.json(user);
    }
    if (req.user) return res.json(req.user);
    res.json(null);
  } catch (err) {
    res.status(500).json(null);
  }
});

// Users management
app.get('/api/users', async (req, res) => {
  try {
    const users = await UserReg.find().sort({ createdAt: -1 }).select('-password');
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching users' });
  }
});

app.put('/api/users/:id', async (req, res) => {
  try {
    const { fullname, email, username, role, isActive } = req.body;
    const user = await UserReg.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    user.fullname = fullname ?? user.fullname;
    user.email = email ?? user.email;
    user.username = username ?? user.username;
    user.role = role ?? user.role;
    user.isActive = isActive ?? user.isActive;

    await user.save();
    res.json({ message: 'User updated successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

app.delete('/api/users/:id', async (req, res) => {
  try {
    await UserReg.findByIdAndDelete(req.params.id);
    res.json({ message: 'User deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Error deleting user' });
  }
});

// Checkout
app.get('/checkout', (req, res) => {
  if (!req.session?.userId) return res.redirect('/login?redirect=/checkout');
  res.sendFile(path.join(__dirname, 'public', 'checkout.html'));
});

// ---------------------
// Start Server
// ---------------------
app.listen(PORT, () => console.log(`🚀 Server running at http://localhost:${PORT}`));
