import bpy

outputFile = '/tmp/mesh.csv'

csv = ''

for edge in bpy.context.object.data.edges:
    xIndex = edge.vertices[0]
    yIndex = edge.vertices[1]

    a = bpy.context.object.data.vertices[xIndex]
    b = bpy.context.object.data.vertices[yIndex]

    csv += ','.join([str(c) for c in [a.co[0], a.co[1], a.co[2], b.co[0], b.co[1], b.co[2]]]) + '\n'

f = open(outputFile, 'w')
f.writelines(csv)
f.close()
