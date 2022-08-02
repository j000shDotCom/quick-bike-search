const express = require("express");
const app = express();
const port = process.env.PORT || 3000;

const { Heap } = require('heap-js')

// https://api.citybik.es/v2/
const fetchBikeStations =
  async (url = "https://api.citybik.es/v2/networks/bay-wheels?fields=stations") => (
    (await (await fetch(url)).json()).network.stations
  )

// Haversine calculation
const haversineDistance = (coordinates1, coordinates2) => {
  const {latitude: lat1, longitude: lon1} = coordinates1
  const {latitude: lat2, longitude: lon2} = coordinates2

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
};


const roundFloat = (n, precision = 8) => {
  const factor = Math.pow(10, precision)
  return Math.round(n * factor) / factor
}

const distanceComparator = ({distance: a}, {distance: b}) => Math.abs(a - b)

const findNearbyStations = (fromLocation, toStations, options = {}) => {
  const computeDistance = station => (
    roundFloat(haversineDistance(fromLocation, station), options.precision)
  )
  const nearbyStations = toStations.map(
    station => {
      const distanceToStation = computeDistance(station)
      const { name, latitude, longitude, ...rest } = station
      return {
        distance: distanceToStation,
        ...{ name, latitude, longitude },
        ...(options.strippedData ? {} : rest)
      }
    }
  )
  return Heap.nsmallest(options.count, nearbyStations, distanceComparator)
}

app.get("/", async (req, resp) => {
  const { latitude, longitude, ...rest } = req.headers
  if (!latitude || !longitude) { return [] }

  const allStations = await fetchBikeStations()
  const nearbyStations = findNearbyStations(
    {latitude, longitude}, allStations, { count: 5, strippedData: true, free: false, ...rest }
  )
  resp.send(nearbyStations)
})

app.get("/test", (req, resp) => {
  const { latitude, longitude } = req.headers
  const fromLocation = {latitude, longitude}

  const nearbyStations = findNearbyStations(
    {latitude, longitude}, [p1, p2, ...OTHERS], {count: 3, strippedData: true}
  )
  resp.send(nearbyStations)
})

app.listen(port, () => console.log(`NearbyBikeSearch app listening on port ${port}!`))
