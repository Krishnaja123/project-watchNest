require("dotenv").config();
const express = require("express");
const app = express();
const path = require("path");
const session = require("express-session");
const passport = require("./config/passport")
const dbConnect = require("./config/db");
// const multer = require("multer");
// const upload = require("./config/multerConfig");
const userRouter = require("./routes/userRoutes");
const adminRouter = require("./routes/adminRoutes");
//const adminRouter1 = require("./routes/admin/");
//const MongoStore = require('connect-mongo').default;

dbConnect();
const port = process.env.PORT;

app.use(express.json());
app.use(express.urlencoded({extended:true}));

app.use(session({ 
    secret: process.env.SESSION_SECRET, // Used to sign the session ID cookie
    resave: false, // Don't save session if unmodified
    saveUninitialized: false, // Don't create session until something is stored
//     store: MongoStore.create({
//     mongoUrl: process.env.MONGODB_URL, // MongoDB connection URL
//     ttl: 14 * 24 * 60 * 60, // Session TTL (time-to-live) in seconds (14 days)
//   }),
    cookie: {
        secure: false, // Set to `true` in production (HTTPS only)
        httpOnly: true,
        maxAge: 24*60*60*1000  // 1 day (in milliseconds)
    }
}));

app.use((req,res,next) => {
    res.locals.user = req.session.user || null;
    next();
})

app.use(passport.initialize());
app.use(passport.session());



app.use(express.static("public"));

app.set("view engine","ejs");
app.set("views", path.join(__dirname,"views"));


app.use((req, res, next) => {
    res.set("Cache-Control", "no-cache, no-store, must-revalidate");
    res.set("Pragma", "no-cache");
    res.set("Expires", "0");
    next();
});


// app.get("/",(req,res)=>{
//     res.send("server is running");

// })
 app.use("/", userRouter);
 app.use("/admin", adminRouter);

app.listen(port,()=>{
    console.log(`Server running in port ${port}`);
});