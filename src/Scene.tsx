import React, {Component} from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three-orbitcontrols-ts';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

class Scene extends Component {
  width: number;
  height: number;
  container?: any;
  renderer?: any;
  scene?: any;
  camera?: any;
  object?: any;
  spotLight?: any;
  controls?: any;
  frameId?: any;

  constructor(props: any){
    super(props);
    this.state={
    }
    this.width = 1;
    this.height = 1;
    this.start = this.start.bind(this);
    this.stop = this.stop.bind(this);
    this.animate = this.animate.bind(this);
    this.renderScene = this.renderScene.bind(this);
    this.computeBoundingBox = this.computeBoundingBox.bind(this);
    this.setupScene = this.setupScene.bind(this);
    this.destroyContext = this.destroyContext.bind(this);
    this.handleWindowResize = this.handleWindowResize.bind(this);
  }

  componentWillMount(){
    window.addEventListener('resize', this.handleWindowResize)
  }

  componentDidMount(){
    const loader = new GLTFLoader();

    loader.load('/assets/fsaverage_pial_left.gltf', (gltf: any) => {
      this.setupScene(gltf.scene);
    }, undefined, (error) => {
    	console.error(error);
    });
  }

  setupScene(object: THREE.Object3D){
    this.width = this.container.clientWidth;
    this.height = this.container.clientHeight;


    const renderer = new THREE.WebGLRenderer({antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.shadowMap.enabled = true;
    // renderer.gammaOutput = true;
    renderer.gammaFactor = 2.2
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    let scene = new THREE.Scene();
    scene.background = new THREE.Color('#F5F8FA');

    let camera = new THREE.PerspectiveCamera(60, this.width/this.height, 0.25, 1000);
    scene.add(camera);

    scene.add(object);

    this.renderer = renderer;
    this.scene = scene;
    this.camera = camera;
    this.object = object;

    let spotLight = new THREE.SpotLight(0xffffff, 0.85)
    spotLight.position.set(45, 50, 15);
    camera.add(spotLight);
    this.spotLight = spotLight;

    // let ambLight = new THREE.AmbientLight(0x333333);
    let ambLight = new THREE.AmbientLight(0xffffff, 1);
    ambLight.position.set(5, 3, 5);
    this.camera.add(ambLight);

    this.computeBoundingBox();
  }

  computeBoundingBox(){
    let offset = 1.60;

    const boundingBox = new THREE.Box3().setFromObject(this.object);
    const center = boundingBox.getCenter(new THREE.Vector3());
    const size = boundingBox.getSize(new THREE.Vector3());
    this.object.position.x += (this.object.position.x - center.x);
    this.object.position.y += (this.object.position.y - center.y);
    this.object.position.z += (this.object.position.z - center.z);

    const maxDim = Math.max( size.x, size.y, size.z );
    const fov = this.camera.fov * ( Math.PI / 180 );
    let cameraZ = maxDim / 2 / Math.tan( fov / 2 );
    cameraZ *= offset;
    this.camera.position.z = center.z + cameraZ;
    const minZ = boundingBox.min.z;
    const cameraToFarEdge = ( minZ < 0 ) ? -minZ + cameraZ : cameraZ - minZ;

    this.camera.far = cameraToFarEdge * 3;
    this.camera.lookAt(center);
    this.camera.updateProjectionMatrix();

    let controls = new OrbitControls(this.camera, this.renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.25;
    controls.enableZoom = true;
    controls.zoomSpeed = 0.1;
    controls.enableKeys = false;
    // controls.screenSpacePanning = false;
    controls.enableRotate = true;
    controls.autoRotate = true;
    controls.dampingFactor = 1;
    controls.autoRotateSpeed = 1.2;
    controls.enablePan = false;
    controls.target.set(center.x, center.y, center.z);
    controls.update();

    this.controls = controls;
    this.renderer.setSize(this.width, this.height);
    this.container.appendChild(this.renderer.domElement);
    this.start();
  }

  start(){
    if (!this.frameId) {
      this.frameId = requestAnimationFrame(this.animate)
    }
  }

  renderScene(){
    this.renderer.render(this.scene, this.camera)
  }

  animate() {
    this.frameId = requestAnimationFrame(this.animate);
    this.controls.update();
    this.renderScene();
  }

  stop() {
    cancelAnimationFrame(this.frameId);
  }

  handleWindowResize(){
    let width = window.innerWidth;
    let height = window.innerHeight;
    this.camera.aspect = width/height;
    this.camera.updateProjectionMatrix();
  }

  componentWillUnmount(){
    this.stop();
    this.destroyContext();
  }

  destroyContext(){
    this.container.removeChild(this.renderer.domElement);
    this.renderer.forceContextLoss();
    this.renderer.context = null;
    this.renderer.domElement = null;
    this.renderer = null;
  }

  render(){
    const width = '100%';
    const height = '100%';
    return(
      <div
        ref={(container) => {this.container = container}}
        style={{width: width, height: height, position: 'absolute', overflow: 'hidden'}}
      >
      </div>
    )
  }

}

export default Scene;
