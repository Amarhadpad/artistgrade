async function viewOrder(id){
  try {
    const res = await fetch(`http://localhost:3000/api/orders/${id}`);
    if(!res.ok) throw new Error('Failed to fetch order');
    const order = await res.json();

    const itemsHTML = order.cartItems.map(i => `
      <tr>
        <td>${i.name}</td>
        <td>${i.quantity}</td>
        <td>₹${i.price.toFixed(2)}</td>
        <td>₹${(i.price*i.quantity).toFixed(2)}</td>
      </tr>
    `).join('');

    document.getElementById('modalBody').innerHTML = `
      <p><strong>Order ID:</strong> ${order.orderId}</p>
      <p><strong>Customer:</strong> ${order.fullName}</p>
      <p><strong>Email:</strong> ${order.email}</p>
      <p><strong>Phone:</strong> ${order.phone}</p>
      <p><strong>Address:</strong> ${order.address}, ${order.city}, ${order.state} - ${order.zip}</p>
      <p><strong>Transaction ID:</strong> ${order.transactionId}</p>
      <p><strong>Status:</strong> ${order.status}</p>
      <p><strong>Date:</strong> ${new Date(order.date).toLocaleString('en-IN')}</p>
      <table class="table table-sm">
        <thead>
          <tr>
            <th>Item</th><th>Qty</th><th>Price</th><th>Subtotal</th>
          </tr>
        </thead>
        <tbody>${itemsHTML}</tbody>
      </table>
      <p class="fw-bold text-end">Total: ₹${order.totalAmount.toFixed(2)}</p>
    `;

    const modal = new bootstrap.Modal(document.getElementById('viewOrderModal'));
    modal.show();

  } catch(err){
    console.error(err);
    alert("Failed to load order details");
  }
}
