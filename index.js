const express = require("express");
const path = require("path");
const session = require("express-session");

const app = express();
const port = 5500;

// Knex configuration for PostgreSQL
const knex = require("knex")({
    client: "pg",
    connection: {
        host: "localhost",
        user: "postgres",
        password: "bradenPOST2644$", // Replace with your actual password
        database: "INTEX_local",
        port: 5432,
    },
});

// Utility function to capitalize the first letter of each word
function capitalizeWords(str) {
    if (!str) return ''; // Handle null or undefined
    return str
        .toLowerCase()
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
}

// Set EJS as the view engine
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// Middleware for handling form data
app.use(express.urlencoded({ extended: true }));


// Serve static files (e.g., images) from the IMG directory
app.use('/IMG', express.static('IMG'));

// HOME ROUTE
app.get('/', (req, res) => {
    res.render('index')
});


// LOGIN Session middleware configuration
app.use(session({
    secret: 'secretKey', // Secret key for session
    resave: false,
    saveUninitialized: true,
}));


// Middleware to protect routes
function isAuthenticated(req, res, next) {
    if (req.session.user) {
        return next(); // User is authenticated
    }
    res.redirect('/loginpage'); // Redirect to login page
}


// LOGIN ROUTE
app.get('/loginpage', (req, res) => {
    res.render('login'); // Render login.ejs from the views folder
});

// LOGIN ROUTE (POST request)
app.post('/loginpage', (req, res) => {
    const { username, password } = req.body;

    knex('users')
        .where({ username })
        .andWhere({ password })
        .first()
        .then(user => {
            if (user) {
                req.session.user = user; // Save user in session
                res.redirect('/'); // Redirect to home after successful login
            } else {
                res.render('login', { error: "Invalid username or password" });
            }
        })
        .catch(err => {
            console.error(err);
            res.status(500).send('Internal Server Error');
        });
});


// LOGOUT ROUTE
app.post('/logout', (req, res) => {
    req.session.destroy(err => {
        if (err) {
            return res.status(500).send('Failed to log out');
        }
        res.redirect('/'); // Redirect to home page after logout
    });
});

// Start the server
app.listen(port, () => {
    console.log(`Listening my DUDE on http://localhost:${port}`);
});