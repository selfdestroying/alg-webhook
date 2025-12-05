import bodyParser from "body-parser";
import express from "express";

import webhookController from "./controllers/webhook-controller";
import { webhookMiddleware } from "./middleware";

const PORT = process.env.PORT || 3000;

const app = express();

app.use(express.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.post(
  "/incoming-webhook",
  webhookMiddleware,
  webhookController.handleWebhook
);

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
