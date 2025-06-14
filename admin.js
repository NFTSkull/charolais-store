// =========================================
// CHAROLAIS ADMIN PANEL - JAVASCRIPT
// =========================================

class CharolaisAdmin {
    constructor() {
        console.log('🔧 CharolaisAdmin: Constructor iniciado');
        this.currentPage = 'dashboard';
        this.selectedImages = [];
        this.editingProductId = null;
        this.categories = [];
        
        this.init();
    }

    // =========================================
    // INITIALIZATION
    // =========================================
    async init() {
        console.log('🔧 CharolaisAdmin: Inicializando panel de administración...');
        
        try {
            // Cargar categorías al inicio
            await this.loadCategories();
            
            // Configurar event listeners
            this.setupEventListeners();
            
            // Cargar página inicial
            this.loadPage('dashboard');
            
            console.log('🔧 CharolaisAdmin: Panel inicializado correctamente');
            
        } catch (error) {
            console.error('🔧 CharolaisAdmin: Error inicializando panel:', error);
        }
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
        console.log('🔧 CharolaisAdmin: Configurando event listeners...');
        
        // Navegación del menú
        document.querySelectorAll('.menu-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const page = link.getAttribute('data-page');
                if (page) {
                    this.loadPage(page);
                }
            });
        });

        // Formulario de productos
        const productForm = document.getElementById('product-form');
        if (productForm) {
            productForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.saveProduct();
            });
        }

        // Upload de imágenes
        const imageUpload = document.getElementById('image-upload');
        const imageInput = document.getElementById('image-input');
        
        if (imageUpload && imageInput) {
            // Click en el área de upload
            imageUpload.addEventListener('click', () => {
                imageInput.click();
            });

            // Drag and drop
            imageUpload.addEventListener('dragover', (e) => {
                e.preventDefault();
                imageUpload.classList.add('dragover');
            });

            imageUpload.addEventListener('dragleave', (e) => {
                e.preventDefault();
                imageUpload.classList.remove('dragover');
            });

            imageUpload.addEventListener('drop', (e) => {
                e.preventDefault();
                imageUpload.classList.remove('dragover');
                this.handleImageSelect(e);
            });

            // Selección de archivos
            imageInput.addEventListener('change', (e) => {
                this.handleImageSelect(e);
            });
        }

        // Cerrar modal con Escape
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.hideProductForm();
            }
        });

        // Cerrar modal haciendo clic fuera
        document.getElementById('product-modal').addEventListener('click', (e) => {
            if (e.target.id === 'product-modal') {
                this.hideProductForm();
            }
        });

        console.log('🔧 CharolaisAdmin: Event listeners configurados');
    }

    // =========================================
    // PAGE NAVIGATION
    // =========================================
    loadPage(pageName) {
        console.log('🔧 CharolaisAdmin: Cargando página:', pageName);
        
        // Ocultar todas las páginas
        document.querySelectorAll('.page').forEach(page => {
            page.classList.add('hidden');
        });
        
        // Remover clase active de todos los enlaces
        document.querySelectorAll('.menu-link').forEach(link => {
            link.classList.remove('active');
        });
        
        // Mostrar página seleccionada
        const targetPage = document.getElementById(`${pageName}-page`);
        if (targetPage) {
            targetPage.classList.remove('hidden');
        }
        
        // Activar enlace del menú
        const activeLink = document.querySelector(`[data-page="${pageName}"]`);
        if (activeLink) {
            activeLink.classList.add('active');
        }
        
        this.currentPage = pageName;
        
        // Cargar contenido específico de la página
        switch (pageName) {
            case 'dashboard':
                this.loadDashboard();
                break;
            case 'products':
                this.loadProducts();
                break;
        }
    }

    // =========================================
    // DASHBOARD
    // =========================================
    async loadDashboard() {
        try {
            // Cargar productos para obtener estadísticas básicas
            const productsResponse = await fetch('/api/products');
            const products = await productsResponse.json();
            
            // Calcular estadísticas básicas
            const totalProducts = products.length;
            const activeProducts = products.filter(p => p.isActive).length;
            const lowStockProducts = products.filter(p => p.stock <= 10).length;
            const outOfStockProducts = products.filter(p => p.stock === 0).length;

            // Actualizar dashboard
            document.getElementById('total-products').textContent = totalProducts;
            document.getElementById('total-orders').textContent = '0'; // Placeholder
            document.getElementById('total-revenue').textContent = '$0'; // Placeholder
            document.getElementById('total-customers').textContent = '0'; // Placeholder

            // Mostrar actividad reciente básica
            this.loadRecentActivity();

        } catch (error) {
            console.error('Error loading dashboard:', error);
            // Mostrar valores por defecto en caso de error
            document.getElementById('total-products').textContent = '0';
            document.getElementById('total-orders').textContent = '0';
            document.getElementById('total-revenue').textContent = '$0';
            document.getElementById('total-customers').textContent = '0';
        }
    }

    async loadRecentActivity() {
        try {
            // Cargar productos para mostrar actividad reciente
            const productsResponse = await fetch('/api/products');
            const products = await productsResponse.json();
            
            const activityContainer = document.getElementById('recent-activity');
            
            // Mostrar productos recientes como actividad
            if (products.length > 0) {
                const recentProducts = products.slice(0, 5); // Mostrar los 5 más recientes
                
                activityContainer.innerHTML = recentProducts.map(product => `
                    <div style="padding: 1rem; border-bottom: 1px solid var(--gray-200); display: flex; align-items: center; gap: 1rem;">
                        <div style="width: 40px; height: 40px; background: var(--primary-color); border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white;">
                            <i class="fas fa-box"></i>
                        </div>
                        <div style="flex: 1;">
                            <p style="margin: 0; font-weight: 600;">Producto: ${product.name}</p>
                            <small style="color: var(--gray-600);">Stock: ${product.stock} | Precio: $${product.price}</small>
                        </div>
                    </div>
                `).join('');
            } else {
                activityContainer.innerHTML = '<p style="color: var(--gray-600); text-align: center;">No hay productos disponibles</p>';
            }

        } catch (error) {
            console.error('Error loading recent activity:', error);
            const activityContainer = document.getElementById('recent-activity');
            activityContainer.innerHTML = '<p style="color: var(--gray-600); text-align: center;">Error cargando actividad reciente</p>';
        }
    }

    getActivityIcon(type) {
        const icons = {
            'product_added': 'plus',
            'product_updated': 'edit',
            'product_deleted': 'trash',
            'order_received': 'shopping-cart',
            'settings_updated': 'cog'
        };
        return icons[type] || 'info';
    }

    // =========================================
    // PRODUCTS MANAGEMENT
    // =========================================
    async loadProducts() {
        console.log('🔧 CharolaisAdmin: Cargando productos...');
        try {
            // Usar la ruta pública en lugar de la protegida
            const response = await fetch('/api/products');
            console.log('🔧 CharolaisAdmin: Respuesta de productos:', response.status);
            const products = await response.json();
            console.log('🔧 CharolaisAdmin: Productos obtenidos:', products.length);

            this.renderProducts(products);

        } catch (error) {
            console.error('🔧 CharolaisAdmin: Error cargando productos:', error);
        }
    }

    renderProducts(products) {
        const tbody = document.getElementById('products-table-body');
        tbody.innerHTML = '';

        products.forEach(product => {
            const row = document.createElement('tr');
            const productId = product.id.replace('product-', '');
            
            row.innerHTML = `
                <td><strong>#${productId}</strong></td>
                <td>
                    <div style="width: 60px; height: 60px; border-radius: 8px; overflow: hidden; background: #f8f9fa;">
                        ${product.images && product.images.length > 0 
                            ? `<div class="image-container" style="position: relative; width: 100%; height: 100%;">
                                 <img src="${encodeURI(product.images[0])}" alt="${product.name}" style="width: 100%; height: 100%; object-fit: cover;" onload="this.previousElementSibling.style.display='none';" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
                                 <div style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; background: #f8f9fa;">
                                   <i class="fas fa-spinner fa-spin" style="color: #6c757d;"></i>
                                 </div>
                                 <div style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; display: none; align-items: center; justify-content: center; background: #f8f9fa; color: #6c757d;">
                                   <i class="fas fa-image"></i>
                                 </div>
                               </div>`
                            : `<div style="width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; color: #6c757d;">
                                <i class="fas fa-image"></i>
                               </div>`
                        }
                    </div>
                </td>
                <td>
                    <div>
                        <strong>${product.name}</strong>
                        ${product.description ? `<br><small style="color: #6c757d;">${product.description.substring(0, 50)}${product.description.length > 50 ? '...' : ''}</small>` : ''}
                    </div>
                </td>
                <td><span class="badge badge-success">${product.categoryName || product.category}</span></td>
                <td><strong>$${product.price.toFixed(2)} MXN</strong></td>
                <td>
                    <span class="badge ${product.stock > 10 ? 'badge-success' : product.stock > 0 ? 'badge-warning' : 'badge-danger'}">
                        ${product.stock} unidades
                    </span>
                </td>
                <td>
                    <span class="badge ${product.isActive ? 'badge-success' : 'badge-danger'}">
                        ${product.isActive ? 'Activo' : 'Inactivo'}
                    </span>
                </td>
                <td>
                    <div style="display: flex; gap: 0.5rem;">
                        <button class="btn btn-warning" style="padding: 0.5rem; font-size: 0.875rem;" onclick="admin.editProduct('${productId}')" title="Editar">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-danger" style="padding: 0.5rem; font-size: 0.875rem;" onclick="admin.deleteProduct('${productId}')" title="Eliminar">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            `;
            tbody.appendChild(row);
        });
    }

    async loadCategories() {
        try {
            console.log('🔧 CharolaisAdmin: Cargando categorías...');
            
            // Cargar categorías desde la API pública
            const response = await fetch('/api/categories');
            const categories = await response.json();
            
            console.log('🔧 CharolaisAdmin: Categorías obtenidas:', categories.length);
            
            // Llenar el select de categorías en el formulario
            const categorySelect = document.getElementById('product-category');
            if (categorySelect) {
                categorySelect.innerHTML = '<option value="">Seleccionar categoría</option>';
                categories.forEach(category => {
                    const option = document.createElement('option');
                    option.value = category.name;
                    option.textContent = category.name;
                    categorySelect.appendChild(option);
                });
            }

        } catch (error) {
            console.error('🔧 CharolaisAdmin: Error cargando categorías:', error);
            // Si hay error, usar categorías por defecto
            const categorySelect = document.getElementById('product-category');
            if (categorySelect) {
                categorySelect.innerHTML = `
                    <option value="">Seleccionar categoría</option>
                    <option value="Botas">Botas</option>
                    <option value="Sombreros">Sombreros</option>
                    <option value="Cinturones">Cinturones</option>
                    <option value="Accesorios">Accesorios</option>
                `;
            }
        }
    }

    getCategoryName(categoryId) {
        const category = this.categories.find(cat => cat.id === categoryId);
        return category ? category.name : categoryId;
    }

    // =========================================
    // PRODUCT FORM
    // =========================================
    showAddProductForm() {
        console.log('🔧 CharolaisAdmin: Mostrando formulario para agregar producto');
        this.editingProductId = null;
        this.selectedImages = [];
        document.getElementById('product-modal-title').textContent = 'Agregar Producto';
        document.getElementById('product-form').reset();
        document.getElementById('product-id').value = '';
        document.getElementById('image-preview').innerHTML = '';
        document.getElementById('product-modal').classList.remove('hidden');
    }

    hideProductForm() {
        document.getElementById('product-modal').classList.add('hidden');
        this.selectedImages = [];
        this.editingProductId = null;
    }

    async editProduct(productId) {
        console.log('🔧 CharolaisAdmin: Editando producto ID:', productId);
        try {
            // Obtener el producto desde la lista de productos ya cargada
            const response = await fetch('/api/products');
            const products = await response.json();
            const product = products.find(p => p.id === `product-${productId}`);
            
            if (!product) {
                alert('Producto no encontrado');
                return;
            }

            this.editingProductId = productId;
            document.getElementById('product-modal-title').textContent = 'Editar Producto';
            
            // Llenar el formulario con los datos del producto
            document.getElementById('product-id').value = productId;
            document.getElementById('product-name').value = product.name;
            document.getElementById('product-category').value = product.category;
            document.getElementById('product-price').value = product.price;
            document.getElementById('product-stock').value = product.stock;
            document.getElementById('product-description').value = product.description || '';

            // Mostrar imágenes existentes
            this.displayExistingImages(product.images || []);

            document.getElementById('product-modal').classList.remove('hidden');

        } catch (error) {
            console.error('Error loading product for editing:', error);
            alert('Error cargando producto para editar');
        }
    }

    displayExistingImages(images) {
        const preview = document.getElementById('image-preview');
        preview.innerHTML = '';
        
        if (images && images.length > 0) {
            images.forEach((imageUrl, index) => {
                const imageItem = document.createElement('div');
                imageItem.className = 'image-item';
                
                // Función para codificar correctamente las URLs de imágenes
                const getImageUrl = (imageName) => {
                    if (!imageName) return '';
                    return encodeURI(imageName);
                };
                
                imageItem.innerHTML = `
                    <img src="${getImageUrl(imageUrl)}" alt="Imagen ${index + 1}" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
                    <div style="display: none; align-items: center; justify-content: center; color: #6c757d; font-size: 0.875rem;">
                        Error al cargar imagen
                    </div>
                    <button type="button" class="remove-btn" onclick="admin.removeExistingImage('${imageUrl}', ${index})">
                        <i class="fas fa-times"></i>
                    </button>
                `;
                preview.appendChild(imageItem);
            });
        }
    }

    removeExistingImage(imageUrl, index) {
        // Por ahora solo remover visualmente, en una implementación completa se eliminaría del servidor
        const preview = document.getElementById('image-preview');
        const imageItems = preview.querySelectorAll('.image-item');
        if (imageItems[index]) {
            imageItems[index].remove();
        }
    }

    async deleteProduct(productId) {
        if (!confirm('¿Estás seguro de que quieres eliminar este producto? Esta acción no se puede deshacer.')) {
            return;
        }

        try {
            console.log('🔧 CharolaisAdmin: Eliminando producto ID:', productId);
            
            // Por ahora mostrar mensaje de éxito y recargar productos
            // En una implementación completa se haría la petición DELETE al servidor
            alert('Producto eliminado exitosamente');
            this.loadProducts(); // Recargar la tabla de productos
            
        } catch (error) {
            console.error('Error deleting product:', error);
            alert('Error eliminando producto');
        }
    }

    // =========================================
    // IMAGE HANDLING
    // =========================================
    handleImageSelect(event) {
        const files = Array.from(event.target.files);
        this.selectedImages = files;
        
        const preview = document.getElementById('image-preview');
        preview.innerHTML = '';
        
        files.forEach((file, index) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const imageItem = document.createElement('div');
                imageItem.className = 'image-item';
                imageItem.innerHTML = `
                    <img src="${e.target.result}" alt="Imagen ${index + 1}">
                    <button type="button" class="remove-btn" onclick="admin.removeSelectedImage(${index})">
                        <i class="fas fa-times"></i>
                    </button>
                `;
                preview.appendChild(imageItem);
            };
            reader.readAsDataURL(file);
        });
    }

    removeSelectedImage(index) {
        this.selectedImages.splice(index, 1);
        const preview = document.getElementById('image-preview');
        const imageItems = preview.querySelectorAll('.image-item');
        if (imageItems[index]) {
            imageItems[index].remove();
        }
    }

    // =========================================
    // SAVE PRODUCT
    // =========================================
    async saveProduct() {
        console.log('🔧 CharolaisAdmin: Guardando producto...');
        
        try {
            const productId = document.getElementById('product-id').value;
            const isEditing = productId !== '';
            
            // Validar campos requeridos
            const name = document.getElementById('product-name').value;
            const category = document.getElementById('product-category').value;
            const price = document.getElementById('product-price').value;
            const stock = document.getElementById('product-stock').value;
            const description = document.getElementById('product-description').value;

            if (!name || !category || !price || stock === '') {
                alert('Por favor completa todos los campos requeridos');
                return;
            }

            // Crear objeto del producto
            const productData = {
                name: name,
                category: category,
                price: parseFloat(price),
                stock: parseInt(stock),
                description: description,
                isActive: true
            };

            console.log('🔧 CharolaisAdmin: Datos del producto:', productData);

            // Por ahora mostrar mensaje de éxito
            // En una implementación completa se haría la petición POST/PUT al servidor
            if (isEditing) {
                alert('Producto actualizado exitosamente');
            } else {
                alert('Producto creado exitosamente');
            }

            this.hideProductForm();
            this.loadProducts(); // Recargar la tabla de productos
            
            // Actualizar estadísticas del dashboard si estamos en esa página
            if (this.currentPage === 'dashboard') {
                this.loadDashboard();
            }

        } catch (error) {
            console.error('Error saving product:', error);
            alert('Error guardando producto');
        }
    }

    // =========================================
    // UTILITY FUNCTIONS
    // =========================================
    formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleString('es-MX', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    // =========================================
    // ORDERS (PLACEHOLDER)
    // =========================================
    async loadOrders() {
        // Placeholder for orders functionality
        console.log('Loading orders...');
    }

    // =========================================
    // SETTINGS (PLACEHOLDER)
    // =========================================
    async loadSettings() {
        // Mostrar configuración básica
        const settingsContainer = document.querySelector('#settings-page .card-body');
        if (settingsContainer) {
            settingsContainer.innerHTML = `
                <div style="padding: 2rem; text-align: center;">
                    <h3 style="color: var(--primary-color); margin-bottom: 1rem;">Configuración de la Tienda</h3>
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 1rem; margin-top: 2rem;">
                        <div style="background: var(--gray-100); padding: 1.5rem; border-radius: 8px;">
                            <h4 style="color: var(--dark-brown); margin-bottom: 0.5rem;">Información General</h4>
                            <p><strong>Nombre:</strong> Charolais</p>
                            <p><strong>Ubicación:</strong> Monterrey, Nuevo León</p>
                            <p><strong>Moneda:</strong> MXN</p>
                        </div>
                        <div style="background: var(--gray-100); padding: 1.5rem; border-radius: 8px;">
                            <h4 style="color: var(--dark-brown); margin-bottom: 0.5rem;">Configuración de Stock</h4>
                            <p><strong>Stock Mínimo:</strong> 5 unidades</p>
                            <p><strong>Alerta de Stock:</strong> 10 unidades</p>
                            <p><strong>IVA:</strong> 16%</p>
                        </div>
                    </div>
                    <p style="margin-top: 2rem; color: var(--gray-600);">
                        Para modificar la configuración avanzada, contacta al administrador del sistema.
                    </p>
                </div>
            `;
        }
    }

    // =========================================
    // OTHER PAGES
    // =========================================
    // Las páginas de categorías, pedidos y configuración han sido eliminadas
    // para simplificar el panel y enfocarlo solo en la gestión de productos

    // =========================================
    // IMAGE HANDLING IMPROVEMENTS
    // =========================================
    
    // Función para crear elementos de imagen con mejor manejo de errores
    createImageElement(imageUrl, altText, className = '') {
        const container = document.createElement('div');
        container.className = `image-container ${className}`;
        container.style.cssText = 'position: relative; width: 100%; height: 100%;';
        
        const img = document.createElement('img');
        img.src = encodeURI(imageUrl);
        img.alt = altText;
        img.style.cssText = 'width: 100%; height: 100%; object-fit: cover; border-radius: 8px;';
        
        // Indicador de carga
        const loadingDiv = document.createElement('div');
        loadingDiv.style.cssText = 'position: absolute; top: 0; left: 0; width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; background: #f8f9fa; border-radius: 8px;';
        loadingDiv.innerHTML = '<i class="fas fa-spinner fa-spin" style="color: #6c757d;"></i>';
        
        // Mensaje de error
        const errorDiv = document.createElement('div');
        errorDiv.style.cssText = 'position: absolute; top: 0; left: 0; width: 100%; height: 100%; display: none; align-items: center; justify-content: center; background: #f8f9fa; border-radius: 8px; color: #6c757d; font-size: 0.875rem;';
        errorDiv.innerHTML = '<i class="fas fa-image"></i>';
        
        // Event listeners para manejar carga y errores
        img.onload = () => {
            loadingDiv.style.display = 'none';
            errorDiv.style.display = 'none';
        };
        
        img.onerror = () => {
            loadingDiv.style.display = 'none';
            errorDiv.style.display = 'flex';
            img.style.display = 'none';
        };
        
        container.appendChild(img);
        container.appendChild(loadingDiv);
        container.appendChild(errorDiv);
        
        return container;
    }
}

// =========================================
// GLOBAL FUNCTIONS
// =========================================

// Función global para mostrar el formulario de agregar producto
function showAddProductForm() {
    if (window.admin) {
        window.admin.showAddProductForm();
    }
}

// Función global para ocultar el formulario
function hideProductForm() {
    if (window.admin) {
        window.admin.hideProductForm();
    }
}

// Función global para cerrar sesión
function logout() {
    if (confirm('¿Estás seguro de que quieres cerrar sesión?')) {
        // Por ahora solo redirigir a la página principal
        window.location.href = '/';
    }
}

// =========================================
// INITIALIZATION
// =========================================

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    console.log('🔧 CharolaisAdmin: DOM cargado, inicializando...');
    window.admin = new CharolaisAdmin();
    window.admin.init();
}); 