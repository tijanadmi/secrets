//jshint esversion:6

require('dotenv').config();
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require('mongoose');
//const encrypt = require('mongoose-encryption');
//const md5 = require('md5');
const session = require('express-session');
const passport = require('passport');
const passportLocalMongoose = require('passport-local-mongoose');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const findOrCreate = require('mongoose-findorcreate');

const app = express();


app.use(express.static("public"));
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({
  extended: true
}));

app.use(session({
    secret: process.env.SECRET_PASS,
    resave: false,
    saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());


mongoose.set('strictQuery', false);
mongoose.connect("mongodb://localhost:27017/userDB");


const usersSchema=  new mongoose.Schema({
    email: String,
    password: String,
    googleId: String
});

const secretsSchema=  new mongoose.Schema({
    secret: String,
    username: String
});

const Secret = mongoose.model("Secret", secretsSchema);


usersSchema.plugin(passportLocalMongoose);
usersSchema.plugin(findOrCreate);


//usersSchema.plugin(encrypt, {secret: process.env.SECRET, encryptedFields: ["password"] });

const User = mongoose.model("User", usersSchema);

passport.use(User.createStrategy());

/*passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());*/
passport.serializeUser(function(user, cb) {
    process.nextTick(function() {
      cb(null, { id: user.id, username: user.username });
    });
  });
  
  passport.deserializeUser(function(user, cb) {
    process.nextTick(function() {
      return cb(null, user);
    });
  });

passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/secrets"
  },
  function(accessToken, refreshToken, profile, cb) {
    console.log(profile);
    User.findOrCreate({ googleId: profile.id }, function (err, user) {
      return cb(err, user);
    });
  }
));


app.get("/", function(req, res){
    res.render("home");
});

app.get("/login", function(req, res){
    res.render("login");
});

app.get("/register", function(req, res){
    res.render("register");
});

app.get("/secrets", function(req, res){
    if (req.isAuthenticated()){
        res.render("secrets");
    } else {
        res.redirect("/login");
    }
});

app.post("/register", function(req, res){

    User.register({username: req.body.username}, req.body.password, function(err, user){
        if (err){
            console.log(err);
            res.redirect("/register");
        } else {
            passport.authenticate("local")(req, res, function(){
                res.redirect("/secrets");
            });
        }
    });
    /*const newUser = new User({
        email: req.body.username,
        //password: req.body.password
        password: md5(req.body.password)
    });

    newUser.save(function(err){
        if (err) {
            console.log(err);
        } else {
            res.render("secrets");
        }
    });*/

    
});

app.post("/login", function(req, res){

    const user = new User({
        username: req.body.username,
        password: req.body.password
    }); 

    req.login(user, function(err){
        if (err){
            console.log(err);
        } else {
            passport.authenticate("local")(req, res, function(){
                res.redirect("/secrets");
            });
        }
    });

    
    /*const username = req.body.username;
    const password = md5(req.body.password);
    console.log("before err");
    User.findOne({email: username}, function(err,foundUser){
        if (err){
            console.log(err);
        } else {
            if (foundUser){
                if (foundUser) {
                    if (foundUser.password === password) {
                        res.render("secrets");
                    } else {
                        console.log("nije nasao usera");
                        console.log(password);
                    }
                }
            }
        }
    });*/
});

/*app.get("/logout", function(req, res){
    req.logout();
    res.redirect("/");
});*/

app.get("/auth/google",
    passport.authenticate("google", { scope: ["profile"] }));

app.get("/auth/google/secrets", 
  passport.authenticate('google', { failureRedirect: "/login" }),
  function(req, res) {
    // Successful authentication, redirect home.
    res.redirect("/secrets");
  });

app.get("/logout", function(req, res, next) {
    req.logout(function(err) {
      if (err) { return next(err); }
      res.redirect('/');
    });
  });

  app.get("/submit", function(req, res){
    if (req.isAuthenticated()){
        res.render("submit");
    } else {
        res.redirect("/login");
    }
  });

  app.post("/submit", function(req, res){
    const submittedSecret = req.body.secret;
    const submittedUser = req.body.username;
    console.log(req.user.id);
    console.log(req.user.username);
    const newSecret = new Secret({
        secret: submittedSecret,
        username: submittedUser
    });

    newSecret.save(function(err){
        if (!err){
            console.log("uspesno");
            res.redirect("/secrets");
        } else {
            res.redirect("/secrets");
            console.log(err);
        }
    });
    

  });

app.listen(3000, function() {
    console.log("Server started on port 3000");
  });