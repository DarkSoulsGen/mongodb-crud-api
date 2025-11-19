// index.js

// 🚨 DEFAULT_PROFILE_PIC is now defined globally in the inline script of index.html.

// Element target for dynamic navbar 
const navAuthLinks = document.getElementById("navAuthLinks"); 

// =======================================================
// 🚨 FIX 1: DEFINE CART_URL GLOBALLY
// Assumes API_BASE_URL and PROFILE_URL are globally defined
const CART_URL = `${API_BASE_URL}/api/cart`;

// =======================================================
// ⬇️ NAVIGATION HELPERS
// =======================================================

/**
 * Checks if the current page is the homepage (index.html or root path).
 * @returns {boolean} True if on homepage, false otherwise.
 */
function isHomePage() {
    const path = window.location.pathname.toLowerCase();
    return path === '/' || path.endsWith('/index.html') || path.endsWith('/');
}

/**
 * Generates the Cart HTML link.
 * Now shown on ALL pages, including the homepage.
 * @returns {string} The HTML string for the cart link.
 */
function getCartHtml() {    
  return `
    <li class="nav-item">
      <a class="nav-link" href="cart.html">
        <i class="bi bi-cart"></i> Cart 
        <span class="badge rounded-pill bg-danger d-none" id="cartCountNav">0</span>
      </a>
    </li>
  `;
}

// =======================================================
// 🛒 NEW ASYNC CART COUNT FUNCTIONS
// =======================================================

function getToken() {
    return localStorage.getItem("knavetoneToken");
}

/**
 * Fetches the user's cart from the server and updates the navbar count badge.
 * This is exposed globally for home.js and product.js.
 */
window.updateCartCountFromAPI = async function() {
  if (typeof CART_URL === 'undefined') return; 

  const token = getToken();
  const cartCountNav = document.getElementById('cartCountNav');
  
  const updateBadge = (count) => {
    if (!cartCountNav) return;
    cartCountNav.textContent = count;
    if (count > 0) {
      cartCountNav.classList.remove('d-none');
    } else {
      cartCountNav.classList.add('d-none');
    }
  };

  if (!token) {
    updateBadge(0);
    return; 
  }

  try {
    const res = await fetch(CART_URL, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (res.ok) {
      const serverCart = await res.json();
      const count = serverCart.reduce((sum, item) => sum + (item.quantity || 0), 0);
      updateBadge(count);
    } else {
      if (res.status === 401 || res.status === 403) {
        localStorage.removeItem("knavetoneToken");
        localStorage.removeItem("knavetoneIsAdmin");
        localStorage.removeItem("knavetoneUserName");
        localStorage.removeItem("knavetoneProfilePic");
      }
      updateBadge(0);
    }
  } catch (error) {
    console.error("Error fetching cart count:", error);
    updateBadge(0);
  }
};

// =======================================================
// 🛡️ AUTH FUNCTIONS
// =======================================================

function handleLogout() {
    localStorage.removeItem("knavetoneToken");
    localStorage.removeItem("knavetoneIsAdmin");
    localStorage.removeItem("knavetoneUserName"); 
    localStorage.removeItem("knavetoneProfilePic"); 
    window.location.href = "index.html";
}

/**
 * Updates the navbar to show logged-in links (Profile, Logout) with the picture and dropdown.
 * @param {Object} user - The user object (must contain firstName, isAdmin, and profilePicture).
 */
function updateLoggedInNavbar(user) {
    if (!navAuthLinks) return;
    
    localStorage.setItem("knavetoneUserName", user.firstName);
    localStorage.setItem("knavetoneIsAdmin", user.isAdmin);
    
    if (user.profilePicture) {
        localStorage.setItem("knavetoneProfilePic", user.profilePicture);
    } else {
        localStorage.removeItem("knavetoneProfilePic");
    }

    const isAdmin = user.isAdmin === true;
    
    navAuthLinks.innerHTML = `
        ${isAdmin ? `<li class="nav-item"><a class="nav-link text-warning" href="admin.html"><i class="bi bi-tools"></i> Admin</a></li>` : ''}
        
        ${getCartHtml()}

        <li class="nav-item dropdown">
            <a class="nav-link dropdown-toggle d-flex align-items-center" href="#" id="profileDropdown" role="button" data-bs-toggle="dropdown" aria-expanded="false">
                <img src="${user.profilePicture || DEFAULT_PROFILE_PIC}" alt="Profile" class="rounded-circle me-2" width="30" height="30" style="object-fit: cover; border: 2px solid #00ffff; box-shadow: 0 0 5px #00ffff;">
                Hello, ${user.firstName}
            </a>
            <ul class="dropdown-menu dropdown-menu-dark dropdown-menu-end" aria-labelledby="profileDropdown">
                <li><a class="dropdown-item" href="profile.html">My Profile</a></li>
                <li><a class="dropdown-item" href="orders.html">My Orders</a></li>
                ${isAdmin ? '<li><a class="dropdown-item text-warning" href="admin.html">Admin Panel</a></li>' : ''}
                <li><hr class="dropdown-divider"></li>
                <li><a class="dropdown-item text-danger d-flex align-items-center" href="#" id="logoutBtn"><i class="bi bi-box-arrow-right me-2"></i> Logout</a></li>
            </ul>
        </li>
    `;

    const logoutBtn = document.getElementById("logoutBtn");
    if (logoutBtn) {
        logoutBtn.addEventListener('click', handleLogout);
    }
}

function updateGuestNavbar() {
    if (!navAuthLinks) return;
    
    navAuthLinks.innerHTML = `
        ${getCartHtml()}
        <li class="nav-item">
          <a class="nav-link login-link" href="#" data-bs-toggle="modal" data-bs-target="#loginModal">Login</a>
        </li>
    `;
}

/**
 * Checks for authentication token, fetches user profile, and sets up the correct navbar.
 */
async function checkAuthenticationAndSetupNav() {
    if (!navAuthLinks || typeof API_BASE_URL === 'undefined') return; 

    const token = localStorage.getItem("knavetoneToken");
    
    if (token) {
        try {
            const res = await fetch(PROFILE_URL, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            if (res.ok) {
                const user = await res.json();
                updateLoggedInNavbar(user);
            } else {
                localStorage.removeItem("knavetoneToken");
                localStorage.removeItem("knavetoneIsAdmin");
                localStorage.removeItem("knavetoneUserName");
                localStorage.removeItem("knavetoneProfilePic"); 
                updateGuestNavbar();
            }
        } catch (err) {
            console.error("Profile fetch failed:", err);
            updateGuestNavbar();
        }
    } else {
        updateGuestNavbar();
    }
    
    window.updateCartCountFromAPI();
}

// =======================================================
// 🏁 INITIALIZATION
// =======================================================
document.addEventListener("DOMContentLoaded", checkAuthenticationAndSetupNav);