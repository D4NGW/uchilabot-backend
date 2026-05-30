const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors({
    origin: '*',
    methods: ['GET', 'POST']
}));
app.use(express.json());

const CLIENT_ID = '33nZb90yOHPIJXVFbYG39';

// ROTA 1: Troca o Código OAuth pelo Access Token Oficial
app.post('/api/v3/auth/token', async (req, res) => {
    try {
        const { code, code_verifier, redirect_uri } = req.body;

        if (!code || !code_verifier || !redirect_uri) {
            return res.status(400).json({ error: "Parâmetros em falta." });
        }

        const params = new URLSearchParams();
        params.append('grant_type', 'authorization_code');
        params.append('code', code);
        params.append('code_verifier', code_verifier);
        params.append('redirect_uri', redirect_uri);
        params.append('client_id', CLIENT_ID);

        const respostaDeriv = await fetch('https://auth.deriv.com/oauth2/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: params.toString()
        });

        const dadosToken = await respostaDeriv.json();

        if (!respostaDeriv.ok || dadosToken.error) {
            return res.status(respostaDeriv.status).json({ error: dadosToken.error_description || "Erro de autorização." });
        }

        return res.json(dadosToken);
    } catch (error) {
        return res.status(500).json({ error: "Falha no servidor Render." });
    }
});

// ROTA 2: Obtém as contas disponíveis da Deriv v3
app.post('/api/v3/trading/accounts', async (req, res) => {
    try {
        const { token } = req.body;
        if (!token) return res.status(400).json({ error: "Token em falta." });

        const contasResponse = await fetch("https://api.derivws.com/trading/v1/options/accounts", {
            method: "GET",
            headers: {
                "Authorization": `Bearer ${token}`,
                "Deriv-App-ID": CLIENT_ID,
                "Accept": "application/json"
            }
        });

        const contasData = await contasResponse.json();

        if (!contasResponse.ok) {
            return res.status(contasResponse.status).json({ error: "Erro ao listar contas na Deriv." });
        }

        const listaFinal = contasData.accounts || contasData.data || [];
        return res.json({ accounts: listaFinal });
    } catch (error) {
        return res.status(500).json({ error: "Falha interna ao processar contas." });
    }
});

// ROTA 3: Ignora o bloqueio do OTP e passa o Token direto para o WebSocket
app.post('/api/v3/trading/generate-otp', async (req, res) => {
    try {
        const { token, accountId } = req.body;

        if (!token || !accountId) {
            return res.status(400).json({ error: "Parâmetros em falta." });
        }

        // Criamos uma URL de conexão direta que o teu app.js vai entender
        // Substituindo o fluxo OTP problemático por uma ligação direta autorizada
        const urlDireta = `wss://ws.derivws.com/websockets/v3?app_id=${CLIENT_ID}&token=${token}&l=pt`;

        return res.json({ websocket_url: urlDireta });
    } catch (error) {
        return res.status(500).json({ error: "Falha na ponte de conexão." });
    }
});
