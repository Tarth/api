const express = require("express");
const bodyParser = require("body-parser");
const app = express();
const cors = require("cors");
const morgan = require("morgan");
const path = require("path");
const rfs = require("rotating-file-stream");
const port = 3003;
const db = require("./queries.js");

const accessLogStream = rfs.createStream("access.log", {
  interval: "1d",
  path: path.join(__dirname, "logs"),
});

app.use(cors());
app.use(bodyParser.json());
app.use(
  morgan(":date[web] :remote-addr :method :status :url :user-agent", {
    stream: accessLogStream,
  })
);
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
