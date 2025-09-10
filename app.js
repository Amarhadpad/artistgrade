// server.js
const express = require('express');
const mongoose = require('mongoose');
const multer = require('multer');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = 3000;

// Ensure uploads dir exists
const UPLOAD_DIR = path.join(__dirname, 'uploads');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR);

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname)); // serve frontend files (index.html, adminpanel/)
app.use('/uploads', express.static(UPLOAD_DIR)); // serve uploaded images

// MongoDB connection
mongoose.connect('mongodb://127.0.0.1:27017/artistgradeDB', {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log('✅ MongoDB Connected'))
.catch(err => console.error('❌ MongoDB connection error:', err));

// Product schema
const ProductSchema = new mongoose.Schema({
  name: String,
  category: String,
  price: Number,
  stock: Number,
  image: String // path like "/uploads/12345.png"
}, { timestamps: true });

const Product = mongoose.model('Product', ProductSchema);

// Multer config
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname))
});
const upload = multer({ storage });


// ---------- FRONTEND ROUTES ----------
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));
app.get('/admin/dashboard', (req, res) => res.sendFile(path.join(__dirname, 'adminpanel', 'dashboard.html')));
app.get('/admin/orders', (req, res) => res.sendFile(path.join(__dirname, 'adminpanel', 'orders.html')));
app.get('/admin/products', (req, res) => res.sendFile(path.join(__dirname, 'adminpanel', 'products.html')));
app.get('/admin/users', (req, res) => res.sendFile(path.join(__dirname, 'adminpanel', 'users.html')));      


// ---------- API ROUTES ----------
// GET all products
app.get('/api/products', async (req, res) => {
  try {
    const products = await Product.find().sort({ createdAt: -1 });
    const mapped = products.map(p => ({
      _id: p._id,
      name: p.name,
      category: p.category,
      price: p.price,
      stock: p.stock,
      image: p.image
    }));
    res.json(mapped);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error fetching products' });
  }
});

// GET single product
app.get('/api/products/:id', async (req, res) => {
  try {
    const p = await Product.findById(req.params.id);
    if (!p) return res.status(404).json({ message: 'Not found' });
    res.json(p);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error' });
  }
});

// CREATE product (with image)
app.post('/api/products', upload.single('image'), async (req, res) => {
  try {
    const { name, category, price, stock } = req.body;
    if (!req.file) return res.status(400).json({ message: 'Image required' });

    const imagePath = `/uploads/${path.basename(req.file.path)}`;
    const product = new Product({
      name, category,
      price: Number(price || 0),
      stock: Number(stock || 0),
      image: imagePath
    });
    await product.save();
    res.json({ message: 'Product created', product });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error creating product' });
  }
});

// UPDATE product (optionally replace image)
app.put('/api/products/:id', upload.single('image'), async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: 'Not found' });

    const { name, category, price, stock } = req.body;
    if (name !== undefined) product.name = name;
    if (category !== undefined) product.category = category;
    if (price !== undefined) product.price = Number(price);
    if (stock !== undefined) product.stock = Number(stock);

    if (req.file) {
      if (product.image) {
        const oldPath = path.join(__dirname, product.image);
        if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
      }
      product.image = `/uploads/${path.basename(req.file.path)}`;
    }

    await product.save();
    res.json({ message: 'Product updated', product });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error updating product' });
  }
});

// DELETE product
app.delete('/api/products/:id', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: 'Not found' });

    if (product.image) {
      const imgPath = path.join(__dirname, product.image);
      if (fs.existsSync(imgPath)) fs.unlinkSync(imgPath);
    }

    await Product.deleteOne({ _id: req.params.id });
    res.json({ message: 'Product deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error deleting product' });
  }
});


// ---------- 404 HANDLER (last route) ----------
app.use((req, res) => {
  res.status(404).sendFile(path.join(__dirname, 'public', '404.html'));
});


// Start server
app.listen(PORT, () => console.log(`🚀 Server running: http://localhost:${PORT}`));
