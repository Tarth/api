require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const app = express();
const fs = require("fs");
const https = require("https");
const http = require("http");
const privateKey = fs.readFileSync(`${process.env.SSL_PATH}/privkey.pem`, "utf8");
const certificate = fs.readFileSync(`${process.env.SSL_PATH}/fullchain.pem`, "utf8");
const credentials = { key: privateKey, cert: certificate };
const cors = require("cors");
const morgan = require("morgan");
const path = require("path");
const rfs = require("rotating-file-stream");
const db = require("./queries.js");
const httpsPort = process.env.HTTPS_PORT;
const jwt = require("jsonwebtoken");
const auth = require("./auth.js");
const bcrypt = require("bcrypt");
const util = require("./utility.js");
const devmode = process.env.DEV_MODE;

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

//Generate new accesstoken from refreshtoken
app.post("/token", async (req, res) => {
  const refreshTokens = await db.GetToken(req, res, "SELECT * FROM refreshtokens ORDER BY id ASC");
  const refreshToken = req.body.token;
  if (refreshToken == null) return res.sendStatus(401);
  if (!refreshTokens.includes(refreshToken)) return res.sendStatus(403);
  jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET, (err, user) => {
    if (err) return res.sendStatus(403);
    const accessToken = auth.generateAccessToken({ name: user.name });
    res.json({ accessToken: accessToken });
  });
});

app.get("/token", async (req, res) => {
  try {
    await db.GetToken(req, res, "SELECT * FROM refreshtokens ORDER BY id ASC");
  } catch (e) {
    res.send(e);
  }
});

app.delete("/token", async (req, res) => {
  try {
    await db.DeleteToken(req, res, "DELETE FROM refreshtokens WHERE id=$1");
  } catch (e) {
    res.send(e);
  }
});

app.get(
  "/calendar",
  function (res, req, next) {
    auth.authenticateAccessToken(res, req, next);
  },
  function (res, req, next) {
    auth.groupPermissions(res, req, next, "worker");
  },
  (req, res) => {
    db.GetJobs(req, res);
  }
);

app.post("/login", async (req, res) => {
  const userAuthentication = await auth.authenticateUser(req, res);
  if (userAuthentication == "missing user") {
    res.status(403).json("User not found");
  } else if (userAuthentication == "missing mail/password") {
    res.status(400).json("Mail or password missing from request");
  } else if (userAuthentication == "wrong password") {
    res.status(401).json("Wrong password");
  } else {
    const query =
      "SELECT users.id, users.name, users.username, users.password, users.usergroup_id, usergroups.groupname AS usergroup FROM users INNER JOIN usergroups ON users.usergroup_id = usergroups.id ORDER BY users.id ASC";
    const users = await db.GetUsers(null, null, query);
    const username = req.body.username;
    const foundUser = users.find((element) => element.username === username);
    const user = { username: username, usergroup: foundUser.usergroup };
    const accessToken = auth.generateAccessToken(user);
    const refreshToken = jwt.sign(user, process.env.REFRESH_TOKEN_SECRET);
    try {
      const tokens = await db.GetToken("SELECT * FROM refreshtokens ORDER BY id ASC");
      const parsedTokens = tokens.map((tokenObj) => ({
        id: tokenObj.id,
        parsedToken: util.parseJWT(tokenObj.usertoken),
      }));
      const parsedTokenAndId = parsedTokens.find(
        (tokenObj) => tokenObj.parsedToken.username === username
      );
      if (tokens.length === 0 || parsedTokenAndId === undefined) {
        db.PostToken("INSERT INTO refreshtokens (usertoken) VALUES ($1) RETURNING *", refreshToken);
      } else {
        db.UpdateToken(
          "UPDATE refreshtokens SET usertoken = $1 WHERE id = $2",
          refreshToken,
          parsedTokenAndId.id
        );
      }
    } catch (e) {
      throw e;
    } finally {
      res.send({ accessToken: accessToken, refreshToken: refreshToken });
    }
  }
});

// req.query is empty but still there even if no parameters has been sent with the request
app.get(
  "/users",
  function (res, req, next) {
    auth.authenticateAccessToken(res, req, next);
  },
  function (res, req, next) {
    auth.groupPermissions(res, req, next, "worker");
  },
  (req, res) => {
    db.GetUsers(req, res);
  }
);
app.post(
  "/users",
  function (res, req, next) {
    auth.authenticateAccessToken(res, req, next);
  },
  function (res, req, next) {
    auth.groupPermissions(res, req, next, "winotoadmin");
  },
  async (req, res) => {
    db.CreateUser(req, res);
  }
);
app.delete(
  "/users",
  function (res, req, next) {
    auth.authenticateAccessToken(res, req, next);
  },
  function (res, req, next) {
    auth.groupPermissions(res, req, next, "winotoadmin");
  },
  (req, res) => {
    db.DeleteUser(req, res);
  }
);
app.post(
  "/jobs",
  function (res, req, next) {
    auth.authenticateAccessToken(res, req, next);
  },
  function (res, req, next) {
    auth.groupPermissions(res, req, next, "planner");
  },
  (req, res) => {
    db.CreateJob(req, res);
  }
);
app.delete(
  "/jobs",
  function (res, req, next) {
    auth.authenticateAccessToken(res, req, next);
  },
  function (res, req, next) {
    auth.groupPermissions(res, req, next, "planner");
  },
  (req, res) => {
    db.DeleteJob(req, res);
  }
);
app.put(
  "/jobs",
  function (res, req, next) {
    auth.authenticateAccessToken(res, req, next);
  },
  function (res, req, next) {
    auth.groupPermissions(res, req, next, "planner");
  },
  (req, res) => {
    db.UpdateJob(req, res);
  }
);

if (devmode === "true") {
  const httpServer = http.createServer(app);
  const httpPort = httpsPort;
  httpServer.listen(httpPort, () => {
    console.log(`Dev Mode active: Http running on ${httpsPort}`);
  });
} else {
  const httpsServer = https.createServer(credentials, app);
  httpsServer.listen(httpsPort, () => {
    console.log(`Https running on ${httpsPort}`);
  });
}
