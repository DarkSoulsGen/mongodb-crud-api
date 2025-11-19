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
  removePicButton.addEventListener("click", (e) => {
    e.preventDefault();

    const profilePicElement = document.getElementById("profilePicturePreview");
    if (profilePicElement) {
      profilePicElement.src = DEFAULT_PROFILE_PIC;
      clearProfilePicture = true;

      removePicButton.classList.add("d-none");

      const fileInput = document.getElementById("profilePicture");
      if (fileInput) {
        fileInput.value = "";
      }
    }
  });
}

// Listen for new file selection to reset the 'clear' flag
const fileInput = document.getElementById("profilePicture");
if (fileInput) {
  fileInput.addEventListener("change", () => {
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

  profileFirstName.value = user.firstName || "";
  profileMiddleName.value = user.middleName || "";
  profileLastName.value = user.lastName || "";
  profileEmail.value = user.email || "";
  profilePhoneNumber.value = user.phoneNumber || "";
  profileAge.value = user.age || "";
  profileAddress.value = user.address || "";

  const profilePicElement = document.getElementById("profilePicturePreview");
  const profilePicUrl = user.profilePicture || DEFAULT_PROFILE_PIC;

  if (profilePicElement) {
    profilePicElement.src = profilePicUrl;
  }

  // Show/Hide the remove button
  if (removePicButton) {
    if (user.profilePicture && user.profilePicture !== DEFAULT_PROFILE_PIC) {
      removePicButton.classList.remove("d-none");
    } else {
      removePicButton.classList.add("d-none");
    }
  }
}

/**
 * Updates the profile navbar to show user name, picture, and Admin link, using the dropdown.
 */
function updateProfileNavbar() {
  const firstName = localStorage.getItem("knavetoneUserName") || "User";
  const isAdmin = localStorage.getItem("knavetoneIsAdmin");
  const profilePicStored = localStorage.getItem("knavetoneProfilePic");

  const profilePicUrl = profilePicStored || DEFAULT_PROFILE_PIC;

  if (!navProfileLinks) return;

  navProfileLinks.innerHTML = `
  <li class="nav-item"><a class="nav-link" href="index.html">Home</a></li>
  <li class="nav-item"><a class="nav-link" href="about.html">About Us</a></li>
  <li class="nav-item"><a class="nav-link" href="contact.html">Contact</a></li>
  <li class="nav-item">
    <a class="nav-link position-relative" href="cart.html">
      <i class="bi bi-cart-fill fs-5"></i>
      <span id="cartCountNav" class="badge rounded-pill bg-danger position-absolute top-0 start-100 translate-middle d-none">0</span>
    </a>
  </li>
  <li class="nav-item dropdown">
    <a class="nav-link dropdown-toggle active text-info d-flex align-items-center" href="#" id="profileDropdown" role="button" data-bs-toggle="dropdown" aria-expanded="false">
      <img src="${profilePicUrl}" alt="Profile"
           style="width: 30px; height: 30px; border-radius: 50%; object-fit: cover; margin-right: 8px; border: 1px solid #ffc107;">
      Hi, ${firstName}
    </a>
    
    <ul class="dropdown-menu dropdown-menu-dark dropdown-menu-end" aria-labelledby="profileDropdown">
      <li>
        <a class="dropdown-item active d-flex align-items-center" href="profile.html">
          <i class="bi bi-person me-2"></i> My Profile
        </a>
      </li>
      <li>
        <a class="dropdown-item d-flex align-items-center" href="orders.html">
          <i class="bi bi-bag-check me-2"></i> My Orders
        </a>
      </li>
      ${
        isAdmin === true || isAdmin === "true"
          ? '<li><a class="dropdown-item text-danger d-flex align-items-center" href="admin.html"><i class="bi bi-gear me-2"></i> Admin Panel</a></li>'
          : ""
      }
      <li><hr class="dropdown-divider"></li>
      <li>
        <a class="dropdown-item text-danger d-flex align-items-center" href="#" id="logoutBtnProfile">
          <i class="bi bi-box-arrow-right me-2"></i> Logout
        </a>
      </li>
    </ul>
  </li>
`;

  const newLogoutBtn = document.getElementById("logoutBtnProfile");
  if (newLogoutBtn) {
    newLogoutBtn.addEventListener("click", (e) => {
      e.preventDefault();
      handleLogout();
    });
  }

  // Let index.js update the cart badge from the server
  if (typeof window.updateCartCountFromAPI === "function") {
    window.updateCartCountFromAPI();
  }
}

/**
 * Handles the profile form submission to update user data.
 */
if (profileForm) {
  profileForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const token = checkAuthentication();
    if (!token) return;

    const formData = new FormData();

    formData.append("firstName", profileFirstName.value);
    formData.append("middleName", profileMiddleName.value);
    formData.append("lastName", profileLastName.value);
    formData.append("phoneNumber", profilePhoneNumber.value);
    formData.append("age", profileAge.value);
    formData.append("address", profileAddress.value);

    const fileInput = document.getElementById("profilePicture");
    if (fileInput && fileInput.files.length > 0) {
      formData.append("profilePicture", fileInput.files[0]);
    }

    if (clearProfilePicture) {
      formData.append("removePicture", "true");
    }

    try {
      const res = await fetch(PROFILE_URL, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      const data = await res.json();

      if (res.ok) {
        localStorage.setItem("knavetoneUserName", data.firstName);
        if (data.profilePicture) {
          localStorage.setItem("knavetoneProfilePic", data.profilePicture);
        } else {
          localStorage.removeItem("knavetoneProfilePic");
        }

        clearProfilePicture = false;

        showAlert("Profile updated successfully!", "success");
        await loadProfile();
        updateProfileNavbar();
      } else {
        showAlert(data.message || "Failed to update profile. Server error.", "danger");
      }
    } catch (error) {
      console.error("Update profile error:", error);
      showAlert("An unexpected error occurred during update.", "danger");
    }
  });
}

// =======================================================
// 🏁 INITIALIZATION
// =======================================================
document.addEventListener("DOMContentLoaded", async () => {
  if (checkAuthentication()) {
    await loadProfile();
  }
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
        Authorization: `Bearer ${token}`,
      },
    });

    if (res.ok) {
      const user = await res.json();
      renderProfile(user);
      return user;
    } else {
      showAlert("Failed to load profile data.", "danger");
      if (res.status === 401 || res.status === 403) {
        setTimeout(handleLogout, 1500);
      }
    }
  } catch (error) {
    console.error("Error fetching profile:", error);
    showAlert("Network error while fetching profile.", "danger");
  }
}