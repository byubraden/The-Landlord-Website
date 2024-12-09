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


// Start the server
app.listen(port, () => {
    console.log(`Listening my DUDE on http://localhost:${port}`);
});