module.exports = function handler(req, res) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    // Productos hardcodeados para que funcione inmediatamente
    const products = [
        {
            id: "product-1",
            name: "Cowboy Skull",
            category: "hombre",
            categoryName: "Hombre",
            price: 400,
            description: "Colección completa con diseños icónicos en blanco y negro",
            images: ["uploads/Cowboy Skull.JPG", "uploads/Cowboy Skull blanca.JPG"],
            rating: 4,
            reviews: 10,
            stock: 10
        },
        {
            id: "product-2",
            name: "All Around",
            category: "hombre",
            categoryName: "Hombre",
            price: 500,
            description: "Versatilidad y estilo en colores negro y blanco",
            images: ["uploads/all arround.JPG", "uploads/all arround blanca.JPG"],
            rating: 4,
            reviews: 10,
            stock: 10
        },
        {
            id: "product-3",
            name: "Bronc Riding",
            category: "hombre",
            categoryName: "Hombre",
            price: 400,
            description: "Espíritu del rodeo auténtico para verdaderos jinetes",
            images: ["uploads/Bronc Riding.JPG", "uploads/Bronc Riding 1.JPG"],
            rating: 4,
            reviews: 10,
            stock: 10
        },
        {
            id: "product-4",
            name: "CowGirls",
            category: "mujer",
            categoryName: "Mujer",
            price: 450,
            description: "Estilo vaquero femenino con actitud",
            images: ["uploads/CowGirls.JPG"],
            rating: 4,
            reviews: 10,
            stock: 10
        },
        {
            id: "product-5",
            name: "Gorra Premium",
            category: "accesorios",
            categoryName: "Accesorios",
            price: 250,
            description: "Gorra premium con diseño auténtico",
            images: ["uploads/Gorra.JPG", "uploads/gorra 2.JPG"],
            rating: 4,
            reviews: 10,
            stock: 15
        }
    ];

    res.status(200).json(products);
}; 