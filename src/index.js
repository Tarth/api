const express = require("express");
const bodyParser = require("body-parser");
const app = express();
const cors = require("cors");
const port = 3003;
const db = require("./queries.js");

app.use(cors());
app.use(bodyParser.json());
app.use(
  bodyParser.urlencoded({
    extended: true,
  })
);

// app.get("/", async (request, response, next) => {
//   //response.json({ info: "Node.js, Express, and Postgres API" });
// });

app.get("/", db.getAllJobs);
app.get("/users", db.getUsers);

app.listen(port, () => {
  console.log(`App running on port ${port}`);
});
