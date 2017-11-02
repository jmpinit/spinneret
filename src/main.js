const THREE = require('three');
const { EventEmitter } = require('events');

const get = require('./get');

const BAR_LENGTH = 50;

const resources = [];
const resourceTracker = new EventEmitter();

class Point {
  constructor(x, y, z) {
    this.vector = new THREE.Vector3(x, y, z);
    this.previousVector = new THREE.Vector3(x, y, z);
  }

  update(deltaTime) {
    const deltaSquared = deltaTime ** 2;

    const tiny = () => 500 * (Math.random() - 0.5);
    const force = new THREE.Vector3(0, 0, 0);

    if (Math.random() > 0.9) {
      force.set(0, 0, tiny());
    }

    const k = 0.99; // Damping constant
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

class Strand {
  constructor(start, end, count = 2) {
    if (count < 2) {
      throw new Error('Strand must have at least two points');
    }

    this.pointCount = count;

    this.positions = new THREE.Float32BufferAttribute(this.pointCount * 3, 3);
    this.displacement = new THREE.Float32BufferAttribute(this.pointCount * 3, 3);

    this.geometry = new THREE.BufferGeometry();
    this.geometry.addAttribute('position', this.positions);
    this.geometry.addAttribute('displacement', this.displacement);

    this.object = new THREE.Line(this.geometry, resources['strand-material']);

    // TODO use count to generate interpolated points
    this.set([start.clone(), end.clone()]);
  }

  set(newPoints) {
    if (newPoints.length !== this.pointCount) {
      throw new Error('Must set strand using array containing same number of points');
    }

    const { array } = this.geometry.attributes.position;
    for (let i = 0; i < newPoints.length; i += 1) {
      const ai = i * 3;
      array[ai] = newPoints[i].x;
      array[ai + 1] = newPoints[i].y;
      array[ai + 2] = newPoints[i].z;
    }

    this.object.geometry.attributes.position.needsUpdate = true;
  }
}

class DistanceConstraint {
  constructor(pointA, pointB, length) {
    this.pointA = pointA;
    this.pointB = pointB;
    this.length = length;

    this.strand = new Strand(this.pointA.vector, this.pointB.vector);
  }

  resolve() {
    const diffX = this.pointA.vector.x - this.pointB.vector.x;
    const diffY = this.pointA.vector.y - this.pointB.vector.y;
    const diffZ = this.pointA.vector.z - this.pointB.vector.z;
    const dist = this.pointA.vector.distanceTo(this.pointB.vector);
    const normError = (this.length - dist) / dist;

    // TODO how exactly does this work? Draw some pictures
    const perturbed = new THREE.Vector3(diffX * normError * 0.5, diffY * normError * 0.5, diffZ * normError * 0.5);

    this.pointA.vector.add(perturbed);
    this.pointB.vector.sub(perturbed);
  }

  updateGeometry() {
    this.strand.set([this.pointA.vector, this.pointB.vector]);
  }
}

class Web {
  constructor() {
    // How many times to iterate towards a solution to the constraints
    this.PHYSICS_ITERATIONS = 3;

    this.points = [];
    this.constraints = [];

    const spacing = BAR_LENGTH + 5;
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
      }
    }
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
    resources['strand-material'] = new THREE.ShaderMaterial({
      vertexShader: vertShader,
      fragmentShader: fragShader,
      blending: THREE.AdditiveBlending,
      depthTest: false,
      transparent: true,
    });

    resourceTracker.emit('loaded', 'strand-material');
  });

let cloth;
resourceTracker.on('loaded', (resourceName) => {
  cloth = new Web();
  cloth.constraints.forEach(({ strand }) => scene.add(strand.object));
  console.log(`Loaded "${resourceName}"!`);
});

function animate() {
  requestAnimationFrame(animate);

  const timer = Date.now() * 0.0001;
  camera.position.x = Math.cos(timer) * 800;
  camera.position.z = Math.sin(timer) * 800;
  camera.lookAt(scene.position);

  if (cloth) {
    cloth.update(1 / 60);
  }

  renderer.render(scene, camera);
}

animate();
