import {Detector} from '../lib/Detector';
import {loadCountryCodes, loadWorldPins, loadContentData} from './dataloading';
import {initScene} from './app'

var mapIndexedImage;
var mapOutlineImage;

// Main program entry
function start() {
    if(!Detector.webgl) {
        Detector.addGetWebGLMessage();
    } else {
        var dataObject = {'countryLookup':[], 'latlonData':[], 'timeBins':[]};
        mapIndexedImage = new Image();
        mapIndexedImage.src = 'images/map_indexed.png';
        mapIndexedImage.onload = function() {
            mapOutlineImage = new Image();
            mapOutlineImage.src = 'images/map_outline.png';
            mapOutlineImage.onload = function () {
                loadCountryCodes('json/country_iso3166.json', dataObject, function () {
                    loadWorldPins('json/country_lat_lon.json', dataObject, function () {
                        loadContentData('json/All.json', dataObject, function () {
                            dataObject['indexImage'] = mapIndexedImage;
                            dataObject['outlineImage'] = mapOutlineImage;
                            dataObject['selectableCountries'] =[];
                            dataObject['countryData'] = {};
                            initScene(dataObject);
                        })
                    })
                });
            };
        };
    }
}

start();