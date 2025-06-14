module.exports = function handler(req, res) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    // Lista completa de productos Charolais
    const products = [
        // COLECCIÓN HOMBRE
        {
            id: "product-1",
            name: "Cowboy Skull",
            category: "hombre",
            categoryName: "Hombre",
            price: 400,
            description: "Diseño icónico con calavera vaquera, disponible en negro y blanco",
            images: ["uploads/Cowboy Skull.JPG", "uploads/Cowboy Skull blanca.JPG", "uploads/Conjunto Cowboy Skull.JPG", "uploads/Conjunto Cowboy Skull 2.JPG"],
            rating: 5,
            reviews: 25,
            stock: 15
        },
        {
            id: "product-2", 
            name: "All Around",
            category: "hombre",
            categoryName: "Hombre",
            price: 500,
            description: "Versatilidad y estilo para el vaquero moderno",
            images: ["uploads/all arround.JPG", "uploads/all arround blanca.JPG"],
            rating: 4,
            reviews: 18,
            stock: 12
        },
        {
            id: "product-3",
            name: "Bronc Riding", 
            category: "hombre",
            categoryName: "Hombre",
            price: 400,
            description: "Espíritu del rodeo auténtico para verdaderos jinetes",
            images: ["uploads/Bronc Riding.JPG", "uploads/Bronc Riding 1.JPG"],
            rating: 5,
            reviews: 22,
            stock: 10
        },
        {
            id: "product-4",
            name: "Rodeo Clown",
            category: "hombre", 
            categoryName: "Hombre",
            price: 450,
            description: "Diseño divertido inspirado en los payasos de rodeo",
            images: ["uploads/Rodeo Clown.JPG", "uploads/Rodeo Clown 1.JPG", "uploads/Rodeo Clown Conjuntio.JPG", "uploads/Conjunto Rodeo Clown 2.JPG"],
            rating: 4,
            reviews: 15,
            stock: 8
        },
        {
            id: "product-5",
            name: "Rodeo Ink",
            category: "hombre",
            categoryName: "Hombre", 
            price: 480,
            description: "Diseño artístico con tinta de rodeo",
            images: ["uploads/Rodeo Ink.JPG"],
            rating: 4,
            reviews: 12,
            stock: 6
        },
        {
            id: "product-6",
            name: "Wild Stampede",
            category: "hombre",
            categoryName: "Hombre",
            price: 520,
            description: "La fuerza salvaje del ganado en estampida",
            images: ["uploads/Wild Stampede.JPG"],
            rating: 5,
            reviews: 20,
            stock: 7
        },

        // COLECCIÓN MUJER
        {
            id: "product-7",
            name: "CowGirls",
            category: "mujer",
            categoryName: "Mujer", 
            price: 450,
            description: "Estilo vaquero femenino con actitud",
            images: ["uploads/CowGirls.JPG", "uploads/Conjunto CowGirl.JPG"],
            rating: 5,
            reviews: 30,
            stock: 20
        },
        {
            id: "product-8",
            name: "Boutique Mujer Unitalla",
            category: "mujer",
            categoryName: "Mujer",
            price: 380,
            description: "Elegancia vaquera en talla única para mujer",
            images: ["uploads/Boutique mujer unitalla.JPG"],
            rating: 4,
            reviews: 16,
            stock: 12
        },
        {
            id: "product-9", 
            name: "Boutique Unitalla 1",
            category: "mujer",
            categoryName: "Mujer",
            price: 420,
            description: "Primera colección boutique en talla única",
            images: ["uploads/Boutique unitalla 1.JPG"],
            rating: 5,
            reviews: 24,
            stock: 8
        },
        {
            id: "product-10",
            name: "Boutique Unitalla 3", 
            category: "mujer",
            categoryName: "Mujer",
            price: 400,
            description: "Tercera colección boutique con diseño exclusivo",
            images: ["uploads/Boutique unitalla 3.JPG"],
            rating: 4,
            reviews: 14,
            stock: 10
        },
        {
            id: "product-11",
            name: "Boutique Unitalla 4",
            category: "mujer",
            categoryName: "Mujer", 
            price: 440,
            description: "Cuarta colección boutique premium",
            images: ["uploads/Boutique Unitalla 4.JPG"],
            rating: 5,
            reviews: 19,
            stock: 6
        },

        // GORRAS
        {
            id: "product-12",
            name: "Gorra Charolais Original",
            category: "gorras",
            categoryName: "Gorras",
            price: 250,
            description: "Gorra original con logo Charolais bordado",
            images: ["uploads/Gorra.JPG"],
            rating: 5,
            reviews: 45,
            stock: 25
        },
        {
            id: "product-13",
            name: "Gorra Charolais 2",
            category: "gorras", 
            categoryName: "Gorras",
            price: 280,
            description: "Segunda versión con detalles mejorados",
            images: ["uploads/gorra 2.JPG"],
            rating: 4,
            reviews: 32,
            stock: 20
        },
        {
            id: "product-14",
            name: "Gorra Charolais 3",
            category: "gorras",
            categoryName: "Gorras",
            price: 260,
            description: "Tercera versión con diseño clásico",
            images: ["uploads/Gorra 3.JPG"],
            rating: 4,
            reviews: 28,
            stock: 18
        },
        {
            id: "product-15",
            name: "Gorra Charolais 4",
            category: "gorras",
            categoryName: "Gorras", 
            price: 300,
            description: "Cuarta versión premium con acabados de lujo",
            images: ["uploads/gorra 4.JPG"],
            rating: 5,
            reviews: 35,
            stock: 15
        },
        {
            id: "product-16",
            name: "Gorra Charolais 5",
            category: "gorras",
            categoryName: "Gorras",
            price: 270,
            description: "Quinta versión con diseño renovado",
            images: ["uploads/Gorra 5.JPG"],
            rating: 4,
            reviews: 22,
            stock: 12
        },
        {
            id: "product-17",
            name: "Gorra Charolais 6",
            category: "gorras",
            categoryName: "Gorras",
            price: 290,
            description: "Sexta versión con estilo contemporáneo", 
            images: ["uploads/gorra 6.JPG"],
            rating: 4,
            reviews: 26,
            stock: 14
        },
        {
            id: "product-18",
            name: "Gorra Charolais 7",
            category: "gorras",
            categoryName: "Gorras",
            price: 310,
            description: "Séptima versión con diseño exclusivo",
            images: ["uploads/Gorra 7.JPG"],
            rating: 5,
            reviews: 30,
            stock: 10
        },
        {
            id: "product-19",
            name: "Gorra Charolais 8",
            category: "gorras",
            categoryName: "Gorras",
            price: 320,
            description: "Octava versión con tecnología avanzada",
            images: ["uploads/gorra 8.JPG"],
            rating: 5,
            reviews: 38,
            stock: 8
        },
        {
            id: "product-20",
            name: "Gorra Charolais 9",
            category: "gorras",
            categoryName: "Gorras",
            price: 275,
            description: "Novena versión con comodidad superior",
            images: ["uploads/Gorra 9.JPG"],
            rating: 4,
            reviews: 24,
            stock: 16
        },
        {
            id: "product-21",
            name: "Gorra Charolais 10",
            category: "gorras",
            categoryName: "Gorras",
            price: 350,
            description: "Décima versión edición especial",
            images: ["uploads/Gorra 10.JPG"],
            rating: 5,
            reviews: 42,
            stock: 5
        },

        // ACCESORIOS
        {
            id: "product-22",
            name: "Accesorios Charolais",
            category: "accesorios",
            categoryName: "Accesorios",
            price: 180,
            description: "Colección completa de accesorios vaqueros",
            images: ["uploads/Accesorios.JPG", "uploads/Accesorios 2.JPG"],
            rating: 4,
            reviews: 20,
            stock: 30
        }
    ];

    res.status(200).json(products);
}; 