// Libraries.
const tape = require('tape'),
      d3Geo = require('d3-geo'),
      topojson = require('topojson'),
      JSDOM = require('jsdom').JSDOM,
      hexgrid = require('../').hexgrid;

// Data.
const luxGeo = require('./data/lux_adm0.json'),
      luxCities = require('./data/lux_cities.json');

// Helper functions.

/**
 * Check if array all object properties are congrunent.
 * @param  {Array} keyList  Array of properties for each object.
 * @return {boolean}        true for congruent properties • false for deviance.
 */
function getKeyEquality(keyList) {
  const keyEquality = []
  for(let i = 0; i < keyList.length; i++) {
    if (i==0) continue;    
    var equality = keyList[i-1].join() === keyList[i].join();
    keyEquality.push(equality);
  }
  return Array.from(new Set(keyEquality))[0];
}

/**
 * Get unique object properties across array.
 * @param  {Array} keys   Array of objects with keys to test.
 * @return {Array}        Array of unique keys.      
 */
function getUniqueKeys(layout) {
  const allKeys = layout.reduce((res, el) => { 
    return res.concat(Object.keys(el));
  },[]);

  return Array.from(new Set(allKeys));
}

// Fake dom for the canvas methods using `document`.
const dom = new JSDOM('<!DOCTYPE html><title>fake dom</title>');
global.document = dom.window.document;

// Set up the hexgrid
const w = 100, h = 100, geo = luxGeo;

const projection = d3Geo.geoMercator().fitSize([w, h], luxGeo);
const geoPath = d3Geo.geoPath().projection(projection);

const t = hexgrid()
  .extent([w, h])
  .geography(geo)
  .projection(projection)
  .pathGenerator(geoPath)
  .hexRadius(4);
  
const hex = t([]);
const hexData = t(luxCities);
const hexDataWithKeys = t(luxCities, ['Name', 'Population']);


tape('The hexgrid function returns an object', test => {
  let actual, expected;

  actual = hex.layout.constructor.name, 
  expected = 'Array';
  test.equal(actual, expected, 'with a property called "layout" of type "Array".');

  actual = hex.imageCenters.constructor.name, 
  expected = 'Array';
  test.equal(actual, expected, 'with a property called "imageCenters" of type "Array".');

  actual = typeof hex.maximum, 
  expected = 'number';
  test.equal(actual, expected, 'with a property called "maximum" of type "number".');

  actual = typeof hex.maximumWt, 
  expected = 'number';
  test.equal(actual, expected, 'with a property called "maximumWt" of type "number".');

  test.end();
});

tape('The hexgrid\'s layout array holds objects', test => {
  let actual, expected;

  // Check all objects share the same keys.
  const layout = hex.layout;
  const keyArray = layout.map(d => Object.keys(d));

  actual = getKeyEquality(keyArray);
  expected = true;
  test.equal(actual, expected, 'with the same properties.');

  // Check unique key names.
  const uniqueKeys = getUniqueKeys(layout);

  actual = uniqueKeys.length;
  expected = 6;
  test.equal(actual, expected, 'with six keys if no user data is supplied.');

  expected = true;
  actual = uniqueKeys.includes('x');
  test.equal(actual, expected, 'with an "x" property.');
  actual = uniqueKeys.includes('y');
  test.equal(actual, expected, 'with a "y" property.');
  actual = uniqueKeys.includes('cover');
  test.equal(actual, expected, 'with a "cover" property.');
  actual = uniqueKeys.includes('gridpoint');
  test.equal(actual, expected, 'with a "gridpoint" property.');
  actual = uniqueKeys.includes('datapoints');
  test.equal(actual, expected, 'with a "datapoints" property.');
  actual = uniqueKeys.includes('datapointsWt');
  test.equal(actual, expected, 'with a "datapointsWt" property.');

  test.end();
});

tape('The hexgrid function run with a geography returns an object', test => {
  let actual, expected;

  actual = hex.layout.length > 90;
  expected = true;
  test.equal(actual, expected, 'with a "layout" array of length greater than a specifically expected number.');

  actual = hex.imageCenters.length > 90;
  expected = true;
  test.equal(actual, expected, 'with an "imageCenters" array of length greater than a specifically expected number.');

  test.end();
});

tape('The hexgrid function run with a geography and user data returns an object', test => {
  let actual, expected;

  actual = hexData.maximum;
  expected = 1;
  test.equal(actual, expected, 'with the expected maximum of datapoints per hexagon.')

  actual = hexData.maximumWt > hexData.maximum;
  expected = true;
  test.equal(actual, expected, 'with a larger weighted maximum than unweighted maximum of datapoints per hexagon.')

  // Check length of hexagons with datapoints.
  const layout = hexData.layout;
  const points = layout.filter(d => d.datapoints).map(d => d.length > 0);
  let length = Array.from(new Set(points))[0];

  actual = length;
  expected = true;
  test.equal(actual, expected, 'with a "layout" property holding hexagons with a length greater than 0 if they contain datapoints.')

  // Check lengthh of hexagons without datapoints.
  const noPoints = layout.filter(d => !d.datapoints).map(d => d.length > 0);
  length = Array.from(new Set(noPoints))[0];

  actual = length;
  expected = false;
  test.equal(actual, expected, 'with a "layout" property holding hexagons with a length of 0 if they do not contain datapoints.')

  // Check cover of external hexagons.
  const edges = layout
    .filter(d => d.cover < 1 && d.datapoints)
    .map(d => d.datapointsWt > d.datapoints);

  actual = Array.from(new Set(edges))[0];
  expected = true;
  test.equal(actual, expected, 'with a "layout" property holding edge hexagons with up-weighted datapoints.')

  // Check cover of internal hexagons.
  const internal = layout
    .filter(d => d.cover === 1 && d.datapoints)
    .map(d => d.datapointsWt === 1);

  actual = Array.from(new Set(edges))[0];
  expected = true;
  test.equal(actual, expected, 'with a "layout" property holding internal hexagons with no up-weighted datapoints.')

  test.end()
});

tape('If supplied with a geography, user data and user variables, only the layout objects WITH datapoints', test => {
  let actual, expected;

  // Check user variables have been passed through.
  const filter = hexDataWithKeys.layout.filter(d => d.datapoints);
  const keyArray = filter.map(d => Object.keys(d));


  actual = getKeyEquality(keyArray);
  expected = true;
  test.equal(actual, expected, 'share the same properties.');

  // Check unique key names.
  const uniqueKeys = getUniqueKeys(filter);


  actual = uniqueKeys.length;
  expected = 7;
  test.equal(actual, expected, 'have seven keys (all keys + Array index 0) if e maximum number of datapoints per hex is 1.');

  // // layout > filter datapoints > map Object.keys(d[0]) > getKeyEquality() < test > getUniqueKeys() < test
  const datapointKeyArray = filter.map(d => Object.keys(d[0]));

  actual = getKeyEquality(datapointKeyArray);
  expected = true;
  test.equal(actual, expected, 'hold datapoint objects with the same properties.');

  // Check unique key names.
  const datapoints = filter.map(d => d[0]);
  const datapointsUniqueKeys = getUniqueKeys(datapoints);

  actual = datapointsUniqueKeys.length;
  expected = 4;
  test.equal(actual, expected, 'hold datapoint objects with the expected number of properties.');

  expected = true;
  actual = datapointsUniqueKeys.includes('x');
  test.equal(actual, expected, 'hold datapoint objects with an "x" property.');
  actual = datapointsUniqueKeys.includes('y');
  test.equal(actual, expected, 'hold datapoint objects with§ a "y" property.');
  actual = datapointsUniqueKeys.includes('Name') && datapointsUniqueKeys.includes('Population');
  test.equal(actual, expected, 'hold datapoint objects with the passed in user variables.');



  test.end();
});