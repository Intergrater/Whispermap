// WhisperMap Authentication Module
const WhisperAuth = (function() {
    // Private variables
    let currentUser = null;
    const AUTH_TOKEN_KEY = 'whispermap_auth_token';
    const USER_DATA_KEY = 'whispermap_user_data';
    
    // Server URL (same as in app.js)
    const SERVER_URL = (() => {
        const currentUrl = window.location.href;
        if (currentUrl.includes('ngrok') || !currentUrl.includes('localhost')) {
            const urlObj = new URL(currentUrl);
            return `${urlObj.protocol}//${urlObj.host}`;
        }
        return 'http://localhost:9000';
    })();

    // Initialize auth state
    function init() {
        console.log('Initializing auth module');
        
        const token = localStorage.getItem(AUTH_TOKEN_KEY);
        const userData = localStorage.getItem(USER_DATA_KEY);
        
        if (token && userData) {
            try {
                currentUser = JSON.parse(userData);
                updateUIForAuthenticatedUser();
                console.log('User authenticated:', currentUser.name);
            } catch (e) {
                console.error('Error parsing user data:', e);
                logout();
            }
        } else {
            console.log('No authenticated user found');
        }
        
        // Set up event listeners
        setupEventListeners();
    }
    
    // Update UI for authenticated user
    function updateUIForAuthenticatedUser() {
        if (!currentUser) return;
        
        const authButtons = document.getElementById('auth-buttons');
        const userInfo = document.getElementById('user-info');
        const userNameDisplay = document.getElementById('user-name');
        const userAvatarImg = document.getElementById('user-avatar-img');
        const premiumBadge = document.getElementById('premium-badge');
        
        if (userNameDisplay) userNameDisplay.textContent = currentUser.name;
        
        // Set avatar based on user preferences
        if (userAvatarImg) {
            if (currentUser.avatar) {
                // If user has a custom uploaded avatar
                userAvatarImg.src = currentUser.avatar;
            } else if (currentUser.avatarStyle) {
                // If user has selected an avatar style
                userAvatarImg.src = `public/images/avatar-${currentUser.avatarStyle}.png`;
            } else {
                // Default avatar
                userAvatarImg.src = 'public/images/default-avatar.png';
            }
        }
        
        if (premiumBadge) {
            if (currentUser.isPremium) {
                premiumBadge.classList.remove('hidden');
            } else {
                premiumBadge.classList.add('hidden');
            }
        }
        
        if (userInfo) {
            userInfo.classList.remove('hidden');
            // Add click event to open profile modal
            userInfo.addEventListener('click', openProfileModal);
        }
        
        if (authButtons) authButtons.classList.add('hidden');
        
        // Enable premium features if user is premium
        if (currentUser.isPremium) {
            document.querySelectorAll('.premium-only').forEach(el => {
                el.classList.remove('disabled');
            });
            
            // Hide ads for premium users
            const adBanner = document.getElementById('ad-banner');
            if (adBanner) adBanner.classList.add('hidden');
        }
        
        // Show social features for logged in users
        document.querySelectorAll('.social-feature').forEach(el => {
            el.classList.remove('hidden');
        });
        
        // Apply user theme if set
        if (currentUser.theme && window.applyUserTheme) {
            window.applyUserTheme(currentUser.theme);
        }
        
        // Update profile modal with user data
        updateProfileModal();
    }
    
    // Open profile modal
    function openProfileModal() {
        console.log('Opening profile modal');
        const profileModal = document.getElementById('profile-modal');
        if (profileModal) {
            // Update profile data before showing
            updateProfileModal();
            profileModal.style.display = 'flex';
            document.body.classList.add('modal-open');
        }
    }
    
    // Update profile modal with current user data
    function updateProfileModal() {
        if (!currentUser) return;
        
        const profileName = document.getElementById('profile-name');
        const profileAvatarImg = document.getElementById('profile-avatar-img');
        const whispersCount = document.querySelector('.whispers-count');
        const followingCount = document.querySelector('.following-count');
        const followersCount = document.querySelector('.followers-count');
        const editProfileBtn = document.getElementById('edit-profile-btn');
        
        if (profileName) profileName.textContent = currentUser.name;
        if (profileAvatarImg) profileAvatarImg.src = currentUser.avatar || 'public/images/default-avatar.png';
        
        // Set counts (these would come from the server in a real app)
        if (whispersCount) whispersCount.textContent = currentUser.whispers || 0;
        if (followingCount) followingCount.textContent = currentUser.following || 0;
        if (followersCount) followersCount.textContent = currentUser.followers || 0;
        
        // Set up edit profile button
        if (editProfileBtn) {
            editProfileBtn.addEventListener('click', openEditProfileModal);
        }
    }
    
    // Open edit profile modal
    function openEditProfileModal() {
        console.log('Opening edit profile modal');
        const editProfileModal = document.getElementById('edit-profile-modal');
        if (editProfileModal) {
            // Pre-fill form with current user data
            const nameInput = document.getElementById('edit-profile-name');
            const bioInput = document.getElementById('edit-profile-bio');
            const currentAvatarImg = document.getElementById('current-avatar-img');
            
            if (nameInput) nameInput.value = currentUser.name || '';
            if (bioInput) bioInput.value = currentUser.bio || '';
            if (currentAvatarImg) currentAvatarImg.src = currentUser.avatar || 'public/images/default-avatar.png';
            
            editProfileModal.style.display = 'flex';
            document.body.classList.add('modal-open');
        }
    }
    
    // Handle profile update
    function handleProfileUpdate(e) {
        e.preventDefault();
        console.log('Updating profile');
        
        const nameInput = document.getElementById('edit-profile-name');
        const bioInput = document.getElementById('edit-profile-bio');
        const avatarInput = document.getElementById('avatar-upload');
        const themeSelect = document.getElementById('profile-theme');
        
        // Update user object
        if (nameInput) currentUser.name = nameInput.value;
        if (bioInput) currentUser.bio = bioInput.value;
        if (themeSelect) currentUser.theme = themeSelect.value;
        
        // Get selected avatar style
        const selectedStyle = document.querySelector('.avatar-style-option.selected');
        if (selectedStyle) {
            currentUser.avatarStyle = selectedStyle.getAttribute('data-style');
        }
        
        // Handle avatar upload (in a real app, this would upload to a server)
        if (avatarInput && avatarInput.files && avatarInput.files[0]) {
            const reader = new FileReader();
            reader.onload = function(e) {
                currentUser.avatar = e.target.result;
                
                // Update UI with new avatar
                const userAvatarImg = document.getElementById('user-avatar-img');
                const profileAvatarImg = document.getElementById('profile-avatar-img');
                const currentAvatarImg = document.getElementById('current-avatar-img');
                
                if (userAvatarImg) userAvatarImg.src = currentUser.avatar;
                if (profileAvatarImg) profileAvatarImg.src = currentUser.avatar;
                if (currentAvatarImg) currentAvatarImg.src = currentUser.avatar;
            };
            reader.readAsDataURL(avatarInput.files[0]);
        } else if (currentUser.avatarStyle) {
            // Update avatar based on selected style
            const avatarSrc = `public/images/avatar-${currentUser.avatarStyle}.png`;
            
            const userAvatarImg = document.getElementById('user-avatar-img');
            const profileAvatarImg = document.getElementById('profile-avatar-img');
            
            if (userAvatarImg) userAvatarImg.src = avatarSrc;
            if (profileAvatarImg) profileAvatarImg.src = avatarSrc;
            
            // Clear custom avatar if using a style
            currentUser.avatar = null;
        }
        
        // Apply theme if changed
        if (currentUser.theme && window.applyUserTheme) {
            window.applyUserTheme(currentUser.theme);
        }
        
        // Save updated user data
        localStorage.setItem(USER_DATA_KEY, JSON.stringify(currentUser));
        
        // Update UI
        updateUIForAuthenticatedUser();
        
        // Close modal
        const editProfileModal = document.getElementById('edit-profile-modal');
        if (editProfileModal) {
            editProfileModal.style.display = 'none';
        }
        
        // Show notification
        if (window.showNotification) {
            window.showNotification('Profile updated successfully!', 'success');
        }
    }
    
    // Logout function
    function logout() {
        console.log('Logging out user');
        localStorage.removeItem(AUTH_TOKEN_KEY);
        localStorage.removeItem(USER_DATA_KEY);
        currentUser = null;
        
        const authButtons = document.getElementById('auth-buttons');
        const userInfo = document.getElementById('user-info');
        
        if (authButtons) authButtons.classList.remove('hidden');
        if (userInfo) userInfo.classList.add('hidden');
        
        // Hide premium elements
        document.querySelectorAll('.social-feature').forEach(el => {
            el.classList.add('hidden');
        });
        
        // Show notification if function exists
        if (window.showNotification) {
            window.showNotification('You have been logged out', 'info');
        }
        
        // Refresh whispers if function exists
        if (window.loadNearbyWhispers) {
            window.loadNearbyWhispers();
        }
    }
    
    // Set up event listeners
    function setupEventListeners() {
        // DOM Elements
        const loginBtn = document.querySelector('.login-btn');
        const signupBtn = document.querySelector('.signup-btn');
        const authModal = document.getElementById('auth-modal');
        const closeAuthBtn = document.querySelector('.close-auth');
        const authTabs = document.querySelectorAll('.auth-tab');
        const loginForm = document.getElementById('login-form');
        const signupForm = document.getElementById('signup-form');
        const switchToSignup = document.getElementById('switch-to-signup');
        const switchToLogin = document.getElementById('switch-to-login');
        const logoutBtn = document.getElementById('logout-btn');
        
        // Event Listeners
        if (loginBtn) loginBtn.addEventListener('click', openAuthModal);
        if (signupBtn) signupBtn.addEventListener('click', () => {
            openAuthModal();
            switchTab('signup');
        });
        
        if (closeAuthBtn) closeAuthBtn.addEventListener('click', closeAuthModal);
        
        // Tab switching
        if (authTabs) {
            authTabs.forEach(tab => {
                tab.addEventListener('click', () => {
                    const tabName = tab.getAttribute('data-tab');
                    switchTab(tabName);
                });
            });
        }
        
        // Form switching links
        if (switchToSignup) switchToSignup.addEventListener('click', (e) => {
            e.preventDefault();
            switchTab('signup');
        });
        
        if (switchToLogin) switchToLogin.addEventListener('click', (e) => {
            e.preventDefault();
            switchTab('login');
        });
        
        // Form submissions
        if (loginForm) loginForm.addEventListener('submit', handleLogin);
        if (signupForm) signupForm.addEventListener('submit', handleSignup);
        
        // Logout
        if (logoutBtn) logoutBtn.addEventListener('click', logout);
        
        // Profile modal close button
        const closeProfileBtn = document.querySelector('#profile-modal .close-modal');
        if (closeProfileBtn) {
            closeProfileBtn.addEventListener('click', () => {
                const profileModal = document.getElementById('profile-modal');
                if (profileModal) {
                    profileModal.style.display = 'none';
                    document.body.classList.remove('modal-open');
                }
            });
        }
        
        // Edit profile modal close button
        const closeEditProfileBtn = document.querySelector('#edit-profile-modal .close-modal');
        if (closeEditProfileBtn) {
            closeEditProfileBtn.addEventListener('click', () => {
                const editProfileModal = document.getElementById('edit-profile-modal');
                if (editProfileModal) {
                    editProfileModal.style.display = 'none';
                    document.body.classList.remove('modal-open');
                }
            });
        }
        
        // Edit profile form submission
        const editProfileForm = document.getElementById('edit-profile-form');
        if (editProfileForm) {
            editProfileForm.addEventListener('submit', handleProfileUpdate);
        }
        
        // Avatar preview
        const avatarInput = document.getElementById('avatar-upload');
        if (avatarInput) {
            avatarInput.addEventListener('change', function() {
                if (this.files && this.files[0]) {
                    const reader = new FileReader();
                    reader.onload = function(e) {
                        const currentAvatarImg = document.getElementById('current-avatar-img');
                        if (currentAvatarImg) {
                            currentAvatarImg.src = e.target.result;
                        }
                    };
                    reader.readAsDataURL(this.files[0]);
                }
            });
        }
    }
    
    // Open auth modal
    function openAuthModal() {
        console.log('Opening auth modal');
        const authModal = document.getElementById('auth-modal');
        if (authModal) {
            authModal.style.display = 'flex';
            document.body.classList.add('modal-open');
        }
    }
    
    // Close auth modal
    function closeAuthModal() {
        console.log('Closing auth modal');
        const authModal = document.getElementById('auth-modal');
        const loginForm = document.getElementById('login-form');
        const signupForm = document.getElementById('signup-form');
        
        if (authModal) {
            authModal.style.display = 'none';
            document.body.classList.remove('modal-open');
        }
        
        // Clear forms
        if (loginForm) loginForm.reset();
        if (signupForm) signupForm.reset();
        
        // Hide error messages
        const errorElements = document.querySelectorAll('#auth-error, #signup-error');
        errorElements.forEach(el => {
            if (el) el.style.display = 'none';
        });
    }
    
    // Switch between login and signup tabs
    function switchTab(tabName) {
        console.log('Switching to tab:', tabName);
        const authTabs = document.querySelectorAll('.auth-tab');
        const loginForm = document.getElementById('login-form');
        const signupForm = document.getElementById('signup-form');
        
        // Update tab active state
        authTabs.forEach(tab => {
            if (tab.getAttribute('data-tab') === tabName) {
                tab.classList.add('active');
            } else {
                tab.classList.remove('active');
            }
        });
        
        // Show the correct form
        if (tabName === 'login') {
            if (loginForm) loginForm.classList.add('active');
            if (signupForm) signupForm.classList.remove('active');
        } else {
            if (loginForm) loginForm.classList.remove('active');
            if (signupForm) signupForm.classList.add('active');
        }
    }
    
    // Handle login form submission
    async function handleLogin(e) {
        e.preventDefault();
        console.log('Login form submitted');
        
        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;
        const errorElement = document.getElementById('auth-error');
        const loginBtnText = document.querySelector('#login-btn .btn-text');
        const loginSpinner = document.querySelector('#login-btn .spinner');
        
        // Simple validation
        if (!email || !password) {
            if (errorElement) {
                errorElement.textContent = 'Please enter both email and password';
                errorElement.style.display = 'block';
            }
            return;
        }
        
        // Show loading state
        if (loginBtnText) loginBtnText.style.display = 'none';
        if (loginSpinner) loginSpinner.style.display = 'block';
        
        try {
            // For demo purposes, we'll simulate a successful login
            // In a real app, you would make an API call to your server
            
            // Simulate API call delay
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // Create a mock user object
            const user = {
                id: 'user_' + Math.random().toString(36).substr(2, 9),
                name: email.split('@')[0],
                email: email,
                avatar: 'public/images/default-avatar.png',
                isPremium: false
            };
            
            // Save auth data
            localStorage.setItem(AUTH_TOKEN_KEY, 'mock_token_' + user.id);
            localStorage.setItem(USER_DATA_KEY, JSON.stringify(user));
            currentUser = user;
            
            // Update UI
            updateUIForAuthenticatedUser();
            
            // Close modal
            closeAuthModal();
            
            // Show success notification
            if (window.showNotification) {
                window.showNotification('Login successful!', 'success');
            }
            
            // Refresh whispers if needed
            if (window.loadNearbyWhispers) {
                window.loadNearbyWhispers();
            }
            
        } catch (error) {
            console.error('Login error:', error);
            if (errorElement) {
                errorElement.textContent = 'Login failed. Please check your credentials.';
                errorElement.style.display = 'block';
            }
        } finally {
            // Reset loading state
            if (loginBtnText) loginBtnText.style.display = 'block';
            if (loginSpinner) loginSpinner.style.display = 'none';
        }
    }
    
    // Handle signup form submission
    async function handleSignup(e) {
        e.preventDefault();
        console.log('Signup form submitted');
        
        const name = document.getElementById('signup-name').value;
        const email = document.getElementById('signup-email').value;
        const password = document.getElementById('signup-password').value;
        const confirmPassword = document.getElementById('signup-confirm').value;
        const errorElement = document.getElementById('signup-error');
        const signupBtnText = document.querySelector('#signup-btn .btn-text');
        const signupSpinner = document.querySelector('#signup-btn .spinner');
        
        // Simple validation
        if (!name || !email || !password || !confirmPassword) {
            if (errorElement) {
                errorElement.textContent = 'Please fill in all fields';
                errorElement.style.display = 'block';
            }
            return;
        }
        
        if (password !== confirmPassword) {
            if (errorElement) {
                errorElement.textContent = 'Passwords do not match';
                errorElement.style.display = 'block';
            }
            return;
        }
        
        // Show loading state
        if (signupBtnText) signupBtnText.style.display = 'none';
        if (signupSpinner) signupSpinner.style.display = 'block';
        
        try {
            // For demo purposes, we'll simulate a successful signup
            // In a real app, you would make an API call to your server
            
            // Simulate API call delay
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // Create a mock user object
            const user = {
                id: 'user_' + Math.random().toString(36).substr(2, 9),
                name: name,
                email: email,
                avatar: 'public/images/default-avatar.png',
                isPremium: false
            };
            
            // Save auth data
            localStorage.setItem(AUTH_TOKEN_KEY, 'mock_token_' + user.id);
            localStorage.setItem(USER_DATA_KEY, JSON.stringify(user));
            currentUser = user;
            
            // Update UI
            updateUIForAuthenticatedUser();
            
            // Close modal
            closeAuthModal();
            
            // Show success notification
            if (window.showNotification) {
                window.showNotification('Account created successfully!', 'success');
            }
            
            // Refresh whispers if needed
            if (window.loadNearbyWhispers) {
                window.loadNearbyWhispers();
            }
            
        } catch (error) {
            console.error('Signup error:', error);
            if (errorElement) {
                errorElement.textContent = 'Signup failed. Please try again.';
                errorElement.style.display = 'block';
            }
        } finally {
            // Reset loading state
            if (signupBtnText) signupBtnText.style.display = 'block';
            if (signupSpinner) signupSpinner.style.display = 'none';
        }
    }
    
    // Public API
    return {
        init: init,
        logout: logout,
        openAuthModal: openAuthModal,
        closeAuthModal: closeAuthModal,
        isLoggedIn: () => !!currentUser,
        getCurrentUser: () => currentUser
    };
})();

// Initialize auth module when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    WhisperAuth.init();
    
    // Expose auth module to window for use in other modules
    window.authModule = WhisperAuth;
    
    // Dispatch event to notify that auth module is loaded
    document.dispatchEvent(new Event('auth-module-loaded'));
}); 