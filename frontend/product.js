const API_BASE_URL = "https://mongodb-crud-api-azs9.onrender.com";
const PRODUCTS_URL = `${API_BASE_URL}/api/products`;

const productList = document.getElementById("productList");
const categoryButtons = document.getElementById("categoryButtons");
const cartCount = document.getElementById("cartCount");

// 🔹 cart helpers (same as before)
function getCart(){ return JSON.parse(localStorage.getItem("knavetoneCart")) || []; }
function saveCart(c){ localStorage.setItem("knavetoneCart", JSON.stringify(c)); if(cartCount) cartCount.textContent = c.length; }
function addToCart(p){
  const c=getCart();
  if (c.find(i=>i.id===p.id)) return alert(`${p.name} is already in your cart.`);
  c.push(p); saveCart(c);
  alert(`${p.name} added to your cart!`);
}
saveCart(getCart());

// =======================================================
// 🎸 LOAD AND FILTER PRODUCTS
// =======================================================
let allProducts = [];

async function loadProducts() {
  try {
    const res = await fetch(PRODUCTS_URL);
    allProducts = await res.json();

    if (!allProducts.length) {
      productList.innerHTML = '<p class="text-center text-danger">No products available.</p>';
      return;
    }

    // ✅ build category buttons dynamically
    const uniqueCats = [...new Set(allProducts.map(p => p.type || "Other"))];
    categoryButtons.innerHTML =
      `<button class="btn btn-outline-primary btn-sm active" data-category="All">All</button>` +
      uniqueCats.map(cat => `<button class="btn btn-outline-primary btn-sm" data-category="${cat}">${cat}</button>`).join('');

    // attach filtering behaviour
    document.querySelectorAll("#categoryButtons button").forEach(btn => {
      btn.addEventListener("click", () => {
        document.querySelectorAll("#categoryButtons button").forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        displayProducts(btn.dataset.category);
      });
    });

    // show all initially
    displayProducts("All");
  } catch (err) {
    console.error("Error fetching products:", err);
  }
}

function displayProducts(category) {
  const products = category === "All"
    ? allProducts
    : allProducts.filter(p => (p.type || "Other") === category);

  productList.innerHTML = "";

  products.forEach(p => {
    const imageUrl = p.image || `https://source.unsplash.com/400x250/?${p.type},guitar`;
    productList.innerHTML += `
      <div class="col-sm-6 col-md-4 col-lg-3">
        <div class="card shadow-sm h-100">
          <img src="${imageUrl}" class="card-img-top" alt="${p.name}">
          <div class="card-body text-center">
            <h5 class="card-title">${p.name}</h5>
            <p class="text-muted">${p.brand || ""}</p>
            <p class="fw-bold">₱${p.price}</p>
            <button class="btn btn-primary btn-sm add-cart-btn"
                    data-id="${p._id}"
                    data-name="${p.name}"
                    data-price="${p.price}"
                    data-image="${imageUrl}">
              Add to Cart
            </button>
          </div>
        </div>
      </div>`;
  });

  // Add cart button events
  document.querySelectorAll(".add-cart-btn").forEach(btn =>
    btn.addEventListener("click", () => {
      addToCart({
        id: btn.dataset.id,
        name: btn.dataset.name,
        price: btn.dataset.price,
        image: btn.dataset.image,
      });
    })
  );
}

// Start
loadProducts();