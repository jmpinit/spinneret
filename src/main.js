const THREE = require('three');
const { EventEmitter } = require('events');

const get = require('./get');
const { DistanceConstraint, PositionConstraint } = require('./constraints');
const resources = require('./resources');

const BAR_LENGTH = 100;

const resourceTracker = new EventEmitter();

let theWeb;
const anchors = [];

const ws = new WebSocket('ws://localhost:8080');
ws.onopen = () => {
  ws.send(JSON.stringify({
    command: 'register',
    type: 'controller',
  }));

  console.log('Websocket connection open');
};
ws.onmessage = (message) => {
  try {
    const data = JSON.parse(message.data);

    if (data.command === 'notify') {
      console.log(`Notification from service #${data.service}`);

      if (data.service < anchors.length) {
        anchors[data.service].shake(10, 500 + Math.random() * 2000);
        ws.send(JSON.stringify({
          command: 'buzz',
          intensity: 255,
          duration: 500 + Math.random() * 2000,
        }));
      } else {
        console.warn('Notification for unknown service!');
      }
    }
  } catch (e) {
    console.error(e);
  }
};

function createIcon(canvas) {
  const texture = new THREE.Texture(canvas);
  texture.needsUpdate = true;
  const material = new THREE.MeshBasicMaterial({
    map: texture,
    side: THREE.DoubleSide,
  });

  const geometry = new THREE.PlaneGeometry(50, 50);

  return new THREE.Mesh(geometry, material);
}

class Point {
  constructor(x, y, z) {
    this.vector = new THREE.Vector3(x, y, z);
    this.previousVector = new THREE.Vector3(x, y, z);
  }

  update(deltaTime) {
    const deltaSquared = deltaTime ** 2;

    // Gravity
    const force = new THREE.Vector3(0, 0, -100);

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

class Anchor extends Point {
  constructor(image, x, y, z) {
    if (z < 0) {
      throw new Error('Z > 0');
    }

    super(x, y, z);

    const geometry = new THREE.CylinderGeometry(5, 5, z, 32);
    const material = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const postCylinder = new THREE.Mesh(geometry, material);
    postCylinder.rotation.x = Math.PI / 2;
    postCylinder.position.z = -z / 2;

    this.object = new THREE.Object3D();
    this.object.add(createIcon(image));
    this.object.add(postCylinder);

    this.anchorPosition = new THREE.Vector3(x, y, z);
    this.constraint = new PositionConstraint(this, this.anchorPosition.clone());
    theWeb.constraints.push(this.constraint);

    this.shaking = {
      enabled: false,
      amplitude: null,
      time: null,
    };
  }

  shake(amplitude, duration) {
    this.shaking.enabled = true;
    this.shaking.amplitude = amplitude;
    setTimeout(() => { this.shaking.enabled = false; }, duration);
  }

  grab(web, threshold = 10) {
    let numberGrabbed = 0;

    web.points.forEach((pt) => {
      if (pt === this) {
        return;
      }

      const dist = this.vector.distanceTo(pt.vector);

      if (dist < threshold) {
        const positionConstraint = new DistanceConstraint(this, pt, 0);
        web.constraints.push(positionConstraint);

        numberGrabbed += 1;
      }
    });

    return numberGrabbed;
  }

  update(deltaTime) {
    super.update(deltaTime);

    if (this.shaking.enabled) {
      this.shaking.time += deltaTime;

      const amp = this.shaking.amplitude;

      this.constraint.targetPosition.set(
        this.anchorPosition.x + (amp * Math.random()),
        this.anchorPosition.y + (amp * Math.random()),
        this.anchorPosition.z,
      );
    }

    if (!this.ensnared) {
      const grabbed = this.grab(theWeb, 10);

      if (grabbed > 0) {
        this.ensnared = true;
      }
    }

    this.object.position.copy(this.vector);
  }
}

class Prey extends Point {
  constructor(image, x, y, z) {
    super(x, y, z);

    this.object = createIcon(image);
    this.ensnared = false;
  }

  grab(web, threshold = 10) {
    let numberGrabbed = 0;

    web.points.forEach((pt) => {
      if (pt === this) {
        return;
      }

      const dist = this.vector.distanceTo(pt.vector);

      if (dist < threshold) {
        const positionConstraint = new DistanceConstraint(this, pt, 0);
        web.constraints.push(positionConstraint);

        numberGrabbed += 1;
      }
    });

    return numberGrabbed;
  }

  update(deltaTime) {
    super.update(deltaTime);

    if (!this.ensnared) {
      const grabbed = this.grab(theWeb, 10);

      if (grabbed > 0) {
        this.ensnared = true;
      }
    }

    this.object.position.copy(this.vector);
  }
}

class Web {
  constructor() {
    // How many times to iterate towards a solution to the constraints
    this.PHYSICS_ITERATIONS = 3;

    this.points = [];
    this.constraints = [];
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

const vertShaderPromise = get.raw(require('./shaders/constraint.vert'));
const fragShaderPromise = get.raw(require('./shaders/constraint.frag'));

Promise.all([vertShaderPromise, fragShaderPromise])
  .then(([vertShader, fragShader]) => {
    resources['constraint-vertex-shader'] = vertShader;
    resources['constraint-fragment-shader'] = fragShader;
    resourceTracker.emit('loaded', 'strand-material');
  });

resourceTracker.on('loaded', (resourceName) => {
  theWeb = new Web();
  console.log(`Loaded "${resourceName}"!`);

  get.raw('./assets/web.json').then((webString) => {
    const web = JSON.parse(webString);
    console.log(web);
    /*
    const lines = mesh.split('\n');
    lines.forEach((line) => {
      if (line.trim().length === 0) {
        return;
      }

      const [x1, y1, z1, x2, y2, z2] = line.split(',').map(part => parseFloat(part));

      const s = 100;
      const start = new Point(x1 * s, y1 * s, z1 * s);
      const end = new Point(x2 * s, y2 * s, z2 * s);

      theWeb.points.push(start);
      theWeb.points.push(end);

      theWeb.constraints.push(new DistanceConstraint(start, end));
    });
    */

    /*
    const spacing = BAR_LENGTH;
    const clothCountX = 10;
    const clothCountY = 10;
    const startX = -(clothCountX * spacing) / 2;
    const startY = -(clothCountY * spacing) / 2;
    const z = 100;

    for (let y = 0; y <= clothCountY; y += 1) {
      for (let x = 0; x <= clothCountX; x += 1) {
        const p = new Point(startX + (x * spacing), startY + (y * spacing), z);

        if (x !== 0) {
          const leftPoint = theWeb.points[theWeb.points.length - 1];
          const horizBar = new DistanceConstraint(leftPoint, p, BAR_LENGTH);
          theWeb.constraints.push(horizBar);
        }

        if (y !== 0) {
          const topPoint = theWeb.points[x + ((y - 1) * (clothCountX + 1))];
          const vertBar = new DistanceConstraint(topPoint, p, BAR_LENGTH);
          theWeb.constraints.push(vertBar);
        }

        theWeb.points.push(p);

        if ((x === 0 && y === 0) || (x === clothCountX && y === 0) || (x === 0 && y === clothCountY) || (x === clothCountX && y === clothCountY)) {
          theWeb.constraints.push(new PositionConstraint(p, p.vector.clone()));
        }
      }
    }
    */

    const getPoint = pid => web.points.filter(({ id }) => id === `${pid}`)[0];
    const pointsByID = [];

    const scale = 800;
    web.constraints.forEach(([idStart, idEnd]) => {
      let startPt;
      let endPt;

      if (idStart in pointsByID) {
        startPt = pointsByID[idStart];
      } else {
        const start = getPoint(idStart);
        startPt = new Point(start.x * scale, start.y * scale, 200);
        pointsByID[idStart] = startPt;
        theWeb.points.push(startPt);
      }

      if (idEnd in pointsByID) {
        endPt = pointsByID[idEnd];
      } else {
        const end = getPoint(idEnd);
        endPt = new Point(end.x * scale, end.y * scale, 200);
        pointsByID[idEnd] = endPt;
        theWeb.points.push(endPt);
      }

      const dist = startPt.vector.distanceTo(endPt.vector);

      theWeb.constraints.push(new DistanceConstraint(startPt, endPt, dist));
    });

    theWeb.constraints.forEach(({ strand }) => strand && scene.add(strand.object));

    const addAnchor = (index, image) => {
      const anchorPtIndex = web.anchors[index];
      const pt = getPoint(anchorPtIndex);
      const anchor = new Anchor(image, pt.x * scale, pt.y * scale, 100);
      anchors.push(anchor);
      theWeb.points.push(anchor);
      scene.add(anchor.object);
    };

    get.imageAsCanvas('/images/hn.ico').then(image => addAnchor(0, image));
    get.imageAsCanvas('/images/youtube.png').then(image => addAnchor(1, image));
    get.imageAsCanvas('/images/gmail.png').then(image => addAnchor(2, image));
  });
});

const r = 3 * Math.PI / 4;
//camera.position.x = Math.cos(r) * 800;
camera.position.z = 800;
camera.position.y = -800;
camera.lookAt(scene.position);

function animate() {
  requestAnimationFrame(animate);

  const seconds = Date.now() / 1000;
  //camera.position.x = Math.sin(seconds / 10) * 800;
  //camera.position.y = Math.cos(seconds / 10) * 800;
  //camera.lookAt(scene.position);

  if (theWeb) {
    theWeb.update(1 / 60);
  }

  renderer.render(scene, camera);
}

animate();

document.onmousedown = (event) => {
  const mousePosition = new THREE.Vector3(2 * (event.clientX / window.innerWidth) - 1, 1 - 2 * (event.clientY / window.innerHeight), 0);

  mousePosition.unproject(camera);

  const raycaster = new THREE.Raycaster(camera.position, mousePosition.sub(camera.position).normalize());

  const lines = theWeb.constraints.reduce((ls, constraint) => (
    constraint.strand !== undefined ?
      ls.concat(constraint.strand.object)
      : ls
  ), []);

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
