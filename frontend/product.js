// product.js

// 🚨 API_BASE_URL, PRODUCTS_URL, and CART_URL are now defined globally by index.js/product.html

const productList = document.getElementById("productList");
const categoryButtons = document.getElementById("categoryButtons");
const cartCount = document.getElementById("cartCount");
// ✅ NEW: Sort button element
const sortDropdownButton = document.getElementById("sortDropdown"); 

// Global state for product data
let allProducts = [];
let currentSort = 'newest'; // Default sort
let currentCategory = 'All';

// 🚨 REMOVED: Old getCart/saveCart local storage functions.

// =======================================================
// 🛒 NEW ASYNC CART HELPERS (Re-implemented for API access)
// =======================================================

function getToken() {
    return localStorage.getItem("knavetoneToken");
}

function handleAuthFailure() {
    // Show login modal for unauthenticated users
    const loginModalEl = document.getElementById('loginModal');
    if (loginModalEl) {
        if (typeof bootstrap !== 'undefined' && bootstrap.Modal) {
            const loginModal = new bootstrap.Modal(loginModalEl);
            loginModal.show();
            showCustomAlert("Please login or register to add items to your cart.", "warning");
        } else {
            alert("Please login or register to add items to your cart.");
        }
    }
}

/**
 * Fetches the current cart count from the server and updates the UI (if function exists in index.js).
 */
function updateCartCountOnSuccess() {
  // Uses the global function defined in index.js
  if (typeof window.updateCartCountFromAPI === 'function') {
    window.updateCartCountFromAPI();
  }
}

/**
 * Adds or updates an item in the persistent cart via API.
 * @param {Object} p - The product object to add. Must include: id, name, stock.
 */
async function addToCart(p) {
  const token = getToken();
  if (!token) return handleAuthFailure();

  let currentQuantity = 0;
  
  try {
    const res = await fetch(CART_URL, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (res.ok) {
      const serverCart = await res.json();
      const itemInCart = serverCart.find(item => item.productId._id === p.id);
      if (itemInCart) {
        currentQuantity = itemInCart.quantity;
      }
    } else if (res.status === 401 || res.status === 403) {
      return handleAuthFailure();
    }
  } catch (error) {
    console.error("Error checking cart state:", error);
    return showCustomAlert('Failed to connect to cart service.', 'danger');
  }

  const newQuantity = currentQuantity + 1;
  const maxStock = p.stock;

  if (newQuantity > maxStock) {
    return showCustomAlert(`Maximum stock (${maxStock}) reached for ${p.name}.`, "danger");
  }

  try {
    const res = await fetch(CART_URL, {
      method: "POST",
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ productId: p.id, quantity: newQuantity })
    });

    const data = await res.json();

    if (res.ok) {
  // 1) Update cart badge (sum of quantities)
  updateCartCountOnSuccess();

  // 2) Trigger fly-to-cart animation with new total quantity
  if (typeof window.animateAddToCart === 'function') {
    window.animateAddToCart(p.id, newQuantity);
  }
  console.log("Add to cart success, animating for product:", p.id, "newQuantity:", newQuantity);

  // 3) Refresh products to update stock display
  await refreshProductsFromServer();
} else if (res.status === 401 || res.status === 403) {
      handleAuthFailure();
    } else {
      showCustomAlert(data.message || "Failed to add item to cart.", 'danger');
    }
  } catch (error) {
    console.error("Error sending cart update:", error);
    showCustomAlert('Network error while adding item to cart.', 'danger');
  }
}

// Reuse the custom alert from product.html's inline script
function showCustomAlert(message, type) {
    // Use the global alias if available
    if (typeof window.showAlert === 'function') { 
        window.showAlert(message, type);
        return;
    }
    // Fallback if showAlert is not available
    alert(`[${type.toUpperCase()}] ${message}`);
}


// =======================================================
// ⬇️ LOAD AND RENDER PRODUCTS (No change)
// =======================================================

function renderProducts(products) {
  if (!productList) return;

  if (products.length === 0) {
    productList.innerHTML = '<div class="col-12 text-center text-warning p-5">No products found in this category.</div>';
    return;
  }

  productList.innerHTML = products.map(p => {
    const imageUrl = p.image || 'https://placehold.co/400x200/1C1C25/00FFFF?text=No+Image';
    const displayDescription = p.description
      ? p.description.substring(0, 100) + (p.description.length > 100 ? '...' : '')
      : 'No description available.';
    const isOutOfStock = p.stock <= 0;

    const stockLabel = isOutOfStock
      ? '<span class="badge bg-danger-cyber text-dark">Out of Stock</span>'
      : `<span class="badge bg-success-cyber text-dark">In Stock: ${p.stock}</span>`;

    return `
      <div class="col-6 col-sm-4 col-md-4 col-lg-3 mb-4">
        <div class="card card-cyber h-100">
          <img src="${imageUrl}" class="card-img-top" alt="${p.name}" loading="lazy">
          <div class="card-body d-flex flex-column">
            <h5 class="card-title text-warning">${p.name}</h5>
            <p class="card-text text-muted">${displayDescription}</p>
            <p class="mb-1">${stockLabel}</p>
            <p class="mt-auto fw-bold text-info fs-4">$${p.price.toFixed(2)}</p>
            <button class="btn btn-warning btn-sm fw-bold mt-2 add-to-cart-btn"
              data-id="${p._id}"
              data-name="${p.name}"
              data-price="${p.price}"
              data-image="${p.image}"
              data-stock="${p.stock}"
              ${isOutOfStock ? 'disabled' : ''}>
              ${isOutOfStock ? 'Out of Stock' : 'Add to Cart'}
            </button>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

function renderCategoryButtons(products) {
    if (!categoryButtons) return;

    const categories = new Set(products.map(p => p.type));
    
    let buttonsHtml = '<button class="btn btn-cyber-cat active" data-category="All">All</button>';
    categories.forEach(cat => {
        buttonsHtml += `<button class="btn btn-cyber-cat" data-category="${cat}">${cat}</button>`;
    });

    categoryButtons.innerHTML = buttonsHtml;

    // Attach click listeners to filter
    categoryButtons.querySelectorAll('.btn-cyber-cat').forEach(button => {
        button.addEventListener('click', (e) => {
            // Update active state
            categoryButtons.querySelectorAll('.btn-cyber-cat').forEach(b => b.classList.remove('active'));
            e.currentTarget.classList.add('active');
            
            displayProducts(e.currentTarget.dataset.category);
        });
    });
}

function sortProducts(products) {
    switch (currentSort) {
        case 'priceAsc':
            return products.sort((a, b) => a.price - b.price);
        case 'priceDesc':
            return products.sort((a, b) => b.price - a.price);
        case 'nameAsc':
            return products.sort((a, b) => a.name.localeCompare(b.name));
        case 'newest':
        default:
            return products.reverse(); 
    }
}


function displayProducts(category) {
  currentCategory = category;  // remember last category

  let filteredProducts = allProducts;
  
  if (category !== 'All') {
    filteredProducts = allProducts.filter(p => p.type === category);
  }
  
  const sortedProducts = sortProducts([...filteredProducts]);
  renderProducts(sortedProducts);
}

/**
 * Main function to load all products and initialize the page.
 */
async function loadAllProducts() {
    if (!productList) return;
    
    productList.innerHTML = '<div class="col-12 text-center text-muted p-5">Loading catalog...</div>';
    
    try {
        const res = await fetch(PRODUCTS_URL);
        if (!res.ok) {
            throw new Error(`HTTP error! status: ${res.status}`);
        }
        const products = await res.json();
        
        // Store all products globally
        allProducts = products;

        // 1. Render Category Buttons
        renderCategoryButtons(allProducts);
        
        // 2. Display all products by default
        displayProducts('All'); 

    } catch (error) {
        console.error("Error loading products:", error);
        productList.innerHTML = '<div class="col-12 text-center text-danger p-5">Failed to connect to the store database.</div>';
    }
}

// =======================================================
// 🎚️ SORTING EVENT LISTENER (No change)
// =======================================================
if (document.querySelector('.dropdown-menu-dark')) {
    document.querySelector('.dropdown-menu-dark').addEventListener('click', function(e) {
      if (e.target.classList.contains('dropdown-item')) {
        e.preventDefault();
        
        const sortType = e.target.dataset.sort;
        currentSort = sortType;
        
        // Update button text
        sortDropdownButton.textContent = `Sort By: ${e.target.textContent}`;
        
        // Get the category of the currently active button to re-filter/re-display
        const activeCategory = document.querySelector('.btn-cyber-cat.active').dataset.category;
        displayProducts(activeCategory);
      }
    });
}

// =======================================================
// 🖱️ FIX: EVENT DELEGATION FOR ADD TO CART
// =======================================================
if (productList) {
    productList.addEventListener('click', function(e) {
        // Use closest() to find the button, even if an icon or span inside was clicked
        const btn = e.target.closest('.add-to-cart-btn');
        
        if (btn && !btn.disabled) {
            e.preventDefault();
            const p = btn.dataset;
            
            // Call the addToCart function using the data attributes
            addToCart({
                id: p.id,
                name: p.name,
                price: parseFloat(p.price),
                image: p.image,
                quantity: 1, 
                stock: parseInt(p.stock)
            });
        }
    });
}

// Re-fetch products from server and redisplay current category/sort
async function refreshProductsFromServer() {
  try {
    const res = await fetch(PRODUCTS_URL);
    if (!res.ok) {
      throw new Error(`HTTP error! status: ${res.status}`);
    }
    const products = await res.json();
    allProducts = products;

    // If category buttons already exist, just redisplay with current filters
    if (categoryButtons && categoryButtons.children.length > 0) {
      displayProducts(currentCategory);
    } else {
      // If first load somehow, build category buttons
      renderCategoryButtons(allProducts);
      displayProducts('All');
    }
  } catch (err) {
    console.error("Error refreshing products from server:", err);
  }
}

// =======================================================
// 🏁 INITIALIZATION
// =======================================================
document.addEventListener("DOMContentLoaded", loadAllProducts);