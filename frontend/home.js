// home.js

// Note: API_BASE_URL and PRODUCTS_URL are defined globally in index.html

const featuredProductList = document.getElementById("featuredProductsList"); 

// =======================================================
// 🎸 LOAD AND RENDER FEATURED PRODUCTS
// =======================================================

/**
 * Renders the product cards onto the featuredProductList element.
 * @param {Array<Object>} products - Array of product objects.
 */
function renderFeaturedProducts(products) {
    if (!featuredProductList) return;

    // Filter to ensure we only show 4 for the "featured" section
    const featured = products.slice(0, 4);

    if (featured.length === 0) {
        featuredProductList.innerHTML = '<div class="col-12 text-center text-warning p-5">No featured products available. Please add products via the Admin panel.</div>';
        return;
    }

    featuredProductList.innerHTML = featured.map(p => {
        // Safe check for missing image or description data
        const imageUrl = p.image || 'https://placehold.co/400x200/1C1C25/00FFFF?text=No+Image';
        const displayDescription = p.description ? p.description.substring(0, 100) + (p.description.length > 100 ? '...' : '') : 'No description available.';
        const displayId = p._id ? p._id.substring(0, 8) : 'N/A';
        
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
                                ${p.stock <= 0 ? 'disabled' : ''}>
                            ${p.stock <= 0 ? 'Out of Stock' : 'Add to Cart'}
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

    // Attach cart event listeners
    featuredProductList.querySelectorAll('.add-to-cart-btn').forEach(button => {
        if (!button.disabled) {
            button.addEventListener('click', (e) => {
                const p = e.currentTarget.dataset;
                addToCart({
                    id: p.id,
                    name: p.name,
                    price: parseFloat(p.price),
                    image: p.image,
                    quantity: 1,
                    stock: parseInt(p.stock)
                });
            });
        }
    });
}

/**
 * Fetches the list of products from the API.
 */
async function loadFeaturedProducts() {
    if (!featuredProductList) return;
    
    try {
        // Use the globally defined PRODUCTS_URL
        const res = await fetch(PRODUCTS_URL);
        if (!res.ok) {
            throw new Error(`HTTP error! status: ${res.status}`);
        }
        const products = await res.json();
        renderFeaturedProducts(products);
    } catch (error) {
        console.error("Error loading featured products:", error);
        if(featuredProductList) {
             featuredProductList.innerHTML = '<div class="col-12 text-center text-danger p-5">Failed to connect to the store database.</div>';
        }
    }
}

// 🔹 Minimal Cart Helpers
function getCart(){ return JSON.parse(localStorage.getItem("knavetoneCart")) || []; }
function saveCart(c){ 
    localStorage.setItem("knavetoneCart", JSON.stringify(c)); 
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

// Reuse the custom alert from index.html's inline script
function showCustomAlert(message, type) {
    // Use the global alias if available
    if (typeof window.showAlert === 'function') {
        window.showAlert(message, type);
        return;
    }
    // Fallback if showAlert is not available (shouldn't happen with index.html)
    alert(`[${type.toUpperCase()}] ${message}`);
}


// =======================================================
// 🏁 INITIALIZATION
// =======================================================
document.addEventListener("DOMContentLoaded", loadFeaturedProducts);