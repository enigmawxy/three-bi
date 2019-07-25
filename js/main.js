import {Detector} from '../lib/Detector';
import {loadCountryCodes, loadWorldPins, loadContentData} from './dataloading';
import {initScene, animate} from './app'

var mapIndexedImage;
var mapOutlineImage;

export var dataObject = {'countryLookup':[], 'latlonData':[], 'timeBins':[],
    'selectedCountry': null, 'previouslySelectedCountry': null,
    'lookup': {'canvas': null, 'texture': null}
};

// Main program entry
function start() {
    if(!Detector.webgl) {
        Detector.addGetWebGLMessage();
    } else {
        var weaponLookup = {
            'Military Weapons' 		: 'mil',
            'Civilian Weapons'		: 'civ',
            'Ammunition'			: 'ammo',
        };

        var reverseWeaponLookup = {};
        for( var i in weaponLookup ){
            var name = i;
            var code = weaponLookup[i];
            reverseWeaponLookup[code] = name;
        }

        dataObject.reverseWeaponLookup = reverseWeaponLookup;

        var Selection = function(){
            this.selectedYear = '2010';
            this.selectedCountry = 'UNITED STATES';

            this.exportCategories = {};
            this.importCategories = {};
            for( var i in weaponLookup ){
                this.exportCategories[i] = true;
                this.importCategories[i] = true;
            }

            this.getExportCategories = function(){
                var list = [];
                for( var i in this.exportCategories ){
                    if( this.exportCategories[i] )
                        list.push(i);
                }
                return list;
            };

            this.getImportCategories = function(){
                var list = [];
                for( var i in this.importCategories ){
                    if( this.importCategories[i] )
                        list.push(i);
                }
                return list;
            }
        };

        dataObject.selectionData = new Selection();

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
                            initScene();
                            animate();
                        })
                    })
                });
            };
        };
    }
}

start();