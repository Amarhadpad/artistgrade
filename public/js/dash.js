
  const API = '/api/products';

  // Fetch total products count from DB
  async function fetchTotalProducts() {
    try {
      const res = await fetch(API);
      if (!res.ok) throw new Error('Failed to fetch products');
      const products = await res.json();
      document.getElementById('totalProducts').textContent = products.length || 0;
    } catch (err) {
      console.error('Error fetching total products:', err);
      document.getElementById('totalProducts').textContent = '0';
    }
  }

  // Call on page load
  document.addEventListener('DOMContentLoaded', fetchTotalProducts);

const USERS_API = '/api/users';

// Fetch total users count from DB
async function fetchTotalUsers() {
  try {
    const res = await fetch(USERS_API);
    if (!res.ok) throw new Error('Failed to fetch users');
    const users = await res.json();
    document.getElementById('totalUsers').textContent = users.length || 0;
  } catch (err) {
    console.error('Error fetching total users:', err);
    document.getElementById('totalUsers').textContent = '0';
  }
}

// Call on page load
document.addEventListener('DOMContentLoaded', fetchTotalUsers);
