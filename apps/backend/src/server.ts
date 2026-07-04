import "dotenv/config";

import { app } from "./app.js";
import { env } from "./config/env.js";

app.listen(env.port, () => {
  console.log(`AI Agent Platform for Enterprise backend is running on port ${env.port}`);
});
