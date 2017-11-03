const THREE = require('three');
const resources = require('./resources');

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

module.exports = Strand;
