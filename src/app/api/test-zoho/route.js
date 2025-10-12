// pages/api/test-zoho.js
export default async function handler(req, res) {
  try {
    // Only for testing: returns environment info
    if (!process.env.ZOHO_CLIENT_ID || !process.env.ZOHO_CLIENT_SECRET) {
      return res.status(500).json({ error: "Zoho credentials missing" });
    }

    // Make the request to Zoho (example: get access token)
    const response = await fetch("https://accounts.zoho.com/oauth/v2/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        client_id: process.env.ZOHO_CLIENT_ID,
        client_secret: process.env.ZOHO_CLIENT_SECRET,
        redirect_uri: process.env.ZOHO_REDIRECT_URI,
        code: process.env.ZOHO_AUTH_CODE, // use a fresh code!
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("Zoho API error:", data);
      return res.status(400).json({ error: data });
    }

    res.status(200).json(data);
  } catch (err) {
    console.error("Server error:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
}
