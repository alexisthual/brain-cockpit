import * as THREE from "three";

// Vertex shaders help draw the vertices of a given geometry.
// Here, we mainly position, orient and scale the whole figure.
const vertexShader = `
attribute vec4 orientation;
attribute vec3 offset;
attribute float scale;
varying vec4 vColor;

vec3 orientAndScale (vec3 v, vec4 q, float scale) {
  return (v + 2.0 * cross(q.xyz, cross(q.xyz, v) + q.w * v)) * scale;
}

void main()	{
  vec3 transformed = position;
  transformed = orientAndScale(transformed, orientation, scale);
  transformed += offset;
  vColor = vec4(0.1, 0.1, 0.1, 0.6);

	#include <beginnormal_vertex>
	#include <project_vertex>
}`;

// Fragment shaders help draw pixels which lie within the previously
// defined vertices. Here, we only set the color, which is outputed
// by the vertex shader.
const fragmentShader = `
varying vec4 vColor;

void main()	{
  gl_FragColor = vColor;
}`;

// Instantiate material
// Uniform variables are variables which are
// set uniformly across vertices (and fragments)
// and are accessible in both shaders
const material = new THREE.ShaderMaterial({
  name: "cones",
  uniforms: THREE.ShaderLib.phong.uniforms,
  vertexShader: vertexShader,
  fragmentShader: fragmentShader,
  lights: true,
});

// Class for displaying gradient flow
// on the fsaverage surface.
// All vectors of the gradient flow are therefore
// along edges of the fsaverage mesh.
export class GradientNorms extends THREE.Mesh {
  originalMesh: any;
  nVertices: number;

  // Initiate Gradient object with mesh and gradientNorms
  // Here, mesh is expected to have 2 attributes:
  // - position, which yields 3d vectors giving coordinates of our gradient vectors
  // - tangent, which yiels normalized 3d vectors giving the orientation of our gradient vectors
  constructor(mesh: any, gradientNorms?: number[]) {
    // Use InstancedBufferGeometry which allows for better
    // performances when drawing the same geometry several times
    // (draws all instances in one single call).
    const geometry = new THREE.InstancedBufferGeometry();
    geometry.copy(new THREE.ConeBufferGeometry(0.3, 2, 4));

    const quaternion = new THREE.Quaternion();
    const nVertices = mesh.geometry.attributes.position.count;

    // Define edge specific values
    // const colors = [];
    const offsets = mesh.geometry.getAttribute("position").array;
    const orientations = [];
    const scales = [];

    // Iterate over edges to initialise object
    for (let i = 0; i < nVertices; i++) {
      // Align arrow orientation with edge
      const vertex = new THREE.Vector3();
      vertex.fromBufferAttribute(mesh.geometry.getAttribute("tangent"), i);
      quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), vertex);
      orientations.push(quaternion.x, quaternion.y, quaternion.z, quaternion.w);

      // Set default color and scale
      // colors.push(0.1, 0.1, 0.1);
      scales.push(0.3);
    }

    // Use previously filled arrays as geometry attributes
    geometry.setAttribute(
      "offset",
      new THREE.InstancedBufferAttribute(new Float32Array(offsets), 3)
    );
    geometry.setAttribute(
      "orientation",
      new THREE.InstancedBufferAttribute(new Float32Array(orientations), 4)
    );
    // geometry.setAttribute(
    //   "color",
    //   new THREE.InstancedBufferAttribute(new Float32Array(colors), 3)
    // );
    geometry.setAttribute(
      "scale",
      new THREE.InstancedBufferAttribute(new Float32Array(scales), 1)
    );

    // Instantiate material
    // Uniform variables are variables which are
    // set uniformly across vertices (and fragments)
    // and are accessible in both shaders
    const material = new THREE.ShaderMaterial({
      name: "cones",
      uniforms: THREE.ShaderLib.phong.uniforms,
      vertexShader: vertexShader,
      fragmentShader: fragmentShader,
      lights: true,
    });

    // Instantiate the whole mesh
    super(geometry, material);
    this.nVertices = nVertices;

    this.rotateX(-Math.PI / 2);
    this.rotateZ(Math.PI / 2);
    this.receiveShadow = true;
    this.castShadow = true;
    this.originalMesh = mesh;

    // Set vectors properties according to gradientNorms
    if (gradientNorms !== undefined) {
      this.update(gradientNorms);
    }
  }

  update(gradientNorms: number[]) {
    if (gradientNorms.length !== this.nVertices) {
      console.warn(
        `gradientNorms length and number of edges don't match: ${gradientNorms.length} !== ${this.nVertices}`
      );
    }

    const quaternion = new THREE.Quaternion();
    // const colors = (this.geometry as THREE.ConeBufferGeometry).getAttribute(
    //   "color"
    // );
    const scales = (this.geometry as THREE.ConeBufferGeometry).getAttribute(
      "scale"
    );
    const orientations = (this
      .geometry as THREE.ConeBufferGeometry).getAttribute("orientation");

    gradientNorms.forEach((edge: number, index: number) => {
      const vertex = new THREE.Vector3();
      vertex.fromBufferAttribute(
        this.originalMesh.geometry.getAttribute("tangent"),
        index
      );

      // Set new orientation depending on sign of edge
      let originalVector = null;

      if (edge >= 0) {
        originalVector = new THREE.Vector3(0, 1, 0);
      } else {
        originalVector = new THREE.Vector3(0, -1, 0);
      }

      quaternion.setFromUnitVectors(originalVector, vertex);
      orientations.setXYZW(
        index,
        quaternion.x,
        quaternion.y,
        quaternion.z,
        quaternion.w
      );

      // Scale proportionally to gradient norm
      scales.setX(index, Math.abs(edge));
    });

    // ((this.geometry as THREE.InstancedBufferGeometry).attributes
    //   .color as THREE.BufferAttribute).needsUpdate = true;
    ((this.geometry as THREE.InstancedBufferGeometry).attributes
      .scale as THREE.BufferAttribute).needsUpdate = true;
    ((this.geometry as THREE.InstancedBufferGeometry).attributes
      .orientation as THREE.BufferAttribute).needsUpdate = true;
  }
}

export class Gradient extends THREE.Mesh {
  originalMesh: any;
  nVertices: number;

  constructor(mesh: any, gradient?: number[][]) {
    // Use InstancedBufferGeometry which allows for better
    // performances when drawing the same geometry several times
    // (draws all instances in one single call).
    const geometry = new THREE.InstancedBufferGeometry();
    geometry.copy(new THREE.ConeBufferGeometry(0.3, 2, 4));

    const quaternion = new THREE.Quaternion();
    const nVertices =
      mesh !== undefined ? mesh.geometry.attributes.position.count : 0;

    // Define edge specific values
    const offsets =
      mesh !== undefined ? mesh.geometry.getAttribute("position").array : [];
    const orientations = [];
    const scales = [];

    // Iterate over edges to initialise object
    for (let i = 0; i < nVertices; i++) {
      // Align arrow orientation with edge
      const vertex = new THREE.Vector3(0, 1, 0);

      quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), vertex);
      orientations.push(quaternion.x, quaternion.y, quaternion.z, quaternion.w);

      // Set default scale
      scales.push(0.3);
    }

    // Use previously filled arrays as geometry attributes
    geometry.setAttribute(
      "offset",
      new THREE.InstancedBufferAttribute(new Float32Array(offsets), 3)
    );
    geometry.setAttribute(
      "orientation",
      new THREE.InstancedBufferAttribute(new Float32Array(orientations), 4)
    );
    geometry.setAttribute(
      "scale",
      new THREE.InstancedBufferAttribute(new Float32Array(scales), 1)
    );

    // Instantiate the whole mesh
    super(geometry, material);
    this.nVertices = nVertices;

    this.rotateX(-Math.PI / 2);
    this.rotateZ(Math.PI / 2);
    this.receiveShadow = true;
    this.castShadow = true;
    this.originalMesh = mesh;

    // Set vectors properties according to gradient
    if (gradient !== undefined) {
      this.update(gradient);
    }
  }

  update(gradient: number[][]) {
    if (gradient.length !== this.nVertices) {
      console.warn(
        `gradient length and number of vertices don't match: ${gradient.length} !== ${this.nVertices}`
      );
    }

    const quaternion = new THREE.Quaternion();
    const scales = (this.geometry as THREE.ConeBufferGeometry).getAttribute(
      "scale"
    );
    const orientations = (this
      .geometry as THREE.ConeBufferGeometry).getAttribute("orientation");

    gradient.forEach((vector: number[], index: number) => {
      const v = new THREE.Vector3();

      // Store vector norm before normalizing
      const norm = Math.sqrt(vector[0] ** 2 + vector[1] ** 2 + vector[2] ** 2);
      v.set(vector[0], vector[1], vector[2]).normalize();

      // Set new orientation depending on sign of edge
      let originalVector = new THREE.Vector3(0, 1, 0);

      quaternion.setFromUnitVectors(originalVector, v);
      orientations.setXYZW(
        index,
        quaternion.x,
        quaternion.y,
        quaternion.z,
        quaternion.w
      );

      // Scale proportionally to gradient norm
      // scales.setX(index, Math.abs(norm));
      // scales.setX(index, Math.abs(0.7));
      scales.setX(index, 1000 * norm);
    });

    ((this.geometry as THREE.InstancedBufferGeometry).attributes
      .scale as THREE.BufferAttribute).needsUpdate = true;
    ((this.geometry as THREE.InstancedBufferGeometry).attributes
      .orientation as THREE.BufferAttribute).needsUpdate = true;
  }
}
