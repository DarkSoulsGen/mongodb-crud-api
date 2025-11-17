// profile.js

// 🚨 API_BASE_URL, USERS_URL, PROFILE_URL, and DEFAULT_PROFILE_PIC are assumed to be globally available

// Elements
const profileForm = document.getElementById("profileForm");
const profileAlert = document.getElementById("profileAlert");
const navProfileLinks = document.getElementById("navProfileLinks");

// Profile form inputs
const profileFirstName = document.getElementById("profileFirstName");
const profileMiddleName = document.getElementById("profileMiddleName");
const profileLastName = document.getElementById("profileLastName");
const profileEmail = document.getElementById("profileEmail");
const profilePhoneNumber = document.getElementById("profilePhoneNumber");
const profileAge = document.getElementById("profileAge");
const profileAddress = document.getElementById("profileAddress");
const removePicButton = document.getElementById("removeProfilePictureBtn");

// State for picture removal
let clearProfilePicture = false;

// =======================================================
// 🛡️ AUTH CHECK AND LOGOUT
// =======================================================

function handleLogout() {
  localStorage.removeItem("knavetoneToken");
  localStorage.removeItem("knavetoneIsAdmin");
  localStorage.removeItem("knavetoneUserName");
  localStorage.removeItem("knavetoneProfilePic");
  window.location.href = "index.html";
}

function checkAuthentication() {
  const token = localStorage.getItem("knavetoneToken");
  if (!token) {
    // Use an immediate alert, then redirect
    alert("You must be logged in to view your profile.");
    setTimeout(() => window.location.href = "index.html", 100); 
    return false;
  }
  return token;
}

// =======================================================
// 🖼️ PROFILE PICTURE LOGIC
// =======================================================

if (removePicButton) {
    removePicButton.addEventListener('click', (e) => {
        e.preventDefault();
        
        const profilePicElement = document.getElementById("profilePictureDisplay");
        if (profilePicElement) {
            // Set image to default placeholder and mark for deletion on server
            profilePicElement.src = DEFAULT_PROFILE_PIC;
            clearProfilePicture = true;
            
            // Hide the button after 'removing'
            removePicButton.classList.add('d-none');
            
            // Clear the file input if one was selected
            const fileInput = document.getElementById("profilePictureFile");
            if (fileInput) {
                fileInput.value = '';
            }
        }
    });
}

// Listen for new file selection to reset the 'clear' flag
const fileInput = document.getElementById("profilePictureFile");
if (fileInput) {
    fileInput.addEventListener('change', () => {
        clearProfilePicture = false; 
    });
}

// =======================================================
// 🔄 PROFILE DATA FUNCTIONS
// =======================================================

/**
 * Renders the profile data onto the form fields.
 * @param {Object} user - The user object from the API.
 */
function renderProfile(user) {
    if (!profileForm) return;

    profileFirstName.value = user.firstName || '';
    profileMiddleName.value = user.middleName || '';
    profileLastName.value = user.lastName || '';
    profileEmail.value = user.email || ''; 
    profilePhoneNumber.value = user.phoneNumber || '';
    profileAge.value = user.age || '';
    profileAddress.value = user.address || '';

    const profilePicElement = document.getElementById("profilePictureDisplay");
    
    const profilePicUrl = user.profilePicture || DEFAULT_PROFILE_PIC;
    
    if (profilePicElement) {
        profilePicElement.src = profilePicUrl;
    }
    
    // ✅ FIX: Show/Hide the remove button based on if a picture URL is set (i.e., not null/empty string)
    if (removePicButton) {
        if (user.profilePicture && user.profilePicture !== DEFAULT_PROFILE_PIC) {
            removePicButton.classList.remove('d-none');
        } else {
            removePicButton.classList.add('d-none');
        }
    }
}

/**
 * Updates the profile navbar to show user name, picture, and Admin link, using the dropdown.
 */
function updateProfileNavbar() {
    const firstName = localStorage.getItem("knavetoneUserName") || 'User';
    const isAdmin = localStorage.getItem("knavetoneIsAdmin"); 
    const profilePicStored = localStorage.getItem("knavetoneProfilePic");
    
    // Construct Profile Picture URL from localStorage
    const profilePicUrl = profilePicStored || DEFAULT_PROFILE_PIC;
    
    // Get current cart count
    const cart = JSON.parse(localStorage.getItem("knavetoneCart")) || [];
    const cartCountValue = cart.length;

    if (!navProfileLinks) return;

    // Build the HTML with the new navigation links and the profile dropdown
    navProfileLinks.innerHTML = `
        <li class="nav-item"><a class="nav-link" href="index.html">Home</a></li>
        <li class="nav-item"><a class="nav-link" href="aboutus.html">About Us</a></li>
        <li class="nav-item"><a class="nav-link" href="contact.html">Contact</a></li>
        <li class="nav-item">
            <a class="nav-link position-relative" href="cart.html">
              <i class="bi bi-cart-fill fs-5"></i>
              <span id="cartCount" class="badge rounded-pill bg-danger position-absolute top-0 start-100 translate-middle">${cartCountValue}</span>
            </a>
        </li>
        <li class="nav-item dropdown">
            <a class="nav-link dropdown-toggle active text-info d-flex align-items-center" href="#" id="profileDropdown" role="button" data-bs-toggle="dropdown" aria-expanded="false">
                <img src="${profilePicUrl}" alt="Profile" 
                     style="width: 30px; height: 30px; border-radius: 50%; object-fit: cover; margin-right: 8px; border: 1px solid #ffc107;">
                Hi, ${firstName}
            </a>
            
            <ul class="dropdown-menu dropdown-menu-dark dropdown-menu-end" aria-labelledby="profileDropdown">
                <li><a class="dropdown-item active d-flex align-items-center" href="profile.html"><i class="bi bi-person me-2"></i> My Profile</a></li>
                ${(isAdmin === true || isAdmin === 'true') ? '<li><a class="dropdown-item text-danger d-flex align-items-center" href="admin.html"><i class="bi bi-gear me-2"></i> Admin Panel</a></li>' : ''}
                <li><hr class="dropdown-divider"></li>
                <li><a class="dropdown-item text-danger d-flex align-items-center" href="#" id="logoutBtnProfile"><i class="bi bi-box-arrow-right me-2"></i> Logout</a></li>
            </ul>
        </li>
    `; 

    // Re-attach the event listener to the new logout button
    const newLogoutBtn = document.getElementById("logoutBtnProfile");
    if (newLogoutBtn) {
        newLogoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            handleLogout();
        });
    }
    
    // Update the cart count visibility
    if(typeof window.updateCartCount === 'function') window.updateCartCount(cartCountValue);
}

// ... (loadProfile, showAlert, and updateProfile functions remain the same) ...

/**
 * Handles the profile form submission to update user data.
 */
if (profileForm) {
    profileForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const token = checkAuthentication();
        if (!token) return;

        const formData = new FormData();
        
        formData.append('firstName', profileFirstName.value);
        formData.append('middleName', profileMiddleName.value);
        formData.append('lastName', profileLastName.value);
        formData.append('phoneNumber', profilePhoneNumber.value);
        formData.append('age', profileAge.value);
        formData.append('address', profileAddress.value);
        
        const fileInput = document.getElementById("profilePictureFile");
        if (fileInput && fileInput.files.length > 0) {
            formData.append('profilePictureFile', fileInput.files[0]);
        }
        
        // Append the flag to clear the picture if the 'remove' button was clicked
        if (clearProfilePicture) {
            formData.append('clearProfilePicture', 'true');
        }

        try {
            const res = await fetch(PROFILE_URL, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
                // Note: fetch automatically sets 'Content-Type': 'multipart/form-data' 
                // when a FormData object is passed as the body.
                body: formData
            });

            const data = await res.json();
            
            if (res.ok) {
                // Update localStorage with new name and picture
                localStorage.setItem("knavetoneUserName", data.firstName);
                if (data.profilePicture) {
                    localStorage.setItem("knavetoneProfilePic", data.profilePicture);
                } else {
                    localStorage.removeItem("knavetoneProfilePic");
                }
                
                // Reset the clear state
                clearProfilePicture = false;
                
                showAlert('Profile updated successfully!', 'success');
                // Reload profile data and navbar to reflect changes
                loadProfile(); 
                updateProfileNavbar(); // Re-render navbar to update picture
            } else {
                showAlert(data.message || 'Failed to update profile. Server error.', 'danger');
            }

        } catch (error) {
            console.error('Update profile error:', error);
            showAlert('An unexpected error occurred during update.', 'danger');
        }
    });
}


/**
 * Helper to show alert messages on the profile page.
 * NOTE: showAlert is now defined globally in profile.html.
 */


// =======================================================
// 🏁 INITIALIZATION
// =======================================================
document.addEventListener("DOMContentLoaded", async () => {
    // 1. Check Auth and Load Profile Data
    if (checkAuthentication()) {
        await loadProfile();
    }
    
    // 2. Setup Navbar after loading profile data (or immediately if data is stored locally)
    updateProfileNavbar();
});

/**
 * Fetches user profile data from the server.
 */
async function loadProfile() {
    const token = checkAuthentication();
    if (!token) return;

    try {
        const res = await fetch(PROFILE_URL, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (res.ok) {
            const user = await res.json();
            renderProfile(user);
            return user;
        } else {
            showAlert('Failed to load profile data.', 'danger');
            // Force logout if token is invalid
            if (res.status === 401 || res.status === 403) {
                setTimeout(handleLogout, 1500);
            }
        }
    } catch (error) {
        console.error('Error fetching profile:', error);
        showAlert('Network error while fetching profile.', 'danger');
    }
}