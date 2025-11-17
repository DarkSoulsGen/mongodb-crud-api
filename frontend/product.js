// product.js

// 🚨 API_BASE_URL and PRODUCTS_URL are now defined globally in index.html/product.html

const productList = document.getElementById("productList");
const categoryButtons = document.getElementById("categoryButtons");
const cartCount = document.getElementById("cartCount");
// ✅ NEW: Sort button element
const sortDropdownButton = document.getElementById("sortDropdown"); 

// Global state for product data
let allProducts = [];
let currentSort = 'newest'; // Default sort

// 🔹 cart helpers (same as before)
function getCart(){ return JSON.parse(localStorage.getItem("knavetoneCart")) || []; }
function saveCart(c){ 
    localStorage.setItem("knavetoneCart", JSON.stringify(c)); 
    // Use the global function defined in the HTML script for cart count update
    if(typeof updateCartCount === 'function') updateCartCount(c.length);
    else if(cartCount) cartCount.textContent = c.length; 
}

function isUserLoggedIn() {
    return !!localStorage.getItem("knavetoneToken");
}

function addToCart(p){
  // ✅ NEW: Authentication Check
  if (!isUserLoggedIn()) {
    const loginModalEl = document.getElementById('loginModal');
    if (loginModalEl) {
      // Check if bootstrap is defined before calling the constructor
      if (typeof bootstrap !== 'undefined' && bootstrap.Modal) {
          const loginModal = new bootstrap.Modal(loginModalEl);
          loginModal.show();
          showCustomAlert("Please login or register to add items to your cart.", "warning");
      } else {
          alert("Please login or register to add items to your cart.");
      }
    }
    return;
  }
  
  const c=getCart();
  
  // Check for stock before adding
  const itemInCart = c.find(i => i.id === p.id);
  if (itemInCart) {
      if (itemInCart.quantity < p.stock) {
          itemInCart.quantity += 1;
          showCustomAlert(`${p.name} quantity increased to ${itemInCart.quantity}.`, "success");
      } else {
          return showCustomAlert(`Maximum stock (${p.stock}) reached for ${p.name}.`, "danger");
      }
  } else {
      if (p.stock > 0) {
          c.push({...p, quantity: 1}); // Start with quantity 1
          showCustomAlert(`${p.name} added to your cart!`, "success");
      } else {
          return showCustomAlert(`${p.name} is out of stock.`, "danger");
      }
  }

  saveCart(c);
}

// Reuse the custom alert from product.html's inline script
function showCustomAlert(message, type) {
    // Use the global alias if available
    if (typeof window.showCustomAlert === 'function') {
        window.showCustomAlert(message, type);
        return;
    }
    // Fallback if showAlert is not available
    alert(`[${type.toUpperCase()}] ${message}`);
}

// =======================================================
// ⬇️ LOAD AND RENDER PRODUCTS
// =======================================================

function renderProducts(products) {
    if (!productList) return;

    if (products.length === 0) {
        productList.innerHTML = '<div class="col-12 text-center text-warning p-5">No products found in this category.</div>';
        return;
    }

    productList.innerHTML = products.map(p => {
        const imageUrl = p.image || 'https://placehold.co/400x200/1C1C25/00FFFF?text=No+Image';
        const displayDescription = p.description ? p.description.substring(0, 100) + (p.description.length > 100 ? '...' : '') : 'No description available.';
        const displayId = p._id ? p._id.substring(0, 8) : 'N/A';
        const isOutOfStock = p.stock <= 0;

        return `
            <div class="col">
                <div class="card card-cyber h-100">
                    <img src="${imageUrl}" class="card-img-top" alt="${p.name}" loading="lazy">
                    <div class="card-body d-flex flex-column">
                        <h5 class="card-title text-warning">${p.name}</h5>
                        <p class="card-text text-muted">${displayDescription}</p>
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
                    <div class="card-footer bg-transparent border-0 d-flex justify-content-between">
                         <small class="text-muted">ID: ${displayId}</small>
                         <small class="text-info">${p.type}</small>
                    </div>
                </div>
            </div>
        `;
    }).join('');

    // Re-attach cart event listeners
    productList.querySelectorAll('.add-to-cart-btn').forEach(button => {
        if (!button.disabled) {
            button.addEventListener('click', (e) => {
                const p = e.currentTarget.dataset;
                addToCart({
                    id: p.id,
                    name: p.name,
                    price: parseFloat(p.price),
                    image: p.image,
                    quantity: 1, // Quantity will be managed by the addToCart logic
                    stock: parseInt(p.stock)
                });
            });
        }
    });
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
            // Assuming the API returns products ordered by creation date (or use a dedicated 'createdAt' field if available)
            // For now, we'll assume the default array order is by creation or ID.
            return products.reverse(); // Simple way to simulate reverse order if API returns by ID
    }
}


function displayProducts(category) {
    let filteredProducts = allProducts;
    
    // 1. Filter
    if (category !== 'All') {
        filteredProducts = allProducts.filter(p => p.type === category);
    }
    
    // 2. Sort
    const sortedProducts = sortProducts([...filteredProducts]);
    
    // 3. Render
    renderProducts(sortedProducts);
}

/**
 * Main function to load all products and initialize the page.
 */
async function loadAllProducts() {
    if (!productList) return;
    
    // Initial cart count update
    saveCart(getCart());

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
// 🎚️ SORTING EVENT LISTENER (Existing code)
// =======================================================
if (document.querySelector('.dropdown-menu-dark')) {
    document.querySelector('.dropdown-menu-dark').addEventListener('click', function(e) {
      if (e.target.classList.contains('dropdown-item')) {
        e.preventDefault();
        
        const sortType = e.target.dataset.sort;
        currentSort = sortType;
        
        // Update button text
        const sortText = e.target.textContent;
        sortDropdownButton.textContent = `Sort By: ${sortText}`;
        
        // Get the category of the currently active button to re-filter/re-display
        const activeCategory = document.querySelector('.btn-cyber-cat.active').dataset.category;
        displayProducts(activeCategory);
      }
    });
}

// =======================================================
// 🏁 INITIALIZATION
// =======================================================
document.addEventListener("DOMContentLoaded", loadAllProducts);