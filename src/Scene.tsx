import React, { Component } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

import { Colors } from "constants/colors";

interface ISceneProps {
  clickedVoxelCallback?: any;
  surfaceMap?: number[];
  width: number;
  height: number;
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

  constructor(props: ISceneProps) {
    super(props);
    this.state = {};
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

  componentDidMount() {
    // Listen to events
    window.addEventListener("resize", this.handleWindowResize);

    // Load exteral meshes
    const loader = new GLTFLoader();

    loader.load(
      "/assets/fsaverage_pial_left.gltf",
      (gltf: any) => {
        let object = gltf.scene.children[0] as any;

        // Set each vertex a color
        const count = object.geometry.attributes.position.count;
        object.geometry.setAttribute(
          "color",
          new THREE.BufferAttribute(new Float32Array(count * 3), 3)
        );

        const color = new THREE.Color();
        let colors = object.geometry.attributes.color;
        for (let i = 0; i < count; i++) {
          color.setRGB(
            0.5 + 0.2 * Math.random(),
            0.5 + 0.2 * Math.random(),
            0.5 + 0.2 * Math.random()
          );
          colors.setXYZ(i, color.r, color.g, color.b);
        }

        const material = new THREE.MeshPhongMaterial({
          color: Colors.LIGHT_GRAY1,
          flatShading: true,
          vertexColors: true,
          shininess: 0,
        });

        // Merge geometry and material into a mesh
        object = new THREE.Mesh(object.geometry, material);
        // Rotate mesh (in gaming, the y-axis typically goes from
        // bottom to top, whereas engineers usually use the z-axis
        // to describe this dimension).
        object.rotateX(-Math.PI / 2);
        object.rotateZ(Math.PI / 2);

        this.setupScene(object);
      },
      undefined,
      (error) => {
        console.error(error);
      }
    );
  }

  componentDidUpdate(prevProps: ISceneProps) {
    // Update object color
    if (
      this.props.surfaceMap !== prevProps.surfaceMap &&
      this.props.surfaceMap
    ) {
      if (
        this.props.surfaceMap.length ===
        this.object.geometry.attributes.position.count
      ) {
        const color = new THREE.Color();
        const count = this.object.geometry.attributes.position.count;
        const colors = this.object.geometry.attributes.color;
        const min = Math.min(...this.props.surfaceMap);
        const max = Math.max(...this.props.surfaceMap);
        const light = 0.2;
        for (let i = 0; i < count; i++) {
          const a = (this.props.surfaceMap[i] - min) / (max - min);
          color.setRGB(
            light + (1 - light) * Math.exp(-0.5 * ((a - 0.75) / 0.15) ** 2),
            light + (1 - light) * Math.exp(-0.5 * ((a - 0.5) / 0.15) ** 2),
            light + (1 - light) * Math.exp(-0.5 * ((a - 0.25) / 0.15) ** 2)
          );
          colors.setXYZ(i, color.r, color.g, color.b);
        }
        this.object.geometry.attributes.color.needsUpdate = true;
      }
    }
  }

  setupScene(object: THREE.Object3D) {
    this.width = this.container.clientWidth;
    this.height = this.container.clientHeight;

    // Initialise renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.shadowMap.enabled = true;
    renderer.gammaFactor = 2.2;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    // Initialise scene
    let scene = new THREE.Scene();
    scene.background = new THREE.Color(Colors.LIGHT_GRAY5);

    // Intialiase camera
    let camera = new THREE.PerspectiveCamera(
      60,
      this.width / this.height,
      0.25,
      1000
    );
    scene.add(camera);

    // Add lights to scene
    let spotLight = new THREE.SpotLight(Colors.WHITE, 0.85);
    spotLight.position.set(45, 50, 15);
    camera.add(spotLight);

    let ambLight = new THREE.AmbientLight(Colors.WHITE, 1);
    ambLight.position.set(5, 3, 5);
    camera.add(ambLight);

    // Add loaded object to scene
    scene.add(object);

    // Update class instance attributes
    this.renderer = renderer;
    this.scene = scene;
    this.camera = camera;
    this.object = object;
    this.spotLight = spotLight;

    this.computeBoundingBox();
  }

  computeBoundingBox() {
    // Compute BoundingBox
    const boundingBox = new THREE.Box3().setFromObject(this.object);
    const center = boundingBox.getCenter(new THREE.Vector3());
    const size = boundingBox.getSize(new THREE.Vector3());

    // Centering object
    this.object.position.x += this.object.position.x - center.x;
    this.object.position.y += this.object.position.y - center.y;
    this.object.position.z += this.object.position.z - center.z;

    // Add grid helper
    const gridHelper = new THREE.GridHelper(
      500,
      20,
      Colors.GRAY5,
      Colors.LIGHT_GRAY1
    );
    gridHelper.translateY(-70);
    this.scene.add(gridHelper);

    // Camera setup
    let offset = 1.5;
    const maxDim = Math.max(size.x, size.y, size.z);
    const fov = this.camera.fov * (Math.PI / 180);
    let cameraZ = (maxDim / 2 / Math.tan(fov / 2)) * offset;
    this.camera.position.z = center.z + cameraZ;
    const minZ = boundingBox.min.z;
    const cameraToFarEdge = cameraZ - minZ;
    this.camera.far = cameraToFarEdge * 3;
    this.camera.lookAt(center);
    this.camera.updateProjectionMatrix();

    // Orbit controls setup
    let controls = new OrbitControls(this.camera, this.renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.2;
    controls.enableZoom = true;
    controls.zoomSpeed = 0.3;
    controls.enableKeys = true;
    controls.enableRotate = true;
    controls.enablePan = true;
    controls.screenSpacePanning = true;
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
    mouse.y = -(event.clientY / this.props.height) * 2 + 1;
    raycaster.setFromCamera(mouse, this.camera);

    // Intersect raycast with object
    // and select closest voxel in intersected face
    const intersects = raycaster.intersectObject(this.object);
    let selectedVertexIndex = undefined;
    if (intersects.length > 0) {
      // Select face's vertex closest to click
      let minDistance = null;
      const face = intersects[0].face as any;
      const vertices = [face.a, face.b, face.c];

      for (let i = 0; i < vertices.length; i++) {
        const vertex = new THREE.Vector3();
        vertex.fromBufferAttribute(
          this.object.geometry.getAttribute("position"),
          vertices[i]
        );
        this.object.localToWorld(vertex);

        let distance = vertex.distanceTo(intersects[0].point);

        if (minDistance == null || distance < minDistance) {
          minDistance = distance;
          selectedVertexIndex = vertices[i];
        }
      }

      // Update color for selected voxel
      const color = new THREE.Color(Colors.RED4);
      this.object.geometry.attributes.color.setXYZ(
        selectedVertexIndex,
        color.r,
        color.g,
        color.b
      );
      this.object.geometry.attributes.color.setXYZ(
        this.selectedVertexIndex,
        0.5 + 0.2 * Math.random(),
        0.5 + 0.2 * Math.random(),
        0.5 + 0.2 * Math.random()
      );
      this.object.geometry.attributes.color.needsUpdate = true;

      // Update selectedFaceIndex
      this.selectedVertexIndex = selectedVertexIndex;
      // Callback
      this.props.clickedVoxelCallback(selectedVertexIndex);
    }
  }

  start() {
    window.addEventListener("click", this.onMouseClick, false);

    if (!this.frameId) {
      this.frameId = requestAnimationFrame(this.animate);
    }
  }

  renderScene() {
    this.renderer.render(this.scene, this.camera);
  }

  animate() {
    this.frameId = requestAnimationFrame(this.animate);
    this.controls.update();
    this.renderScene();
  }

  stop() {
    cancelAnimationFrame(this.frameId);
  }

  handleWindowResize() {
    let width = this.props.width;
    let height = this.props.height;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
  }

  componentWillUnmount() {
    this.stop();
    this.destroyContext();
  }

  destroyContext() {
    this.container.removeChild(this.renderer.domElement);
    this.renderer.forceContextLoss();
    this.renderer.context = null;
    this.renderer.domElement = null;
    this.renderer = null;
  }

  render() {
    return (
      <div
        ref={(container) => {
          this.container = container;
        }}
        style={{
          width: this.props.width,
          height: this.props.height,
          position: "absolute",
          overflow: "hidden",
        }}
      ></div>
    );
  }
}

export default Scene;
