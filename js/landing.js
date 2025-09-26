// Landing page interactions and animations

// Smooth scrolling for navigation links
function initSmoothScrolling() {
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            
            if (target) {
                const headerHeight = document.querySelector('.header').offsetHeight;
                const targetPosition = target.getBoundingClientRect().top + window.pageYOffset - headerHeight - 20;
                
                window.scrollTo({
                    top: targetPosition,
                    behavior: 'smooth'
                });
                
                // Update URL without triggering scroll
                history.pushState(null, null, this.getAttribute('href'));
            }
        });
    });
}

// Counter animation for stats
function animateStats() {
    const stats = document.querySelectorAll('.stat-number');
    
    const observerOptions = {
        threshold: 0.5,
        rootMargin: '0px 0px -50px 0px'
    };
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const stat = entry.target;
                const finalValue = stat.textContent;
                
                // Extract number and suffix
                const number = parseInt(finalValue.replace(/\D/g, ''));
                const suffix = finalValue.replace(/[\d,]/g, '');
                
                animateValue(stat, 0, number, 2000, suffix);
                observer.unobserve(stat);
            }
        });
    }, observerOptions);
    
    stats.forEach(stat => observer.observe(stat));
}

// Animate counter values
function animateValue(element, start, end, duration, suffix = '') {
    if (start === end) return;
    
    const increment = end / (duration / 16); // 60 FPS
    let current = start;
    
    const timer = setInterval(() => {
        current += increment;
        
        if (current >= end) {
            current = end;
            clearInterval(timer);
        }
        
        // Format number with suffix
        let displayValue = Math.floor(current);
        if (displayValue >= 1000) {
            displayValue = (displayValue / 1000).toFixed(displayValue % 1000 === 0 ? 0 : 1) + 'K';
        }
        
        element.textContent = displayValue + suffix;
    }, 16);
}

// Fade in animations on scroll
function initScrollAnimations() {
    // Skip animations if user prefers reduced motion
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        return;
    }
    
    const animatedElements = document.querySelectorAll('.feature-card, .benefit, .stat-item');
    
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.animation = 'fadeInUp 0.6s ease forwards';
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);
    
    animatedElements.forEach(el => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(20px)';
        observer.observe(el);
    });
}

// Parallax effect for hero background
function initParallaxEffect() {
    // Skip parallax if user prefers reduced motion
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        return;
    }
    
    const hero = document.querySelector('.hero');
    if (!hero) return;
    
    let ticking = false;
    
    function updateParallax() {
        const scrolled = window.pageYOffset;
        const parallax = scrolled * 0.3;
        
        hero.style.backgroundPosition = `center ${parallax}px`;
        ticking = false;
    }
    
    function requestTick() {
        if (!ticking) {
            requestAnimationFrame(updateParallax);
            ticking = true;
        }
    }
    
    window.addEventListener('scroll', requestTick);
}

// Initialize progressive image loading
function initProgressiveImageLoading() {
    const images = document.querySelectorAll('img[loading="lazy"]');
    
    if ('IntersectionObserver' in window) {
        const imageObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const img = entry.target;
                    
                    // Add loading state
                    img.style.filter = 'blur(5px)';
                    img.style.transition = 'filter 0.3s ease';
                    
                    img.addEventListener('load', () => {
                        img.style.filter = 'none';
                    });
                    
                    // Add error handling
                    img.addEventListener('error', () => {
                        img.style.filter = 'none';
                        img.alt = currentLanguage === 'hi' ? 'चित्र लोड नहीं हो सका' : 'Image failed to load';
                    });
                    
                    imageObserver.unobserve(img);
                }
            });
        });
        
        images.forEach(img => imageObserver.observe(img));
    }
}

// Add hover effects for interactive elements
function initHoverEffects() {
    // Feature cards hover effect
    const featureCards = document.querySelectorAll('.feature-card');
    
    featureCards.forEach(card => {
        card.addEventListener('mouseenter', () => {
            if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
                card.style.transform = 'translateY(-8px) scale(1.02)';
            }
        });
        
        card.addEventListener('mouseleave', () => {
            card.style.transform = 'translateY(0) scale(1)';
        });
        
        // Add focus effects for keyboard navigation
        card.addEventListener('focus', () => {
            card.style.outline = '3px solid #a7c957';
            card.style.outlineOffset = '2px';
        });
        
        card.addEventListener('blur', () => {
            card.style.outline = 'none';
        });
    });
    
    // Button hover effects
    const buttons = document.querySelectorAll('.btn');
    
    buttons.forEach(button => {
        button.addEventListener('mouseenter', () => {
            if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
                button.style.transform = 'translateY(-2px)';
            }
        });
        
        button.addEventListener('mouseleave', () => {
            button.style.transform = 'translateY(0)';
        });
    });
}

// Implement keyboard navigation enhancements
function initKeyboardNavigation() {
    // Skip links for screen readers
    const skipLink = document.createElement('a');
    skipLink.href = '#main-content';
    skipLink.textContent = currentLanguage === 'hi' ? 'मुख्य सामग्री पर जाएं' : 'Skip to main content';
    skipLink.className = 'sr-only';
    skipLink.style.cssText = `
        position: absolute;
        top: -40px;
        left: 6px;
        background: #2d6a4f;
        color: white;
        padding: 8px 16px;
        text-decoration: none;
        border-radius: 4px;
        z-index: 1000;
        transition: top 0.3s ease;
    `;
    
    skipLink.addEventListener('focus', () => {
        skipLink.style.top = '6px';
    });
    
    skipLink.addEventListener('blur', () => {
        skipLink.style.top = '-40px';
    });
    
    document.body.insertBefore(skipLink, document.body.firstChild);
    
    // Add main content landmark
    const heroSection = document.querySelector('.hero');
    if (heroSection) {
        heroSection.id = 'main-content';
        heroSection.setAttribute('role', 'main');
    }
}

// Handle reduced motion preferences
function handleReducedMotion() {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    
    function handleChange(e) {
        if (e.matches) {
            // Disable animations
            document.documentElement.style.setProperty('--animation-duration', '0.01ms');
            document.documentElement.style.setProperty('--transition-duration', '0.01ms');
        } else {
            // Re-enable animations
            document.documentElement.style.removeProperty('--animation-duration');
            document.documentElement.style.removeProperty('--transition-duration');
        }
    }
    
    mediaQuery.addListener(handleChange);
    handleChange(mediaQuery); // Check initial state
}

// Initialize performance monitoring
function initPerformanceMonitoring() {
    if ('PerformanceObserver' in window) {
        // Monitor Largest Contentful Paint
        const observer = new PerformanceObserver((list) => {
            const entries = list.getEntries();
            const lastEntry = entries[entries.length - 1];
            
            // Log LCP for debugging
            console.log('LCP:', lastEntry.startTime);
            
            // If LCP is too slow, show a loading message
            if (lastEntry.startTime > 2500) {
                console.warn('Slow loading detected');
            }
        });
        
        try {
            observer.observe({ entryTypes: ['largest-contentful-paint'] });
        } catch (e) {
            // Silently handle unsupported browsers
            console.log('Performance monitoring not supported');
        }
    }
}

// Handle form interactions
function initFormInteractions() {
    // Add focus management for forms
    const forms = document.querySelectorAll('form');
    
    forms.forEach(form => {
        const inputs = form.querySelectorAll('input, textarea, select');
        
        inputs.forEach((input, index) => {
            input.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' && input.type !== 'textarea') {
                    e.preventDefault();
                    
                    // Move to next input or submit
                    const nextInput = inputs[index + 1];
                    if (nextInput) {
                        nextInput.focus();
                    } else {
                        const submitButton = form.querySelector('button[type="submit"], input[type="submit"]');
                        if (submitButton) {
                            submitButton.click();
                        }
                    }
                }
            });
        });
    });
}

// Initialize all landing page functionality
function initLandingPage() {
    // Core functionality
    initSmoothScrolling();
    initKeyboardNavigation();
    initFormInteractions();
    
    // Visual enhancements (respecting motion preferences)
    handleReducedMotion();
    initScrollAnimations();
    initHoverEffects();
    initParallaxEffect();
    
    // Performance and accessibility
    initProgressiveImageLoading();
    initPerformanceMonitoring();
    
    // Animation triggers
    setTimeout(() => {
        animateStats();
    }, 500);
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', initLandingPage);

// Handle page visibility changes
document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
        // Resume animations if page becomes visible
        document.querySelectorAll('.stat-number').forEach(stat => {
            if (stat.textContent === '0' || stat.textContent === '0+') {
                // Re-trigger animation if needed
                const rect = stat.getBoundingClientRect();
                if (rect.top < window.innerHeight && rect.bottom > 0) {
                    animateStats();
                }
            }
        });
    }
});

// Export functions for testing
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        animateValue,
        initSmoothScrolling,
        initKeyboardNavigation
    };
}