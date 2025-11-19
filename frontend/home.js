// home.js

// Note: API_BASE_URL and PRODUCTS_URL are defined globally in index.html

const featuredProductList = document.getElementById("featuredProductsList");

// =======================================================
// 🎸 LOAD AND RENDER FEATURED PRODUCTS
// =======================================================

async function loadFeaturedProducts() {
  if (typeof PRODUCTS_URL === "undefined") {
    console.error("PRODUCTS_URL is not defined.");
    return;
  }

  try {
    const response = await fetch(PRODUCTS_URL);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const products = await response.json();
    renderFeaturedProducts(products);
  } catch (error) {
    console.error("Error loading featured products:", error);
    if (featuredProductList) {
      featuredProductList.innerHTML =
        '<div class="col-12 text-center text-danger p-5">Failed to connect to the store database.</div>';
    }
  }
}

/**
 * Renders the product cards onto the featuredProductList element.
 * Uses the shared window.addToCart (API-based) from product.js
 */
function renderFeaturedProducts(products) {
  if (!featuredProductList) return;

  const featured = products.slice(0, 4);

  if (featured.length === 0) {
    featuredProductList.innerHTML =
      '<div class="col-12 text-center text-warning p-5">No featured products available. Please add products via the Admin panel.</div>';
    return;
  }

  featuredProductList.innerHTML = featured
    .map((p) => {
      const imageUrl =
        p.image ||
        "https://placehold.co/400x200/1C1C25/00FFFF?text=No+Image";
      const displayDescription = p.description
        ? p.description.substring(0, 100) +
          (p.description.length > 100 ? "..." : "")
        : "No description available.";
      const inStockBadge =
        p.stock > 0
          ? `<span class="badge bg-success-cyber text-dark">In Stock</span>`
          : `<span class="badge bg-danger-cyber text-dark">Out of Stock</span>`;

      return `
        <div class="col-12 col-sm-6 col-md-3 mb-4">
          <div class="card card-cyber h-100 bg-darker shadow-lg border border-info border-opacity-50">
            <img src="${imageUrl}" class="card-img-top card-img-cyber" alt="${p.name}" loading="lazy"
                 onerror="this.onerror=null;this.src='https://placehold.co/400x200/1C1C25/00FFFF?text=Image+Load+Fail';" />
            <div class="card-body d-flex flex-column">
              <h5 class="card-title text-warning">${p.name}</h5>
              <p class="card-subtitle text-secondary mb-2">${p.brand} (${p.type})</p>
              <p class="card-text flex-grow-1 text-light-50">${displayDescription}</p>
              <div class="mt-2">
                ${inStockBadge}
              </div>
              <div class="mt-3 d-flex justify-content-between align-items-center">
                <h4 class="text-info mb-0">$${p.price.toFixed(2)}</h4>
                <button 
                  class="btn btn-cyber-primary btn-sm home-add-to-cart"
                  data-id="${p._id}"
                  data-name="${p.name}"
                  data-brand="${p.brand}"
                  data-price="${p.price}"
                  data-image="${p.image || ''}"
                  data-stock="${p.stock}"
                  ${p.stock === 0 ? "disabled" : ""}>
                  <i class="bi bi-cart-plus"></i> Add
                </button>
              </div>
            </div>
          </div>
        </div>
      `;
    })
    .join("");

  // Attach click handlers that call the shared window.addToCart
  document
    .querySelectorAll(".home-add-to-cart")
    .forEach((btn) =>
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        const d = btn.dataset;

        if (typeof window.addToCart !== "function") {
          console.error(
            "window.addToCart is not available. Make sure product.js is loaded after home.js."
          );
          return;
        }

        window.addToCart({
          id: d.id,
          name: d.name,
          brand: d.brand,
          price: parseFloat(d.price),
          image: d.image,
          stock: parseInt(d.stock, 10),
        });
      })
    );
}

// =======================================================
// 🏁 INITIALIZATION
// =======================================================
document.addEventListener("DOMContentLoaded", () => {
  loadFeaturedProducts();
});