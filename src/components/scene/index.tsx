import { Colors } from "@blueprintjs/core";
import React, { Component } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { BufferGeometryUtils } from "three/examples/jsm/utils/BufferGeometryUtils.js";

import { HemisphereSide, MeshType, View } from "constants/index";
import "./style.scss";

interface ISceneProps {
  clickedVoxelCallback?: any;
  surfaceMap?: number[];
  width: number;
  height: number;
  voxelIndex?: number;
  wireframe?: boolean;
  regressedCoordinates?: number[];
  meshType: MeshType;
  hemi: HemisphereSide;
  uniqueKey?: string;
  lowThresholdMin?: number;
  lowThresholdMax?: number;
  highThresholdMin?: number;
  highThresholdMax?: number;
}

class Scene extends Component<ISceneProps, {}> {
  container?: any;
  renderer?: any;
  scene?: any;
  camera?: any;
  object?: any;
  spotLight?: any;
  controls?: any;
  frameId?: any;
  voxelPosition: THREE.Vector3;
  hotspot: any;
  regressedSphere?: THREE.Mesh;
  gridHelper?: THREE.GridHelper;
  uniqueKey: string;
  mouseDownX?: number;
  mouseDownY?: number;

  static defaultProps = {
    meshType: MeshType.PIAL,
    hemi: HemisphereSide.LEFT,
  };

  constructor(props: ISceneProps) {
    super(props);
    this.state = {};

    this.uniqueKey =
      this.props.uniqueKey ?? Math.trunc(1e6 * Math.random()).toString();
    this.voxelPosition = new THREE.Vector3();
    this.start = this.start.bind(this);
    this.animate = this.animate.bind(this);
    this.renderScene = this.renderScene.bind(this);
    this.focusOnMainObject = this.focusOnMainObject.bind(this);
    this.setupScene = this.setupScene.bind(this);
    this.handleWindowResize = this.handleWindowResize.bind(this);
    this.onMouseDown = this.onMouseDown.bind(this);
    this.onMouseUp = this.onMouseUp.bind(this);
    this.updateHotspot = this.updateHotspot.bind(this);
    this.switchView = this.switchView.bind(this);
  }

  // Turn THREE.js loader into Promise
  static load(url: string) {
    const loader = new GLTFLoader();

    return new Promise((resolve, reject) => {
      loader.load(url, (data) => resolve(data), undefined, reject);
    });
  }

  static loadMesh(
    meshType: MeshType = MeshType.PIAL,
    hemisphereSide: HemisphereSide = HemisphereSide.LEFT
  ) {
    switch (hemisphereSide) {
      case HemisphereSide.LEFT:
        return Scene.load(`/assets/fsaverage_${meshType}_left.gltf`).then(
          (gltf: any) => {
            return gltf.scene.children[0] as any;
          }
        );
      case HemisphereSide.RIGHT:
        return Scene.load(`/assets/fsaverage_${meshType}_right.gltf`).then(
          (gltf: any) => {
            return gltf.scene.children[0] as any;
          }
        );
      case HemisphereSide.BOTH:
        // Load both meshes
        const loadLeft = Scene.load(`/assets/fsaverage_${meshType}_left.gltf`);
        const loadRight = Scene.load(
          `/assets/fsaverage_${meshType}_right.gltf`
        );

        // Merge them in a common Mesh
        return Promise.all([loadLeft, loadRight]).then((values: any) => {
          const mergedBufferGeometries = BufferGeometryUtils.mergeBufferGeometries(
            [
              values[0].scene.children[0].geometry,
              values[1].scene.children[0].geometry,
            ]
          );

          const mesh = new THREE.Mesh(mergedBufferGeometries);

          return mesh;
        });
    }
  }

  static initialiseMesh(
    object: any,
    wireframe: boolean = false,
    surfaceMap: number[] | undefined = undefined,
    lowThresholdMin: number | undefined = undefined,
    lowThresholdMax: number | undefined = undefined,
    highThresholdMin: number | undefined = undefined,
    highThresholdMax: number | undefined = undefined
  ) {
    // Set a random color to each vertex
    if (object.geometry.attributes.color === undefined) {
      const count = object.geometry.attributes.position.count;
      object.geometry.setAttribute(
        "color",
        new THREE.BufferAttribute(new Float32Array(count * 3), 3)
      );
    }
    if (surfaceMap !== undefined) {
      object = Scene.coloriseFromSurfaceMap(
        object,
        surfaceMap,
        lowThresholdMin,
        lowThresholdMax,
        highThresholdMin,
        highThresholdMax
      );
    } else {
      object = Scene.coloriseFromRandomMap(object);
    }

    const material = new THREE.MeshPhongMaterial({
      color: Colors.LIGHT_GRAY1,
      flatShading: true,
      vertexColors: true,
      shininess: 0,
      wireframe: wireframe,
      wireframeLinewidth: 0.3,
    });

    // Create mesh
    const mesh = new THREE.Mesh(object.geometry, material);

    // Rotate mesh (in gaming, the y-axis typically goes from
    // bottom to top, whereas engineers usually use the z-axis
    // to describe this dimension).
    mesh.rotateX(-Math.PI / 2);
    mesh.rotateZ(Math.PI / 2);

    return mesh;
  }

  static coloriseFromRandomMap(object: any) {
    const color = new THREE.Color();
    const count = object.geometry.attributes.position.count;
    const colors = object.geometry.attributes.color;

    for (let i = 0; i < count; i++) {
      color.setRGB(
        0.5 + 0.2 * Math.random(),
        0.5 + 0.2 * Math.random(),
        0.5 + 0.2 * Math.random()
      );
      colors.setXYZ(i, color.r, color.g, color.b);
    }

    return object;
  }

  static coloriseFromSurfaceMap(
    object: any,
    surfaceMap: number[],
    lowThresholdMin: number | undefined,
    lowThresholdMax: number | undefined,
    highThresholdMin: number | undefined,
    highThresholdMax: number | undefined
  ) {
    const color = new THREE.Color();
    const count = object.geometry.attributes.position.count;
    const colors = object.geometry.attributes.color;
    const min = Math.min(...surfaceMap);
    const max = Math.max(...surfaceMap);
    const light = 0.2;
    for (let i = 0; i < count; i++) {
      const a = (surfaceMap[i] - min) / (max - min);
      if (
        (lowThresholdMin !== undefined &&
          lowThresholdMin <= surfaceMap[i] &&
          lowThresholdMax !== undefined &&
          lowThresholdMax >= surfaceMap[i]) ||
        (highThresholdMin !== undefined &&
          highThresholdMin <= surfaceMap[i] &&
          highThresholdMax !== undefined &&
          highThresholdMax >= surfaceMap[i]) ||
        (lowThresholdMin === undefined &&
          lowThresholdMax === undefined &&
          highThresholdMin === undefined &&
          highThresholdMax === undefined)
      ) {
        color.setRGB(
          light + (1 - light) * Math.exp(-0.5 * ((a - 0.75) / 0.15) ** 2),
          light + (1 - light) * Math.exp(-0.5 * ((a - 0.5) / 0.15) ** 2),
          light + (1 - light) * Math.exp(-0.5 * ((a - 0.25) / 0.15) ** 2)
        );
      } else {
        color.setRGB(
          0.57 + 0.08 * Math.random(),
          0.57 + 0.08 * Math.random(),
          0.57 + 0.08 * Math.random()
        );
      }
      colors.setXYZ(i, color.r, color.g, color.b);
    }
    object.geometry.attributes.color.needsUpdate = true;

    return object;
  }

  async componentDidMount() {
    // Listen to events
    window.addEventListener("resize", this.handleWindowResize);

    // Load exteral meshes
    let object = await Scene.loadMesh(this.props.meshType, this.props.hemi);
    object = Scene.initialiseMesh(
      object,
      this.props.wireframe,
      this.props.surfaceMap,
      this.props.lowThresholdMin,
      this.props.lowThresholdMax,
      this.props.highThresholdMin,
      this.props.highThresholdMax
    );
    this.setupScene(object as THREE.Object3D);
  }

  async componentDidUpdate(prevProps: ISceneProps) {
    // Update height and width
    if (
      prevProps.width !== this.props.width ||
      prevProps.height !== this.props.height
    ) {
      this.handleWindowResize();
    }

    // Update displayed mesh when meshType or hemi change
    if (
      prevProps.meshType !== this.props.meshType ||
      prevProps.hemi !== this.props.hemi
    ) {
      let newObject = (await Scene.loadMesh(
        this.props.meshType,
        this.props.hemi
      )) as any;

      // In case hemi changes, we remove the old object
      // and add a fresh one.
      // Otherwise (when only meshType changed), we simply
      // update the current object's geometry.
      if (prevProps.hemi !== this.props.hemi) {
        this.scene.remove(this.object);
        this.object = Scene.initialiseMesh(newObject, this.props.wireframe);
        this.scene.add(this.object);
      } else {
        this.object.geometry.setAttribute(
          "position",
          newObject.geometry.attributes.position
        );
      }

      // Update camera and controls focus
      this.focusOnMainObject();
    }

    // Update hotspot if voxelIndex changed
    if (prevProps.voxelIndex !== this.props.voxelIndex) {
      this.updateHotspot();
    }

    // Update object color to display surface map
    if (
      this.props.surfaceMap !== undefined &&
      (this.props.surfaceMap !== prevProps.surfaceMap ||
        prevProps.hemi !== this.props.hemi ||
        this.props.lowThresholdMin !== prevProps.lowThresholdMin ||
        this.props.lowThresholdMax !== prevProps.lowThresholdMax ||
        this.props.highThresholdMin !== prevProps.highThresholdMin ||
        this.props.highThresholdMax !== prevProps.highThresholdMax)
    ) {
      if (
        this.object !== undefined &&
        this.props.surfaceMap.length ===
          this.object.geometry.attributes.position.count
      ) {
        this.object = Scene.coloriseFromSurfaceMap(
          this.object,
          this.props.surfaceMap,
          this.props.lowThresholdMin,
          this.props.lowThresholdMax,
          this.props.highThresholdMin,
          this.props.highThresholdMax
        );
      } else if (this.props.surfaceMap.length > 0) {
        console.warn("surfacemap and current mesh have different lengths");
      }
    }

    // Update object wireframe
    if (this.props.wireframe !== prevProps.wireframe) {
      this.object.material.wireframe = this.props.wireframe;
    }

    // Update regressedSphere coordinates
    if (this.props.regressedCoordinates !== prevProps.regressedCoordinates) {
      if (
        this.regressedSphere &&
        this.props.regressedCoordinates &&
        this.props.regressedCoordinates.length >= 3
      ) {
        const vertex = new THREE.Vector3(
          this.props.regressedCoordinates[0],
          this.props.regressedCoordinates[1],
          this.props.regressedCoordinates[2]
        );
        this.object.localToWorld(vertex);
        this.regressedSphere.visible = true;
        this.regressedSphere.position.copy(vertex);
      } else if (
        this.regressedSphere &&
        this.props.regressedCoordinates === undefined
      ) {
        this.regressedSphere.visible = false;
      }
    }
  }

  setupScene(object: THREE.Object3D) {
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
      this.props.width / this.props.height,
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

    // Add hotspot to track selected vertex
    this.hotspot = document.getElementById(`hotspot-${this.uniqueKey}`);

    // Add sphere with coordinates coming from a regression model
    const geometry = new THREE.SphereGeometry(2);
    const material = new THREE.MeshBasicMaterial({ color: Colors.VERMILION5 });
    const sphere = new THREE.Mesh(geometry, material);
    sphere.visible = false;
    scene.add(sphere);

    // Add main object to scene
    scene.add(object);

    // Add grid helper
    const gridHelper = new THREE.GridHelper(
      500,
      20,
      Colors.GRAY5,
      Colors.LIGHT_GRAY1
    );
    gridHelper.translateY(-70);
    scene.add(gridHelper);

    // Orbit controls setup
    let controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.2;
    controls.enableZoom = true;
    controls.zoomSpeed = 0.3;
    controls.enableKeys = true;
    controls.enableRotate = true;
    controls.enablePan = true;
    controls.screenSpacePanning = true;
    controls.update();

    renderer.setSize(this.props.width, this.props.height);
    this.container.appendChild(renderer.domElement);

    // Update class instance attributes
    this.renderer = renderer;
    this.scene = scene;
    this.camera = camera;
    this.object = object;
    this.spotLight = spotLight;
    this.regressedSphere = sphere;
    this.gridHelper = gridHelper;
    this.controls = controls;

    this.focusOnMainObject();

    this.start();
  }

  // This functions focuses controls and camera
  // on the main object
  focusOnMainObject(view: View = View.LATERAL) {
    // Compute BoundingBox
    const boundingBox = new THREE.Box3().setFromObject(this.object);
    const center = boundingBox.getCenter(new THREE.Vector3());
    const size = boundingBox.getSize(new THREE.Vector3());

    // Camera setup
    let offset = 1.5;
    const maxDim = Math.max(size.x, size.y, size.z);
    const fov = this.camera.fov * (Math.PI / 180);
    const cameraOffset = (maxDim / 2 / Math.tan(fov / 2)) * offset;
    switch (view) {
      case View.LATERAL:
        this.camera.position.x = center.x;
        this.camera.position.y = center.y;
        this.camera.position.z = center.z + cameraOffset;
        break;
      case View.MEDIAL:
        this.camera.position.x = center.x;
        this.camera.position.y = center.y;
        this.camera.position.z = center.z - cameraOffset;
        break;
      case View.FRONTAL:
        this.camera.position.x = center.x - cameraOffset;
        this.camera.position.y = center.y;
        this.camera.position.z = center.z;
        break;
      case View.DORSAL:
        this.camera.position.x = center.x + cameraOffset;
        this.camera.position.y = center.y;
        this.camera.position.z = center.z;
        break;
      default:
        this.camera.position.x = center.x;
        this.camera.position.y = center.y;
        this.camera.position.z = center.z + cameraOffset;
        break;
    }
    const min = boundingBox.min.z;
    const cameraToFarEdge = cameraOffset - min;
    this.camera.far = cameraToFarEdge * 3;
    this.camera.lookAt(center);
    this.camera.updateProjectionMatrix();

    // Set controls target
    this.controls.target.set(center.x, center.y, center.z);
  }

  // This function allows to distinct click from drag events.
  // One stores mousedown coordinates and will check if they
  // match mouseup coordinates.
  onMouseDown(event: MouseEvent) {
    this.mouseDownX = event.clientX;
    this.mouseDownY = event.clientY;
  }

  onMouseUp(event: MouseEvent) {
    if (
      event.clientX === this.mouseDownX &&
      event.clientY === this.mouseDownY
    ) {
      // Compute renderer offset on the page
      const rect = this.renderer.domElement.getBoundingClientRect();
      const mouse = new THREE.Vector2();
      // Deduce mouse coordinates
      mouse.x = ((event.clientX - rect.left) / this.props.width) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / this.props.height) * 2 + 1;

      const raycaster = new THREE.Raycaster();
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

        // Callback
        this.props.clickedVoxelCallback(selectedVertexIndex);
      }
    }
  }

  switchView(event: any) {
    console.log(this.container.matches(":hover"));
    // E
    if (
      (event.isComposing || event.keyCode === 69) &&
      this.container.matches(":hover")
    ) {
      this.focusOnMainObject(View.FRONTAL);
    }
    // S
    if (
      (event.isComposing || event.keyCode === 83) &&
      this.container.matches(":hover")
    ) {
      this.focusOnMainObject(View.LATERAL);
    }
    // D
    if (
      (event.isComposing || event.keyCode === 68) &&
      this.container.matches(":hover")
    ) {
      this.focusOnMainObject(View.DORSAL);
    }
    // F
    if (
      (event.isComposing || event.keyCode === 70) &&
      this.container.matches(":hover")
    ) {
      this.focusOnMainObject(View.MEDIAL);
    }
  }

  start() {
    this.container.addEventListener("pointerdown", this.onMouseDown, false);
    this.container.addEventListener("pointerup", this.onMouseUp, false);
    window.addEventListener("keydown", this.switchView, false);

    if (!this.frameId) {
      this.frameId = requestAnimationFrame(this.animate);
    }
  }

  renderScene() {
    this.renderer.render(this.scene, this.camera);
    this.updateHotspot();
  }

  updateHotspot() {
    if (this.props.voxelIndex) {
      // Compute selected voxel's position
      const vertex = new THREE.Vector3();
      vertex.fromBufferAttribute(
        this.object.geometry.getAttribute("position"),
        this.props.voxelIndex
      );
      this.object.localToWorld(vertex);
      this.voxelPosition.copy(vertex);

      // Update opacity
      if (this.props.voxelIndex !== undefined) {
        const meshDistance = this.camera.position.distanceTo(
          this.object.position
        );
        const spriteDistance = this.camera.position.distanceTo(
          this.voxelPosition
        );
        this.hotspot.style.opacity = spriteDistance > meshDistance ? 0.25 : 1;
      } else {
        this.hotspot.style.opacity = 0;
      }

      // Update hotspot position
      const vector = this.voxelPosition.clone();
      const canvas = this.renderer.domElement;
      vector.project(this.camera);
      vector.x = Math.round(
        (0.5 + vector.x / 2) * (canvas.width / window.devicePixelRatio)
      );
      vector.y = Math.round(
        (0.5 - vector.y / 2) * (canvas.height / window.devicePixelRatio)
      );
      this.hotspot.style.top = `${vector.y}px`;
      this.hotspot.style.left = `${vector.x}px`;
    }
  }

  animate() {
    this.frameId = requestAnimationFrame(this.animate);
    this.controls.update();
    this.renderScene();
  }

  handleWindowResize() {
    if (this.camera && this.renderer) {
      this.camera.aspect = this.props.width / this.props.height;
      this.camera.updateProjectionMatrix();

      this.renderer.setSize(this.props.width, this.props.height);
      this.renderer.render(this.scene, this.camera);
    }
  }

  componentWillUnmount() {
    // Remove events
    window.removeEventListener("resize", this.handleWindowResize);
    window.removeEventListener("keydown", this.switchView);

    // Remove Three.js related objects
    cancelAnimationFrame(this.frameId);
    this.container.removeChild(this.renderer.domElement);
    if (this.gridHelper) {
      this.gridHelper.geometry.dispose();
      if (this.gridHelper.material instanceof THREE.Material) {
        this.gridHelper.material.dispose();
      } else {
        this.gridHelper.material.forEach((element) => {
          element.dispose();
        });
      }
    }
    this.object.geometry.dispose();
    this.object.material.dispose();
    if (this.regressedSphere) {
      this.regressedSphere.geometry.dispose();
      if (this.regressedSphere.material instanceof THREE.Material) {
        this.regressedSphere.material.dispose();
      } else {
        this.regressedSphere.material.forEach((element) => {
          element.dispose();
        });
      }
    }
    this.controls.dispose();
    this.renderer.dispose();
    this.renderer.forceContextLoss();
    this.renderer.info.reset();
    // Check remaining objects with
    // console.log(this.renderer.info);
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
      >
        <div
          id={`hotspot-${this.uniqueKey}`}
          className="hotspot"
          style={{
            visibility:
              this.props.voxelIndex !== undefined ? "visible" : "hidden",
          }}
        >
          <p>
            <strong>Voxel {this.props.voxelIndex}</strong>
          </p>
          <p>
            ({this.voxelPosition.x.toFixed(1)},{" "}
            {this.voxelPosition.y.toFixed(1)}, {this.voxelPosition.z.toFixed(1)}
            )
          </p>
        </div>
      </div>
    );
  }
}

export default Scene;
