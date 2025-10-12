// pages/api/zoho-callback.js
export default async function handler(req, res) {
  try {
    const { code } = req.query; // Zoho sends authorization code as ?code=...

    if (!code) {
      return res.status(400).send("No code provided by Zoho.");
    }

    // You can now exchange this code for an access token
    const response = await fetch("https://accounts.zoho.com/oauth/v2/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        client_id: process.env.ZOHO_CLIENT_ID,
        client_secret: process.env.ZOHO_CLIENT_SECRET,
        redirect_uri: process.env.ZOHO_REDIRECT_URI,
        code: code,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("Zoho API error:", data);
      return res.status(400).json({ error: data });
    }

    // Save token somewhere (e.g., database) or return it
    res.status(200).json(data);
  } catch (err) {
    console.error("Callback error:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
}
