// server.js
const express = require("express");
const bodyParser = require("body-parser");
const fetch = require("node-fetch"); // npm i node-fetch@2
const app = express();
const PORT = 3000;

app.use(bodyParser.json());
app.use(express.static("public")); // Serve index.html e painel.html da pasta public

// Substitua pela sua API KEY do Clerk
const CLERK_API_KEY = "SUA_API_KEY_DO_CLERK";

// Rota para enviar magic link/email OTP
app.post("/send-code", async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({error:"Email é obrigatório"});
  
  try {
    const response = await fetch("https://api.clerk.dev/v1/magic_links", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${CLERK_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ email_address: email })
    });
    const data = await response.json();
    return res.json(data);
  } catch (err) {
    console.error(err);
    return res.status(500).json({error:"Erro ao enviar código"});
  }
});

// Rota para verificar código
app.post("/verify-code", async (req, res) => {
  const { token } = req.body;
  if (!token) return res.status(400).json({error:"Token é obrigatório"});

  try {
    const response = await fetch("https://api.clerk.dev/v1/magic_links/consume", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${CLERK_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ token })
    });
    const data = await response.json();
    if (data.verified) {
      return res.json({ success: true, user: data.user });
    } else {
      return res.status(400).json({ success: false, message:"Código inválido ou expirado"});
    }
  } catch (err) {
    console.error(err);
    return res.status(500).json({error:"Erro ao verificar código"});
  }
});

app.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`));
