uniform float r;
uniform float g;
uniform float b;

void main() {
    vec3 rgb = vec3(r, g, b);

    gl_FragColor = vec4(rgb, 1);
}