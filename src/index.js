require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const {xss} = require("express-xss-sanitizer")
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
const {
  CreateUser,
  CreateJob,
  DeleteToken,
  DeleteUser,
  DeleteJob,
  GetToken,
  GetJobs,
  GetUsers,
  PostToken,
  UpdateToken,
  UpdateUser,
  UpdateJob,
} = require("./queries.js");
const httpsPort = process.env.HTTPS_PORT;
const jwt = require("jsonwebtoken");
const {
  ValidateAccessToken,
  AuthenticateAccessToken,
  GroupPermissions,
  AuthenticateUser,
  GenerateAccessToken,
} = require("./auth.js");
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
    origin: process.env.ORIGIN_URL,
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
app.use(xss());

const { BaseResponse, SuccessResponse } = util;
//Routing

app.get("/validate", (req, res) => {
  const user = ValidateAccessToken(req, res, process.env.ACCESS_TOKEN_SECRET);
  if (user.hasOwnProperty("username")) {
    res.send(new SuccessResponse(user));
  } else {
    res.send(new BaseResponse(user));
  }
});

//Generate new accesstoken from refreshtoken
app.post("/token", async (req, res) => {
  try {
    const refreshTokens = await GetToken(req, res, "SELECT * FROM refreshtokens ORDER BY id ASC");
    const refreshToken = req.body.token;
    if (refreshToken == null) return res.sendStatus(401);
    const tokenFound = refreshTokens.find((token) => token.usertoken === refreshToken);
    if (tokenFound === undefined) {
      return res.sendStatus(403);
    }
    jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET, (err, user) => {
      if (err) return res.sendStatus(403);
      const accessToken = GenerateAccessToken({
        username: user.username,
        usergroup: user.usergroup,
      });
      res.json({ accessToken: accessToken });
    });
  } catch (error) {
    throw error;
  }
});

app.get("/token", async (req, res) => {
  try {
    await GetToken(req, res, "SELECT * FROM refreshtokens ORDER BY id ASC");
  } catch (e) {
    res.send(e);
  }
});

app.delete("/token", async (req, res) => {
  try {
    await DeleteToken(req, res, "DELETE FROM refreshtokens WHERE id=$1");
  } catch (e) {
    res.send(e);
  }
});

app.get(
  "/calendar",
  function (res, req, next) {
    AuthenticateAccessToken(res, req, next);
  },
  function (res, req, next) {
    GroupPermissions(res, req, next, "worker");
  },
  (req, res) => {
    GetJobs(req, res);
  }
);

app.post("/login", async (req, res) => {
  try {
    await AuthenticateUser(req, res);
    const query =
      "SELECT users.id, users.name, users.username, users.password, users.usergroup_id, usergroups.groupname AS usergroup FROM users INNER JOIN usergroups ON users.usergroup_id = usergroups.id ORDER BY users.id ASC";
    const users = await GetUsers(null, null, query);
    const username = req.body.username;
    const foundUser = users.find((element) => element.username === username);
    const user = { username: username, usergroup: foundUser.usergroup };
    const accessToken = GenerateAccessToken(user);
    const refreshToken = jwt.sign(user, process.env.REFRESH_TOKEN_SECRET);
    const tokens = await GetToken(null, null, "SELECT * FROM refreshtokens ORDER BY id ASC");
    const parsedTokens = tokens.map((tokenObj) => ({
      id: tokenObj.id,
      parsedToken: util.parseJWT(tokenObj.usertoken),
    }));
    const parsedTokenAndId = parsedTokens.find(
      (tokenObj) => tokenObj.parsedToken.username === username
    );
    if (tokens.length === 0 || parsedTokenAndId === undefined) {
      PostToken("INSERT INTO refreshtokens (usertoken) VALUES ($1) RETURNING *", refreshToken);
    } else {
      UpdateToken(
        "UPDATE refreshtokens SET usertoken = $1 WHERE id = $2",
        refreshToken,
        parsedTokenAndId.id
      );
    }
    res.send(new SuccessResponse({ accessToken: accessToken, refreshToken: refreshToken }));
  } catch (error) {
    res.send(new BaseResponse(error));
  }
});

// req.query is empty but still there even if no parameters has been sent with the request
app.get(
  "/users",
  function (res, req, next) {
    AuthenticateAccessToken(res, req, next);
  },
  function (res, req, next) {
    GroupPermissions(res, req, next, "worker");
  },
  async (req, res) => {
    try {
      const users = await GetUsers(req, res);
      res.send(users);
    } catch (error) {
      res.send(error);
    }
  }
);

app.post(
  "/users",
  function (res, req, next) {
    AuthenticateAccessToken(res, req, next);
  },
  function (res, req, next) {
    GroupPermissions(res, req, next, "winotoadmin");
  },
  async (req, res) => {
    try {
      const result = await CreateUser(req, res);
      res.send(new SuccessResponse(result));
    } catch (error) {
      res.send(new BaseResponse(error));
    }
  }
);
app.delete(
  "/users",
  function (res, req, next) {
    AuthenticateAccessToken(res, req, next);
  },
  function (res, req, next) {
    GroupPermissions(res, req, next, "winotoadmin");
  },
  (req, res) => {
    DeleteUser(req, res);
  }
);
app.put(
  "/users",
  function (res, req, next) {
    AuthenticateAccessToken(res, req, next);
  },
  function (res, req, next) {
    GroupPermissions(res, req, next, "winotoadmin");
  },
  (req, res) => {
    UpdateUser(req, res);
  }
);

app.post(
  "/jobs",
  function (res, req, next) {
    AuthenticateAccessToken(res, req, next);
  },
  function (res, req, next) {
    GroupPermissions(res, req, next, "planner");
  },
  (req, res) => {
    CreateJob(req, res);
  }
);
app.delete(
  "/jobs",
  function (res, req, next) {
    AuthenticateAccessToken(res, req, next);
  },
  function (res, req, next) {
    GroupPermissions(res, req, next, "planner");
  },
  (req, res) => {
    DeleteJob(req, res);
  }
);

app.put(
  "/jobs",
  function (res, req, next) {
    AuthenticateAccessToken(res, req, next);
  },
  function (res, req, next) {
    GroupPermissions(res, req, next, "planner");
  },
  (req, res) => {
    UpdateJob(req, res);
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
