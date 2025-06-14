// =========================================
// CHAROLAIS ADMIN PANEL - IMPROVED VERSION
// =========================================

class CharolaisAdminPanel {
    constructor() {
        this.currentPage = 'dashboard';
        this.products = [];
        this.categories = [];
        this.selectedImages = [];
        this.editingProductId = null;
        this.autoRefreshInterval = null;
        
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.checkAuthentication();
        this.loadDashboard();
        this.startAutoRefresh();
    }

    // =========================================
    // AUTHENTICATION
    // =========================================
    async checkAuthentication() {
        try {
            const response = await fetch('/admin/check-auth');
            if (!response.ok) {
                window.location.href = '/admin/login.html';
                return;
            }
            const user = await response.json();
            document.getElementById('admin-username').textContent = user.username;
        } catch (error) {
            console.error('Error checking authentication:', error);
            window.location.href = '/admin/login.html';
        }
    }

    async logout() {
        try {
            await fetch('/admin/logout', { method: 'POST' });
            window.location.href = '/admin/login.html';
        } catch (error) {
            console.error('Error logging out:', error);
        }
    }

    // =========================================
    // EVENT LISTENERS
    // =========================================
    setupEventListeners() {
        // Menu navigation
        document.querySelectorAll('.menu-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const page = link.dataset.page;
                if (page) {
                    this.showPage(page);
                }
            });
        });

        // Product search
        const searchInput = document.getElementById('product-search');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.filterProducts(e.target.value);
            });
        }

        // Image upload handlers
        this.setupImageUploadHandlers();

        // Form submissions
        this.setupFormHandlers();

        // Stock settings form
        const stockSettingsForm = document.getElementById('stock-settings-form');
        if (stockSettingsForm) {
            stockSettingsForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.saveStockSettings();
            });
        }
    }

    setupImageUploadHandlers() {
        // Product image upload
        const productImageUpload = document.getElementById('product-image-upload');
        const productImageInput = document.getElementById('product-image-input');

        if (productImageUpload && productImageInput) {
            productImageUpload.addEventListener('click', () => productImageInput.click());
            productImageInput.addEventListener('change', (e) => this.handleImageSelection(e.target.files, 'product'));
            
            // Drag and drop
            productImageUpload.addEventListener('dragover', (e) => {
                e.preventDefault();
                productImageUpload.classList.add('dragover');
            });
            productImageUpload.addEventListener('dragleave', () => {
                productImageUpload.classList.remove('dragover');
            });
            productImageUpload.addEventListener('drop', (e) => {
                e.preventDefault();
                productImageUpload.classList.remove('dragover');
                this.handleImageSelection(e.dataTransfer.files, 'product');
            });
        }

        // Edit product image upload
        const editImageUpload = document.getElementById('edit-product-image-upload');
        const editImageInput = document.getElementById('edit-product-image-input');

        if (editImageUpload && editImageInput) {
            editImageUpload.addEventListener('click', () => editImageInput.click());
            editImageInput.addEventListener('change', (e) => this.handleImageSelection(e.target.files, 'edit-product'));
            
            // Drag and drop
            editImageUpload.addEventListener('dragover', (e) => {
                e.preventDefault();
                editImageUpload.classList.add('dragover');
            });
            editImageUpload.addEventListener('dragleave', () => {
                editImageUpload.classList.remove('dragover');
            });
            editImageUpload.addEventListener('drop', (e) => {
                e.preventDefault();
                editImageUpload.classList.remove('dragover');
                this.handleImageSelection(e.dataTransfer.files, 'edit-product');
            });
        }

        // Bulk image upload
        const bulkImageUpload = document.getElementById('bulk-image-upload');
        const bulkImageInput = document.getElementById('bulk-image-input');

        if (bulkImageUpload && bulkImageInput) {
            bulkImageUpload.addEventListener('click', () => bulkImageInput.click());
            bulkImageInput.addEventListener('change', (e) => this.handleImageSelection(e.target.files, 'bulk'));
            
            // Drag and drop
            bulkImageUpload.addEventListener('dragover', (e) => {
                e.preventDefault();
                bulkImageUpload.classList.add('dragover');
            });
            bulkImageUpload.addEventListener('dragleave', () => {
                bulkImageUpload.classList.remove('dragover');
            });
            bulkImageUpload.addEventListener('drop', (e) => {
                e.preventDefault();
                bulkImageUpload.classList.remove('dragover');
                this.handleImageSelection(e.dataTransfer.files, 'bulk');
            });
        }
    }

    setupFormHandlers() {
        // Add product form
        const addProductForm = document.getElementById('add-product-form');
        if (addProductForm) {
            addProductForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.saveProduct();
            });
        }

        // Edit product form
        const editProductForm = document.getElementById('edit-product-form');
        if (editProductForm) {
            editProductForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.updateProduct();
            });
        }
    }

    // =========================================
    // PAGE NAVIGATION
    // =========================================
    showPage(page) {
        // Hide all pages
        document.querySelectorAll('.page').forEach(p => {
            p.classList.add('hidden');
        });

        // Show selected page
        const pageElement = document.getElementById(`${page}-page`);
        if (pageElement) {
            pageElement.classList.remove('hidden');
        }

        // Update menu
        document.querySelectorAll('.menu-link').forEach(link => {
            link.classList.remove('active');
        });
        const activeLink = document.querySelector(`[data-page="${page}"]`);
        if (activeLink) {
            activeLink.classList.add('active');
        }

        this.currentPage = page;

        // Load page data
        switch(page) {
            case 'dashboard':
                this.loadDashboard();
                break;
            case 'products':
                this.loadProducts();
                break;
            case 'categories':
                this.loadCategories();
                break;
            case 'stock':
                this.loadStockPage();
                break;
            case 'images':
                this.loadImagesPage();
                break;
            case 'settings':
                this.loadSettings();
                break;
        }
    }

    // =========================================
    // DASHBOARD
    // =========================================
    async loadDashboard() {
        try {
            const response = await fetch('/admin/dashboard-stats');
            const stats = await response.json();

            document.getElementById('total-products').textContent = stats.totalProducts || '0';
            document.getElementById('low-stock-count').textContent = stats.lowStockCount || '0';
            document.getElementById('out-of-stock-count').textContent = stats.outOfStockCount || '0';
            document.getElementById('total-categories').textContent = stats.totalCategories || '0';

            // Load recent products
            this.loadRecentProducts();

        } catch (error) {
            console.error('Error loading dashboard:', error);
            this.showAlert('Error al cargar el dashboard', 'danger');
        }
    }

    async loadRecentProducts() {
        try {
            const response = await fetch('/admin/products');
            const products = await response.json();

            const container = document.getElementById('recent-products');
            if (!container) return;

            // Tomar solo los primeros 6 productos
            const recentProducts = products.slice(0, 6);

            if (recentProducts.length === 0) {
                container.innerHTML = '<p style="color: var(--gray-600); text-align: center;">No hay productos</p>';
                return;
            }

            container.innerHTML = recentProducts.map(product => `
                <div class="product-card">
                    <img src="${product.primaryImage || '/images/placeholder.jpg'}" alt="${product.name}" class="product-image">
                    <div class="product-info">
                        <h3 class="product-name">${product.name}</h3>
                        <p class="product-price">$${product.price}</p>
                        <span class="product-stock ${this.getStockClass(product.stock_quantity)}">${this.getStockText(product.stock_quantity)}</span>
                    </div>
                </div>
            `).join('');

        } catch (error) {
            console.error('Error loading recent products:', error);
        }
    }

    // =========================================
    // PRODUCTS MANAGEMENT
    // =========================================
    async loadProducts() {
        try {
            const response = await fetch('/admin/products');
            this.products = await response.json();
            this.renderProductsTable();
        } catch (error) {
            console.error('Error loading products:', error);
            this.showAlert('Error al cargar productos', 'danger');
        }
    }

    renderProductsTable() {
        const tbody = document.getElementById('products-table-body');
        if (!tbody) return;

        if (this.products.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; color: var(--gray-600);">No hay productos</td></tr>';
            return;
        }

        tbody.innerHTML = this.products.map(product => `
            <tr>
                <td>
                    <img src="${product.primaryImage || '/images/placeholder.jpg'}" alt="${product.name}" 
                         style="width: 50px; height: 50px; object-fit: cover; border-radius: 5px;">
                </td>
                <td>${product.name}</td>
                <td>${this.getCategoryName(product.category_id)}</td>
                <td>$${product.price}</td>
                <td>
                    <span class="product-stock ${this.getStockClass(product.stock_quantity)}">
                        ${product.stock_quantity}
                    </span>
                </td>
                <td>
                    <span class="product-stock ${this.getStockClass(product.stock_quantity)}">
                        ${this.getStockText(product.stock_quantity)}
                    </span>
                </td>
                <td>
                    <div style="display: flex; gap: 0.5rem;">
                        <button class="btn btn-warning btn-sm" onclick="editProduct(${product.id})">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-info btn-sm" onclick="updateStockQuick(${product.id})">
                            <i class="fas fa-warehouse"></i>
                        </button>
                        <button class="btn btn-danger btn-sm" onclick="deleteProduct(${product.id})">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');
    }

    filterProducts(searchTerm) {
        const filteredProducts = this.products.filter(product => 
            product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            this.getCategoryName(product.category_id).toLowerCase().includes(searchTerm.toLowerCase())
        );
        
        const tbody = document.getElementById('products-table-body');
        if (!tbody) return;

        if (filteredProducts.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; color: var(--gray-600);">No se encontraron productos</td></tr>';
            return;
        }

        tbody.innerHTML = filteredProducts.map(product => `
            <tr>
                <td>
                    <img src="${product.primaryImage || '/images/placeholder.jpg'}" alt="${product.name}" 
                         style="width: 50px; height: 50px; object-fit: cover; border-radius: 5px;">
                </td>
                <td>${product.name}</td>
                <td>${this.getCategoryName(product.category_id)}</td>
                <td>$${product.price}</td>
                <td>
                    <span class="product-stock ${this.getStockClass(product.stock_quantity)}">
                        ${product.stock_quantity}
                    </span>
                </td>
                <td>
                    <span class="product-stock ${this.getStockClass(product.stock_quantity)}">
                        ${this.getStockText(product.stock_quantity)}
                    </span>
                </td>
                <td>
                    <div style="display: flex; gap: 0.5rem;">
                        <button class="btn btn-warning btn-sm" onclick="editProduct(${product.id})">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-info btn-sm" onclick="updateStockQuick(${product.id})">
                            <i class="fas fa-warehouse"></i>
                        </button>
                        <button class="btn btn-danger btn-sm" onclick="deleteProduct(${product.id})">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');
    }

    // =========================================
    // CATEGORIES MANAGEMENT
    // =========================================
    async loadCategories() {
        try {
            const response = await fetch('/admin/categories');
            this.categories = await response.json();
            this.renderCategoriesList();
            this.populateCategorySelects();
        } catch (error) {
            console.error('Error loading categories:', error);
            this.showAlert('Error al cargar categorías', 'danger');
        }
    }

    renderCategoriesList() {
        const container = document.getElementById('categories-list');
        if (!container) return;

        container.innerHTML = this.categories.map(category => `
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 1rem; border-bottom: 1px solid var(--gray-200);">
                <div>
                    <h3 style="margin: 0; color: var(--dark-brown);">${category.name}</h3>
                    <p style="margin: 0.5rem 0 0 0; color: var(--gray-600);">${category.description || 'Sin descripción'}</p>
                </div>
                <div style="display: flex; gap: 0.5rem;">
                    <button class="btn btn-warning btn-sm" onclick="editCategory(${category.id})">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-danger btn-sm" onclick="deleteCategory(${category.id})">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `).join('');
    }

    populateCategorySelects() {
        const selects = ['product-category', 'edit-product-category'];
        selects.forEach(selectId => {
            const select = document.getElementById(selectId);
            if (select) {
                select.innerHTML = '<option value="">Seleccionar categoría</option>' +
                    this.categories.map(category => 
                        `<option value="${category.id}">${category.name}</option>`
                    ).join('');
            }
        });
    }

    getCategoryName(categoryId) {
        const category = this.categories.find(c => c.id === categoryId);
        return category ? category.name : 'Sin categoría';
    }

    // =========================================
    // STOCK MANAGEMENT
    // =========================================
    async loadStockPage() {
        await this.loadProducts();
        this.renderLowStockProducts();
        this.renderStockTable();
    }

    renderLowStockProducts() {
        const container = document.getElementById('low-stock-products');
        if (!container) return;

        const lowStockProducts = this.products.filter(product => product.stock_quantity <= 10);
        
        if (lowStockProducts.length === 0) {
            container.innerHTML = '<p style="color: var(--gray-600); text-align: center;">No hay productos con stock bajo</p>';
            return;
        }

        container.innerHTML = lowStockProducts.map(product => `
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 1rem; border-bottom: 1px solid var(--gray-200);">
                <div style="display: flex; align-items: center; gap: 1rem;">
                    <img src="${product.primaryImage || '/images/placeholder.jpg'}" alt="${product.name}" 
                         style="width: 50px; height: 50px; object-fit: cover; border-radius: 5px;">
                    <div>
                        <h4 style="margin: 0; color: var(--dark-brown);">${product.name}</h4>
                        <p style="margin: 0.25rem 0 0 0; color: var(--gray-600);">Stock actual: ${product.stock_quantity}</p>
                    </div>
                </div>
                <button class="btn btn-warning" onclick="updateStockQuick(${product.id})">
                    <i class="fas fa-warehouse"></i>
                    Actualizar Stock
                </button>
            </div>
        `).join('');
    }

    renderStockTable() {
        const tbody = document.getElementById('stock-table-body');
        if (!tbody) return;

        tbody.innerHTML = this.products.map(product => `
            <tr>
                <td>
                    <div style="display: flex; align-items: center; gap: 1rem;">
                        <img src="${product.primaryImage || '/images/placeholder.jpg'}" alt="${product.name}" 
                             style="width: 40px; height: 40px; object-fit: cover; border-radius: 5px;">
                        <span>${product.name}</span>
                    </div>
                </td>
                <td>${product.stock_quantity}</td>
                <td>${product.min_stock || 5}</td>
                <td>
                    <span class="product-stock ${this.getStockClass(product.stock_quantity)}">
                        ${this.getStockText(product.stock_quantity)}
                    </span>
                </td>
                <td>
                    <button class="btn btn-warning btn-sm" onclick="updateStockQuick(${product.id})">
                        <i class="fas fa-warehouse"></i>
                        Actualizar
                    </button>
                </td>
            </tr>
        `).join('');
    }

    // =========================================
    // IMAGES MANAGEMENT
    // =========================================
    async loadImagesPage() {
        await this.loadProducts();
        this.renderProductImages();
    }

    renderProductImages() {
        const container = document.getElementById('product-images-grid');
        if (!container) return;

        if (this.products.length === 0) {
            container.innerHTML = '<p style="color: var(--gray-600); text-align: center;">No hay productos</p>';
            return;
        }

        container.innerHTML = this.products.map(product => `
            <div style="background: white; border-radius: 10px; padding: 1rem; box-shadow: 0 2px 10px rgba(0,0,0,0.1); margin-bottom: 1rem;">
                <h4 style="margin: 0 0 1rem 0; color: var(--dark-brown);">${product.name}</h4>
                <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(100px, 1fr)); gap: 0.5rem;">
                    ${product.primaryImage ? `
                        <div style="position: relative;">
                            <img src="${product.primaryImage}" alt="${product.name}" 
                                 style="width: 100%; height: 100px; object-fit: cover; border-radius: 5px;">
                            <button class="btn btn-danger btn-sm" 
                                    style="position: absolute; top: 5px; right: 5px; width: 25px; height: 25px; padding: 0;"
                                    onclick="removeProductImage(${product.id}, '${product.primaryImage}')">
                                <i class="fas fa-times"></i>
                            </button>
                        </div>
                    ` : '<p style="color: var(--gray-600); grid-column: 1 / -1;">Sin imágenes</p>'}
                </div>
            </div>
        `).join('');
    }

    // =========================================
    // SETTINGS
    // =========================================
    async loadSettings() {
        try {
            const response = await fetch('/admin/settings');
            const settings = await response.json();
            
            document.getElementById('default-min-stock').value = settings.defaultMinStock || 5;
            document.getElementById('low-stock-alert').value = settings.lowStockAlert || 10;
        } catch (error) {
            console.error('Error loading settings:', error);
        }
    }

    async saveStockSettings() {
        try {
            const settings = {
                defaultMinStock: parseInt(document.getElementById('default-min-stock').value),
                lowStockAlert: parseInt(document.getElementById('low-stock-alert').value)
            };

            const response = await fetch('/admin/settings', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(settings)
            });

            if (response.ok) {
                this.showAlert('Configuración guardada exitosamente', 'success');
            } else {
                throw new Error('Error al guardar configuración');
            }
        } catch (error) {
            console.error('Error saving settings:', error);
            this.showAlert('Error al guardar configuración', 'danger');
        }
    }

    // =========================================
    // PRODUCT CRUD OPERATIONS
    // =========================================
    async saveProduct() {
        try {
            const formData = new FormData();
            
            formData.append('name', document.getElementById('product-name').value);
            formData.append('category_id', document.getElementById('product-category').value);
            formData.append('price', document.getElementById('product-price').value);
            formData.append('stock_quantity', document.getElementById('product-stock').value);
            formData.append('description', document.getElementById('product-description').value);

            // Add images
            this.selectedImages.forEach(file => {
                formData.append('images', file);
            });

            const response = await fetch('/admin/products', {
                method: 'POST',
                body: formData
            });

            if (response.ok) {
                this.showAlert('Producto guardado exitosamente', 'success');
                this.closeModal('add-product-modal');
                this.clearProductForm();
                this.loadProducts();
                this.loadDashboard();
            } else {
                throw new Error('Error al guardar producto');
            }
        } catch (error) {
            console.error('Error saving product:', error);
            this.showAlert('Error al guardar producto', 'danger');
        }
    }

    async updateProduct() {
        try {
            const formData = new FormData();
            
            formData.append('name', document.getElementById('edit-product-name').value);
            formData.append('category_id', document.getElementById('edit-product-category').value);
            formData.append('price', document.getElementById('edit-product-price').value);
            formData.append('stock_quantity', document.getElementById('edit-product-stock').value);
            formData.append('description', document.getElementById('edit-product-description').value);

            // Add new images
            this.selectedImages.forEach(file => {
                formData.append('images', file);
            });

            const response = await fetch(`/admin/products/${this.editingProductId}`, {
                method: 'PUT',
                body: formData
            });

            if (response.ok) {
                this.showAlert('Producto actualizado exitosamente', 'success');
                this.closeModal('edit-product-modal');
                this.clearEditProductForm();
                this.loadProducts();
                this.loadDashboard();
            } else {
                throw new Error('Error al actualizar producto');
            }
        } catch (error) {
            console.error('Error updating product:', error);
            this.showAlert('Error al actualizar producto', 'danger');
        }
    }

    async deleteProduct(productId) {
        if (!confirm('¿Estás seguro de que quieres eliminar este producto?')) {
            return;
        }

        try {
            const response = await fetch(`/admin/products/${productId}`, {
                method: 'DELETE'
            });

            if (response.ok) {
                this.showAlert('Producto eliminado exitosamente', 'success');
                this.loadProducts();
                this.loadDashboard();
            } else {
                throw new Error('Error al eliminar producto');
            }
        } catch (error) {
            console.error('Error deleting product:', error);
            this.showAlert('Error al eliminar producto', 'danger');
        }
    }

    // =========================================
    // STOCK QUICK UPDATE
    // =========================================
    async updateStockQuick(productId) {
        const product = this.products.find(p => p.id === productId);
        if (!product) return;

        document.getElementById('stock-product-id').value = product.id;
        document.getElementById('stock-product-name').value = product.name;
        document.getElementById('stock-current').value = product.stock_quantity;
        document.getElementById('stock-minimum').value = product.min_stock || 5;

        this.showModal('stock-modal');
    }

    async updateStock() {
        try {
            const productId = document.getElementById('stock-product-id').value;
            const stock = parseInt(document.getElementById('stock-current').value);
            const minStock = parseInt(document.getElementById('stock-minimum').value);

            const response = await fetch(`/admin/products/${productId}/stock`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ stock, min_stock: minStock })
            });

            if (response.ok) {
                this.showAlert('Stock actualizado exitosamente', 'success');
                this.closeModal('stock-modal');
                this.loadProducts();
                this.loadDashboard();
                if (this.currentPage === 'stock') {
                    this.loadStockPage();
                }
            } else {
                throw new Error('Error al actualizar stock');
            }
        } catch (error) {
            console.error('Error updating stock:', error);
            this.showAlert('Error al actualizar stock', 'danger');
        }
    }

    // =========================================
    // IMAGE HANDLING
    // =========================================
    handleImageSelection(files, type) {
        Array.from(files).forEach(file => {
            if (file.type.startsWith('image/')) {
                this.selectedImages.push(file);
                this.displayImagePreview(file, type);
            }
        });
    }

    displayImagePreview(file, type) {
        const reader = new FileReader();
        reader.onload = (e) => {
            const previewContainer = document.getElementById(`${type}-image-preview`);
            if (previewContainer) {
                const previewItem = document.createElement('div');
                previewItem.className = 'image-preview-item';
                previewItem.innerHTML = `
                    <img src="${e.target.result}" alt="Preview">
                    <button class="remove-btn" onclick="removeSelectedImage('${file.name}')">
                        <i class="fas fa-times"></i>
                    </button>
                `;
                previewContainer.appendChild(previewItem);
            }
        };
        reader.readAsDataURL(file);
    }

    removeSelectedImage(fileName) {
        this.selectedImages = this.selectedImages.filter(file => file.name !== fileName);
        this.updateImagePreviews();
    }

    updateImagePreviews() {
        // Clear all previews
        const previewContainers = ['product-image-preview', 'edit-product-image-preview', 'bulk-image-preview'];
        previewContainers.forEach(containerId => {
            const container = document.getElementById(containerId);
            if (container) {
                container.innerHTML = '';
            }
        });

        // Re-add previews for remaining images
        this.selectedImages.forEach(file => {
            this.displayImagePreview(file, 'product');
        });
    }

    // =========================================
    // MODAL MANAGEMENT
    // =========================================
    showModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.add('show');
        }
    }

    closeModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.remove('show');
        }
    }

    showAddProductModal() {
        this.clearProductForm();
        this.showModal('add-product-modal');
    }

    async editProduct(productId) {
        try {
            const response = await fetch(`/admin/products/${productId}`);
            const product = await response.json();

            this.editingProductId = product.id;
            document.getElementById('edit-product-id').value = product.id;
            document.getElementById('edit-product-name').value = product.name;
            document.getElementById('edit-product-category').value = product.category_id;
            document.getElementById('edit-product-price').value = product.price;
            document.getElementById('edit-product-stock').value = product.stock_quantity;
            document.getElementById('edit-product-description').value = product.description || '';

            // Show current images
            const currentImagesContainer = document.getElementById('edit-product-current-images');
            if (currentImagesContainer) {
                if (product.images && product.images.length > 0) {
                    currentImagesContainer.innerHTML = product.images.map(image => `
                        <div class="image-preview-item">
                            <img src="${image.image_url}" alt="Current image">
                            <button class="remove-btn" onclick="removeProductImage(${product.id}, '${image.image_url}')">
                                <i class="fas fa-times"></i>
                            </button>
                        </div>
                    `).join('');
                } else {
                    currentImagesContainer.innerHTML = '<p style="color: var(--gray-600); text-align: center;">Sin imágenes</p>';
                }
            }

            this.showModal('edit-product-modal');
        } catch (error) {
            console.error('Error loading product for edit:', error);
            this.showAlert('Error al cargar producto', 'danger');
        }
    }

    // =========================================
    // FORM CLEARING
    // =========================================
    clearProductForm() {
        document.getElementById('add-product-form').reset();
        document.getElementById('product-image-preview').innerHTML = '';
        this.selectedImages = [];
    }

    clearEditProductForm() {
        document.getElementById('edit-product-form').reset();
        document.getElementById('edit-product-image-preview').innerHTML = '';
        document.getElementById('edit-product-current-images').innerHTML = '';
        this.selectedImages = [];
        this.editingProductId = null;
    }

    // =========================================
    // UTILITY FUNCTIONS
    // =========================================
    getStockClass(stock) {
        if (stock === 0) return 'stock-out';
        if (stock <= 5) return 'stock-low';
        if (stock <= 10) return 'stock-medium';
        return 'stock-high';
    }

    getStockText(stock) {
        if (stock === 0) return 'Sin Stock';
        if (stock <= 5) return 'Stock Bajo';
        if (stock <= 10) return 'Stock Medio';
        return 'Stock Alto';
    }

    showAlert(message, type) {
        const alertContainer = document.getElementById('alert-container');
        const alert = document.createElement('div');
        alert.className = `alert alert-${type}`;
        alert.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center;">
                <span>${message}</span>
                <button onclick="this.parentElement.parentElement.remove()" style="background: none; border: none; font-size: 1.2rem; cursor: pointer;">&times;</button>
            </div>
        `;
        
        alertContainer.appendChild(alert);
        
        setTimeout(() => {
            if (alert.parentElement) {
                alert.remove();
            }
        }, 5000);
    }

    // =========================================
    // AUTO REFRESH
    // =========================================
    startAutoRefresh() {
        this.autoRefreshInterval = setInterval(() => {
            if (this.currentPage === 'dashboard') {
                this.loadDashboard();
            } else if (this.currentPage === 'products') {
                this.loadProducts();
            } else if (this.currentPage === 'stock') {
                this.loadStockPage();
            }
        }, 30000); // Refresh every 30 seconds
    }

    stopAutoRefresh() {
        if (this.autoRefreshInterval) {
            clearInterval(this.autoRefreshInterval);
        }
    }
}

// =========================================
// GLOBAL FUNCTIONS
// =========================================

let adminPanel;

document.addEventListener('DOMContentLoaded', () => {
    adminPanel = new CharolaisAdminPanel();
});

// Global functions for onclick handlers
function logout() {
    adminPanel.logout();
}

function showPage(page) {
    adminPanel.showPage(page);
}

function showAddProductModal() {
    adminPanel.showAddProductModal();
}

function closeModal(modalId) {
    adminPanel.closeModal(modalId);
}

function saveProduct() {
    adminPanel.saveProduct();
}

function updateProduct() {
    adminPanel.updateProduct();
}

function editProduct(productId) {
    adminPanel.editProduct(productId);
}

function deleteProduct(productId) {
    adminPanel.deleteProduct(productId);
}

function updateStockQuick(productId) {
    adminPanel.updateStockQuick(productId);
}

function updateStock() {
    adminPanel.updateStock();
}

function removeSelectedImage(fileName) {
    adminPanel.removeSelectedImage(fileName);
}

function removeProductImage(productId, imageUrl) {
    if (confirm('¿Estás seguro de que quieres eliminar esta imagen?')) {
        fetch(`/admin/product-images/${productId}`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ imageUrl })
        }).then(response => {
            if (response.ok) {
                adminPanel.showAlert('Imagen eliminada exitosamente', 'success');
                adminPanel.loadImagesPage();
                // Recargar productos para actualizar las imágenes
                adminPanel.loadProducts();
            } else {
                adminPanel.showAlert('Error al eliminar imagen', 'danger');
            }
        }).catch(error => {
            console.error('Error removing image:', error);
            adminPanel.showAlert('Error al eliminar imagen', 'danger');
        });
    }
} 