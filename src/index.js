require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const app = express();
const cors = require("cors");
const morgan = require("morgan");
const path = require("path");
const rfs = require("rotating-file-stream");
const db = require("./queries.js");
const port = process.env.PORT || 3003;
// const { request } = require("http");
// const { response } = require("express");

// Logging to file
const time = new Date();
const FileNameGenerator = (time) => {
  const pad = (num) => (num > 9 ? "" : "0") + num;
  if (!time) return "file.log";

  const year = time.getFullYear();
  const month = pad(time.getMonth() + 1);
  const day = pad(time.getDate());

  return `${year}-${month}-${day}.log`;
};

const accessLogStream = rfs.createStream(FileNameGenerator(time), {
  interval: "1d",
  path: path.join(__dirname, "logs"),
});

app.use(
  cors({
    origin: "*",
  })
);

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

//Routing
app.get("/", db.getAllJobs);
app.get("/workers", db.getUsers);
app.post("/workers/add", db.CreateWorker);
app.delete("/workers/delete", db.DeleteWorker);
app.post("/jobs/add", db.CreateJob);
app.delete("/jobs/delete", db.DeleteJob);
app.put("/jobs/update", db.UpdateJob);

app.listen(port, () => {
  console.log(`App running on port ${port}`);
});
