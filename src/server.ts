import 'dotenv/config';
import { createApp } from './app';
import { createContainer } from './infrastructure/container';

const port = Number(process.env.PORT ?? 3000);

createApp(createContainer()).listen(port, () => {
  console.log(`Crezia API listening on http://localhost:${port}`);
});
