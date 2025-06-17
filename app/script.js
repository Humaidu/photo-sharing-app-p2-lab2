const clientId = "56jimf3rgk7nv06afn1uh1fp27";
const redirectUri = "https://d3se36oyslytfb.cloudfront.net/upload.html";
const cognitoDomain =
  "https://eu-west-1ls98byc81.auth.eu-west-1.amazoncognito.com";

// Redirect user to login page
function redirectToLogin() {
  const loginUrl = `${cognitoDomain}/login?response_type=code&client_id=${clientId}&redirect_uri=${encodeURIComponent(
    redirectUri
  )}&scope=email+openid+phone`;
  window.location.href = loginUrl;
}

// Log user out
function logout() {
  localStorage.clear();
  window.location.href = "index.html";
}

// Decode ID token
function decodeToken(token) {
  try {
    const payload = token.split(".")[1];
    return JSON.parse(atob(payload));
  } catch (e) {
    return null;
  }
}

// Handle login redirect after Cognito login
async function handleLoginRedirect() {
  const urlParams = new URLSearchParams(window.location.search);
  const code = urlParams.get("code");

  if (!code) return;

  const tokenUrl = `${cognitoDomain}/oauth2/token`;
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    client_id: clientId,
    code: code,
    redirect_uri: redirectUri,
  });

  try {
    const response = await fetch(tokenUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
    });

    if (!response.ok) throw new Error("Token request failed");

    const tokens = await response.json();
    localStorage.setItem("id_token", tokens.id_token);
    localStorage.setItem("access_token", tokens.access_token);

    // Redirect to upload.html without ?code=
    window.location.href = redirectUri;
  } catch (error) {
    console.error("Error exchanging code for token:", error);
  }
}

// Update login/logout buttons & welcome text
function updateUI() {
  const token = localStorage.getItem("access_token");
  const loginBtn = document.getElementById("loginBtn");
  const logoutBtn = document.getElementById("logoutBtn");
  const welcomeEl = document.getElementById("welcomeUser");

  if (token) {
    loginBtn?.style && (loginBtn.style.display = "none");
    logoutBtn?.style && (logoutBtn.style.display = "inline-block");

    if (welcomeEl) {
      const user = decodeToken(token);
      welcomeEl.textContent = `Welcome, ${user?.email || "user"}!`;
    }
  } else {
    loginBtn?.style && (loginBtn.style.display = "inline-block");
    logoutBtn?.style && (logoutBtn.style.display = "none");

    if (window.location.pathname.includes("upload.html") && !code) {
      window.location.href = "index.html"; // Redirect to homepage if unauthenticated
    }
  }
}

// Upload image to your S3 bucket directly (assumes public bucket and correct CORS)
async function uploadImage() {
  const fileInput = document.getElementById("uploadFile");
  const file = fileInput.files[0];

  if (!file) return alert("Please choose a file.");

  const fileName = encodeURIComponent(file.name);

  // 1. Get presigned upload URL
  const res = await fetch(
    `https://qm4m50t397.execute-api.eu-west-1.amazonaws.com/prod/getUploadedUrl?filename=${fileName}`
  );
  const data = await res.json();
  const uploadUrl = data.uploadUrl;

  // 2. Upload file directly to S3
  const upload = await fetch(uploadUrl, {
    method: "PUT",
    headers: {
      "Content-Type": "image/jpeg",
    },
    body: file,
  });

  if (upload.ok) {
    setTimeout(() => {
      displayImages(); // Refresh the image gallery
    }, 2000); // Adjust delay if needed
    alert("Upload successful!");
  } else {
    alert("Upload failed.");
  }
}

// Fetch and show thumbnails
// Asynchronous function to Fetch thumbnail URLs from the Lambda-backed API
async function displayImages() {
  // Get the gallery container element
  const gallery = document.getElementById("gallery");
  gallery.innerHTML = ""; // Clear gallery

  try {
    // Make a GET request to the API Gateway endpoint to fetch thumbnail image URLs
    const response = await fetch(
      "https://qm4m50t397.execute-api.eu-west-1.amazonaws.com/prod/getThumbnailImages"
    );

    // If the response is not OK (i.e., not status 200), throw an error
    if (!response.ok) {
      throw new Error("Failed to fetch images.");
    }

    // Parse the JSON response body to get the list of image URLs
    const imageUrls = await response.json();

    // If there are no images, display a placeholder message
    if (imageUrls.length === 0) {
      gallery.innerHTML = "<p>No images yet.</p>";
      return;
    }

    // Loop through the image URLs and create image elements for each
    imageUrls.forEach((url) => {
      const img = document.createElement("img");
      img.src = url;
      img.alt = "Thumbnail";
      img.width = 150;
      img.height = 150;
      img.style.margin = "10px";
      img.style.borderRadius = "8px";
      img.style.boxShadow = "0 4px 8px rgba(0, 0, 0, 0.1)";
      gallery.appendChild(img); // Append the image to the gallery
    });
  } catch (error) {
    // Log and display an error message if the fetch fails
    console.error("Error fetching images:", error);
    gallery.innerHTML = "<p>Error loading images.</p>";
  }
}

//  logic to check login before navigating
document.addEventListener("DOMContentLoaded", () => {
  const uploadLink = document.getElementById("uploadLink");

  if (uploadLink) {
    uploadLink.addEventListener("click", (e) => {
      const token = localStorage.getItem("access_token");
      if (!token) {
        e.preventDefault(); // Stop link from navigating
        alert("You must be logged in to access the upload page.");
      }
    });
  }
});


// Run on every page load
window.onload = async () => {
  await handleLoginRedirect(); // Wait for login token exchange
  updateUI();
  if (window.location.pathname.includes("upload.html")) {
    displayImages();
  }
};
