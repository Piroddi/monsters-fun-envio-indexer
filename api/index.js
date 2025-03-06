const express = require('express');
const app = express();

// Middleware to parse JSON
app.use(express.json());

// Mon Info Endpoint
app.get('/moninfo', (req, res) => {
    res.send('MonInfo');
});

//Leaderboard Endpoint
app.get('/leaderboard', (req, res) => {
    res.send('Leaderboard');
});
//Profile Endpoint
app.get('/profile', (req, res) => {
    res.send('Profile');
});
//Activity Endpoint
app.get('/activity', (req, res) => {
    res.send('Activity');
});


const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
