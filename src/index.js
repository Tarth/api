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
const jwt = require("jsonwebtoken");
const auth = require("./auth.js");
const bcrypt = require("bcrypt");
const util = require("./utility.js");

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

app.post("/users/add", async (req, res) => {
  try {
    const hashedPassword = await bcrypt.hash(req.body.password, 10);
    const user = {
      username: req.body.username,
      usergroup: req.body.usergroup,
      password: hashedPassword,
    };
    util.writeJSON(user, "users.json");
    res.status(201).send();
  } catch {
    res.status(500).send();
  }
});

app.post("/users/delete", (req, res) => {
  const users = util.readJSON("users.json");
  const user = users.find((user) => user.mail == req.body.mail);
});

app.get("/users/get", (req, res) => {
  users = util.readJSON("users.json");
  res.json(users);
});

app.post("/token", (req, res) => {
  const refreshTokens = util.readJSON("refreshtokens.json");
  const refreshToken = req.body.token;
  if (refreshToken == null) return res.sendStatus(401);
  if (!refreshTokens.includes(refreshToken)) return res.sendStatus(403);
  jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET, (err, user) => {
    if (err) return res.sendStatus(403);
    const accessToken = auth.generateAccessToken({ name: user.name });
    res.json({ accessToken: accessToken });
  });
});

app.get(
  "/calendar",
  function (res, req, next) {
    auth.authenticateAccessToken(res, req, next);
  },
  function (res, req, next) {
    auth.groupPermissions(res, req, next, "planner");
  },
  (req, res) => {
    db.getAllJobs(req, res);
  }
);

app.get("/", (req, res) => {});

app.post("/login", async (req, res) => {
  const userAuthentication = await auth.authenticateUser(req, res);
  if (userAuthentication == "missing user") {
    res.status(403).json("User not found");
  } else if (userAuthentication == "missing mail/password") {
    res.status(400).json("Mail or password missing from request");
  } else if (userAuthentication == "wrong password") {
    res.status(401).json("Wrong password");
  } else {
    const username = req.body.username;
    const usergroup = req.body.usergroup;
    const user = { username: username, usergroup: usergroup };
    const accessToken = auth.generateAccessToken(user);
    const refreshToken = jwt.sign(user, process.env.REFRESH_TOKEN_SECRET);
    util.replaceActiveRefreshToken(refreshToken);
    res.json({ accessToken: accessToken, refreshToken: refreshToken });
  }
});
app.get("/workers", (req, res) => {
  db.getUsers(req, res);
});
app.post("/workers/add", (req, res) => {
  db.CreateWorker(req, res);
});
app.delete("/workers/delete", (req, res) => {
  db.DeleteWorker(req, res);
});
app.post("/jobs/add", (req, res) => {
  db.CreateJob(req, res);
});
app.delete("/jobs/delete", (req, res) => {
  db.DeleteJob(req, res);
});
app.put("/jobs/update", (req, res) => {
  db.UpdateJob(req, res);
});

app.listen(port, () => {
  console.log(`App running on port ${port}`);
});
