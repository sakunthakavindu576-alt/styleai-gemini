export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { skin, eventName } = req.body;
  if (!skin || !eventName) return res.status(400).json({ error: 'Missing data' });

  const apiKey = process.env.GEMINI_API_KEY;
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

  const prompt = `You are a fashion stylist. Skin: ${skin.label}, ${skin.fitzpatrick}, ${skin.undertone} undertone. Colors that suit: ${skin.bestColors.join(', ')}. Event: ${eventName}.

Reply ONLY with a JSON array, no markdown, no extra text. Start with [ end with ].
[{"title":"Look name","vibe":"Elegant","description":"Two personalized sentences mentioning specific colors.","items":[{"name":"Specific item with color e.g. Gold silk blouse","searchQuery":"gold silk blouse women"}]}]

Give 3 outfits, max 3 items each. Always use colors from their palette in item names.`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.7, maxOutputTokens: 1000 }
      })
    });
    const data = await response.json();
    if (!data.candidates || !data.candidates[0]) throw new Error('No response');
    let text = data.candidates[0].content.parts[0].text.trim().replace(/```json|```/g, '').trim();
    let outfits = null;
    try { outfits = JSON.parse(text); } catch(e) {
      const m = text.match(/\[[\s\S]*\]/); if (m) outfits = JSON.parse(m[0]);
    }
    if (!Array.isArray(outfits) || !outfits.length) throw new Error('Parse failed');
    res.status(200).json({ success: true, outfits });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
