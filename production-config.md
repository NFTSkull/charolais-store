# Configuración para Producción - Charolais Store

## Variables de Entorno Requeridas

```bash
# Configuración de la aplicación
NODE_ENV=production
PORT=3000

# Seguridad
SESSION_SECRET=tu-super-secreto-muy-seguro-aqui

# Stripe (reemplazar con claves de producción)
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Base de datos
DATABASE_URL=./charolais.db

# Configuración de dominio
DOMAIN=https://tudominio.com
```

## Configuraciones de Seguridad

### 1. HTTPS Obligatorio
- Configurar SSL/TLS en el servidor
- Redirigir todo el tráfico HTTP a HTTPS
- Configurar HSTS headers

### 2. Configuración de Sesiones
- `secure: true` (solo HTTPS)
- `httpOnly: true` (previene XSS)
- `sameSite: 'strict'` (previene CSRF)

### 3. Headers de Seguridad
```javascript
// Agregar al servidor
app.use(helmet());
app.use(helmet.contentSecurityPolicy({
  directives: {
    defaultSrc: ["'self'"],
    styleSrc: ["'self'", "'unsafe-inline'"],
    scriptSrc: ["'self'"],
    imgSrc: ["'self'", "data:", "https:"],
  },
}));
```

## Configuración del Servidor

### 1. Nginx (Recomendado)
```nginx
server {
    listen 80;
    server_name tudominio.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name tudominio.com;
    
    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### 2. PM2 (Process Manager)
```bash
# Instalar PM2
npm install -g pm2

# Configurar PM2
pm2 start server.js --name "charolais-store"

# Configurar para reinicio automático
pm2 startup
pm2 save
```

## Backup y Mantenimiento

### 1. Base de Datos
```bash
# Backup automático
0 2 * * * cp charolais.db /backup/charolais-$(date +%Y%m%d).db
```

### 2. Logs
```bash
# Configurar rotación de logs
pm2 install pm2-logrotate
```

## Monitoreo

### 1. Health Check
```javascript
app.get('/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    });
});
```

### 2. Métricas
- Usar herramientas como New Relic, DataDog o PM2 Plus
- Monitorear CPU, memoria, respuesta del servidor
- Configurar alertas para errores

## Checklist de Producción

- [ ] Variables de entorno configuradas
- [ ] HTTPS configurado
- [ ] Headers de seguridad implementados
- [ ] Base de datos respaldada
- [ ] Logs configurados
- [ ] Monitoreo activo
- [ ] Backup automático configurado
- [ ] Process manager (PM2) configurado
- [ ] Firewall configurado
- [ ] SSL certificado válido 