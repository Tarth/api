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
const userData = require("../data.json");
const jwt = require("jsonwebtoken");
const auth = require("./auth.js");
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
app.get("/", auth.authenticateToken, (req, res) => {
  db.getAllJobs(req, res);
});

let refreshTokens = [];

app.post("/token", (req, res) => {
  const refreshToken = req.body.token;
  //store token in db
  if (refreshToken == null) return res.sendStatus(401);
  if (!refreshTokens.includes(refreshToken)) return res.sendStatus(403);
  jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET, (err, user) => {
    if (err) return res.sendStatus(403);
    const accessToken = auth.generateAccessToken({ name: user.name });
    res.json({ accessToken: accessToken });
  });
});

app.post("/login", (req, res) => {
  // Authenticate user
  const username = req.body.username;
  const user = { name: username };
  const accessToken = auth.generateAccessToken(user);
  const refreshToken = jwt.sign(user, process.env.REFRESH_TOKEN_SECRET);
  refreshTokens.push(refreshToken);
  res.json({ accessToken: accessToken, refreshToken: refreshToken });
});
app.get("/workers", auth.authenticateToken, (req, res) => {
  db.getUsers(req, res);
});
app.post("/workers/add", auth.authenticateToken, (req, res) => {
  db.CreateWorker(req, res);
});
app.delete("/workers/delete", auth.authenticateToken, (req, res) => {
  db.DeleteWorker(req, res);
});
app.post("/jobs/add", auth.authenticateToken, (req, res) => {
  db.CreateJob(req, res);
});
app.delete("/jobs/delete", auth.authenticateToken, (req, res) => {
  db.DeleteJob(req, res);
});
app.put("/jobs/update", auth.authenticateToken, (req, res) => {
  db.UpdateJob(req, res);
});

app.listen(port, () => {
  console.log(`App running on port ${port}`);
});
