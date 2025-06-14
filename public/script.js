// =========================================
// CHAROLAIS - JAVASCRIPT MODERNO
// =========================================

class CharolaisApp {
    constructor() {
        this.products = [];
        this.filteredProducts = [];
        this.currentFilter = 'all';
        this.cart = [];
        this.isLoading = true;
        this.variants = {}; // Cache de variantes por producto
        this.selectedVariants = {}; // Variante seleccionada por producto
        
        // Inicializar Stripe
        this.stripe = Stripe(CONFIG.STRIPE_PUBLISHABLE_KEY);
        
        this.init();
    }

    async init() {
        // Limpiar localStorage de compras previas para forzar primera compra
        localStorage.removeItem('charolais-has-purchased');
        localStorage.removeItem('charolais-checkout-in-progress');
        
        await this.generateProducts();
        await this.loadProductVariants(); // Cargar variantes después de productos
        this.setupEventListeners();
        this.setupIntersectionObserver();
        this.setupLoadingScreen();
        this.setupScrollEffects();
        this.setupScrollToTopButton();
        this.loadCartFromLocalStorage();
        this.setupCartEvents();
        
        // Exponer función de reset para testing
        window.resetFirstPurchase = () => this.resetFirstPurchase();
        console.log('🛠️ Para resetear primera compra, usa: resetFirstPurchase()');
        console.log('🎁 Estado inicial: Primera compra (envío gratis)');
    }

    // =========================================
    // GENERACIÓN DE PRODUCTOS
    // =========================================
    async generateProducts() {
        try {
            console.log('🔄 Cargando productos desde la API...');
            // Cargar productos desde la API
            const response = await fetch('/api/products');
            const products = await response.json();
            
            console.log(`✅ Productos cargados desde API: ${products.length}`);
            
            // Mapear productos de la API al formato esperado por el frontend
            this.products = products.map((product, index) => {
                // Extraer el ID numérico del formato "product-X"
                const numericId = product.id.replace('product-', '');
                
                return {
                    id: parseInt(numericId),
                    name: product.name,
                    category: product.category,
                    categoryName: product.categoryName,
                    price: product.price,
                    description: product.description,
                    images: product.images || [],
                    image: product.images && product.images.length > 0 ? product.images[0] : 'placeholder.jpg',
                    rating: product.rating || 4,
                    reviews: product.reviews || 10,
                    inStock: product.stock > 0,
                    stock: product.stock
                };
            });

            console.log(`🎯 Productos mapeados: ${this.products.length}`);
            console.log('📊 Productos con múltiples imágenes:', this.products.filter(p => p.images.length > 1).map(p => `${p.name} (${p.images.length})`));

            this.filteredProducts = [...this.products];
            
            // Renderizar productos después de cargarlos
            this.renderProducts();
            
        } catch (error) {
            console.error('❌ Error loading products from API:', error);
            
            // Fallback: usar productos hardcodeados si falla la API
            this.generateFallbackProducts();
        }
    }

    // Cargar variantes de productos
    async loadProductVariants() {
        try {
            console.log('🔄 Cargando variantes de productos...');
            
            // Cargar variantes para cada producto
            for (const product of this.products) {
                try {
                    const response = await fetch(`/api/products/${product.id}/variants`);
                    if (response.ok) {
                        const variants = await response.json();
                        this.variants[product.id] = variants;
                        
                        // Seleccionar la primera variante por defecto
                        if (variants.length > 0) {
                            this.selectedVariants[product.id] = variants[0].id;
                        }
                        
                        console.log(`✅ Variantes cargadas para ${product.name}: ${variants.length} variantes`);
                    }
                } catch (error) {
                    console.log(`⚠️ No hay variantes para ${product.name} o error al cargar`);
                }
            }
            
            console.log('📊 Cache de variantes:', this.variants);
            
        } catch (error) {
            console.error('❌ Error cargando variantes:', error);
        }
    }

    // Verificar si un producto tiene variantes
    hasVariants(productId) {
        return this.variants[productId] && this.variants[productId].length > 0;
    }

    // Obtener la variante seleccionada de un producto
    getSelectedVariant(productId) {
        if (!this.hasVariants(productId)) return null;
        
        const selectedVariantId = this.selectedVariants[productId];
        return this.variants[productId].find(v => v.id === selectedVariantId);
    }

    // Cambiar la variante seleccionada
    selectVariant(productId, variantId) {
        this.selectedVariants[productId] = variantId;
        // Re-renderizar el producto para mostrar la nueva variante
        this.renderProducts();
    }

    generateFallbackProducts() {
        const productData = [
            // COLECCIÓN HOMBRE - COWBOY SKULL (con galería de imágenes)
            { 
                name: "Cowboy Skull", 
                category: "hombre", 
                price: 400, 
                description: "Colección completa con diseños icónicos en blanco y negro", 
                images: ["Cowboy Skull.JPG", "Cowboy Skull blanca.JPG", "Conjunto Cowboy Skull.JPG", "Conjunto Cowboy Skull 2.JPG"],
                image: "Cowboy Skull.JPG" // Imagen principal
            },
            
            // COLECCIÓN HOMBRE - ALL AROUND (con galería de imágenes)
            { 
                name: "All Around", 
                category: "hombre", 
                price: 500, 
                description: "Versatilidad y estilo en colores negro y blanco", 
                images: ["all arround.JPG", "all arround blanca.JPG"],
                image: "all arround.JPG" // Imagen principal
            },
            
            // COLECCIÓN HOMBRE - BRONC RIDING (con galería de imágenes)
            { 
                name: "Bronc Riding", 
                category: "hombre", 
                price: 400, 
                description: "Espíritu del rodeo auténtico para verdaderos jinetes", 
                images: ["Bronc Riding.JPG", "Bronc Riding 1.JPG"],
                image: "Bronc Riding.JPG" // Imagen principal
            },
            
            // COLECCIÓN MUJER - BOUTIQUE UNITALLA (productos separados)
            { 
                name: "Boutique Mujer Unitalla", 
                category: "mujer", 
                price: 600, 
                description: "Vestido elegante con toque vaquero, talla única", 
                images: ["Boutique mujer unitalla.JPG"],
                image: "Boutique mujer unitalla.JPG"
            },
            { 
                name: "Boutique Unitalla 1", 
                category: "mujer", 
                price: 600, 
                description: "Vestido estilo western en diseño exclusivo", 
                images: ["Boutique unitalla 1.JPG"],
                image: "Boutique unitalla 1.JPG"
            },
            { 
                name: "Boutique Unitalla 3", 
                category: "mujer", 
                price: 600, 
                description: "Vestido vaquero con detalles únicos", 
                images: ["Boutique unitalla 3.JPG"],
                image: "Boutique unitalla 3.JPG"
            },
            { 
                name: "Boutique Unitalla 4", 
                category: "mujer", 
                price: 600, 
                description: "Vestido premium con acabados especiales", 
                images: ["Boutique Unitalla 4.JPG"],
                image: "Boutique Unitalla 4.JPG"
            },
            
            // COLECCIÓN MUJER - RODEO CLOWN (movido de hombre a mujer)
            { 
                name: "Rodeo Clown", 
                category: "mujer", 
                price: 400, 
                description: "Playera audaz en rojo vibrante con conjuntos completos", 
                images: ["Rodeo Clown.JPG", "Rodeo Clown 1.JPG", "Rodeo Clown Conjuntio.JPG", "Conjunto Rodeo Clown 2.JPG"],
                image: "Rodeo Clown.JPG" // Imagen principal
            },
            
            // COLECCIÓN MUJER - COWGIRLS (con galería de imágenes)
            { 
                name: "CowGirls", 
                category: "mujer", 
                price: 400, 
                description: "El espíritu cowgirl auténtico con conjunto completo", 
                images: ["CowGirls.JPG", "Conjunto CowGirl.JPG"],
                image: "CowGirls.JPG" // Imagen principal
            },
            
            // GORRAS INDIVIDUALES - TODAS LAS GORRAS (precio actualizado a 400)
            { name: "Gorra Vaquera Original", category: "gorras", price: 400, description: "Gorra de alta calidad con bordado Charolais", images: ["Gorra.JPG"], image: "Gorra.JPG" },
            { name: "Gorra Rodeo 2", category: "gorras", price: 400, description: "Diseño clásico para el vaquero moderno", images: ["gorra 2.JPG"], image: "gorra 2.JPG" },
            { name: "Gorra Rancho 3", category: "gorras", price: 400, description: "Edición especial con detalles artesanales", images: ["Gorra 3.JPG"], image: "Gorra 3.JPG" },
            { name: "Gorra Western 4", category: "gorras", price: 400, description: "Para los profesionales del western", images: ["gorra 4.JPG"], image: "gorra 4.JPG" },
            { name: "Gorra Charolais 5", category: "gorras", price: 400, description: "El diseño premium de la casa", images: ["Gorra 5.JPG"], image: "Gorra 5.JPG" },
            { name: "Gorra Monterrey 6", category: "gorras", price: 400, description: "Representando el orgullo regiomontano", images: ["gorra 6.JPG"], image: "gorra 6.JPG" },
            { name: "Gorra Tradición 7", category: "gorras", price: 400, description: "Tradición y modernidad unidos", images: ["Gorra 7.JPG"], image: "Gorra 7.JPG" },
            { name: "Gorra Elite 8", category: "gorras", price: 400, description: "Para los más exigentes del rodeo", images: ["gorra 8.JPG"], image: "gorra 8.JPG" },
            { name: "Gorra Heritage 9", category: "gorras", price: 400, description: "Herencia vaquera en cada puntada", images: ["Gorra 9.JPG"], image: "Gorra 9.JPG" },
            { name: "Gorra Signature 10", category: "gorras", price: 400, description: "Firma distintiva de calidad superior", images: ["Gorra 10.JPG"], image: "Gorra 10.JPG" },
            
            // ACCESORIOS DAMA (con galería de imágenes)
            { 
                name: "Accesorios Dama", 
                category: "accesorios-dama", 
                price: 349, 
                description: "Conjunto elegante de accesorios femeninos", 
                images: ["Accesorios.JPG", "Accesorios 2.JPG"],
                image: "Accesorios.JPG" // Imagen principal
            },
            
            // ACCESORIOS CABALLERO - PRÓXIMAMENTE
            { 
                name: "Accesorios Caballero", 
                category: "accesorios-caballero", 
                price: 0, 
                description: "Próximamente disponibles", 
                images: ["placeholder.jpg"],
                image: "placeholder.jpg",
                comingSoon: true 
            }
        ];

        this.products = productData.map((product, index) => ({
            id: index + 1,
            ...product,
            rating: Math.floor(Math.random() * 2) + 4, // Rating entre 4 y 5
            reviews: Math.floor(Math.random() * 50) + 10, // Reviews entre 10 y 60
            inStock: !product.comingSoon && Math.random() > 0.1 // 90% de probabilidad de estar en stock
        }));

        this.filteredProducts = [...this.products];
        
        // Renderizar productos después de cargarlos
        this.renderProducts();
    }

    // =========================================
    // EVENT LISTENERS
    // =========================================
    setupEventListeners() {
        // Loading screen
        window.addEventListener('load', () => {
            setTimeout(() => {
                this.hideLoadingScreen();
            }, 2000);
        });

        // Navigation scroll effect
        window.addEventListener('scroll', () => {
            this.handleNavbarScroll();
        });

        // Menu toggle
        const menuToggle = document.getElementById('menu-toggle');
        const navMenu = document.getElementById('nav-menu');
        
        menuToggle?.addEventListener('click', () => {
            navMenu.classList.toggle('active');
        });

        // Search modal
        const searchBtn = document.getElementById('search-btn');
        const searchModal = document.getElementById('search-modal');
        const searchClose = document.getElementById('search-close');
        
        searchBtn?.addEventListener('click', () => {
            searchModal.classList.add('active');
            document.getElementById('search-input')?.focus();
        });

        searchClose?.addEventListener('click', () => {
            searchModal.classList.remove('active');
        });

        searchModal?.addEventListener('click', (e) => {
            if (e.target === searchModal) {
                searchModal.classList.remove('active');
            }
        });

        // Cart sidebar
        const cartBtn = document.getElementById('cart-btn');
        const cartSidebar = document.getElementById('cart-sidebar');
        const cartClose = document.getElementById('cart-close');
        const cartOverlay = document.getElementById('cart-overlay');

        cartBtn?.addEventListener('click', () => {
            cartSidebar.classList.add('active');
            cartOverlay.classList.add('active');
            this.renderCart();
        });

        cartClose?.addEventListener('click', () => {
            this.closeCart();
        });

        cartOverlay?.addEventListener('click', () => {
            this.closeCart();
        });

        // Product filters
        const filterBtns = document.querySelectorAll('.filter-btn');
        filterBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const filter = e.target.dataset.filter;
                this.filterProducts(filter);
                
                // Update active filter button
                filterBtns.forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
            });
        });

        // Load more products
        const loadMoreBtn = document.getElementById('load-more');
        loadMoreBtn?.addEventListener('click', () => {
            this.loadMoreProducts();
        });

        // Newsletter form
        const newsletterForm = document.getElementById('newsletter-form');
        newsletterForm?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleNewsletterSubmit(e);
        });

        // Smooth scroll for navigation links
        document.querySelectorAll('a[href^="#"]').forEach(anchor => {
            anchor.addEventListener('click', (e) => {
                e.preventDefault();
                const target = document.querySelector(anchor.getAttribute('href'));
                if (target) {
                    target.scrollIntoView({
                        behavior: 'smooth',
                        block: 'start'
                    });
                }
            });
        });

        // Hero buttons
        const heroButtons = document.querySelectorAll('.hero .btn');
        heroButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelector('#productos')?.scrollIntoView({
                    behavior: 'smooth'
                });
            });
        });

        // Search functionality
        const searchInput = document.getElementById('search-input');
        searchInput?.addEventListener('input', (e) => {
            this.handleSearch(e.target.value);
        });

        // Search suggestions
        document.querySelectorAll('.suggestion').forEach(suggestion => {
            suggestion.addEventListener('click', (e) => {
                const query = e.target.textContent;
                searchInput.value = query;
                this.handleSearch(query);
                searchModal.classList.remove('active');
            });
        });

        // Category cards
        document.querySelectorAll('.category-card').forEach(card => {
            card.addEventListener('click', (e) => {
                const category = e.currentTarget.dataset.category;
                this.filterProducts(category);
                document.querySelector('#productos')?.scrollIntoView({
                    behavior: 'smooth'
                });
            });
        });
    }

    // =========================================
    // LOADING SCREEN
    // =========================================
    setupLoadingScreen() {
        const loadingScreen = document.getElementById('loading-screen');
        
        // Add some dynamic text changes
        const loadingTexts = [
            'Cargando la tradición...',
            'Preparando el rodeo...',
            'Ensillando productos...',
            'Montando la experiencia...'
        ];
        
        let currentTextIndex = 0;
        const loadingText = loadingScreen.querySelector('p');
        
        const textInterval = setInterval(() => {
            currentTextIndex = (currentTextIndex + 1) % loadingTexts.length;
            if (loadingText) {
                loadingText.textContent = loadingTexts[currentTextIndex];
            }
        }, 800);
        
        // Clear interval when loading is done
        setTimeout(() => {
            clearInterval(textInterval);
        }, 2000);
    }

    hideLoadingScreen() {
        const loadingScreen = document.getElementById('loading-screen');
        loadingScreen?.classList.add('hidden');
        
        // Remove from DOM after animation
        setTimeout(() => {
            loadingScreen?.remove();
        }, 1000);
    }

    // =========================================
    // SCROLL EFFECTS
    // =========================================
    handleNavbarScroll() {
        const navbar = document.getElementById('navbar');
        const scrolled = window.scrollY > 100;
        
        navbar?.classList.toggle('scrolled', scrolled);
    }

    setupScrollEffects() {
        // Parallax effect for hero section
        window.addEventListener('scroll', () => {
            const scrolled = window.pageYOffset;
            const hero = document.querySelector('.hero');
            const heroBackground = document.querySelector('.hero-background');
            
            if (hero && heroBackground) {
                const rate = scrolled * -0.5;
                heroBackground.style.transform = `translateY(${rate}px)`;
            }
        });
    }

    // =========================================
    // INTERSECTION OBSERVER
    // =========================================
    setupIntersectionObserver() {
        const observerOptions = {
            threshold: 0.1,
            rootMargin: '0px 0px -50px 0px'
        };

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('animate-in');
                    
                    // Add stagger animation for product cards
                    if (entry.target.classList.contains('product-card')) {
                        const cards = document.querySelectorAll('.product-card');
                        cards.forEach((card, index) => {
                            setTimeout(() => {
                                card.style.animationDelay = `${index * 0.1}s`;
                                card.classList.add('slide-in');
                            }, index * 50);
                        });
                    }
                }
            });
        }, observerOptions);

        // Observe sections and cards
        document.querySelectorAll('section, .product-card, .category-card, .feature').forEach(el => {
            observer.observe(el);
        });
    }

    // =========================================
    // PRODUCT MANAGEMENT
    // =========================================
    filterProducts(filter) {
        this.currentFilter = filter;
        
        if (filter === 'all') {
            this.filteredProducts = [...this.products];
        } else {
            this.filteredProducts = this.products.filter(product => 
                product.category === filter
            );
        }
        
        this.renderProducts();
    }

    handleSearch(query) {
        if (!query.trim()) {
            this.filteredProducts = [...this.products];
        } else {
            this.filteredProducts = this.products.filter(product =>
                product.name.toLowerCase().includes(query.toLowerCase()) ||
                product.description.toLowerCase().includes(query.toLowerCase()) ||
                product.category.toLowerCase().includes(query.toLowerCase())
            );
        }
        
        this.renderProducts();
    }

    renderProducts() {
        const productsGrid = document.getElementById('products-grid');
        if (!productsGrid) return;

        // Clear existing products
        productsGrid.innerHTML = '';

        // Show loading state
        productsGrid.innerHTML = '<div class="products-loading">Cargando productos...</div>';

        // Simulate loading delay for better UX
        setTimeout(() => {
            productsGrid.innerHTML = '';

            if (this.filteredProducts.length === 0) {
                productsGrid.innerHTML = `
                    <div class="no-products">
                        <i class="fas fa-search"></i>
                        <h3>No se encontraron productos</h3>
                        <p>Intenta con otros términos de búsqueda o filtros</p>
                    </div>
                `;
                return;
            }

            this.filteredProducts.forEach(product => {
                const productCard = this.createProductCard(product);
                productsGrid.appendChild(productCard);
            });

            // Trigger animations
            this.triggerProductAnimations();
        }, 300);
    }

    createProductCard(product) {
        const card = document.createElement('div');
        card.className = 'product-card';
        
        if (product.comingSoon) {
            card.innerHTML = `
                <div class="product-image coming-soon">
                    <div class="coming-soon-content">
                        <i class="fas fa-clock"></i>
                        <h3>Próximamente</h3>
                    </div>
                </div>
                <div class="product-info">
                    <span class="product-category">${this.getCategoryName(product.category)}</span>
                    <h3 class="product-name">${product.name}</h3>
                    <p class="product-description">${product.description}</p>
                    <div class="coming-soon-badge">Muy Pronto</div>
                </div>
            `;
        } else {
            const imageCount = product.images ? product.images.length : 1;
            const hasMultipleImages = imageCount > 1;
            
            card.innerHTML = `
                <div class="product-image" onclick="app.quickView(${product.id})">
                    <img src="${product.image}" alt="${product.name}" loading="lazy" class="main-product-img">
                    ${imageCount > 1 ? `<div class="image-count-badge">${imageCount} fotos</div>` : ''}
                    ${hasMultipleImages ? `
                        <div class="product-image-nav">
                            <button class="product-nav-btn prev" onclick="event.stopPropagation(); app.changeProductImage(${product.id}, 'prev')" style="display: none;">
                                <i class="fas fa-chevron-left"></i>
                            </button>
                            <button class="product-nav-btn next" onclick="event.stopPropagation(); app.changeProductImage(${product.id}, 'next')" style="display: none;">
                                <i class="fas fa-chevron-right"></i>
                            </button>
                        </div>
                        <div class="product-image-indicators">
                            ${product.images.map((img, index) => 
                                `<div class="product-indicator ${index === 0 ? 'active' : ''}"></div>`
                            ).join('')}
                        </div>
                    ` : ''}
                    
                    <!-- Botón de carrito elegante en la parte inferior -->
                    <div class="product-cart-section">
                        ${this.hasVariants(product.id) ? `
                            <div class="product-variants">
                                <select class="variant-selector" onchange="app.selectVariant(${product.id}, this.value)">
                                    ${this.variants[product.id].map(variant => 
                                        `<option value="${variant.id}" ${this.selectedVariants[product.id] === variant.id ? 'selected' : ''}>
                                            ${variant.name} - $${variant.priceOverride || product.price}
                                        </option>`
                                    ).join('')}
                                </select>
                            </div>
                        ` : ''}
                        <button class="product-add-cart-btn" onclick="event.stopPropagation(); app.addToCart(${product.id})" ${!product.inStock ? 'disabled' : ''}>
                            <i class="fas fa-shopping-cart"></i>
                            <span>${product.inStock ? 'Agregar al Carrito' : 'No Disponible'}</span>
                        </button>
                        <button class="product-wishlist-btn" onclick="event.stopPropagation(); app.addToWishlist(${product.id})" title="Agregar a favoritos">
                            <i class="fas fa-heart"></i>
                        </button>
                    </div>
                </div>
                <div class="product-info">
                    <span class="product-category">${this.getCategoryName(product.category)}</span>
                    <h3 class="product-name">${product.name}</h3>
                    <p class="product-description">${product.description}</p>
                    <div class="product-rating">
                        ${this.generateStars(product.rating)}
                        <span class="review-count">(${product.reviews} reseñas)</span>
                    </div>
                    <div class="product-price">$${product.price}</div>
                    ${!product.inStock ? '<div class="out-of-stock">Agotado</div>' : ''}
                </div>
            `;

            // Agregar event listeners para hover en productos con múltiples imágenes
            if (hasMultipleImages) {
                card.dataset.productId = product.id;
                card.dataset.currentImageIndex = '0';
                
                const productImage = card.querySelector('.product-image');
                const navButtons = card.querySelectorAll('.product-nav-btn');
                
                productImage.addEventListener('mouseenter', () => {
                    navButtons.forEach(btn => btn.style.display = 'flex');
                });
                
                productImage.addEventListener('mouseleave', () => {
                    navButtons.forEach(btn => btn.style.display = 'none');
                });
            }
        }

        return card;
    }

    getCategoryName(category) {
        const categoryNames = {
            'gorras': 'Gorras',
            'hombre': 'Hombre',
            'mujer': 'Mujer',
            'accesorios-dama': 'Accesorios Dama',
            'accesorios-caballero': 'Accesorios Caballero'
        };
        return categoryNames[category] || category;
    }

    generateStars(rating) {
        let stars = '';
        for (let i = 1; i <= 5; i++) {
            if (i <= rating) {
                stars += '<i class="fas fa-star"></i>';
            } else {
                stars += '<i class="far fa-star"></i>';
            }
        }
        return stars;
    }

    triggerProductAnimations() {
        const cards = document.querySelectorAll('.product-card');
        cards.forEach((card, index) => {
            setTimeout(() => {
                card.classList.add('animate-in');
            }, index * 100);
        });
    }

    loadMoreProducts() {
        // Simulate loading more products
        const loadMoreBtn = document.getElementById('load-more');
        const originalText = loadMoreBtn.innerHTML;
        
        loadMoreBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Cargando...';
        loadMoreBtn.disabled = true;

        setTimeout(() => {
            // For demo purposes, just re-render existing products
            this.renderProducts();
            
            loadMoreBtn.innerHTML = originalText;
            loadMoreBtn.disabled = false;
        }, 1500);
    }

    // =========================================
    // CART FUNCTIONALITY
    // =========================================
    addToCart(productId) {
        const product = this.products.find(p => p.id === productId);
        if (!product) return;

        // Obtener la variante seleccionada si el producto tiene variantes
        const selectedVariant = this.getSelectedVariant(productId);
        
        // Crear un identificador único para el item del carrito
        const cartItemId = selectedVariant ? `${productId}-${selectedVariant.id}` : productId;
        
        const existingItem = this.cart.find(item => {
            if (selectedVariant) {
                return item.cartItemId === cartItemId;
            } else {
                return item.id === productId;
            }
        });
        
        if (existingItem) {
            existingItem.quantity += 1;
        } else {
            const cartItem = {
                ...product,
                cartItemId: cartItemId,
                quantity: 1
            };
            
            // Agregar información de la variante si existe
            if (selectedVariant) {
                cartItem.variant = selectedVariant;
                cartItem.variantName = selectedVariant.name;
                cartItem.price = selectedVariant.priceOverride || product.price;
            }
            
            this.cart.push(cartItem);
        }

        this.updateCartCount();
        this.showCartNotification(product, selectedVariant);
        this.saveCartToLocalStorage();
        this.renderCart();
    }

    updateCartCount() {
        const cartCount = document.querySelector('.cart-count');
        const cartTotalItems = document.getElementById('cart-total-items');
        const totalItems = this.cart.reduce((sum, item) => sum + item.quantity, 0);
        
        if (cartCount) {
            cartCount.textContent = totalItems;
            cartCount.style.transform = 'scale(1.3)';
            setTimeout(() => {
                cartCount.style.transform = 'scale(1)';
            }, 200);
        }

        if (cartTotalItems) {
            cartTotalItems.textContent = totalItems;
        }
    }

    showCartNotification(product, selectedVariant) {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = 'cart-notification';
        notification.innerHTML = `
            <div class="notification-content">
                <i class="fas fa-check-circle"></i>
                <span>${product.name} ${selectedVariant ? `(${selectedVariant.name})` : ''} agregado al carrito</span>
            </div>
        `;

        document.body.appendChild(notification);

        // Show notification
        setTimeout(() => {
            notification.classList.add('show');
        }, 100);

        // Hide and remove notification
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => {
                notification.remove();
            }, 300);
        }, 3000);
    }

    closeCart() {
        const cartSidebar = document.getElementById('cart-sidebar');
        const cartOverlay = document.getElementById('cart-overlay');
        
        cartSidebar?.classList.remove('active');
        cartOverlay?.classList.remove('active');
    }

    saveCartToLocalStorage() {
        localStorage.setItem('charolais-cart', JSON.stringify(this.cart));
    }

    loadCartFromLocalStorage() {
        const savedCart = localStorage.getItem('charolais-cart');
        if (savedCart) {
            this.cart = JSON.parse(savedCart);
            this.updateCartCount();
        }
    }

    setupCartEvents() {
        // Check if should open cart on load (from cancel page)
        if (localStorage.getItem('openCartOnLoad') === 'true') {
            localStorage.removeItem('openCartOnLoad');
            setTimeout(() => {
                const cartSidebar = document.getElementById('cart-sidebar');
                const cartOverlay = document.getElementById('cart-overlay');
                cartSidebar.classList.add('active');
                cartOverlay.classList.add('active');
                this.renderCart();
            }, 1000);
        }
    }

    renderCart() {
        const cartEmpty = document.getElementById('cart-empty');
        const cartItems = document.getElementById('cart-items');
        const cartFooter = document.getElementById('cart-footer');

        if (this.cart.length === 0) {
            cartEmpty.style.display = 'block';
            cartItems.style.display = 'none';
            cartFooter.style.display = 'none';
            return;
        }

        cartEmpty.style.display = 'none';
        cartItems.style.display = 'block';
        cartFooter.style.display = 'block';

        // Render cart items
        cartItems.innerHTML = this.cart.map(item => `
            <div class="cart-item">
                <div class="cart-item-image">
                    <img src="${item.image}" alt="${item.name}">
                </div>
                <div class="cart-item-details">
                    <div class="cart-item-name">${item.name} ${item.variant ? `(${item.variant.name})` : ''}</div>
                    <div class="cart-item-price">$${item.price} MXN</div>
                </div>
                <div class="cart-item-controls">
                    <div class="quantity-control">
                        <button class="quantity-btn" onclick="app.updateQuantity(${item.id}, ${item.quantity - 1})">
                            <i class="fas fa-minus"></i>
                        </button>
                        <input type="number" class="quantity-input" value="${item.quantity}" min="1" 
                               onchange="app.updateQuantity(${item.id}, parseInt(this.value))">
                        <button class="quantity-btn" onclick="app.updateQuantity(${item.id}, ${item.quantity + 1})">
                            <i class="fas fa-plus"></i>
                        </button>
                    </div>
                    <button class="remove-item-btn" onclick="app.removeFromCart(${item.id})" title="Eliminar">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `).join('');

        // Update totals
        this.updateCartTotals();
    }

    updateQuantity(productId, newQuantity) {
        if (newQuantity <= 0) {
            this.removeFromCart(productId);
            return;
        }

        const item = this.cart.find(item => {
            // Buscar por cartItemId si existe, sino por productId
            return item.cartItemId ? item.cartItemId.startsWith(productId.toString()) : item.id === productId;
        });
        
        if (item) {
            item.quantity = newQuantity;
            this.updateCartCount();
            this.saveCartToLocalStorage();
            this.renderCart();
        }
    }

    removeFromCart(productId) {
        this.cart = this.cart.filter(item => {
            // Remover por cartItemId si existe, sino por productId
            return item.cartItemId ? !item.cartItemId.startsWith(productId.toString()) : item.id !== productId;
        });
        
        this.updateCartCount();
        this.saveCartToLocalStorage();
        this.renderCart();
    }

    updateCartTotals() {
        const subtotal = this.cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        
        // Verificar si es la primera compra - FORZAR primera compra por defecto
        let hasPurchased = localStorage.getItem('charolais-has-purchased');
        
        // Si no hay valor o el valor es inválido, forzar primera compra
        if (!hasPurchased || hasPurchased === 'false' || hasPurchased === 'null' || hasPurchased === 'undefined') {
            localStorage.removeItem('charolais-has-purchased');
            hasPurchased = null;
        }
        
        const isFirstPurchase = !hasPurchased;
        
        console.log('🔍 Debug envío:', {
            hasPurchased: hasPurchased,
            isFirstPurchase: isFirstPurchase,
            subtotal: subtotal
        });
        
        // Calcular envío
        let shipping = 0;
        let shippingText = '';
        let shippingClass = '';
        
        if (isFirstPurchase) {
            shipping = 0;
            shippingText = 'GRATIS';
            shippingClass = 'shipping-free';
            console.log('🎁 Envío GRATIS aplicado (primera compra)');
        } else {
            // Envío estándar: $150 MXN o 10% del subtotal, lo que sea mayor
            const standardShipping = Math.max(150, Math.round(subtotal * 0.10));
            shipping = standardShipping;
            shippingText = `$${shipping}`;
            shippingClass = 'shipping-cost';
            console.log('🚚 Envío estándar aplicado:', shipping);
        }
        
        const total = subtotal + shipping;

        // Actualizar elementos del carrito
        const subtotalElement = document.getElementById('cart-subtotal');
        const shippingElement = document.querySelector('.shipping-free, .shipping-cost');
        const totalElement = document.getElementById('cart-total');
        
        if (subtotalElement) {
            subtotalElement.textContent = `$${subtotal}`;
        }
        
        if (shippingElement) {
            shippingElement.textContent = shippingText;
            shippingElement.className = shippingClass;
            
            // Agregar texto explicativo para primera compra
            if (isFirstPurchase) {
                shippingElement.innerHTML = `
                    <span class="shipping-free-text">GRATIS</span>
                    <span class="shipping-free-badge">Primera compra</span>
                `;
            }
        }
        
        if (totalElement) {
            totalElement.textContent = `$${total}`;
        }
        
        // Guardar total en localStorage para la página de éxito
        localStorage.setItem('charolais-cart-total', total.toString());
        
        // Mostrar mensaje de envío gratis para primera compra
        this.showFirstPurchaseMessage(isFirstPurchase);
    }

    // Método para resetear el estado de primera compra (para testing)
    resetFirstPurchase() {
        localStorage.removeItem('charolais-has-purchased');
        localStorage.removeItem('charolais-checkout-in-progress');
        console.log('🔄 Estado de primera compra reseteado');
        this.updateCartTotals(); // Actualizar carrito
    }

    // Mostrar mensaje de envío gratis para primera compra
    showFirstPurchaseMessage(isFirstPurchase) {
        let messageElement = document.querySelector('.first-purchase-message');
        
        if (isFirstPurchase) {
            if (!messageElement) {
                messageElement = document.createElement('div');
                messageElement.className = 'first-purchase-message';
                messageElement.innerHTML = `
                    <div class="first-purchase-content">
                        <i class="fas fa-gift"></i>
                        <span>¡Envío GRATIS en tu primera compra!</span>
                    </div>
                `;
                
                // Insertar después del subtotal
                const cartSummary = document.querySelector('.cart-summary');
                if (cartSummary) {
                    cartSummary.appendChild(messageElement);
                }
            }
        } else if (messageElement) {
            messageElement.remove();
        }
    }

    // =========================================
    // PRODUCT ACTIONS
    // =========================================
    quickView(productId) {
        const product = this.products.find(p => p.id === productId);
        if (!product || product.comingSoon) return;

        // Crear modal para quick view con carrusel profesional
        const modal = document.createElement('div');
        modal.className = 'quick-view-modal';
        
        const hasMultipleImages = product.images && product.images.length > 1;
        
        modal.innerHTML = `
            <div class="quick-view-content">
                <button class="quick-view-close">&times;</button>
                <div class="quick-view-body">
                    <!-- Carrusel de imágenes profesional -->
                    <div class="product-carousel">
                        <div class="carousel-main-container">
                            <div class="carousel-main-image">
                                <img src="${product.images ? product.images[0] : product.image}" alt="${product.name}" id="carousel-main-img" onclick="app.openImageZoom('${product.images ? product.images[0] : product.image}')">
                                <div class="zoom-indicator">
                                    <i class="fas fa-search-plus"></i>
                                    <span>Hacer zoom</span>
                                </div>
                                ${hasMultipleImages ? `
                                    <button class="carousel-nav prev" onclick="event.stopPropagation(); app.carouselPrev()" ${product.images.length <= 1 ? 'disabled' : ''}>
                                        <i class="fas fa-chevron-left"></i>
                                    </button>
                                    <button class="carousel-nav next" onclick="event.stopPropagation(); app.carouselNext()" ${product.images.length <= 1 ? 'disabled' : ''}>
                                        <i class="fas fa-chevron-right"></i>
                                    </button>
                                ` : ''}
                            </div>
                            ${hasMultipleImages ? `
                                <div class="carousel-indicators">
                                    ${product.images.map((img, index) => 
                                        `<div class="carousel-indicator ${index === 0 ? 'active' : ''}" onclick="app.goToSlide(${index})"></div>`
                                    ).join('')}
                                </div>
                            ` : ''}
                        </div>
                        ${hasMultipleImages ? `
                            <div class="carousel-thumbnails">
                                ${product.images.map((img, index) => 
                                    `<div class="carousel-thumbnail ${index === 0 ? 'active' : ''}" onclick="app.selectImage(${index}, '${img}')">
                                        <img src="${img}" alt="${product.name} ${index + 1}">
                                    </div>`
                                ).join('')}
                            </div>
                        ` : ''}
                    </div>
                    
                    <!-- Información del producto mejorada -->
                    <div class="quick-view-info">
                        <div class="product-breadcrumb">
                            <span>Inicio</span>
                            <i class="fas fa-chevron-right"></i>
                            <span>Productos</span>
                            <i class="fas fa-chevron-right"></i>
                            <span>${this.getCategoryName(product.category)}</span>
                        </div>
                        
                        <div class="product-badge">
                            <i class="fas fa-star"></i>
                            ${product.category === 'gorras' ? 'Gorra Premium' : 
                              product.category === 'hombre' ? 'Colección Hombre' :
                              product.category === 'mujer' ? 'Colección Mujer' : 'Edición Especial'}
                        </div>
                        
                        <h1 class="product-title">${product.name}</h1>
                        
                        <p class="product-description">${product.description}</p>
                        
                        ${hasMultipleImages ? `
                            <div class="gallery-info">
                                <i class="fas fa-images"></i>
                                <span>${product.images.length} imágenes en galería</span>
                            </div>
                        ` : ''}
                        
                        <div class="product-rating-section">
                            <div class="rating-stars">
                                ${this.generateStars(product.rating)}
                            </div>
                            <span class="rating-text">(${product.reviews} reseñas)</span>
                        </div>
                        
                        <div class="product-price-section">
                            <div class="current-price">
                                <span class="price-currency">$</span>${product.price}
                            </div>
                            <div class="stock-status ${product.inStock ? 'in-stock' : 'out-of-stock'}">
                                <i class="fas fa-${product.inStock ? 'check-circle' : 'times-circle'}"></i>
                                <span>${product.inStock ? 'En Stock' : 'Agotado'}</span>
                            </div>
                        </div>
                        
                        <div class="product-actions">
                            <div class="action-buttons">
                                <button class="btn-add-cart" onclick="app.addToCart(${product.id}); app.closeQuickView()" ${!product.inStock ? 'disabled' : ''}>
                                    <i class="fas fa-shopping-cart"></i>
                                    <span>${product.inStock ? 'Agregar al Carrito' : 'No Disponible'}</span>
                                </button>
                                <button class="btn-wishlist" onclick="app.addToWishlist(${product.id})" title="Agregar a favoritos">
                                    <i class="fas fa-heart"></i>
                                </button>
                            </div>
                        </div>
                        
                        <div class="product-features">
                            <div class="feature-item">
                                <i class="fas fa-truck"></i>
                                <span>Envío gratis</span>
                            </div>
                            <div class="feature-item">
                                <i class="fas fa-undo"></i>
                                <span>Devolución fácil</span>
                            </div>
                            <div class="feature-item">
                                <i class="fas fa-shield-alt"></i>
                                <span>Garantía</span>
                            </div>
                            <div class="feature-item">
                                <i class="fas fa-medal"></i>
                                <span>Calidad premium</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // Inicializar estado del carrusel
        this.currentImageIndex = 0;
        this.totalImages = product.images ? product.images.length : 1;
        this.currentProduct = product;

        // Show modal con animación
        setTimeout(() => {
            modal.classList.add('active');
        }, 10);

        // Agregar event listeners
        this.setupQuickViewEvents(modal);
        
        // Agregar keyboard navigation
        this.setupKeyboardNavigation();
    }

    // Configurar eventos del quick view
    setupQuickViewEvents(modal) {
        // Close modal events
        modal.querySelector('.quick-view-close').addEventListener('click', () => {
            this.closeQuickView();
        });

        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                this.closeQuickView();
            }
        });

        // Swipe gestures para móvil
        let startX = 0;
        let startY = 0;
        
        const carouselContainer = modal.querySelector('.carousel-main-container');
        if (carouselContainer) {
            carouselContainer.addEventListener('touchstart', (e) => {
                startX = e.touches[0].clientX;
                startY = e.touches[0].clientY;
            });

            carouselContainer.addEventListener('touchmove', (e) => {
                e.preventDefault(); // Prevenir scroll
            });

            carouselContainer.addEventListener('touchend', (e) => {
                if (!startX || !startY) return;
                
                const endX = e.changedTouches[0].clientX;
                const endY = e.changedTouches[0].clientY;
                
                const diffX = startX - endX;
                const diffY = startY - endY;
                
                // Solo si el movimiento horizontal es mayor que el vertical
                if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > 50) {
                    if (diffX > 0) {
                        this.carouselNext(); // Swipe left -> next
                    } else {
                        this.carouselPrev(); // Swipe right -> prev
                    }
                }
                
                startX = 0;
                startY = 0;
            });
        }
    }

    // Configurar navegación con teclado
    setupKeyboardNavigation() {
        this.keyboardHandler = (e) => {
            if (!document.querySelector('.quick-view-modal.active')) return;
            
            switch(e.key) {
                case 'ArrowLeft':
                    e.preventDefault();
                    this.carouselPrev();
                    break;
                case 'ArrowRight':
                    e.preventDefault();
                    this.carouselNext();
                    break;
                case 'Escape':
                    e.preventDefault();
                    this.closeQuickView();
                    break;
            }
        };
        
        document.addEventListener('keydown', this.keyboardHandler);
    }

    // Navegación del carrusel
    carouselNext() {
        if (this.currentImageIndex < this.totalImages - 1) {
            this.currentImageIndex++;
            this.updateCarouselImage();
        }
    }

    carouselPrev() {
        if (this.currentImageIndex > 0) {
            this.currentImageIndex--;
            this.updateCarouselImage();
        }
    }

    goToSlide(index) {
        this.currentImageIndex = index;
        this.updateCarouselImage();
    }

    selectImage(index, imageSrc) {
        this.currentImageIndex = index;
        this.updateCarouselImage();
    }

    // Actualizar imagen del carrusel
    updateCarouselImage() {
        const mainImg = document.getElementById('carousel-main-img');
        const thumbnails = document.querySelectorAll('.carousel-thumbnail');
        const indicators = document.querySelectorAll('.carousel-indicator');
        const prevBtn = document.querySelector('.carousel-nav.prev');
        const nextBtn = document.querySelector('.carousel-nav.next');
        
        if (mainImg && this.currentProduct.images) {
            const newImageSrc = this.currentProduct.images[this.currentImageIndex];
            
            // Fade effect en la imagen principal
            mainImg.style.opacity = '0';
            setTimeout(() => {
                mainImg.src = newImageSrc;
                mainImg.style.opacity = '1';
                
                // Actualizar onclick para zoom solo en la imagen
                mainImg.onclick = () => this.openImageZoom(newImageSrc);
            }, 150);

            // Actualizar thumbnails
            thumbnails.forEach((thumb, index) => {
                thumb.classList.toggle('active', index === this.currentImageIndex);
            });

            // Actualizar indicadores
            indicators.forEach((indicator, index) => {
                indicator.classList.toggle('active', index === this.currentImageIndex);
            });

            // Actualizar botones de navegación
            if (prevBtn) prevBtn.disabled = this.currentImageIndex === 0;
            if (nextBtn) nextBtn.disabled = this.currentImageIndex === this.totalImages - 1;
        }
    }

    // Abrir modal de zoom
    openImageZoom(imageSrc) {
        const zoomModal = document.createElement('div');
        zoomModal.className = 'image-zoom-modal';
        zoomModal.innerHTML = `
            <img src="${imageSrc}" alt="Imagen ampliada" class="zoom-image">
        `;

        document.body.appendChild(zoomModal);

        setTimeout(() => {
            zoomModal.classList.add('active');
        }, 10);

        // Cerrar zoom al hacer click
        zoomModal.addEventListener('click', () => {
            zoomModal.classList.remove('active');
            setTimeout(() => {
                zoomModal.remove();
            }, 300);
        });

        // Cerrar zoom con ESC
        const closeZoom = (e) => {
            if (e.key === 'Escape') {
                zoomModal.click();
                document.removeEventListener('keydown', closeZoom);
            }
        };
        document.addEventListener('keydown', closeZoom);
    }

    closeQuickView() {
        const modal = document.querySelector('.quick-view-modal');
        if (modal) {
            modal.classList.remove('active');
            setTimeout(() => {
                modal.remove();
            }, 400);
        }
        
        // Limpiar event listeners
        if (this.keyboardHandler) {
            document.removeEventListener('keydown', this.keyboardHandler);
            this.keyboardHandler = null;
        }
        
        // Limpiar estado
        this.currentImageIndex = 0;
        this.totalImages = 1;
        this.currentProduct = null;
    }

    addToWishlist(productId) {
        const product = this.products.find(p => p.id === productId);
        if (!product) return;

        // Show wishlist notification
        const notification = document.createElement('div');
        notification.className = 'wishlist-notification';
        notification.innerHTML = `
            <div class="notification-content">
                <i class="fas fa-heart"></i>
                <span>${product.name} agregado a favoritos</span>
            </div>
        `;

        document.body.appendChild(notification);

        setTimeout(() => {
            notification.classList.add('show');
        }, 100);

        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => {
                notification.remove();
            }, 300);
        }, 3000);
    }

    // =========================================
    // NEWSLETTER
    // =========================================
    handleNewsletterSubmit(e) {
        const form = e.target;
        const email = form.querySelector('input[type="email"]').value;
        const submitBtn = form.querySelector('button[type="submit"]');
        const originalText = submitBtn.innerHTML;

        // Show loading state
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Suscribiendo...';
        submitBtn.disabled = true;

        // Simulate API call
        setTimeout(() => {
            // Show success message
            const notification = document.createElement('div');
            notification.className = 'newsletter-notification success';
            notification.innerHTML = `
                <div class="notification-content">
                    <i class="fas fa-check-circle"></i>
                    <span>¡Gracias por suscribirte! Recibirás noticias increíbles.</span>
                </div>
            `;

            document.body.appendChild(notification);

            setTimeout(() => {
                notification.classList.add('show');
            }, 100);

            setTimeout(() => {
                notification.classList.remove('show');
                setTimeout(() => {
                    notification.remove();
                }, 300);
            }, 4000);

            // Reset form
            form.reset();
            submitBtn.innerHTML = originalText;
            submitBtn.disabled = false;
        }, 2000);
    }

    // =========================================
    // EFECTOS VISUALES SIMPLIFICADOS
    // =========================================
    setupScrollToTopButton() {
        // Crear botón scroll to top
        const scrollButton = document.createElement('button');
        scrollButton.className = 'scroll-to-top';
        scrollButton.innerHTML = '<i class="fas fa-arrow-up"></i>';
        scrollButton.style.cssText = `
            position: fixed;
            bottom: 30px;
            right: 30px;
            width: 50px;
            height: 50px;
            background: linear-gradient(135deg, var(--secondary-color), var(--accent-color));
            color: var(--dark-brown);
            border: none;
            border-radius: 50%;
            cursor: pointer;
            z-index: 1000;
            opacity: 0;
            transform: translateY(100px);
            transition: all 0.3s ease;
            box-shadow: 0 4px 15px rgba(0,0,0,0.2);
        `;
        
        document.body.appendChild(scrollButton);
        
        // Mostrar/ocultar según scroll
        window.addEventListener('scroll', () => {
            if (window.pageYOffset > 300) {
                scrollButton.style.opacity = '1';
                scrollButton.style.transform = 'translateY(0)';
            } else {
                scrollButton.style.opacity = '0';
                scrollButton.style.transform = 'translateY(100px)';
            }
        });
        
        // Funcionalidad del botón
        scrollButton.addEventListener('click', () => {
            window.scrollTo({
                top: 0,
                behavior: 'smooth'
            });
        });
    }

    // Nueva función para cambiar imágenes en las tarjetas de producto
    changeProductImage(productId, direction) {
        console.log(`🖼️ Intentando cambiar imagen: productId=${productId}, direction=${direction}`);
        
        const product = this.products.find(p => p.id === productId);
        if (!product || !product.images || product.images.length <= 1) {
            console.log(`❌ No se puede cambiar imagen: product=${!!product}, images=${product?.images?.length || 0}`);
            return;
        }

        const card = document.querySelector(`[data-product-id="${productId}"]`);
        if (!card) {
            console.log(`❌ No se encontró la tarjeta con data-product-id="${productId}"`);
            return;
        }

        let currentIndex = parseInt(card.dataset.currentImageIndex);
        console.log(`📍 Índice actual: ${currentIndex}, total imágenes: ${product.images.length}`);
        
        if (direction === 'next' && currentIndex < product.images.length - 1) {
            currentIndex++;
        } else if (direction === 'prev' && currentIndex > 0) {
            currentIndex--;
        } else {
            console.log(`🚫 No hay cambio posible`);
            return; // No hay cambio
        }

        console.log(`✅ Cambiando a índice: ${currentIndex}, imagen: ${product.images[currentIndex]}`);

        // Actualizar imagen
        const img = card.querySelector('.main-product-img');
        const indicators = card.querySelectorAll('.product-indicator');
        const prevBtn = card.querySelector('.product-nav-btn.prev');
        const nextBtn = card.querySelector('.product-nav-btn.next');

        // Efecto fade
        img.style.opacity = '0.7';
        setTimeout(() => {
            img.src = product.images[currentIndex];
            img.style.opacity = '1';
        }, 150);

        // Actualizar indicadores
        indicators.forEach((indicator, index) => {
            indicator.classList.toggle('active', index === currentIndex);
        });

        // Actualizar botones
        prevBtn.style.opacity = currentIndex === 0 ? '0.5' : '1';
        nextBtn.style.opacity = currentIndex === product.images.length - 1 ? '0.5' : '1';

        // Guardar nuevo índice
        card.dataset.currentImageIndex = currentIndex;
    }

    // =========================================
    // STRIPE CHECKOUT FUNCTIONS
    // =========================================

    async proceedToCheckout() {
        if (this.cart.length === 0) {
            alert('Tu carrito está vacío');
            return;
        }

        // Verificar si es la primera compra
        const isFirstPurchase = !localStorage.getItem('charolais-has-purchased');

        // Show loading
        const checkoutBtn = document.getElementById('checkout-btn');
        const loadingOverlay = document.getElementById('checkout-loading');
        
        checkoutBtn.disabled = true;
        checkoutBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Procesando...';
        loadingOverlay.style.display = 'flex';

        try {
            // Mapear productos del carrito a formato para Stripe
            const cartItems = this.cart.map(item => {
                const cartItem = {
                    id: this.getStripeProductId(item),
                    quantity: item.quantity
                };

                // Agregar información de variante si existe
                if (item.variant) {
                    cartItem.variant = {
                        id: item.variant.id,
                        name: item.variant.name,
                        priceOverride: item.variant.priceOverride
                    };
                }

                return cartItem;
            });

            console.log('🛒 Enviando items al checkout:', cartItems);

            // Crear sesión de checkout con información de primera compra
            const response = await fetch('/create-checkout-session', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    items: cartItems,
                    isFirstPurchase: isFirstPurchase
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Error al crear la sesión de pago');
            }

            const session = await response.json();
            console.log('✅ Sesión creada:', session);

            // Marcar que el usuario está en proceso de checkout (para tracking)
            if (isFirstPurchase) {
                localStorage.setItem('charolais-checkout-in-progress', 'true');
            }

            // Redirigir a Stripe Checkout
            const result = await this.stripe.redirectToCheckout({
                sessionId: session.sessionId
            });

            if (result.error) {
                throw new Error(result.error.message);
            }

        } catch (error) {
            console.error('❌ Error en checkout:', error);
            alert(`Hubo un error al procesar tu pago: ${error.message}`);
            
            // Reset button
            checkoutBtn.disabled = false;
            checkoutBtn.innerHTML = '<i class="fas fa-credit-card"></i> <span>Proceder al Pago</span>';
            loadingOverlay.style.display = 'none';
        }
    }

    getStripeProductId(cartItem) {
        // Usar el ID real del producto de la base de datos
        return cartItem.id.toString();
    }
}

// =========================================
// CSS DINÁMICO PARA EFECTOS
// =========================================
const additionalStyles = `
    <style>
        /* Product animations */
        .product-card {
            opacity: 0;
            transform: translateY(30px);
            transition: all 0.6s ease;
        }

        .product-card.animate-in {
            opacity: 1;
            transform: translateY(0);
        }

        /* Notifications */
        .cart-notification,
        .wishlist-notification,
        .newsletter-notification {
            position: fixed;
            top: 100px;
            right: -400px;
            background: var(--warm-white);
            padding: 1rem 1.5rem;
            border-radius: var(--border-radius-md);
            box-shadow: var(--shadow-xl);
            z-index: 4000;
            transition: right 0.3s ease;
            border-left: 4px solid var(--primary-color);
        }

        .cart-notification.show,
        .wishlist-notification.show,
        .newsletter-notification.show {
            right: 2rem;
        }

        .newsletter-notification.success {
            border-left-color: #28a745;
        }

        .notification-content {
            display: flex;
            align-items: center;
            gap: 0.75rem;
        }

        .notification-content i {
            color: var(--primary-color);
            font-size: 1.2rem;
        }

        .newsletter-notification.success .notification-content i {
            color: #28a745;
        }

        /* Loading states */
        .products-loading {
            grid-column: 1 / -1;
            text-align: center;
            padding: 3rem;
            color: var(--gray-600);
            font-size: 1.1rem;
        }

        .no-products {
            grid-column: 1 / -1;
            text-align: center;
            padding: 3rem;
            color: var(--gray-600);
        }

        .no-products i {
            font-size: 3rem;
            margin-bottom: 1rem;
            color: var(--gray-400);
        }

        /* Product rating */
        .product-rating {
            display: flex;
            align-items: center;
            gap: 0.5rem;
            margin-bottom: 1rem;
        }

        .product-rating .fas.fa-star {
            color: #ffc107;
        }

        .product-rating .far.fa-star {
            color: var(--gray-300);
        }

        .review-count {
            font-size: 0.8rem;
            color: var(--gray-500);
        }

        .out-of-stock {
            background: #dc3545;
            color: white;
            padding: 0.25rem 0.5rem;
            border-radius: var(--border-radius-sm);
            font-size: 0.8rem;
            text-align: center;
            margin-top: 0.5rem;
        }

        /* Product card enhancements */
        .product-card {
            position: relative;
            overflow: hidden;
        }

        .product-card::before {
            content: '';
            position: absolute;
            top: 0;
            left: -100%;
            width: 100%;
            height: 100%;
            background: linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent);
            transition: left 0.6s ease;
            z-index: 5;
            pointer-events: none;
        }

        .product-card:hover::before {
            left: 100%;
        }

        /* Section animations */
        section {
            opacity: 0;
            transform: translateY(50px);
            transition: all 0.8s ease;
        }

        section.animate-in {
            opacity: 1;
            transform: translateY(0);
        }

        /* Stagger animations for features */
        .feature {
            opacity: 0;
            transform: translateX(-30px);
            transition: all 0.6s ease;
        }

        .feature.animate-in {
            opacity: 1;
            transform: translateX(0);
        }

        .feature:nth-child(2) {
            transition-delay: 0.2s;
        }

        .feature:nth-child(3) {
            transition-delay: 0.4s;
        }

        /* Responsive design for product cart section */
        @media (max-width: 768px) {
            .product-cart-section {
                padding: var(--space-md) var(--space-sm) var(--space-sm);
            }
            
            .product-add-cart-btn {
                font-size: 0.8rem;
                padding: var(--space-xs) var(--space-sm);
            }
            
            .product-add-cart-btn span {
                display: none;
            }
            
            .product-wishlist-btn {
                width: 40px;
                height: 40px;
            }
        }

        @media (max-width: 480px) {
            .product-cart-section {
                flex-direction: column;
                gap: var(--space-xs);
            }
            
            .product-add-cart-btn span {
                display: inline;
                font-size: 0.7rem;
            }
        }
    </style>
`;

// Inject additional styles
document.head.insertAdjacentHTML('beforeend', additionalStyles);

// =========================================
// INITIALIZE APP
// =========================================
const app = new CharolaisApp();

// Add some additional utility functions
window.addEventListener('resize', () => {
    // Handle responsive behaviors
    const navbar = document.getElementById('navbar');
    const navMenu = document.getElementById('nav-menu');
    
    if (window.innerWidth > 768) {
        navMenu?.classList.remove('active');
    }
});

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
    // ESC key closes modals
    if (e.key === 'Escape') {
        document.querySelector('.search-modal.active')?.classList.remove('active');
        document.querySelector('.quick-view-modal.active')?.classList.remove('active');
        app.closeCart();
    }
});

// Add some Easter eggs for fun
let konamiCode = [];
const konamiSequence = [
    'ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown',
    'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight',
    'KeyB', 'KeyA'
];

document.addEventListener('keydown', (e) => {
    konamiCode.push(e.code);
    if (konamiCode.length > konamiSequence.length) {
        konamiCode.shift();
    }
    
    if (konamiCode.join(',') === konamiSequence.join(',')) {
        // Easter egg activated!
        document.body.style.filter = 'sepia(100%) hue-rotate(45deg)';
        
        setTimeout(() => {
            document.body.style.filter = '';
        }, 3000);
        
        konamiCode = [];
    }
});

console.log('🤠 ¡Bienvenido a Charolais! Tradición vaquera desde Monterrey, N.L.');