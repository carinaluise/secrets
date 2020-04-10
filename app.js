//jshint esversion:6
require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
const app = express();
const encrypt = require("mongoose-encryption");
const session = require("express-session");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const FacebookStrategy = require("passport-facebook").Strategy;
const findOrCreate = require("mongoose-findorcreate")

const secretStash = [];


app.use(express.static("public"));
app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({
  extended: true
}));

app.use(session({
  secret: process.env.SECRET,
  resave: false,
  saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());

mongoose.connect("mongodb://localhost:27017/userDb", {
  useUnifiedTopology: true
})
mongoose.set("useCreateIndex", true);

const userDbSchema = new mongoose.Schema({
  email: String,
  password: String,
  googleId: String,
  facebookId: String
})

const secretSchema = new mongoose.Schema({
  secret: String
})

userDbSchema.plugin(passportLocalMongoose);
userDbSchema.plugin(findOrCreate);

const User = mongoose.model("user", userDbSchema);
const Secret = mongoose.model("secret", secretSchema);

passport.use(User.createStrategy());

passport.serializeUser(function(user, done) {
  done(null, user.id);
});

passport.deserializeUser(function(id, done) {
  User.findById(id, function(err, user) {
    done(err, user);
  });
});


passport.use(new GoogleStrategy({
    clientID: process.env.CLIENTID,
    clientSecret: process.env.CLIENTSECRET,
    callbackURL: "http://localhost:3000/auth/google/secrets",
    userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo"
  },
  function(accessToken, refreshToken, profile, cb) {
    User.findOrCreate({
      googleId: profile.id
    }, function(err, user) {
      return cb(err, user);
    });
  }
));

passport.use(new FacebookStrategy({
    clientID: process.env.APPID,
    clientSecret: process.env.APPSECRET,
    callbackURL: "http://localhost:3000/auth/facebook/secrets"
  },
  function(accessToken, refreshToken, profile, cb) {
    User.findOrCreate({
      facebookId: profile.id
    }, function(err, user) {
      return cb(err, user);
    });
  }
));



app.get('/auth/facebook',
  passport.authenticate("facebook", {
    scope: ["email"]
  }));

app.get("/auth/google",
  passport.authenticate("google", {
    scope: ["profile"]
  }))

app.get("/auth/google/secrets",
  passport.authenticate("google", {
    failureRedirect: "/login"
  }),
  function(req, res) {
    res.redirect("/secrets");
  });

app.get("/auth/facebook/secrets",
  passport.authenticate("facebook", {
    failureRedirect: "/login"
  }),
  function(req, res) {
    res.redirect("/secrets");
  });

app.get("/", function(req, res) {
  res.render("home");
})

app.get("/secrets", function(req, res) {

  if (req.isAuthenticated()) {

    Secret.find({}, function(err, foundSecrets){
      res.render("secrets", {
        foundSecrets : foundSecrets
      })
    });
  } else {
    res.redirect("/")
  }
})

app.route("/register")

  .get(function(req, res) {
    res.render("register")
  })

  .post(function(req, res) {
    User.register({
      username: req.body.username
    }, req.body.password, function(err, user) {
      if (err) {
        console.log(err)
        res.redirect("/register");
      } else {
        passport.authenticate("local")(req, res, function() {
          res.redirect("secrets")
        })
      }
    })
  })

app.route("/login")

  .get(function(req, res) {
    res.render("login")
  })

  .post(function(req, res) {

    const user = new User({
      username: req.body.username,
      password: req.body.password
    })

    req.login(user, function(err) {
      if (err) {
        console.log(err)
      } else {
        passport.authenticate("local")(req, res, function() {
          res.redirect("/secrets")
        })
      }
    })
  });

app.get("/logout", function(req, res) {
  req.logout();
  res.redirect("/");
})

app.route("/submit")

  .get(function(req, res) {
    res.render("submit")
  })

  .post(function(req, res) {
    const secret = new Secret({
      secret: req.body.secret
    })

    Secret.findOne({secret: secret.secret}, function(err, result) {
      if (!result) {
        secret.save();
        res.redirect("/secrets");
      } else {
      if (result) {
      res.redirect("/secrets");
      }
    }
    })
  })

app.listen(3000);
