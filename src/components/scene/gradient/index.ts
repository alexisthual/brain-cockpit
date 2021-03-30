import * as THREE from "three";

// Vertex shaders help draw the vertices of a given geometry.
// Here, we mainly position, orient and scale the whole figure.
const vertexShader = `
attribute vec3 color;
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
  vColor = vec4(color, 0.6);

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

export default class Gradient extends THREE.Mesh {
  originalMesh: any;

  // Initiate Gradient object with mesh and gradientMap
  // Here, mesh is expected to have 2 attributes:
  // - position, which yields 3d vectors giving coordinates of our gradient vectors
  // - tangent, which yiels normalized 3d vectors giving the orientation of our gradient vectors
  constructor(mesh: any, gradientMap?: number[]) {
    // Use InstancedBufferGeometry which allows for better
    // performances when drawing the same geometry several times
    // (draws all instances in one single call).
    const geometry = new THREE.InstancedBufferGeometry();
    geometry.copy(new THREE.ConeBufferGeometry(0.3, 2, 4));

    const quaternion = new THREE.Quaternion();
    const nEdges = mesh.geometry.attributes.position.count;

    // Define edge specific values
    const colors = [];
    const offsets = mesh.geometry.getAttribute("position").array;
    const orientations = [];
    const scales = [];

    // Iterate over edges to initialise object
    for (let i = 0; i < nEdges; i++) {
      // Align arrow orientation with edge
      const vertex = new THREE.Vector3();
      vertex.fromBufferAttribute(mesh.geometry.getAttribute("tangent"), i);
      quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), vertex);
      orientations.push(quaternion.x, quaternion.y, quaternion.z, quaternion.w);

      // Set default color and scale
      colors.push(0.4, 0.4, 0.4);
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
      "color",
      new THREE.InstancedBufferAttribute(new Float32Array(colors), 3)
    );
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

    this.rotateX(-Math.PI / 2);
    this.rotateZ(Math.PI / 2);
    this.receiveShadow = true;
    this.castShadow = true;
    this.originalMesh = mesh;

    // Set vectors properties according to gradientMap
    if (gradientMap !== undefined) {
      this.update(gradientMap);
    }
  }

  update(gradientMap: number[]) {
    const nEdges =
      this.originalMesh !== undefined
        ? this.originalMesh.geometry.attributes.position.count
        : null;
    if (gradientMap.length !== nEdges) {
      console.warn(
        `gradientMap length and number of edges don't match: ${gradientMap.length} !== ${nEdges}`
      );
    } else {
      console.log(gradientMap.length, nEdges);
    }

    const quaternion = new THREE.Quaternion();
    const colors = (this.geometry as THREE.ConeBufferGeometry).getAttribute(
      "color"
    );
    const scales = (this.geometry as THREE.ConeBufferGeometry).getAttribute(
      "scale"
    );
    const orientations = (this
      .geometry as THREE.ConeBufferGeometry).getAttribute("orientation");

    // const maximum = Math.max(...gradientMap);
    // const minimum = Math.min(...gradientMap);
    const mean = gradientMap.reduce((a, b) => a + b, 0) / gradientMap.length;
    const std = Math.sqrt(
      gradientMap.reduce((a, b) => (b - mean) ** 2 + a, 0) / gradientMap.length
    );
    console.log(mean, std);

    gradientMap.forEach((edge: number, index: number) => {
      const vertex = new THREE.Vector3();
      vertex.fromBufferAttribute(
        this.originalMesh.geometry.getAttribute("tangent"),
        index
      );

      if (index % 10000 === 0) {
        console.log(vertex, edge);
      }

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

      // Set new color depending on intensity of edge
      colors.setXYZ(index, 0.5, 0.5, 0.5);

      scales.setX(index, Math.abs(edge) * 20);
    });

    ((this.geometry as THREE.InstancedBufferGeometry).attributes
      .color as THREE.BufferAttribute).needsUpdate = true;
    ((this.geometry as THREE.InstancedBufferGeometry).attributes
      .scale as THREE.BufferAttribute).needsUpdate = true;
    ((this.geometry as THREE.InstancedBufferGeometry).attributes
      .orientation as THREE.BufferAttribute).needsUpdate = true;
  }
}
