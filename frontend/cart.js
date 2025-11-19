// cart.js

// Elements
const cartItemsList = document.getElementById("cartItemsList");
const emptyCartMessage = document.getElementById("emptyCartMessage");
// Elements for the Order Summary
const cartSubtotalEl = document.getElementById("cartSubtotal");
const cartTaxEl = document.getElementById("cartTax");
const cartTotalEl = document.getElementById("cartTotal");
const checkoutBtn = document.getElementById("checkoutBtn");

// NEW: bulk action buttons
const deleteSelectedBtnCart = document.getElementById("deleteSelectedBtnCart");
const checkoutSelectedBtnCart = document.getElementById("checkoutSelectedBtnCart");

// =======================================================
// 🛡️ AUTH HELPERS (For API communication)
// =======================================================

function getToken() {
  return localStorage.getItem("knavetoneToken");
}

function handleAuthError() {
  if (window.showAlert)
    window.showAlert("Session expired or login required. Redirecting.", "danger");
  setTimeout(() => {
    localStorage.removeItem("knavetoneToken");
    localStorage.removeItem("knavetoneIsAdmin");
    localStorage.removeItem("knavetoneUserName");
    localStorage.removeItem("knavetoneProfilePic");
    window.location.href = "index.html";
  }, 1500);
}

// =======================================================
// 🛒 ASYNC CART FETCHING
// =======================================================

async function fetchCartFromServer() {
  const token = getToken();
  if (!token) {
    return handleAuthError() || [];
  }

  try {
    const res = await fetch(CART_URL, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (res.ok) {
      const serverCart = await res.json();
      const clientCart = serverCart.map((item) => ({
        id: item.productId._id,
        quantity: item.quantity,
        ...item.productId, // name, price, stock, image, etc.
      }));

      if (typeof window.updateCartCount === "function")
        window.updateCartCount(clientCart.length);

      return clientCart;
    } else if (res.status === 401 || res.status === 403) {
      handleAuthError();
    }
    return [];
  } catch (error) {
    console.error("Error fetching cart:", error);
    if (window.showAlert)
      window.showAlert("Failed to connect to cart service.", "danger");
    return [];
  }
}

// =======================================================
// 💰 PRICE SUMMARY RENDERING
// =======================================================

function renderSummary(cart) {
  if (!cartSubtotalEl || !cartTaxEl || !cartTotalEl || !checkoutBtn) return;

  const subtotal = cart.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );

  const tax = 0;
  const total = subtotal;

  cartSubtotalEl.textContent = `$${subtotal.toFixed(2)}`;
  cartTaxEl.textContent = `$${tax.toFixed(2)}`;
  cartTotalEl.textContent = `$${total.toFixed(2)}`;

  if (subtotal > 0) {
    checkoutBtn.removeAttribute("disabled");
    checkoutBtn.classList.remove("btn-warning");
    checkoutBtn.classList.add("btn-primary");
  } else {
    checkoutBtn.setAttribute("disabled", "true");
    checkoutBtn.classList.remove("btn-primary");
    checkoutBtn.classList.add("btn-warning");
  }
}

// =======================================================
// 📦 CART ITEM ACTIONS
// =======================================================

async function updateQuantity(id, change) {
  const token = getToken();
  if (!token) return handleAuthError();

  const currentCart = await fetchCartFromServer();
  const item = currentCart.find((i) => i.id === id);

  if (item) {
    const newQuantity = item.quantity + change;
    const maxStock = item.stock || 99;

    if (newQuantity < 1) {
      return removeItem(id);
    } else if (newQuantity > maxStock) {
      if (window.showAlert)
        window.showAlert(
          `Cannot add more. Maximum stock (${maxStock}) reached for ${item.name}.`,
          "danger"
        );
      return;
    }

    try {
      const res = await fetch(CART_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ productId: id, quantity: newQuantity }),
      });

      if (res.ok) {
        if (window.showAlert)
          window.showAlert(
            `${item.name} quantity set to ${newQuantity}.`,
            "success"
          );
        renderCart();
      } else if (res.status === 401 || res.status === 403) {
        handleAuthError();
      } else {
        const data = await res.json();
        if (window.showAlert)
          window.showAlert(
            data.message || "Failed to update quantity.",
            "danger"
          );
      }
    } catch (error) {
      console.error("Error updating cart:", error);
      if (window.showAlert)
        window.showAlert("Network error while updating cart.", "danger");
    }
  }
}

async function removeItem(id) {
  const token = getToken();
  if (!token) return handleAuthError();

  const currentCart = await fetchCartFromServer();
  const itemToRemove = currentCart.find((i) => i.id === id);
  if (!itemToRemove) return;

  let ok = true;
  if (typeof window.showConfirmRemove === "function") {
    ok = await window.showConfirmRemove(
      `Are you sure you want to remove ${itemToRemove.name} from your cart?`
    );
  } else {
    ok = confirm(
      `Are you sure you want to remove ${itemToRemove.name} from your cart?`
    );
  }
  if (!ok) return;

  try {
    const res = await fetch(`${CART_URL}/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });

    if (res.ok) {
      if (window.showAlert)
        window.showAlert(
          `${itemToRemove.name} was removed from your cart.`,
          "success"
        );
      renderCart();
    } else if (res.status === 401 || res.status === 403) {
      handleAuthError();
    } else {
      const data = await res.json();
      if (window.showAlert)
        window.showAlert(data.message || "Failed to remove item.", "danger");
    }
  } catch (error) {
    console.error("Error removing item:", error);
    if (window.showAlert)
      window.showAlert("Network error while removing item.", "danger");
  }
}

// NEW: bulk delete selected items
async function handleDeleteSelected() {
  const token = getToken();
  if (!token) return handleAuthError();

  const selectedCheckboxes = document.querySelectorAll(
    ".cart-select-item:checked"
  );
  if (selectedCheckboxes.length === 0) return;

  let ok = true;
  if (typeof window.showConfirmRemove === "function") {
    ok = await window.showConfirmRemove(
      `Remove ${selectedCheckboxes.length} selected item(s) from your cart?`
    );
  } else {
    ok = confirm(
      `Remove ${selectedCheckboxes.length} selected item(s) from your cart?`
    );
  }
  if (!ok) return;

  try {
    for (const cb of selectedCheckboxes) {
      const id = cb.dataset.id;
      const res = await fetch(`${CART_URL}/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const data = await res.json();
        if (window.showAlert)
          window.showAlert(
            data.message || "Failed to remove some items.",
            "danger"
          );
      }
    }
    if (window.showAlert)
      window.showAlert("Selected items removed from your cart.", "success");
    renderCart();
  } catch (err) {
    console.error("Bulk delete error:", err);
    if (window.showAlert)
      window.showAlert("Network error while deleting items.", "danger");
  }
}

// =======================================================
// 🎨 MAIN CART RENDERING
// =======================================================

async function renderCart() {
  const cart = await fetchCartFromServer();

  if (cart.length === 0) {
    cartItemsList.innerHTML = "";
    emptyCartMessage.classList.remove("d-none");
    renderSummary(cart);
    return;
  }

  emptyCartMessage.classList.add("d-none");

  const cartHtml = cart
    .map((item) => {
      const itemTotal = (item.price * item.quantity).toFixed(2);
      const imageUrl =
        item.image ||
        "https://placehold.co/100x100/1C1C25/00FFFF?text=No+Image";
      const maxStock = item.stock || 99;

      return `
        <div class="card p-3 d-flex flex-row align-items-center justify-content-between">
          <div class="d-flex align-items-center">
            <div class="form-check me-3">
              <input class="form-check-input cart-select-item" type="checkbox" data-id="${item.id}" checked>
            </div>

            <img src="${imageUrl}" class="cart-item-img me-3" alt="${item.name}"
              onerror="this.onerror=null;this.src='https://placehold.co/100x100/1C1C25/00FFFF?text=No+Image';">
            
            <div>
              <h6 class="card-title mb-1">${item.name}</h6>
              <p class="text-light-muted mb-1 small">${item.brand || ""}</p>
              <p class="text-info fw-bold mb-0">$${item.price.toFixed(2)}</p>
            </div>
          </div>

          <div class="d-flex align-items-center">
            <div class="input-group input-group-sm me-3" style="width: 120px;">
              <button class="btn btn-outline-cyber btn-decrement" data-id="${item.id}">-</button>
              <input type="text" class="form-control text-center bg-dark text-info" value="${item.quantity}" readonly>
              <button class="btn btn-outline-cyber btn-increment" data-id="${item.id}" ${
                item.quantity >= maxStock ? "disabled" : ""
              }>+</button>
            </div>

            <div class="text-end me-3 d-none d-sm-block">
              <span class="fw-bold text-warning">$${itemTotal}</span>
            </div>

            <button class="btn btn-sm btn-danger btn-remove" data-id="${item.id}">
              <!-- your trash SVG here -->
            </button>
          </div>
        </div>
      `;
    })
    .join("");

  cartItemsList.innerHTML = cartHtml;

  // Bulk buttons enable/disable
  const checkboxes = document.querySelectorAll(".cart-select-item");
  function updateBulkButtons() {
    const anyChecked =
      document.querySelectorAll(".cart-select-item:checked").length > 0;
    if (deleteSelectedBtnCart) deleteSelectedBtnCart.disabled = !anyChecked;
    if (checkoutSelectedBtnCart) checkoutSelectedBtnCart.disabled = !anyChecked;
  }
  checkboxes.forEach((cb) =>
    cb.addEventListener("change", updateBulkButtons)
  );
  updateBulkButtons();

  // Summary
  renderSummary(cart);
}

// =======================================================
// 🔗 EVENT LISTENERS
// =======================================================

function setupCartListeners() {
  // Item controls (delegation)
  cartItemsList.addEventListener("click", (e) => {
    const target = e.target;
    const btn = target.closest("button");
    if (!btn) return;

    const id = btn.dataset.id;
    if (!id) return;

    if (btn.classList.contains("btn-decrement")) {
      updateQuantity(id, -1);
    } else if (btn.classList.contains("btn-increment")) {
      updateQuantity(id, 1);
    } else if (btn.classList.contains("btn-remove")) {
      removeItem(id);
    }
  });

  // Summary checkout button
  if (checkoutBtn) {
    checkoutBtn.addEventListener("click", handleCheckout);
  }

  // Bulk actions
  if (deleteSelectedBtnCart) {
    deleteSelectedBtnCart.addEventListener("click", handleDeleteSelected);
  }
  if (checkoutSelectedBtnCart) {
    checkoutSelectedBtnCart.addEventListener("click", handleCheckout);
  }
}

/**
 * Starts checkout for selected items by redirecting to checkout.html
 * with selected product IDs in the query string.
 */
async function handleCheckout() {
  const token = getToken();
  if (!token) return handleAuthError();

  const selectedCheckboxes = document.querySelectorAll(
    ".cart-select-item:checked"
  );
  if (selectedCheckboxes.length === 0) {
    if (window.showAlert)
      window.showAlert(
        "Please select at least one item to checkout.",
        "warning"
      );
    return;
  }

  const selectedIds = Array.from(selectedCheckboxes).map(
    (cb) => cb.dataset.id
  );

  const params = new URLSearchParams();
  selectedIds.forEach((id) => params.append("id", id));

  window.location.href = `checkout.html?${params.toString()}`;
}

// =======================================================
// 🏁 INITIALIZATION
// =======================================================
document.addEventListener("DOMContentLoaded", async () => {
  const token = getToken();
  if (!token) return handleAuthError();

  await renderCart();
  setupCartListeners();
});