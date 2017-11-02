attribute vec3 displacement;

void main() {
  vec3 newPosition = position + displacement;

  gl_Position = projectionMatrix *
                modelViewMatrix *
                vec4(newPosition, 1.0);
}