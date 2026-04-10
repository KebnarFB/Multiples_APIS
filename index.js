const express = require('express');
const path = require('path');
const https = require('https');
const fs = require('fs');
const fetch = require('node-fetch');
const bodyParser = require('body-parser');
const paypal = require('paypal-rest-sdk');
const mysql = require('mysql2');

const app = express();
const PORT = 3000;

const connection = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '901501',
    database: 'Weather_APP'
});

connection.connect((err) => {
    if (err) {
        console.error('Error de conexión:', err);
        return;
    }
    console.log('Conectado a MySQL');
});

paypal.configure({
    mode: 'sandbox',
    client_id: 'AcX5a_PL0UxYuG0X7cJbxZF5qLwj1eFob2nC6-wnhgHWHtYJKbFpx4CTDxHuexA-DTmCyOIZO-3ODh0N',
    client_secret: 'ENzhITtS8-XijlXz85OCMqhjJ_wkxCk3kAjAzSjbFtCQKGJXRRFmEiph15vwIx88u3UmLCcdmYA5K1wI'
});

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

app.use(express.static(path.join(__dirname, 'Public')));
app.use(express.static(path.join(__dirname, 'Views/Styles')));
app.use(express.static(path.join(__dirname, 'Pictures')));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'Public', 'Login.html'));
});

app.post('/register', (req, res) => {
    const { nombres, username, correo, pwd } = req.body;

    const sql = 'INSERT INTO Users (nombres, username, email, password) VALUES (?, ?, ?, ?)';

    connection.query(sql, [nombres, username, correo, pwd], (err, result) => {
        if (err) {
            console.error(err);
            return res.send('Error al registrar usuario');
        }
        res.send('Usuario registrado correctamente');
    });
});

app.post('/login', (req, res) => {
    const { usuario, pwd } = req.body;

    const sql = 'SELECT * FROM Users WHERE username = ?';

    connection.query(sql, [usuario], (err, results) => {
        if (err) {
            console.error(err);
            return res.send('Error en el servidor');
        }

        if (results.length === 0) {
            return res.send('Usuario no encontrado');
        }

        const user = results[0];

        if (user.password === pwd) {
            res.send('Login correcto');
        } else {
            res.send('Contraseña incorrecta');
        }
    });
});

app.get('/api/clima', async (req, res) => {
    const lat = req.query.lat;
    const lon = req.query.lon;
    const apiKey = "53088d6d751e9e129ec0d69010e2a178";
    const url = `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${apiKey}&units=metric&lang=es`;

    try {
        const response = await fetch(url);
        const data = await response.json();

        if (data.cod == 200) {
            res.json(data);
        } else {
            res.status(400).json({ error: data.message || "Respuesta inválida" });
        }
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Error al obtener pronóstico" });
    }
});

app.post('/pay', (req, res) => {
    const { name, price, currency } = req.body;

    const create_payment_json = {
        intent: 'sale',
        payer: { payment_method: 'paypal' },
        redirect_urls: {
            return_url: 'https://localhost:3000/success',
            cancel_url: 'https://localhost:3000/cancel'
        },
        transactions: [{
            item_list: {
                items: [{
                    name: name,
                    sku: '001',
                    price: price,
                    currency: currency,
                    quantity: 1
                }]
            },
            amount: {
                currency: currency,
                total: price
            },
            description: `Compra de ${name}`
        }]
    };

    paypal.payment.create(create_payment_json, (error, payment) => {
        if (error) {
            console.error(error);
            res.status(500).send('Error al crear el pago');
        } else {
            for (let link of payment.links) {
                if (link.rel === 'approval_url') {
                    return res.redirect(link.href);
                }
            }
        }
    });
});

app.get('/success', (req, res) => {
    res.send('Pago realizado con éxito');
});

app.get('/cancel', (req, res) => {
    res.send('Pago cancelado');
});

const options = {
    key: fs.readFileSync('server.key'),
    cert: fs.readFileSync('server.cert')
};

https.createServer(options, app).listen(PORT, () => {
    console.log(`Servidor corriendo en https://localhost:${PORT}`);
});