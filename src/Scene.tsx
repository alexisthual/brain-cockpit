import React, {Component} from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three-orbitcontrols-ts';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

interface ISceneProps {
  clickedVoxelCallback?: any
  width: number
  height: number
}

class Scene extends Component<ISceneProps, {}> {
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
  selectedVertexIndex?: number;

  constructor(props: ISceneProps){
    super(props);
    this.state={}
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
    this.onMouseClick = this.onMouseClick.bind(this);
  }

  componentWillMount(){
    window.addEventListener('resize', this.handleWindowResize)
  }

  componentDidMount(){
    const loader = new GLTFLoader();

    loader.load('/assets/fsaverage_pial_left.gltf', (gltf: any) => {
      let object = gltf.scene.children[0] as any
      console.log(object)

      const count = object.geometry.attributes.position.count
      const positions = object.geometry.attributes.position
      const radius = 200
      object.geometry.addAttribute('color', new THREE.BufferAttribute(new Float32Array(count * 3), 3))

      const color = new THREE.Color();
      let colors = object.geometry.attributes.color;
      for(let i = 0; i < count; i ++) {
        color.setRGB(0.5 + 0.2 * Math.random(), 0.5 + 0.2 * Math.random(), 0.5 + 0.2 * Math.random())
        colors.setXYZ(i, color.r, color.g, color.b);
      }

      const material = new THREE.MeshPhongMaterial({
        color: 0xdddddd,
        flatShading: true,
        vertexColors: true,
        shininess: 0
      });

      object = new THREE.Mesh(object.geometry, material)

      this.setupScene(object);
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
    // controls.autoRotate = true;
    controls.dampingFactor = 1;
    // controls.autoRotateSpeed = 1.2;
    controls.enablePan = false;
    controls.target.set(center.x, center.y, center.z);
    controls.update();

    this.controls = controls;
    this.renderer.setSize(this.width, this.height);
    this.container.appendChild(this.renderer.domElement);
    this.start();
  }

  onMouseClick(event: MouseEvent) {
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    mouse.x = (event.clientX / this.props.width) * 2 - 1;
    mouse.y = - (event.clientY / this.props.height) * 2 + 1;
    raycaster.setFromCamera(mouse, this.camera);

    const intersects = raycaster.intersectObject(this.object);
    let selectedVertexIndex = undefined;
    if(intersects.length > 0) {
      // Select face's vertex closest to click
      let minDistance = null;
      const face = intersects[0].face as any
      const vertices = [
        face.a,
        face.b,
        face.c
      ]

      for(let i = 0; i < vertices.length; i++) {
        const vertex = new THREE.Vector3();
        vertex.fromBufferAttribute(this.object.geometry.getAttribute('position'), vertices[i]);
        this.object.localToWorld(vertex);

        let distance = vertex.distanceTo(intersects[0].point);

        if(minDistance == null || distance < minDistance) {
          minDistance = distance;
          selectedVertexIndex = vertices[i];
        }
      }

      // Update color for selected voxel
      const color = new THREE.Color("#9E2B0E");
      this.object.geometry.attributes.color.setXYZ(selectedVertexIndex, color.r, color.g, color.b);
      this.object.geometry.attributes.color.setXYZ(this.selectedVertexIndex, 0.5 + 0.2 * Math.random(), 0.5 + 0.2 * Math.random(), 0.5 + 0.2 * Math.random());
      this.object.geometry.attributes.color.needsUpdate = true;

      // Update selectedFaceIndex
      this.selectedVertexIndex = selectedVertexIndex;
      // Callback
      this.props.clickedVoxelCallback(selectedVertexIndex)
    }

  }

  start() {
    window.addEventListener('click', this.onMouseClick, false);

    if (!this.frameId) {
      this.frameId = requestAnimationFrame(this.animate)
    }
  }

  renderScene() {
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
    // let width = window.innerWidth;
    // let height = window.innerHeight;
    let width = this.props.width;
    let height = this.props.height;
    this.camera.aspect = width / height;
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
    return(
      <div
        ref={(container) => {this.container = container}}
        style={{
          width: this.props.width,
          height: this.props.height,
          position: 'absolute',
          overflow: 'hidden'
        }}
      >
      </div>
    )
  }

}

export default Scene;
