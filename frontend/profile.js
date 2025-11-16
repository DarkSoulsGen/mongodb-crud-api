// profile.js

// 🚨 CORRECTION: API_BASE_URL, USERS_URL, and PROFILE_URL are now defined globally in profile.html

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

// 🌟 NEW ELEMENTS (File upload and related)
const profileImageDisplay = document.getElementById("profileImageDisplay");
const profilePictureFile = document.getElementById("profilePictureFile");
const clearPictureBtn = document.getElementById("clearPictureBtn");

let currentProfilePictureUrl = ''; // To store the current URL from the DB

// =======================================================
// 🛡️ AUTH CHECK AND LOGOUT (UNCHANGED)
// =======================================================

function handleLogout() {
  localStorage.removeItem("knavetoneToken");
  localStorage.removeItem("knavetoneIsAdmin");
  localStorage.removeItem("knavetoneUserName");
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

function updateNavbar(firstName) {
    const isAdmin = localStorage.getItem("knavetoneIsAdmin");
    navProfileLinks.innerHTML = `
        <li class="nav-item"><a class="nav-link" href="index.html">Home</a></li>
        <li class="nav-item"><a class="nav-link active text-info" href="profile.html">Hi, ${firstName}</a></li>
    `;

    if (isAdmin === true || isAdmin === 'true') {
        const adminLi = document.createElement('li');
        adminLi.classList.add('nav-item');
        adminLi.innerHTML = `<a class="nav-link text-danger ms-2" href="admin.html">Admin Panel</a>`;
        navProfileLinks.appendChild(adminLi);
    }

    const logoutLi = document.createElement('li');
    logoutLi.classList.add('nav-item');
    logoutLi.innerHTML = `<a class="btn btn-warning btn-sm text-dark ms-3" href="#" id="logoutBtnProfile">Logout</a>`;
    navProfileLinks.appendChild(logoutLi);
    
    const newLogoutBtn = document.getElementById("logoutBtnProfile");
    if (newLogoutBtn) {
        newLogoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            handleLogout();
        });
    }
}


// =======================================================
// ⬇️ LOAD PROFILE DATA
// =======================================================

async function loadProfile() {
  const token = checkAuthentication();
  if (!token) return;

  try {
    const res = await fetch(PROFILE_URL, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${token}`,
      },
    });

    if (res.ok) {
      const user = await res.json();
      // Store the full URL returned by the server
      currentProfilePictureUrl = user.profilePicture; 
      populateForm(user);
      updateNavbar(user.firstName);
    } else {
      showAlert("danger", "Failed to load profile data.");
      handleLogout(); 
    }
  } catch (error) {
    console.error("Error loading profile:", error);
    showAlert("danger", "An unexpected error occurred.");
    handleLogout(); 
  }
}

// =======================================================
// ⬆️ HANDLE PROFILE UPDATE (MODIFIED TO USE FormData)
// =======================================================

async function handleFormSubmit(e) {
  e.preventDefault();

  const token = localStorage.getItem("knavetoneToken");
  if (!token) return; 

  // 🌟 MAJOR CHANGE: Use FormData to handle file uploads
  const formData = new FormData();

  // 1. Append the file if one is selected
  if (profilePictureFile.files.length > 0) {
    // The server is looking for the field name 'profilePictureFile'
    formData.append('profilePictureFile', profilePictureFile.files[0]);
  } else if (profileImageDisplay.dataset.cleared === 'true' && currentProfilePictureUrl) {
    // 2. Append a flag to clear the picture if the user clicked "Clear"
    // We only need to send the flag if there was a previous picture to clear.
    formData.append('clearProfilePicture', 'true');
  }

  // 3. Append all other text fields
  formData.append('firstName', profileFirstName.value);
  formData.append('middleName', profileMiddleName.value);
  formData.append('lastName', profileLastName.value);
  formData.append('phoneNumber', profilePhoneNumber.value);
  formData.append('address', profileAddress.value);
  
  // Use a string or the number, backend will handle null/int conversion
  formData.append('age', profileAge.value); 

  try {
    const res = await fetch(PROFILE_URL, {
      method: "PUT",
      // IMPORTANT: DO NOT set Content-Type header when using FormData, 
      // the browser sets the correct 'multipart/form-data' boundary automatically.
      headers: {
        "Authorization": `Bearer ${token}`,
      },
      body: formData, // Send the FormData object
    });

    const data = await res.json();

    if (res.ok) {
      showAlert("success", data.message || "Profile updated successfully!");
      // Re-fetch profile data to get the new image URL and update the navbar
      loadProfile(); 
      // Reset file input and clear flag after successful upload
      profilePictureFile.value = '';
      profileImageDisplay.dataset.cleared = 'false';
    } else {
      showAlert("danger", data.message || "Failed to update profile. Check file size/type.");
    }
  } catch (error) {
    console.error("Error updating profile:", error);
    showAlert("danger", "An unexpected error occurred during profile update.");
  }
}


// =======================================================
// 🔨 UTILITIES
// =======================================================

function populateForm(user) {
    const defaultImage = "https://placehold.co/150x150/1C1C25/00FFFF?text=User";
    
    // Set image display (using the full URL provided by the server)
    profileImageDisplay.src = user.profilePicture || defaultImage;
    profileImageDisplay.dataset.cleared = 'false'; // Reset clear status

    // Clear the file input every time, we only display the one loaded from DB
    profilePictureFile.value = ''; 

    profileFirstName.value = user.firstName || '';
    profileMiddleName.value = user.middleName || '';
    profileLastName.value = user.lastName || '';
    profileEmail.value = user.email || ''; 
    profilePhoneNumber.value = user.phoneNumber || '';
    profileAge.value = user.age || '';
    profileAddress.value = user.address || '';
}

function showAlert(type, message) {
  profileAlert.classList.remove('d-none', 'alert-success', 'alert-danger');
  profileAlert.classList.add(`alert-${type}`);
  profileAlert.textContent = message;
  setTimeout(() => {
    profileAlert.classList.add('d-none');
  }, 3000);
}


// =======================================================
// 🖼️ IMAGE PREVIEW AND CLEAR LOGIC
// =======================================================

// Live preview when a file is selected
function handleFileChange() {
    const file = profilePictureFile.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            profileImageDisplay.src = e.target.result;
            profileImageDisplay.dataset.cleared = 'false'; // User selected a new file
        };
        reader.readAsDataURL(file);
    } else {
        // If the user cancels the file selection, revert to the current picture
        profileImageDisplay.src = currentProfilePictureUrl || "https://placehold.co/150x150/1C1C25/00FFFF?text=User";
    }
}

// Clear button logic
function handleClearPicture() {
    const defaultImage = "https://placehold.co/150x150/1C1C25/00FFFF?text=User";
    
    // Visually clear the image
    profileImageDisplay.src = defaultImage;

    // Reset the file input itself
    profilePictureFile.value = '';

    // Set a flag to tell the form submit handler to send the "clear" instruction to the server
    profileImageDisplay.dataset.cleared = 'true';
}


// =======================================================
// 🏁 INITIALIZATION
// =======================================================
document.addEventListener("DOMContentLoaded", () => {
  loadProfile();
  if (profileForm) {
    profileForm.addEventListener("submit", handleFormSubmit);
  }
  if (profilePictureFile) {
      profilePictureFile.addEventListener("change", handleFileChange);
  }
  if (clearPictureBtn) {
      clearPictureBtn.addEventListener("click", handleClearPicture);
  }
});