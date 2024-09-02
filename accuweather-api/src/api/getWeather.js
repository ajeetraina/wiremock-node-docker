const express = require("express");
require("dotenv").config();
const axios = require("axios");

const router = express.Router();
const ACCUWEATHER_API_KEY = process.env.ACCUWEATHER_API_KEY;
const USE_WIREMOCK = process.env.USE_WIREMOCK === 'true';

// Function to create stubs on WireMock server
async function createWeatherStub() {
  try {
    await axios.post('http://localhost:8080/__admin/mappings', {
      request: {
        method: 'GET',
        urlPath: '/api/v1/getWeather',
        queryParameters: {
          city: {
            equalTo: 'Bengaluru'
          }
        }
      },
      response: {
        status: 200,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          city: 'Bengaluru',
          temperature: 27.1,
          conditions: 'Mostly cloudy',
          forecasts: [
            {
              date: '2024-09-02T07:00:00+05:30',
              temperature: 83,
              conditions: 'Partly sunny w/ t-storms'
            },
            {
              date: '2024-09-03T07:00:00+05:30',
              temperature: 83,
              conditions: 'Thunderstorms'
            },
            {
              date: '2024-09-04T07:00:00+05:30',
              temperature: 83,
              conditions: 'Intermittent clouds'
            },
            {
              date: '2024-09-05T07:00:00+05:30',
              temperature: 82,
              conditions: 'Dreary'
            },
            {
              date: '2024-09-06T07:00:00+05:30',
              temperature: 82,
              conditions: 'Dreary'
            }
          ]
        })
      }
    });
    console.log('Stub created successfully!');
  } catch (error) {
    console.error('Failed to create stub:', error);
  }
}


// Call this function once, probably at server startup
createWeatherStub();

router.get("/", async (req, res) => {
  const townName = req.query.city;
  let locationKey;
  let weatherData;

  try {
    if (USE_WIREMOCK) {
      // Fetch data from WireMock
      const response = await axios.get(`http://localhost:8080/api/v1/getWeather?city=${townName}`);
      weatherData = response.data;
    } else {
      // Get location key for the given city
      const locationResponse = await axios.get(
        `http://dataservice.accuweather.com/locations/v1/cities/search?apikey=${ACCUWEATHER_API_KEY}&q=${townName}&details=false`
      );
      console.log('Location Response:', locationResponse.data); // Add this line to print the response
      locationKey = locationResponse.data[0].Key;

      // Get current conditions for the location key
      const currentConditionsResponse = await axios.get(
        `http://dataservice.accuweather.com/currentconditions/v1/${locationKey}.json?apikey=${ACCUWEATHER_API_KEY}`
      );
      const currentConditions = currentConditionsResponse.data[0];

      // Get daily forecasts for the location key
      const forecastsResponse = await axios.get(
        `http://dataservice.accuweather.com/forecasts/v1/daily/5day/${locationKey}?apikey=${ACCUWEATHER_API_KEY}`
      );
      const forecasts = forecastsResponse.data.DailyForecasts;

      // Format the weather data
      weatherData = {
        city: townName,
        temperature: currentConditions.Temperature.Metric.Value,
        conditions: currentConditions.WeatherText,
        forecasts: forecasts.map((forecast) => ({
          date: forecast.Date,
          temperature: forecast.Temperature.Maximum.Value,
          conditions: forecast.Day.IconPhrase,
        })),
      };
    }

    res.send(weatherData);
  } catch (error) {
    console.error(error);
    res.status(500).send("Error fetching weather data");
  }
});

module.exports = router;

