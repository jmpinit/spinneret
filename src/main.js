const THREE = require('three');
const { EventEmitter } = require('events');

const get = require('./get');
const { DistanceConstraint, PositionConstraint } = require('./constraints');
const resources = require('./resources');

const BAR_LENGTH = 10;

const resourceTracker = new EventEmitter();

// FIXME remove
let oscillator;
let originalTarget;
let cloth;

class Point {
  constructor(x, y, z) {
    this.vector = new THREE.Vector3(x, y, z);
    this.previousVector = new THREE.Vector3(x, y, z);
  }

  update(deltaTime) {
    const deltaSquared = deltaTime ** 2;

    // const force = new THREE.Vector3(0, 0, 10); // Wind !
    const force = new THREE.Vector3(0, 0, 0); // Wind !

    const k = 0.99999; // Damping constant
    const newX = this.vector.x + (k * (this.vector.x - this.previousVector.x)) +
      ((force.x / 2) * deltaSquared);
    const newY = this.vector.y + (k * (this.vector.y - this.previousVector.y)) +
      ((force.y / 2) * deltaSquared);
    const newZ = this.vector.z + (k * (this.vector.z - this.previousVector.z)) +
      ((force.z / 2) * deltaSquared);

    this.previousVector.copy(this.vector);
    this.vector.set(newX, newY, newZ);
  }
}

class Web {
  constructor() {
    // How many times to iterate towards a solution to the constraints
    this.PHYSICS_ITERATIONS = 3;

    this.points = [];
    this.constraints = [];

    /*
    const spacing = BAR_LENGTH;
    const clothCountX = 10;
    const clothCountY = 10;
    const startX = -(clothCountX * spacing) / 2;
    const startY = -(clothCountY * spacing) / 2;

    for (let y = 0; y <= clothCountY; y += 1) {
      for (let x = 0; x <= clothCountX; x += 1) {
        const p = new Point(startX + (x * spacing), startY + (y * spacing), 0);

        if (x !== 0) {
          const leftPoint = this.points[this.points.length - 1];
          const horizBar = new DistanceConstraint(leftPoint, p, BAR_LENGTH);
          this.constraints.push(horizBar);
        }

        if (y !== 0) {
          const topPoint = this.points[x + ((y - 1) * (clothCountX + 1))];
          const vertBar = new DistanceConstraint(topPoint, p, BAR_LENGTH);
          this.constraints.push(vertBar);
        }

        this.points.push(p);

        if ((x === 0 && y === 0) || (x === clothCountX - 1 && y === 0) || (x === 0 && y === clothCountY - 1) || (x === clothCountX - 1 && y === clothCountY - 1)) {
          this.constraints.push(new PositionConstraint(p, p.vector.clone()));
        }
      }
    }

    [oscillator] = this.constraints.filter(c => !!c.targetPosition).reverse();
    */
  }

  update(deltaTime) {
    // Allow the constraints to perturb the points
    this.constraints.forEach(constraint => constraint.resolve());

    // Allow the points to settle
    this.points.forEach(pt => pt.update(deltaTime));

    // Tell three.js to use the updated vertices
    this.constraints.forEach(constraint => constraint.updateGeometry());
  }
}

const scene = new THREE.Scene();
const frustumSize = 1000;
const aspect = window.innerWidth / window.innerHeight;
const camera = new THREE.OrthographicCamera((frustumSize * aspect) / -2, (frustumSize * aspect) / 2, frustumSize / 2, frustumSize / -2, 1, 2000);
camera.position.y = 400;

const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const vertShaderPromise = get(require('./shaders/constraint.vert'));
const fragShaderPromise = get(require('./shaders/constraint.frag'));

Promise.all([vertShaderPromise, fragShaderPromise])
  .then(([vertShader, fragShader]) => {
    resources['constraint-vertex-shader'] = vertShader;
    resources['constraint-fragment-shader'] = fragShader;
    resourceTracker.emit('loaded', 'strand-material');
  });

resourceTracker.on('loaded', (resourceName) => {
  cloth = new Web();
  console.log(`Loaded "${resourceName}"!`);

  get(require('./mesh.csv')).then((mesh) => {
    const lines = mesh.split('\n');
    lines.forEach((line) => {
      if (line.trim().length === 0) {
        return;
      }

      const [x1, y1, z1, x2, y2, z2] = line.split(',').map(part => parseFloat(part));

      const s = 100;
      const start = new Point(x1 * s, y1 * s, z1 * s);
      const end = new Point(x2 * s, y2 * s, z2 * s);

      cloth.points.push(start);
      cloth.points.push(end);

      cloth.constraints.push(new DistanceConstraint(start, end));
    });

    cloth.constraints.forEach(({ strand }) => strand && scene.add(strand.object));
  });
});

const r = 3 * Math.PI / 4;
camera.position.x = Math.cos(r) * 800;
camera.position.z = Math.sin(r) * 800;
camera.lookAt(scene.position);

function animate() {
  requestAnimationFrame(animate);

  const seconds = Date.now() / 1000;
  camera.position.x = Math.cos(seconds) * 800;
  camera.position.z = Math.sin(seconds) * 800;
  camera.lookAt(scene.position);

  if (cloth) {
    cloth.update(1 / 60);
  }

  renderer.render(scene, camera);
}

animate();

document.onmousemove = (event) => {
  const mousePosition = new THREE.Vector3(2 * (event.clientX / window.innerWidth) - 1, 1 - 2 * (event.clientY / window.innerHeight), 0);

  mousePosition.unproject(camera);

  const raycaster = new THREE.Raycaster(camera.position, mousePosition.sub(camera.position).normalize());

  const lines = cloth.constraints.reduce((ls, constraint) => ls.concat(constraint.strand.object), []);

  const intersections = raycaster.intersectObjects(lines);

  for (let j = 0; j < intersections.length; j += 1) {
    const intersection = intersections[j];
    const { object } = intersection;

    object.material.uniforms.r.value = 1;
    object.material.uniforms.g.value = 0;
    object.material.uniforms.b.value = 0;
    object.material.needsUpdate = true;
  }
};
