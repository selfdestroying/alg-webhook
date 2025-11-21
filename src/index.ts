// server.js
import bodyParser from "body-parser";
import express, { json } from "express";
import webhookController from "./controllers/webhook-controller";
import { WebhookSchema } from "./dto/webhook.dto";
import { apiMiddleware } from "./middleware";

const app = express();
app.use(json());
app.use(bodyParser.urlencoded({ extended: true }));


app.post(
  "/incoming-webhook",
  apiMiddleware(WebhookSchema),
  webhookController.handleWebhook
);



const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Listening on ${PORT}`));
