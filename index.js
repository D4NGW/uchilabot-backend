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
            return res.status(400).json({ error: "Parâmetros em falta para a troca de token." });
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
            return res.status(respostaDeriv.status).json({ error: dadosToken.error_description || "Erro de autorização." });
        }

        return res.json(dadosToken);
    } catch (error) {
        console.error("Erro interno no endpoint trocar-token:", error);
        return res.status(500).json({ error: "Falha crítica no servidor Render." });
    }
});

// ROTA 2: Obtém as contas disponíveis da Deriv v3 (COM LOGS DE AUDITORIA E SUPORTE HÍBRIDO)
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
        
        // ============================================================
        // LOGS SEGUROS PARA VERIFICAÇÃO NO PAINEL DO RENDER
        // ============================================================
        console.log("========== CONTAS DERIV (RESPOSTA REAL V3) ==========");
        console.log(JSON.stringify(contasData, null, 2));
        console.log("======================================================");

        if (!contasResponse.ok) {
            return res.status(contasResponse.status).json({ error: contasData.error || "Erro ao listar contas na Deriv." });
        }

        // Mapeamento dinâmico: Aceita tanto o formato 'accounts' quanto o formato 'data'
        const listaFinal = contasData.accounts || contasData.data || [];

        return res.json({ accounts: listaFinal });
    } catch (error) {
        console.error("Erro ao obter contas via Render:", error);
        return res.status(500).json({ error: "Falha interna ao processar contas." });
    }
});

// ROTA 3: Gera o OTP Seguro para abrir o Canal WebSocket Autenticado da v3
app.post('/api/v3/trading/generate-otp', async (req, res) => {
    try {
        const { token, accountId } = req.body;

        if (!token || !accountId) {
            return res.status(400).json({ error: "Token ou ID da conta em falta." });
        }

        const otpResponse = await fetch(`https://api.derivws.com/trading/v1/options/accounts/${accountId}/otp`, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${token}`,
                "Deriv-App-ID": CLIENT_ID,
                "Content-Type": "application/json"
            }
        });

        const otpData = await otpResponse.json();

        if (!otpResponse.ok || !otpData.websocket_url) {
            console.error("Erro na Deriv ao gerar OTP:", otpData);
            return res.status(otpResponse.status).json({ error: "Não foi possível gerar a sessão OTP." });
        }

        return res.json({ websocket_url: otpData.websocket_url });
    } catch (error) {
        console.error("Erro interno no endpoint gerar-otp:", error);
        return res.status(500).json({ error: "Falha crítica ao gerar segurança no Render." });
    }
});

app.get('/', (req, res) => {
    res.send('Servidor do UchilaBot Pro v3 está online e operacional no Render! 🚀');
});

app.listen(PORT, () => {
    console.log(`Servidor a rodar com sucesso na porta ${PORT}`);
});
