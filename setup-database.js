const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const path = require('path');

// Crear base de datos
const db = new sqlite3.Database('charolais.db');

async function setupDatabase() {
    console.log('🔧 Configurando base de datos Charolais...');

    try {
        // Crear tabla de administradores
        await runQuery(`
            CREATE TABLE IF NOT EXISTS admins (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                email TEXT UNIQUE NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                last_login DATETIME
            )
        `);

        // Crear tabla de categorías
        await runQuery(`
            CREATE TABLE IF NOT EXISTS categories (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                description TEXT,
                image_url TEXT,
                is_active BOOLEAN DEFAULT 1,
                sort_order INTEGER DEFAULT 0,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Crear tabla de productos
        await runQuery(`
            CREATE TABLE IF NOT EXISTS products (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                description TEXT,
                category_id TEXT,
                price DECIMAL(10,2) NOT NULL,
                stripe_price_id TEXT,
                stock_quantity INTEGER DEFAULT 0,
                is_active BOOLEAN DEFAULT 1,
                rating DECIMAL(2,1) DEFAULT 4.0,
                reviews_count INTEGER DEFAULT 0,
                sort_order INTEGER DEFAULT 0,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (category_id) REFERENCES categories (id)
            )
        `);

        // Crear tabla de imágenes de productos
        await runQuery(`
            CREATE TABLE IF NOT EXISTS product_images (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                product_id INTEGER,
                image_url TEXT NOT NULL,
                alt_text TEXT,
                is_primary BOOLEAN DEFAULT 0,
                sort_order INTEGER DEFAULT 0,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (product_id) REFERENCES products (id) ON DELETE CASCADE
            )
        `);

        // Crear tabla de configuraciones generales
        await runQuery(`
            CREATE TABLE IF NOT EXISTS settings (
                key TEXT PRIMARY KEY,
                value TEXT,
                description TEXT,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Crear tabla de notificaciones de admin
        await runQuery(`
            CREATE TABLE IF NOT EXISTS admin_notifications (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                type TEXT NOT NULL,
                title TEXT NOT NULL,
                message TEXT NOT NULL,
                order_id INTEGER,
                product_id INTEGER,
                priority TEXT DEFAULT 'medium',
                is_read BOOLEAN DEFAULT 0,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (order_id) REFERENCES orders (id) ON DELETE SET NULL,
                FOREIGN KEY (product_id) REFERENCES products (id) ON DELETE SET NULL
            )
        `);

        // Insertar categorías por defecto
        const categories = [
            { id: 'hombre', name: 'Colección Hombre', description: 'Estilo auténtico para el vaquero moderno' },
            { id: 'mujer', name: 'Colección Mujer', description: 'Elegancia y tradición en cada pieza' },
            { id: 'gorras', name: 'Gorras Premium', description: 'Protección y estilo bajo el sol' },
            { id: 'accesorios-dama', name: 'Accesorios Dama', description: 'Complementos elegantes para ella' },
            { id: 'accesorios-caballero', name: 'Accesorios Caballero', description: 'Detalles distintivos para él' }
        ];

        for (const category of categories) {
            await runQuery(`
                INSERT OR IGNORE INTO categories (id, name, description) 
                VALUES (?, ?, ?)
            `, [category.id, category.name, category.description]);
        }

        // Migrar productos existentes
        await migrateExistingProducts();

        // Crear usuario administrador por defecto
        const adminPassword = await bcrypt.hash('admin123', 10);
        await runQuery(`
            INSERT OR IGNORE INTO admins (username, password_hash, email) 
            VALUES (?, ?, ?)
        `, ['admin', adminPassword, 'admin@charolais.com']);

        // Insertar configuraciones por defecto
        const defaultSettings = [
            { key: 'store_name', value: 'Charolais', description: 'Nombre de la tienda' },
            { key: 'store_location', value: 'Monterrey, Nuevo León, México', description: 'Ubicación de la tienda' },
            { key: 'currency', value: 'mxn', description: 'Moneda por defecto' },
            { key: 'free_shipping_threshold', value: '0', description: 'Monto mínimo para envío gratis' },
            { key: 'tax_rate', value: '0.16', description: 'Tasa de IVA' }
        ];

        for (const setting of defaultSettings) {
            await runQuery(`
                INSERT OR IGNORE INTO settings (key, value, description) 
                VALUES (?, ?, ?)
            `, [setting.key, setting.value, setting.description]);
        }

        console.log('✅ Base de datos configurada exitosamente');
        console.log('📝 Usuario admin creado:');
        console.log('   👤 Usuario: admin');
        console.log('   🔑 Contraseña: admin123');
        console.log('   🌐 Panel: http://localhost:3000/admin');

    } catch (error) {
        console.error('❌ Error configurando base de datos:', error);
    } finally {
        db.close();
    }
}

// Migrar productos existentes del código a la base de datos
async function migrateExistingProducts() {
    const existingProducts = [
        // COLECCIÓN HOMBRE
        { 
            name: "Cowboy Skull", 
            category_id: "hombre", 
            price: 400, 
            description: "Colección completa con diseños icónicos en blanco y negro", 
            images: ["Cowboy Skull.JPG", "Cowboy Skull blanca.JPG", "Conjunto Cowboy Skull.JPG", "Conjunto Cowboy Skull 2.JPG"],
            stock_quantity: 25
        },
        { 
            name: "All Around", 
            category_id: "hombre", 
            price: 500, 
            description: "Versatilidad y estilo en colores negro y blanco", 
            images: ["all arround.JPG", "all arround blanca.JPG"],
            stock_quantity: 30
        },
        { 
            name: "Bronc Riding", 
            category_id: "hombre", 
            price: 400, 
            description: "Espíritu del rodeo auténtico para verdaderos jinetes", 
            images: ["Bronc Riding.JPG", "Bronc Riding 1.JPG"],
            stock_quantity: 20
        },
        
        // COLECCIÓN MUJER
        { 
            name: "Boutique Mujer Unitalla", 
            category_id: "mujer", 
            price: 600, 
            description: "Vestido elegante con toque vaquero, talla única", 
            images: ["Boutique mujer unitalla.JPG"],
            stock_quantity: 15
        },
        { 
            name: "Boutique Unitalla 1", 
            category_id: "mujer", 
            price: 600, 
            description: "Vestido estilo western en diseño exclusivo", 
            images: ["Boutique unitalla 1.JPG"],
            stock_quantity: 15
        },
        { 
            name: "Rodeo Clown", 
            category_id: "mujer", 
            price: 400, 
            description: "Playera audaz en rojo vibrante con conjuntos completos", 
            images: ["Rodeo Clown.JPG", "Rodeo Clown 1.JPG", "Rodeo Clown Conjuntio.JPG", "Conjunto Rodeo Clown 2.JPG"],
            stock_quantity: 22
        },
        { 
            name: "CowGirls", 
            category_id: "mujer", 
            price: 400, 
            description: "El espíritu cowgirl auténtico con conjunto completo", 
            images: ["CowGirls.JPG", "Conjunto CowGirl.JPG"],
            stock_quantity: 18
        },
        
        // GORRAS
        { name: "Gorra Vaquera Original", category_id: "gorras", price: 400, description: "Gorra de alta calidad con bordado Charolais", images: ["Gorra.JPG"], stock_quantity: 50 },
        { name: "Gorra Rodeo 2", category_id: "gorras", price: 400, description: "Diseño clásico para el vaquero moderno", images: ["gorra 2.JPG"], stock_quantity: 45 },
        { name: "Gorra Rancho 3", category_id: "gorras", price: 400, description: "Edición especial con detalles artesanales", images: ["Gorra 3.JPG"], stock_quantity: 40 },
        { name: "Gorra Western 4", category_id: "gorras", price: 400, description: "Para los profesionales del western", images: ["gorra 4.JPG"], stock_quantity: 35 },
        { name: "Gorra Charolais 5", category_id: "gorras", price: 400, description: "El diseño premium de la casa", images: ["Gorra 5.JPG"], stock_quantity: 42 },
        
        // ACCESORIOS
        { 
            name: "Accesorios Dama", 
            category_id: "accesorios-dama", 
            price: 349, 
            description: "Conjunto elegante de accesorios femeninos", 
            images: ["Accesorios.JPG", "Accesorios 2.JPG"],
            stock_quantity: 30
        }
    ];

    for (const product of existingProducts) {
        try {
            // Insertar producto
            const result = await runQuery(`
                INSERT OR IGNORE INTO products 
                (name, description, category_id, price, stock_quantity, rating, reviews_count) 
                VALUES (?, ?, ?, ?, ?, ?, ?)
            `, [
                product.name, 
                product.description, 
                product.category_id, 
                product.price, 
                product.stock_quantity,
                Math.floor(Math.random() * 2) + 4, // Rating entre 4 y 5
                Math.floor(Math.random() * 50) + 10 // Reviews entre 10 y 60
            ]);

            if (result.changes > 0) {
                const productId = result.lastID;
                
                // Insertar imágenes
                for (let i = 0; i < product.images.length; i++) {
                    await runQuery(`
                        INSERT INTO product_images 
                        (product_id, image_url, alt_text, is_primary, sort_order) 
                        VALUES (?, ?, ?, ?, ?)
                    `, [
                        productId, 
                        product.images[i], 
                        `${product.name} ${i + 1}`,
                        i === 0 ? 1 : 0, // Primera imagen es primaria
                        i
                    ]);
                }
                
                console.log(`✅ Producto migrado: ${product.name}`);
            }
        } catch (error) {
            console.log(`⚠️  Producto ya existe: ${product.name}`);
        }
    }
}

// Función helper para promisificar consultas
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

// Ejecutar configuración
setupDatabase(); 