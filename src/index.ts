import app from "./app";
import { env } from "./config/env";

app.listen(env.PORT, () => {
  console.log(
    `[server]: Running on http://localhost:${env.PORT} in ${env.NODE_ENV} mode`
  );
});