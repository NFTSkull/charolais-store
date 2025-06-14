module.exports = function handler(req, res) {
  const { productId } = req.query;
  
  // Variantes básicas para todos los productos
  const variants = [
    {
      id: 1,
      name: "Negro",
      color: "#000000",
      stock: 10,
      price_modifier: 0
    },
    {
      id: 2,
      name: "Blanco", 
      color: "#FFFFFF",
      stock: 8,
      price_modifier: 0
    },
    {
      id: 3,
      name: "Gris",
      color: "#808080", 
      stock: 5,
      price_modifier: 0
    },
    {
      id: 4,
      name: "Azul Marino",
      color: "#000080",
      stock: 12,
      price_modifier: 50
    },
    {
      id: 5,
      name: "Café",
      color: "#8B4513",
      stock: 7,
      price_modifier: 0
    }
  ];

  res.status(200).json(variants);
}; 