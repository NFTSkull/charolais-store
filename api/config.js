module.exports = function handler(req, res) {
    res.setHeader('Content-Type', 'application/javascript');
    
    const stripeKey = process.env.STRIPE_PUBLISHABLE_KEY || 'YOUR_STRIPE_PUBLISHABLE_KEY';
    
    const configScript = `
// Configuración de la aplicación
const CONFIG = {
    STRIPE_PUBLISHABLE_KEY: '${stripeKey}',
    API_BASE_URL: window.location.origin
};

// Exponer configuración globalmente
window.CONFIG = CONFIG;
console.log('CONFIG loaded:', CONFIG);
    `;
    
    res.status(200).send(configScript);
}; 