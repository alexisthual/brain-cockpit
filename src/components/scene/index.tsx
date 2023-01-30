import { Colors } from "@blueprintjs/core";
import ParentSize from "@visx/responsive/lib/components/ParentSize";
import chroma from "chroma-js";
import deepEqual from "fast-deep-equal";
import { Component } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import * as BufferGeometryUtils from "three/examples/jsm/utils/BufferGeometryUtils.js";

import {
  colormaps,
  getMax,
  getMin,
  HemisphereSide,
  MeshSupport,
  MeshType,
  View,
} from "constants/index";
import { Hotspots, IHotspot } from "./hotspots";
import { CustomGradient } from "./gradient";
import "./style.scss";

interface SceneProps {
  clickedVoxelCallback?: any;
  surfaceMap?: number[];
  gradient?: number[][];
  width: number;
  height: number;
  voxelIndex?: number;
  wireframe?: boolean;
  markerCoordinates?: number[][];
  markerIndices?: number[];
  meshType: MeshType;
  meshSupport: MeshSupport;
  meshUrls?: string[];
  subjectLabel?: string;
  hemi: HemisphereSide;
  uniqueKey?: string;
  lowThresholdMin?: number;
  lowThresholdMax?: number;
  highThresholdMin?: number;
  highThresholdMax?: number;
  hotspots?: IHotspot[];
  colormap: chroma.Scale;
  showGridHelper?: boolean;
}

interface HotspotCoordinates {
  voxelX?: number;
  voxelY?: number;
  voxelPosition?: THREE.Vector3;
}

interface IState {
  voxelX?: number;
  voxelY?: number;
  voxelPosition?: THREE.Vector3;
  hotspots?: { [i: number]: HotspotCoordinates };
}

class Scene extends Component<SceneProps, IState> {
  container?: any;
  renderer?: any;
  scene?: any;
  camera?: any;
  mesh?: THREE.Mesh;
  meshGeometry?: THREE.BufferGeometry;
  meshMaterial?: THREE.MeshStandardMaterial;
  spotLight?: any;
  controls?: any;
  frameId?: any;
  markerSpheres?: THREE.Mesh[];
  gridHelper?: THREE.GridHelper;
  uniqueKey: string;
  mouseDownX?: number;
  mouseDownY?: number;
  gradient: any;
  edgesMesh?: THREE.Mesh;

  static defaultProps = {
    meshType: MeshType.PIAL,
    meshSupport: MeshSupport.FSAVERAGE5,
    hemi: HemisphereSide.LEFT,
    colormap: colormaps["sequential"],
  };

  constructor(props: SceneProps) {
    super(props);
    this.state = {};

    this.uniqueKey =
      this.props.uniqueKey ?? Math.trunc(1e6 * Math.random()).toString();
    this.start = this.start.bind(this);
    this.animate = this.animate.bind(this);
    this.renderScene = this.renderScene.bind(this);
    this.focusOnMainObject = this.focusOnMainObject.bind(this);
    this.setupScene = this.setupScene.bind(this);
    this.handleWindowResize = this.handleWindowResize.bind(this);
    this.onMouseDown = this.onMouseDown.bind(this);
    this.onMouseUp = this.onMouseUp.bind(this);
    this.updateHotspots = this.updateHotspots.bind(this);
    this.switchView = this.switchView.bind(this);
    this.removeAndDisposeMarkers = this.removeAndDisposeMarkers.bind(this);
    this.projectCoordinatesOnMesh = this.projectCoordinatesOnMesh.bind(this);
  }

  // Turn THREE.js loader into Promise
  static load(url: string): Promise<any> {
    const loader = new GLTFLoader();

    return new Promise((resolve, reject) => {
      loader.load(
        `${process.env.REACT_APP_API_HTTP_PROTOCOL}://${process.env.REACT_APP_API_URL}/${url}`,
        (data) => resolve(data),
        undefined,
        reject
      );
    });
  }

  // Load BufferGeometry object from backend
  static async loadGeometry(
    meshUrls?: string[]
  ): Promise<THREE.BufferGeometry | undefined> {
    if (meshUrls !== undefined) {
      const promises = meshUrls.map((url) => Scene.load(url));

      // Merge them in a common Mesh
      return Promise.all(promises).then((values: any) => {
        const mergedBufferGeometries = BufferGeometryUtils.mergeBufferGeometries(
          values.map((value: any) => value.scene.children[0].geometry)
        );

        return mergedBufferGeometries;
      });
    }
  }

  static async loadGradientMesh(
    meshSupport: MeshSupport = MeshSupport.FSAVERAGE5,
    meshType: MeshType = MeshType.PIAL,
    hemisphereSide: HemisphereSide = HemisphereSide.LEFT
  ) {
    switch (hemisphereSide) {
      case HemisphereSide.LEFT:
        return Scene.load(
          `datasets/ibc/mesh/${meshSupport}/edges_${meshType}_left.gltf`
        ).then((gltf: any) => {
          return gltf.scene.children[0] as any;
        });
      case HemisphereSide.RIGHT:
        return Scene.load(
          `datasets/ibc/mesh/${meshSupport}/edges_${meshType}_right.gltf`
        ).then((gltf: any) => {
          return gltf.scene.children[0] as any;
        });
      case HemisphereSide.BOTH:
        // Load both meshes
        const loadLeft = Scene.load(
          `datasets/ibc/mesh/${meshSupport}/edges_${meshType}_left.gltf`
        );
        const loadRight = Scene.load(
          `datasets/ibc/mesh/${meshSupport}/edges_${meshType}_right.gltf`
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

  // Static method to build mesh from geometry and surface map.
  // In case surface map is given, simply apply it to mesh.
  // Otherwise, generate and apply random material.
  static initialiseMesh(
    geometry: THREE.BufferGeometry,
    wireframe: boolean = false,
    surfaceMap: number[] | undefined = undefined,
    colormap: chroma.Scale | undefined = undefined,
    lowThresholdMin: number | undefined = undefined,
    lowThresholdMax: number | undefined = undefined,
    highThresholdMin: number | undefined = undefined,
    highThresholdMax: number | undefined = undefined
  ): {
    geometry: THREE.BufferGeometry;
    material: THREE.MeshStandardMaterial;
  } {
    // Initialise new geometry attribute to store color
    if (geometry.attributes.color === undefined) {
      const count = geometry.attributes.position.count;
      geometry.setAttribute(
        "color",
        new THREE.BufferAttribute(new Float32Array(count * 3), 3)
      );
    }

    if (
      surfaceMap !== undefined &&
      surfaceMap !== null &&
      colormap !== undefined
    ) {
      geometry = Scene.coloriseFromSurfaceMap(
        geometry,
        surfaceMap,
        colormap,
        lowThresholdMin,
        lowThresholdMax,
        highThresholdMin,
        highThresholdMax
      );
    } else {
      geometry = Scene.coloriseFromRandomMap(geometry);
    }

    // Initialise material
    const material = new THREE.MeshStandardMaterial({
      // color: "rgb(207, 207, 207)",
      flatShading: true,
      vertexColors: true,
      roughness: 1.0,
      metalness: 0.4,
      wireframe: wireframe,
    });

    // Rotate geometry (in gaming, the y-axis typically goes from
    // bottom to top, whereas engineers usually use the z-axis
    // to describe this dimension).
    geometry.rotateX(-Math.PI / 2);
    geometry.rotateY(Math.PI / 2);

    return { geometry, material };
  }

  // Generates random values for each vertex of a geometry object.
  static coloriseFromRandomMap(
    geometry: THREE.BufferGeometry
  ): THREE.BufferGeometry {
    const color = new THREE.Color();
    const count = geometry.attributes.position.count;
    const colors = geometry.attributes.color;

    for (let i = 0; i < count; i++) {
      color.setRGB(
        0.5 + 0.1 * Math.random(),
        0.5 + 0.1 * Math.random(),
        0.5 + 0.1 * Math.random()
      );
      colors.setXYZ(i, color.r, color.g, color.b);
    }

    return geometry;
  }

  // Applies given surface map onto a geometry object.
  static coloriseFromSurfaceMap(
    geometry: THREE.BufferGeometry,
    surfaceMap: number[],
    colormap: chroma.Scale,
    lowThresholdMin: number | undefined,
    lowThresholdMax: number | undefined,
    highThresholdMin: number | undefined,
    highThresholdMax: number | undefined
  ): THREE.BufferGeometry {
    const color = new THREE.Color();
    const count = geometry.attributes.position.count;
    const colors = geometry.attributes.color;
    const min = getMin(surfaceMap);
    const max = getMax(surfaceMap);

    for (let i = 0; i < count; i++) {
      // Get and scale voxelIntensity
      let voxelIntensity = (surfaceMap[i] - min) / (max - min);

      if (lowThresholdMin !== undefined && highThresholdMax !== undefined) {
        // In case thresholds are defined, voxelIntensity should be scaled
        // according to them
        voxelIntensity =
          (surfaceMap[i] - lowThresholdMin) /
          (highThresholdMax - lowThresholdMin);
      }

      if (
        (lowThresholdMin !== undefined && surfaceMap[i] <= lowThresholdMin) ||
        (lowThresholdMin !== undefined &&
          lowThresholdMax !== undefined &&
          lowThresholdMin <= surfaceMap[i] &&
          surfaceMap[i] <= lowThresholdMax) ||
        (highThresholdMin !== undefined &&
          highThresholdMax !== undefined &&
          highThresholdMin <= surfaceMap[i] &&
          surfaceMap[i] <= highThresholdMax) ||
        (highThresholdMax !== undefined && highThresholdMax <= surfaceMap[i]) ||
        (lowThresholdMin === undefined &&
          lowThresholdMax === undefined &&
          highThresholdMin === undefined &&
          highThresholdMax === undefined)
      ) {
        color.setRGB(
          colormap(voxelIntensity).get("rgb.r") / 255,
          colormap(voxelIntensity).get("rgb.g") / 255,
          colormap(voxelIntensity).get("rgb.b") / 255
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
    (colors as THREE.BufferAttribute).needsUpdate = true;

    return geometry;
  }

  async componentDidMount() {
    // Listen to events
    window.addEventListener("resize", this.handleWindowResize);

    // Load exteral geometry
    const geometry = await Scene.loadGeometry(this.props.meshUrls);

    if (geometry !== undefined) {
      const { geometry: colorizedGeometry, material } = Scene.initialiseMesh(
        geometry,
        this.props.wireframe,
        this.props.surfaceMap,
        this.props.colormap,
        this.props.lowThresholdMin,
        this.props.lowThresholdMax,
        this.props.highThresholdMin,
        this.props.highThresholdMax
      );

      this.meshGeometry = colorizedGeometry;
      this.meshMaterial = material;
    }

    this.mesh = new THREE.Mesh(this.meshGeometry, this.meshMaterial);

    await this.setupScene();
  }

  async componentDidUpdate(prevProps: SceneProps) {
    // Update height and width
    if (
      prevProps.width !== this.props.width ||
      prevProps.height !== this.props.height
    ) {
      this.handleWindowResize();
    }

    // Update displayed mesh when meshType or hemi change
    if (
      this.scene !== undefined &&
      (!deepEqual(prevProps.meshUrls, this.props.meshUrls) ||
        prevProps.meshSupport !== this.props.meshSupport ||
        prevProps.meshType !== this.props.meshType ||
        prevProps.subjectLabel !== this.props.subjectLabel ||
        prevProps.hemi !== this.props.hemi)
    ) {
      let newGeometry = (await Scene.loadGeometry(this.props.meshUrls)) as any;

      const { geometry, material } = Scene.initialiseMesh(
        newGeometry,
        this.props.wireframe,
        this.props.surfaceMap,
        this.props.colormap,
        this.props.lowThresholdMin,
        this.props.lowThresholdMax,
        this.props.highThresholdMin,
        this.props.highThresholdMax
      );
      this.meshGeometry = geometry;
      this.meshMaterial = material;

      // Remove the old mesh (this.object) and add a fresh one.
      this.scene.remove(this.mesh);
      this.mesh = new THREE.Mesh(this.meshGeometry, this.meshMaterial);
      this.scene.add(this.mesh);

      // Update camera and controls focus
      this.focusOnMainObject();
    }

    // Update hotspot if voxelIndex changed
    if (prevProps.voxelIndex !== this.props.voxelIndex) {
      this.updateHotspots();
    }

    // Update object color to display surface map
    if (
      this.props.surfaceMap !== undefined &&
      this.props.surfaceMap !== null &&
      (this.props.surfaceMap !== prevProps.surfaceMap ||
        prevProps.hemi !== this.props.hemi ||
        this.props.lowThresholdMin !== prevProps.lowThresholdMin ||
        this.props.lowThresholdMax !== prevProps.lowThresholdMax ||
        this.props.highThresholdMin !== prevProps.highThresholdMin ||
        this.props.highThresholdMax !== prevProps.highThresholdMax)
    ) {
      if (
        this.mesh !== undefined &&
        this.props.surfaceMap.length ===
          // this.mesh.geometry.attributes.position.count
          this.meshGeometry?.attributes.position.count
      ) {
        this.meshGeometry = Scene.coloriseFromSurfaceMap(
          this.meshGeometry,
          this.props.surfaceMap,
          this.props.colormap,
          this.props.lowThresholdMin,
          this.props.lowThresholdMax,
          this.props.highThresholdMin,
          this.props.highThresholdMax
        );
      } else if (this.props.surfaceMap.length > 0) {
        console.warn(
          `surfacemap and current mesh have different lengths: ${this.props.surfaceMap.length} !== ${this.meshGeometry?.attributes.position.count}`
        );
      }
    }

    // Update object wireframe
    if (
      this.mesh !== undefined &&
      this.meshMaterial !== undefined &&
      this.props.wireframe !== prevProps.wireframe
    ) {
      // this.mesh.material.wireframe = this.props.wireframe;
      this.meshMaterial.wireframe = this.props.wireframe || false;
    }

    // Update markers when coordinates or indices change
    if (
      this.scene !== undefined &&
      this.meshGeometry !== undefined &&
      (this.props.markerCoordinates !== prevProps.markerCoordinates ||
        this.props.markerIndices !== prevProps.markerIndices)
    ) {
      // Dispose and overwrite current markers
      this.removeAndDisposeMarkers();
      this.markerSpheres = [];

      // Concatenate coordinates
      const coordinates_list = [] as number[][];
      // Compute x,y,z coordinates from voxel indices
      if (this.props.markerIndices && this.props.markerIndices.length >= 0) {
        for (let i = 0; i < this.props.markerIndices.length; i++) {
          const vertex = new THREE.Vector3();
          vertex.fromBufferAttribute(
            // this.mesh?.geometry.getAttribute("position"),
            this.meshGeometry.getAttribute("position") as THREE.BufferAttribute,
            this.props.markerIndices[i]
          );
          this.mesh?.localToWorld(vertex);
          coordinates_list.push([vertex.x, vertex.y, vertex.z]);
        }
      }
      // Add coordinates given in props
      if (
        this.props.markerCoordinates &&
        this.props.markerCoordinates.length >= 0
      ) {
        for (let i = 0; i < this.props.markerCoordinates.length; i++) {
          const vertex = new THREE.Vector3(...this.props.markerCoordinates[i]);
          this.mesh?.localToWorld(vertex);
          coordinates_list.push([vertex.x, vertex.y, vertex.z]);
        }
      }

      // Iterate through marker coordinates to add markers to scene
      if (coordinates_list.length >= 0) {
        for (let i = 0; i < coordinates_list.length; i++) {
          const coordinates = coordinates_list[i];
          const vertex = new THREE.Vector3(
            coordinates[0],
            coordinates[1],
            coordinates[2]
          );

          // Add sphere marker with located at given coordinates
          const geometry = new THREE.SphereGeometry(2);
          const material = new THREE.MeshBasicMaterial({
            color: Colors.VERMILION5,
          });
          const marker = new THREE.Mesh(geometry, material);
          marker.position.copy(vertex);
          this.scene.add(marker);
          this.mesh?.localToWorld(vertex);

          this.markerSpheres.push(marker);
        }
      }
    }

    // Show or hide grid helper
    if (this.gridHelper !== undefined) {
      this.gridHelper.visible = this.props.showGridHelper ?? true;
    }

    // Update gradient
    if (
      this.scene !== undefined &&
      this.props.gradient !== prevProps.gradient
    ) {
      if (this.props.gradient !== undefined) {
        const gradient = new CustomGradient(this.mesh, this.props.gradient);
        this.scene.add(gradient);
        this.gradient = gradient;
      } else if (this.gradient !== undefined) {
        this.scene.remove(this.gradient);
      }
    }
  }

  // Initialises scene, controls, camera, etc.
  // If it exists, adds mesh to scene.
  async setupScene() {
    // Initialise renderer
    const renderer = new THREE.WebGLRenderer({ antialias: false, alpha: true });
    renderer.setPixelRatio(window.devicePixelRatio);
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

    let ambLight = new THREE.AmbientLight(Colors.WHITE, 1.2);
    ambLight.position.set(5, 3, 5);
    scene.add(ambLight);

    // Add main mesh to scene
    if (this.mesh !== undefined) {
      scene.add(this.mesh);
    }

    // Add gradients to scene
    if (this.props.gradient !== undefined) {
      const gradient = new CustomGradient(this.mesh, this.props.gradient);
      scene.add(gradient);
      this.gradient = gradient;
    }

    // Add grid helper
    const gridHelper = new THREE.GridHelper(
      500,
      20,
      new THREE.Color(Colors.GRAY5),
      new THREE.Color(Colors.LIGHT_GRAY1)
    );
    gridHelper.translateY(-70);
    gridHelper.visible = this.props.showGridHelper ?? true;
    scene.add(gridHelper);

    // Orbit controls setup
    let controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.2;
    controls.enableZoom = true;
    controls.zoomSpeed = 0.3;
    // controls.enableKeys = true;
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
    this.gridHelper = gridHelper;
    this.controls = controls;

    this.focusOnMainObject();

    this.start();
  }

  start() {
    this.container.addEventListener("pointerdown", this.onMouseDown, false);
    this.container.addEventListener("pointerup", this.onMouseUp, false);
    window.addEventListener("keydown", this.switchView, false);

    if (!this.frameId) {
      this.frameId = requestAnimationFrame(this.animate);
    }
  }

  animate() {
    this.frameId = requestAnimationFrame(this.animate);
    this.controls.update();
    this.renderScene();
  }

  renderScene() {
    this.updateHotspots();
    this.renderer.render(this.scene, this.camera);
  }

  // This functions focuses controls and camera
  // on the main object
  focusOnMainObject(view: View = View.LATERAL) {
    if (this.mesh !== undefined) {
      // Compute BoundingBox
      const boundingBox = new THREE.Box3().setFromObject(this.mesh);
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
      this.mesh !== undefined &&
      this.meshGeometry !== undefined &&
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
      const intersects = raycaster.intersectObject(this.mesh);
      let selectedVertexIndex = undefined;
      if (intersects.length > 0) {
        // Select face's vertex closest to click
        let minDistance = null;
        const face = intersects[0].face as any;
        const vertices = [face.a, face.b, face.c];

        for (let i = 0; i < vertices.length; i++) {
          const vertex = new THREE.Vector3();
          vertex.fromBufferAttribute(
            // this.mesh.geometry.getAttribute("position"),
            this.meshGeometry.getAttribute("position") as THREE.BufferAttribute,
            vertices[i]
          );
          this.mesh?.localToWorld(vertex);

          let distance = vertex.distanceTo(intersects[0].point);

          if (minDistance == null || distance < minDistance) {
            minDistance = distance;
            selectedVertexIndex = vertices[i];
          }
        }

        // Callback
        this.props.clickedVoxelCallback(selectedVertexIndex, event);
      }
    }
  }

  switchView(event: any) {
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

  projectCoordinatesOnMesh(voxelIndex: number) {
    const vertex = new THREE.Vector3();
    if (this.mesh !== undefined && this.meshGeometry !== undefined) {
      vertex.fromBufferAttribute(
        this.meshGeometry.getAttribute("position") as THREE.BufferAttribute,
        voxelIndex
      );
      this.mesh.localToWorld(vertex);
    }

    const projectedVertex = new THREE.Vector3().copy(vertex);
    if (this.renderer !== undefined) {
      const canvas = this.renderer.domElement;
      projectedVertex.project(this.camera);
      projectedVertex.x = Math.round(
        (0.5 + projectedVertex.x / 2) * (canvas.width / window.devicePixelRatio)
      );
      projectedVertex.y = Math.round(
        (0.5 - projectedVertex.y / 2) *
          (canvas.height / window.devicePixelRatio)
      );
    }

    return [projectedVertex, vertex];
  }

  updateHotspots() {
    if (this.props.voxelIndex) {
      // Compute selected voxel's position
      const [projectedVertex, vertex] = this.projectCoordinatesOnMesh(
        this.props.voxelIndex
      );

      if (
        projectedVertex.x !== this.state.voxelX ||
        projectedVertex.y !== this.state.voxelY
      ) {
        this.setState((state) => {
          return {
            ...state,
            voxelX: projectedVertex.x,
            voxelY: projectedVertex.y,
            voxelPosition: new THREE.Vector3().copy(vertex),
          };
        });
      }
    }

    // Update each hotspot
    this.props.hotspots?.forEach((hotspot, index) => {
      if (hotspot.voxelIndex !== undefined) {
        const [projectedVertex, vertex] = this.projectCoordinatesOnMesh(
          hotspot.voxelIndex
        );

        if (
          projectedVertex.x !== this.state.voxelX ||
          projectedVertex.y !== this.state.voxelY
        ) {
          this.setState((state) => {
            return {
              ...state,
              hotspots: {
                ...state.hotspots,
                [index]: {
                  voxelX: projectedVertex.x,
                  voxelY: projectedVertex.y,
                  voxelPosition: new THREE.Vector3().copy(vertex),
                },
              },
            };
          });
        }
      }
    });
  }

  handleWindowResize() {
    if (this.camera && this.renderer) {
      this.camera.aspect = this.props.width / this.props.height;
      this.camera.updateProjectionMatrix();

      this.renderer.setSize(this.props.width, this.props.height);
      this.renderer.render(this.scene, this.camera);
    }
  }

  removeAndDisposeMarkers() {
    if (
      this.scene !== undefined &&
      this.markerSpheres !== undefined &&
      this.markerSpheres.length > 0
    ) {
      for (let i = 0; i < this.markerSpheres.length; i++) {
        const marker = this.markerSpheres[i];
        // Remove marker
        this.scene.remove(marker);
        // Dispose attributes
        marker.geometry.dispose();
        if (marker.material instanceof THREE.Material) {
          marker.material.dispose();
        } else {
          marker.material.forEach((element) => {
            element.dispose();
          });
        }
      }
    }
  }

  componentWillUnmount() {
    // Remove events
    window.removeEventListener("pointerdown", this.onMouseDown);
    window.removeEventListener("pointerup", this.onMouseUp);
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

    this.meshGeometry?.dispose();
    this.meshMaterial?.dispose();

    this.removeAndDisposeMarkers();
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
        <ParentSize
          debounceTime={10}
          style={{
            height: "100%",
            width: "100%",
            position: "absolute",
            pointerEvents: "none",
          }}
        >
          {({ width: parentWidth, height: parentHeight }) => (
            <Hotspots
              hotspots={[
                ...(this.props.voxelIndex !== undefined
                  ? [
                      {
                        id: "selected_voxel",
                        xPointer: this.state.voxelX,
                        yPointer: this.state.voxelY,
                        header: `Voxel ${this.props.voxelIndex}`,
                        description: this.state.voxelPosition
                          ? `(${this.state.voxelPosition.x.toFixed(
                              1
                            )}, ${this.state.voxelPosition.y.toFixed(
                              1
                            )}, ${this.state.voxelPosition.z.toFixed(1)})`
                          : undefined,
                      },
                    ]
                  : []),
                ...(this.props.hotspots
                  ? this.props.hotspots.map((hotspot: IHotspot) => {
                      if (hotspot.voxelIndex !== undefined) {
                        const [
                          projectedVertex,
                          vertex,
                        ] = this.projectCoordinatesOnMesh(hotspot.voxelIndex);
                        return {
                          ...hotspot,
                          xPointer: projectedVertex.x,
                          yPointer: projectedVertex.y,
                          description: vertex
                            ? `(${vertex.x.toFixed(1)}, ${vertex.y.toFixed(
                                1
                              )}, ${vertex.z.toFixed(1)})`
                            : undefined,
                        };
                      }

                      return hotspot;
                    })
                  : []),
              ]}
              height={parentHeight}
              width={parentWidth}
            />
          )}
        </ParentSize>
      </div>
    );
  }
}

export default Scene;
