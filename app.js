//jshint esversion:6
require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
const app = express();
const encrypt = require("mongoose-encryption");
// const md5 = require("md5");
const bcrypt = require("bcrypt");
const saltRounds = 10

app.use(express.static("public"));
app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({
  extended: true
}));

mongoose.connect("mongodb://localhost:27017/userDb", {
  useNewUrlParser: true
})

const userDbSchema = new mongoose.Schema ({
  email: String,
  password: String
})

// userDbSchema.plugin(encrypt, {secret : Process.env.SECRET , encryptedFields: ["passwords"]})

const User = mongoose.model("user", userDbSchema);

app.get("/", function(req, res) {
  res.render("home");
})

app.route("/register")

  .get(function(req, res) {
    res.render("register")
  })

  .post(function(req, res) {

    bcrypt.hash(req.body.password, saltRounds, function(err, hash){
      const user = new User({
        email: req.body.username,
        password: hash
      })

      user.save(function(err) {
        if (err) {
          console.log(err)
        } else {
          res.render("secrets")
        }
      });
    })
  })

app.route("/login")

  .get(function(req, res) {
    res.render("login")
  })

  .post(function(req, res) {

    const username = req.body.username
    const password = req.body.password


    User.findOne({
      email: username
    }, function(err, foundUser) {
      if (!foundUser) {
        console.log(res.send("wrong email or password"));
      } else { if (foundUser){
        bcrypt.compare(password, foundUser.password, function(err, result){

              if (result === true){
              res.send("secrets");}
            })
           }
      else{ res.send("wrong email or password")}
    }
  });
});

app.listen(3000);
