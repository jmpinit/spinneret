import java.util.*;

final static int SELECTION_DIST = 10;

Vector<Edge> edges;
Vector<PVector> anchorPoints;
PVector selected;

void setup() {
  size(800, 800);
  
  edges = new Vector<Edge>();
  anchorPoints = new Vector<PVector>();
}

void draw() {
  background(0);
  
  stroke(255);
  fill(255);
  for (Edge edge : edges) {
    line(edge.start.x, edge.start.y, edge.end.x, edge.end.y);
    ellipse(edge.start.x, edge.start.y, 3, 3);
    ellipse(edge.end.x, edge.end.y, 3, 3);
  }
  
  if (selected != null) {
    stroke(255, 0, 0);
    noFill();
    ellipse(selected.x, selected.y, 10, 10);
  }
}

void keyPressed() {
  if (key == ' ') {
    if (selected != null) {
      anchorPoints.add(selected.copy());
      println("recorded anchor point", anchorPoints.size());
    }
  } else if (key == 's') {
    exportWeb(edges);
  }
}

void mousePressed() {
  for (Edge edge : edges) {
    if (dist(edge.start.x, edge.start.y, mouseX, mouseY) < SELECTION_DIST) {
      if (selected == null) {
        selected = edge.start;
      } else {
        edges.add(new Edge(selected, edge.start));
        selected = null;
      }
      
      return;
    }
    
    if (dist(edge.end.x, edge.end.y, mouseX, mouseY) < SELECTION_DIST) {
      if (selected == null) {
        selected = edge.end;
      } else {
        edges.add(new Edge(selected, edge.end));
        selected = null;
      }
      
      return;
    }
  }
  
  if (selected != null) {
    edges.add(new Edge(selected, new PVector(mouseX, mouseY)));
    selected = null;
  } else {
    selected = new PVector(mouseX, mouseY);
  }
}

int indexOfPoint(PVector point, Vector<PVector> points) {
  for (int i = 0; i < points.size(); i++) {
    PVector pt = points.get(i);
    
    if (point.dist(pt) < SELECTION_DIST) {
      return i;
    }
  }
  
  throw new RuntimeException("Point not found");
}

void exportWeb(Vector<Edge> edges) {
  Vector<PVector> points = new Vector<PVector>();
  
  for (Edge edge : edges) {
    boolean startIsUnique = true;
    boolean endIsUnique = true;
    
    for (PVector pt : points) {
      if (edge.start.dist(pt) < SELECTION_DIST) {
        startIsUnique = false;
      }
      
      if (edge.end.dist(pt) < SELECTION_DIST) {
        endIsUnique = false;
      }
    }
    
    if (startIsUnique) {
      points.add(edge.start);
    }
    
    if (endIsUnique) {
      points.add(edge.end);
    }
  }
  
  JSONArray pointsArray = new JSONArray();
  for (int i = 0; i < points.size(); i++) {
    PVector pt = points.get(i);
    
    JSONObject point = new JSONObject();
    point.setFloat("x", map(pt.x, 0, width, -1, 1));
    point.setFloat("y", map(pt.y, 0, height, -1, 1));
    point.setString("id", "" + i);
    
    pointsArray.append(point);
  }
  
  JSONArray constraints = new JSONArray();
  for (Edge edge : edges) {
    JSONArray constraint = new JSONArray();
    constraint.append("" + indexOfPoint(edge.start, points));
    constraint.append("" + indexOfPoint(edge.end, points));
    
    constraints.append(constraint);
  }
  
  JSONArray anchors = new JSONArray();
  for (PVector pt : anchorPoints) {
    anchors.append("" + indexOfPoint(pt, points));
  }
  
  JSONObject web = new JSONObject();
  web.setJSONArray("points", pointsArray);
  web.setJSONArray("constraints", constraints);
  web.setJSONArray("anchors", anchors);
  
  saveJSONObject(web, "data/web.json");
  
  println("Saved web");
}

class Edge {
  public PVector start, end;
  
  public Edge(PVector start, PVector end) {
    this.start = start;
    this.end = end;
  }
}