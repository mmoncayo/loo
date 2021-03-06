require('dotenv').config();
const { default: Axios } = require('axios');
const axios = require("axios");
const db = require("../models");
const passport = require("../config/passport");
const bathroom = require('../models/bathroom');
const Sequelize = require('sequelize');

module.exports = function (app) {
  async function placeDetails(places) {
    const promises = places.map(async place => {
      const fields = "name,formatted_phone_number,formatted_address,geometry,photo,place_id"
      const detailedParams = `place_id=${place.place_id}&fields=${fields}&key=${process.env.MAPS_API_KEY}`;
      const detailedQuery = `https://maps.googleapis.com/maps/api/place/details/json?${detailedParams}`;

      const response = await axios.get(detailedQuery);
      const detailedPlace = response.data.result;

      return detailedPlace;
    });
    const detailedPlaces = await Promise.all(promises);
    return detailedPlaces;
  }

  app.get("/api/photo/:photo", async (req,res) => {

    const photoReference = req.params.photo;
    const photoParams = `key=${process.env.MAPS_API_KEY}&photoreference=${photoReference}&maxheight=300`
    const photoQuery = `https://maps.googleapis.com/maps/api/place/photo?${photoParams}`;

    let photo;
    try {
      photo = await axios.get(photoQuery);
      res.send(photo.request.res.responseUrl);
    }
    catch (error) {
      console.log(error);
      res.send(error);
    }
  });

  app.get("/api/nearby/:source", (req, res) => {
    const source = req.params.source;
    console.log("calling from", source); 
    const lat = parseFloat(req.query.lat);
    const lon = parseFloat(req.query.lon);

    const params = `key=${process.env.MAPS_API_KEY}&location=${lat},${lon}&rankby=distance&type=store`
    axios.get(`https://maps.googleapis.com/maps/api/place/nearbysearch/json?${params}`)
      .then(async r => {
        const places = r.data.results;
        const detailedPlaces = await placeDetails(places);
        console.log(detailedPlaces);
        
        if (source === "home") {
          
          const place_ids = detailedPlaces.map(place => place.place_id);

          db.Bathroom.findAll({
            where: {
              place_id: {
                [Sequelize.Op.in]: place_ids
              }
            }
          }).then((dbBathrooms) => {
            const bathroomsDataValues = dbBathrooms.map(bathroom => bathroom.dataValues);
            let clientArrayOfBathrooms = [];
            bathroomsDataValues.forEach(dbBathroom => {
              const matchingGooglePlace = detailedPlaces.find(detailedPlace => detailedPlace.place_id === dbBathroom.place_id);
              const mergedBathroom = { ...dbBathroom, ...matchingGooglePlace };
              clientArrayOfBathrooms.push(mergedBathroom)
            });
            res.json(clientArrayOfBathrooms);
          });
        }
        else {
          res.json(detailedPlaces);
        }

      });
  });

  app.get("/api/oneplace/:place_id", async function (req,res) {
    const place_id = req.params.place_id;

    const fields = "name,formatted_phone_number,formatted_address,geometry,photo,place_id"
    const detailedParams = `place_id=${place_id}&fields=${fields}&key=${process.env.MAPS_API_KEY}`;
    const detailedQuery = `https://maps.googleapis.com/maps/api/place/details/json?${detailedParams}`;

    const response = await axios.get(detailedQuery);
    const detailedPlace = response.data.result;

    res.json(detailedPlace);
  });

  app.get("/api/search/:searchvalue", function (req,res) {
    const term = req.params.searchvalue;

    const searchParameters = `query=${term}&key=${process.env.MAPS_API_KEY}`;
    const query = `https://maps.googleapis.com/maps/api/place/textsearch/json?${searchParameters}`;

    axios.get(query).then(async response => {
      const places = response.data.results;
      const detailedPlaces = await placeDetails(places);
      res.json(detailedPlaces);
    });
  });


  app.get("/api/user_data", function (req, res) {
    if (!req.user) {
      res.json({});
    } else {
      res.json({
        email: req.user.email,
        id: req.user.id
      });
    }
  });

  app.post("/api/login", passport.authenticate("local"), function (req, res) {
    res.json(req.user);
  });

  app.post("/api/signup", function (req, res) {
    console.log("starting up signup.")
    db.User.create({
      email: req.body.email,
      password: req.body.password
    })
    .then(function () {
      console.log("307 - redirect on successful signup")
      res.redirect(307, "/api/login");
    })
    .catch(function (err) {
      if (err.name === 'SequelizeUniqueConstraintError'){
        const errorMsg = "Email already in use: " + err.fields['users.email'];
        console.log(errorMsg);
        res.status(409).json({message: errorMsg});
        return;
      }
      console.log("We could not sign you up");//'SequelizeUniqueConstraintError' ; err.fields.users.email
      res.status(500).json(err);
    });
  });

  app.post("/api/bathroom", function(req, res) {
    console.log("adding a new loo...");
    db.Bathroom.create(req.body).then(function(newLoo) {
      res.json(newLoo);
    }).then(() => console.log("loo added successfully"));
  });

  // need put request for update
  // app.put("/api/details", function(req, res) {

  // })
};
