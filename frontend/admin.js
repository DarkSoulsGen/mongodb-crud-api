// admin.js

// 🚨 API_BASE_URL, PRODUCTS_URL, USERS_URL, and DEFAULT_PROFILE_PIC are now assumed to be globally available

// Elements
const adminProductTable = document.getElementById("adminProductTable");
const adminUserTable = document.getElementById("adminUserTable");
const addProductForm = document.getElementById("addProductForm");

// Elements for ADD Product Form
const pName = document.getElementById("addProductName"); 
const pBrand = document.getElementById("addProductBrand");
const pType = document.getElementById("addProductType");
const pPrice = document.getElementById("addProductPrice");
const pStock = document.getElementById("addProductStock");
const pImage = document.getElementById("addProductImage");
const pDescription = document.getElementById("addProductDescription");

// Elements for EDIT Product Modal
const editProductModalEl = document.getElementById('editProductModal');
// Use a safe check for bootstrap (assuming it's loaded)
const editProductModal = typeof bootstrap !== 'undefined' && editProductModalEl ? new bootstrap.Modal(editProductModalEl) : null; 
const editProductForm = document.getElementById('editProductForm');

// Edit Modal inputs (ensure these IDs exist in your admin.html modal)
const editProductId = document.getElementById("editProductId");
const editProductName = document.getElementById("editProductName");
const editProductBrand = document.getElementById("editProductBrand");
const editProductType = document.getElementById("editProductType");
const editProductPrice = document.getElementById("editProductPrice");
const editProductStock = document.getElementById("editProductStock");
const editProductImage = document.getElementById("editProductImage");
const editProductDescription = document.getElementById("editProductDescription");


// =======================================================
// 🛡️ AUTH CHECK AND REDIRECT
// =======================================================

function getToken() {
    return localStorage.getItem("knavetoneToken");
}

function handleLogout() {
  localStorage.removeItem("knavetoneToken");
  localStorage.removeItem("knavetoneIsAdmin");
  localStorage.removeItem("knavetoneUserName"); 
  localStorage.removeItem("knavetoneProfilePic"); 
  window.location.href = "index.html";
}
// ... (getTokenPayload function remains the same) ...

function checkAdminStatus() {
    const isAdmin = localStorage.getItem("knavetoneIsAdmin") === 'true';
    const token = getToken();

    if (!isAdmin || !token) {
        alert("Access Denied. Admin privileges are required.");
        handleLogout();
        return false;
    }

    // Update Admin link to show user name and picture
    const userName = localStorage.getItem("knavetoneUserName") || 'Admin';
    const profilePicStored = localStorage.getItem("knavetoneProfilePic");
    
    // Construct Profile Picture URL from localStorage
    const profilePicUrl = profilePicStored || DEFAULT_PROFILE_PIC;
    
    // Get current cart count
    const cart = JSON.parse(localStorage.getItem("knavetoneCart")) || [];
    const cartCountValue = cart.length;


    const userNavArea = document.getElementById("userNavArea");
    if (userNavArea) {
        // Build the HTML with the new navigation links and the profile dropdown
        userNavArea.innerHTML = `
            <ul class="navbar-nav align-items-center">
                <li class="nav-item"><a class="nav-link" href="index.html">Home</a></li>
                <li class="nav-item"><a class="nav-link" href="aboutus.html">About Us</a></li>
                <li class="nav-item"><a class="nav-link" href="contact.html">Contact</a></li>
                <li class="nav-item">
                    <a class="nav-link position-relative" href="cart.html">
                      <i class="bi bi-cart-fill fs-5"></i>
                      <span id="cartCount" class="badge rounded-pill bg-danger position-absolute top-0 start-100 translate-middle">${cartCountValue}</span>
                    </a>
                </li>
                <li class="nav-item dropdown">
                    <a class="nav-link dropdown-toggle d-flex align-items-center" href="#" id="profileDropdown" role="button" data-bs-toggle="dropdown" aria-expanded="false">
                        <img src="${profilePicUrl}" alt="Profile" 
                            style="width: 30px; height: 30px; border-radius: 50%; object-fit: cover; margin-right: 8px; border: 1px solid #ffc107;">
                        Hi, ${userName}
                    </a>
                    
                    <ul class="dropdown-menu dropdown-menu-dark dropdown-menu-end" aria-labelledby="profileDropdown">
                        <li><a class="dropdown-item d-flex align-items-center" href="profile.html"><i class="bi bi-person me-2"></i> My Profile</a></li>
                        <li><a class="dropdown-item text-danger d-flex align-items-center" href="admin.html"><i class="bi bi-gear me-2"></i> Admin Panel</a></li>
                        <li><hr class="dropdown-divider"></li>
                        <li><a class="dropdown-item text-danger d-flex align-items-center" href="#" id="logoutBtn"><i class="bi bi-box-arrow-right me-2"></i> Logout</a></li>
                    </ul>
                </li>
            </ul>
        `;
        // Re-attach logout listener
        const newLogoutBtn = document.getElementById("logoutBtn");
        if (newLogoutBtn) {
            newLogoutBtn.addEventListener('click', handleLogout);
        }
    }
    
    // Update the cart count visibility
    if(typeof window.updateCartCount === 'function') window.updateCartCount(cartCountValue);

    return true;
}

// =======================================================
// 🎸 PRODUCT FUNCTIONS (Remains the same)
// ...
// =======================================================

async function loadProductsForAdmin() {
  const token = getToken();
  if (!token) return handleLogout();

  try {
    const res = await fetch(PRODUCTS_URL, {
      headers: { "Authorization": `Bearer ${token}` }
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const products = await res.json();
    const tbody = adminProductTable;
    tbody.innerHTML = products.map(p => `
      <tr>
        <td>${p._id.slice(-6)}...</td>
        <td>${p.name}</td>
        <td>${p.brand}</td>
        <td>${p.type}</td>
        <td>${p.price}</td>
        <td>${p.stock}</td>
        <td>
          <button class="btn btn-sm btn-warning me-2 edit-btn" data-id="${p._id}">Edit</button>
          <button class="btn btn-sm btn-danger delete-btn" data-id="${p._id}">Delete</button>
        </td>
      </tr>
    `).join('');
  } catch (err) {
    console.error("Error loading products:", err);
    showAlert("Failed to load products.", "danger");
  }
}

// =======================================================
// 🧑 USER FUNCTIONS
// =======================================================

async function loadUsers() {
  const token = getToken();
  if (!token) return handleLogout();

  try {
    const res = await fetch(USERS_URL, {
      headers: { "Authorization": `Bearer ${token}` }
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const users = await res.json();
    const tbody = adminUserTable;
    const currentUserId = JSON.parse(atob(token.split('.')[1])).id;

    tbody.innerHTML = users.map(u => `
      <tr>
        <td>${u._id.slice(-6)}...</td>
        <td>${u.firstName} ${u.lastName}</td>
        <td>${u.email}</td>
        <td>
          <span class="badge ${u.isAdmin ? 'bg-success' : 'bg-secondary'}">
            ${u.isAdmin ? 'Admin' : 'User'}
          </span>
        </td>
        <td>
          <button 
            class="btn btn-sm ${u.isAdmin ? 'btn-warning' : 'btn-success'} toggle-admin-btn me-2" 
            data-id="${u._id}" 
            data-isadmin="${u.isAdmin}" 
            ${u._id === currentUserId ? 'disabled' : ''}>
            ${u.isAdmin ? 'Demote' : 'Promote'}
          </button>
          <button 
            class="btn btn-sm btn-danger delete-user-btn"
            data-id="${u._id}"
            ${u._id === currentUserId ? 'disabled' : ''}>
            Delete
          </button>
        </td>
      </tr>
    `).join('');

    document.querySelectorAll('.toggle-admin-btn')
            .forEach(btn => btn.addEventListener('click', toggleAdminStatus));
    document.querySelectorAll('.delete-user-btn')
            .forEach(btn => btn.addEventListener('click', deleteUser));

  } catch (err) {
    console.error("Error loading users:", err);
    showAlert("Failed to load users.", "danger");
  }
}

async function toggleAdminStatus(e) {
  const token = getToken();
  if (!token) return handleLogout();

  const btn = e.currentTarget;
  const userId = btn.dataset.id;
  const currentStatus = btn.dataset.isadmin === 'true';
  const newStatus = !currentStatus;

  if (!confirm(`Are you sure you want to ${newStatus ? 'promote this user to Admin' : 'demote this Admin to User'}?`)) {
    return;
  }

  try {
    const res = await fetch(`${USERS_URL}/${userId}/admin`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ isAdmin: newStatus })
    });

    const data = await res.json();

    if (res.ok) {
      showAlert(`User ${newStatus ? 'promoted to Admin' : 'demoted to User'} successfully.`, 'success');
      loadUsers(); // refresh the list
    } else {
      showAlert(data.message || 'Failed to update user status.', 'danger');
    }

  } catch (err) {
    console.error("Toggle admin error:", err);
    showAlert('Network error while updating user.', 'danger');
  }
}

async function deleteUser(event) {
  const token = getToken();
  if (!token) return handleLogout();

  const userId = event.currentTarget.dataset.id;
  if (!confirm("Are you sure you want to permanently delete this user?")) return;

  try {
    const response = await fetch(`${USERS_URL}/${userId}`, {
      method: "DELETE",
      headers: {
        "Authorization": `Bearer ${token}`
      }
    });

    const data = await response.json();

    if (response.ok) {
      showAlert("User deleted successfully.", "success");
      loadUsers(); // refresh table
    } else {
      showAlert(data.message || "Failed to delete user.", "danger");
    }
  } catch (error) {
    console.error("Error deleting user:", error);
    showAlert("Network error while deleting user.", "danger");
  }
}

// =======================================================
// 🧑 USER FUNCTIONS (Remains the same)
// ...
// =======================================================


// =======================================================
// 🏁 INITIALIZATION
// =======================================================

// Run Admin Check and load data on page load
if (checkAdminStatus()) {
     loadProductsForAdmin();   // ✅ correct
    loadUsers();

    // Attach event listeners for form submissions
    if (addProductForm) {
        addProductForm.addEventListener('submit', addProduct);
    }
    if (editProductForm) {
        editProductForm.addEventListener('submit', handleEditFormSubmit);
    }
}