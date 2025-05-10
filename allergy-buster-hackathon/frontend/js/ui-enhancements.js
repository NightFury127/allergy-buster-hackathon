/**
 * AllergyBuster UI Enhancements
 * Adds smooth transitions, responsive navigation, and other UI improvements
 */

document.addEventListener('DOMContentLoaded', function() {
    // Initialize UI components
    initNavigation();
    initScrollEffects();
    initTabSystem();
    initModals();
    initTooltips();
    initAnimations();
    initFormValidation();
    initAccessibility();
});

/**
 * Initialize responsive navigation
 */
function initNavigation() {
    const navToggle = document.getElementById('nav-toggle');
    const navClose = document.getElementById('nav-close');
    const mainNav = document.getElementById('main-nav');
    const navLinks = document.querySelectorAll('.nav-link');

    // Toggle mobile navigation
    if (navToggle) {
        navToggle.addEventListener('click', function() {
            mainNav.classList.add('active');
            document.body.style.overflow = 'hidden'; // Prevent scrolling when nav is open
        });
    }

    // Close mobile navigation
    if (navClose) {
        navClose.addEventListener('click', function() {
            mainNav.classList.remove('active');
            document.body.style.overflow = ''; // Restore scrolling
        });
    }

    // Handle navigation link clicks
    navLinks.forEach(link => {
        link.addEventListener('click', function() {
            // Close mobile navigation when a link is clicked
            if (window.innerWidth <= 768) {
                mainNav.classList.remove('active');
                document.body.style.overflow = '';
            }

            // Set active link
            navLinks.forEach(l => l.classList.remove('active'));
            this.classList.add('active');

            // Smooth scroll to section
            const targetId = this.getAttribute('href').substring(1);
            const targetSection = document.getElementById(targetId);
            if (targetSection) {
                // Hide all sections
                document.querySelectorAll('.content-section').forEach(section => {
                    section.classList.remove('active');
                });
                
                // Show target section with animation
                targetSection.classList.add('active');
                targetSection.classList.add('page-transition');
                
                // Remove animation class after transition completes
                setTimeout(() => {
                    targetSection.classList.remove('page-transition');
                }, 500);
            }
        });
    });
}

/**
 * Initialize scroll effects
 */
function initScrollEffects() {
    const header = document.querySelector('.header');
    
    // Add shadow to header on scroll
    window.addEventListener('scroll', function() {
        if (window.scrollY > 10) {
            header.classList.add('scrolled');
        } else {
            header.classList.remove('scrolled');
        }
    });
}

/**
 * Initialize tab system
 */
function initTabSystem() {
    const tabButtons = document.querySelectorAll('.tab-btn');
    
    tabButtons.forEach(button => {
        button.addEventListener('click', function() {
            const tabContainer = this.closest('.tabs').parentElement;
            const tabId = this.getAttribute('data-tab');
            
            // Remove active class from all buttons and content
            tabContainer.querySelectorAll('.tab-btn').forEach(btn => {
                btn.classList.remove('active');
            });
            
            tabContainer.querySelectorAll('.tab-content').forEach(content => {
                content.classList.remove('active');
            });
            
            // Add active class to clicked button and corresponding content
            this.classList.add('active');
            const tabContent = tabContainer.querySelector(`#${tabId}`);
            if (tabContent) {
                tabContent.classList.add('active');
            }
        });
    });
}

/**
 * Initialize modals
 */
function initModals() {
    const modalTriggers = document.querySelectorAll('[data-modal]');
    const modalCloseButtons = document.querySelectorAll('.close-modal');
    
    // Open modal
    modalTriggers.forEach(trigger => {
        trigger.addEventListener('click', function() {
            const modalId = this.getAttribute('data-modal');
            const modal = document.getElementById(modalId);
            
            if (modal) {
                modal.style.display = 'flex';
                document.body.style.overflow = 'hidden'; // Prevent scrolling when modal is open
                
                // Add animation
                setTimeout(() => {
                    modal.classList.add('active');
                }, 10);
            }
        });
    });
    
    // Close modal
    modalCloseButtons.forEach(button => {
        button.addEventListener('click', function() {
            const modal = this.closest('.modal');
            
            if (modal) {
                modal.classList.remove('active');
                
                // Wait for animation to complete before hiding
                setTimeout(() => {
                    modal.style.display = 'none';
                    document.body.style.overflow = ''; // Restore scrolling
                }, 300);
            }
        });
    });
    
    // Close modal when clicking outside
    window.addEventListener('click', function(event) {
        if (event.target.classList.contains('modal')) {
            event.target.classList.remove('active');
            
            // Wait for animation to complete before hiding
            setTimeout(() => {
                event.target.style.display = 'none';
                document.body.style.overflow = ''; // Restore scrolling
            }, 300);
        }
    });
}

/**
 * Initialize tooltips
 */
function initTooltips() {
    const tooltipTriggers = document.querySelectorAll('[data-tooltip]');
    
    tooltipTriggers.forEach(trigger => {
        trigger.addEventListener('mouseenter', function() {
            const tooltipText = this.getAttribute('data-tooltip');
            
            // Create tooltip element
            const tooltip = document.createElement('div');
            tooltip.classList.add('tooltip');
            tooltip.textContent = tooltipText;
            
            // Position tooltip
            document.body.appendChild(tooltip);
            const triggerRect = this.getBoundingClientRect();
            tooltip.style.top = `${triggerRect.top - tooltip.offsetHeight - 10}px`;
            tooltip.style.left = `${triggerRect.left + (triggerRect.width / 2) - (tooltip.offsetWidth / 2)}px`;
            
            // Add animation
            setTimeout(() => {
                tooltip.classList.add('active');
            }, 10);
            
            // Store tooltip reference
            this.tooltip = tooltip;
        });
        
        trigger.addEventListener('mouseleave', function() {
            if (this.tooltip) {
                this.tooltip.classList.remove('active');
                
                // Wait for animation to complete before removing
                setTimeout(() => {
                    document.body.removeChild(this.tooltip);
                    this.tooltip = null;
                }, 300);
            }
        });
    });
}

/**
 * Initialize animations
 */
function initAnimations() {
    // Add fade-in animation to elements with .animate-fade-in class
    const fadeElements = document.querySelectorAll('.animate-fade-in');
    
    fadeElements.forEach(element => {
        // Check if element is in viewport
        const observer = new IntersectionObserver(entries => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('visible');
                    observer.unobserve(entry.target);
                }
            });
        });
        
        observer.observe(element);
    });
}

/**
 * Initialize form validation
 */
function initFormValidation() {
    const forms = document.querySelectorAll('form');
    
    forms.forEach(form => {
        const inputs = form.querySelectorAll('input, textarea, select');
        
        inputs.forEach(input => {
            // Add validation on blur
            input.addEventListener('blur', function() {
                validateInput(this);
            });
            
            // Add validation on input
            input.addEventListener('input', function() {
                if (this.classList.contains('invalid')) {
                    validateInput(this);
                }
            });
        });
        
        // Validate form on submit
        form.addEventListener('submit', function(event) {
            let isValid = true;
            
            inputs.forEach(input => {
                if (!validateInput(input)) {
                    isValid = false;
                }
            });
            
            if (!isValid) {
                event.preventDefault();
            }
        });
    });
}

/**
 * Validate input field
 * @param {HTMLElement} input - Input element to validate
 * @returns {boolean} - Whether the input is valid
 */
function validateInput(input) {
    // Skip validation for disabled or readonly inputs
    if (input.disabled || input.readOnly) {
        return true;
    }
    
    let isValid = true;
    const errorMessage = input.nextElementSibling?.classList.contains('error-message') 
        ? input.nextElementSibling 
        : null;
    
    // Required validation
    if (input.required && !input.value.trim()) {
        isValid = false;
        showError(input, errorMessage, 'This field is required');
    }
    
    // Email validation
    else if (input.type === 'email' && input.value.trim() && !validateEmail(input.value)) {
        isValid = false;
        showError(input, errorMessage, 'Please enter a valid email address');
    }
    
    // Password validation
    else if (input.type === 'password' && input.value.trim() && input.value.length < 8) {
        isValid = false;
        showError(input, errorMessage, 'Password must be at least 8 characters');
    }
    
    // Valid input
    else {
        input.classList.remove('invalid');
        if (errorMessage) {
            errorMessage.textContent = '';
            errorMessage.style.display = 'none';
        }
    }
    
    return isValid;
}

/**
 * Show error message for input
 * @param {HTMLElement} input - Input element
 * @param {HTMLElement} errorMessage - Error message element
 * @param {string} message - Error message text
 */
function showError(input, errorMessage, message) {
    input.classList.add('invalid');
    
    if (!errorMessage) {
        errorMessage = document.createElement('div');
        errorMessage.classList.add('error-message');
        input.parentNode.insertBefore(errorMessage, input.nextSibling);
    }
    
    errorMessage.textContent = message;
    errorMessage.style.display = 'block';
}

/**
 * Validate email format
 * @param {string} email - Email to validate
 * @returns {boolean} - Whether the email is valid
 */
function validateEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
}

/**
 * Initialize accessibility improvements
 */
function initAccessibility() {
    // Add aria-labels to buttons without text
    const buttonsWithoutText = document.querySelectorAll('button:not([aria-label])');
    
    buttonsWithoutText.forEach(button => {
        if (!button.textContent.trim() && button.querySelector('i')) {
            const iconClass = button.querySelector('i').className;
            let label = '';
            
            if (iconClass.includes('fa-search')) {
                label = 'Search';
            } else if (iconClass.includes('fa-bars')) {
                label = 'Open menu';
            } else if (iconClass.includes('fa-times')) {
                label = 'Close';
            } else if (iconClass.includes('fa-paper-plane')) {
                label = 'Send message';
            }
            
            if (label) {
                button.setAttribute('aria-label', label);
            }
        }
    });
}
