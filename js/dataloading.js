import {dataObject as data} from "./main";

export function loadWorldPins(latlonFile, callback ) {
	var xhr = new XMLHttpRequest();
	xhr.open( 'GET', latlonFile, true );

	xhr.onreadystatechange = function() {
	    if ( xhr.readyState === 4 && xhr.status === 200 ) {
	      // Parse the JSON
	      data.latlonData = JSON.parse( xhr.responseText );
		  if( callback )
	      	callback();
	    }
	};

	xhr.send( null );
}

export function loadContentData(filePath, callback) {
	filePath = encodeURI( filePath );
	var xhr = new XMLHttpRequest();
	xhr.open( 'GET', filePath, true );

	xhr.onreadystatechange = function() {

		if ( xhr.readyState === 4 && xhr.status === 200 ) {
	    	data.timeBins = JSON.parse( xhr.responseText ).timeBins;

			if(callback)
				callback();
	    }
	};

	xhr.send( null );
}

export function loadCountryCodes(isoFile, callback ) {
	var cxhr = new XMLHttpRequest();
	cxhr.open( 'GET', isoFile, true );

	cxhr.onreadystatechange = function() {
		if ( cxhr.readyState === 4 && cxhr.status === 200 ) {
			data.countryLookup = JSON.parse( cxhr.responseText );
			if(callback) {
				callback();
			}
		}
	};

	cxhr.send( null );
}
