const ordersBody = document.getElementById("ordersBody");

async function loadOrders() {
  try {
    const res = await fetch('http://localhost:5000/api/orders'); // your API
    if(!res.ok) throw new Error('Failed to fetch orders');

    const orders = await res.json();

    ordersBody.innerHTML = '';

    if (orders.length === 0) {
      ordersBody.innerHTML = `<tr><td colspan="6" class="text-center">No orders found</td></tr>`;
      return;
    }

    orders.forEach((order, index) => {
      const tr = document.createElement('tr');

      tr.innerHTML = `
        <td>${index + 1}</td>
        <td>
          ${order.fullName} <br>
          <small>${order.email}</small> <br>
          <small>${order.phone}</small>
        </td>
        <td>${new Date(order.date).toLocaleString()}</td>
        <td>₹${order.totalAmount.toFixed(2)}</td>
        <td>${order.status || 'Pending'}</td>
        <td>
          <button class="btn btn-sm btn-primary" onclick="viewOrder('${order._id}')"><i class="fa-solid fa-eye"></i> View</button>
          <button class="btn btn-sm btn-danger" onclick="deleteOrder('${order._id}')"><i class="fa-solid fa-trash"></i></button>
        </td>
      `;

      ordersBody.appendChild(tr);
    });

  } catch (err) {
    console.error(err);
    ordersBody.innerHTML = `<tr><td colspan="6" class="text-center text-danger">Error loading orders</td></tr>`;
  }
}

async function viewOrder(id){
  try {
    const res = await fetch(`http://localhost:5000/api/orders/${id}`);
    if(!res.ok) throw new Error('Failed to fetch order');
    const order = await res.json();

    alert(
      `Order ID: ${order._id}\nCustomer: ${order.fullName}\nEmail: ${order.email}\nPhone: ${order.phone}\nAddress: ${order.address}, ${order.city}, ${order.state} - ${order.zip}\n\nTransaction ID: ${order.transactionId}\n\nItems:\n${order.cartItems.map(i => `${i.name} x${i.quantity} - ₹${i.price}`).join('\n')}\n\nTotal: ₹${order.totalAmount.toFixed(2)}\nStatus: ${order.status || 'Pending'}`
    );
  } catch(err) {
    console.error(err);
    alert("Failed to load order details");
  }
}

async function deleteOrder(id){
  if(!confirm("Are you sure you want to delete this order?")) return;
  try {
    const res = await fetch(`http://localhost:5000/api/orders/${id}`, { method: 'DELETE' });
    if(!res.ok) throw new Error('Failed to delete order');
    loadOrders();
  } catch(err) {
    console.error(err);
    alert("Failed to delete order");
  }
}

document.addEventListener('DOMContentLoaded', loadOrders);
