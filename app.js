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
  port: process.env.port
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

      res.status(200).send(results);
  });
});

// API 2
app.get('/listSchools/:lat/:lon', (req, res) => {
  const lat = parseFloat(req.params.lat);
  const lon = parseFloat(req.params.lon);

  // Validate user coordinates
  if (isNaN(lat) || isNaN(lon)) {
      res.status(400).send('Invalid or missing latitude/longitude parameters');
      return;
  }

  const query = 'SELECT * FROM school';

  connection.query(query, (err, results) => {
      if (err) {
          console.error('Error fetching data: ' + err.stack);
          res.status(500).send('Error fetching data');
          return;
      }

      const sortedResults = results.map(school => {
          const distance = calculateDistance(lat, lon, school.latitude, school.longitude);
          return { ...school, distance };
      }).sort((a, b) => a.distance - b.distance);

      res.status(200).send(sortedResults);
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
  return R * c; // Distance in km
}

function deg2rad(deg) {
  return deg * (Math.PI / 180);
}

app.listen(8000, () => {
  console.log("Server running on localhost:", 8000);
});