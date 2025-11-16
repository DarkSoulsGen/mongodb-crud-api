// admin.js

// 🚨 CORRECTION: API_BASE_URL, PRODUCTS_URL, and USERS_URL are now defined globally in admin.html

// Elements
const adminProductTable = document.getElementById("adminProductTable");
const adminUserTable = document.getElementById("adminUserTable");
const addProductForm = document.getElementById("addProductForm");
const logoutBtn = document.getElementById("logoutBtn");

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
// This line now runs successfully because bootstrap.Modal is defined in admin.html
const editProductModal = new bootstrap.Modal(editProductModalEl); 
const editProductForm = document.getElementById('editProductForm');

// Edit Modal inputs
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
  window.location.href = "index.html";
}

/**
 * Retrieves the payload from the JWT for client-side use (e.g., getting user ID).
 */
function getTokenPayload() {
    const token = getToken();
    if (!token) return { id: null, isAdmin: false };
    try {
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join(''));
        return JSON.parse(jsonPayload);
    } catch (e) {
        console.error("Failed to decode token:", e);
        return { id: null, isAdmin: false };
    }
}


function checkAdminStatus() {
    const isAdmin = localStorage.getItem("knavetoneIsAdmin") === 'true';
    const token = getToken();

    if (!isAdmin || !token) {
        alert("Access Denied. Admin privileges are required.");
        handleLogout();
        return false;
    }

    // Update Admin link to show user name
    const userName = localStorage.getItem("knavetoneUserName") || 'Admin';
    const userNavArea = document.getElementById("userNavArea");
    if (userNavArea) {
        userNavArea.innerHTML = `
            <ul class="navbar-nav align-items-center">
                <li class="nav-item"><a class="nav-link" href="index.html">Home</a></li>
                <li class="nav-item"><a class="nav-link" href="profile.html">Hi, ${userName}</a></li>
                <li class="nav-item"><a class="btn btn-danger btn-sm text-light ms-3" href="#" id="logoutBtn">Logout</a></li>
            </ul>
        `;
        // Re-attach logout listener
        const newLogoutBtn = document.getElementById("logoutBtn");
        if (newLogoutBtn) {
            newLogoutBtn.addEventListener('click', handleLogout);
        }
    }

    return true;
}

// =======================================================
// 🧑 USER FUNCTIONS (Admin)
// =======================================================

/**
 * Renders the users into the admin user table.
 */
function renderUsers(users) {
    if (!adminUserTable) return;

    if (users.length === 0) {
        adminUserTable.innerHTML = '<tr><td colspan="5" class="text-center text-warning p-3">No users found.</td></tr>';
        return;
    }

    const currentAdminId = getTokenPayload().id; 

    adminUserTable.innerHTML = users.map(user => {
        const isDisabled = user._id === currentAdminId ? 'disabled' : ''; 
        const statusText = user.isAdmin ? 'Admin' : 'User';
        const statusClass = user.isAdmin ? 'text-danger fw-bold' : 'text-info';

        return `
            <tr>
                <td>${user.firstName} ${user.lastName}</td>
                <td>${user.email}</td>
                <td class="${statusClass}">${statusText}</td>
                <td>${new Date(user.createdAt).toLocaleDateString()}</td>
                <td>
                    <button 
                        class="btn btn-sm ${user.isAdmin ? 'btn-outline-danger' : 'btn-outline-info'}" 
                        data-id="${user._id}" 
                        data-isadmin="${user.isAdmin}" 
                        onclick="toggleAdminStatus(event)"
                        ${isDisabled}
                    >
                        ${user.isAdmin ? 'Demote' : 'Promote'}
                    </button>
                </td>
            </tr>
        `;
    }).join('');
}


/**
 * Fetches all users from the server (Admin-protected).
 * Includes robust error handling to prevent the JSON parsing crash.
 */
async function loadUsers() {
    // Check if USERS_URL is defined (from admin.html global script)
    if (typeof USERS_URL === 'undefined') {
        console.error("USERS_URL is not defined. Check admin.html script block.");
        return;
    }

    const token = getToken();
    if (!token) {
        adminUserTable.innerHTML = '<tr><td colspan="5" class="text-center text-danger">Unauthorized. Please log in.</td></tr>';
        return;
    }
    
    // Set loading state
    if (adminUserTable) {
        adminUserTable.innerHTML = '<tr><td colspan="5" class="text-center text-info p-3">Loading users...</td></tr>';
    }

    try {
        const res = await fetch(USERS_URL, {
            headers: {
                "Authorization": `Bearer ${token}` 
            }
        });
        
        // 🛑 FIX: Check res.ok first!
        if (!res.ok) {
            let errorMessage = `Failed to load users. Server Status: ${res.status}`;
            
            try {
                // Try to parse error message if the server sent one
                const errorData = await res.json();
                errorMessage = errorData.message || errorMessage;
            } catch (e) {
                // Ignore JSON parsing error if the response was not JSON (e.g., HTML 404 page)
                console.warn(`Non-JSON response received from ${USERS_URL} (Status: ${res.status})`);
            }

            if (res.status === 403) {
                 window.showAlert("Permission Denied. Only Admins can view users.", "danger");
                 adminUserTable.innerHTML = '<tr><td colspan="5" class="text-center text-danger">Permission Denied. Only Admins can view users.</td></tr>';
            } else {
                 throw new Error(errorMessage);
            }
        } else {
            const users = await res.json();
            renderUsers(users);
        }
    } catch (error) {
        console.error("Error loading users:", error);
        window.showAlert("Error loading users. " + (error.message || "Check server connection."), "danger");
        // Display generic error if the network request itself failed
        adminUserTable.innerHTML = `<tr><td colspan="5" class="text-center text-danger">Error: ${error.message || "Network Error"}</td></tr>`;
    }
}

// Update User Status (PUT) - Uses PUT /api/users/:id/admin
async function toggleAdminStatus(e) {
    const token = getToken();
    if (!token) return handleLogout();
    
    const userId = e.target.dataset.id;
    const currentStatus = e.target.dataset.isadmin === 'true';
    const newStatus = !currentStatus;

    if (!confirm(`Are you sure you want to change this user's status to ${newStatus ? 'Admin' : 'User'}?`)) return;

    try {
        const res = await fetch(`${USERS_URL}/${userId}/admin`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}` 
            },
            body: JSON.stringify({ isAdmin: newStatus })
        });

        const data = await res.json();

        if (res.ok) {
            window.showAlert("User status updated successfully!", "success");
            loadUsers(); 
        } else {
            window.showAlert(data.message || "Failed to update user status.", "danger"); 
        }
    } catch (error) {
        console.error("Error updating user status:", error);
        window.showAlert("An unexpected error occurred while updating the user status.", "danger");
    }
}

// =======================================================
// 🎸 PRODUCT FUNCTIONS (Admin)
// =======================================================

// Function to render products
function renderProducts(products) {
    if (!adminProductTable) return;

    if (products.length === 0) {
        adminProductTable.innerHTML = '<tr><td colspan="7" class="text-center text-warning p-3">No products found.</td></tr>';
        return;
    }

    adminProductTable.innerHTML = products.map(p => `
        <tr>
            <td>${p._id.substring(0, 8)}...</td>
            <td><img src="${p.image}" alt="${p.name}" style="width: 50px; height: 50px; object-fit: cover; border-radius: 4px;"></td>
            <td>${p.name}</td>
            <td>$${p.price.toFixed(2)}</td>
            <td>${p.stock}</td>
            <td>${p.type}</td>
            <td>
                <button class="btn btn-sm btn-info me-2" onclick="editProduct('${p._id}', '${p.name}', '${p.brand}', '${p.type}', ${p.price}, ${p.stock}, '${p.image}', \`${p.description}\` )">Edit</button>
                <button class="btn btn-sm btn-danger" onclick="deleteProduct('${p._id}')">Delete</button>
            </td>
        </tr>
    `).join('');
}


// Function to load products
async function loadProducts() {
    try {
        const res = await fetch(PRODUCTS_URL); 
        if (!res.ok) {
            throw new Error(`HTTP error! status: ${res.status}`);
        }
        const products = await res.json();
        renderProducts(products);
    } catch (error) {
        console.error("Error loading products:", error);
        adminProductTable.innerHTML = '<tr><td colspan="7" class="text-center text-danger">Error loading products. Check server connection.</td></tr>';
    }
}

// Function to add a product
async function addProduct(e) {
    e.preventDefault();
    const token = getToken();
    if (!token) return window.showAlert("Unauthorized: Please log in.", "danger");

    const newProduct = {
        name: pName.value,
        brand: pBrand.value,
        type: pType.value,
        price: parseFloat(pPrice.value),
        stock: parseInt(pStock.value),
        image: pImage.value,
        description: pDescription.value,
    };

    try {
        const res = await fetch(PRODUCTS_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}` 
            },
            body: JSON.stringify(newProduct)
        });

        if (res.ok) {
            window.showAlert("Product added successfully!", "success");
            addProductForm.reset();
            loadProducts();
        } else {
            const data = await res.json();
            window.showAlert(data.error || "Failed to add product.", "danger");
        }
    } catch (error) {
        console.error("Error adding product:", error);
        window.showAlert("An unexpected error occurred while adding the product.", "danger");
    }
}


// Function to populate the edit modal (called from onclick)
function editProduct(id, name, brand, type, price, stock, image, description) {
    editProductId.value = id;
    editProductName.value = name;
    editProductBrand.value = brand;
    editProductType.value = type;
    editProductPrice.value = price;
    editProductStock.value = stock;
    editProductImage.value = image;
    editProductDescription.value = description;

    editProductModal.show();
}

// Function to handle edit form submission
async function handleEditFormSubmit(e) {
    e.preventDefault();
    const token = getToken();
    if (!token) return window.showAlert("Unauthorized: Please log in.", "danger");

    const productId = editProductId.value;
    const updatedProduct = {
        name: editProductName.value,
        brand: editProductBrand.value,
        type: editProductType.value,
        price: parseFloat(editProductPrice.value),
        stock: parseInt(editProductStock.value),
        image: editProductImage.value,
        description: editProductDescription.value,
    };

    try {
        const res = await fetch(`${PRODUCTS_URL}/${productId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(updatedProduct)
        });

        if (res.ok) {
            window.showAlert("Product updated successfully!", "success");
            editProductModal.hide();
            loadProducts();
        } else {
            const data = await res.json();
            window.showAlert(data.error || "Failed to update product.", "danger");
        }
    } catch (error) {
        console.error("Error updating product:", error);
        window.showAlert("An unexpected error occurred while updating the product.", "danger");
    }
}


// Function to delete a product
async function deleteProduct(productId) {
    const token = getToken();
    if (!token) return window.showAlert("Unauthorized: Please log in.", "danger");

    if (!confirm("Are you sure you want to delete this product?")) return;

    try {
        const res = await fetch(`${PRODUCTS_URL}/${productId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}` 
            }
        });

        if (res.ok) {
            window.showAlert("Product deleted successfully!", "success");
            loadProducts();
        } else {
            const data = await res.json();
            window.showAlert(data.message || "Failed to delete product.", "danger");
        }
    } catch (error) {
        console.error("Error deleting product:", error);
        window.showAlert("An unexpected error occurred while deleting the product.", "danger");
    }
}

// =======================================================
// 🏁 INITIALIZATION
// =======================================================

// Run Admin Check and load data on page load
if (checkAdminStatus()) {
    loadProducts();
    loadUsers();

    // Attach event listeners for form submissions
    if (addProductForm) {
        addProductForm.addEventListener('submit', addProduct);
    }
    if (editProductForm) {
        editProductForm.addEventListener('submit', handleEditFormSubmit);
    }
    // Re-attach the logout listener to the button in the dynamically updated navbar
    const globalLogoutBtn = document.getElementById("logoutBtn");
    if (globalLogoutBtn) {
        globalLogoutBtn.addEventListener('click', handleLogout);
    }
}