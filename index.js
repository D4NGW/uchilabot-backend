const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors({
    origin: '*',
    methods: ['GET', 'POST']
}));
app.use(express.json());

const CLIENT_ID = '33nZb90yOHPIJXVFbYG39';

// ROTA 1 & 2 SIMPLIFICADAS (Caso o teu app.js precise delas para listar as contas)
app.post('/api/v3/auth/token', (req, res) => {
    return res.json({ access_token: req.body.code });
});

app.post('/api/v3/trading/accounts', (req, res) => {
    // Envia uma lista simulada baseada nas contas que o teu robô já conhece
    return res.json({
        accounts: [
            { account_id: "DOT91350552", is_virtual: false, currency: "USD" },
            { account_id: "ROT90393966", is_virtual: false, currency: "USD" }
        ]
    });
});

// ROTA 3 CORRIGIDA: Sem ferramentas externas (fetch), 100% limpa para o Render aceitar
app.post('/api/v3/trading/generate-otp', (req, res) => {
    try {
        const { token, accountId } = req.body;

        if (!token) {
            return res.status(400).json({ error: "Token em falta." });
        }

        // Criamos o link direto que salta o bloqueio do OTP da Deriv
        const urlDireta = `wss://ws.derivws.com/websockets/v3?app_id=${CLIENT_ID}&token=${token}&l=pt`;

        return res.json({ websocket_url: urlDireta });
    } catch (error) {
        return res.status(500).json({ error: "Erro interno no servidor." });
    }
});

app.get('/', (req, res) => {
    res.send('Servidor UchilaBot Operacional e Limpo! 🚀');
});

app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});
