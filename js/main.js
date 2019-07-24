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
        //	a list of weapon 'codes'
        //	now they are just strings of categories
        //	Category Name : Category Code
        var weaponLookup = {
            'Military Weapons' 		: 'mil',
            'Civilian Weapons'		: 'civ',
            'Ammunition'			: 'ammo',
        };

        //	a list of the reverse for easy lookup
        var reverseWeaponLookup = {};
        for( var i in weaponLookup ){
            var name = i;
            var code = weaponLookup[i];
            reverseWeaponLookup[code] = name;
        }

        var Selection = function(){
            this.selectedYear = '2010';
            this.selectedCountry = 'UNITED STATES';
            // this.showExports = true;
            // this.showImports = true;
            // this.importExportFilter = 'both';

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

        var dataObject = {'countryLookup':[], 'latlonData':[], 'timeBins':[],
            'selectionData': new Selection(),
            'selectedCountry': null, 'previouslySelectedCountry': null,
            'reverseWeaponLookup': reverseWeaponLookup,
            'lookup': {'canvas': null, 'texture': null}
        };

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