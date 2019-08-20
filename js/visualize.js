import {dataObject as spec} from './main';
import * as THREE from 'three';
import {createUtilLineGeometry, wrap} from './util';
import {removeMarkerFromCountry, attachMarkerToCountry} from  './markers'
import {coords} from './mousekeyboard';
import {d3Graphs} from '../lib/ui.controls';

var vertexshader =`
 		uniform float amplitude;
        attribute float size;
        attribute vec3 customColor;
        varying vec3 vColor;
        void main() {
            vColor = customColor;
            vec4 mvPosition = modelViewMatrix * vec4( position, 1.0 );
            gl_PointSize = size;
            gl_Position = projectionMatrix * mvPosition;
        }`;

var fragmentshader = `
		uniform vec3 color;
        uniform sampler2D texture;
        varying vec3 vColor;
        void main() {
            gl_FragColor = vec4( color * vColor, 1.0 );
            gl_FragColor = gl_FragColor * texture2D( texture, gl_PointCoord );
        }`;

var globeRadius = 1000;
var vec3_origin = new THREE.Vector3(0,0,0);

export function buildDataVizGeometries(){
	var loadLayer = document.getElementById('loading');

	for( var i in spec.timeBins ){
		var yearBin = spec.timeBins[i].data;

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
	// var distanceBetweenCountryCenter1 = exporter.center.clone().subSelf(importer.center).length();

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
	var normal = (new THREE.Vector3()).subVectors(start,end);
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
	// var midStartAnchor1 = mid.clone().addSelf( normal.clone().multiplyScalar( distanceHalf ) );
	// var midEndAnchor1 = mid.clone().addSelf( normal.clone().multiplyScalar( -distanceHalf ) );
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
	var splineCurveA = new THREE.CubicBezierCurve3( start, startAnchor, midStartAnchor, mid);
	// splineCurveA.updateArcLengths();

	var splineCurveB = new THREE.CubicBezierCurve3( mid, midEndAnchor, endAnchor, end);
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

export function constrain(v, min, max){
	if( v < min )
		v = min;
	else
	if( v > max )
		v = max;
	return v;
}

export function getVisualizedMesh(year, countries, exportCategories, importCategories ){
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

	var linesGeo = new THREE.Geometry();
	var lineColors = [];

	// 将Geometry改为了使用BufferGeometry， 为了使Shader工作。做了较大修改
	// ，同时也适应了THREE 105版本
	// var particlesGeo = new THREE.Geometry();
	var particlesGeo = new THREE.BufferGeometry();
	var particleVertices=[], particleColors = [], particleSizes = [];
	var pOption = {
		moveIndex: [],
		nextIndex: [],
		lerpN: [],
		path: [],
		size: []
	};

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
			var lineColor = thisLineIsExport ? new THREE.Color(0xdd380c) : new THREE.Color(0x154492);

			var lastColor;
			//	grab the colors from the vertices
			for( s in set.lineGeometry.vertices ){
				const v = set.lineGeometry.vertices[s];
				lineColors.push(lineColor);
				lastColor = lineColor;
			}

			//	merge it all together
			// set.lineGeometry.merge(linesGeo);
			THREE.GeometryUtils.merge( linesGeo, set.lineGeometry );

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

				pOption.moveIndex.push(rIndex);
				var nextIndex = rIndex+1;
				if(nextIndex >= points.length )
					nextIndex = 0;
				pOption.nextIndex.push(nextIndex);
				pOption.lerpN.push(0);
				pOption.path.push(points);
				pOption.size.push(particleSize);

				particleVertices.push( particle.x, particle.y, particle.z);
				particleSizes.push(particleSize);
				particleColors.push( particleColor.r, particleColor.g, particleColor.b);
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

	linesGeo.colors = lineColors;

	//	make a final mesh out of this composite
	var splineOutline = new THREE.Line( linesGeo, new THREE.LineBasicMaterial(
		{ 	color: 0xffffff, opacity: 1.0, blending:
			THREE.AdditiveBlending, transparent:true,
			depthWrite: false, vertexColors: true,
			linewidth: 1 } )
	);

	splineOutline.renderDepth = false;


	var uniforms = {
		amplitude: { value: 1.0 },
		color:     { value: new THREE.Color( 0xffffff ) },
		texture:   { value: new THREE.TextureLoader().load("images/particleA.png" ) },
	};

	var shaderMaterial = new THREE.ShaderMaterial( {
		uniforms: 	uniforms,
		vertexShader: vertexshader,
		fragmentShader: fragmentshader,
		blending: 		THREE.AdditiveBlending,
		depthTest: 		true,
		depthWrite: 	false,
		transparent:	true
	});

	var particleGraphic = new THREE.TextureLoader().load("images/map_mask.png");
	var particleMat = new THREE.PointsMaterial( { map: particleGraphic, color: 0xffffff, size: 60,
														blending: THREE.NormalBlending, transparent:true,
														depthWrite: false, vertexColors: true,
														sizeAttenuation: true } );

	particlesGeo.addAttribute('color', new THREE.BufferAttribute(new Float32Array(particleColors), 3));
	const positionAttr = new THREE.BufferAttribute(new Float32Array(particleVertices), 3);
	positionAttr.dynamic = true;
	particlesGeo.addAttribute('position', positionAttr);
	particlesGeo.addAttribute('size', new THREE.BufferAttribute(new Float32Array(particleSizes), 1 ));
	particlesGeo.addAttribute('customColor', new THREE.BufferAttribute(new Float32Array(particleColors), 3 ));
	particlesGeo.computeVertexNormals();

	// 如果使用shaderMaterial会渲染不出来，估计是升级了three.js到84版本的问题
	var pSystem = new THREE.Points( particlesGeo, shaderMaterial );
	pSystem.dynamic = true;
	splineOutline.add( pSystem );
	pSystem.update = function() {
		const length = this.geometry.attributes.position.array.length;
		var vertices = this.geometry.attributes.position.array;
		for(var i =0, j=0 ; i< length; i=i+3, j++) {
			var path = pOption.path[j];

			pOption.lerpN[j] +=0.05;
			if(pOption.lerpN[j] > 1) {
				pOption.lerpN[j] = 0;
				pOption.moveIndex[j] = pOption.nextIndex[j];
				pOption.nextIndex[j]++;
				if( pOption.nextIndex[j] >= path.length ){
					pOption.moveIndex[j] = 0;
					pOption.nextIndex[j] = 1;
				}
			}

			var currentPoint = path[pOption.moveIndex[j]];
			var nextPoint = path[pOption.nextIndex[j]];

			// particle.copy( currentPoint );
			vertices[i] = currentPoint.x;
			vertices[i+1] = currentPoint.y;
			vertices[i+2] = currentPoint.z;

			vertices[i] += (nextPoint.x - vertices[i]) * pOption.lerpN[j];
			vertices[i+1] += (nextPoint.y - vertices[i+1]) * pOption.lerpN[j];
			vertices[i+2] += (nextPoint.z - vertices[i+2]) * pOption.lerpN[j];
		}

		this.geometry.getAttribute('position').needsUpdate= true;
	};

	splineOutline.affectedCountries = affectedCountries;


	return splineOutline;
}

export function selectVisualization( year, countries, exportCategories, importCategories ){
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
		historical: getHistoricalData(),
	};

	//	clear off the country's internally held color data we used from last highlight
	for( var i in spec.countryData ){
		var country = spec.countryData[i];
		country.exportedAmount = 0;
		country.importedAmount = 0;
		country.mapColor = 0;
	}

	//	clear markers
	for( i in spec.selectableCountries ){
		removeMarkerFromCountry( spec.selectableCountries[i]);
	}

	//	clear children
	while( spec.visualizationMesh.children.length > 0 ){
		var c = spec.visualizationMesh.children[0];
		spec.visualizationMesh.remove(c);
	}

	//	build the mesh
	console.time('getVisualizedMesh');
	var mesh = getVisualizedMesh( year, countries, exportCategories, importCategories );
	console.timeEnd('getVisualizedMesh');

	//	add it to scene graph
	spec.visualizationMesh.add( mesh );


	//	alright we got no data but at least highlight the country we've selected
	if( mesh.affectedCountries.length === 0 ){
		mesh.affectedCountries.push( cName );
	}

	for( i in mesh.affectedCountries ) {
		var countryName = mesh.affectedCountries[i];
		country = spec.countryData[countryName];
		attachMarkerToCountry(countryName, country.mapColor);
	}

	highlightCountry(mesh.affectedCountries );

	if( spec.previouslySelectedCountry !== spec.selectedCountry ){
		if( spec.selectedCountry ){
			coords.rotateT.x = spec.selectedCountry.lat * Math.PI/180;
			var targetY0 = -(spec.selectedCountry.lon - 9) * Math.PI / 180;
            var piCounter = 0;
			while(true) {
                var targetY0Neg = targetY0 - Math.PI * 2 * piCounter;
                var targetY0Pos = targetY0 + Math.PI * 2 * piCounter;
                if(Math.abs(targetY0Neg - spec.rotating.rotation.y) < Math.PI) {
					coords.rotateT.y = targetY0Neg;
                    break;
                } else if(Math.abs(targetY0Pos - spec.rotating.rotation.y) < Math.PI) {
					coords.rotateT.y = targetY0Pos;
                    break;
                }
                piCounter++;
				coords.rotateT.y = wrap(targetY0, -Math.PI, Math.PI);
			}

			coords.rotateV.x *= 0.6;
			coords.rotateV.y *= 0.6;
		}
	}

    d3Graphs.initGraphs(spec);
}

function findCode(countryName){
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

export function highlightCountry(countries ){
	var countryCodes = [];
	for( var i in countries ){
		var code = findCode(countries[i]);
		countryCodes.push(code);
	}

	var ctx = spec.lookup.canvas.getContext('2d');
	ctx.clearRect(0,0,256,1);

	var pickMask = countries.length === 0 ? 0 : 1;
	var oceanFill = 10 * pickMask;
	ctx.fillStyle = 'rgb(' + oceanFill + ',' + oceanFill + ',' + oceanFill +')';
	ctx.fillRect( 0, 0, 1, 1 );

	var selectedCountryCode = spec.selectedCountry.countryCode;

	for( i in countryCodes ){
		var countryCode = countryCodes[i];
		var colorIndex = countryColorMap[ countryCode ];

		var mapColor = spec.countryData[countries[i]].mapColor;
		var fillCSS = '#333333';
		if( countryCode === selectedCountryCode )
			fillCSS = '#eeeeee';

		ctx.fillStyle = fillCSS;
		ctx.fillRect( colorIndex, 0, 1, 1 );
	}

	spec.lookup.texture.needsUpdate = true;
}

function getHistoricalData(){
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

	return history;
}
