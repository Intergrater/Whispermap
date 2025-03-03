/**
 * WhisperMap Accessibility Enhancements
 * This file contains functions to improve the accessibility of the WhisperMap application
 */

document.addEventListener('DOMContentLoaded', function() {
    // Initialize accessibility enhancements
    initAccessibilityFeatures();
});

/**
 * Initialize all accessibility features
 */
function initAccessibilityFeatures() {
    console.log('Initializing accessibility features...');
    
    // Ensure hidden elements don't contain focusable elements
    ensureHiddenElementsNotFocusable();
    
    // Add event listener to handle dynamic content changes
    observeDOMChanges();
    
    console.log('Accessibility features initialized');
}

/**
 * Ensure that elements with class="hidden" don't contain focusable elements
 * This prevents screen readers from focusing on elements that are visually hidden
 */
function ensureHiddenElementsNotFocusable() {
    const hiddenElements = document.querySelectorAll('.hidden');
    
    hiddenElements.forEach(element => {
        // Find all focusable elements within the hidden element
        const focusableElements = element.querySelectorAll(
            'a, button, input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        
        // Set tabindex="-1" to prevent focusing
        focusableElements.forEach(focusable => {
            focusable.setAttribute('tabindex', '-1');
            console.log('Set tabindex=-1 on hidden focusable element:', focusable);
        });
    });
}

/**
 * Observe DOM changes to reapply accessibility enhancements when content changes
 */
function observeDOMChanges() {
    // Create a MutationObserver to watch for DOM changes
    const observer = new MutationObserver(function(mutations) {
        mutations.forEach(function(mutation) {
            if (mutation.type === 'childList' || mutation.type === 'attributes') {
                // Reapply accessibility enhancements
                ensureHiddenElementsNotFocusable();
            }
        });
    });
    
    // Start observing the document with the configured parameters
    observer.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['class']
    });
} 