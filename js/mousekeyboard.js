import KeyboardState from "../lib/three/THREEx.kbs";
import {dataObject} from './main';
import {countryColorMap, selectVisualization, constrain} from './visualize'
import {d3Graphs} from '../lib/ui.controls';
import {getPickColor} from './app'

export var coords = {
	rotate:  {x: 0, y:0},
	rotateT: {x: undefined, y: undefined},
	rotateV: {x:0, y:0},
	dragging: false,
	mouse: {x: 0, y: 0}
};

var pmouseX = 0, pmouseY = 0;
var pressX = 0, pressY = 0;
var keyboard = new KeyboardState();

export function onDocumentMouseMove( event ) {

	pmouseX = coords.mouse.x;
	pmouseY = coords.mouse.y;

	coords.mouse.x = event.clientX - window.innerWidth * 0.5;
	coords.mouse.y = event.clientY - window.innerHeight * 0.5;

	if(coords.dragging){
		if(keyboard.pressed("shift") === false){
			coords.rotateV.y += (coords.mouse.x - pmouseX) / 2 * Math.PI / 180 * 0.3;
  			coords.rotateV.x += (coords.mouse.y - pmouseY) / 2 * Math.PI / 180 * 0.3;
  		}
  		else{
  			coords.camera.position.x -= (coords.mouse.x - pmouseX) * .5;
  			coords.camera.position.y += (coords.mouse.y - pmouseY) * .5;
  		}
	}
}

export function onDocumentMouseDown( event ) {
    if(event.target.className.indexOf('noMapDrag') !== -1) {
        return;
    }
    coords.dragging = true;
    pressX = coords.mouse.x;
    pressY = coords.mouse.y;
    coords.rotateT.x = undefined;
    coords.rotateT.x = undefined;
}	

export function onDocumentMouseUp( event ){
	d3Graphs.zoomBtnMouseup();
	coords.dragging = false;
	var histogramPressed = false; // it seems no use
}

export function onClick( event ){
	//	make the rest not work if the event was actually a drag style click
	if( Math.abs(pressX - coords.mouse.x) > 3 || Math.abs(pressY - coords.mouse.y) > 3 )
		return;				

	var pickColorIndex = getPickColor();	
	//	find it
	for( var i in countryColorMap ){
		var countryCode = i;
		var countryColorIndex = countryColorMap[i];
		if( pickColorIndex === countryColorIndex ){
			var countryName = dataObject.countryLookup[countryCode];
			if( countryName === undefined )
				return;			
			if( $.inArray(countryName, dataObject.selectableCountries) <= -1 )
				return;

			var selection = dataObject.selectionData;
			selection.selectedCountry = countryName;
			selectVisualization(selection.selectedYear, [selection.selectedCountry], selection.getExportCategories(), selection.getImportCategories() );

			return;
		}
	}	
}

export function onKeyDown( event ){
}

function handleMWheel( delta ) {
	dataObject.camera.scale.z += delta * 0.1;
	dataObject.camera.scale.z = constrain( dataObject.camera.scale.z, 0.7, 5.0 );
}

export function onMouseWheel( event ){
	var delta = 0;

	if (event.wheelDelta) { /* IE/Opera. */
		delta = event.wheelDelta/120;
	} 
	//	firefox
	else if( event.detail ){
		delta = -event.detail/3;
	}

	if (delta) handleMWheel(delta);

	event.returnValue = false;			
}	

export function onDocumentResize(e){
}