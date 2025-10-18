const API = '/api/products';

// Cloudinary configuration
const cloudName = "dbbzwinzl";       // Your Cloudinary cloud name
const uploadPreset = "unsigned_preset"; // Your unsigned preset

document.addEventListener('DOMContentLoaded', () => {
  fetchProducts();

  const form = document.getElementById('productForm');
  const fileInput = document.getElementById('productImage');
  const preview = document.getElementById('imagePreview');
  const modalEl = document.getElementById('addProductModal');
  const bootstrapModal = new bootstrap.Modal(modalEl);

  // Image preview
  fileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        preview.src = ev.target.result;
        preview.style.display = 'block';
      };
      reader.readAsDataURL(file);
    } else {
      preview.src = '';
      preview.style.display = 'none';
    }
  });

  // Reset modal for adding product
  modalEl.addEventListener('show.bs.modal', () => {
    if (!document.getElementById('productId').value) {
      document.getElementById('modalTitle').textContent = 'Add Product';
      form.reset();
      preview.style.display = 'none';
    }
  });

  // Form submit
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('productId').value;

    const saveBtn = document.getElementById('saveBtn');
    saveBtn.disabled = true;
    saveBtn.textContent = id ? "Updating..." : "Saving...";

    let imageUrl = document.getElementById('imagePreview').src;

    try {
      // Upload to Cloudinary if new file selected
      const file = fileInput.files[0];
      if (file) {
        const uploadData = new FormData();
        uploadData.append("file", file);
        uploadData.append("upload_preset", uploadPreset);

        const uploadRes = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
          method: "POST",
          body: uploadData
        });

        const cloudData = await uploadRes.json();
        console.log("Cloudinary response:", cloudData);

        if (!uploadRes.ok) throw new Error(cloudData.error?.message || "Cloudinary upload failed");
        imageUrl = cloudData.secure_url;
      }

      // Prepare product data
      const productData = {
        name: form.productName.value,
        category: form.productCategory.value,
        price: parseFloat(form.productPrice.value),
        stock: parseInt(form.productStock.value),
        image: imageUrl
      };

      // Send to backend
      const url = id ? `${API}/${id}` : API;
      const method = id ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(productData)
      });

      if (!res.ok) throw new Error("Failed to save product");

      await fetchProducts();
      bootstrapModal.hide();
      form.reset();
      document.getElementById('productId').value = '';
      preview.style.display = 'none';
      
    } catch (err) {
      console.error("Error saving product:", err);
      alert(err.message || "Error saving product");
    } finally {
      saveBtn.disabled = false;
      saveBtn.textContent = "Save";
    }
  });

  // Search filter
  document.getElementById('searchInput').addEventListener('input', (e) => {
    const term = e.target.value.toLowerCase();
    document.querySelectorAll('#productList tr').forEach(row => {
      row.style.display = row.innerText.toLowerCase().includes(term) ? '' : 'none';
    });
  });
});

// Fetch products
async function fetchProducts() {
  try {
    const res = await fetch(API);
    if (!res.ok) throw new Error("Failed to fetch products");
    const products = await res.json();

    const list = document.getElementById('productList');
    list.innerHTML = '';

    products.forEach(p => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td><img src="${p.image}" class="product-img" alt="img"></td>
        <td>${escapeHtml(p.name)}</td>
        <td>${escapeHtml(p.category)}</td>
        <td>₹${p.price}</td>
        <td>${p.stock}</td>
        <td>
          <button class="btn btn-sm btn-warning me-1" onclick="startEdit('${p._id}')">
            <i class="fas fa-edit"></i>
          </button>
          <button class="btn btn-sm btn-danger" onclick="deleteProduct('${p._id}')">
            <i class="fas fa-trash"></i>
          </button>
        </td>
      `;
      list.appendChild(tr);
    });
  } catch (err) {
    console.error("Error fetching products:", err);
    alert("Failed to load products");
  }
}

// Start editing
async function startEdit(id) {
  try {
    const res = await fetch(`${API}/${id}`);
    if (!res.ok) throw new Error("Product not found");
    const p = await res.json();

    document.getElementById('productId').value = p._id;
    document.getElementById('productName').value = p.name;
    document.getElementById('productCategory').value = p.category;
    document.getElementById('productPrice').value = p.price;
    document.getElementById('productStock').value = p.stock;
    document.getElementById('imagePreview').src = p.image;
    document.getElementById('imagePreview').style.display = 'block';

    new bootstrap.Modal(document.getElementById('addProductModal')).show();
  } catch (err) {
    console.error(err);
    alert("Error loading product details");
  }
}

// Delete product
async function deleteProduct(id) {
  if (!confirm("Are you sure you want to delete this product?")) return;
  try {
    const res = await fetch(`${API}/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error("Delete failed");
    await fetchProducts();
  } catch (err) {
    console.error(err);
    alert("Error deleting product");
  }
}

// Escape HTML
function escapeHtml(str) {
  if (!str) return '';
  return String(str).replace(/[&<>"'`=\/]/g, s => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
    '/': '&#x2F;',
    '`': '&#x60;',
    '=': '&#x3D;'
  }[s]));
}
