/**
 * WhisperMap Payment Processing Module
 * Handles payment processing for premium features using Stripe
 */

// Initialize payment module when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('Payment module initialized');
    
    // DOM Elements
    const premiumBtn = document.getElementById('premium-btn');
    const premiumFeaturesBtn = document.getElementById('premium-features-btn');
    const premiumModal = document.getElementById('premium-modal');
    const closeModalBtns = document.querySelectorAll('.close-modal');
    const planSelectBtns = document.querySelectorAll('.plan-select-btn');
    const paymentForm = document.getElementById('payment-form');
    const backToPlanBtn = document.getElementById('back-to-plans-btn');
    const completePaymentBtn = document.getElementById('complete-payment-btn');
    const selectedPlanName = document.getElementById('selected-plan-name');
    const selectedPlanPrice = document.getElementById('selected-plan-price');
    const paymentProcessing = document.querySelector('.payment-processing');
    const paymentSuccess = document.querySelector('.payment-success-animation');
    const pricingOptions = document.querySelector('.pricing-options');
    
    // Server URL (same as in app.js)
    const SERVER_URL = (() => {
        const currentUrl = window.location.href;
        if (currentUrl.includes('ngrok') || !currentUrl.includes('localhost')) {
            const urlObj = new URL(currentUrl);
            return `${urlObj.protocol}//${urlObj.host}`;
        }
        return 'http://localhost:9000';
    })();
    
    // Stripe initialization
    let stripe = null;
    let cardElement = null;
    let selectedPlan = null;
    
    try {
        stripe = Stripe('pk_test_TYooMQauvdEDq54NiTphI7jx'); // Replace with your publishable key
    } catch (error) {
        console.error('Failed to initialize Stripe:', error);
    }
    
    // Event Listeners
    if (premiumBtn) premiumBtn.addEventListener('click', openPremiumModal);
    if (premiumFeaturesBtn) premiumFeaturesBtn.addEventListener('click', openPremiumModal);
    
    closeModalBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            const modal = this.closest('.modal');
            closeModal(modal);
        });
    });
    
    planSelectBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            const planCard = this.closest('.pricing-card');
            selectPlan(planCard.getAttribute('data-plan'));
        });
    });
    
    if (backToPlanBtn) backToPlanBtn.addEventListener('click', showPlanSelection);
    
    if (paymentForm) paymentForm.addEventListener('submit', handlePaymentSubmission);
    
    // Initialize Stripe Elements
    initializeStripe();
    
    // Functions
    function openPremiumModal() {
        console.log('Opening premium modal');
        
        // Check if user is logged in
        if (!window.authModule || !window.authModule.isLoggedIn()) {
            console.log('User not logged in, opening auth modal');
            if (window.authModule) {
                window.authModule.openAuthModal();
            } else {
                if (window.showNotification) {
                    window.showNotification('Please log in to access premium features', 'info');
                }
            }
            return;
        }
        
        if (premiumModal) {
            premiumModal.style.display = 'flex';
            document.body.classList.add('modal-open');
            
            // Reset modal state
            showPlanSelection();
        }
    }
    
    function closeModal(modal) {
        console.log('Closing modal');
        if (modal) {
            modal.style.display = 'none';
            document.body.classList.remove('modal-open');
        }
    }
    
    function selectPlan(plan) {
        console.log('Selected plan:', plan);
        selectedPlan = plan;
        
        // Update selected plan info
        let planName, planPrice;
        
        switch (plan) {
            case 'monthly':
                planName = 'Monthly';
                planPrice = '$4.99';
                break;
            case 'yearly':
                planName = 'Yearly';
                planPrice = '$39.99';
                break;
            case 'lifetime':
                planName = 'Lifetime';
                planPrice = '$99.99';
                break;
            default:
                planName = 'Unknown';
                planPrice = '$0.00';
        }
        
        if (selectedPlanName) selectedPlanName.textContent = planName;
        if (selectedPlanPrice) selectedPlanPrice.textContent = planPrice;
        
        // Show payment form
        if (pricingOptions) pricingOptions.style.display = 'none';
        if (paymentForm) paymentForm.style.display = 'block';
    }
    
    function showPlanSelection() {
        console.log('Showing plan selection');
        
        // Hide payment form and show pricing options
        if (paymentForm) paymentForm.style.display = 'none';
        if (pricingOptions) pricingOptions.style.display = 'flex';
        
        // Hide processing and success states
        if (paymentProcessing) paymentProcessing.style.display = 'none';
        if (paymentSuccess) paymentSuccess.style.display = 'none';
    }
    
    function initializeStripe() {
        console.log('Initializing Stripe');
        
        if (!stripe) {
            console.error('Stripe not initialized');
            return;
        }
        
        const elements = stripe.elements();
        
        // Create card element
        cardElement = elements.create('card', {
            style: {
                base: {
                    color: '#32325d',
                    fontFamily: '"Roboto", Helvetica, sans-serif',
                    fontSmoothing: 'antialiased',
                    fontSize: '16px',
                    '::placeholder': {
                        color: '#aab7c4'
                    }
                },
                invalid: {
                    color: '#fa755a',
                    iconColor: '#fa755a'
                }
            }
        });
        
        // Mount card element
        const cardElementContainer = document.getElementById('card-element');
        if (cardElementContainer) {
            cardElement.mount('#card-element');
            
            // Handle validation errors
            cardElement.on('change', function(event) {
                const displayError = document.getElementById('card-errors');
                if (displayError) {
                    if (event.error) {
                        displayError.textContent = event.error.message;
                    } else {
                        displayError.textContent = '';
                    }
                }
            });
        }
    }
    
    async function handlePaymentSubmission(e) {
        e.preventDefault();
        console.log('Payment form submitted');
        
        if (!stripe || !cardElement) {
            console.error('Stripe not initialized');
            return;
        }
        
        // Get cardholder name
        const cardholderName = document.getElementById('card-name').value;
        
        if (!cardholderName) {
            const cardErrors = document.getElementById('card-errors');
            if (cardErrors) {
                cardErrors.textContent = 'Please enter the name on your card';
            }
            return;
        }
        
        // Show processing state
        if (paymentForm) paymentForm.style.display = 'none';
        if (paymentProcessing) paymentProcessing.style.display = 'flex';
        
        try {
            // For demo purposes, we'll simulate a successful payment
            // In a real app, you would create a payment intent on your server
            // and confirm the payment with Stripe
            
            // Simulate API call delay
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            // Show success animation
            if (paymentProcessing) paymentProcessing.style.display = 'none';
            if (paymentSuccess) paymentSuccess.style.display = 'flex';
            
            // Update user to premium
            const userData = localStorage.getItem('whispermap_user');
            if (userData) {
                const user = JSON.parse(userData);
                user.isPremium = true;
                localStorage.setItem('whispermap_user', JSON.stringify(user));
                
                // Update UI for premium user
                document.querySelectorAll('.premium-only').forEach(el => {
                    el.classList.remove('disabled');
                });
                
                // Show premium badge
                const premiumBadge = document.getElementById('premium-badge');
                if (premiumBadge) {
                    premiumBadge.classList.remove('hidden');
                }
                
                // Hide ads
                const adBanner = document.getElementById('ad-banner');
                if (adBanner) {
                    adBanner.classList.add('hidden');
                }
            }
            
            // Save payment record
            savePaymentRecord(selectedPlan);
            
            // Close modal after delay
            setTimeout(() => {
                closeModal(premiumModal);
                
                // Show success notification
                if (window.showNotification) {
                    window.showNotification('You are now a premium user!', 'success');
                }
            }, 3000);
            
        } catch (error) {
            console.error('Payment error:', error);
            
            // Show error
            if (paymentProcessing) paymentProcessing.style.display = 'none';
            if (paymentForm) paymentForm.style.display = 'block';
            
            const cardErrors = document.getElementById('card-errors');
            if (cardErrors) {
                cardErrors.textContent = 'Payment failed. Please try again.';
            }
        }
    }
    
    function savePaymentRecord(plan) {
        console.log('Saving payment record for plan:', plan);
        
        // Get current user
        const userData = localStorage.getItem('whispermap_user');
        if (!userData) {
            console.error('No user data found');
            return;
        }
        
        const user = JSON.parse(userData);
        
        // Prepare payment record
        let amount, currency;
        
        switch (plan) {
            case 'monthly':
                amount = 4.99;
                break;
            case 'yearly':
                amount = 39.99;
                break;
            case 'lifetime':
                amount = 99.99;
                break;
            default:
                amount = 0;
        }
        
        currency = 'USD';
        
        const paymentRecord = {
            userId: user.id,
            plan: plan,
            amount: amount,
            currency: currency,
            paymentId: 'pi_' + Math.random().toString(36).substr(2, 9),
            timestamp: new Date().toISOString()
        };
        
        // Send to server
        fetch(`${SERVER_URL}/api/payments`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(paymentRecord)
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Failed to save payment record');
            }
            return response.json();
        })
        .then(data => {
            console.log('Payment record saved:', data);
        })
        .catch(error => {
            console.error('Error saving payment record:', error);
        });
    }
    
    // Expose functions to window for use in other modules
    window.paymentModule = {
        openPremiumModal,
        savePaymentRecord
    };
}); 