import {dataObject as spec} from './main';
import * as THREE from 'three';
import {loadGeoData} from './geopins';
import '../lib/jquery-1.7.1.min'
import {buildDataVizGeometries, selectVisualization, highlightCountry} from './visualize';
import {TWEEN} from "../lib/Tween";
import {onDocumentMouseMove, onDocumentResize, onDocumentMouseDown,
        onDocumentMouseUp, onMouseWheel, onClick, onKeyDown, coords, onWindowResize} from './mousekeyboard';
import {markers} from './markers';

var camera, scene, renderer, controls, rotating;
//	where in html to hold all our things
var glContainer = document.getElementById( 'glContainer' );
var masterContainer = document.getElementById('visualization');
var controllers = {
    speed: 			3,
    multiplier: 	0.5,
    backgroundColor:"#000000",
    zoom: 			1,
    spin: 			0,
    transitionTime: 2000,
};

const globeVertexShader=`
        varying vec3 vNormal;
        varying vec2 vUv;
        void main() {
            gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0);
            vNormal = normalize( normalMatrix * normal );
            vUv = uv;
        }`;

const globeFragmentShader=` 
        uniform sampler2D mapIndex;
        uniform sampler2D lookup;
        uniform sampler2D outline;
        uniform float outlineLevel;
        varying vec3 vNormal;
        varying vec2 vUv;
        void main() {

            vec4 mapColor = texture2D( mapIndex, vUv );
            float indexedColor = mapColor.x;
            vec2 lookupUV = vec2( indexedColor, 0. );
            vec4 lookupColor = texture2D( lookup, lookupUV );
            float mask = lookupColor.x + (1.-outlineLevel) * indexedColor;
            mask = clamp(mask,0.,1.);
            float outlineColor = texture2D( outline, vUv ).x * outlineLevel;
            float diffuse = mask + outlineColor;
            gl_FragColor = vec4( vec3(diffuse), 1.  );
        }`;

export function initScene() {
    scene = new THREE.Scene();
    scene.matrixAutoUpdate = false;

    /* 灯光*/
    {
        scene.add(new THREE.AmbientLight(0x505050));

        var light1 = new THREE.SpotLight(0xeeeeee, 3);
        light1.position.x = 730;
        light1.position.y = 520;
        light1.position.z = 626;
        light1.castShadow = true;
        scene.add(light1);

        var light2 = new THREE.PointLight(0x222222, 14.8);
        light2.position.x = -640;
        light2.position.y = -500;
        light2.position.z = -1000;
        scene.add(light2);
    }
    /*
        The scene graph looks like this:

                     Scene
                       |
                     Rotating(3D)
        /------------- | --------\
        |                        |
        Sphere(Earth)          visualizationMesh(3D)
                                 |
                               splineOutline(curve)
                                 |
                               pSystem(particles)

	*/
    rotating = new THREE.Object3D();
    scene.add(rotating);

    var lookupCanvas = document.createElement('canvas');
    lookupCanvas.width = 256;
    lookupCanvas.height = 1;
    spec.lookup.canvas = lookupCanvas;

    var lookupTexture = new THREE.Texture(lookupCanvas);
    lookupTexture.magFilter = THREE.NearestFilter;
    lookupTexture.minFilter = THREE.NearestFilter;
    lookupTexture.needsUpdate = true;
    spec.lookup.texture = lookupTexture;

    var uniforms = {
        mapIndex: { value: new THREE.TextureLoader().load('images/map_indexed.png')  },
        lookup: { value: lookupTexture },
        outline: { value: new THREE.TextureLoader().load('images/map_outline.png') },
        outlineLevel: {value: 1 },
    };
    spec.mapUniforms = uniforms;

    var shaderMaterial = new THREE.ShaderMaterial({
        uniforms: uniforms,
        vertexShader: globeVertexShader,
        fragmentShader: globeFragmentShader,
    });
    var sphere = new THREE.Mesh(new THREE.SphereGeometry(100, 40, 40), shaderMaterial);
    sphere.doubleSided = false;
    sphere.rotation.x = Math.PI;
    sphere.rotation.y = -Math.PI / 2;
    sphere.rotation.z = Math.PI;
    rotating.add(sphere);

    camera = new THREE.PerspectiveCamera( 12, window.innerWidth / window.innerHeight, 1, 20000 );
    camera.position.z = 1400;
    camera.position.y = 0;
    camera.lookAt(0,0,0);

    for (var i in spec.timeBins) {
        var bin = spec.timeBins[i].data;
        for (var s in bin) {
            var set = bin[s];

            var exporterName = set.e.toUpperCase();
            var importerName = set.i.toUpperCase();

            //	let's track a list of actual countries listed in this data set
            //	this is actually really slow... consider re-doing this with a map
            if ($.inArray(exporterName, spec.selectableCountries) < 0) {
                spec.selectableCountries.push(exporterName);
            }

            if ($.inArray(importerName, spec.selectableCountries) < 0)
                spec.selectableCountries.push(importerName);
        }
    }

    // load geo data (country lat lons in this case)
    console.time('loadGeoData');
    loadGeoData(spec);
    console.timeEnd('loadGeoData');

    // 创建贝塞尔曲线
    console.time('buildDataVizGeometries');
    buildDataVizGeometries();
    console.timeEnd('buildDataVizGeometries');

    var visualizationMesh = new THREE.Object3D();
    rotating.add(visualizationMesh);

    spec.rotating = rotating;
    spec.visualizationMesh = visualizationMesh;

    selectVisualization('2010', ['CHINA'], ['Military Weapons','Civilian Weapons', 'Ammunition'], ['Military Weapons','Civilian Weapons', 'Ammunition'] );

    //	-----------------------------------------------------------------------------
    //	Setup our renderer
    renderer = new THREE.WebGLRenderer({antialias:false});
    renderer.setSize( window.innerWidth, window.innerHeight );
    renderer.autoClear = false;
    renderer.sortObjects = false;
    renderer.generateMipmaps = false;

    glContainer.appendChild( renderer.domElement );

    //	-----------------------------------------------------------------------------
    //	Event listeners
    document.addEventListener( 'mousemove', onDocumentMouseMove, true );
    document.addEventListener( 'windowResize', onDocumentResize, false );

    document.addEventListener( 'mousedown', onDocumentMouseDown, true );
    document.addEventListener( 'mouseup', onDocumentMouseUp, false );

    masterContainer.addEventListener( 'click', onClick, true );
    masterContainer.addEventListener( 'mousewheel', onMouseWheel, false );

    //	firefox
    masterContainer.addEventListener( 'DOMMouseScroll', function(e){
        var evt=window.event || e; //equalize event object
        onMouseWheel(evt);
    }, false );

    document.addEventListener( 'keydown', onKeyDown, false);

    window.addEventListener( 'resize', onWindowResize, false );

    //	-----------------------------------------------------------------------------
    //	Setup our camera

    scene.add( camera );
    spec.camera = camera;
    spec.render = renderer;
}

export function animate() {
    if( coords.rotateT.x !== undefined && coords.rotateT.y !== undefined ){

        coords.rotateV.x += (coords.rotateT.x - coords.rotate.x) * 0.012;
        coords.rotateV.y += (coords.rotateT.y - coords.rotate.y) * 0.012;

        if( Math.abs(coords.rotateT.x - coords.rotate.x) < 0.1 &&
            Math.abs(coords.rotateT.y - coords.rotate.y) < 0.1 ){
            coords.rotateT.x = undefined;
            coords.rotateT.y = undefined;
        }
    }

    coords.rotate.x += coords.rotateV.x;
    coords.rotate.y += coords.rotateV.y;

    coords.rotateV.x *= 0.98;
    coords.rotateV.y *= 0.98;

    if(coords.dragging || coords.rotateT.x !== undefined ){
        coords.rotateV.x *= 0.6;
        coords.rotateV.y *= 0.6;
    }

    coords.rotate.y += controllers.spin * 0.01;

    //	constrain the pivot up/down to the poles
    //	force a bit of bounce back action when hitting the poles
    var rotateXMax = 90 * Math.PI/180;
    if(coords.rotate.x < -rotateXMax) {
        coords.rotate.x = -rotateXMax;
        coords.rotateV.x *= -0.95;
    }
    if(coords.rotate.x > rotateXMax) {
        coords.rotate.x = rotateXMax;
        coords.rotateV.x *= -0.95;
    }

    TWEEN.update();

    rotating.rotation.x = coords.rotate.x;
    rotating.rotation.y = coords.rotate.y;

    rotating.traverse( ( child ) => {
        if(child.update !== undefined)
            child.update();
    } );

    render();

    requestAnimationFrame( animate );

    for( var i in markers ){
        var marker = markers[i];
        marker.update();
    }
}

function render() {
    renderer.clear();
    renderer.render( scene, camera );
}

export function getPickColor(){
    var affectedCountries = undefined;
    if( spec.visualizationMesh.children[0] !== undefined )
        affectedCountries = spec.visualizationMesh.children[0].affectedCountries;

    highlightCountry([]);
    rotating.remove(spec.visualizationMesh);
    spec.mapUniforms['outlineLevel'].value = 0;
    spec.lookup.texture.needsUpdate = true;

    renderer.autoClear = false;
    renderer.autoClearColor = false;
    renderer.autoClearDepth = false;
    renderer.autoClearStencil = false;
    // renderer.preserve

    renderer.clear();
    renderer.render(scene,camera);

    var gl = renderer.context;
    gl.preserveDrawingBuffer = true;

    var mx = ( coords.mouse.x + renderer.context.canvas.width/2 );
    var my = ( -coords.mouse.y + renderer.context.canvas.height/2 );
    mx = Math.floor( mx );
    my = Math.floor( my );

    var buf = new Uint8Array( 4 );

    gl.readPixels( mx, my, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, buf );

    renderer.autoClear = true;
    renderer.autoClearColor = true;
    renderer.autoClearDepth = true;
    renderer.autoClearStencil = true;

    gl.preserveDrawingBuffer = false;

    spec.mapUniforms['outlineLevel'].value = 1;
    rotating.add(spec.visualizationMesh);

    if( affectedCountries !== undefined ){
        highlightCountry(affectedCountries);
    }

    return buf[0];
}
