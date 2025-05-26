const mysql = require('mysql2');
const express = require('express');
const path = require('path');
require('dotenv').config();

const app = express();
app.use(express.json()); // Middleware to parse JSON
app.use(express.urlencoded({
    extended: true          //To allow nested object (person:{a,b,c}, age:9 ,...)
}));

app.set('view engine','ejs')
app.use(express.static('public'))

// SQL connection
const connection = mysql.createConnection({
  host: process.env.host,
  user: process.env.user,
  password: process.env.password,
  database: process.env.database,
  port: process.env.porter
});

// Home 
app.get( '/' ,(req,res) => {
  res.render("home")

})

app.get("/coordinates", (req,res)=>{
  res.render('coordinates')
})

app.get("/insert", (req,res)=>{
  res.render('insert')
})

// API 1
app.post("/addSchool", (req, res) => {
  const name = req.body.name;
  const address = req.body.addr;
  const latitude = parseFloat(req.body.latitude);
  const longitude = parseFloat(req.body.longitude);

  if (!name || !address || isNaN(latitude) || isNaN(longitude)) {
      res.status(400).send('Missing or invalid required fields');
      return;
  }

  const insertDataQuery = `
      INSERT INTO school (name, address, latitude, longitude)
      VALUES (?, ?, ?, ?)`;

  // Execution
  connection.query(insertDataQuery, [name, address, latitude, longitude], (err, results) => {
      if (err) {
          console.error('Error inserting data: ' + err.stack);
          res.status(500).send('Error inserting data');
          return;
      }
      console.log('Data inserted.');
      res.status(200).send('Data inserted successfully');
  });
});

app.get('/listSchools', (req, res) => {

  const query = 'SELECT * FROM school';

  connection.query(query, (err, results) => {
      if (err) {
          console.error('Error fetching data: ' + err.stack);
          res.status(500).send('Error fetching data');
          return;
      }

      res.status(200).json({results});
  });
});

// API 2
app.get('/listSchools/:coords', (req, res) => {
  const [lat, lon] = req.params.coords.split('&').map(Number);
  const maxDistance = parseFloat(req.query.d);    // e.g., ?d=10
  const limit = parseInt(req.query.limit);        // e.g., ?limit=5

  // Validate coordinates
  if (isNaN(lat) || isNaN(lon)) {
    return res.status(400).send('Invalid latitude or longitude');
  }

  const query = 'SELECT * FROM school';

  connection.query(query, (err, results) => {
    if (err) {
      console.error('Error fetching data: ' + err.stack);
      return res.status(500).send('Error fetching data');
    }

    let filteredResults = results.map(school => {
      const distance = calculateDistance(lat, lon, school.latitude, school.longitude);
      return { ...school, distance };
    });

    // Filter by max distance
    if (!isNaN(maxDistance)) {
      filteredResults = filteredResults.filter(school => school.distance <= maxDistance);
    }

    // Sort by nearest first
    filteredResults.sort((a, b) => a.distance - b.distance);

    // Limit the number of results if specified
    if (!isNaN(limit)) {
      filteredResults = filteredResults.slice(0, limit);
    }

    res.status(200).json({ results: filteredResults });
  });
});


// Calculating distance
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Radius of the Earth in km
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * 
      Math.sin(dLon / 2) * Math.sin(dLon / 2); 
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)); 
  return Math.round(R * c); // Distance in km
}

function deg2rad(deg) {
  return deg * (Math.PI / 180);
}

const PORT = process.env.PORT || 8000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});
