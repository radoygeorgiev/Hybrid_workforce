import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
const status=document.getElementById('status'),host=document.getElementById('host');
try {
 const response=await fetch('./catalogue.json');if(!response.ok)throw Error('Catalogue is not available.');
 const catalogue=await response.json(),record=catalogue.records.find(r=>r.id===new URLSearchParams(location.search).get('id'));
 if(!record?.model)throw Error('This record has no local model file.');
 const renderer=new THREE.WebGLRenderer({antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.setClearColor('#e8eeec');renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.12;host.append(renderer.domElement);
 renderer.domElement.setAttribute('aria-label','Drag to rotate. Scroll to zoom.');
 const scene=new THREE.Scene();scene.add(new THREE.HemisphereLight(0xffffff,0x758a82,2.2));
 for(const [position,intensity] of [[[8,14,10],2.3],[[-8,6,-10],1.4]]){const light=new THREE.DirectionalLight(0xffffff,intensity);light.position.set(...position);scene.add(light);}
 const camera=new THREE.PerspectiveCamera(40,1,.01,5000),controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=true;
 const resize=()=>{const w=host.clientWidth,h=host.clientHeight;renderer.setSize(w,h);camera.aspect=w/h;camera.updateProjectionMatrix();};new ResizeObserver(resize).observe(host);resize();
 const gltf=await new GLTFLoader().loadAsync('../../'+record.model);scene.add(gltf.scene);
 const box=new THREE.Box3().setFromObject(gltf.scene),center=box.getCenter(new THREE.Vector3()),size=box.getSize(new THREE.Vector3()),span=Math.max(size.x,size.y,size.z,.1);
 function fit(){camera.position.copy(center).add(new THREE.Vector3(span*1.1,span*.8,span*1.3));camera.near=span/10000;camera.far=span*100;camera.updateProjectionMatrix();controls.target.copy(center);controls.update();}
 fit();document.getElementById('fit').onclick=fit;
 document.getElementById('rotate').onclick=event=>{controls.autoRotate=!controls.autoRotate;event.target.setAttribute('aria-pressed',String(controls.autoRotate));};
 const mixer=new THREE.AnimationMixer(gltf.scene);let playing=false;
 if(gltf.animations.length){document.getElementById('play').disabled=false;gltf.animations.forEach(clip=>mixer.clipAction(clip).play());document.getElementById('play').onclick=event=>{playing=!playing;event.target.textContent=playing?'Pause animation':'Play animation';};}
 status.textContent=record.name+' · visual demonstration';
 const clock=new THREE.Clock();function frame(){requestAnimationFrame(frame);const dt=Math.min(clock.getDelta(),.1);if(playing)mixer.update(dt);controls.update();renderer.render(scene,camera);}frame();
 addEventListener('pagehide',()=>{renderer.dispose();controls.dispose();},{once:true});
} catch(error) {
 status.textContent='3D preview unavailable';const panel=document.getElementById('error');panel.hidden=false;panel.textContent=error.message+' Start the local app server to view the assets. You can also download the GLB from the record.';
}
