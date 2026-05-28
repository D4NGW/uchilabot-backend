const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// Permite que o teu frontend do Netlify comunique com o Render sem bloqueios de CORS
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST']
}));
app.use(express.json());

const CLIENT_ID = '33nZb90yOHPIJXVFbYG39'; // O teu OAuth Client ID Alfanumérico da Deriv

// ROTA 1: Troca o Código OAuth pelo Access Token Oficial
app.post('/api/trocar-token', async (req, res) => {
    try {
        const { code, code_verifier, redirect_uri } = req.body;

        if (!code || !code_verifier || !redirect_uri) {
            return res.status(400).json({ erro: "Parâmetros em falta para a troca de token." });
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
            console.error("Erro na Deriv ao trocar Token:", dadosToken);
            return res.status(respostaDeriv.status).json({ erro: dadosToken.error_description || "Erro de autorização." });
        }

        return res.json(dadosToken);

    } catch (error) {
        console.error("Erro interno no endpoint trocar-token:", error);
        return res.status(500).json({ erro: "Falha crítica no servidor Render." });
    }
});

// ROTA 2: Nova rota REST obrigatória da v3 para obter o OTP seguro e a URL do WebSocket
app.post('/api/gerar-otp', async (req, res) => {
    try {
        const { tokenBearer, accountId } = req.body;

        if (!tokenBearer || !accountId) {
            return res.status(400).json({ erro: "Token ou ID da conta em falta." });
        }

        const otpResponse = await fetch(`https://api.derivws.com/trading/v1/options/accounts/${accountId}/otp`, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${tokenBearer}`,
                "Deriv-App-ID": CLIENT_ID,
                "Content-Type": "application/json"
            }
        });

        const otpData = await otpResponse.json();

        if (!otpResponse.ok || !otpData.websocket_url) {
            console.error("Erro na Deriv ao gerar OTP:", otpData);
            return res.status(otpResponse.status).json({ erro: "Não foi possível gerar a sessão OTP." });
        }

        // Devolve a URL do WebSocket autenticada (ex: wss://.../ws/real?otp=XXXX)
        return res.json({ websocket_url: otpData.websocket_url });

    } catch (error) {
        console.error("Erro interno no endpoint gerar-otp:", error);
        return res.status(500).json({ erro: "Falha crítica ao gerar segurança no Render." });
    }
});

// Rota base apenas para confirmar visualmente que o teu servidor está vivo no Render
app.get('/', (req, res) => {
    res.send('Servidor do UchilaBot Pro v3 está online e operacional no Render! 🚀');
});

app.listen(PORT, () => {
    console.log(`Servidor a rodar com sucesso na porta ${PORT}`);
});