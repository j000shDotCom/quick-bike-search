const express = require("express");
const app = express();
const port = process.env.PORT || 3000;

const { Heap } = require('heap-js')
const bigDecimal = require('js-big-decimal');

// https://api.citybik.es/v2/
const fetchBikeStations =
  async (url = "https://api.citybik.es/v2/networks/bay-wheels?fields=stations") =>
    (await (await fetch(url)).json()).network.stations

// Haversine calculation
const haversineDistance = ({latitude: lat1, longitude: lon1}) => ({latitude: lat2, longitude: lon2}) => {
  const RADIUS_OF_EARTH_IN_KM = 6371;
  const distance = (a, b) => (Math.PI / 180) * (a - b);
  const toRadian = angle => (Math.PI / 180) * angle;

  const dLat = distance(lat2, lat1);
  const dLon = distance(lon2, lon1);

  const lat1Radian = toRadian(lat1);
  const lat2Radian = toRadian(lat2);


  // Haversine Formula
  const a =
    Math.pow(Math.sin(dLat / 2), 2) +
    Math.pow(Math.sin(dLon / 2), 2) * Math.cos(lat1Radian) * Math.cos(lat2Radian);
  const c = 2 * Math.asin(Math.sqrt(a));

  return RADIUS_OF_EARTH_IN_KM * c;
}

const decimal0 = new bigDecimal("0")

const absDecimal = n => (n.compareTo(decimal0) < 0 ? n.negate() : n)

const distanceComparator = ({distance: a}, {distance: b}) => a.subtract(b)

const findNearbyStations = (currentLocation, bikeStationLocations, options = {}) => {
  const computeDistanceFromCurrentLocation = haversineDistance(currentLocation)

  const nearbyStations = bikeStationLocations.map(({ latitude, longitude, ...rest }) => {
    const latDecimal = new bigDecimal('' + latitude)
    const longDecimal = new bigDecimal('' + longitude)

    return {
      distance: new bigDecimal('' + computeDistanceFromCurrentLocation({ latitude, longitude })),
      latitude: latDecimal,
      longitude: longDecimal,
      ...rest
    }
  })

  const transformStationData = ({ name, distance, latitude, longitude, ...rest }) => ({
    name,
    distance: distance.getValue(),
    latitude: latitude.getValue(),
    longitude: longitude.getValue(),
    ...(options.verbose ? rest : {})
  })

  return Heap.nsmallest(options.count, nearbyStations, distanceComparator)
    .sort(({distance: a}, {distance: b}) => a.compareTo(b))
    .map(transformStationData)
}

app.get("/", async (req, resp) => {
  const { latitude, longitude, ...rest } = req.headers
  if (!latitude || !longitude) { return [] }

  const currentLocation = {latitude, longitude}
  const allStations = await fetchBikeStations()
  const nearbyStations = findNearbyStations(currentLocation, allStations, rest)
  resp.send(nearbyStations)
})

app.listen(port, () => console.log(`NearbyBikeSearch app listening on port ${port}!`))
