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
        database: "PROJECT3",
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


// Start the server
app.listen(port, () => {
    console.log(`Listening my DUDE on http://localhost:${port}`);
});