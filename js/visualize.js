import {
	Vector3, CubicBezierCurve3, Geometry, Color, GeometryUtils, Line,
	AdditiveBlending, ShaderMaterial, LineBasicMaterial, TextureLoader,
	NormalBlending, PointsMaterial, Points
} from "../lib/three/three.module";

import {createUtilLineGeometry} from './util';
import {removeMarkerFromCountry, attachMarkerToCountry} from  './markers'
import {coords} from './mousekeyboard';
import {d3Graphs} from '../lib/ui.controls';

var globeRadius = 1000;
var vec3_origin = new Vector3(0,0,0);

export function buildDataVizGeometries( spec ){
	var selectableYears =[];
	var loadLayer = document.getElementById('loading');

	for( var i in spec.timeBins ){
		var yearBin = spec.timeBins[i].data;

		var year = spec.timeBins[i].t;
		selectableYears.push(year);	

		// console.log('Building data for ...' + year);
		for( var s in yearBin ){
			var set = yearBin[s];

			var exporterName = set.e.toUpperCase();
			var importerName = set.i.toUpperCase();

			var exporter = spec.countryData[exporterName];
			var importer = spec.countryData[importerName];
			
			//	we couldn't find the country, it wasn't in our list...
			if( exporter === undefined || importer === undefined )
				continue;			

			//	visualize this event
			set.lineGeometry = makeConnectionLineGeometry( exporter, importer, set.v, set.wc );
		}
	}			

	loadLayer.style.display = 'none';	
}


function makeConnectionLineGeometry( exporter, importer, value, type ){
	if( exporter.countryName === undefined || importer.countryName === undefined )
		return undefined;

	var deltaX = exporter.center.x - importer.center.x;
	var deltaY = exporter.center.y - importer.center.y;
	var deltaZ = exporter.center.z - importer.center.z;

	var distanceBetweenCountryCenter = Math.sqrt(deltaX*deltaX+deltaY*deltaY+deltaZ*deltaZ);
	// var distanceBetweenCountryCenter = exporter.center.clone().subSelf(importer.center).length();

	//	how high we want to shoot the curve upwards
	var anchorHeight = globeRadius + distanceBetweenCountryCenter * 0.7;

	//	start of the line
	var start = exporter.center;

	//	end of the line
	var end = importer.center;

	//	midpoint for the curve
	var mid = start.clone();
	mid.x += (end.x - mid.x) * 0.5;
	mid.y += (end.y - mid.y) * 0.5;
	mid.z += (end.z - mid.z) * 0.5;
	// var mid = start.clone().lerpSelf(end,0.5);
	var midLength = mid.length();
	mid.normalize();
	mid.multiplyScalar( midLength + distanceBetweenCountryCenter * 0.7 );

	//	the normal from start to end
	// var normal = (new Vector3()).sub(start,end);
	var normal = (new Vector3()).subVectors(start,end);
	normal.normalize();

	/*
				The curve looks like this:

				midStartAnchor---- mid ----- midEndAnchor
			  /											  \
			 /											   \
			/												\
	start/anchor 										 end/anchor

		splineCurveA							splineCurveB
	*/

	var distanceHalf = distanceBetweenCountryCenter * 0.5;

	var startAnchor = start;
	// var midStartAnchor = mid.clone().addSelf( normal.clone().multiplyScalar( distanceHalf ) );
	// var midEndAnchor = mid.clone().addSelf( normal.clone().multiplyScalar( -distanceHalf ) );
	var midStartAnchor = mid.clone();
	var bj1 = normal.clone().multiplyScalar( distanceHalf );
	midStartAnchor.x += bj1.x;
	midStartAnchor.y += bj1.y;
	midStartAnchor.z += bj1.z;
	var midEndAnchor = mid.clone();
	var bj2 = normal.clone().multiplyScalar( -distanceHalf );
	midEndAnchor.x += bj2.x;
	midEndAnchor.y += bj2.y;
	midEndAnchor.z += bj2.z;

	var endAnchor = end;

	//	now make a bezier curve out of the above like so in the diagram
	var splineCurveA = new CubicBezierCurve3( start, startAnchor, midStartAnchor, mid);
	// splineCurveA.updateArcLengths();

	var splineCurveB = new CubicBezierCurve3( mid, midEndAnchor, endAnchor, end);
	// splineCurveB.updateArcLengths();

	//	how many vertices do we want on this guy? this is for *each* side
	var vertexCountDesired = Math.floor( /*splineCurveA.getLength()*/ distanceBetweenCountryCenter * 0.02 + 6 ) * 2;

	//	collect the vertices
	var points = splineCurveA.getPoints( vertexCountDesired );

	//	remove the very last point since it will be duplicated on the next half of the curve
	points = points.splice(0,points.length-1);

	points = points.concat( splineCurveB.getPoints( vertexCountDesired ) );

	//	add one final point to the center of the earth
	//	we need this for drawing multiple arcs, but piled into one geometry buffer
	points.push( vec3_origin );

	var val = value * 0.0003;

	var size = (10 + Math.sqrt(val));
	size = constrain(size,0.1, 60);

	//	create a line geometry out of these
	// var curveGeometry = Curve.Utils.createLineGeometry( points );
	var curveGeometry = createUtilLineGeometry( points );

	curveGeometry.size = size;

	return curveGeometry;
}

function constrain(v, min, max){
	if( v < min )
		v = min;
	else
	if( v > max )
		v = max;
	return v;
}

export function getVisualizedMesh( spec, year, countries, exportCategories, importCategories ){
	//	for comparison purposes, all caps the country names
	for( var i in countries ){
		countries[i] = countries[i].toUpperCase();
	}

	//	pick out the year first from the data
	var indexFromYear = parseInt(year) - 1992;
	if( indexFromYear >= spec.timeBins.length )
		indexFromYear = spec.timeBins.length-1;

	var affectedCountries = [];

	var bin = spec.timeBins[indexFromYear].data;

	var linesGeo = new Geometry();
	var lineColors = [];

	var particlesGeo = new Geometry();
	var particleColors = [];

	//	go through the data from year, and find all relevant geometries
	for( i in bin ){
		var set = bin[i];

		//	filter out countries we don't care about
		var exporterName = set.e.toUpperCase();
		var importerName = set.i.toUpperCase();
		var relevantExport = $.inArray(exporterName, countries) >= 0;
		var relevantImport = $.inArray(importerName, countries) >= 0;

		var useExporter = relevantExport;
		var useImporter = relevantImport;

		var categoryName = spec.reverseWeaponLookup[set.wc];
		var relevantExportCategory = relevantExport && $.inArray(categoryName,exportCategories) >= 0;		
		var relevantImportCategory = relevantImport && $.inArray(categoryName,importCategories) >= 0;		

		if( (useImporter || useExporter) && (relevantExportCategory || relevantImportCategory) ){
			//	we may not have line geometry... (?)
			if( set.lineGeometry === undefined )
				continue;

			var thisLineIsExport = false;

			if(exporterName === spec.selectedCountry.countryName ){
				thisLineIsExport = true;
			}

			// var lineColor = thisLineIsExport ? new Color(exportColor) : new Color(importColor);
			var lineColor = thisLineIsExport ? new Color(0xdd380c) : new Color(0x154492);

			var lastColor;
			//	grab the colors from the vertices
			for( s in set.lineGeometry.vertices ){
				const v = set.lineGeometry.vertices[s];
				lineColors.push(lineColor);
				lastColor = lineColor;
			}

			//	merge it all together
			GeometryUtils.merge( linesGeo, set.lineGeometry );
			// Geometry.merge( linesGeo, set.lineGeometry );

			var particleColor = lastColor.clone();		
			var points = set.lineGeometry.vertices;
			var particleCount = Math.floor(set.v / 8000 / set.lineGeometry.vertices.length) + 1;
			particleCount = constrain(particleCount,1,100);
			var particleSize = set.lineGeometry.size;			
			for( var s=0; s<particleCount; s++ ){
				var desiredIndex = s / particleCount * points.length;
				var rIndex = constrain(Math.floor(desiredIndex),0,points.length-1);

				var point = points[rIndex];						
				var particle = point.clone();
				particle.moveIndex = rIndex;
				particle.nextIndex = rIndex+1;
				if(particle.nextIndex >= points.length )
					particle.nextIndex = 0;
				particle.lerpN = 0;
				particle.path = points;
				particlesGeo.vertices.push( particle );	
				particle.size = particleSize;
				particleColors.push( particleColor );						
			}			

			if( $.inArray( exporterName, affectedCountries ) < 0 ){
				affectedCountries.push(exporterName);
			}							

			if( $.inArray( importerName, affectedCountries ) < 0 ){
				affectedCountries.push(importerName);
			}

			var vb = set.v;
			var exporterCountry = spec.countryData[exporterName];
			if( exporterCountry.mapColor === undefined ){
				exporterCountry.mapColor = vb;
			}
			else{				
				exporterCountry.mapColor += vb;
			}			

			var importerCountry = spec.countryData[importerName];
			if( importerCountry.mapColor === undefined ){
				importerCountry.mapColor = vb;
			}
			else{				
				importerCountry.mapColor += vb;
			}	

			exporterCountry.exportedAmount += vb;
			importerCountry.importedAmount += vb;

			if( exporterCountry === spec.selectedCountry ){
				spec.selectedCountry.summary.exported[set.wc] += set.v;
				spec.selectedCountry.summary.exported.total += set.v;
			}		
			if( importerCountry === spec.selectedCountry ){
				spec.selectedCountry.summary.imported[set.wc] += set.v;
				spec.selectedCountry.summary.imported.total += set.v;
			}

			if( importerCountry === spec.selectedCountry || exporterCountry === spec.selectedCountry ){
				spec.selectedCountry.summary.total += set.v;
			}
		}		
	}

	// console.log(selectedCountry);

	linesGeo.colors = lineColors;	

	//	make a final mesh out of this composite
	var splineOutline = new Line( linesGeo, new LineBasicMaterial(
		{ 	color: 0xffffff, opacity: 1.0, blending: 
			AdditiveBlending, transparent:true,
			depthWrite: false, vertexColors: true, 
			linewidth: 1 } ) 
	);

	splineOutline.renderDepth = false;


	var attributes = {
		size: {	type: 'f', value: [] },
		customColor: { type: 'c', value: [] }
	};

	var uniforms = {
		amplitude: { type: "f", value: 1.0 },
		color:     { type: "c", value: new Color( 0xffffff ) },
		texture:   { type: "t", value: 0, texture: new TextureLoader().load("images/particleA.png" ) },
	};

	var shaderMaterial = new ShaderMaterial( {

		uniforms: 		uniforms,
		// attributes:     attributes, // No such attributes in current three version
		vertexShader:   document.getElementById( 'vertexshader' ).textContent,
		fragmentShader: document.getElementById( 'fragmentshader' ).textContent,

		blending: 		AdditiveBlending,
		depthTest: 		true,
		depthWrite: 	false,
		transparent:	true,
		// sizeAttenuation: true,
	});



	var particleGraphic = new TextureLoader().load("images/map_mask.png");
	// var particleMat = new ParticleBasicMaterial( { map: particleGraphic, color: 0xffffff, size: 60,
	// 													blending: NormalBlending, transparent:true,
	// 													depthWrite: false, vertexColors: true,
	// 													sizeAttenuation: true } );
	var particleMat = new PointsMaterial( { map: particleGraphic, color: 0xffffff, size: 60,
														blending: NormalBlending, transparent:true,
														depthWrite: false, vertexColors: true,
														sizeAttenuation: true } );
	particlesGeo.colors = particleColors;
	// var pSystem = new ParticleSystem( particlesGeo, shaderMaterial );
	var pSystem = new Points( particlesGeo, shaderMaterial );
	pSystem.dynamic = true;
	splineOutline.add( pSystem );

	var vertices = pSystem.geometry.vertices;
	var values_size = attributes.size.value;
	var values_color = attributes.customColor.value;

	for( var v = 0; v < vertices.length; v++ ) {		
		values_size[ v ] = pSystem.geometry.vertices[v].size;
		values_color[ v ] = particleColors[v];
	}

	pSystem.update = function(){	
		// var time = Date.now()									
		for( var i in this.geometry.vertices ){						
			var particle = this.geometry.vertices[i];
			var path = particle.path;
			var moveLength = path.length;
			
			particle.lerpN += 0.05;
			if(particle.lerpN > 1){
				particle.lerpN = 0;
				particle.moveIndex = particle.nextIndex;
				particle.nextIndex++;
				if( particle.nextIndex >= path.length ){
					particle.moveIndex = 0;
					particle.nextIndex = 1;
				}
			}

			var currentPoint = path[particle.moveIndex];
			var nextPoint = path[particle.nextIndex];
			

			particle.copy( currentPoint );
			particle.lerpSelf( nextPoint, particle.lerpN );			
		}
		this.geometry.verticesNeedUpdate = true;
	};		

	//	return this info as part of the mesh package, we'll use this in selectvisualization
	splineOutline.affectedCountries = affectedCountries;


	return splineOutline;	
}

export function selectVisualization( spec, rotating, visualizationMesh, year, countries, exportCategories, importCategories ){
	//	we're only doing one country for now so...
	var cName = countries[0].toUpperCase();
	
	$("#hudButtons .countryTextInput").val(cName);
	spec.previouslySelectedCountry = spec.selectedCountry;
	spec.selectedCountry = spec.countryData[countries[0].toUpperCase()];
    
	spec.selectedCountry.summary = {
		imported: {
			mil: 0,
			civ: 0,
			ammo: 0,
			total: 0,
		},
		exported: {
			mil: 0,
			civ: 0,
			ammo: 0,
			total: 0,
		},
		total: 0,
		historical: getHistoricalData(spec),
	};

	//	clear off the country's internally held color data we used from last highlight
	for( var i in spec.countryData ){
		var country = spec.countryData[i];
		country.exportedAmount = 0;
		country.importedAmount = 0;
		country.mapColor = 0;
	}

	//	clear markers
	for( var i in spec.selectableCountries ){
		removeMarkerFromCountry( spec.selectableCountries[i], spec.countryData );
	}

	//	clear children
	while( visualizationMesh.children.length > 0 ){
		var c = visualizationMesh.children[0];
		visualizationMesh.remove(c);
	}

	//	build the mesh
	console.time('getVisualizedMesh');
	var mesh = getVisualizedMesh(spec, year, countries, exportCategories, importCategories );
	console.timeEnd('getVisualizedMesh');

	//	add it to scene graph
	visualizationMesh.add( mesh );	


	//	alright we got no data but at least highlight the country we've selected
	if( mesh.affectedCountries.length === 0 ){
		mesh.affectedCountries.push( cName );
	}	

	for( var i in mesh.affectedCountries ){
		var countryName = mesh.affectedCountries[i];
		var country = spec.countryData[countryName];
		attachMarkerToCountry( spec, countryName, country.mapColor );
	}

	// console.log( mesh.affectedCountries );
	highlightCountry( spec, mesh.affectedCountries );

	if( spec.previouslySelectedCountry !== spec.selectedCountry ){
		if( spec.selectedCountry ){
			coords.rotateT.x = spec.selectedCountry.lat * Math.PI/180;
			var rotateTargetY;
			var targetY0 = -(spec.selectedCountry.lon - 9) * Math.PI / 180;
            var piCounter = 0;
			while(true) {
                var targetY0Neg = targetY0 - Math.PI * 2 * piCounter;
                var targetY0Pos = targetY0 + Math.PI * 2 * piCounter;
                if(Math.abs(targetY0Neg - rotating.rotation.y) < Math.PI) {
                    rotateTargetY = targetY0Neg;
                    break;
                } else if(Math.abs(targetY0Pos - rotating.rotation.y) < Math.PI) {
					coords.rotateT.y = targetY0Pos;
                    break;
                }
                piCounter++;
                rotateTargetY = wrap(targetY0, -Math.PI, Math.PI);
			}

			coords.rotateV.x *= 0.6;
			coords.rotateV.y *= 0.6;
			// rotateVX *= 0.6;
			// rotateVY *= 0.6;
		}	
	}

    d3Graphs.initGraphs(spec);
}

function findCode(spec, countryName){
	countryName = countryName.toUpperCase();
	for( var i in spec.countryLookup ){
		if( spec.countryLookup[i] === countryName )
			return i;
	}
	return 'not found';
}

//	ordered lookup list for country color index
//	used for GLSL to find which country needs to be highlighted
export var countryColorMap = {'PE':1,
	'BF':2,'FR':3,'LY':4,'BY':5,'PK':6,'ID':7,'YE':8,'MG':9,'BO':10,'CI':11,'DZ':12,'CH':13,'CM':14,'MK':15,'BW':16,'UA':17,
	'KE':18,'TW':19,'JO':20,'MX':21,'AE':22,'BZ':23,'BR':24,'SL':25,'ML':26,'CD':27,'IT':28,'SO':29,'AF':30,'BD':31,'DO':32,'GW':33,
	'GH':34,'AT':35,'SE':36,'TR':37,'UG':38,'MZ':39,'JP':40,'NZ':41,'CU':42,'VE':43,'PT':44,'CO':45,'MR':46,'AO':47,'DE':48,'SD':49,
	'TH':50,'AU':51,'PG':52,'IQ':53,'HR':54,'GL':55,'NE':56,'DK':57,'LV':58,'RO':59,'ZM':60,'IR':61,'MM':62,'ET':63,'GT':64,'SR':65,
	'EH':66,'CZ':67,'TD':68,'AL':69,'FI':70,'SY':71,'KG':72,'SB':73,'OM':74,'PA':75,'AR':76,'GB':77,'CR':78,'PY':79,'GN':80,'IE':81,
	'NG':82,'TN':83,'PL':84,'NA':85,'ZA':86,'EG':87,'TZ':88,'GE':89,'SA':90,'VN':91,'RU':92,'HT':93,'BA':94,'IN':95,'CN':96,'CA':97,
	'SV':98,'GY':99,'BE':100,'GQ':101,'LS':102,'BG':103,'BI':104,'DJ':105,'AZ':106,'MY':107,'PH':108,'UY':109,'CG':110,'RS':111,'ME':112,'EE':113,
	'RW':114,'AM':115,'SN':116,'TG':117,'ES':118,'GA':119,'HU':120,'MW':121,'TJ':122,'KH':123,'KR':124,'HN':125,'IS':126,'NI':127,'CL':128,'MA':129,
	'LR':130,'NL':131,'CF':132,'SK':133,'LT':134,'ZW':135,'LK':136,'IL':137,'LA':138,'KP':139,'GR':140,'TM':141,'EC':142,'BJ':143,'SI':144,'NO':145,
	'MD':146,'LB':147,'NP':148,'ER':149,'US':150,'KZ':151,'AQ':152,'SZ':153,'UZ':154,'MN':155,'BT':156,'NC':157,'FJ':158,'KW':159,'TL':160,'BS':161,
	'VU':162,'FK':163,'GM':164,'QA':165,'JM':166,'CY':167,'PR':168,'PS':169,'BN':170,'TT':171,'CV':172,'PF':173,'WS':174,'LU':175,'KM':176,'MU':177,
	'FO':178,'ST':179,'AN':180,'DM':181,'TO':182,'KI':183,'FM':184,'BH':185,'AD':186,'MP':187,'PW':188,'SC':189,'AG':190,'BB':191,'TC':192,'VC':193,
	'LC':194,'YT':195,'VI':196,'GD':197,'MT':198,'MV':199,'KY':200,'KN':201,'MS':202,'BL':203,'NU':204,'PM':205,'CK':206,'WF':207,'AS':208,'MH':209,
	'AW':210,'LI':211,'VG':212,'SH':213,'JE':214,'AI':215,'MF_1_':216,'GG':217,'SM':218,'BM':219,'TV':220,'NR':221,'GI':222,'PN':223,'MC':224,'VA':225,
	'IM':226,'GU':227,'SG':228};

function highlightCountry(spec, countries ){
	var countryCodes = [];
	for( var i in countries ){
		var code = findCode(spec, countries[i]);
		countryCodes.push(code);
	}

	var ctx = spec.lookup.canvas.getContext('2d');
	ctx.clearRect(0,0,256,1);

	var pickMask = countries.length === 0 ? 0 : 1;
	var oceanFill = 10 * pickMask;
	ctx.fillStyle = 'rgb(' + oceanFill + ',' + oceanFill + ',' + oceanFill +')';
	ctx.fillRect( 0, 0, 1, 1 );

	var selectedCountryCode = spec.selectedCountry.countryCode;

	for( var i in countryCodes ){
		var countryCode = countryCodes[i];
		var colorIndex = countryColorMap[ countryCode ];

		var mapColor = spec.countryData[countries[i]].mapColor;
		// var fillCSS = '#ff0000';
		var fillCSS = '#333333';
		if( countryCode === selectedCountryCode )
			fillCSS = '#eeeeee';

		ctx.fillStyle = fillCSS;
		ctx.fillRect( colorIndex, 0, 1, 1 );
	}

	spec.lookup.texture.needsUpdate = true;
}

function getHistoricalData( spec ){
	var history = [];

	var countryName = spec.selectedCountry.countryName;

	var exportCategories = spec.selectionData.getExportCategories();
	var importCategories = spec.selectionData.getImportCategories();

	for( var i in spec.timeBins ){
		var yearBin = spec.timeBins[i].data;
		var value = { imports: 0, exports:0 };
		for( var s in yearBin ){
			var set = yearBin[s];
			var categoryName = spec.reverseWeaponLookup[set.wc];

			var exporterCountryName = set.e.toUpperCase();
			var importerCountryName = set.i.toUpperCase();
			var relevantCategory = ( countryName === exporterCountryName && $.inArray(categoryName, exportCategories ) >= 0 ) ||
				( countryName === importerCountryName && $.inArray(categoryName, importCategories ) >= 0 );

			if( relevantCategory === false )
				continue;

			//	ignore all unidentified country data
			if( spec.countryData[exporterCountryName] === undefined || spec.countryData[importerCountryName] === undefined )
				continue;

			if( exporterCountryName === countryName )
				value.exports += set.v;
			if( importerCountryName === countryName )
				value.imports += set.v;
		}
		history.push(value);
	}
	// console.log(history);
	return history;
}