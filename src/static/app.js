document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const messageDiv = document.getElementById("message");
  
  // Authentication elements
  const userIcon = document.getElementById("user-icon");
  const loginArea = document.getElementById("login-area");
  const userArea = document.getElementById("user-area");
  const userInfo = document.getElementById("user-info");
  const loginBtn = document.getElementById("login-btn");
  const cancelLoginBtn = document.getElementById("cancel-login-btn");
  const teacherEmail = document.getElementById("teacher-email");
  const teacherPassword = document.getElementById("teacher-password");
  
  // Authentication state
  let currentTeacher = null;
  let authToken = localStorage.getItem("auth_token");

  // Authentication functions
  async function checkAuthStatus() {
    if (authToken) {
      try {
        const response = await fetch("/auth/me", {
          headers: {
            "Authorization": `Bearer ${authToken}`
          }
        });
        
        if (response.ok) {
          currentTeacher = await response.json();
          updateAuthUI();
        } else {
          // Token invalid, clear it
          localStorage.removeItem("auth_token");
          authToken = null;
          currentTeacher = null;
          updateAuthUI();
        }
      } catch (error) {
        console.error("Auth check failed:", error);
        localStorage.removeItem("auth_token");
        authToken = null;
        currentTeacher = null;
        updateAuthUI();
      }
    }
  }
  
  function updateAuthUI() {
    if (currentTeacher) {
      userInfo.textContent = `Welcome, ${currentTeacher.name}`;
      userInfo.classList.remove("hidden");
      userIcon.textContent = "🔓";
      userIcon.onclick = logout;
    } else {
      userInfo.classList.add("hidden");
      userIcon.textContent = "👤";
      userIcon.onclick = showLoginForm;
    }
  }
  
  function showLoginForm() {
    loginArea.classList.remove("hidden");
    teacherEmail.focus();
  }
  
  function hideLoginForm() {
    loginArea.classList.add("hidden");
    teacherEmail.value = "";
    teacherPassword.value = "";
  }
  
  async function login() {
    const email = teacherEmail.value;
    const password = teacherPassword.value;
    
    if (!email || !password) {
      alert("Please enter both email and password");
      return;
    }
    
    try {
      const response = await fetch("/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: `email=${encodeURIComponent(email)}&password=${encodeURIComponent(password)}`
      });
      
      const result = await response.json();
      
      if (response.ok) {
        authToken = result.access_token;
        currentTeacher = result.teacher;
        localStorage.setItem("auth_token", authToken);
        updateAuthUI();
        hideLoginForm();
        fetchActivities(); // Refresh to show delete buttons
      } else {
        alert(result.detail || "Login failed");
      }
    } catch (error) {
      console.error("Login error:", error);
      alert("Login failed. Please try again.");
    }
  }
  
  function logout() {
    authToken = null;
    currentTeacher = null;
    localStorage.removeItem("auth_token");
    updateAuthUI();
    fetchActivities(); // Refresh to hide delete buttons
  }

  // Function to fetch activities from API
  async function fetchActivities() {
    try {
      const response = await fetch("/activities");
      const activities = await response.json();

      // Clear loading message
      activitiesList.innerHTML = "";

      // Populate activities list
      Object.entries(activities).forEach(([name, details]) => {
        const activityCard = document.createElement("div");
        activityCard.className = "activity-card";

        const spotsLeft =
          details.max_participants - details.participants.length;

        // Create participants HTML with delete icons for teachers only
        const participantsHTML =
          details.participants.length > 0
            ? `<div class="participants-section">
              <h5>Participants:</h5>
              <ul class="participants-list">
                ${details.participants
                  .map(
                    (email) =>
                      `<li><span class="participant-email">${email}</span>${
                        currentTeacher ? `<button class="delete-btn" data-activity="${name}" data-email="${email}">❌</button>` : ''
                      }</li>`
                  )
                  .join("")}
              </ul>
            </div>`
            : `<p><em>No participants yet</em></p>`;

        activityCard.innerHTML = `
          <h4>${name}</h4>
          <p>${details.description}</p>
          <p><strong>Schedule:</strong> ${details.schedule}</p>
          <p><strong>Availability:</strong> ${spotsLeft} spots left</p>
          <div class="participants-container">
            ${participantsHTML}
          </div>
        `;

        activitiesList.appendChild(activityCard);

        // Add option to select dropdown
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        activitySelect.appendChild(option);
      });

      // Add event listeners to delete buttons
      document.querySelectorAll(".delete-btn").forEach((button) => {
        button.addEventListener("click", handleUnregister);
      });
    } catch (error) {
      activitiesList.innerHTML =
        "<p>Failed to load activities. Please try again later.</p>";
      console.error("Error fetching activities:", error);
    }
  }

  // Handle unregister functionality
  async function handleUnregister(event) {
    const button = event.target;
    const activity = button.getAttribute("data-activity");
    const email = button.getAttribute("data-email");

    if (!currentTeacher) {
      alert("Only teachers can remove students from activities");
      return;
    }

    if (!confirm(`Remove ${email} from ${activity}?`)) {
      return;
    }

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(
          activity
        )}/unregister?email=${encodeURIComponent(email)}`,
        {
          method: "DELETE",
          headers: {
            "Authorization": `Bearer ${authToken}`
          }
        }
      );

      const result = await response.json();

      if (response.ok) {
        messageDiv.textContent = result.message;
        messageDiv.className = "success";

        // Refresh activities list to show updated participants
        fetchActivities();
      } else {
        messageDiv.textContent = result.detail || "An error occurred";
        messageDiv.className = "error";
      }

      messageDiv.classList.remove("hidden");

      // Hide message after 5 seconds
      setTimeout(() => {
        messageDiv.classList.add("hidden");
      }, 5000);
    } catch (error) {
      messageDiv.textContent = "Failed to unregister. Please try again.";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
      console.error("Error unregistering:", error);
    }
  }

  // Handle form submission
  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("email").value;
    const activity = document.getElementById("activity").value;

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(
          activity
        )}/signup?email=${encodeURIComponent(email)}`,
        {
          method: "POST",
        }
      );

      const result = await response.json();

      if (response.ok) {
        messageDiv.textContent = result.message;
        messageDiv.className = "success";
        signupForm.reset();

        // Refresh activities list to show updated participants
        fetchActivities();
      } else {
        messageDiv.textContent = result.detail || "An error occurred";
        messageDiv.className = "error";
      }

      messageDiv.classList.remove("hidden");

      // Hide message after 5 seconds
      setTimeout(() => {
        messageDiv.classList.add("hidden");
      }, 5000);
    } catch (error) {
      messageDiv.textContent = "Failed to sign up. Please try again.";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
      console.error("Error signing up:", error);
    }
  });

  // Authentication event listeners
  loginBtn.addEventListener("click", login);
  cancelLoginBtn.addEventListener("click", hideLoginForm);
  
  // Allow Enter key to submit login
  teacherPassword.addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
      login();
    }
  });

  // Initialize app
  checkAuthStatus();
  fetchActivities();
});
