// import {Vector3} from '../lib/three/three.module'
import * as THREE from 'three';
export function loadGeoData(spec){
    var rad = 100;

	//	iterate through each set of country pins
	for ( var i in spec.latlonData.countries ) {
		var country = spec.latlonData.countries[i];
		
		//	save out country name and code info
		country.countryCode = i;
		country.countryName = spec.countryLookup[i];

		//	take the lat lon from the data and convert this to 3d globe space
        var lon = country.lon - 90;
        var lat = country.lat;
        
        var phi = Math.PI/2 - lat * Math.PI / 180 - Math.PI * 0.01;
        var theta = 2 * Math.PI - lon * Math.PI / 180 + Math.PI * 0.06;
		
		var center = new THREE.Vector3();
        center.x = Math.sin(phi) * Math.cos(theta) * rad;
        center.y = Math.cos(phi) * rad;
        center.z = Math.sin(phi) * Math.sin(theta) * rad;  	
	
		//	save and catalogue       
		country.center = center;
		spec.countryData[country.countryName] = country;
	}		
}
