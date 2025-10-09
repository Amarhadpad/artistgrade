// js/users.js

document.addEventListener("DOMContentLoaded", fetchUsers);

async function fetchUsers() {
  try {
    const res = await fetch("/api/users");
    if (!res.ok) throw new Error("Failed to fetch users");
    
    const users = await res.json();
    const tbody = document.getElementById("userTableBody");
    tbody.innerHTML = ""; // Clear previous content

    users.forEach(user => {
      const tr = document.createElement("tr");

      tr.innerHTML = `
        <td>${user._id}</td>
        <td>${escapeHtml(user.fullname)}</td>
        <td>${escapeHtml(user.email)}</td>
        <td>${new Date(user.createdAt).toLocaleDateString()}</td>
        <td>${user.role || 'User'}</td>
        <td>${user.isActive === false ? '<span class="text-danger">Inactive</span>' : '<span class="text-success">Active</span>'}</td>
        <td>
          <button class="btn btn-sm btn-danger" onclick="deleteUser('${user._id}')">Delete</button>
        </td>
      `;
      tbody.appendChild(tr);
    });

  } catch (err) {
    console.error(err);
    alert("Error fetching users");
  }
}

// Delete user
async function deleteUser(id) {
  if (!confirm("Are you sure you want to delete this user?")) return;

  try {
    const res = await fetch(`/api/users/${id}`, { method: "DELETE" });
    if (!res.ok) throw new Error("Failed to delete user");
    alert("User deleted successfully");
    fetchUsers(); // Refresh the table
  } catch (err) {
    console.error(err);
    alert("Error deleting user");
  }
}

// Simple HTML escape
function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/[&<>"'`=\/]/g, s => ({
    '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;', '/':'&#x2F;', '`':'&#x60;', '=':'&#x3D;'
  }[s]));
}

