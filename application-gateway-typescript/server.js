require('dotenv').config();
const express = require('express');
const cors = require('cors'); // Import the cors middleware
const app = express();
const port = process.env.PORT || 3000;

// Use CORS middleware
app.use(cors({
    origin: process.env.CLIENT_URL || 'http://localhost:4000', // Allow requests from this origin
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE', // Allow these HTTP methods
    credentials: true, // Allow credentials (cookies, authorization headers, etc.)
}));

// Middleware to parse JSON bodies
app.use(express.json());

// Import the compiled TypeScript function
const { main } = require('./dist/getAllAsset');
const { mainCreate } = require('./dist/createAsset');

app.post('/create-asset', async (req, res) => {
    console.log('Request body:', req.body);

    try {
        // Call the async mainCreate function and await its result
        const result = await mainCreate();
        res.json(result);
    } catch (error) {
        console.error('Error in main function:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

app.get('/get-all-assets', async (req, res) => {
    console.log('GET request received');

    try {
        const result = await main();
        res.json(result);
    } catch (error) {
        console.error('Error in getData function:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});
