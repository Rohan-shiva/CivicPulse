import express from 'express';

const app = express();
const PORT = process.env.PORT || 5000;

app.use(express.json());

app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'CivicPulse API'
  });
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`CivicPulse server running on port ${PORT}`);
  });
}

export default app;
