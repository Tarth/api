const express = require("express");
const bodyParser = require("body-parser");
const app = express();
const cors = require("cors");
const morgan = require("morgan");
const port = 3003;
const db = require("./queries.js");

app.use(cors());
app.use(bodyParser.json());
app.use(morgan("dev"));
app.use(
  bodyParser.urlencoded({
    extended: true,
  })
);

app.get("/", db.getAllJobs);
app.get("/workers", db.getUsers);

app.listen(port, () => {
  console.log(`App running on port ${port}`);
});
