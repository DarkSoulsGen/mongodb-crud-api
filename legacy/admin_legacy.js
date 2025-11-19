//backend/admin.js

/**
 * ==============================================================
 *  LEGACY ADMIN FILE (Archived)
 *  --------------------------------------------------------------
 *  This script originated from early tutorials suggesting
 *  separate front‑ and backend admin controllers.
 *  The Node backend already handles admin logic inside server.js.
 *  This file remains for reference only — it is NOT executed.
 * ==============================================================
 */

// BASE URLs (Ensure this matches your Render URL)
//const API_BASE_URL = "http://localhost:5000";
const API_BASE_URL = "https://mongodb-crud-api-azs9.onrender.com";
const PRODUCTS_URL = `${API_BASE_URL}/api/products`;
const USERS_URL = `${API_BASE_URL}/api/users`;

// Elements
const adminProductTable = document.getElementById("adminProductTable");
const adminUserTable = document.getElementById("adminUserTable");
const addProductForm = document.getElementById("addProductForm");
const logoutBtn = document.getElementById("logoutBtn");

// Elements for ADD Product Form (Assume these are defined in admin.html)
// Note: You must ensure you have these elements in your admin.html if not already present
const pName = document.getElementById("addProductName"); 
const pBrand = document.getElementById("addProductBrand");
const pType = document.getElementById("addProductType");
const pPrice = document.getElementById("addProductPrice");
const pStock = document.getElementById("addProductStock");
const pImage = document.getElementById("addProductImage");
const pDescription = document.getElementById("addProductDescription");

// Elements for EDIT Product Modal (Ensure these IDs match your admin.html modal)
const editProductModalEl = document.getElementById('editProductModal');
const editProductModal = new bootstrap.Modal(editProductModalEl);
const editProductForm = document.getElementById('editProductForm');

// =======================================================
// 🛡️ AUTH CHECK AND REDIRECT
// =======================================================

function checkAdminStatus() {
    // 1. Checks localStorage for the flag set during login
    const isAdmin = localStorage.getItem("knavetoneIsAdmin");
    
    // 2. Deny access and redirect if the user is not an admin
    if (isAdmin !== 'true') {
        alert("Access Denied: You must be an administrator to view this page.");
        window.location.href = "index.html";
        return false;
    }
    return true;
}

function handleLogout() {
    // Clear local storage items
    localStorage.removeItem("knavetoneToken");
    localStorage.removeItem("knavetoneIsAdmin");
    alert("Logged out successfully.");
    window.location.href = "index.html";
}

// =======================================================
// 🛒 ADMIN PRODUCT CRUD LOGIC
// =======================================================

// Read All Products (for the admin table) - Uses GET /api/products
async function loadProductsForAdmin() {
    // 🔑 ADDED: Token retrieval for security
    const token = localStorage.getItem("knavetoneToken");
    if (!token) return handleLogout();

    try {
        const res = await fetch(PRODUCTS_URL, {
            headers: {
                "Authorization": `Bearer ${token}` // 🔑 ADDED: Authorization Header
            }
        });

        if (res.status === 401 || res.status === 403) {
            alert("Session expired or unauthorized access.");
            return handleLogout();
        }

        const products = await res.json();
        let html = '';

        products.forEach(p => {
            html += `
                <tr id="productRow-${p._id}">
                    <td>${p._id ? p._id.slice(-6) : 'N/A'}...</td> 
                    <td>${p.name}</td>
                    <td>₱${p.price}</td>
                    <td>${p.stock}</td>
                    <td>
                        <button class="btn btn-sm btn-info me-2 edit-product-btn" 
                                data-id="${p._id}" 
                                data-name="${p.name}" 
                                data-price="${p.price}" 
                                data-stock="${p.stock}">
                            Edit
                        </button>
                        <button class="btn btn-sm btn-danger delete-btn" data-id="${p._id}">Delete</button>
                    </td>
                </tr>
            `;
        });
        adminProductTable.innerHTML = html;

        // Attach event listeners for delete and edit buttons
        document.querySelectorAll('.delete-btn').forEach(button => {
            button.addEventListener('click', deleteProduct);
        });
        document.querySelectorAll('.edit-product-btn').forEach(button => {
            button.addEventListener('click', setupEditModal);
        });

    } catch (error) {
        console.error("Error loading products:", error);
        adminProductTable.innerHTML = '<tr><td colspan="5" class="text-center text-danger">Error connecting to product API.</td></tr>';
    }
}

// Create Product (POST) - Uses POST /api/products
addProductForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    // 🔑 ADDED: Token retrieval for security
    const token = localStorage.getItem("knavetoneToken");
    if (!token) return handleLogout();

    const productData = {
        name: pName.value,
        brand: pBrand.value,
        type: pType.value,
        price: parseFloat(pPrice.value),
        stock: parseInt(pStock.value),
        image: pImage.value,
        description: pDescription.value
    };

    const res = await fetch(PRODUCTS_URL, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}` // 🔑 ADDED: Authorization Header
        },
        body: JSON.stringify(productData)
    });

    if (res.ok) {
        alert("Product added successfully!");
        addProductForm.reset();
        loadProductsForAdmin(); 
    } else {
        const data = await res.json();
        alert(data.message || "Failed to add product.");
    }
});

// Delete Product (DELETE) - Uses DELETE /api/products/:id
async function deleteProduct(e) {
    // 🔑 ADDED: Token retrieval for security
    const token = localStorage.getItem("knavetoneToken");
    if (!token) return handleLogout();

    const productId = e.target.dataset.id;
    if (!confirm("Are you sure you want to delete this product?")) return;

    const res = await fetch(`${PRODUCTS_URL}/${productId}`, {
        method: "DELETE",
        headers: {
            "Authorization": `Bearer ${token}` // 🔑 ADDED: Authorization Header
        }
    });

    if (res.ok) {
        alert("Product deleted successfully!");
        loadProductsForAdmin(); 
    } else {
        const data = await res.json();
        alert(data.message || "Failed to delete product.");
    }
}

// =======================================================
// ✏️ PRODUCT EDIT LOGIC (NEWLY IMPLEMENTED)
// =======================================================

// 1. Function to fill the modal with existing data
function setupEditModal(e) {
    // Get data from the button's custom attributes
    const productId = e.target.dataset.id;
    const productName = e.target.dataset.name;
    const productPrice = e.target.dataset.price;
    const productStock = e.target.dataset.stock;

    // Populate the modal fields
    document.getElementById('editProductId').value = productId;
    document.getElementById('editProductName').value = productName;
    document.getElementById('editProductPrice').value = productPrice;
    document.getElementById('editProductStock').value = productStock;
    
    // Show the modal
    editProductModal.show();
}

// 2. Function to handle the form submission (PUT request)
editProductForm.addEventListener('submit', handleEditProductSubmission);

async function handleEditProductSubmission(e) {
    e.preventDefault();

    const token = localStorage.getItem("knavetoneToken");
    if (!token) return handleLogout();

    const id = document.getElementById('editProductId').value;
    const name = document.getElementById('editProductName').value;
    const price = document.getElementById('editProductPrice').value;
    const stock = document.getElementById('editProductStock').value;
    
    const res = await fetch(`${PRODUCTS_URL}/${id}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}` // 🔑 ADDED: Authorization Header
        },
        body: JSON.stringify({ name, price, stock })
    });

    if (res.ok) {
        alert('Product updated successfully!');
        editProductModal.hide();
        loadProductsForAdmin(); // Refresh the table after update
    } else {
        const data = await res.json();
        alert(data.message || 'Failed to update product.');
    }
}

// =======================================================
// 👥 ADMIN USER MANAGEMENT LOGIC
// =======================================================

// Read All Users - Uses GET /api/users
async function loadUsers() {
    // 🔑 ADDED: Token retrieval for security
    const token = localStorage.getItem("knavetoneToken");
    if (!token) return handleLogout();

    try {
        const res = await fetch(USERS_URL, {
            headers: {
                "Authorization": `Bearer ${token}` // 🔑 ADDED: Authorization Header
            }
        });
        
        if (res.status === 401 || res.status === 403) {
            alert("Session expired or unauthorized access.");
            return handleLogout();
        }
        
        const users = await res.json();
        let html = '';
        // Decode token to get current user ID to disable their demote button
        const currentUserId = JSON.parse(atob(token.split('.')[1])).userId; 

        users.forEach(u => {
            // Disable button for the currently logged-in admin user
            const disabled = u._id === currentUserId; 
            const disabledAttr = disabled ? 'disabled' : '';

            html += `
                <tr>
                    <td>${u.name}</td>
                    <td>${u.email}</td>
                    <td>
                        <span class="badge ${u.isAdmin ? 'bg-success' : 'bg-secondary'}">
                            ${u.isAdmin ? 'Admin' : 'User'}
                        </span>
                    </td>
                    <td>
                        <button class="btn btn-sm ${u.isAdmin ? 'btn-warning' : 'btn-success'} toggle-admin-btn" 
                                data-id="${u._id}" 
                                data-isadmin="${u.isAdmin}"
                                ${disabledAttr}>
                            ${u.isAdmin ? 'Demote' : 'Promote'}
                        </button>
                    </td>
                </tr>
            `;
        });

        adminUserTable.innerHTML = html;
        document.querySelectorAll('.toggle-admin-btn').forEach(button => {
            button.addEventListener('click', toggleAdminStatus);
        });

    } catch (error) {
        console.error("Error loading users:", error);
        adminUserTable.innerHTML = '<tr><td colspan="4" class="text-center text-danger">Error loading users.</td></tr>';
    }
}

// Update User Status (PUT) - Uses PUT /api/users/:id/admin
async function toggleAdminStatus(e) {
    // 🔑 ADDED: Token retrieval for security
    const token = localStorage.getItem("knavetoneToken");
    if (!token) return handleLogout();
    
    const userId = e.target.dataset.id;
    const currentStatus = e.target.dataset.isadmin === 'true';
    const newStatus = !currentStatus;

    if (!confirm(`Are you sure you want to change this user's status to ${newStatus ? 'Admin' : 'User'}?`)) return;

    const res = await fetch(`${USERS_URL}/${userId}/admin`, {
        method: "PUT",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}` // 🔑 ADDED: Authorization Header
        },
        body: JSON.stringify({ isAdmin: newStatus })
    });

    if (res.ok) {
        alert("User status updated successfully!");
        loadUsers(); 
    } else {
        const data = await res.json();
        // The server will now return a 403 message if the user tries to demote themselves
        alert(data.message || "Failed to update user status."); 
    }
}

// =======================================================
// 🏁 INITIALIZATION
// =======================================================

// Run Admin Check and load data on page load
if (checkAdminStatus()) {
    loadProductsForAdmin();
    loadUsers();
     loadOrders(); // 👈 add this
}

// Attach Logout Listener
logoutBtn.addEventListener("click", handleLogout);