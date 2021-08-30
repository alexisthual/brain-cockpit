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

// Class for displaying gradient computed on a given surface.
// All vectors of the gradient are therefore
// along edges of the fsaverage mesh.
export class MeshGradient extends THREE.Mesh {
  originalMesh: any;
  nVertices: number;

  // Initiate MeshGradient object with mesh and gradient
  // Here, mesh is expected to have 2 attributes:
  // - position, which yields 3d vectors giving coordinates of our gradient vectors
  // - tangent, which yiels normalized 3d vectors giving the orientation of our gradient vectors
  constructor(mesh: any, gradientNorm?: number[]) {
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

    // Set vectors properties according to gradientNorm
    if (gradientNorm !== undefined) {
      this.update(gradientNorm);
    }
  }

  update(gradientNorm: number[]) {
    if (gradientNorm.length !== this.nVertices) {
      console.warn(
        `gradientNorm length and number of edges don't match: ${gradientNorm.length} !== ${this.nVertices}`
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

    gradientNorm.forEach((edge: number, index: number) => {
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

      // Scale proportionally to gradientNorm norm
      // scales.setX(index, 30 * Math.abs(edge));
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

// Class for displaying a field of vectors.
// The center of each vector is given by a mesh.
// Ex: compute average vector from gradient computed on a mesh
// and display these vectors centered at the mesh vertices
export class CustomGradient extends THREE.Mesh {
  originalMesh: any;
  nVertices: number;

  constructor(mesh: any, vectors?: number[][]) {
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
    if (vectors !== undefined && vectors !== null) {
      this.update(vectors);
    }
  }

  update(vectors: number[][]) {
    if (vectors.length !== this.nVertices) {
      console.warn(
        `vectors length and number of vertices don't match: ${vectors.length} !== ${this.nVertices}`
      );
    }

    const quaternion = new THREE.Quaternion();
    const scales = (this.geometry as THREE.ConeBufferGeometry).getAttribute(
      "scale"
    );
    const orientations = (this
      .geometry as THREE.ConeBufferGeometry).getAttribute("orientation");

    vectors.forEach((vector: number[], index: number) => {
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
      scales.setX(index, norm);
    });

    ((this.geometry as THREE.InstancedBufferGeometry).attributes
      .scale as THREE.BufferAttribute).needsUpdate = true;
    ((this.geometry as THREE.InstancedBufferGeometry).attributes
      .orientation as THREE.BufferAttribute).needsUpdate = true;
  }
}
