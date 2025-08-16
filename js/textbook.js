document.addEventListener('DOMContentLoaded', function() {
    // Cache DOM elements
    const nav = document.getElementById('nav-menu');
    const tocButton = document.querySelector('.toc-button');
    const searchContainer = document.createElement('div');
    const searchInput = document.createElement('input');

    // Debug: Check if elements are found
    if (!tocButton) {
        console.error('TOC button (.toc-button) not found in the DOM.');
    }
    if (!nav) {
        console.error('Navigation menu (#nav-menu) not found in the DOM.');
    }

    // Initialize search bar
    searchContainer.id = 'search-container';
    searchInput.type = 'text';
    searchInput.id = 'toc-search';
    searchInput.placeholder = 'Search...';
    searchContainer.appendChild(searchInput);
    document.body.insertBefore(searchContainer, document.body.firstChild);

    // Debug: Confirm search container added
    console.log('Search container added to DOM:', searchContainer);

    // Toggle navigation menu
    function toggleNav() {
        const isOpen = nav.classList.toggle('open');
        tocButton.setAttribute('aria-expanded', isOpen);
        tocButton.textContent = isOpen ? '|||' : '|||';
        console.log('TOC toggled. Is open:', isOpen);
    }

    // Handle clicks outside nav on mobile
    document.addEventListener('click', function(event) {
        if (window.innerWidth <= 768 && 
            !nav.contains(event.target) && 
            event.target !== tocButton && 
            !searchContainer.contains(event.target)) {
            nav.classList.remove('open');
            tocButton.setAttribute('aria-expanded', 'false');
            tocButton.textContent = '|||';
            console.log('TOC closed due to outside click on mobile.');
        }
    });

    // Smooth scroll to sections
    const navLinks = nav.querySelectorAll('a[href^="#"]');
    navLinks.forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            e.preventDefault();
            const targetId = this.getAttribute('href');
            try {
                const targetElement = document.querySelector(targetId);
                if (targetElement) {
                    targetElement.scrollIntoView({ behavior: 'smooth' });
                    if (window.innerWidth <= 768) {
                        nav.classList.remove('open');
                        tocButton.setAttribute('aria-expanded', 'false');
                        tocButton.textContent = 'Show Table of Contents';
                        console.log(`Scrolled to ${targetId} and closed TOC on mobile.`);
                    } else {
                        console.log(`Scrolled to ${targetId}.`);
                    }
                } else {
                    console.warn(`Section with ID ${targetId} not found.`);
                }
            } catch (error) {
                console.error(`Error selecting element with ID ${targetId}:`, error.message);
            }
        });
    });

    // Search functionality
    searchInput.addEventListener('input', function() {
        const searchTerm = this.value.toLowerCase().trim();
        const navItems = nav.querySelectorAll('li');

        navItems.forEach(item => {
            const link = item.querySelector('a');
            const text = link.textContent.toLowerCase();
            const parentLi = link.parentElement;

            if (text.includes(searchTerm)) {
                parentLi.style.display = 'block';
                let parent = parentLi.parentElement.closest('li');
                while (parent) {
                    parent.style.display = 'block';
                    parent = parent.parentElement.closest('li');
                }
            } else {
                const childLinks = item.querySelectorAll('ul a');
                let hasMatchingChild = false;
                childLinks.forEach(childLink => {
                    if (childLink.textContent.toLowerCase().includes(searchTerm)) {
                        hasMatchingChild = true;
                    }
                });
                parentLi.style.display = hasMatchingChild ? 'block' : 'none';
            }
        });

        if (!searchTerm) {
            navItems.forEach(item => {
                item.style.display = 'block';
            });
        }

        // Open TOC on mobile when searching
        if (searchTerm && window.innerWidth <= 768) {
            nav.classList.add('open');
            tocButton.setAttribute('aria-expanded', 'true');
            tocButton.textContent = 'Hide Table of Contents';
            console.log('TOC opened due to search input on mobile.');
        }
    });

    // Initialize navigation state
    function initNavState() {
        if (window.innerWidth <= 768) {
            nav.classList.remove('open');
            tocButton.setAttribute('aria-expanded', 'false');
            tocButton.textContent = 'Show Table of Contents';
            console.log('Initialized: TOC hidden on mobile.');
        } else {
            nav.classList.add('open');
            tocButton.setAttribute('aria-expanded', 'true');
            tocButton.textContent = 'Hide Table of Contents';
            console.log('Initialized: TOC visible on desktop.');
        }
    }

    // Initialize and add event listener
    if (tocButton) {
        initNavState();
        tocButton.addEventListener('click', toggleNav);
        window.addEventListener('resize', initNavState);
        console.log('TOC button event listener added.');
    } else {
        console.error('Cannot add event listener: TOC button not found.');
    }
});