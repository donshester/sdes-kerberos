import express from "express";
import bodyParser from "body-parser";
import routes from "./routes.js";


const app = express();
const port = 3000;


app.listen(port, () => {
    console.log(`KDC Server listening at http://localhost:${port}`);
});
app.use(bodyParser.json());
app.use(routes);