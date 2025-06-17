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

  // Extract user email from token
  const token = localStorage.getItem("access_token");
  const user = decodeToken(token);
  const email = user?.email || "unknown";

  // Get presigned upload URL
  const res = await fetch(
    `https://qm4m50t397.execute-api.eu-west-1.amazonaws.com/prod/getUploadedUrl?filename=${fileName}`
  );
  const data = await res.json();
  const uploadUrl = data.uploadUrl;

  // Upload file directly to S3
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

// Asynchronously fetches and displays thumbnail images in the gallery.
// If `expectedImage` is provided, it retries fetching until that image is found or max retries are reached.
async function displayImages(
  expectedImage = null,
  maxRetries = 10,
  delay = 3000
) {
  const gallery = document.getElementById("gallery");

  // Helper function that fetches the list of image URLs and renders them in the gallery
  async function fetchAndRender() {
    gallery.innerHTML = ""; // Clear gallery

    try {
      // Fetch image URLs from the API Gateway endpoint
      const response = await fetch(
        "https://qm4m50t397.execute-api.eu-west-1.amazonaws.com/prod/getThumbnailImages"
      );
      
      // Throw an error if the request fails
      if (!response.ok) {
        throw new Error("Failed to fetch images.");
      }

      const imageUrls = await response.json();  // Parse JSON response
      
      // Display a placeholder if no images are returned
      if (imageUrls.length === 0) {
        gallery.innerHTML = "<p>No images yet.</p>";
        return false;
      }

      let found = false; // Flag to indicate if the expected image is found

      // Loop through each image URL and create corresponding <img> elements
      imageUrls.forEach((url) => {
        const img = document.createElement("img");
        img.src = url;
        img.alt = "Thumbnail";
        img.width = 150;
        img.height = 150;
        img.style.margin = "10px";
        img.style.borderRadius = "8px";
        img.style.boxShadow = "0 4px 8px rgba(0, 0, 0, 0.1)";
        gallery.appendChild(img); // Add image to the gallery

        // Check if the expected image (e.g., just uploaded) is in the results
        if (expectedImage && url.includes(expectedImage)) {
          found = true;
        }
      });

      // Return true if no specific image is expected or if the expected image was found
      return !expectedImage || found;
    } catch (error) {
      console.error("Error fetching images:", error);
      gallery.innerHTML = "<p>Error loading images.</p>";
      return false; // Indicate failure to load images

    }
  }
  
  // Retry loop: attempts fetching and rendering up to `maxRetries` times with `delay` ms between tries
  let attempt = 0;
  while (attempt < maxRetries) {
    const success = await fetchAndRender();
    if (success) return; // Exit early if successful
    attempt++;
    await new Promise((r) => setTimeout(r, delay)); // Wait before retrying
  }

  alert("Thumbnail not available yet. Please try again later.");
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
