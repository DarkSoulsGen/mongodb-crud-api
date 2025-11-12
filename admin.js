// BASE URLs (Ensure this matches your Render URL)
const API_BASE_URL = "https://mongodb-crud-api-azs9.onrender.com";
const PRODUCTS_URL = `${API_BASE_URL}/api/products`;
const USERS_URL = `${API_BASE_URL}/api/users`;

// Elements
const adminProductTable = document.getElementById("adminProductTable");
const adminUserTable = document.getElementById("adminUserTable");
const addProductForm = document.getElementById("addProductForm");
const logoutBtn = document.getElementById("logoutBtn");

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
    try {
        const res = await fetch(PRODUCTS_URL);
        const products = await res.json();
        let html = '';

        products.forEach(p => {
            html += `
                <tr id="productRow-${p._id}">
                    <td>${p._id.slice(-6)}</td>
                    <td>${p.name}</td>
                    <td>₱${p.price}</td>
                    <td>${p.stock}</td>
                    <td>
                        <button class="btn btn-sm btn-info me-2 edit-btn" data-id="${p._id}">Edit</button>
                        <button class="btn btn-sm btn-danger delete-btn" data-id="${p._id}">Delete</button>
                    </td>
                </tr>
            `;
        });
        adminProductTable.innerHTML = html;

        // Attach event listeners for delete buttons
        document.querySelectorAll('.delete-btn').forEach(button => {
            button.addEventListener('click', deleteProduct);
        });
    } catch (error) {
        console.error("Error loading products:", error);
        adminProductTable.innerHTML = '<tr><td colspan="5" class="text-center text-danger">Error connecting to product API.</td></tr>';
    }
}

// Create Product (POST) - Uses POST /api/products
addProductForm.addEventListener("submit", async (e) => {
    e.preventDefault();
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
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify(productData)
    });

    if (res.ok) {
        alert("Product added successfully!");
        addProductForm.reset();
        loadProductsForAdmin(); 
    } else {
        alert("Failed to add product.");
    }
});

// Delete Product (DELETE) - Uses DELETE /api/products/:id
async function deleteProduct(e) {
    const productId = e.target.dataset.id;
    if (!confirm("Are you sure you want to delete this product?")) return;

    const res = await fetch(`${PRODUCTS_URL}/${productId}`, {
        method: "DELETE"
    });

    if (res.ok) {
        alert("Product deleted successfully!");
        loadProductsForAdmin(); 
    } else {
        alert("Failed to delete product.");
    }
}

// =======================================================
// 👥 ADMIN USER MANAGEMENT LOGIC
// =======================================================

// Read All Users - Uses GET /api/users
async function loadUsers() {
    try {
        const res = await fetch(USERS_URL);
        const users = await res.json();
        let html = '';

        users.forEach(u => {
            // Note: In a production app, you would check the current user's ID
            // to disable the button for them so they can't demote themselves.
            const disabled = false; 

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
                                ${disabled ? 'disabled' : ''}>
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
    const userId = e.target.dataset.id;
    const currentStatus = e.target.dataset.isadmin === 'true';
    const newStatus = !currentStatus;

    if (!confirm(`Are you sure you want to change this user's status to ${newStatus ? 'Admin' : 'User'}?`)) return;

    const res = await fetch(`${USERS_URL}/${userId}/admin`, {
        method: "PUT",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({ isAdmin: newStatus })
    });

    if (res.ok) {
        alert("User status updated successfully!");
        loadUsers(); 
    } else {
        const data = await res.json();
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
}

// Attach Logout Listener
logoutBtn.addEventListener("click", handleLogout);