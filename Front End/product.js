// product.js (frontend)
const API_BASE_URL = "https://mongodb-crud-api-azs9.onrender.com";
const PRODUCTS_URL = `${API_BASE_URL}/api/products`;
const productList = document.getElementById("productList");

async function loadProducts() {
  try {
    const res = await fetch(PRODUCTS_URL);
    const products = await res.json();

    if (!products.length) {
      productList.innerHTML = '<p class="text-center text-danger">No products available at the moment.</p>';
      return;
    }

    productList.innerHTML = products.map(p => `
      <div class="col-md-4 mb-4">
        <div class="card bg-secondary text-light h-100">
          <img src="${p.image || 'https://via.placeholder.com/400x300?text=No+Image'}"
               class="card-img-top"
               alt="${p.name}">
          <div class="card-body d-flex flex-column">
            <h5 class="card-title">${p.name}</h5>
            <p class="card-text text-warning">₱${p.price}</p>
            <p class="card-text flex-grow-1">${p.description || ''}</p>
            <button class="btn btn-outline-light w-100 mt-auto">View Details</button>
          </div>
        </div>
      </div>
    `).join('');
  } catch (err) {
    console.error("Error fetching products:", err);
    productList.innerHTML =
      '<p class="text-center text-danger">Error loading products. Please try again later.</p>';
  }
}

loadProducts();