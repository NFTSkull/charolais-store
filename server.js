const express = require('express');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const cors = require('cors');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const session = require('express-session');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// Inicializar base de datos
const db = new sqlite3.Database('charolais.db');

// Configuración de sesiones
const isProduction = process.env.NODE_ENV === 'production';
app.use(session({
    secret: process.env.SESSION_SECRET || 'charolais-secret-key-2024',
    resave: false,
    saveUninitialized: false,
    cookie: { 
        secure: isProduction, // HTTPS en producción
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
        sameSite: isProduction ? 'strict' : 'lax'
    },
    name: 'charolais-admin-session' // Cambiar nombre de la cookie
}));

// Middleware
app.use(cors());
app.use(express.json());

// Logging middleware
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
    next();
});

app.use(express.static('.'));

// Crear directorio para uploads si no existe
const uploadsDir = './uploads';
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configuración de multer para uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadsDir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({ 
    storage: storage,
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB
    },
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Solo se permiten archivos de imagen'), false);
        }
    }
});

// Servir archivos de uploads
app.use('/uploads', express.static('uploads'));

// Endpoint para configuración del frontend
app.get('/config.js', (req, res) => {
    res.setHeader('Content-Type', 'application/javascript');
    const stripeKey = process.env.STRIPE_PUBLISHABLE_KEY || 'YOUR_STRIPE_PUBLISHABLE_KEY';
    res.send(`
// Configuración de la aplicación
const CONFIG = {
    STRIPE_PUBLISHABLE_KEY: '${stripeKey}',
    API_BASE_URL: window.location.origin
};

// Exponer configuración globalmente
window.CONFIG = CONFIG;
console.log('CONFIG loaded:', CONFIG);
    `);
});

// =========================================
// HELPER FUNCTIONS
// =========================================
function runQuery(sql, params = []) {
    return new Promise((resolve, reject) => {
        db.run(sql, params, function(error) {
            if (error) {
                reject(error);
            } else {
                resolve({ lastID: this.lastID, changes: this.changes });
            }
        });
    });
}

function getQuery(sql, params = []) {
    return new Promise((resolve, reject) => {
        db.get(sql, params, (error, row) => {
            if (error) {
                reject(error);
            } else {
                resolve(row);
            }
        });
    });
}

function allQuery(sql, params = []) {
    return new Promise((resolve, reject) => {
        db.all(sql, params, (error, rows) => {
            if (error) {
                reject(error);
            } else {
                resolve(rows);
            }
        });
    });
}

// Middleware de autenticación para admin
function requireAuth(req, res, next) {
    if (req.session && req.session.adminId) {
        next();
    } else {
        res.status(401).json({ error: 'No autorizado' });
    }
}

// Función para crear notificaciones de admin
async function createAdminNotification(type, title, message, orderId = null, productId = null, priority = 'medium') {
    try {
        await runQuery(`
            INSERT INTO admin_notifications (type, title, message, order_id, product_id, priority, created_at)
            VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
        `, [type, title, message, orderId, productId, priority]);
    } catch (error) {
        console.error('Error creating admin notification:', error);
    }
}

// =========================================
// RUTAS DE AUTENTICACIÓN ADMIN
// =========================================
app.post('/admin/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        
        if (!username || !password) {
            return res.status(400).json({ error: 'Usuario y contraseña requeridos' });
        }

        const admin = await getQuery(
            'SELECT * FROM admins WHERE username = ?',
            [username]
        );

        if (!admin) {
            return res.status(401).json({ error: 'Credenciales inválidas' });
        }

        const isValidPassword = await bcrypt.compare(password, admin.password_hash);
        if (!isValidPassword) {
            return res.status(401).json({ error: 'Credenciales inválidas' });
        }

        // Actualizar último login
        await runQuery(
            'UPDATE admins SET last_login = CURRENT_TIMESTAMP WHERE id = ?',
            [admin.id]
        );

        // Crear sesión
        req.session.adminId = admin.id;
        req.session.adminUsername = admin.username;

        res.json({ 
            success: true, 
            admin: { 
                id: admin.id, 
                username: admin.username, 
                email: admin.email 
            } 
        });

    } catch (error) {
        console.error('Error en login:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

app.post('/admin/logout', (req, res) => {
    req.session.destroy(err => {
        if (err) {
            return res.status(500).json({ error: 'Error cerrando sesión' });
        }
        res.json({ success: true });
    });
});

app.get('/admin/check-auth', requireAuth, async (req, res) => {
    try {
        const admin = await getQuery(
            'SELECT id, username, email FROM admins WHERE id = ?',
            [req.session.adminId]
        );
        res.json(admin);
    } catch (error) {
        console.error('Error checking auth:', error);
        res.status(500).json({ error: 'Error verificando autenticación' });
    }
});

// =========================================
// RUTAS DEL DASHBOARD
// =========================================
app.get('/admin/dashboard-stats', requireAuth, async (req, res) => {
    try {
        const totalProducts = await getQuery('SELECT COUNT(*) as count FROM products WHERE is_active = 1');
        const totalCategories = await getQuery('SELECT COUNT(*) as count FROM categories WHERE is_active = 1');
        
        // Calcular ingresos totales (simulado)
        const products = await allQuery('SELECT price, stock_quantity FROM products WHERE is_active = 1');
        const totalRevenue = products.reduce((sum, product) => {
            return sum + (product.price * Math.floor(product.stock_quantity * 0.1)); // Simular ventas
        }, 0);

        res.json({
            totalProducts: totalProducts.count,
            totalOrders: Math.floor(Math.random() * 100) + 50, // Simulado
            totalRevenue: totalRevenue.toFixed(2),
            totalCustomers: Math.floor(Math.random() * 200) + 100 // Simulado
        });

    } catch (error) {
        console.error('Error loading dashboard stats:', error);
        res.status(500).json({ error: 'Error cargando estadísticas' });
    }
});

app.get('/admin/recent-activity', requireAuth, async (req, res) => {
    try {
        // Simulando actividad reciente
        const activities = [
            {
                type: 'product_added',
                description: 'Nuevo producto agregado al catálogo',
                created_at: new Date().toISOString()
            },
            {
                type: 'order_received',
                description: 'Nueva orden recibida',
                created_at: new Date(Date.now() - 3600000).toISOString()
            }
        ];
        
        res.json(activities);
    } catch (error) {
        console.error('Error loading recent activity:', error);
        res.status(500).json({ error: 'Error cargando actividad reciente' });
    }
});

// =========================================
// RUTAS DE PRODUCTOS ADMIN
// =========================================
app.get('/admin/products', requireAuth, async (req, res) => {
    try {
        const products = await allQuery(`
            SELECT p.*, 
                   (SELECT image_url FROM product_images WHERE product_id = p.id AND is_primary = 1 LIMIT 1) as primaryImage
            FROM products p 
            ORDER BY p.created_at DESC
        `);

        res.json(products);
    } catch (error) {
        console.error('Error loading products:', error);
        res.status(500).json({ error: 'Error cargando productos' });
    }
});

app.get('/admin/products/:id', requireAuth, async (req, res) => {
    try {
        const product = await getQuery('SELECT * FROM products WHERE id = ?', [req.params.id]);
        if (!product) {
            return res.status(404).json({ error: 'Producto no encontrado' });
        }

        const images = await allQuery('SELECT * FROM product_images WHERE product_id = ? ORDER BY sort_order', [req.params.id]);
        product.images = images;

        res.json(product);
    } catch (error) {
        console.error('Error loading product:', error);
        res.status(500).json({ error: 'Error cargando producto' });
    }
});

app.post('/admin/products', requireAuth, upload.array('images', 10), async (req, res) => {
    try {
        const { name, category_id, price, stock_quantity, description } = req.body;

        if (!name || !category_id || !price || !stock_quantity) {
            return res.status(400).json({ error: 'Campos requeridos: name, category_id, price, stock_quantity' });
        }

        // Insertar producto
        const result = await runQuery(`
            INSERT INTO products (name, category_id, price, stock_quantity, description)
            VALUES (?, ?, ?, ?, ?)
        `, [name, category_id, parseFloat(price), parseInt(stock_quantity), description || '']);

        const productId = result.lastID;

        // Procesar imágenes
        if (req.files && req.files.length > 0) {
            for (let i = 0; i < req.files.length; i++) {
                const file = req.files[i];
                const imageUrl = `/uploads/${file.filename}`;
                const isFirst = i === 0;

                await runQuery(`
                    INSERT INTO product_images (product_id, image_url, alt_text, is_primary, sort_order)
                    VALUES (?, ?, ?, ?, ?)
                `, [productId, imageUrl, `${name} ${i + 1}`, isFirst ? 1 : 0, i]);
            }
        }

        // Sincronizar con Stripe
        await syncProductWithStripe(productId);

        res.json({ success: true, productId });

    } catch (error) {
        console.error('Error creating product:', error);
        res.status(500).json({ error: 'Error creando producto' });
    }
});

app.put('/admin/products/:id', requireAuth, upload.array('images', 10), async (req, res) => {
    try {
        const productId = req.params.id;
        const { name, category_id, price, stock_quantity, description } = req.body;

        // Actualizar producto
        await runQuery(`
            UPDATE products 
            SET name = ?, category_id = ?, price = ?, stock_quantity = ?, description = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `, [name, category_id, parseFloat(price), parseInt(stock_quantity), description || '', productId]);

        // Procesar nuevas imágenes
        if (req.files && req.files.length > 0) {
            // Obtener el siguiente sort_order
            const lastImage = await getQuery('SELECT MAX(sort_order) as max_order FROM product_images WHERE product_id = ?', [productId]);
            let nextOrder = (lastImage.max_order || 0) + 1;

            for (const file of req.files) {
                const imageUrl = `/uploads/${file.filename}`;
                await runQuery(`
                    INSERT INTO product_images (product_id, image_url, alt_text, is_primary, sort_order)
                    VALUES (?, ?, ?, ?, ?)
                `, [productId, imageUrl, `${name} ${nextOrder}`, 0, nextOrder]);
                nextOrder++;
            }
        }

        // Sincronizar con Stripe
        await syncProductWithStripe(productId);

        res.json({ success: true });

    } catch (error) {
        console.error('Error updating product:', error);
        res.status(500).json({ error: 'Error actualizando producto' });
    }
});

app.delete('/admin/products/:id', requireAuth, async (req, res) => {
    try {
        const productId = req.params.id;

        // Obtener imágenes para eliminar archivos
        const images = await allQuery('SELECT image_url FROM product_images WHERE product_id = ?', [productId]);
        
        // Eliminar archivos de imágenes
        for (const img of images) {
            const filePath = path.join(__dirname, img.image_url);
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
            }
        }

        // Eliminar producto (las imágenes se eliminan automáticamente por CASCADE)
        await runQuery('DELETE FROM products WHERE id = ?', [productId]);

        res.json({ success: true });

    } catch (error) {
        console.error('Error deleting product:', error);
        res.status(500).json({ error: 'Error eliminando producto' });
    }
});

app.delete('/admin/product-images/:id', requireAuth, async (req, res) => {
    try {
        const imageId = req.params.id;

        // Obtener info de la imagen
        const image = await getQuery('SELECT * FROM product_images WHERE id = ?', [imageId]);
        if (!image) {
            return res.status(404).json({ error: 'Imagen no encontrada' });
        }

        // Eliminar archivo
        const filePath = path.join(__dirname, image.image_url);
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }

        // Eliminar de la base de datos
        await runQuery('DELETE FROM product_images WHERE id = ?', [imageId]);

        res.json({ success: true });

    } catch (error) {
        console.error('Error deleting image:', error);
        res.status(500).json({ error: 'Error eliminando imagen' });
    }
});

// =========================================
// RUTAS DE CATEGORÍAS
// =========================================
app.get('/admin/categories', async (req, res) => {
    try {
        const categories = await allQuery('SELECT * FROM categories WHERE is_active = 1 ORDER BY sort_order, name');
        res.json(categories);
    } catch (error) {
        console.error('Error loading categories:', error);
        res.status(500).json({ error: 'Error cargando categorías' });
    }
});

// =========================================
// SINCRONIZACIÓN CON STRIPE
// =========================================
async function syncProductWithStripe(productId) {
    try {
        const product = await getQuery('SELECT * FROM products WHERE id = ?', [productId]);
        if (!product) return;

        const primaryImage = await getQuery('SELECT image_url FROM product_images WHERE product_id = ? AND is_primary = 1', [productId]);
        
        // Crear o actualizar producto en Stripe
        let stripeProduct;
        if (product.stripe_price_id) {
            // Actualizar precio existente (crear uno nuevo)
            stripeProduct = await stripe.products.retrieve(product.stripe_price_id);
        } else {
            // Crear nuevo producto
            stripeProduct = await stripe.products.create({
                name: product.name,
                description: product.description,
                images: primaryImage ? [`${process.env.BASE_URL || 'http://localhost:3000'}${primaryImage.image_url}`] : [],
                metadata: {
                    product_id: productId.toString(),
                    category: product.category_id
                }
            });
        }

        // Crear precio
        const price = await stripe.prices.create({
            product: stripeProduct.id,
            unit_amount: Math.round(product.price * 100), // Convertir a centavos
            currency: 'mxn',
        });

        // Actualizar producto con el price_id de Stripe
        await runQuery('UPDATE products SET stripe_price_id = ? WHERE id = ?', [price.id, productId]);

        console.log(`✅ Producto ${product.name} sincronizado con Stripe`);

    } catch (error) {
        console.error('Error syncing with Stripe:', error);
    }
}

// =========================================
// RUTAS ORIGINALES DE STRIPE CHECKOUT
// =========================================

// Función para validar y corregir URLs de imágenes
function validateImageUrls(images, req) {
    console.log('🔍 Validando URLs de imágenes:', images);
    
    if (!images || images.length === 0) {
        console.log('📝 No hay imágenes para validar');
        return [];
    }

    const validUrls = [];
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    console.log('🌐 Base URL:', baseUrl);

    for (const img of images) {
        try {
            console.log('🖼️ Procesando imagen:', img);
            
            // Limpiar la URL de espacios y caracteres especiales
            let cleanImg = img.trim();
            console.log('🧹 Imagen limpia:', cleanImg);
            
            // Asegurar que empiece con /
            if (!cleanImg.startsWith('/')) {
                cleanImg = '/' + cleanImg;
                console.log('📝 Imagen con /:', cleanImg);
            }

            // Construir URL completa
            const fullUrl = baseUrl + cleanImg;
            console.log('🔗 URL completa:', fullUrl);
            
            // Validar que sea una URL válida
            new URL(fullUrl);
            validUrls.push(fullUrl);
            console.log('✅ URL válida agregada:', fullUrl);
            
        } catch (error) {
            console.log(`❌ URL de imagen inválida ignorada: ${img} - Error: ${error.message}`);
        }
    }

    console.log('📋 URLs válidas finales:', validUrls);
    return validUrls;
}

// Obtener productos desde la base de datos
async function getProductsFromDB() {
    const products = await allQuery(`
        SELECT p.*, 
               GROUP_CONCAT(pi.image_url ORDER BY pi.sort_order) as images
        FROM products p
        LEFT JOIN product_images pi ON p.id = pi.product_id
        WHERE p.is_active = 1
        GROUP BY p.id
        ORDER BY p.sort_order, p.name
    `);

    // Formatear productos para compatibilidad con Stripe
    const formattedProducts = {};
    products.forEach(product => {
        const id = product.id.toString(); // Usar ID numérico
        formattedProducts[id] = {
            name: product.name,
            price: Math.round(product.price * 100), // Convertir a centavos
            currency: 'mxn',
            images: product.images ? product.images.split(',').map(img => `/uploads/${img}`) : []
        };
    });

    return formattedProducts;
}

// Endpoint para crear sesión de Stripe Checkout (mejorado)
app.post('/create-checkout-session', async (req, res) => {
    try {
        const { items, isFirstPurchase } = req.body;
        
        if (!items || !Array.isArray(items) || items.length === 0) {
            return res.status(400).json({ error: 'Items del carrito requeridos' });
        }

        console.log('🛒 Creando sesión de checkout:', { items, isFirstPurchase });

        // Obtener productos desde la base de datos
        const PRODUCTS = await getProductsFromDB();

        // Crear line items para Stripe
        const lineItems = [];
        
        for (const item of items) {
            const product = PRODUCTS[item.id];
            if (!product) {
                throw new Error(`Producto no encontrado: ${item.id}`);
            }

            // Validar cantidad
            if (!item.quantity || item.quantity <= 0) {
                throw new Error(`Cantidad inválida para producto: ${product.name}`);
            }

            // Si el item tiene variante, usar el precio de la variante
            let productName = product.name;
            let unitAmount = product.price;

            if (item.variant) {
                productName += ` - ${item.variant.name}`;
                unitAmount = item.variant.priceOverride ? 
                    Math.round(item.variant.priceOverride * 100) : 
                    product.price;
            }

            lineItems.push({
                price_data: {
                    currency: product.currency,
                    product_data: {
                        name: productName,
                        // TEMPORAL: Remover imágenes para probar
                        // images: validateImageUrls(product.images, req)
                    },
                    unit_amount: unitAmount,
                },
                quantity: item.quantity,
            });
            
            console.log('📦 Line item creado:', {
                name: productName,
                unit_amount: unitAmount,
                quantity: item.quantity,
                images_count: product.images ? product.images.length : 0
            });
        }

        // Calcular envío
        const subtotal = lineItems.reduce((sum, item) => sum + (item.price_data.unit_amount * item.quantity), 0);
        let shippingAmount = 0;

        if (!isFirstPurchase) {
            // Envío estándar: $150 MXN o 10% del subtotal, lo que sea mayor
            shippingAmount = Math.max(15000, Math.round(subtotal * 0.10)); // En centavos
            
            lineItems.push({
                price_data: {
                    currency: 'mxn',
                    product_data: {
                        name: 'Envío estándar',
                    },
                    unit_amount: shippingAmount,
                },
                quantity: 1,
            });
        } else {
            // Envío gratis para primera compra
            lineItems.push({
                price_data: {
                    currency: 'mxn',
                    product_data: {
                        name: 'Envío GRATIS (Primera compra)',
                    },
                    unit_amount: 0,
                },
                quantity: 1,
            });
        }

        console.log('📦 Line items creados:', lineItems);

        // Log detallado de la sesión que se va a crear
        const sessionData = {
            payment_method_types: ['card'],
            line_items: lineItems,
            mode: 'payment',
            success_url: `${req.protocol}://${req.get('host')}/success?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${req.protocol}://${req.get('host')}/cancel`,
            locale: 'es',
            billing_address_collection: 'required',
            shipping_address_collection: {
                allowed_countries: ['MX'],
            },
            metadata: {
                store: 'Charolais',
                location: 'Monterrey, NL',
                isFirstPurchase: isFirstPurchase ? 'true' : 'false',
                subtotal: (subtotal / 100).toString(),
                shipping: (shippingAmount / 100).toString()
            }
        };
        
        console.log('🎯 Creando sesión de Stripe con datos:', JSON.stringify(sessionData, null, 2));

        // Crear sesión de Stripe Checkout
        const session = await stripe.checkout.sessions.create(sessionData);

        console.log('✅ Sesión de checkout creada:', session.id);
        res.json({ sessionId: session.id, url: session.url });
        
    } catch (error) {
        console.error('❌ Error creando sesión de checkout:', error);
        res.status(500).json({ error: error.message });
    }
});

// Endpoint para obtener productos (para el frontend)
app.get('/api/products', async (req, res) => {
    try {
        const products = await allQuery(`
            SELECT p.*, 
                   GROUP_CONCAT(pi.image_url ORDER BY pi.sort_order) as images,
                   c.name as category_name
            FROM products p
            LEFT JOIN product_images pi ON p.id = pi.product_id
            LEFT JOIN categories c ON p.category_id = c.id
            WHERE p.is_active = 1
            GROUP BY p.id
            ORDER BY p.sort_order, p.name
        `);

        // Formatear productos para el frontend
        const formattedProducts = products.map(product => ({
            id: `product-${product.id}`,
            name: product.name,
            price: product.price,
            description: product.description,
            category: product.category_id,
            categoryName: product.category_name,
            rating: product.rating,
            reviews: product.reviews_count,
            stock: product.stock_quantity,
            images: product.images ? product.images.split(',') : [],
            isActive: product.is_active
        }));

        res.json(formattedProducts);

    } catch (error) {
        console.error('Error obteniendo productos:', error);
        res.status(500).json({ error: 'Error obteniendo productos' });
    }
});

// Endpoint para obtener categorías (para el frontend)
app.get('/api/categories', async (req, res) => {
    try {
        const categories = await allQuery(`
            SELECT id, name, description, is_active
            FROM categories
            WHERE is_active = 1
            ORDER BY sort_order, name
        `);

        res.json(categories);

    } catch (error) {
        console.error('Error obteniendo categorías:', error);
        res.status(500).json({ error: 'Error obteniendo categorías' });
    }
});

// Endpoint para obtener variantes de un producto
app.get('/api/products/:id/variants', async (req, res) => {
    try {
        const productId = req.params.id.replace('product-', '');
        
        const variants = await allQuery(`
            SELECT 
                pv.id,
                pv.variant_name,
                pv.sku,
                pv.price_override,
                pv.stock_quantity,
                pv.is_active,
                pv.sort_order,
                GROUP_CONCAT(vi.image_url ORDER BY vi.sort_order) as images
            FROM product_variants pv
            LEFT JOIN variant_images vi ON pv.id = vi.variant_id
            WHERE pv.product_id = ? AND pv.is_active = 1
            GROUP BY pv.id
            ORDER BY pv.sort_order, pv.variant_name
        `, [productId]);

        const formattedVariants = variants.map(variant => ({
            id: variant.id,
            name: variant.variant_name,
            sku: variant.sku,
            priceOverride: variant.price_override,
            stock: variant.stock_quantity,
            isActive: variant.is_active,
            sortOrder: variant.sort_order,
            images: variant.images ? variant.images.split(',') : []
        }));

        res.json(formattedVariants);

    } catch (error) {
        console.error('Error obteniendo variantes:', error);
        res.status(500).json({ error: 'Error obteniendo variantes' });
    }
});

// Página de éxito después del pago
app.get('/success', (req, res) => {
    res.sendFile(path.join(__dirname, 'success.html'));
});

// Página de cancelación
app.get('/cancel', (req, res) => {
    res.sendFile(path.join(__dirname, 'cancel.html'));
});

// Resto de endpoints originales...
app.get('/checkout-session/:sessionId', async (req, res) => {
    try {
        const session = await stripe.checkout.sessions.retrieve(req.params.sessionId);
        res.json(session);
    } catch (error) {
        console.error('Error obteniendo sesión:', error);
        res.status(500).json({ error: error.message });
    }
});

app.post('/webhook', express.raw({type: 'application/json'}), async (req, res) => {
    const sig = req.headers['stripe-signature'];
    let event;

    try {
        // En producción, usar la clave del webhook real
        const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || 'whsec_test_secret';
        event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
    } catch (err) {
        console.log(`❌ Webhook signature verification failed.`, err.message);
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    console.log('📦 Webhook recibido:', event.type);

    try {
        switch (event.type) {
            case 'checkout.session.completed':
                const session = event.data.object;
                console.log('✅ Pago completado para sesión:', session.id);
                
                // Guardar orden en la base de datos
                await saveOrderToDatabase(session);
                
                // Marcar que el usuario ya no es primera compra
                if (session.metadata && session.metadata.isFirstPurchase === 'true') {
                    console.log('🎁 Primera compra completada - envío gratis aplicado');
                }
                break;
                
            case 'payment_intent.succeeded':
                console.log('💳 Pago procesado exitosamente');
                break;
                
            case 'payment_intent.payment_failed':
                console.log('❌ Pago falló');
                break;
                
            default:
                console.log(`ℹ️ Evento no manejado: ${event.type}`);
        }

        res.json({received: true});
    } catch (error) {
        console.error('❌ Error procesando webhook:', error);
        res.status(500).json({error: 'Error procesando webhook'});
    }
});

// Función para guardar orden en la base de datos
async function saveOrderToDatabase(session) {
    try {
        // Crear orden principal
        const orderResult = await runQuery(`
            INSERT INTO orders (
                stripe_session_id, 
                customer_email, 
                customer_name,
                total_amount,
                shipping_address,
                billing_address,
                payment_status,
                created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
        `, [
            session.id,
            session.customer_email || session.customer_details?.email,
            session.customer_details?.name || 'Cliente',
            session.amount_total / 100, // Convertir de centavos
            JSON.stringify(session.shipping),
            JSON.stringify(session.customer_details),
            session.payment_status
        ]);

        const orderId = orderResult.lastID;
        console.log('📋 Orden guardada con ID:', orderId);

        // Guardar items de la orden
        const lineItems = await stripe.checkout.sessions.listLineItems(session.id);
        
        for (const item of lineItems.data) {
            if (item.price && item.price.product) {
                const product = await stripe.products.retrieve(item.price.product);
                
                await runQuery(`
                    INSERT INTO order_items (
                        order_id,
                        product_name,
                        quantity,
                        unit_price,
                        total_price
                    ) VALUES (?, ?, ?, ?, ?)
                `, [
                    orderId,
                    product.name,
                    item.quantity,
                    item.price.unit_amount / 100,
                    item.amount_total / 100
                ]);
            }
        }

        console.log('✅ Orden y items guardados correctamente');
        
    } catch (error) {
        console.error('❌ Error guardando orden:', error);
    }
}

// =========================================
// RUTAS DEL PANEL DE ADMINISTRACIÓN MEJORADO
// =========================================

// Ruta para el panel mejorado
app.get('/admin-panel', (req, res) => {
    res.sendFile(path.join(__dirname, 'admin-panel.html'));
});

app.get('/admin-panel/', (req, res) => {
    res.sendFile(path.join(__dirname, 'admin-panel.html'));
});

// Ruta para el login del admin
app.get('/admin/login.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'admin-login.html'));
});

// Estadísticas del dashboard mejorado
app.get('/admin/dashboard-stats', requireAuth, async (req, res) => {
    try {
        const stats = await allQuery(`
            SELECT 
                COUNT(*) as totalProducts,
                SUM(CASE WHEN stock_quantity <= 10 THEN 1 ELSE 0 END) as lowStockCount,
                SUM(CASE WHEN stock_quantity = 0 THEN 1 ELSE 0 END) as outOfStockCount,
                (SELECT COUNT(*) FROM categories) as totalCategories
            FROM products
            WHERE is_active = 1
        `);

        res.json(stats[0]);
    } catch (error) {
        console.error('Error getting dashboard stats:', error);
        res.status(500).json({ error: 'Error obteniendo estadísticas' });
    }
});

// Actualización rápida de stock
app.patch('/admin/products/:id/stock', requireAuth, async (req, res) => {
    try {
        const { stock, min_stock } = req.body;
        const productId = req.params.id;

        await runQuery(
            'UPDATE products SET stock_quantity = ?, min_stock = ? WHERE id = ?',
            [stock, min_stock || 5, productId]
        );

        // Crear notificación de cambio de stock
        await createAdminNotification(
            'stock_updated',
            'Stock Actualizado',
            `Stock del producto ID ${productId} actualizado a ${stock}`,
            null,
            productId
        );

        res.json({ success: true, message: 'Stock actualizado exitosamente' });
    } catch (error) {
        console.error('Error updating stock:', error);
        res.status(500).json({ error: 'Error actualizando stock' });
    }
});

// Configuración de stock
app.get('/admin/settings', requireAuth, async (req, res) => {
    try {
        const settings = await getQuery('SELECT * FROM settings WHERE key IN (?, ?)', ['default_min_stock', 'low_stock_alert']);
        
        const formattedSettings = {
            defaultMinStock: 5,
            lowStockAlert: 10
        };

        if (settings) {
            settings.forEach(setting => {
                if (setting.key === 'default_min_stock') {
                    formattedSettings.defaultMinStock = parseInt(setting.value);
                } else if (setting.key === 'low_stock_alert') {
                    formattedSettings.lowStockAlert = parseInt(setting.value);
                }
            });
        }

        res.json(formattedSettings);
    } catch (error) {
        console.error('Error getting settings:', error);
        res.status(500).json({ error: 'Error obteniendo configuración' });
    }
});

app.post('/admin/settings', requireAuth, async (req, res) => {
    try {
        const { defaultMinStock, lowStockAlert } = req.body;

        // Actualizar o insertar configuración
        await runQuery(`
            INSERT OR REPLACE INTO settings (key, value, updated_at) 
            VALUES 
                ('default_min_stock', ?, CURRENT_TIMESTAMP),
                ('low_stock_alert', ?, CURRENT_TIMESTAMP)
        `, [defaultMinStock, lowStockAlert]);

        res.json({ success: true, message: 'Configuración guardada exitosamente' });
    } catch (error) {
        console.error('Error saving settings:', error);
        res.status(500).json({ error: 'Error guardando configuración' });
    }
});

// Eliminar imagen de producto
app.delete('/admin/product-images/:id', requireAuth, async (req, res) => {
    try {
        const productId = req.params.id;
        const { imageUrl } = req.body;

        // Eliminar imagen de la base de datos
        await runQuery(
            'DELETE FROM product_images WHERE product_id = ? AND image_url = ?',
            [productId, imageUrl]
        );

        // Eliminar archivo físico si existe
        const imagePath = path.join(__dirname, 'uploads', path.basename(imageUrl));
        if (fs.existsSync(imagePath)) {
            fs.unlinkSync(imagePath);
        }

        res.json({ success: true, message: 'Imagen eliminada exitosamente' });
    } catch (error) {
        console.error('Error removing image:', error);
        res.status(500).json({ error: 'Error eliminando imagen' });
    }
});

// =========================================
// RUTAS ESTÁTICAS
// =========================================

// Health check para monitoreo
app.get('/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: process.env.NODE_ENV || 'development',
        version: '1.0.0'
    });
});

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Servir imágenes desde la raíz con mejor manejo de espacios y caracteres especiales
app.get('/*.JPG', (req, res) => {
    const imagePath = path.join(__dirname, decodeURIComponent(req.path));
    if (fs.existsSync(imagePath)) {
        res.sendFile(imagePath);
    } else {
        res.status(404).send('Imagen no encontrada');
    }
});

app.get('/*.jpg', (req, res) => {
    const imagePath = path.join(__dirname, decodeURIComponent(req.path));
    if (fs.existsSync(imagePath)) {
        res.sendFile(imagePath);
    } else {
        res.status(404).send('Imagen no encontrada');
    }
});

app.get('/*.jpeg', (req, res) => {
    const imagePath = path.join(__dirname, decodeURIComponent(req.path));
    if (fs.existsSync(imagePath)) {
        res.sendFile(imagePath);
    } else {
        res.status(404).send('Imagen no encontrada');
    }
});

app.get('/*.png', (req, res) => {
    const imagePath = path.join(__dirname, decodeURIComponent(req.path));
    if (fs.existsSync(imagePath)) {
        res.sendFile(imagePath);
    } else {
        res.status(404).send('Imagen no encontrada');
    }
});

app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'admin.html'));
});

app.get('/admin/', (req, res) => {
    res.sendFile(path.join(__dirname, 'admin.html'));
});

// Manejo de errores global
app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
});

// Manejo de rutas no encontradas
app.use('*', (req, res) => {
    console.log(`404 - Ruta no encontrada: ${req.originalUrl}`);
    res.status(404).json({ error: 'Ruta no encontrada' });
});

// =========================================
// INICIAR SERVIDOR
// =========================================
const server = app.listen(PORT, () => {
    console.log(`🤠 Servidor Charolais corriendo en puerto ${PORT}`);
    console.log(`🛒 Stripe Checkout configurado y listo para procesar pagos`);
    console.log(`🔧 Panel de Admin disponible en /admin`);
    console.log(`🚀 Panel de Admin Mejorado en /admin-panel`);
    console.log(`📍 Tienda ubicada en Monterrey, Nuevo León`);
    console.log(`📊 Base de datos SQLite inicializada`);
    console.log(`🌍 Variables de entorno: ${process.env.STRIPE_PUBLISHABLE_KEY ? 'Configuradas' : 'Usando fallback'}`);
});

// Manejo de cierre graceful
process.on('SIGTERM', () => {
    console.log('SIGTERM recibido, cerrando servidor...');
    server.close(() => {
        console.log('Servidor cerrado');
        process.exit(0);
    });
});

// Para Vercel
module.exports = app; 