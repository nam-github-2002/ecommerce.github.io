require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const connectDB = require('./config/db');
const path = require('path');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const flash = require('connect-flash');
const passport = require('passport');
const ejsLayouts = require('express-ejs-layouts');
const methodOverride = require('method-override');


// Khởi tạo app
const app = express();

// Kết nối database
connectDB();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));


// Session và Flash
app.use(
    session({
        secret: process.env.JWT_SECRET,
        resave: false,
        saveUninitialized: false,
        cookie: { maxAge: 1000 * 60 * 60 * 24 }, // 1 ngày
    })
);
app.use(flash());

// Passport
const configPassport = require('./config/passport');
configPassport(passport);
app.use(passport.initialize());
app.use(passport.session());

// EJS
app.use(ejsLayouts);
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.set('layout', 'index');

// Global variables
app.use((req, res, next) => {
    res.locals.currentUser = req.user;
    res.locals.success = req.flash('success');
    res.locals.error = req.flash('error');
    next();
});


app.use(methodOverride('_method')); // Cho phép ghi đè method từ query string


// Routes
//Product
app.use('/product', require('./routes/productRoutes'));
// app.use('/', require('./routes/productRoutes'));

//Authenticate
app.use('/auth', require('./routes/authRoutes'));

//Cart
app.use('/cart', require('./routes/cartRoutes'));

//User
app.use('/user', require('./routes/userRoutes'));

//Order
app.use('/order', require('./routes/orderRoutes'));

// Khởi động server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
