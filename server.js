const express = require("express");
const app = express();
const port = process.env.PORT || 3000;

const haversine = require('haversine-distance')
const { Heap } = require('heap-js')

const BAYWHEELS_URL = "https://api.citybik.es/v2/networks/bay-wheels?fields=stations"

const calcDistance = (currentLoc) => (minHeap, station) => {
  const stationLoc = { latitude: station["latitude"] longitude: station["longitude"] }
  const dist = haversine(currentLoc, stationLoc)
  minHeap.push({ dist, ...station });
  return minHeap;
}

const distanceComparator = ({ dist: dist1 }, { dist: dist2 }) => Math.abs(dist1 - dist2)

const findFreeBikesNearLoc = (location) => {
  const bikeStations = fetch(BAYWHEELS_URL)
    .then((response) => JSON.parse(response.json()))
    .then((obj) => return obj.network.stations);

  const stationHeap = bikeStations.reduce(
    calcDistance(currentLoc),
    new Heap(distanceComparator)
  );

  return [stationHeap.pop(), stationHeap.pop(), stationHeap.pop()];
}

app.get(["/", "/free"], (req, resp) => {
  const currentLoc = { latitude: req.header("lat"), longitude: req.header("long") }
  resp.send(findFreeBikesNearLoc(currentLoc))
});

app.listen(port, () => console.log(`NearbyBikeSearch app listening on port ${port}!`))
