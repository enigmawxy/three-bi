import {Scene, AmbientLight, SpotLight, PointLight, Object3D,
        Texture, NearestFilter, ShaderMaterial, Mesh, SphereGeometry
        } from '../lib/three/three.module'
import {loadGeoData} from './geopins';
import {buildDataVizGeometries} from './visualize';

import '../lib/jquery-1.7.1.min'

export function initScene(spec) {
    var scene = new Scene();
    scene.matrixAutoUpdate = false;

    scene.add(new AmbientLight(0x505050));

    var light1 = new SpotLight(0xeeeeee, 3);
    light1.position.x = 730;
    light1.position.y = 520;
    light1.position.z = 626;
    light1.castShadow = true;
    scene.add(light1);

    var light2 = new PointLight(0x222222, 14.8);
    light2.position.x = -640;
    light2.position.y = -500;
    light2.position.z = -1000;
    scene.add(light2);

    var rotating = new Object3D();
    scene.add(rotating);

    var lookupCanvas = document.createElement('canvas');
    lookupCanvas.width = 256;
    lookupCanvas.height = 1;

    var lookupTexture = new Texture(lookupCanvas);
    lookupTexture.magFilter = NearestFilter;
    lookupTexture.minFilter = NearestFilter;
    lookupTexture.needsUpdate = true;

    var indexedMapTexture = new Texture(spec.indexImage);
    indexedMapTexture.needsUpdate = true;
    indexedMapTexture.magFilter = NearestFilter;
    indexedMapTexture.minFilter = NearestFilter;

    var outlinedMapTexture = new Texture(spec.outlineImage);
    outlinedMapTexture.needsUpdate = true;

    var uniforms = {
        'mapIndex': {type: 't', value: 0, texture: indexedMapTexture},
        'lookup': {type: 't', value: 1, texture: lookupTexture},
        'outline': {type: 't', value: 2, texture: outlinedMapTexture},
        'outlineLevel': {type: 'f', value: 1},
    };

    var mapUniforms = uniforms;
    var shaderMaterial = new ShaderMaterial({
        uniforms: uniforms,
        vertexShader: document.getElementById('globeVertexShader').textContent,
        fragmentShader: document.getElementById('globeFragmentShader').textContent,
    });

    var sphere = new Mesh(new SphereGeometry(100, 40, 40), shaderMaterial);

    sphere.doubleSided = false;

    sphere.rotation.x = Math.PI;
    sphere.rotation.y = -Math.PI / 2;
    sphere.rotation.z = Math.PI;
    rotating.add(sphere);

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

    console.time('buildDataVizGeometries');
    var vizilines = buildDataVizGeometries(spec);
    console.timeEnd('buildDataVizGeometries');

    // var visualizationMesh = new Object3D();
    // rotating.add(visualizationMesh);
}