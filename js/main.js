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
        // 国家短码和全称映射表
        loadCountryCodes('json/country_iso3166.json',  function () {
            // 国家到经纬度数据，根据国家短码进行映射
            loadWorldPins('json/country_lat_lon.json',  function () {
                // 1992年到2010年所有国家的进出口数据
                /* 格式：
                    timeBins: 是一个长度为19的数组，数组里每一个元素如下格式，代表1年的数据。
                        { data: [], t: 1992 }
                        ... ...
                        { data: [], t: 2010 }
                        里面的data也是一个数组，数组里每个元素格式：
                        {i: "Algeria", wc: "mil", e: "Australia", v: 2479}
                        ... ...
                        {i: "Zambia", wc: "ammo", e: "United States", v: 7310}

                        在程序运行过程中元素会被加上一个 lineGeometry 元素
                        {i: "Zambia", wc: "ammo", e: "United States", v: 7310, lineGeometry: Geometry}
                 */
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
