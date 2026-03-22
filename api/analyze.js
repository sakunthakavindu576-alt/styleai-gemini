export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { imageBase64, mimeType } = req.body;
  if (!imageBase64) return res.status(400).json({ error: 'No image provided' });

 const apiKey = process.env.GEMINI_API_KEY;
const url = `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [
            { inline_data: { mime_type: mimeType || 'image/jpeg', data: imageBase64 } },
            { text: 'Analyze the skin tone of the person in this photo. Reply ONLY with a JSON object, no markdown, no extra text. Start with { end with }.\n{"fitzpatrick":"Type V","undertone":"warm","label":"Deep warm brown","hex":"#6B3A2A","lightnessPct":25,"confidence":88,"bestColors":["ivory","gold","terracotta","rust","emerald","coral"],"avoidColors":["ash grey","pastel pink"],"metallic":"gold","tip":"Earthy warm tones will make your complexion radiant"}' }
          ]
        }],
        generationConfig: { temperature: 0.1, maxOutputTokens: 500 }
      })
    });
    const data = await response.json();
    if (!data.candidates || !data.candidates[0]) throw new Error('No response');
    let text = data.candidates[0].content.parts[0].text.trim().replace(/```json|```/g, '').trim();
    let skin = null;
    try { skin = JSON.parse(text); } catch(e) {
      const m = text.match(/\{[\s\S]*\}/); if (m) skin = JSON.parse(m[0]);
    }
    if (!skin || !skin.hex) throw new Error('Parse failed');
    res.status(200).json({ success: true, skin });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
