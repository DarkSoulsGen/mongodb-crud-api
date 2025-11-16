// index.js

// 🚨 CORRECTION: API_BASE_URL, PRODUCTS_URL, USERS_URL, PROFILE_URL, LOGIN_URL, and REGISTER_URL 
// are now defined globally in the inline script of index.html to prevent the SyntaxError.
// These declarations have been removed from this file.

// Element target for dynamic navbar (ID is on the UL element in index.html/product.html)
const navAuthLinks = document.getElementById("navAuthLinks"); 

// =======================================================
// 🛡️ AUTH FUNCTIONS
// =======================================================

function handleLogout() {
  localStorage.removeItem("knavetoneToken");
  localStorage.removeItem("knavetoneIsAdmin");
  localStorage.removeItem("knavetoneUserName"); 
  window.location.href = "index.html";
}

/**
 * Updates the navbar to show logged-in links (Profile, Logout).
 * @param {Object} user - The user object (must contain firstName and isAdmin).
 */
function updateLoggedInNavbar(user) {
    if (!navAuthLinks) return;
    
    // Cache user info
    localStorage.setItem("knavetoneUserName", user.firstName);
    localStorage.setItem("knavetoneIsAdmin", user.isAdmin);

    const isAdmin = user.isAdmin === true || user.isAdmin === 'true'; 
    
    // Replace the entire UL content with logged-in links
    let html = `
        <li class="nav-item"><a class="nav-link" href="product.html">Shop</a></li>
        <li class="nav-item"><a class="nav-link" href="#">About</a></li>
        <li class="nav-item"><a class="nav-link" href="#">Contact</a></li>
        ${isAdmin ? '<li class="nav-item"><a class="btn btn-danger btn-sm text-light ms-3" href="admin.html">Admin</a></li>' : ''}
        <li class="nav-item dropdown">
          <a class="nav-link dropdown-toggle text-info fw-bold ms-3" href="#" id="navbarDropdown" role="button" data-bs-toggle="dropdown" aria-expanded="false">
            Hi, ${user.firstName}
          </a>
          <ul class="dropdown-menu dropdown-menu-dark" aria-labelledby="navbarDropdown">
            <li><a class="dropdown-item" href="profile.html">My Profile</a></li>
            <li><hr class="dropdown-divider"></li>
            <li><a class="dropdown-item text-warning" href="#" onclick="handleLogout()">Logout</a></li>
          </ul>
        </li>
    `;

    navAuthLinks.innerHTML = html;
}

/**
 * Updates the navbar to show guest links (Register, Login).
 */
function updateGuestNavbar() {
    if (!navAuthLinks) return;
    
    // Replace the entire UL content with guest links
    const html = `
        <li class="nav-item"><a class="nav-link" href="product.html">Shop</a></li>
        <li class="nav-item"><a class="nav-link" href="#">About</a></li>
        <li class="nav-item"><a class="nav-link" href="#">Contact</a></li>
        <li class="nav-item"><a class="btn btn-info btn-sm text-dark ms-3 me-2" href="register.html">Register</a></li>
        <li class="nav-item"><button class="btn btn-warning btn-sm text-dark ms-3" data-bs-toggle="modal" data-bs-target="#loginModal">Login</button></li>
    `;

    navAuthLinks.innerHTML = html;
}

/**
 * Checks for authentication token and sets up the correct navbar.
 */
async function checkAuthenticationAndSetupNav() {
    // This assumes the API_BASE_URL and USERS_URL are defined globally
    if (!navAuthLinks || typeof API_BASE_URL === 'undefined') return; 

    const token = localStorage.getItem("knavetoneToken");
    
    if (token) {
        try {
            // Use the globally defined PROFILE_URL
            const res = await fetch(PROFILE_URL, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            if (res.ok) {
                const user = await res.json();
                updateLoggedInNavbar(user);
            } else {
                // Token is invalid/expired
                localStorage.removeItem("knavetoneToken");
                localStorage.removeItem("knavetoneIsAdmin");
                localStorage.removeItem("knavetoneUserName");
                updateGuestNavbar();
            }
        } catch (err) {
            console.error("Profile fetch failed:", err);
            updateGuestNavbar();
        }
    } else {
        updateGuestNavbar();
    }
}

// =======================================================
// 🏁 INITIALIZATION
// =======================================================
// This is intentionally kept minimal to only manage auth, which runs on all pages that include index.js
document.addEventListener("DOMContentLoaded", checkAuthenticationAndSetupNav);