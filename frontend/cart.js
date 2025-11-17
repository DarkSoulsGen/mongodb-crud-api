// cart.js

// Elements
const cartItemsList = document.getElementById("cartItemsList");
const emptyCartMessage = document.getElementById("emptyCartMessage");
// Elements for the Order Summary
const cartSubtotalEl = document.getElementById("cartSubtotal");
const cartTaxEl = document.getElementById("cartTax");
const cartTotalEl = document.getElementById("cartTotal");
const checkoutBtn = document.getElementById("checkoutBtn");

// Tax rate constant (7% or 0.07)
const TAX_RATE = 0.07;

// =======================================================
// 🛒 CART HELPERS
// =======================================================

function getCart(){ 
    // Ensure data is parsed correctly from localStorage
    return JSON.parse(localStorage.getItem("knavetoneCart")) || []; 
}

function saveCart(c){ 
    localStorage.setItem("knavetoneCart", JSON.stringify(c)); 
    // Update the nav count using the global function
    if(typeof window.updateCartCount === 'function') window.updateCartCount(c.length);
    renderCart(); // Re-render the cart on any change
}

// =======================================================
// 💰 PRICE SUMMARY RENDERING
// =======================================================

/**
 * Calculates and renders the cart subtotal, tax, and final total to the summary card.
 * @param {Array<Object>} cart - The current cart array.
 */
function renderSummary(cart) {
    // Check if the summary elements exist before proceeding
    if (!cartSubtotalEl || !cartTaxEl || !cartTotalEl || !checkoutBtn) return;

    // 1. Calculate Subtotal (sum of price * quantity for all items)
    const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    
    // 2. Calculate Tax (7% of subtotal)
    const tax = subtotal * TAX_RATE;

    // 3. Calculate Total
    const total = subtotal + tax;

    // 4. Update HTML elements, formatted to two decimal places
    cartSubtotalEl.textContent = `$${subtotal.toFixed(2)}`;
    cartTaxEl.textContent = `$${tax.toFixed(2)}`;
    cartTotalEl.textContent = `$${total.toFixed(2)}`;

    // 5. Update Checkout Button State
    if (subtotal > 0) {
        checkoutBtn.removeAttribute('disabled');
        checkoutBtn.classList.remove('btn-warning');
        checkoutBtn.classList.add('btn-primary');
    } else {
        checkoutBtn.setAttribute('disabled', 'true');
        checkoutBtn.classList.remove('btn-primary');
        checkoutBtn.classList.add('btn-warning');
    }
}


// =======================================================
// 📦 CART ITEM ACTIONS
// =======================================================

/**
 * Updates the quantity of a specific item in the cart.
 * @param {string} id - The product ID.
 * @param {number} change - The amount to add or subtract (e.g., +1 or -1).
 */
function updateQuantity(id, change) {
    const cart = getCart();
    const item = cart.find(i => i.id === id);

    if (item) {
        const newQuantity = item.quantity + change;
        
        // Use the stock value stored on the item object
        const maxStock = item.stock || 99; // Fallback stock value

        if (newQuantity < 1) {
            // Remove item if quantity drops below 1
            if (window.showAlert) window.showAlert(`${item.name} removed from cart.`, 'success');
            saveCart(cart.filter(i => i.id !== id));
        } else if (newQuantity > maxStock) {
            // Prevent increasing past maximum stock
            if (window.showAlert) window.showAlert(`Cannot add more. Maximum stock (${maxStock}) reached for ${item.name}.`, 'danger');
        } else {
            // Update quantity
            item.quantity = newQuantity;
            saveCart(cart);
        }
    }
}

/**
 * Removes an item completely from the cart.
 * @param {string} id - The product ID.
 */
function removeItem(id) {
    const cart = getCart();
    const itemToRemove = cart.find(i => i.id === id);

    if (itemToRemove) {
        // NOTE: Using a simple JS confirmation here. For better UX, this should be a custom modal.
        if (confirm(`Are you sure you want to remove ${itemToRemove.name} from your cart?`)) {
            const newCart = cart.filter(i => i.id !== id);
            saveCart(newCart);
            if (window.showAlert) window.showAlert(`${itemToRemove.name} was removed from your cart.`, 'success');
        }
    }
}

// =======================================================
// 🎨 MAIN CART RENDERING
// =======================================================

/**
 * Renders the entire cart contents to the UI.
 */
function renderCart() {
    const cart = getCart();

    if (cart.length === 0) {
        cartItemsList.innerHTML = '';
        emptyCartMessage.classList.remove('d-none');
        renderSummary(cart); // Update summary for empty cart
        return;
    }

    emptyCartMessage.classList.add('d-none');

    const cartHtml = cart.map(item => {
        const itemTotal = (item.price * item.quantity).toFixed(2);
        const imageUrl = item.image || 'https://placehold.co/100x100/1C1C25/00FFFF?text=No+Image';
        const maxStock = item.stock || 99;

        return `
            <div class="card p-3 d-flex flex-row align-items-center justify-content-between">
                <div class="d-flex align-items-center">
                    <img src="${imageUrl}" class="cart-item-img me-3" alt="${item.name}" onerror="this.onerror=null;this.src='https://placehold.co/100x100/1C1C25/00FFFF?text=No+Image';">
                    
                    <div>
                        <h6 class="card-title mb-1">${item.name}</h6>
                        <p class="text-light-muted mb-1 small">${item.brand}</p>
                        <p class="text-info fw-bold mb-0">$${item.price.toFixed(2)}</p>
                    </div>
                </div>

                <div class="d-flex align-items-center">
                    <!-- Quantity Controls -->
                    <div class="input-group input-group-sm me-3" style="width: 120px;">
                        <button class="btn btn-outline-cyber btn-decrement" data-id="${item.id}">-</button>
                        <!-- Input is readonly since quantity changes are handled by the buttons -->
                        <input type="text" class="form-control text-center bg-dark text-info" value="${item.quantity}" readonly>
                        <button class="btn btn-outline-cyber btn-increment" data-id="${item.id}" ${item.quantity >= maxStock ? 'disabled' : ''}>+</button>
                    </div>

                    <!-- Total Price & Remove Button -->
                    <div class="text-end me-3 d-none d-sm-block">
                        <span class="fw-bold text-warning">$${itemTotal}</span>
                    </div>

                    <button class="btn btn-sm btn-danger btn-remove" data-id="${item.id}">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-trash" viewBox="0 0 16 16">
                            <path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0V6z"/>
                            <path fill-rule="evenodd" d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1v1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4H4.118zM2.5 3V2h11v1h-11z"/>
                        </svg>
                    </button>
                </div>
            </div>
        `;
    }).join('');

    cartItemsList.innerHTML = cartHtml;
    
    // RENDER SUMMARY
    renderSummary(cart);
}

// =======================================================
// 🔗 EVENT LISTENERS
// =======================================================

function setupCartListeners() {
    // We attach one listener to the parent element (cartItemsList) for all item controls
    cartItemsList.addEventListener('click', (e) => {
        const target = e.target;
        
        // Find the closest button with a data-id
        const btn = target.closest('button');
        if (!btn) return; 

        const id = btn.dataset.id;
        if (!id) return;

        if (btn.classList.contains('btn-decrement')) {
            updateQuantity(id, -1);
        } else if (btn.classList.contains('btn-increment')) {
            updateQuantity(id, 1);
        } else if (btn.classList.contains('btn-remove')) {
            removeItem(id);
        }
    });

    // Checkout button listener (placeholder)
    checkoutBtn.addEventListener('click', () => {
        if (window.showAlert) {
            window.showAlert('Checkout initiated! (Placeholder: Cart cleared.)', 'success');
        }
        // Clear cart after simulated 'checkout'
        localStorage.removeItem("knavetoneCart");
        saveCart([]); // Renders the empty state
    });
}


// =======================================================
// 🏁 INITIALIZATION
// =======================================================
document.addEventListener("DOMContentLoaded", () => {
    // We need to ensure updateCartCount is called here as well, in case cart.js loads before index.js
    const initialCart = getCart();
    if(typeof window.updateCartCount === 'function') window.updateCartCount(initialCart.length);
    
    renderCart();
    setupCartListeners();
});