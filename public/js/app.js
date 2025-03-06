document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM fully loaded, initializing app...');
    
    // Hide loading overlay with a slight delay
    setTimeout(hideLoadingOverlay, 1000);
    
    // Initialize the app
    initApp();
    
    // Setup avatar style selection
    setupAvatarStyleSelection();
    
    // Setup profile theme selection
    setupProfileThemeSelection();
});

document.addEventListener('DOMContentLoaded', () => {
    console.log('WhisperMap app initialized');
    
    // Global variables
    let isRecording = false;
    let mediaRecorder = null;
    let audioChunks = [];
    let audioStream = null;
    let recordingStartTime = 0;
    let recordingTimer = null;
    let timerInterval = null;
    let microphonePermissionRequested = false;
    const MAX_RECORDING_TIME = 60000; // 60 seconds
    
    // Constants
    const CACHE_VERSION = 'whispermap-v1.2';
    const CACHE_NAME = `${CACHE_VERSION}-${new Date().toISOString().split('T')[0]}`;
    const API_BASE_URL = '/api';
    const REFRESH_INTERVAL = 60000; // 1 minute
    const LOCATION_TIMEOUT = 10000; // 10 seconds
    const LOCATION_OPTIONS = {
        enableHighAccuracy: true,
        timeout: LOCATION_TIMEOUT,
        maximumAge: 0
    };
    
    // Global variables and state management
    let currentPosition = null;
    let isPremium = false;
    let currentFilter = 'all';
    let soundEffects = {};
    let currentlyPlayingAudio = null;
    let currentlyPlayingButton = null;
    let userWhispers = [];
    let nearbyWhispers = [];
    let resourcesLoaded = {
        sounds: false,
        auth: false,
        social: false
    };
    
    // DOM Elements - with null checks
    const loadingOverlay = document.getElementById('loading-overlay');
    const recordButton = document.getElementById('record-button');
    const recordStatus = document.getElementById('record-status');
    const recordingTimerElement = document.getElementById('recording-timer');
    const locationStatus = document.getElementById('location-status');
    const locationDot = document.querySelector('.dot');
    const whispersList = document.getElementById('whispers-list');
    const whispersStatus = document.getElementById('whispers-status');
    const premiumBtn = document.getElementById('premium-btn');
    const premiumFeaturesBtn = document.getElementById('premium-features-btn');
    const premiumModal = document.getElementById('premium-modal');
    const closeModal = document.querySelector('.close-modal');
    const whisperTypeSelect = document.getElementById('whisper-type');
    const whisperRadius = document.getElementById('whisper-radius');
    const radiusValue = document.getElementById('radius-value');
    const adBanner = document.getElementById('ad-banner');
    const adCloseBtn = document.querySelector('.ad-close-btn');
    const filterButtons = document.querySelectorAll('.filter-btn');
    const retryLocationBtn = document.getElementById('retry-location-btn');
    const planButtons = document.querySelectorAll('.plan-select-btn');
    const paymentForm = document.getElementById('payment-form');
    const selectedPlanInfo = document.getElementById('selected-plan-info');
    const backToPlanBtn = document.getElementById('back-to-plans-btn');
    const completePaymentBtn = document.getElementById('complete-payment-btn');
    const creditCardForm = document.getElementById('credit-card-form');
    const cardNumberInput = document.getElementById('card-number');
    const expiryDateInput = document.getElementById('expiry-date');
    const cvvInput = document.getElementById('cvv');
    const profileModal = document.getElementById('profile-modal');
    
    // Detect mobile devices
    const isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    console.log('Is mobile device:', isMobileDevice);
    
    // Dynamically determine server URL based on current location
    const SERVER_URL = (() => {
        const currentUrl = window.location.href;
        // If we're accessing through ngrok or any external URL, use that as the base
        if (currentUrl.includes('ngrok') || !currentUrl.includes('localhost')) {
            // Extract the base URL (protocol + host)
            const urlObj = new URL(currentUrl);
            return `${urlObj.protocol}//${urlObj.host}`;
        }
        // Otherwise use the default localhost URL
        return 'http://localhost:9000';
    })();
    
    console.log('Using server URL:', SERVER_URL);
    
    // Initialize the app with optimized loading sequence
    initApp();
    
    /**
     * Initialize the application with optimized loading sequence
     */
    function initApp() {
        // Start loading resources in parallel
        Promise.all([
            loadAuthModule(),
            loadSocialModule(),
            loadSoundEffects()
        ])
        .then(() => {
            // Once critical resources are loaded, continue with app initialization
            checkUserStatus();
            setupEventListeners();
            setupRecordButton();
            setupPremiumFeatures();
            setupFilterButtons();
            setupAdBanner();
            updatePremiumUI();
            
            // Initialize social features if available
            if (window.socialFeatures && window.socialFeatures.init) {
                window.socialFeatures.init();
            }
            
            // Start location services last (can be slow on some devices)
            initGeolocation();
            
            // Hide loading overlay with a slight delay for smoother transition
            setTimeout(() => {
                if (loadingOverlay) {
                    loadingOverlay.classList.add('hidden');
                    setTimeout(() => {
                        loadingOverlay.style.display = 'none';
                    }, 300);
                }
                
                // Animate welcome elements
                animateWelcome();
            }, 500);
        })
        .catch(error => {
            console.error('Error during app initialization:', error);
            // Hide loading overlay even if there was an error
            if (loadingOverlay) {
                loadingOverlay.classList.add('hidden');
            }
            // Show error notification
            showNotification('There was a problem loading the app. Please refresh the page.', 'error');
        });
    }
    
    /**
     * Load authentication module
     * @returns {Promise} Promise that resolves when auth module is loaded
     */
    function loadAuthModule() {
        return new Promise((resolve) => {
            // Check if auth module is already loaded
            if (window.updateUIForAuthenticatedUser) {
                resourcesLoaded.auth = true;
                resolve();
                return;
            }
            
            // Set a timeout to resolve anyway after 2 seconds
            const timeout = setTimeout(() => {
                console.warn('Auth module load timed out');
                resolve();
            }, 2000);
            
            // Listen for auth module loaded event
            document.addEventListener('auth-module-loaded', () => {
                clearTimeout(timeout);
                resourcesLoaded.auth = true;
                resolve();
            }, { once: true });
            
            // If no event after 2 seconds, we continue anyway
        });
    }
    
    /**
     * Load social features module
     * @returns {Promise} Promise that resolves when social module is loaded
     */
    function loadSocialModule() {
        return new Promise((resolve) => {
            // Check if social module is already loaded
            if (window.socialFeatures) {
                resourcesLoaded.social = true;
                resolve();
                return;
            }
            
            // Set a timeout to resolve anyway after 2 seconds
            const timeout = setTimeout(() => {
                console.warn('Social module load timed out');
                resolve();
            }, 2000);
            
            // Listen for social module loaded event
            document.addEventListener('social-module-loaded', () => {
                clearTimeout(timeout);
                resourcesLoaded.social = true;
                resolve();
            }, { once: true });
            
            // If no event after 2 seconds, we continue anyway
        });
    }
    
    /**
     * Load sound effects with optimized approach
     * @returns {Promise} Promise that resolves when sounds are loaded
     */
    function loadSoundEffects() {
        return new Promise((resolve) => {
            const sounds = [
                { name: 'record-start', path: 'public/sounds/record-start.mp3' },
                { name: 'record-stop', path: 'public/sounds/record-stop.mp3' },
                { name: 'location', path: 'public/sounds/location.mp3' },
                { name: 'error', path: 'public/sounds/error.mp3' },
                { name: 'success', path: 'public/sounds/success.mp3' },
                { name: 'premium', path: 'public/sounds/premium.mp3' }
            ];
            
            let loadedCount = 0;
            const totalSounds = sounds.length;
            
            // Set a timeout to resolve anyway after 3 seconds
            const timeout = setTimeout(() => {
                console.warn('Sound effects load timed out');
                resourcesLoaded.sounds = true;
                resolve();
            }, 3000);
            
            sounds.forEach(sound => {
                const audio = new Audio();
                audio.preload = 'auto';
                
                // Handle both success and error to ensure we continue loading
                audio.oncanplaythrough = () => {
                    soundEffects[sound.name] = audio;
                    loadedCount++;
                    
                    if (loadedCount === totalSounds) {
                        clearTimeout(timeout);
                        resourcesLoaded.sounds = true;
                        resolve();
                    }
                };
                
                audio.onerror = () => {
                    console.warn(`Failed to load sound: ${sound.name}`);
                    loadedCount++;
                    
                    if (loadedCount === totalSounds) {
                        clearTimeout(timeout);
                        resourcesLoaded.sounds = true;
                        resolve();
                    }
                };
                
                // Add timestamp to prevent caching issues
                audio.src = `${sound.path}?t=${Date.now()}`;
                audio.load();
            });
        });
    }
    
    /**
     * Play a sound effect
     * @param {string} name - Name of the sound effect to play
     */
    function playSoundEffect(name) {
        if (soundEffects[name]) {
            // Clone the audio to allow multiple plays
            const sound = soundEffects[name].cloneNode();
            sound.volume = 0.7;
            sound.play().catch(err => {
                console.warn(`Error playing sound ${name}:`, err);
            });
        }
    }
    
    // Check user login and premium status
    function checkUserStatus() {
        if (window.WhisperAuth && window.WhisperAuth.isLoggedIn()) {
            isPremium = window.WhisperAuth.isPremium();
            console.log('User is logged in. Premium status:', isPremium);
            
            // Update UI based on premium status
            updatePremiumUI();
        } else {
            console.log('User is not logged in');
            isPremium = false;
        }
    }
    
    // Update UI based on premium status
    function updatePremiumUI() {
        // Update whisper type options
        if (whisperTypeSelect) {
            const privateOption = whisperTypeSelect.querySelector('option[value="private"]');
            const lastingOption = whisperTypeSelect.querySelector('option[value="lasting"]');
            
            if (privateOption) {
                privateOption.disabled = !isPremium;
                if (!isPremium) {
                    privateOption.textContent = 'Private Whisper (Premium Only)';
                } else {
                    privateOption.textContent = 'Private Whisper';
                }
            }
            
            if (lastingOption) {
                lastingOption.disabled = !isPremium;
                if (!isPremium) {
                    lastingOption.textContent = 'Lasting Whisper - 7 days (Premium Only)';
                } else {
                    lastingOption.textContent = 'Lasting Whisper - 7 days';
                }
            }
        }
        
        // Update whisper radius slider
        if (whisperRadius) {
            if (isPremium) {
                whisperRadius.max = 500;
            } else {
                whisperRadius.max = 200;
                if (parseInt(whisperRadius.value) > 200) {
                    whisperRadius.value = 200;
                    radiusValue.textContent = '200m';
                }
            }
        }
        
        // Show/hide ad banner for premium users
        if (adBanner) {
            adBanner.style.display = isPremium ? 'none' : 'flex';
        }
        
        // Update premium button text
        if (premiumBtn) {
            premiumBtn.textContent = isPremium ? 'Premium Active' : 'Go Premium';
            premiumBtn.classList.toggle('premium-active', isPremium);
        }
        
        if (premiumFeaturesBtn) {
            premiumFeaturesBtn.textContent = isPremium ? 'Premium Active' : 'Unlock Premium - $4.99/month';
            premiumFeaturesBtn.classList.toggle('premium-active', isPremium);
        }
    }
    
    function animateWelcome() {
        const header = document.querySelector('header');
        header.style.opacity = '0';
        header.style.transform = 'translateY(-20px)';
        
        setTimeout(() => {
            header.style.transition = 'all 0.8s ease-out';
            header.style.opacity = '1';
            header.style.transform = 'translateY(0)';
        }, 300);
    }
    
    function setupPremiumFeatures() {
        // Set up premium button click
        premiumBtn.addEventListener('click', openPremiumModal);
        premiumFeaturesBtn.addEventListener('click', openPremiumModal);
        
        // Set up modal close
        closeModal.addEventListener('click', closePremiumModal);
        window.addEventListener('click', function(event) {
            if (event.target === premiumModal) {
                closePremiumModal();
            }
        });
        
        // Set up plan selection
        planButtons.forEach(btn => {
            btn.addEventListener('click', selectPlan);
        });
        
        // Set up back to plans button
        backToPlanBtn.addEventListener('click', showPlans);
        
        // Set up credit card form submission
        creditCardForm.addEventListener('submit', processPayment);
        
        // Set up credit card input formatting
        setupCardInputFormatting();
        
        // Set up whisper type select
        whisperTypeSelect.addEventListener('change', handleWhisperTypeChange);
        
        // Set up whisper radius
        whisperRadius.addEventListener('input', updateRadiusValue);
    }
    
    function setupFilterButtons() {
        filterButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                // Remove active class from all buttons
                filterButtons.forEach(b => b.classList.remove('active'));
                
                // Add active class to clicked button
                btn.classList.add('active');
                
                // Update filter
                currentFilter = btn.id.replace('filter-', '');
                
                // Apply filter
                filterWhispers();
            });
        });
    }
    
    function setupAdBanner() {
        // Hide ad banner for premium users
        if (isPremium) {
            adBanner.style.display = 'none';
        }
        
        // Set up ad close button
        adCloseBtn.addEventListener('click', () => {
            adBanner.style.display = 'none';
            
            // Show ad again after 2 minutes for non-premium users
            if (!isPremium) {
                setTimeout(() => {
                    adBanner.style.display = 'block';
                }, 120000);
            }
        });
    }
    
    function openPremiumModal() {
        const premiumModal = document.getElementById('premium-modal');
        
        // Use payment module if available
        if (window.WhisperPayment && window.WhisperPayment.openPremiumModal) {
            window.WhisperPayment.openPremiumModal();
            return;
        }
        
        // Legacy modal opening (fallback)
        if (premiumModal) {
            premiumModal.classList.add('active');
            
            // Reset modal state
            const paymentForm = document.getElementById('payment-form');
            const processingDiv = document.querySelector('.payment-processing');
            const successDiv = document.querySelector('.payment-success-animation');
            
            if (paymentForm) paymentForm.style.display = 'none';
            if (processingDiv) processingDiv.style.display = 'none';
            if (successDiv) successDiv.style.display = 'none';
            
            const pricingOptions = document.querySelector('.pricing-options');
            if (pricingOptions) pricingOptions.style.display = 'flex';
        }
    }
    
    function closePremiumModal() {
        premiumModal.classList.remove('show');
        
        // Reset form
        creditCardForm.reset();
    }
    
    function selectPlan(event) {
        // Get plan details
        const button = event.currentTarget;
        const plan = button.dataset.plan;
        const price = button.dataset.price;
        const planName = plan === 'monthly' ? 'Monthly' : 'Annual';
        const planDisplay = plan === 'monthly' ? `$${price}/month` : `$${price}/year`;
        
        // Update selected plan info
        selectedPlanInfo.textContent = `${planName} plan: ${planDisplay}`;
        
        // Highlight selected plan
        document.querySelectorAll('.pricing-card').forEach(card => {
            card.classList.remove('selected');
        });
        button.closest('.pricing-card').classList.add('selected');
        
        // Show payment form
        document.querySelector('.pricing-options').style.display = 'none';
        paymentForm.style.display = 'block';
        
        // Hide features list on mobile to save space
        if (window.innerWidth < 768) {
            document.querySelector('.premium-features-list').style.display = 'none';
        }
    }
    
    function showPlans() {
        // Show pricing options
        document.querySelector('.pricing-options').style.display = 'flex';
        paymentForm.style.display = 'none';
        
        // Show features list
        document.querySelector('.premium-features-list').style.display = 'block';
        
        // Remove selected class
        document.querySelectorAll('.pricing-card').forEach(card => {
            card.classList.remove('selected');
        });
    }
    
    function setupCardInputFormatting() {
        // Format card number with spaces
        cardNumberInput.addEventListener('input', function(e) {
            let value = e.target.value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
            let formattedValue = '';
            
            for (let i = 0; i < value.length; i++) {
                if (i > 0 && i % 4 === 0) {
                    formattedValue += ' ';
                }
                formattedValue += value[i];
            }
            
            e.target.value = formattedValue;
        });
        
        // Format expiry date with slash
        expiryDateInput.addEventListener('input', function(e) {
            let value = e.target.value.replace(/[^0-9]/gi, '');
            
            if (value.length > 2) {
                value = value.substring(0, 2) + '/' + value.substring(2, 4);
            }
            
            e.target.value = value;
        });
        
        // Limit CVV to numbers only
        cvvInput.addEventListener('input', function(e) {
            e.target.value = e.target.value.replace(/[^0-9]/gi, '');
        });
    }
    
    function processPayment(event) {
        event.preventDefault();
        
        // Check if user is logged in
        if (!isUserLoggedIn()) {
            showNotification('Please log in to complete your purchase', 'error');
            
            // Show auth modal
            if (window.WhisperAuth && window.WhisperAuth.showLoginModal) {
                window.WhisperAuth.showLoginModal();
            }
            
            return;
        }
        
        // Use payment module if available
        if (window.WhisperPayment && window.WhisperPayment.processPayment) {
            window.WhisperPayment.processPayment(event);
            return;
        }
        
        // Legacy payment processing (fallback)
        const selectedPlan = document.querySelector('.pricing-card.selected');
        if (!selectedPlan) {
            showNotification('Please select a plan', 'error');
            return;
        }
        
        const planName = selectedPlan.querySelector('h3').textContent;
        const planPrice = selectedPlan.querySelector('.pricing-price').textContent;
        
        // Show processing animation
        const paymentForm = document.getElementById('payment-form');
        const processingDiv = document.querySelector('.payment-processing');
        
        if (paymentForm && processingDiv) {
            paymentForm.style.display = 'none';
            processingDiv.style.display = 'flex';
        }
        
        // Simulate payment processing
        setTimeout(() => {
            if (processingDiv) {
                processingDiv.style.display = 'none';
            }
            
            // Show success animation
            const successDiv = document.querySelector('.payment-success-animation');
            if (successDiv) {
                successDiv.style.display = 'flex';
            }
            
            // Update user to premium
            isPremiumUser = true;
            
            // Update UI for premium user
            updatePremiumUI();
            
            // Show notification
            showNotification('Payment successful! You now have premium access.', 'success');
            
            // Close modal after delay
            setTimeout(() => {
                const premiumModal = document.getElementById('premium-modal');
                if (premiumModal) {
                    premiumModal.classList.remove('active');
                    
                    // Reset modal state
                    if (paymentForm) paymentForm.style.display = 'none';
                    if (processingDiv) processingDiv.style.display = 'none';
                    if (successDiv) successDiv.style.display = 'none';
                    
                    const pricingOptions = document.querySelector('.pricing-options');
                    if (pricingOptions) pricingOptions.style.display = 'flex';
                }
            }, 3000);
        }, 2000);
    }
    
    function purchasePremium() {
        // This function is now replaced by the processPayment function
        // Keeping it for backward compatibility
        openPremiumModal();
    }
    
    function handleWhisperTypeChange() {
        if (!isPremium && whisperTypeSelect.value !== 'public') {
            showNotification('This feature is only available for premium users', 'error');
            whisperTypeSelect.value = 'public';
        }
    }
    
    function updateRadiusValue() {
        radiusValue.textContent = `${whisperRadius.value}m`;
    }
    
    function filterWhispers() {
        if (!userWhispers.length) return;
        
        let filteredWhispers = [...userWhispers];
        
        switch (currentFilter) {
            case 'new':
                // Sort by newest first (already sorted this way)
                break;
            case 'popular':
                // In a real app, this would sort by popularity metrics
                // For demo, we'll just randomize to simulate different order
                filteredWhispers.sort(() => Math.random() - 0.5);
                break;
            case 'all':
            default:
                // Keep default sorting (newest first)
                break;
        }
        
        // Display filtered whispers
        displayWhispers(filteredWhispers, true);
    }
    
    function initGeolocation() {
        // Update location status
        locationStatus.textContent = 'Locating...';
        locationDot.classList.add('locating');
        
        // Request geolocation permission
        if (navigator.geolocation) {
            requestGeolocation();
        } else {
            locationStatus.textContent = 'Geolocation not supported';
            locationDot.classList.remove('locating');
            locationDot.classList.add('error');
        }
    }
    
    function requestGeolocation() {
        navigator.geolocation.getCurrentPosition(
            position => {
                // Success
                currentPosition = {
                    latitude: position.coords.latitude,
                    longitude: position.coords.longitude
                };
                
                // Update location status
                locationStatus.textContent = 'Location found';
                locationDot.classList.remove('locating');
                locationDot.classList.add('success');
                
                // Play sound effect
                playSoundEffect('location');
                
                // Load whispers
                loadMockWhispers();
            },
            error => {
                // Error
                locationStatus.textContent = 'Location error: ' + getGeolocationErrorMessage(error);
                locationDot.classList.remove('locating');
                locationDot.classList.add('error');
                
                // Play sound effect
                playSoundEffect('error');
                
                // Show retry button
                retryLocationBtn.style.display = 'inline-block';
            },
            {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 0
            }
        );
    }
    
    function handlePositionSuccess(position) {
        console.log('Location success:', position.coords.latitude, position.coords.longitude);
        const isFirstLocation = !currentPosition;
        
        currentPosition = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
        };
        
        locationStatus.textContent = 'Location found';
        locationDot.style.backgroundColor = 'var(--success-color)';
        
        // Enable record button if location is found
        if (recordButton.disabled && !isMobileSafari()) {
            recordButton.disabled = false;
        }
        
        if (isFirstLocation) {
            try {
                soundEffects.locationFound.play().catch(e => console.log('Could not play sound effect:', e));
            } catch (e) {
                console.log('Could not play sound effect:', e);
            }
            showNotification('Location found! You can now record and discover whispers', 'success');
            
            // If we haven't requested microphone permission yet, do it now
            if (!microphonePermissionRequested) {
                initRecording();
            }
        }
        
        // Fetch nearby whispers when location is obtained
        fetchNearbyWhispers();
    }
    
    function handlePositionError(error) {
        console.error('Geolocation error:', error);
        let errorMsg = '';
        let statusMsg = '';
        
        switch(error.code) {
            case error.PERMISSION_DENIED:
                errorMsg = 'Location access denied';
                statusMsg = 'Permission denied. Please allow location access in your browser settings.';
                break;
            case error.POSITION_UNAVAILABLE:
                errorMsg = 'Location unavailable';
                statusMsg = 'Position unavailable. Try again later.';
                break;
            case error.TIMEOUT:
                errorMsg = 'Location request timed out';
                statusMsg = 'Request timed out. Check your connection and try again.';
                break;
            default:
                errorMsg = 'Location error';
                statusMsg = error.message;
        }
        
        // Update status display
        locationStatus.textContent = statusMsg;
        locationDot.style.backgroundColor = 'var(--error-color)';
        
        // Show a shorter notification first
        showNotification(errorMsg, 'error');
        
        // Show a more helpful message for mobile users with a slight delay
        if (isMobileDevice) {
            setTimeout(() => {
                showNotification('Tap "Retry Location" to try again. Make sure location is enabled in your device settings.', 'info');
            }, 1500);
        }
        
        // Make sure the retry button is visible and highlighted
        const retryBtn = document.getElementById('retry-location-btn');
        if (retryBtn) {
            retryBtn.style.animation = 'pulse 1.5s infinite';
            setTimeout(() => {
                retryBtn.style.animation = '';
            }, 6000);
        }
    }
    
    /**
     * Sets up the record button with proper event listeners for both mobile and desktop
     */
    function setupRecordButton() {
        console.log('Setting up record button...');
        
        // Get the record button element
        const recordButton = document.getElementById('record-button');
        
        // Check if the record button exists
        if (!recordButton) {
            console.error('Record button not found in the DOM');
            return;
        }
        
        console.log('Record button found, setting up event listeners');
        
        // Enable the button and remove any disabled class
        recordButton.classList.remove('disabled');
        
        // Clone the button to remove any existing event listeners
        const newRecordButton = recordButton.cloneNode(true);
        recordButton.parentNode.replaceChild(newRecordButton, recordButton);
        
        // Update the reference to the new button
        const recordBtn = document.getElementById('record-button');
        
        // Add touch event listeners for mobile devices
        recordBtn.addEventListener('touchstart', function(e) {
            e.preventDefault(); // Prevent default touch behavior
            console.log('Touch start on record button');
            startRecording(e);
        });
        
        // Add mouse event listeners for desktop
        recordBtn.addEventListener('mousedown', function(e) {
            console.log('Mouse down on record button');
            startRecording(e);
        });
        
        // Add click event as a fallback
        recordBtn.addEventListener('click', function(e) {
            console.log('Click on record button');
            if (!isRecording) {
                startRecording(e);
            } else {
                stopRecording(e);
            }
        });
        
        // Add visual feedback on hover
        recordBtn.addEventListener('mouseover', function() {
            this.classList.add('hover');
        });
        
        recordBtn.addEventListener('mouseout', function() {
            this.classList.remove('hover');
        });
        
        console.log('Record button setup complete');
    }
    
    /**
     * Starts the recording process
     * @param {Event} e - The event that triggered the recording
     */
    function startRecording(e) {
        console.log('startRecording called', e);
        
        // Prevent default behavior if an event is provided
        if (e) e.preventDefault();
        
        // Check if already recording
        if (isRecording) {
            console.log('Already recording, ignoring startRecording call');
            return;
        }
        
        // Check if location is available
        if (!currentPosition) {
            console.log('Location not available, requesting permission');
            requestLocationPermission();
            return;
        }
        
        // Check for microphone access
        if (!microphonePermissionRequested) {
            console.log('Microphone permission not yet requested');
            
            // If we already have a stream, set up the media recorder
            if (audioStream) {
                setupMediaRecorder();
            } else {
                // Request microphone access
                requestMicrophoneAccess();
            }
            return;
        }
        
        // If we have a stream and media recorder, start recording
        if (audioStream && mediaRecorder) {
            try {
                console.log('Starting recording with existing media recorder');
                
                // Reset chunks array
                audioChunks = [];
                
                // Start recording
                mediaRecorder.start();
                isRecording = true;
                
                // Update UI
                updateRecordButtonState(true);
                startTimer();
                
                // Play sound effect
                playSoundEffect('record-start');
                
                // Update status
                document.getElementById('record-status').textContent = 'Recording...';
                
            } catch (error) {
                console.error('Error starting recording:', error);
                document.getElementById('record-status').textContent = 'Error starting recording';
            }
        } else {
            // Request microphone access if no stream or media recorder
            console.log('No stream or media recorder, requesting microphone access');
            requestMicrophoneAccess()
                .then(() => {
                    console.log('Microphone access granted, setting up media recorder');
                    setupMediaRecorder();
                    
                    // Start recording after setup
                    if (mediaRecorder) {
                        console.log('Starting recording after setup');
                        mediaRecorder.start();
                        isRecording = true;
                        
                        // Update UI
                        updateRecordButtonState(true);
                        startTimer();
                        
                        // Play sound effect
                        playSoundEffect('record-start');
                        
                        // Update status
                        document.getElementById('record-status').textContent = 'Recording...';
                    }
                })
                .catch(error => {
                    console.error('Error accessing microphone:', error);
                    document.getElementById('record-status').textContent = 'Microphone access denied';
                });
        }
    }
    
    /**
     * Stops the recording process
     * @param {Event} e - The event that triggered stopping the recording
     */
    function stopRecording(e) {
        console.log('stopRecording called', e);
        
        // Prevent default behavior if an event is provided
        if (e) e.preventDefault();
        
        // Check if recording and media recorder exists
        if (!isRecording || !mediaRecorder) {
            console.log('Not recording or no media recorder, ignoring stopRecording call');
            return;
        }
        
        // Update UI
        updateRecordButtonState(false);
        document.getElementById('record-status').textContent = 'Processing recording...';
        
        // Stop timer
        stopTimer();
        
        try {
            // Stop recording
            mediaRecorder.stop();
            console.log('Recording stopped successfully');
            
            // Play sound effect
            playSoundEffect('record-stop');
            
            // Update status after a delay
            setTimeout(() => {
                document.getElementById('record-status').textContent = 'Recording saved!';
                
                // Reset status after a few seconds
                setTimeout(() => {
                    document.getElementById('record-status').textContent = 'Ready to record';
                }, 3000);
            }, 1000);
            
        } catch (error) {
            console.error('Error stopping recording:', error);
            document.getElementById('record-status').textContent = 'Error saving recording';
        }
        
        isRecording = false;
    }
    
    /**
     * Updates the record button state based on recording status
     * @param {boolean} recording - Whether recording is in progress
     */
    function updateRecordButtonState(recording) {
        const recordButton = document.getElementById('record-button');
        const recordText = recordButton.querySelector('.record-text');
        
        if (recording) {
            recordButton.classList.add('recording');
            recordText.textContent = 'Recording...';
        } else {
            recordButton.classList.remove('recording');
            recordText.textContent = 'Tap to Record';
        }
    }
    
    function updateTimer() {
        const elapsedTime = Date.now() - recordingStartTime;
        const seconds = Math.floor(elapsedTime / 1000);
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        
        const timerElement = document.getElementById('recording-timer');
        if (timerElement) {
            timerElement.textContent = `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
            
            // Visual feedback as time progresses
            const progress = elapsedTime / MAX_RECORDING_TIME;
            const hue = 120 - (progress * 120); // From green (120) to red (0)
            timerElement.style.color = `hsl(${hue}, 70%, 50%)`;
        }
        
        // Stop recording if max time reached
        if (elapsedTime >= MAX_RECORDING_TIME) {
            stopRecording();
        }
    }
    
    function fetchNearbyWhispers(animate = false) {
        if (!currentPosition) {
            whispersStatus.textContent = 'Location not available. Cannot fetch whispers.';
            return;
        }
        
        whispersStatus.textContent = 'Searching for whispers...';
        
        if (animate) {
            // Add loading animation
            whispersStatus.classList.add('searching');
        }
        
        // Get the current radius from the slider
        const radius = whisperRadius.value;
        
        fetch(`${SERVER_URL}/api/whispers?latitude=${currentPosition.latitude}&longitude=${currentPosition.longitude}&radius=${radius}`)
            .then(response => {
                if (!response.ok) {
                    throw new Error('Network response was not ok');
                }
                return response.json();
            })
            .then(whispers => {
                whispersStatus.classList.remove('searching');
                
                // Store all whispers for filtering
                userWhispers = whispers;
                
                // Apply current filter
                filterWhispers();
            })
            .catch(error => {
                console.error('Fetch error:', error);
                whispersStatus.classList.remove('searching');
                whispersStatus.textContent = 'Failed to fetch whispers';
                showNotification('Could not load nearby whispers', 'error');
            });
    }
    
    function displayWhispers(whispers, animate = false) {
        console.log('Displaying whispers:', whispers.length);
        const whispersList = document.getElementById('whispers-list');
        
        if (!whispersList) return;
        
        // Clear existing whispers
        whispersList.innerHTML = '';
        
        if (whispers.length === 0) {
            // Show empty state
            const emptyState = document.createElement('div');
            emptyState.className = 'empty-state';
            emptyState.innerHTML = `
                <i class="fas fa-volume-mute"></i>
                <p>No whispers found nearby. Be the first to leave one!</p>
            `;
            whispersList.appendChild(emptyState);
            return;
        }
        
        // Render whispers
        renderWhispers(whispers);
    }
    
    function renderWhispers(whispers) {
        const whispersList = document.getElementById('whispers-list');
        
        if (!whispersList) return;
        
        whispers.forEach((whisper, index) => {
            const whisperItem = document.createElement('div');
            whisperItem.className = 'whisper-item';
            whisperItem.setAttribute('data-whisper-id', whisper.id);
            
            // Add animation delay for staggered appearance
            whisperItem.style.animationDelay = `${index * 0.1}s`;
            
            whisperItem.innerHTML = `
                <div class="whisper-header">
                    <div class="whisper-user">
                        <img src="${whisper.userAvatar || 'public/images/default-avatar.png'}" alt="User Avatar" class="user-avatar-small">
                        <span class="whisper-username">${whisper.userName || 'Anonymous'}</span>
                        ${whisper.isPrivate ? '<span class="private-badge"><i class="fas fa-lock"></i></span>' : ''}
                    </div>
                    <div class="whisper-time">${getTimeAgo(whisper.timestamp)}</div>
                </div>
                <div class="whisper-content">
                    <button class="play-whisper-btn" data-whisper-id="${whisper.id}">
                        <i class="fas fa-play"></i>
                        <span class="whisper-duration">${formatTime(whisper.duration)}</span>
                    </button>
                    <div class="whisper-info">
                        <div class="whisper-location">${whisper.location}</div>
                        <div class="whisper-expiry">${getExpiryTime(whisper.timestamp, whisper.expirationHours)}</div>
                    </div>
                </div>
                <div class="whisper-footer">
                    <button class="social-button like-button" data-whisper-id="${whisper.id}">
                        <i class="fas fa-heart"></i> <span class="like-count">${whisper.likes || 0}</span>
                    </button>
                    <button class="social-button comment-button" data-whisper-id="${whisper.id}">
                        <i class="fas fa-comment"></i> <span class="comment-count">${whisper.comments ? whisper.comments.length : 0}</span>
                    </button>
                    <button class="social-button share-button" data-whisper-id="${whisper.id}">
                        <i class="fas fa-share-alt"></i>
                    </button>
                </div>
            `;
            
            whispersList.appendChild(whisperItem);
            
            // Add event listener to play button
            const playButton = whisperItem.querySelector('.play-whisper-btn');
            if (playButton) {
                playButton.addEventListener('click', playWhisper);
            }
        });
    }
    
    function playWhisper(event) {
        console.log('playWhisper called', event);
        const button = event.currentTarget;
        const whisperItem = button.closest('.whisper-item');
        const whisperId = whisperItem.dataset.whisperId;
        console.log('Whisper ID:', whisperId);
        
        // If already playing this whisper, stop it
        if (currentlyPlayingButton === button && currentlyPlayingAudio) {
            console.log('Stopping currently playing whisper');
            currentlyPlayingAudio.pause();
            currentlyPlayingAudio = null;
            currentlyPlayingButton.innerHTML = '<i class="fas fa-play"></i>';
            currentlyPlayingButton = null;
            
            // Clean up visualizer if it exists
            if (window.currentVisualizerCleanup) {
                console.log('Cleaning up visualizer');
                window.currentVisualizerCleanup();
                window.currentVisualizerCleanup = null;
            }
            
            // Remove progress bar
            const progressBar = whisperItem.querySelector('.progress-container');
            if (progressBar) {
                console.log('Removing progress bar');
                progressBar.remove();
            }
            
            return;
        }
        
        // If playing another whisper, stop it first
        if (currentlyPlayingAudio) {
            console.log('Stopping previous whisper');
            currentlyPlayingAudio.pause();
            if (currentlyPlayingButton) {
                currentlyPlayingButton.innerHTML = '<i class="fas fa-play"></i>';
            }
            
            // Clean up previous visualizer
            if (window.currentVisualizerCleanup) {
                console.log('Cleaning up previous visualizer');
                window.currentVisualizerCleanup();
                window.currentVisualizerCleanup = null;
            }
            
            // Remove progress bar from previous whisper
            if (currentlyPlayingButton) {
                const prevWhisperItem = currentlyPlayingButton.closest('.whisper-item');
                if (prevWhisperItem) {
                    const progressBar = prevWhisperItem.querySelector('.progress-container');
                    if (progressBar) {
                        console.log('Removing previous progress bar');
                        progressBar.remove();
                    }
                }
            }
        }
        
        // Update button state to show loading
        button.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
        
        // Create audio element with correct API endpoint and force cache busting
        const timestamp = new Date().getTime();
        // Use absolute URL to avoid path issues
        const audioUrl = `${window.location.origin}/api/whispers/${whisperId}/audio?nocache=${timestamp}`;
        console.log('Loading audio from:', audioUrl);
        
        // Create new audio element
        const audio = new Audio();
        
        // Set up event listeners before setting the source
        audio.addEventListener('loadedmetadata', () => {
            console.log('Audio metadata loaded, duration:', audio.duration);
            if (timeDisplay) {
                timeDisplay.textContent = `0:00 / ${formatTime(audio.duration)}`;
            }
        });
        
        // Create progress bar
        const progressContainer = document.createElement('div');
        progressContainer.className = 'progress-container';
        
        const progressBar = document.createElement('div');
        progressBar.className = 'progress-bar';
        
        const progressFill = document.createElement('div');
        progressFill.className = 'progress-fill';
        
        const timeDisplay = document.createElement('div');
        timeDisplay.className = 'time-display';
        timeDisplay.textContent = '0:00 / 0:00';
        
        progressBar.appendChild(progressFill);
        progressContainer.appendChild(progressBar);
        progressContainer.appendChild(timeDisplay);
        
        // Insert progress bar after the play button
        button.parentNode.insertBefore(progressContainer, button.nextSibling);
        
        // Create visualizer container if it doesn't exist
        let visualizerContainer = whisperItem.querySelector('.visualizer-container');
        if (!visualizerContainer) {
            visualizerContainer = document.createElement('div');
            visualizerContainer.className = 'visualizer-container';
            whisperItem.appendChild(visualizerContainer);
        }
        
        // Update progress bar as audio plays
        audio.addEventListener('timeupdate', () => {
            if (audio.duration) {
                const percent = (audio.currentTime / audio.duration) * 100;
                progressFill.style.width = `${percent}%`;
                timeDisplay.textContent = `${formatTime(audio.currentTime)} / ${formatTime(audio.duration)}`;
            }
        });
        
        // Allow seeking by clicking on progress bar
        progressBar.addEventListener('click', (e) => {
            console.log('Progress bar clicked');
            if (audio.duration) {
                const rect = progressBar.getBoundingClientRect();
                const pos = (e.clientX - rect.left) / rect.width;
                audio.currentTime = pos * audio.duration;
            }
        });
        
        // Handle audio loading
        audio.addEventListener('canplaythrough', () => {
            console.log('Audio can play through');
            button.innerHTML = '<i class="fas fa-pause"></i>';
            currentlyPlayingButton = button;
            currentlyPlayingAudio = audio;
            
            // Start playing
            const playPromise = audio.play();
            if (playPromise !== undefined) {
                playPromise.catch(error => {
                    console.error('Error playing audio:', error);
                    button.innerHTML = '<i class="fas fa-play"></i>';
                    showNotification('Error playing audio. Please try again.', 'error');
                });
            }
            
            // Create visualizer
            if (visualizerContainer) {
                console.log('Creating audio visualizer');
                try {
                    window.currentVisualizerCleanup = createAudioVisualizer(audio, visualizerContainer);
                } catch (e) {
                    console.error('Error creating visualizer:', e);
                }
            }
        });
        
        // Handle audio ended
        audio.addEventListener('ended', () => {
            console.log('Audio playback ended');
            button.innerHTML = '<i class="fas fa-play"></i>';
            currentlyPlayingButton = null;
            currentlyPlayingAudio = null;
            
            // Clean up visualizer
            if (window.currentVisualizerCleanup) {
                window.currentVisualizerCleanup();
                window.currentVisualizerCleanup = null;
            }
        });
        
        // Handle audio loading error
        audio.addEventListener('error', (e) => {
            console.error('Audio loading error:', e);
            button.innerHTML = '<i class="fas fa-play"></i>';
            showNotification('Error loading audio. Please try again.', 'error');
            
            // Log detailed error information
            const errorDetails = {
                code: audio.error ? audio.error.code : 'unknown',
                message: audio.error ? audio.error.message : 'unknown',
                src: audio.src
            };
            console.error('Audio error details:', errorDetails);
        });
        
        // Set timeout for loading
        const loadTimeout = setTimeout(() => {
            if (audio.readyState < 3) { // HAVE_FUTURE_DATA
                console.error('Audio loading timeout');
                button.innerHTML = '<i class="fas fa-play"></i>';
                showNotification('Audio loading timed out. Please try again.', 'error');
                audio.src = '';
            }
        }, 10000); // 10 second timeout
        
        // Clear timeout when audio can play
        audio.addEventListener('canplay', () => {
            console.log('Audio can play');
            clearTimeout(loadTimeout);
        });
        
        // Set the source after all event listeners are attached
        audio.crossOrigin = "anonymous";
        audio.src = audioUrl;
        
        // Start loading the audio
        audio.load();
    }
    
    function getTimeAgo(timestamp) {
        if (!timestamp) return 'Unknown time';
        
        const now = new Date();
        const then = new Date(timestamp);
        const diffMs = now - then;
        const diffSec = Math.floor(diffMs / 1000);
        const diffMin = Math.floor(diffSec / 60);
        const diffHour = Math.floor(diffMin / 60);
        const diffDay = Math.floor(diffHour / 24);
        
        if (diffDay > 0) return `${diffDay}d ago`;
        if (diffHour > 0) return `${diffHour}h ago`;
        if (diffMin > 0) return `${diffMin}m ago`;
        return 'Just now';
    }
    
    function getExpiryTime(timestamp, expirationHours = 24) {
        if (!timestamp) return 'Expires: Unknown';
        
        if (expirationHours === 0) return 'Never expires';
        
        const now = new Date();
        const then = new Date(timestamp);
        const expiryTime = new Date(then.getTime() + (expirationHours * 60 * 60 * 1000));
        const diffMs = expiryTime - now;
        
        if (diffMs <= 0) return 'Expired';
        
        const diffHour = Math.floor(diffMs / (1000 * 60 * 60));
        const diffMin = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
        
        return `Expires in: ${diffHour}h ${diffMin}m`;
    }
    
    function showNotification(message, type = 'info') {
        console.log(`Showing notification: ${message} (${type})`);
        
        const notificationContainer = document.getElementById('notification-container');
        if (!notificationContainer) return;
        
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        
        // Add icon based on type
        let icon = 'info-circle';
        if (type === 'success') icon = 'check-circle';
        if (type === 'error') icon = 'exclamation-circle';
        if (type === 'warning') icon = 'exclamation-triangle';
        
        notification.innerHTML = `
            <i class="fas fa-${icon}"></i>
            <span>${message}</span>
        `;
        
        // Add to container
        notificationContainer.appendChild(notification);
        
        // Remove after delay
        setTimeout(() => {
            notification.style.animation = 'fadeOut 0.5s forwards';
            setTimeout(() => {
                notification.remove();
            }, 500);
        }, 3000);
    }
    
    // Make notification function available globally
    window.showNotification = showNotification;
    
    // Setup event listeners
    function setupEventListeners() {
        // Whisper radius input
        whisperRadius.addEventListener('input', updateRadiusValue);
        
        // Whisper type select
        whisperTypeSelect.addEventListener('change', handleWhisperTypeChange);
        
        // Premium button
        premiumBtn.addEventListener('click', openPremiumModal);
        premiumFeaturesBtn.addEventListener('click', openPremiumModal);
        
        // Close modal button
        if (closeModal) {
            closeModal.addEventListener('click', closePremiumModal);
        }
        
        // Plan selection buttons
        planButtons.forEach(button => {
            button.addEventListener('click', selectPlan);
        });
        
        // Back to plans button
        const backToPlansBtn = document.getElementById('back-to-plans-btn');
        if (backToPlansBtn) {
            backToPlansBtn.addEventListener('click', showPlans);
        }
        
        // Payment form
        const paymentForm = document.getElementById('payment-form');
        if (paymentForm) {
            paymentForm.addEventListener('submit', processPayment);
        }
        
        // Ad close button
        if (adCloseBtn) {
            adCloseBtn.addEventListener('click', () => {
                adBanner.style.display = 'none';
            });
        }
        
        // Retry location button
        if (retryLocationBtn) {
            retryLocationBtn.addEventListener('click', requestGeolocation);
        }
        
        // Filter buttons
        filterButtons.forEach(button => {
            button.addEventListener('click', filterWhispers);
        });
        
        // Close profile modal
        const closeProfileModal = profileModal?.querySelector('.close-modal');
        if (closeProfileModal) {
            closeProfileModal.addEventListener('click', () => {
                profileModal.classList.remove('show');
            });
        }
        
        // User profile clicks
        document.addEventListener('click', (e) => {
            // Check if clicked element is a user avatar or name
            if (e.target.closest('.user-avatar') || e.target.classList.contains('user-name')) {
                const userId = e.target.closest('[data-user-id]')?.dataset.userId;
                if (userId) {
                    openUserProfile(userId);
                }
            }
        });
        
        // Comments toggle buttons
        document.addEventListener('click', (e) => {
            if (e.target.closest('.comments-toggle')) {
                const toggle = e.target.closest('.comments-toggle');
                const container = toggle.nextElementSibling;
                const isOpen = container.classList.contains('open');
                
                if (isOpen) {
                    container.classList.remove('open');
                    toggle.innerHTML = '<i class="fas fa-comments"></i> Show Comments';
                } else {
                    container.classList.add('open');
                    toggle.innerHTML = '<i class="fas fa-comments"></i> Hide Comments';
                }
            }
        });
    }
    
    // ... existing code ...
    
    // Initialize the app
    init();
}); 

/**
 * Load mock whispers data
 */
function loadMockWhispers() {
    return [
        {
            id: 'whisper1',
            userName: 'Sarah',
            userAvatar: 'public/images/default-avatar.png',
            timestamp: new Date(Date.now() - 15 * 60 * 1000).toISOString(), // 15 minutes ago
            location: 'Downtown Coffee Shop',
            duration: 45, // seconds
            likes: 12,
            comments: [
                { user: 'Mike', text: 'Great whisper!', timestamp: new Date(Date.now() - 5 * 60 * 1000).toISOString() }
            ],
            isPrivate: false,
            expirationHours: 24
        },
        {
            id: 'whisper2',
            userName: 'John',
            userAvatar: 'public/images/default-avatar.png',
            timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
            location: 'Central Park',
            duration: 28, // seconds
            likes: 5,
            comments: [],
            isPrivate: false,
            expirationHours: 24
        },
        {
            id: 'whisper3',
            userName: 'Premium User',
            userAvatar: 'public/images/default-avatar.png',
            timestamp: new Date(Date.now() - 30 * 60 * 1000).toISOString(), // 30 minutes ago
            location: 'Art Gallery',
            duration: 62, // seconds
            likes: 18,
            comments: [
                { user: 'Art Fan', text: 'Thanks for sharing!', timestamp: new Date(Date.now() - 15 * 60 * 1000).toISOString() },
                { user: 'Gallery Owner', text: 'Come visit us again!', timestamp: new Date(Date.now() - 10 * 60 * 1000).toISOString() }
            ],
            isPrivate: true,
            expirationHours: 0 // Never expires (premium feature)
        }
    ];
}

/**
 * Initialize geolocation
 */
function initGeolocation() {
    // Update location status
    locationStatus.textContent = 'Locating...';
    locationDot.classList.add('locating');
    
    // Request geolocation permission
    if (navigator.geolocation) {
        requestGeolocation();
    } else {
        locationStatus.textContent = 'Geolocation not supported';
        locationDot.classList.remove('locating');
        locationDot.classList.add('error');
    }
}

/**
 * Request geolocation permission
 */
function requestGeolocation() {
    navigator.geolocation.getCurrentPosition(
        position => {
            // Success
            currentPosition = {
                latitude: position.coords.latitude,
                longitude: position.coords.longitude
            };
            
            // Update location status
            locationStatus.textContent = 'Location found';
            locationDot.classList.remove('locating');
            locationDot.classList.add('success');
            
            // Play sound effect
            playSoundEffect('location');
            
            // Load whispers
            loadMockWhispers();
        },
        error => {
            // Error
            locationStatus.textContent = 'Location error: ' + getGeolocationErrorMessage(error);
            locationDot.classList.remove('locating');
            locationDot.classList.add('error');
            
            // Play sound effect
            playSoundEffect('error');
            
            // Show retry button
            retryLocationBtn.style.display = 'inline-block';
        },
        {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0
        }
    );
}

/**
 * Open user profile modal
 * @param {string} userId - The user ID
 */
function openUserProfile(userId) {
    // Fetch user data (simulated)
    const userData = {
        id: userId,
        name: 'User ' + userId.substring(0, 4),
        avatar: 'public/images/default-avatar.png',
        whispers: 12,
        following: 45,
        followers: 78
    };
    
    // Update profile modal with user data
    document.getElementById('profile-name').textContent = userData.name;
    document.getElementById('profile-avatar-img').src = userData.avatar;
    document.querySelector('.whispers-count').textContent = userData.whispers;
    document.querySelector('.following-count').textContent = userData.following;
    document.querySelector('.followers-count').textContent = userData.followers;
    
    // Set follow button state
    const followButton = profileModal.querySelector('.follow-button');
    followButton.dataset.userId = userId;
    
    // Check if user is already following this profile
    const isFollowing = window.socialFeatures?.following?.includes(userId);
    if (isFollowing) {
        followButton.classList.add('following');
        followButton.textContent = 'Following';
    } else {
        followButton.classList.remove('following');
        followButton.textContent = 'Follow';
    }
    
    // Show modal
    profileModal.classList.add('show');
}

/**
 * Get a human-readable error message for geolocation errors
 * @param {GeolocationPositionError} error - The geolocation error
 * @returns {string} Human-readable error message
 */
function getGeolocationErrorMessage(error) {
    switch (error.code) {
        case error.PERMISSION_DENIED:
            return 'Location permission denied';
        case error.POSITION_UNAVAILABLE:
            return 'Location information unavailable';
        case error.TIMEOUT:
            return 'Location request timed out';
        default:
            return 'Unknown location error';
    }
}

// Add these functions for audio visualization
function createAudioVisualizer(audioElement, container) {
    // Check if Web Audio API is supported
    if (!window.AudioContext && !window.webkitAudioContext) {
        console.log('Web Audio API not supported');
        return null;
    }
    
    // Create audio context
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 256;
    
    // Create source from audio element
    const source = audioContext.createMediaElementSource(audioElement);
    source.connect(analyser);
    analyser.connect(audioContext.destination);
    
    // Create canvas for visualization
    const canvas = document.createElement('canvas');
    canvas.className = 'audio-visualizer';
    canvas.width = container.clientWidth;
    canvas.height = 50;
    container.appendChild(canvas);
    
    const canvasCtx = canvas.getContext('2d');
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    
    // Function to draw visualization
    function draw() {
        // Only continue if audio is playing
        if (audioElement.paused) {
            return;
        }
        
        requestAnimationFrame(draw);
        
        analyser.getByteFrequencyData(dataArray);
        
        canvasCtx.clearRect(0, 0, canvas.width, canvas.height);
        
        const barWidth = (canvas.width / bufferLength) * 2.5;
        let barHeight;
        let x = 0;
        
        // Draw gradient background
        const gradient = canvasCtx.createLinearGradient(0, 0, canvas.width, 0);
        gradient.addColorStop(0, '#4cc9f0');
        gradient.addColorStop(1, '#4361ee');
        
        for (let i = 0; i < bufferLength; i++) {
            barHeight = dataArray[i] / 2;
            
            canvasCtx.fillStyle = gradient;
            canvasCtx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);
            
            x += barWidth + 1;
        }
    }
    
    // Start visualization
    draw();
    
    // Return cleanup function
    return function cleanup() {
        if (canvas && canvas.parentNode) {
            canvas.parentNode.removeChild(canvas);
        }
        if (source) {
            source.disconnect();
        }
    };
}

// Helper function to format time in MM:SS format
function formatTime(seconds) {
    if (!seconds || isNaN(seconds)) return '0:00';
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}

// Handle avatar style selection
function setupAvatarStyleSelection() {
    const avatarStyleOptions = document.querySelectorAll('.avatar-style-option');
    if (!avatarStyleOptions.length) return;
    
    avatarStyleOptions.forEach(option => {
        option.addEventListener('click', function() {
            // Remove selected class from all options
            avatarStyleOptions.forEach(opt => opt.classList.remove('selected'));
            
            // Add selected class to clicked option
            this.classList.add('selected');
            
            // Get the style
            const style = this.getAttribute('data-style');
            
            // Update the current avatar preview
            const currentAvatarImg = document.getElementById('current-avatar-img');
            if (currentAvatarImg) {
                currentAvatarImg.src = `public/images/avatar-${style}.png`;
            }
            
            // Store the selected style
            if (window.authModule && window.authModule.getCurrentUser()) {
                const currentUser = window.authModule.getCurrentUser();
                currentUser.avatarStyle = style;
                localStorage.setItem('whispermap_user_data', JSON.stringify(currentUser));
            }
        });
    });
}

// Handle profile theme selection
function setupProfileThemeSelection() {
    const themeSelect = document.getElementById('profile-theme');
    if (!themeSelect) return;
    
    themeSelect.addEventListener('change', function() {
        const selectedTheme = this.value;
        
        // Store the selected theme
        if (window.authModule && window.authModule.getCurrentUser()) {
            const currentUser = window.authModule.getCurrentUser();
            currentUser.theme = selectedTheme;
            localStorage.setItem('whispermap_user_data', JSON.stringify(currentUser));
            
            // Apply theme (in a real app, this would apply CSS changes)
            applyUserTheme(selectedTheme);
        }
    });
}

// Apply user theme
function applyUserTheme(theme) {
    // Remove any existing theme classes
    document.body.classList.remove('theme-dark', 'theme-light', 'theme-blue', 'theme-purple', 'theme-green');
    
    // Add the new theme class if not default
    if (theme && theme !== 'default') {
        document.body.classList.add(`theme-${theme}`);
    }
}

// ... existing code ... 