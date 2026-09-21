import 'dotenv/config';
import { app } from './app';
import { logger } from './lib/logger';

const port = Number(process.env.PORT) || 4000;
app.listen(port, () => {
  logger.info({ port }, 'VIDA+ backend no ar');
});
