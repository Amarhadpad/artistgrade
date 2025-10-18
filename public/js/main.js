// ========== Load Best Sellers ==========

const BEST_SELLERS_API = '/api/products?bestSellers=true';

async function loadBestSellers() {
  try {
    const res = await fetch(BEST_SELLERS_API);
    if (!res.ok) throw new Error('Failed to fetch best sellers');
    const products = await res.json();

    const inner = document.getElementById('bestSellersInner');
    inner.innerHTML = '';

    for (let i = 0; i < products.length; i += 4) {
      const slideProducts = products.slice(i, i + 4);
      const slideDiv = document.createElement('div');
      slideDiv.className = `carousel-item ${i === 0 ? 'active' : ''}`;

      let rowHTML = '<div class="row g-3 justify-content-center">';
      slideProducts.forEach((p, idx) => {
        rowHTML += `
          <div class="col-12 col-md-6 col-lg-3 ${idx > 0 ? 'd-none d-md-block' : ''} ${idx > 1 ? 'd-none d-lg-block' : ''}">
            <div class="product-card text-center" data-id="${p._id}">
              <img src="${(typeof p.image === 'string') ? p.image : p.image?.url || ''}" class="d-block w-100" alt="${p.name}">
              <h3>${p.name}</h3>
              <p>₹${p.price.toFixed(2)}</p>
              <button class="btn btn-dark add-to-cart-btn">Add to Cart</button>
            </div>
          </div>
        `;
      });
      rowHTML += '</div>';
      slideDiv.innerHTML = rowHTML;
      inner.appendChild(slideDiv);
    }

    // After rendering, attach event listeners
    attachAddToCartButtons();
  } catch (err) {
    console.error(err);
    const inner = document.getElementById('bestSellersInner');
    inner.innerHTML = '<p class="text-center">Failed to load products.</p>';
  }
}

// ========== Cart Logic ==========

(function () {
  let cartCount = 0;
  const cartIcon = document.querySelector(".cart-icon");
  const cartItemsContainer = document.getElementById("cartItems");
  const sidebar = document.getElementById("cartSidebar");
  const overlay = document.getElementById("cartOverlay");
  const closeCart = document.getElementById("closeCart");
  const checkoutBtn = document.getElementById("checkoutBtn");

  const cartCountBadge = document.createElement("span");
  cartCountBadge.className = "cart-count";
  cartIcon.appendChild(cartCountBadge);

  function updateBadge() {
    if (cartCount > 0) {
      cartCountBadge.textContent = cartCount;
      cartCountBadge.classList.add("show");
    } else {
      cartCountBadge.textContent = "";
      cartCountBadge.classList.remove("show");
    }
  }

  function saveCartToStorage() {
    localStorage.setItem("cartItemsHTML", cartItemsContainer.innerHTML);
    localStorage.setItem("cartCount", cartCount);
  }

  function loadCartFromStorage() {
    const savedHTML = localStorage.getItem("cartItemsHTML");
    const savedCount = localStorage.getItem("cartCount");
    if (savedHTML) {
      cartItemsContainer.innerHTML = savedHTML;
      cartCount = parseInt(savedCount) || 0;
      updateBadge();

      // reattach remove event listeners
      cartItemsContainer.querySelectorAll(".remove-item").forEach(btn => {
        btn.addEventListener("click", function () {
          const itemDiv = btn.closest(".cart-item");
          itemDiv.remove();
          cartCount = Math.max(0, cartCount - 1);
          updateBadge();
          saveCartToStorage();
          if (cartCount === 0) {
            cartItemsContainer.innerHTML = '<p class="text-muted">Your cart is empty</p>';
          }
        });
      });
    }
  }

  // Add-to-cart custom event listener
  window.addEventListener("add-to-cart-manual", function (e) {
    const { itemName, itemPrice } = e.detail;

    cartCount++;
    updateBadge();

    const emptyP = cartItemsContainer.querySelector("p.text-muted");
    if (emptyP) emptyP.remove();

    const itemDiv = document.createElement("div");
    itemDiv.className = "cart-item";
    itemDiv.innerHTML = `
      <span>${escapeHtml(itemName)} ${itemPrice ? " - " + escapeHtml(itemPrice) : ""}</span>
      <div>
        <button class="btn btn-sm btn-outline-danger remove-item" type="button">Remove</button>
      </div>
    `;
    cartItemsContainer.appendChild(itemDiv);

    itemDiv.querySelector(".remove-item").addEventListener("click", function () {
      itemDiv.remove();
      cartCount = Math.max(0, cartCount - 1);
      updateBadge();
      saveCartToStorage();
      if (cartCount === 0) {
        cartItemsContainer.innerHTML = '<p class="text-muted">Your cart is empty</p>';
      }
    });

    sidebar.classList.add("open");
    overlay.classList.add("active");

    saveCartToStorage();
  });

  function escapeHtml(str) {
    return str.replace(/[&<>"'`=\/]/g, function (s) {
      return ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;',
        '/': '&#x2F;',
        '`': '&#x60;',
        '=': '&#x3D;'
      })[s];
    });
  }

  cartIcon.addEventListener("click", (e) => {
    e.preventDefault();
    sidebar.classList.add("open");
    overlay.classList.add("active");
  });

  closeCart.addEventListener("click", () => {
    sidebar.classList.remove("open");
    overlay.classList.remove("active");
  });

  overlay.addEventListener("click", () => {
    sidebar.classList.remove("open");
    overlay.classList.remove("active");
  });

  checkoutBtn.addEventListener("click", async () => {
    if (cartCount === 0) {
      alert("Your cart is empty. Please add items before proceeding to payment.");
      return;
    }

    // Gather cart item texts
    const items = [];
    cartItemsContainer.querySelectorAll(".cart-item span").forEach(span => {
      items.push(span.textContent);
    });

    // Send to backend
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cartItems: items })
      });
      const data = await res.json();
      if (data.success) {
        // Clear cart
        cartItemsContainer.innerHTML = '<p class="text-muted">Your cart is empty</p>';
        cartCount = 0;
        updateBadge();
        localStorage.removeItem("cartItemsHTML");
        localStorage.removeItem("cartCount");

        alert("Order placed! Order ID: " + data.orderId);
        window.location.href = '/';
      } else {
        alert("Checkout failed. Please try again.");
      }
    } catch (err) {
      console.error(err);
      alert("Checkout error. Please try again.");
    }
  });

  // On startup
  loadCartFromStorage();
  updateBadge();
})();
