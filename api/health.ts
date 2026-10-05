// Vercel Serverless Function: /api/health
export default function handler(req: any, res: any) {
  res.setHeader('Content-Type', 'application/json');
  return res.status(200).json({
    status: 'ok',
    hasGeminiKey: !!process.env.GEMINI_API_KEY,
    timestamp: new Date().toISOString(),
    platform: 'vercel'
  });
}
