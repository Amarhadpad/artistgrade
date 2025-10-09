
        const API = '/api/products';

        document.addEventListener('DOMContentLoaded', () => {
          fetchProducts();

          const form = document.getElementById('productForm');
          const preview = document.getElementById('imagePreview');
          const fileInput = document.getElementById('productImage');
          const modalEl = document.getElementById('addProductModal');
          const bootstrapModal = new bootstrap.Modal(modalEl);

          // Image preview
          fileInput.addEventListener('change', (e) => {
            const f = e.target.files[0];
            if (f) {
              const reader = new FileReader();
              reader.onload = ev => {
                preview.src = ev.target.result;
                preview.style.display = 'block';
              };
              reader.readAsDataURL(f);
            } else {
              preview.style.display = 'none';
              preview.src = '';
            }
          });

          // Reset modal for Add
          modalEl.addEventListener('show.bs.modal', () => {
            if (!document.getElementById('productId').value) {
              document.getElementById('modalTitle').textContent = 'Add Product';
              preview.style.display = 'none';
              form.reset();
            }
          });

          // Submit form -> add or update
          form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const id = document.getElementById('productId').value;
            const formData = new FormData(form);

            try {
              const url = id ? `${API}/${id}` : API;
              const method = id ? 'PUT' : 'POST';
              const res = await fetch(url, { method, body: formData });
              if (!res.ok) throw new Error('Network response was not ok');
              await fetchProducts();
              bootstrapModal.hide();
              form.reset();
              document.getElementById('productId').value = '';
              preview.style.display = 'none';
            } catch (err) {
              alert('Error saving product');
              console.error(err);
            }
          });

          // Search
          document.getElementById('searchInput').addEventListener('input', (e) => {
            const term = e.target.value.toLowerCase();
            document.querySelectorAll('#productList tr').forEach(row => {
              row.style.display = row.innerText.toLowerCase().includes(term) ? '' : 'none';
            });
            updateTotalCount(); // Update total count on search/filter
          });
        });

        // Fetch and render products
        async function fetchProducts() {
          try {
            const res = await fetch(API);
            const products = await res.json();
            const list = document.getElementById('productList');
            list.innerHTML = '';

            products.forEach(p => {
              const tr = document.createElement('tr');
              tr.innerHTML = `
                <td><img src="${p.image}" class="product-img"></td>
                <td>${escapeHtml(p.name)}</td>
                <td>${escapeHtml(p.category)}</td>
                <td>₹${p.price}</td>
                <td>${p.stock}</td>
                <td>
                  <button class="btn btn-sm btn-warning me-1" onclick="startEdit('${p._id}')"><i class="fas fa-edit"></i></button>
                  <button class="btn btn-sm btn-danger" onclick="deleteProduct('${p._id}')"><i class="fas fa-trash"></i></button>
                </td>
              `;
              list.appendChild(tr);
            });

            updateTotalCount(); // Update total after fetching
          } catch (err) {
            console.error('Error fetching products:', err);
            alert('Failed to fetch products');
          }
        }

        // Update total products count in footer
        function updateTotalCount() {
          const totalVisible = Array.from(document.querySelectorAll('#productList tr'))
                                    .filter(row => row.style.display !== 'none').length;
          const footer = document.getElementById('totalProductsFooter');
          if (footer) {
            footer.textContent = `Total Products: ${totalVisible}`;
          }
        }

        // Edit product
        async function startEdit(id) {
          try {
            const res = await fetch(`${API}/${id}`);
            if (!res.ok) throw new Error('Not found');
            const p = await res.json();
            document.getElementById('productId').value = p._id;
            document.getElementById('productName').value = p.name;
            document.getElementById('productCategory').value = p.category;
            document.getElementById('productPrice').value = p.price;
            document.getElementById('productStock').value = p.stock;
            const preview = document.getElementById('imagePreview');
            preview.src = p.image;
            preview.style.display = 'block';
            new bootstrap.Modal(document.getElementById('addProductModal')).show();
          } catch (err) {
            alert('Unable to fetch product');
            console.error(err);
          }
        }

        // Delete product
        async function deleteProduct(id) {
          if (!confirm('Delete this product?')) return;
          try {
            const res = await fetch(`${API}/${id}`, { method: 'DELETE' });
            if (!res.ok) throw new Error('Delete failed');
            await fetchProducts();
          } catch (err) {
            alert('Error deleting product');
            console.error(err);
          }
        }

        // Escape HTML
        function escapeHtml(str) {
          if (!str) return '';
          return String(str).replace(/[&<>"'`=\/]/g, function (s) {
            return ({
              '&':'&amp;',
              '<':'&lt;',
              '>':'&gt;',
              '"':'&quot;',
              "'":'&#39;',
              '/':'&#x2F;',
              '`':'&#x60;',
              '=':'&#x3D;'
            })[s];
          });
        }
