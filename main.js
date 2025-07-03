if(process.env.NODE_ENV != 'production')
{
    require('dotenv').config();
}

const express = require('express');
const app = express();
const path = require('path');
const methodOverride = require('method-override');
const mongoose = require('mongoose');
const ejsMate = require('ejs-mate');
const bodyParser = require('body-parser');
const cors = require('cors');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const maptilerClient = require("@maptiler/client");
const csv = require('csv-parser');
const fs = require('fs');

// Add error handling for uncaught exceptions
process.on('uncaughtException', (err) => {
    console.error('Uncaught Exception:', err);
});

process.on('unhandledRejection', (err) => {
    console.error('Unhandled Rejection:', err);
});

// Configure maptiler only if API key exists
if (process.env.MAPTILER_API_KEY) {
    maptilerClient.config.apiKey = process.env.MAPTILER_API_KEY;
} else {
    console.warn('Warning: MAPTILER_API_KEY not found in environment variables');
}

const Mines = require('./models/mines');
const User = require('./models/user');
const places = require('./data/india-places');
const marketplaceRoutes = require('./marketplace/marketplace');
const authRoutes = require('./auth/auth');
const { isAuthenticated } = require('./auth/auth');

app.engine('ejs', ejsMate);
app.set("view engine", "ejs");
app.set('views', path.join(__dirname, 'pages'));

// Add basic error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).send('Something broke!');
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(methodOverride('_method'));
app.use(cors());

// Session configuration
const sessionConfig = {
    secret: process.env.SESSION_SECRET || 'keyboard cat',
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({ 
        mongoUrl: 'mongodb://localhost:27017/mines',
        touchAfter: 24 * 3600,
        crypto: {
            secret: process.env.SESSION_SECRET || 'keyboard cat'
        }
    }),
    cookie: { 
        maxAge: 1000 * 60 * 60 * 24 * 7, // 1 week
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax'
    },
    name: 'ecomine.sid'
};

app.use(session(sessionConfig));

// Static files middleware should come after session
app.use(express.static('pages'));
app.use(express.static('public'));

app.use(async (req, res, next) => {
    if (req.session.userId) {
        try {
            const user = await User.findById(req.session.userId);
            res.locals.currentUser = user;
        } catch (err) {
            console.error('Session user lookup error:', err);
            res.locals.currentUser = null;
        }
    } else {
        res.locals.currentUser = null;
    }
    next();
});

// MongoDB connection with retry logic
const connectWithRetry = () => {
    mongoose.connect('mongodb://localhost:27017/mines', { 
        useNewUrlParser: true, 
        useUnifiedTopology: true 
    })
    .then(() => {
        console.log("MONGO CONNECTION OPEN!!!");
    })
    .catch(err => {
        console.log("OH NO MONGO CONNECTION ERROR!!!!");
        console.log(err);
        console.log("Retrying in 5 seconds...");
        setTimeout(connectWithRetry, 5000);
    });
};

connectWithRetry();

app.use('/', authRoutes);

// Add root route handler
app.get("/", (req, res) => {
    if (req.session && req.session.userId) {
        res.redirect('/home');
    } else {
        res.redirect('/login');
    }
});

app.get("/home", isAuthenticated, async (req, res) => {
    try {
        // Force clear any cached data
        if (req.session.dashboardData) {
            delete req.session.dashboardData;
        }

        // Get only the mines associated with the logged-in user
        const userMines = await Mines.find({ userId: req.session.userId });
        console.log('Found mines:', userMines); // Debug log
        
        // Initialize dashboard data with explicit 0 values
        let dashboardData = {
            totalEmissions: 0.0,
            totalCostSavings: 0.0,
            mineCount: 0,
            mineCoins: 0,
            showData: false,
            carbonOffset: 0.0,
            emissionTrends: []
        };

        // Only calculate if user has mines with results
        const minesWithResults = userMines.filter(mine => mine.result && mine.result.totalFootprint);
        console.log('Mines with results:', minesWithResults); // Debug log
        
        if (minesWithResults && minesWithResults.length > 0) {
            dashboardData.mineCount = minesWithResults.length;
            
            minesWithResults.forEach(mine => {
                if (mine.result && typeof mine.result.totalFootprint === 'number') {
                    // Add up total emissions
                    dashboardData.totalEmissions += Number(mine.result.totalFootprint);
                    // Calculate cost savings (₹31.25 per ton of CO2)
                    dashboardData.totalCostSavings += (Number(mine.result.totalFootprint) * 31.25);
                }
            });

            // Set carbon offset percentage (based on cost savings relative to total possible savings)
            const maxPossibleSavings = dashboardData.totalEmissions * 100; // Assuming ₹100 per ton is max possible
            dashboardData.carbonOffset = maxPossibleSavings > 0 ? (dashboardData.totalCostSavings / maxPossibleSavings) * 100 : 0;
            dashboardData.carbonOffset = Math.min(Math.max(dashboardData.carbonOffset, 0), 100);
            dashboardData.showData = dashboardData.mineCount > 0;
        }

        console.log('Final dashboard data:', dashboardData); // Debug log

        // Force values to 0 if no valid mines
        if (!dashboardData.showData) {
            dashboardData = {
                totalEmissions: 0.0,
                totalCostSavings: 0.0,
                mineCount: 0,
                mineCoins: 0,
                showData: false,
                carbonOffset: 0.0,
                emissionTrends: []
            };
        }

        res.render('home', dashboardData);
    } catch (err) {
        console.error('Error in home route:', err);
        res.status(500).send('Error loading dashboard data');
    }
});

app.get("/about", (req, res) => {
    res.render("aboutus");
})

app.get("/suggest", (req, res) => {
    res.render("suggest");
})

app.post("/index", isAuthenticated, async (req, res) => {
    try {
        const geox = (req.body.Mine.district +", " + req.body.Mine.state);
        console.log(geox)
        const geoData = await maptilerClient.geocoding.forward((geox), { limit: 1 });        
        const mineData = {
            ...req.body.Mine,
            userId: req.session.userId // Set the userId from the session
        };
        const mine = new Mines(mineData); 
        mine.geometry = geoData.features[0].geometry;
        await mine.save();
        res.redirect("/index");
    } catch (err) {
        console.error("Error adding mine:", err);
        res.status(500).send("Internal Server Error");
    }
});

app.get("/index", isAuthenticated, async (req, res) => {
    try {
        const user = await User.findById(req.session.userId);
        if (!user) {
            return res.redirect('/login');
        }
        // Only get mines belonging to the current user
        const mines = await Mines.find({ userId: req.session.userId });
        res.render("index", { mines, heroVideo: true });
    } catch (err) {
        console.error("Error fetching mines:", err);
        res.status(500).send("Internal Server Error");
    }
});

app.get("/calculate",(req, res) => {
    res.render("calculate", {places});
});

app.get("/index/:id/suggestions",(req, res) => {
    res.render("suggestions");
});

app.get("/index/:id", async (req, res) => {
    try {
        const data = [];
        const mines = await Mines.findById(req.params.id);
        if (!mines) {
            return res.status(404).send("Mine not found");
        }
        fs.createReadStream('./mine_data3.csv')
          .pipe(csv())
          .on('data', (row) => {
            data.push(row);
          })
          .on('end', () => {
            res.render('show', { mines, mineData: data });
          });
    } catch (err) {
        console.error("Error fetching mine:", err);
        res.status(500).send("Internal Server Error");
    }
});

app.delete("/index/:id", async (req, res) => {
    try {
        const mines = await Mines.findByIdAndDelete(req.params.id);
        if (!mines) {
            return res.status(404).send("Mine not found");
        }
        res.redirect("/index");
    } catch (err) {
        console.error("Error deleting mine:", err);
        res.status(500).send("Internal Server Error");
    }
});

app.put("/index/:id", async (req, res) => {
    try {
        const geox = (req.body.Mine.district +", " + req.body.Mine.state);
        const mines = await Mines.findByIdAndUpdate(req.params.id, req.body.Mine, { new: true });
        const geoData = await maptilerClient.geocoding.forward((geox), { limit: 1 });   
        mines.geometry = geoData.features[0].geometry;
        if (!mines) {
            return res.status(404).send("Mine not found");
        }
        await mines.save();
        res.redirect(`/index/${mines.id}`);
    } catch (err) {
        console.error("Error updating mine:", err);
        res.status(500).send("Internal Server Error");
    }
});

app.get("/index/:id/edit", async (req, res) => {
    try {
        const mines = await Mines.findById(req.params.id);
        if (!mines) {
            return res.status(404).send("Mine not found");
        }
        res.render("edit", { mines, places });
    } catch (err) {
        console.error("Error fetching mine for edit:", err);
        res.status(500).send("Internal Server Error");
    }
});

app.get('/getCities', (req, res) => {
    try {
        const state = req.query.state;
        const selectedState = places.states.find(s => s.name === state);
        const cities = selectedState ? selectedState.districts.map(d => d.name) : [];
        res.json(cities);
    } catch (err) {
        console.error("Error fetching cities:", err);
        res.status(500).send("Internal Server Error");
    }
});

app.use('/marketplace', marketplaceRoutes);

// Start server with error handling
const port = process.env.PORT || 3001;
const server = app.listen(port, () => {
    console.log(`SERVER RUNNING ON PORT ${port}.....................`);
}).on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
        console.error(`Port ${port} is already in use. Trying again in 5 seconds...`);
        setTimeout(() => {
            server.close();
            server.listen(port);
        }, 5000);
    } else {
        console.error('Server error:', err);
    }
});
