export function loadWorldPins(latlonFile, data, callback ){
	// We're going to ask a file for the JSON data.
	var xhr = new XMLHttpRequest();

	// Where do we get the data?
	xhr.open( 'GET', latlonFile, true );

	// What do we do when we have it?
	xhr.onreadystatechange = function() {
	  // If we've received the data
	  if ( xhr.readyState === 4 && xhr.status === 200 ) {
	      // Parse the JSON
	      data.latlonData = JSON.parse( xhr.responseText );
		  if( callback )
	      	callback();
	    }
	};

	// Begin request
	xhr.send( null );
}

export function loadContentData(filePath, data, callback){
	// var filePath = "categories/All.json";
	filePath = encodeURI( filePath );

	var xhr = new XMLHttpRequest();
	xhr.open( 'GET', filePath, true );
	xhr.onreadystatechange = function() {

		if ( xhr.readyState === 4 && xhr.status === 200 ) {
	    	data.timeBins = JSON.parse( xhr.responseText ).timeBins;
			var maxValue = 0;
			// console.log(timeBins);

			var startTime = data.timeBins[0].t;
	    	var endTime = data.timeBins[data.timeBins.length-1].t;
	    	var timeLength = endTime - startTime;

			if(callback)
				callback();
	    	console.log("finished read data file");
	    }
	};
	xhr.send( null );
}

export function loadCountryCodes(isoFile, data, callback ){
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