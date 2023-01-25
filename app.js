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

app.use(function(req, res, next){
    res.locals.isAuthenticated = req.isAuthenticated();
    next();
});


mongoose.set('strictQuery', false);
mongoose.connect("mongodb://localhost:27017/userDB");

var user1;
const moviesSchema=  new mongoose.Schema({
        title : String,
        duration : Number,
        genre : String,
        directors : String,
        actors : String,
        screening : Date,
        plot:  String,
        poster : String,
    repertoires: [
    {  date: Date, time: String, hall: String, numOfTickets: Number, numOfResTickets: Number, reservSeats: [String] }
    ]   
});



const Movie = mongoose.model("Movie", moviesSchema);



const repertoiresSchema = new mongoose.Schema({
    date: Date,
    time: String,
    hall: String, 
    numOfTickets: Number, 
    numOfResTickets: Number, 
    reservSeats: [String]
});

const Repertoire = mongoose.model("Repertoire", repertoiresSchema);

const hallsSchema=  new mongoose.Schema({
    name: String,
    rows: [String],
    cols: [Number]
});

const Hall = mongoose.model("Hall", hallsSchema);

const usersSchema=  new mongoose.Schema({
    _id: mongoose.Schema.Types.ObjectId,
    username: String,
    password: String,
    googleId: String,
    name: String
});

const reservationsSchema=  new mongoose.Schema({
    username:  String,
    userId: mongoose.Schema.Types.ObjectId,
    movieId: mongoose.Schema.Types.ObjectId,
    repertoiresId: mongoose.Schema.Types.ObjectId,
    movieTitle: String,
    date: Date,
    time: String,
    hall: String, 
    creationDate: Date,
    reservSeats: [String]
});

const Reservation = mongoose.model("Reservation", reservationsSchema);



usersSchema.plugin(passportLocalMongoose);
usersSchema.plugin(findOrCreate);


//usersSchema.plugin(encrypt, {secret: process.env.SECRET, encryptedFields: ["password"] });

const User = mongoose.model("User", usersSchema);

passport.use(User.createStrategy());

/*passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());*/
passport.serializeUser(function(user, cb) {
    process.nextTick(function() {
      cb(null, { id: user.id, username: user.username, name: user.name });
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
    callbackURL: "http://localhost:3000/auth/google/movies"
  },
  function(accessToken, refreshToken, profile, cb) {
    console.log(profile);
    User.findOrCreate({ googleId: profile.id, name: profile.displayName, username: profile.id }, function (err, user) {
        user1 = user;
      return cb(err, user);
    });
  }
));

app.get('*', function(req, res, next) {
    res.locals.user = req.user || null;
    next();
});


app.get("/", function(req, res){
    res.render("home");
});

app.get("/login", function(req, res){
    res.render("login");
});

app.get("/register", function(req, res){
    console.log(res.locals.user);
    res.render("register");
});

app.get("/secrets", function(req, res){
    console.log(res.locals.user);
    let today = new Date();

    let options = {
        weekday: "long",
        day: "numeric",
        month: "long"
    }
    let options1 = {
        day: "2-digit",
        month: "short",
        year: "numeric"
    }
    let day = today.toLocaleDateString("en-GB", options1);
    console.log(day);
    if (req.isAuthenticated()){
        res.render("secrets",{myData: day});
    } else {
        res.redirect("/login");
    }
});

app.post("/register", function(req, res){

    User.register({username: req.body.username, name: req.body.fullName}, req.body.password, function(err, user){
        if (err){
            console.log(err);
            res.redirect("/register");
        } else {
            user1 = user;
            passport.authenticate("local")(req, res, function(){
                res.redirect("/movies");
            });
        }
    });
});

app.post("/login", function(req, res){

    const user = new User({
        username: req.body.username,
        password: req.body.password,
    }); 

    req.login(user, function(err){
        if (err){
            console.log(err);
        } else {
            passport.authenticate("local")(req, res, function(){
                User.findOne({username: user.username}, function(err, foundUser){
                    if (foundUser){
                        user1 = foundUser;
                        //console.log(user1);
                        res.redirect("/movies");
                    } else {
                        console.log("No user matching that username was found.");
                    }
                });
            });
        }
    });
});



app.get("/movies", function(req, res){
    let today = new Date();
    console.log(today);
    
    var datatodays = today.setDate(new Date(today).getDate() + 3);
    todate = new Date(datatodays);
    console.log(todate);
  
     
    Movie.find({'repertoires.date': { $lt: todate }},function(err, foundMoviesItems){
      if (err){
          console.log(err);
      } else {
      
    res.render("movies", {moviesItems: foundMoviesItems, todate: todate});
      }
    });
  });

app.get("/auth/google",
    passport.authenticate("google", { scope: ["profile"] }));

app.get("/auth/google/movies", 
  passport.authenticate('google', { failureRedirect: "/login" }),
  function(req, res) {
    // Successful authentication, redirect home.
    res.redirect("/movies");
  });

app.get("/logout", function(req, res, next) {
    req.logout(function(err) {
      if (err) { return next(err); }
      //req.session.destroy;
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
            res.redirect("/movies");
        } else {
            res.redirect("/movies");
            console.log(err);
        }
    });
    

  });

  app.get("/reservation/:date/:time/:hall/:movieId/:resId", function(req, res){
    let optionsm = {month: "2-digit"}
    const requestedDate = req.params.date;
    const requestedTime = req.params.time;
    const requestedHall = req.params.hall;
    const requestedMovieId = req.params.movieId;
    
    
    
    if (req.isAuthenticated()){
        Movie.findOne({'repertoires._id':req.params.resId},{reservSeats:1,  repertoires: { $elemMatch:{ _id:req.params.resId } }}, function(err, foundMovie){
            if (err){
                console.log(err);
            }
            else{
                console.log(foundMovie);
                var occupy = foundMovie.repertoires[0].reservSeats;
                console.log(occupy);
                Hall.findOne({name: requestedHall}, function(err, foundHall){
                    if (foundHall){
                        console.log(foundHall);
                        res.render("reservation",{username: user1.name, movieId: requestedMovieId, date: requestedDate, time: requestedTime, hall:foundHall, paramHall: req.params.hall, paramDate: req.params.date, resId: req.params.resId, occupy:occupy });
                    } else {
                        res.send("No hall matching that requestedHall was found.");
                    }
                });
            }
        });
        
        
    } else {
        res.redirect("/login");
    }
});

app.post("/reservation/:date/:time/:hall/:movieId/:resId", function(req, res){
    var r = req.body.add;
    console.log(typeof r);
    var typeOut = typeof r;
    var niz = [];
    if (typeOut ==="undefined"){
        console.log("Nije nista izabrano!");
        res.redirect("/movies");
    } else if (typeOut ==="string"){
        num = 1;
        niz.push(r);
        console.log(num);
    } else {
        num = r.length;
        niz = r;
        console.log(num);
    }
   
        const requestedDate = req.params.date;
        const requestedTime = req.params.time;
        const requestedHall = req.params.hall;
        const requestedMovieId = req.params.movieId;
        console.log(requestedMovieId);
        var a = requestedDate.split('.');
        var start = new Date(a[2] + "-" + a[1] + "-" + a[0]).toISOString();
        
        Movie.findOne({'repertoires._id':req.params.resId},{reservSeats:1,  repertoires: { $elemMatch:{ _id:req.params.resId } }}, function (err, foundMovie) {
            if (err){
                console.log(err);
            }
            else{
                console.log(foundMovie);
                console.log(foundMovie.repertoires[0].numOfTickets);
                console.log(foundMovie.repertoires[0].numOfResTickets);
                console.log(foundMovie.repertoires[0].reservSeats);
                numberOfT = foundMovie.repertoires[0].numOfTickets;
                numberOfRT = foundMovie.repertoires[0].numOfResTickets;
                if (numberOfT < numberOfRT + num){
                    console.log("Karte su rasprodate! Probajte sa manjim brojem");
                } else {
                    var niz1 = foundMovie.repertoires[0].reservSeats;
                    var niz2 = niz1.concat(niz).sort();
                    console.log(niz2);
                    Movie.findOneAndUpdate({'repertoires._id': req.params.resId}, { "repertoires.$.reservSeats" : niz2 , "repertoires.$.numOfResTickets" : numberOfRT + num}, function (err, foundMovie1) {
                        if (err){
                            console.log(err);
                        } else {
                            console.log("Uspesno before!");
                            console.log(user1);
                            console.log(foundMovie1);
                            let today = new Date();
                            const reservation1 = new Reservation({
                                username:  user1.username,
                                userId: user1._id,
                                movieId: foundMovie._id,
                                movieTitle: foundMovie1.title,
                                repertoiresId: req.params.resId,
                                date: foundMovie.repertoires[0].date,
                                time: foundMovie.repertoires[0].time,
                                hall: foundMovie.repertoires[0].hall, 
                                creationDate: today,
                                reservSeats: niz
                            });
                            reservation1.save();
                            console.log("Uspesno after!");
                            res.redirect("/movies");
                        }});
                }
                /*foundMovie.repertoires.forEach(function(repertoire){ 
                    console.log(repertoire.date);
                    console.log(repertoire.reservSeats);
                    
                    });*/
            }
        });
});

app.get("/myreservations", function(req, res){
    if (req.isAuthenticated()){
        Reservation.find({'userId': user1._id},function(err, foundReservations){
            if (err){
                console.log(err);
            } else {
           //console.log(foundReservations) ;
          res.render("myreservations", {myReservations: foundReservations});
            }
          });
   
    } else {
        res.redirect("/login");
    }
  });

  app.post("/myreservations", function(req, res){
    var resId = req.body.cancel;
    if (req.isAuthenticated()){
        Reservation.findById(resId,function(err, foundReservation){
            if (err){
                console.log(err);
            } else {
           var resSeats = foundReservation.reservSeats;
           console.log(resSeats);
           console.log(foundReservation.repertoiresId)
           /*** found Movie */
           Movie.findOne({'repertoires._id':foundReservation.repertoiresId},{reservSeats:1,  repertoires: { $elemMatch:{ _id:foundReservation.repertoiresId } }}, function (err, foundMovie) {
            if (err){
                console.log(err);
            }
            else{
                console.log(foundMovie.repertoires[0].reservSeats);
            }});
           /*** end found Movie */
          res.redirect("/movies");
            }
          });
   
    } else {
        res.redirect("/login");
    }
  });


app.listen(3000, function() {
    console.log("Server started on port 3000");
  });
