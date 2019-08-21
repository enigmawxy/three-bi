import {Detector} from '../lib/Detector';
import {loadCountryCodes, loadWorldPins, loadContentData} from './dataloading';
import {initScene, animate} from './apps'

// dataObject作为全局的变量，可以通过import或export指令引用其内容
export var dataObject = {
    'countryLookup': [],
    'latlonData': [],
    'timeBins':[],
    'selectedCountry': null,
    'previouslySelectedCountry': null,
    'lookup': {'canvas': null, 'texture': null},
    'reverseWeaponLookup': {'ammo': 'Ammunition', 'civ':  'Civilian Weapons', 'mil':  'Military Weapons'}
};

// Main program entry
(function start() {
    if(!Detector.webgl) {
        Detector.addGetWebGLMessage();
    } else {
        var Selection = function(){
            this.selectedYear = '2010';
            this.selectedCountry = 'UNITED STATES';

            this.exportCategories = {};
            this.importCategories = {};

            for( var i in dataObject.reverseWeaponLookup ){
                var index = dataObject.reverseWeaponLookup[i];
                this.exportCategories[index] = true;
                this.importCategories[index] = true;
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

        loadCountryCodes('json/country_iso3166.json',  function () {
            loadWorldPins('json/country_lat_lon.json',  function () {
                loadContentData('json/All.json',  function () {
                    dataObject['selectableCountries'] =[];
                    dataObject['countryData'] = {};
                    initScene();
                    animate();
                })
            })
        });

    }
}());
