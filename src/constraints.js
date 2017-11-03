const THREE = require('three');
const Strand = require('./strand');

class PositionConstraint {
  constructor(point, targetPosition) {
    this.point = point;
    this.targetPosition = targetPosition;
  }

  resolve() {
    this.point.vector.copy(this.targetPosition);
  }

  updateGeometry() {}
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

module.exports = {
  PositionConstraint,
  DistanceConstraint,
};
