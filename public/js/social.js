/**
 * WhisperMap Social Features Module
 * Handles social interactions like comments, likes, sharing, and user connections
 */

document.addEventListener('DOMContentLoaded', () => {
    // Initialize social features when auth is ready
    if (window.checkAuthStatus) {
        checkAuthStatus().then(initSocialFeatures);
    } else {
        document.addEventListener('auth-ready', initSocialFeatures);
    }
    
    // Dispatch event to signal social module is loaded
    document.dispatchEvent(new CustomEvent('social-module-loaded'));

    // DOM Elements for social features
    const commentForms = document.querySelectorAll('.comment-form');
    const likeButtons = document.querySelectorAll('.like-button');
    const shareButtons = document.querySelectorAll('.share-button');
    const followButtons = document.querySelectorAll('.follow-button');
    
    // Create global socialFeatures object for external access
    window.socialFeatures = {
        init: initSocialFeatures,
        showAuthModal: showAuthModal,
        initWhispers: function() {
            // Initialize social features for newly loaded whispers
            const newCommentForms = document.querySelectorAll('.comment-form');
            const newLikeButtons = document.querySelectorAll('.like-button');
            const newShareButtons = document.querySelectorAll('.share-button');
            
            newCommentForms.forEach(form => {
                if (!form.hasEventListener) {
                    form.addEventListener('submit', handleCommentSubmit);
                    form.hasEventListener = true;
                }
            });
            
            newLikeButtons.forEach(button => {
                if (!button.hasEventListener) {
                    button.addEventListener('click', handleLikeToggle);
                    button.hasEventListener = true;
                }
            });
            
            newShareButtons.forEach(button => {
                if (!button.hasEventListener) {
                    button.addEventListener('click', handleShare);
                    button.hasEventListener = true;
                }
            });
            
            // Update UI based on user state
            updateSocialUI();
        }
    };
    
    /**
     * Initialize social features
     */
    function initSocialFeatures() {
        setupEventListeners();
        loadUserConnections();
        updateSocialUI();
    }

    /**
     * Set up event listeners for social interactions
     */
    function setupEventListeners() {
        // Comment form submissions
        commentForms.forEach(form => {
            form.addEventListener('submit', handleCommentSubmit);
        });

        // Like button clicks
        likeButtons.forEach(button => {
            button.addEventListener('click', handleLikeToggle);
        });

        // Share button clicks
        shareButtons.forEach(button => {
            button.addEventListener('click', handleShare);
        });

        // Follow button clicks
        followButtons.forEach(button => {
            button.addEventListener('click', handleFollowToggle);
        });

        // Add event delegation for dynamically added whispers
        document.addEventListener('whisper-added', (event) => {
            const whisperElement = event.detail.element;
            if (whisperElement) {
                const commentForm = whisperElement.querySelector('.comment-form');
                const likeButton = whisperElement.querySelector('.like-button');
                const shareButton = whisperElement.querySelector('.share-button');
                
                if (commentForm) commentForm.addEventListener('submit', handleCommentSubmit);
                if (likeButton) likeButton.addEventListener('click', handleLikeToggle);
                if (shareButton) shareButton.addEventListener('click', handleShare);
            }
        });
    }

    /**
     * Handle comment form submission
     * @param {Event} event - The submit event
     */
    function handleCommentSubmit(event) {
        event.preventDefault();
        
        // Check if user is logged in
        if (!isUserLoggedIn()) {
            showAuthModal('login');
            return;
        }
        
        const form = event.target;
        const whisperId = form.dataset.whisperId;
        const commentInput = form.querySelector('.comment-input');
        const comment = commentInput.value.trim();
        
        if (!comment) return;
        
        // Simulate sending comment to server
        simulateAddComment(whisperId, comment)
            .then(response => {
                // Clear input field
                commentInput.value = '';
                
                // Add comment to UI
                addCommentToUI(whisperId, response.comment);
                
                // Show success notification
                showNotification('Comment added successfully', 'success');
            })
            .catch(error => {
                showNotification('Failed to add comment: ' + error.message, 'error');
            });
    }

    /**
     * Handle like button toggle
     * @param {Event} event - The click event
     */
    function handleLikeToggle(event) {
        // Check if user is logged in
        if (!isUserLoggedIn()) {
            showAuthModal('login');
            return;
        }
        
        const button = event.currentTarget;
        const whisperId = button.dataset.whisperId;
        const isLiked = button.classList.contains('liked');
        
        // Simulate like/unlike request
        simulateLikeToggle(whisperId, !isLiked)
            .then(response => {
                // Update UI
                updateLikeUI(button, response.liked, response.likeCount);
                
                // Show notification
                const message = response.liked ? 'Whisper liked!' : 'Whisper unliked';
                showNotification(message, 'info');
            })
            .catch(error => {
                showNotification('Failed to update like: ' + error.message, 'error');
            });
    }

    /**
     * Handle share button click
     * @param {Event} event - The click event
     */
    function handleShare(event) {
        const button = event.currentTarget;
        const whisperId = button.dataset.whisperId;
        const whisperLocation = button.dataset.location || 'Unknown location';
        
        // Create share data
        const shareData = {
            title: 'Check out this whisper on WhisperMap!',
            text: `I found an interesting audio message at ${whisperLocation}`,
            url: `${window.location.origin}?whisper=${whisperId}`
        };
        
        // Use Web Share API if available
        if (navigator.share) {
            navigator.share(shareData)
                .then(() => {
                    showNotification('Shared successfully!', 'success');
                    incrementShareCount(whisperId);
                })
                .catch(error => {
                    if (error.name !== 'AbortError') {
                        showNotification('Error sharing: ' + error.message, 'error');
                    }
                });
        } else {
            // Fallback to copy link
            copyToClipboard(shareData.url)
                .then(() => {
                    showNotification('Link copied to clipboard!', 'success');
                    incrementShareCount(whisperId);
                })
                .catch(error => {
                    showNotification('Failed to copy link: ' + error.message, 'error');
                });
        }
    }

    /**
     * Handle follow button toggle
     * @param {Event} event - The click event
     */
    function handleFollowToggle(event) {
        // Check if user is logged in
        if (!isUserLoggedIn()) {
            showAuthModal('login');
            return;
        }
        
        const button = event.currentTarget;
        const userId = button.dataset.userId;
        const isFollowing = button.classList.contains('following');
        
        // Simulate follow/unfollow request
        simulateFollowToggle(userId, !isFollowing)
            .then(response => {
                // Update UI
                updateFollowUI(button, response.following);
                
                // Show notification
                const message = response.following ? 
                    'You are now following this user!' : 
                    'You have unfollowed this user';
                showNotification(message, 'info');
            })
            .catch(error => {
                showNotification('Failed to update follow status: ' + error.message, 'error');
            });
    }

    /**
     * Load user connections from local storage or server
     */
    function loadUserConnections() {
        // Check if user is logged in
        if (!isUserLoggedIn()) return;
        
        const currentUser = getCurrentUser();
        
        // Simulate loading connections from server
        simulateLoadConnections(currentUser.id)
            .then(connections => {
                // Store connections in memory
                window.userConnections = connections;
                
                // Update UI based on connections
                updateConnectionsUI(connections);
            })
            .catch(error => {
                console.error('Failed to load connections:', error);
            });
    }

    /**
     * Update social UI elements based on user state
     */
    function updateSocialUI() {
        const isLoggedIn = isUserLoggedIn();
        
        // Show/hide social features based on login status
        document.querySelectorAll('.social-feature').forEach(element => {
            if (isLoggedIn) {
                element.classList.remove('hidden');
            } else {
                element.classList.add('hidden');
            }
        });
        
        // Update like buttons for whispers
        if (isLoggedIn && window.userLikes) {
            likeButtons.forEach(button => {
                const whisperId = button.dataset.whisperId;
                if (window.userLikes.includes(whisperId)) {
                    button.classList.add('liked');
                }
            });
        }
        
        // Update follow buttons
        if (isLoggedIn && window.userConnections) {
            followButtons.forEach(button => {
                const userId = button.dataset.userId;
                if (window.userConnections.following.includes(userId)) {
                    button.classList.add('following');
                    button.textContent = 'Following';
                }
            });
        }
    }

    /**
     * Add a comment to the UI
     * @param {string} whisperId - The ID of the whisper
     * @param {Object} comment - The comment object
     */
    function addCommentToUI(whisperId, comment) {
        const whisperElement = document.querySelector(`.whisper-item[data-whisper-id="${whisperId}"]`);
        if (!whisperElement) return;
        
        const commentsContainer = whisperElement.querySelector('.comments-container');
        if (!commentsContainer) return;
        
        const commentElement = document.createElement('div');
        commentElement.className = 'comment-item';
        commentElement.innerHTML = `
            <div class="comment-avatar">
                <img src="${comment.user.avatar || 'public/images/default-avatar.png'}" alt="${comment.user.name}">
            </div>
            <div class="comment-content">
                <div class="comment-header">
                    <span class="comment-author">${comment.user.name}</span>
                    <span class="comment-time">${getTimeAgo(comment.timestamp)}</span>
                </div>
                <div class="comment-text">${comment.text}</div>
            </div>
        `;
        
        commentsContainer.appendChild(commentElement);
        
        // Update comment count
        const countElement = whisperElement.querySelector('.comment-count');
        if (countElement) {
            const currentCount = parseInt(countElement.textContent) || 0;
            countElement.textContent = currentCount + 1;
        }
    }

    /**
     * Update like button UI
     * @param {Element} button - The like button element
     * @param {boolean} liked - Whether the whisper is liked
     * @param {number} count - The new like count
     */
    function updateLikeUI(button, liked, count) {
        if (liked) {
            button.classList.add('liked');
            button.setAttribute('aria-label', 'Unlike');
        } else {
            button.classList.remove('liked');
            button.setAttribute('aria-label', 'Like');
        }
        
        // Update like count if available
        const countElement = button.querySelector('.like-count');
        if (countElement) {
            countElement.textContent = count;
        }
        
        // Update user likes in memory
        if (!window.userLikes) window.userLikes = [];
        
        const whisperId = button.dataset.whisperId;
        if (liked && !window.userLikes.includes(whisperId)) {
            window.userLikes.push(whisperId);
        } else if (!liked && window.userLikes.includes(whisperId)) {
            window.userLikes = window.userLikes.filter(id => id !== whisperId);
        }
    }

    /**
     * Update follow button UI
     * @param {Element} button - The follow button element
     * @param {boolean} following - Whether the user is being followed
     */
    function updateFollowUI(button, following) {
        if (following) {
            button.classList.add('following');
            button.textContent = 'Following';
        } else {
            button.classList.remove('following');
            button.textContent = 'Follow';
        }
        
        // Update user connections in memory
        if (!window.userConnections) {
            window.userConnections = { following: [], followers: [] };
        }
        
        const userId = button.dataset.userId;
        if (following && !window.userConnections.following.includes(userId)) {
            window.userConnections.following.push(userId);
        } else if (!following && window.userConnections.following.includes(userId)) {
            window.userConnections.following = window.userConnections.following.filter(id => id !== userId);
        }
    }

    /**
     * Update connections UI
     * @param {Object} connections - The user connections object
     */
    function updateConnectionsUI(connections) {
        // Update following count
        const followingCountElement = document.querySelector('.following-count');
        if (followingCountElement) {
            followingCountElement.textContent = connections.following.length;
        }
        
        // Update followers count
        const followersCountElement = document.querySelector('.followers-count');
        if (followersCountElement) {
            followersCountElement.textContent = connections.followers.length;
        }
    }

    /**
     * Increment share count for a whisper
     * @param {string} whisperId - The ID of the whisper
     */
    function incrementShareCount(whisperId) {
        const whisperElement = document.querySelector(`.whisper-item[data-whisper-id="${whisperId}"]`);
        if (!whisperElement) return;
        
        const shareCountElement = whisperElement.querySelector('.share-count');
        if (shareCountElement) {
            const currentCount = parseInt(shareCountElement.textContent) || 0;
            shareCountElement.textContent = currentCount + 1;
        }
    }

    /**
     * Copy text to clipboard
     * @param {string} text - The text to copy
     * @returns {Promise} - Resolves when copied successfully
     */
    function copyToClipboard(text) {
        return navigator.clipboard.writeText(text);
    }

    /**
     * Check if user is logged in
     * @returns {boolean} - Whether user is logged in
     */
    function isUserLoggedIn() {
        return !!localStorage.getItem('auth_token');
    }

    /**
     * Get current user data
     * @returns {Object|null} - The current user object or null
     */
    function getCurrentUser() {
        const userData = localStorage.getItem('user_data');
        return userData ? JSON.parse(userData) : null;
    }

    /**
     * Show auth modal with specified tab
     * @param {string} tab - The tab to show ('login' or 'signup')
     */
    function showAuthModal(tab = 'login') {
        const authModal = document.getElementById('auth-modal');
        if (!authModal) return;
        
        // Show modal
        authModal.classList.add('active');
        
        // Switch to specified tab
        const tabElement = document.querySelector(`.auth-tab[data-tab="${tab}"]`);
        if (tabElement) {
            // Simulate click to switch tabs
            tabElement.click();
        }
    }

    /**
     * Get time ago string
     * @param {number} timestamp - The timestamp in milliseconds
     * @returns {string} - The time ago string
     */
    function getTimeAgo(timestamp) {
        const seconds = Math.floor((Date.now() - timestamp) / 1000);
        
        if (seconds < 60) return 'just now';
        
        const minutes = Math.floor(seconds / 60);
        if (minutes < 60) return `${minutes}m ago`;
        
        const hours = Math.floor(minutes / 60);
        if (hours < 24) return `${hours}h ago`;
        
        const days = Math.floor(hours / 24);
        if (days < 30) return `${days}d ago`;
        
        const months = Math.floor(days / 30);
        if (months < 12) return `${months}mo ago`;
        
        const years = Math.floor(months / 12);
        return `${years}y ago`;
    }

    /**
     * Show notification
     * @param {string} message - The notification message
     * @param {string} type - The notification type ('success', 'error', 'info')
     */
    function showNotification(message, type = 'info') {
        // Use existing notification function if available
        if (window.showNotification) {
            window.showNotification(message, type);
            return;
        }
        
        // Create notification container if it doesn't exist
        let container = document.getElementById('notification-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'notification-container';
            document.body.appendChild(container);
        }
        
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        
        // Add to container
        container.appendChild(notification);
        
        // Show notification
        setTimeout(() => {
            notification.classList.add('show');
        }, 10);
        
        // Remove after delay
        setTimeout(() => {
            notification.classList.add('fade-out');
            setTimeout(() => {
                notification.remove();
            }, 300);
        }, 3000);
    }

    // Simulation functions for development/testing

    /**
     * Simulate adding a comment
     * @param {string} whisperId - The ID of the whisper
     * @param {string} text - The comment text
     * @returns {Promise} - Resolves with the created comment
     */
    function simulateAddComment(whisperId, text) {
        return new Promise((resolve) => {
            setTimeout(() => {
                const currentUser = getCurrentUser() || {
                    id: 'guest',
                    name: 'Guest User',
                    avatar: 'public/images/default-avatar.png'
                };
                
                const comment = {
                    id: 'comment_' + Math.random().toString(36).substr(2, 9),
                    text: text,
                    timestamp: Date.now(),
                    user: {
                        id: currentUser.id,
                        name: currentUser.name,
                        avatar: currentUser.avatar
                    }
                };
                
                resolve({ success: true, comment });
            }, 500);
        });
    }

    /**
     * Simulate like/unlike toggle
     * @param {string} whisperId - The ID of the whisper
     * @param {boolean} like - Whether to like or unlike
     * @returns {Promise} - Resolves with the updated like status
     */
    function simulateLikeToggle(whisperId, like) {
        return new Promise((resolve) => {
            setTimeout(() => {
                // Get current like count from UI
                const whisperElement = document.querySelector(`.whisper-item[data-whisper-id="${whisperId}"]`);
                let likeCount = 0;
                
                if (whisperElement) {
                    const countElement = whisperElement.querySelector('.like-count');
                    if (countElement) {
                        likeCount = parseInt(countElement.textContent) || 0;
                    }
                }
                
                // Update like count
                if (like) {
                    likeCount += 1;
                } else if (likeCount > 0) {
                    likeCount -= 1;
                }
                
                resolve({
                    success: true,
                    liked: like,
                    likeCount: likeCount
                });
            }, 300);
        });
    }

    /**
     * Simulate follow/unfollow toggle
     * @param {string} userId - The ID of the user to follow/unfollow
     * @param {boolean} follow - Whether to follow or unfollow
     * @returns {Promise} - Resolves with the updated follow status
     */
    function simulateFollowToggle(userId, follow) {
        return new Promise((resolve) => {
            setTimeout(() => {
                resolve({
                    success: true,
                    following: follow
                });
            }, 300);
        });
    }

    /**
     * Simulate loading user connections
     * @param {string} userId - The ID of the user
     * @returns {Promise} - Resolves with the user connections
     */
    function simulateLoadConnections(userId) {
        return new Promise((resolve) => {
            setTimeout(() => {
                // Generate random connections for demo
                const followingCount = Math.floor(Math.random() * 50);
                const followersCount = Math.floor(Math.random() * 100);
                
                const following = Array.from({ length: followingCount }, (_, i) => 
                    `user_${Math.random().toString(36).substr(2, 9)}`
                );
                
                const followers = Array.from({ length: followersCount }, (_, i) => 
                    `user_${Math.random().toString(36).substr(2, 9)}`
                );
                
                resolve({
                    following,
                    followers
                });
            }, 500);
        });
    }
}); 