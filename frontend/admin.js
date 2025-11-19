// frontend/admin.js
// =======================================================
// 🚨 API_BASE_URL, PRODUCTS_URL, USERS_URL, and DEFAULT_PROFILE_PIC are assumed globally available
// =======================================================

// DOM REFERENCES
const adminProductTable = document.getElementById("adminProductTable");
const adminUserTable = document.getElementById("adminUserTable");
const adminOrderTable = document.getElementById("adminOrderTable");

const addProductForm = document.getElementById("addProductForm");
const deleteSelectedBtn = document.getElementById("deleteSelectedProductsBtn");

const pImageFile = document.getElementById("addProductImageFile");
const pImageURL = document.getElementById("addProductImageURL");
const pName = document.getElementById("addProductName");
const pBrand = document.getElementById("addProductBrand");
const pType = document.getElementById("addProductType");
const pPrice = document.getElementById("addProductPrice");
const pStock = document.getElementById("addProductStock");
const pDescription = document.getElementById("addProductDescription");

// Product Edit Modal Elements
const editProductModalEl = document.getElementById("editProductModal");
const editProductModal =
  typeof bootstrap !== "undefined" && editProductModalEl
    ? new bootstrap.Modal(editProductModalEl)
    : null;
const editProductForm = document.getElementById("editProductForm");
const editProductId = document.getElementById("editProductId");
const editProductName = document.getElementById("editProductName");
const editProductBrand = document.getElementById("editProductBrand");
const editProductType = document.getElementById("editProductType");
const editProductPrice = document.getElementById("editProductPrice");
const editProductStock = document.getElementById("editProductStock");
const editProductImage = document.getElementById("editProductImage");
const editProductDescription = document.getElementById("editProductDescription");
const editProductImageFile = document.getElementById("editProductImageFile");

const ORDERS_URL = `${API_BASE_URL}/api/orders`;

// =======================================================
// 🛡️ AUTH HELPERS
// =======================================================
function getToken() {
  return localStorage.getItem("knavetoneToken");
}

function handleLogout() {
  localStorage.clear();
  window.location.href = "index.html";
}

function checkAdminStatus() {
  const token = getToken();
  const isAdmin = localStorage.getItem("knavetoneIsAdmin") === "true";
  if (!token || !isAdmin) {
    alert("Access denied.");
    handleLogout();
    return false;
  }
  return true;
}

// =======================================================
// 🎸 PRODUCT FUNCTIONS
// =======================================================

// ➕ Add Product
async function addProduct(e) {
  e.preventDefault();
  const token = getToken();
  if (!token) return handleLogout();

  const formData = new FormData();
  formData.append("name", pName.value);
  formData.append("brand", pBrand.value);
  formData.append("type", pType.value);
  formData.append("price", parseFloat(pPrice.value));
  formData.append("stock", parseInt(pStock.value));
  formData.append("description", pDescription.value);

  if (pImageFile.files.length > 0)
    formData.append("imageFile", pImageFile.files[0]);
  else if (pImageURL.value.trim() !== "")
    formData.append("imageURL", pImageURL.value.trim());

  try {
    const res = await fetch(PRODUCTS_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });
    const data = await res.json();
    if (res.ok) {
      showAlert(`Product "${data.name}" added successfully.`, "success");
      addProductForm.reset();
      loadProductsForAdmin();
    } else showAlert(data.message || "Failed to add product.", "danger");
  } catch (err) {
    console.error(err);
    showAlert("Network error while adding product.", "danger");
  }
}

// ✏️ Populate Edit Modal
async function populateEditModal(productId) {
  const token = getToken();
  if (!token) return handleLogout();

  try {
    const res = await fetch(`${PRODUCTS_URL}/${productId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const product = await res.json();

    editProductId.value = product._id;
    editProductName.value = product.name;
    editProductBrand.value = product.brand;
    editProductType.value = product.type;
    editProductPrice.value = product.price;
    editProductStock.value = product.stock;
    editProductImage.value = product.image || "";
    editProductDescription.value = product.description || "";

    editProductModal.show();
  } catch (err) {
    console.error("Error loading product for edit:", err);
    showAlert("Failed to load product.", "danger");
  }
}

// 💾 Save Edited Product
async function handleEditFormSubmit(e) {
  e.preventDefault();
  const token = getToken();
  if (!token) return handleLogout();

  const id = editProductId.value;
  const formData = new FormData();
  formData.append("name", editProductName.value);
  formData.append("brand", editProductBrand.value);
  formData.append("type", editProductType.value);
  formData.append("price", parseFloat(editProductPrice.value));
  formData.append("stock", parseInt(editProductStock.value));
  formData.append("description", editProductDescription.value);

  if (editProductImageFile.files.length > 0)
    formData.append("imageFile", editProductImageFile.files[0]);
  else if (editProductImage.value.trim() !== "")
    formData.append("imageURL", editProductImage.value.trim());

  try {
    const res = await fetch(`${PRODUCTS_URL}/${id}`, {
      method: "PUT",
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });
    const data = await res.json();
    if (res.ok) {
      showAlert(`Product "${data.name || editProductName.value}" updated.`, "success");
      editProductModal.hide();
      loadProductsForAdmin();
    } else showAlert(data.message || "Failed to update product.", "danger");
  } catch (err) {
    console.error(err);
    showAlert("Network error while updating product.", "danger");
  }
}

// 🗑️ Delete Single Product
async function deleteProduct(id) {
  const token = getToken();
  if (!token) return handleLogout();
  if (!confirm("Delete this product?")) return;
  try {
    const res = await fetch(`${PRODUCTS_URL}/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      showAlert("Product deleted.", "success");
      loadProductsForAdmin();
    } else showAlert("Delete failed.", "danger");
  } catch (err) {
    console.error(err);
    showAlert("Network error.", "danger");
  }
}

// 📦 Load all products
async function loadProductsForAdmin() {
  const token = getToken();
  if (!token) return handleLogout();
  try {
    const res = await fetch(PRODUCTS_URL, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const products = await res.json();

    adminProductTable.innerHTML = products
      .map((p) => {
        const imgSrc = p.image
          ? p.image.startsWith("data:") || p.image.startsWith("http")
            ? p.image
            : `${API_BASE_URL}${p.image.startsWith("/") ? "" : "/"}${p.image}`
          : "https://placehold.co/60x60/1C1C25/00FFFF?text=No+Img";

        return `
          <tr>
            <td><input type="checkbox" class="form-check-input product-checkbox" data-id="${p._id}"></td>
            <td>${p._id}</td>
            <td>
              <div class="d-flex align-items-center">
                <img src="${imgSrc}" alt="${p.name}"
                     style="width:60px;height:60px;object-fit:cover;border-radius:6px;margin-right:10px;
                            border:1px solid rgba(0,255,255,0.4);">
                <div>
                  <div class="fw-bold">${p.name}</div>
                  <small class="text-muted">${p.brand} (${p.type})</small>
                </div>
              </div>
            </td>
            <td>$${p.price.toFixed(2)}</td>
            <td>${p.stock}</td>
            <td>
              <button class="btn btn-sm btn-warning me-2 edit-btn" data-id="${p._id}">Edit</button>
              <button class="btn btn-sm btn-danger delete-btn" data-id="${p._id}">Delete</button>
            </td>
          </tr>`;
      })
      .join("");

    const checkboxes = document.querySelectorAll(".product-checkbox");
    checkboxes.forEach((cb) =>
      cb.addEventListener("change", () => {
        const anyChecked = document.querySelectorAll(".product-checkbox:checked").length;
        deleteSelectedBtn.classList.toggle("d-none", !anyChecked);
      })
    );
  } catch (err) {
    console.error(err);
    showAlert("Failed to load products.", "danger");
  }
}

// 🗑️ Bulk delete
if (deleteSelectedBtn) {
  deleteSelectedBtn.addEventListener("click", async () => {
    const token = getToken();
    if (!token) return handleLogout();
    const selected = Array.from(document.querySelectorAll(".product-checkbox:checked"));
    if (!selected.length) return;
    if (!confirm(`Delete ${selected.length} selected product(s)?`)) return;
    try {
      for (const cb of selected) {
        await fetch(`${PRODUCTS_URL}/${cb.dataset.id}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        });
      }
      showAlert(`${selected.length} product(s) deleted.`, "success");
      loadProductsForAdmin();
    } catch (err) {
      console.error(err);
      showAlert("Bulk delete failed.", "danger");
    }
  });
}

// =======================================================
// 👤 USER FUNCTIONS
// =======================================================
async function loadUsers() {
  const token = getToken();
  if (!token) return handleLogout();
  try {
    const res = await fetch(USERS_URL, { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const users = await res.json();
    const currentUserId = JSON.parse(atob(token.split(".")[1])).id;

    adminUserTable.innerHTML = users.map(
      (u) => `
      <tr>
        <td>${u.firstName || ""} ${u.lastName || ""}</td>
        <td>${u.email || "—"}</td>
        <td>
          <span class="badge ${u.isAdmin ? "bg-success" : "bg-secondary"}">
            ${u.isAdmin ? "Admin" : "User"}
          </span>
        </td>
        <td>
          <button class="btn btn-sm ${u.isAdmin ? "btn-warning" : "btn-success"} toggle-admin-btn me-2"
            data-id="${u._id}" data-isadmin="${u.isAdmin}" ${u._id === currentUserId ? "disabled" : ""}>
            ${u.isAdmin ? "Demote" : "Promote"}
          </button>
          <button class="btn btn-sm btn-danger delete-user-btn"
            data-id="${u._id}" ${u._id === currentUserId ? "disabled" : ""}>
            Delete
          </button>
        </td>
      </tr>`
    ).join("");

    document.querySelectorAll(".toggle-admin-btn").forEach((b) =>
      b.addEventListener("click", toggleAdminStatus)
    );
    document.querySelectorAll(".delete-user-btn").forEach((b) =>
      b.addEventListener("click", deleteUser)
    );
  } catch (err) {
    console.error(err);
    showAlert("Failed to load users.", "danger");
  }
}

async function toggleAdminStatus(e) {
  const token = getToken();
  if (!token) return handleLogout();
  const btn = e.currentTarget;
  const userId = btn.dataset.id;
  const isAdmin = btn.dataset.isadmin === "true";
  const newStatus = !isAdmin;
  if (!confirm(`Are you sure you want to ${newStatus ? "promote" : "demote"} this user?`)) return;

  try {
    const res = await fetch(`${USERS_URL}/${userId}/admin`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ isAdmin: newStatus }),
    });
    if (res.ok) showAlert("User status updated.", "success");
    else showAlert("Failed to update.", "danger");
    loadUsers();
  } catch (err) {
    console.error(err);
    showAlert("Network error updating user.", "danger");
  }
}

async function deleteUser(e) {
  const token = getToken();
  if (!token) return handleLogout();
  const id = e.currentTarget.dataset.id;
  if (!confirm("Delete this user?")) return;
  try {
    const res = await fetch(`${USERS_URL}/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) showAlert("User deleted.", "success");
    else showAlert("Delete failed.", "danger");
    loadUsers();
  } catch (err) {
    console.error(err);
    showAlert("Network error.", "danger");
  }
}

// =======================================================
// 🧾 ORDER FUNCTIONS + VIEW MODAL
// =======================================================

// ✅ Show order details inside the modal
async function showOrderDetails(orderId) {
  const token = getToken();
  if (!token) return handleLogout();

  const body = document.getElementById("orderDetailsBody");
  body.innerHTML = '<div class="text-center my-3 text-muted">Loading...</div>';

  try {
    const res = await fetch(`${ORDERS_URL}/${orderId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const order = await res.json();

    const user =
      order.userId && typeof order.userId === "object"
        ? `${order.userId.firstName || ""} ${order.userId.lastName || ""} (${order.userId.email})`
        : "Unknown user";

    const itemsHtml = order.items
      .map((i) => {
        const img = i.image
          ? (i.image.startsWith("data:") || i.image.startsWith("http")
              ? i.image
              : `${API_BASE_URL}${i.image.startsWith("/") ? "" : "/"}${i.image}`)
          : "https://placehold.co/60x60/1C1C25/00FFFF?text=No+Img";
        return `
          <div class="d-flex align-items-center mb-2">
            <img src="${img}" alt="${i.name}"
                 style="width:60px;height:60px;object-fit:cover;border-radius:6px;margin-right:12px;
                        border:1px solid rgba(0,255,255,0.4);">
            <div>
              <div><b>${i.name}</b></div>
              <small class="text-muted">Qty: ${i.quantity}</small><br>
              <small class="text-info">$${i.price.toFixed(2)}</small>
            </div>
          </div>`;
      })
      .join("");

    body.innerHTML = `
      <p><strong>Customer:</strong> ${user}</p>
      <p><strong>Status:</strong> <span class="badge bg-info">${order.status}</span></p>
      <p><strong>Placed:</strong> ${new Date(order.createdAt).toLocaleString()}</p>
      <hr>
      <div>${itemsHtml}</div>
      <hr>
      <p><strong>Total Amount:</strong> <span class="text-warning">$${order.totalAmount.toFixed(2)}</span></p>
    `;

    new bootstrap.Modal(document.getElementById("orderDetailsModal")).show();
  } catch (err) {
    console.error(err);
    body.innerHTML =
      '<div class="text-center text-danger my-3">Failed to load order details.</div>';
  }
}

// ✅ Load all orders into the Admin Orders table
async function loadOrders() {
  const token = getToken();
  if (!token) return handleLogout();

  try {
    const res = await fetch(ORDERS_URL, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const orders = await res.json();

    if (!orders || !orders.length) {
      adminOrderTable.innerHTML =
        '<tr><td colspan="6" class="text-center">No orders yet.</td></tr>';
      return;
    }

    adminOrderTable.innerHTML = orders
      .map((o) => {
        const userName = o.userId
          ? `${o.userId.firstName || ""} ${o.userId.lastName || ""}`.trim()
          : "—";
        const userEmail = o.userId?.email || "—";
        const items = o.items
          .map((i) => `${i.name} ×${i.quantity}`)
          .join("<br>");
        const created = new Date(o.createdAt).toLocaleString();
        const statuses = ["Pending", "Processing", "Shipped", "Delivered", "Cancelled"]
          .map(
            (s) =>
              `<option value="${s}" ${
                s === o.status ? "selected" : ""
              }>${s}</option>`
          )
          .join("");

        return `
          <tr>
            <td>${userName}<br><small>${userEmail}</small></td>
            <td>${items}</td>
            <td>$${o.totalAmount.toFixed(2)}</td>
            <td>
              <select class="form-select form-select-sm order-status-select" data-id="${o._id}">
                ${statuses}
              </select>
            </td>
            <td>${created}</td>
            <td>
              <button class="btn btn-sm btn-info view-order-btn" data-id="${o._id}">View</button>
            </td>
          </tr>`;
      })
      .join("");

    document
      .querySelectorAll(".order-status-select")
      .forEach((sel) => sel.addEventListener("change", updateOrderStatus));

    document
      .querySelectorAll(".view-order-btn")
      .forEach((btn) =>
        btn.addEventListener("click", () => showOrderDetails(btn.dataset.id))
      );
  } catch (err) {
    console.error(err);
    showAlert("Failed to load orders.", "danger");
  }
}

// ✅ Update order status directly in the table
async function updateOrderStatus(e) {
  const token = getToken();
  if (!token) return handleLogout();

  const id = e.currentTarget.dataset.id;
  const newStatus = e.currentTarget.value;
  if (!confirm(`Change status to "${newStatus}"?`)) return;

  try {
    const res = await fetch(`${ORDERS_URL}/${id}/status`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ status: newStatus }),
    });
    if (res.ok) {
      showAlert("Order status updated.", "success");
    } else {
      const data = await res.json();
      showAlert(data.message || "Update failed.", "danger");
    }
  } catch (err) {
    console.error(err);
    showAlert("Network error.", "danger");
  }
}

// =======================================================
// 🚀 INITIALIZATION
// =======================================================
if (checkAdminStatus()) {
  loadProductsForAdmin();
  loadUsers();
  loadOrders();

  if (addProductForm) addProductForm.addEventListener("submit", addProduct);
  if (editProductForm) editProductForm.addEventListener("submit", handleEditFormSubmit);

  if (adminProductTable) {
    adminProductTable.addEventListener("click", (e) => {
      const btn = e.target.closest("button");
      if (!btn) return;
      const id = btn.dataset.id;
      if (btn.classList.contains("edit-btn")) populateEditModal(id);
      if (btn.classList.contains("delete-btn")) deleteProduct(id);
    });
  }
}