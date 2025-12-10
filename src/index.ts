import bodyParser from 'body-parser';
import express from 'express';

import { errorHandlingMiddleware } from './middleware/error-handling-middleware';
import router from './routes';

const PORT = process.env.PORT || 3000;

const app = express();

app.use(express.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.use('/', router);

app.use(errorHandlingMiddleware);

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
