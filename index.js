const express = require("express");
const path = require("path");
const session = require("express-session");

const app = express();
const port = 5501;

// Knex configuration for PostgreSQL
const knex = require("knex")({
    client: "pg",
    connection: {
        host: "localhost",
        user: "postgres",
        password: "", // Replace with your actual password / bradenPOST2644$
        database: "PROJECT3",
        port: 5432,
    },
});



// Set EJS as the view engine
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// Middleware for handling form data
app.use(express.urlencoded({ extended: true }));


// Serve static files (e.g., images) from the IMG directory
app.use('/IMG', express.static('IMG'));


// LOGIN Session middleware configuration
app.use(session({
    secret: 'secretKey', // Secret key for session
    resave: false,
    saveUninitialized: true,
}));

// Apply isAuthenticated middleware to admin routes
app.use(['/admin', '/admin-volunteers', '/admin-users'], isAuthenticated);


// HOME ROUTE
app.get('/', (req, res) => {
    const user = req.session.user || null; // Retrieve user from session
    res.render('index', { user }); // Pass user data to the view
});


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
                res.redirect('/'); // Redirect to the home page after login
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

app.get('/admin', (req, res) => {
    // Assuming you store user data in session or database
    const user = req.session.user || null;  // Adjust this according to how you handle user sessions
    res.render('admin', { user });
});

// ADD USER GET PULL UP ADD PAGE
app.get('/addUser', (req, res) => {
    res.render('addUser');
});

// ADD USER POST
app.post('/addUser', (req, res) => {
    // Extract form values from req.body
    const username = req.body.USERNAME
    const password = req.body.PASSWORD
    const empEmail = req.body.EMP_EMAIL
    const firstName = req.body.EMP_FIRST
    const lastName = req.body.EMP_LAST
    const adminPriv = req.body.ADMIN_PRIV
    knex('users')
        .insert({
            username: username,
            password: password,
            emp_email: empEmail,
            emp_first: capitalizeWords(firstName),
            emp_last: capitalizeWords(lastName),
            admin_priv: adminPriv,
        })
        .then(() => {
            res.redirect('/admin-users');
        })
        .catch(error => {
            console.error('Error adding staff:', error);
            res.status(500).send('Internal Server Error');
        });
});


app.get('/search', async (req, res) => {
    const landlordName = req.query.landlord; // Get the landlord name from query params

    if (!landlordName) {
        // If no landlord name is provided, return a 400 error
        return res.status(400).send('Landlord name is required');
    }

    try {
        // Find the landlord in the landlord table, ensuring case-insensitive match
        const landlord = await knex('landlord')
            .select('id', 'name')
            .whereRaw('LOWER(name) = ?', [landlordName.toLowerCase()])
            .first();

        if (!landlord) {
            // If no landlord is found, send a 404 response
            return res.status(404).send('Landlord not found');
        }

        // Fetch reviews using the landlord's ID
        const reviews = await knex('tenant_reviews')
            .select(
                'landlord_id',
                'reviewer_first',
                'reviewer_last',
                'date_created',
                'responsiveness',
                'maintenance_and_repairs',
                'communication',
                'transparency_and_honesty',
                'fairness_and_flexibility',
                'additional_comments'
            )
            .where('landlord_id', landlord.id)
            .orderBy('date_created', 'desc');

        // Calculate category averages
        const averages = await knex('tenant_reviews')
            .where('landlord_id', landlord.id)
            .avg({
                responsiveness: 'responsiveness',
                maintenance: 'maintenance_and_repairs',
                communication: 'communication',
                transparency: 'transparency_and_honesty',
                flexibility: 'fairness_and_flexibility',
            })
            .first();

        console.log('Averages:', averages);

        // Calculate the total average rating if averages are available
        const totalAverage = (
            (parseFloat(averages.responsiveness) || 0) +
            (parseFloat(averages.maintenance) || 0) +
            (parseFloat(averages.communication) || 0) +
            (parseFloat(averages.transparency) || 0) +
            (parseFloat(averages.flexibility) || 0)
        ) / 5;

        console.log('Total Average:', totalAverage); // Add this line
        // Render the reviews page with the landlord and review data, including the total average
        res.render('reviewView', {
            landlord: landlord.name,
            landlordId: landlord.id,
            reviews,
            averages,
            totalAverage: totalAverage.toFixed(1), // rounding to 1 decimal place
        });
    } catch (error) {
        console.error(error);
        res.status(500).send('Server Error');
    }
});

app.get('/add-review/:landlordId', async (req, res) => {
    const { landlordId } = req.params;

    try {
        // Fetch the landlord's name from the database using the landlordId
        const landlord = await knex('landlord')
            .select('name')
            .where('id', landlordId)
            .first();

        if (!landlord) {
            // If the landlord ID doesn't exist, return a 404 error
            return res.status(404).send('Landlord not found');
        }

        // Render the postReview.ejs view, passing the landlord's name and ID
        res.render('postReview', { 
            landlordName: landlord.name, 
            landlordId 
        });
    } catch (error) {
        console.error(error);
        res.status(500).send('Server Error');
    }
});

app.post('/submit-review', async (req, res) => {
    const {
        landlordId,
        firstName,
        lastName,
        responsiveness,
        maintenance_repairs,
        communication,
        transparency_honesty,
        fairness_flexibility,
        comments
    } = req.body;

    try {
        // Validate that all required fields are present
        if (!landlordId || !firstName || !lastName || !responsiveness || 
            !maintenance_repairs || !communication || 
            !transparency_honesty || !fairness_flexibility) {
            return res.status(400).send('Missing required fields.');
        }

        // Insert the review into the 'tenant_reviews' table
        await knex('tenant_reviews').insert({
            landlord_id: landlordId, // Foreign key to landlords
            reviewer_first: firstName.trim(),
            reviewer_last: lastName.trim(),
            responsiveness: Number(responsiveness),
            maintenance_and_repairs: Number(maintenance_repairs),
            communication: Number(communication),
            transparency_and_honesty: Number(transparency_honesty),
            fairness_and_flexibility: Number(fairness_flexibility),
            additional_comments: comments || null, // Optional field
            date_created: knex.fn.now() // Timestamp for record creation
        });

        // Redirect to the reviewView page with the landlord's data
        const landlord = await knex('landlord')
            .select('id', 'name')
            .where('id', landlordId)
            .first();

        if (!landlord) {
            return res.status(404).send('Landlord not found after review submission.');
        }

        // Fetch reviews and averages for the landlord
        const reviews = await knex('tenant_reviews')
            .select(
                'landlord_id',
                'reviewer_first',
                'reviewer_last',
                'date_created',
                'responsiveness',
                'maintenance_and_repairs',
                'communication',
                'transparency_and_honesty',
                'fairness_and_flexibility',
                'additional_comments'
            )
            .where('landlord_id', landlord.id)
            .orderBy('date_created', 'desc');

        const averages = await knex('tenant_reviews')
            .where('landlord_id', landlord.id)
            .avg({
                responsiveness: 'responsiveness',
                maintenance: 'maintenance_and_repairs',
                communication: 'communication',
                transparency: 'transparency_and_honesty',
                flexibility: 'fairness_and_flexibility',
            })
            .first();

        const totalAverage = (
            (parseFloat(averages.responsiveness) || 0) +
            (parseFloat(averages.maintenance) || 0) +
            (parseFloat(averages.communication) || 0) +
            (parseFloat(averages.transparency) || 0) +
            (parseFloat(averages.flexibility) || 0)
        ) / 5;

        res.render('reviewView', {
            landlord: landlord.name,
            landlordId: landlord.id,
            reviews,
            averages,
            totalAverage: totalAverage.toFixed(1) // rounding to 1 decimal place
        });
    } catch (error) {
        console.error('Error inserting review:', error);
        res.status(500).send('Server error. Please try again later.');
    }
});

// EDIT USER
app.get('/editUser/:id', (req, res) => {
    const staffID = req.params.id;

    knex('users')
        .where('staff_id', staffID)
        .first()
        .then(staff => {
            if (!staff) {
                return res.status(404).send('User not found');
            }

            res.render('editUser', { staff });
        })
        .catch(error => {
            console.error('Error fetching user:', error);
            res.status(500).send('Internal Server Error');
        });
});

app.post('/editUser/:id', (req, res) => {
    const staffID = req.params.id;

    // Helper function to capitalize the first letter of each word
    const capitalize = str => str
        .toLowerCase()
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');

    const { USERNAME, PASSWORD, EMP_EMAIL, EMP_FIRST, EMP_LAST, ADMIN_PRIV } = req.body;

    knex('users')
        .where('staff_id', staffID)
        .update({
            username: USERNAME, // No formatting applied
            password: PASSWORD, // No formatting applied (should be hashed securely in practice)
            emp_email: EMP_EMAIL.toLowerCase(), // Ensure email is stored in lowercase
            emp_first: capitalize(EMP_FIRST), // Capitalize first name
            emp_last: capitalize(EMP_LAST), // Capitalize last name
            admin_priv: ADMIN_PRIV || 'N', // Default to 'N' if no value is provided
        })
        .then((rowsAffected) => {
            if (rowsAffected === 0) {
                console.error('No record updated. staffID may not exist.');
                return res.status(404).send('User not found.');
            }
            res.redirect('/admin-users'); // Redirect to the list of users
        })
        .catch((error) => {
            console.error('Error updating user:', error);
            res.status(500).send('Internal Server Error');
        });
});

//Remove USER
app.post('/removeUser/:id', (req, res) => {
    const staffID = req.params.id;

    knex('users')
        .where('staff_id', staffID)
        .del()
        .then(() => {
            console.log(`Staff with ID ${staffID} deleted successfully`);
            res.redirect('/admin-users'); // Redirect to admin page after deletion
        })
        .catch(error => {
            console.error('Error deleting staff member:', error);
            res.status(500).send('Internal Server Error');
        });
});

app.get('/admin-users', (req, res) => {
    const { startDate, endDate } = req.query;
    const user = req.session.user || null;  // Get user from session

    let query = knex('users').select();

    if (startDate && endDate) {
        query = query.whereBetween('date', [startDate, endDate]);
    }

    query
        .then(staffMembers => {
            res.render('admin-users', { staffMembers, user });  // Pass user along with staffMembers
        })
        .catch(error => {
            console.error('Error querying database:', error);
            res.status(500).send('Internal Server Error');
        });
});

// Start the server
app.listen(port, () => {
    console.log(`Listening my DUDE on http://localhost:${port}`);
});