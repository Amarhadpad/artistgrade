document.addEventListener("DOMContentLoaded", () => {
  const productGrid = document.getElementById("productGrid");
  const searchInput = document.getElementById("searchInput");
  const categoryFilter = document.getElementById("categoryFilter");
  const styleFilter = document.getElementById("styleFilter");
  const minPrice = document.getElementById("minPrice");
  const maxPrice = document.getElementById("maxPrice");
  const inStockFilter = document.getElementById("inStockFilter");
  const sortBy = document.getElementById("sortBy");
  const cartBtn = document.getElementById("cartBtn");
  const cartSidebar = document.getElementById("cartSidebar");
  const closeCart = document.getElementById("closeCart");
  const cartItemsEl = document.getElementById("cartItems");
  const cartTotalEl = document.getElementById("cartTotal");
  const cartCountEl = document.getElementById("cartCount");

  let products = [];
  let cart = [];

  async function fetchProducts() {
    const res = await fetch("/api/products");
    products = await res.json();
    renderProducts();
  }

  function renderProducts() {
    productGrid.innerHTML = "";
    let filtered = products.filter(p => {
      return (
        p.title.toLowerCase().includes(searchInput.value.toLowerCase()) &&
        (categoryFilter.value === "" || p.category === categoryFilter.value) &&
        (styleFilter.value === "" || p.style === styleFilter.value) &&
        (minPrice.value === "" || p.price >= parseInt(minPrice.value)) &&
        (maxPrice.value === "" || p.price <= parseInt(maxPrice.value)) &&
        (!inStockFilter.checked || p.stock)
      );
    });

    if (sortBy.value === "priceLow") {
      filtered.sort((a, b) => a.price - b.price);
    } else if (sortBy.value === "priceHigh") {
      filtered.sort((a, b) => b.price - a.price);
    } else {
      filtered.sort((a, b) => b.id - a.id); // newest
    }

    filtered.forEach(p => {
      const div = document.createElement("div");
      div.className = "product";
      div.innerHTML = `
        <img src="${p.image}" alt="${p.title}">
        <h3>${p.title}</h3>
        <p>Category: ${p.category}</p>
        <p>Style: ${p.style}</p>
        <p>Price: ₹${p.price}</p>
        <p>${p.stock ? "✅ In Stock" : "❌ Out of Stock"}</p>
        ${p.stock ? `<button onclick="addToCart(${p.id})">Add to Cart</button>` : ""}
      `;
      productGrid.appendChild(div);
    });
  }

  window.addToCart = function (id) {
    const product = products.find(p => p.id === id);
    const existing = cart.find(item => item.id === id);
    if (existing) {
      existing.qty++;
    } else {
      cart.push({ ...product, qty: 1 });
    }
    updateCart();
  };

  function updateCart() {
    cartItemsEl.innerHTML = "";
    let total = 0;
    cart.forEach(item => {
      total += item.price * item.qty;
      const li = document.createElement("li");
      li.innerHTML = `
        ${item.title} x${item.qty} 
        <button onclick="removeFromCart(${item.id})">✖</button>
      `;
      cartItemsEl.appendChild(li);
    });
    cartTotalEl.textContent = `Total: ₹${total}`;
    cartCountEl.textContent = cart.length;
  }

  window.removeFromCart = function (id) {
    cart = cart.filter(item => item.id !== id);
    updateCart();
  };

  // Cart open/close
  cartBtn.addEventListener("click", () => {
    cartSidebar.classList.add("active");
  });
  closeCart.addEventListener("click", () => {
    cartSidebar.classList.remove("active");
  });

  // Filters
  [searchInput, categoryFilter, styleFilter, minPrice, maxPrice, inStockFilter, sortBy]
    .forEach(el => el.addEventListener("input", renderProducts));

  fetchProducts();
});
