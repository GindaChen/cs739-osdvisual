// visit-sequence.js
// Dimensions of sunburst.
var width = 750;
var height = 600;
var radius = Math.min(width, height) / 2;

// Breadcrumb dimensions: width, height, spacing, width of tip/tail.
var b = {
  w: 120, h: 30, s: 3, t: 10
};

// Mapping of step names to colors.
// var colors = {
//   "home": "#5687d1",
//   "product": "#7b615c",
//   "search": "#de783b",
//   "account": "#6ab975",
//   "other": "#a173d1",
//   "end": "#bbbbbb"
// };

var colors = {
  "home": "#5687d1",
  "product": "#7b615c",
  "search": "#de783b",
  "account": "#6ab975",
  "other": "#a173d1",
  "end": "#bbbbbb"
};

var type_color = {
  "host" : "#5687d1",
  "ipservice" : "#de783b",
  "osd" : "#7b615c",
  "rack" : "#AAAAAA",
  "room" : "#6ab975",
  "root" : "#bbbbbb",
  "row" : "#00000AA"
};

var osd_color = {
  "up": "#0000AA",
  "down": "#AA0000",
};


// Total size of all segments; we set this later, after loading the data.
var totalSize = 0; 

var vis = d3.select("#chart").append("svg:svg")
    .attr("width", width)
    .attr("height", height)
    .append("svg:g")
    .attr("id", "container")
    .attr("transform", "translate(" + width / 2 + "," + height / 2 + ")");

var partition = d3.partition()
    .size([2 * Math.PI, radius * radius]);

var arc = d3.arc()
    .startAngle(function(d) { return d.x0; })
    .endAngle(function(d) { return d.x1; })
    .innerRadius(function(d) { return Math.sqrt(d.y0); })
    .outerRadius(function(d) { return Math.sqrt(d.y1); });

// Use d3.text and d3.csvParseRows so that we do not need to have a header
// row, and can receive the csv as an array of arrays.

// "visit-sequences.csv"
// url = "https://raw.githubusercontent.com/timelyportfolio/sunburstR/master/inst/examples/visit-sequences.csv"
// d3.text(url, function(text) {
//   var csv = d3.csvParseRows(text);
//   var json = buildHierarchy(csv);
//   createVisualization(json);
// });

url = "https://raw.githubusercontent.com/GindaChen/cs739-osdvisual/master/data/product/kelly.product.json"
d3.json(url, function(text){
  createVisualization(text);
});

// Main function to draw and set up the visualization, once we have the data.
function createVisualization(json) {

  // Basic setup of page elements.
  initializeBreadcrumbTrail();
  drawLegend();
  d3.select("#togglelegend").on("click", toggleLegend);

  // Bounding circle underneath the sunburst, to make it easier to detect
  // when the mouse leaves the parent g.
  vis.append("svg:circle")
      .attr("r", radius)
      .style("opacity", 0);

  // Turn the data into a d3 hierarchy and calculate the sums.
  // var root = d3.hierarchy(json)
  //     .sum(function(d) { console.log(d); return d.size; })
  //     .sort(function(a, b) { return b.value - a.value; });
  
  var root = d3.hierarchy(json)
      .sum(function(d) { return d.osd_counts; })
      .sort(function(a, b) { return b.value - a.value; });
    
  // TODO: Optional Filter
  var nodes = partition(root).descendants()
      // .filter(function(d) {
      //     return (d.x1 - d.x0 > 0.005); // 0.005 radians = 0.29 degrees
      // });

  var path = vis.data([json]).selectAll("path")
      .data(nodes)
      .enter().append("svg:path")
      .attr("display", function(d) { return d.depth ? null : "none"; })
      .attr("d", arc)
      .attr("fill-rule", "evenodd")
      .style("opacity", 1)
      .on("mouseover", mouseover);

  // TODO: Color for each piece
  path.style("fill", function(d) { 
        var a = d.data;
        var osd_counts = a.osd_counts;
        var osd_health = a.osd_health;
        if (isNaN(osd_counts) || isNaN(osd_health)) { return null; }

        var fraction = (osd_health/osd_counts);
        var r = String(200 * (1 - fraction));
        var g = String(200 * fraction);
        var b = String(0);
        c = "rgb" + "(" + r + "," + g + "," + b + ")";
        // console.log(r,g,b,c);
        return c;
  });

  // Add the mouseleave handler to the bounding circle.
  d3.select("#container").on("mouseleave", mouseleave);

  // Get total size of the tree = value of root node from partition.
  totalSize = path.datum().value;

  // console.log(path.datum());
  
 };

// TODO: Not very good representation...
function dataToString(item){
  data = item.data;
  console.log(data);
  if (data.type == "osd") {
    // TODO: This is an ugly, ugly, ugly code.
    return  "crush_weight: " + String(data.crush_weight) + "\n" +
  "depth: " + String(data.depth) + "\n" +
  "device_class: " + String(data.device_class) + "\n" +
  "exists: " + String(data.exists) + "\n" +
  "primary_affinity: " + String(data.primary_affinity) + "\n" +
  "reweight: " + String(data.reweight) + "\n" +
  "status: " + String(data.status) + "\n";

  }
  return "id: " + String(data.id)   + "\n" + 
       "type: " + String(data.type) + "\n";
}


// Fade all but the current sequence, and show it in the breadcrumb trail.
function mouseover(d) {

  var percentageString = dataToString(d.data);
  
  // TODO: Adjust size of sentence
  fontSize = d.data.name.length > 10 ? "1.8em": "2.5em";

  d3.select("#DeviceName")
      .text(d.data.name)
      .style("text-align", "center")
      .style("font-size", fontSize);
      
  d3.select("#percentage")
      .text(percentageString)
      .style("font-size", "10px");

  d3.select("#explanation")
      .style("visibility", "");

  var sequenceArray = d.ancestors().reverse();
  sequenceArray.shift(); // remove root node from the array
  updateBreadcrumbs(sequenceArray, percentageString);

  // Fade all the segments.
  d3.selectAll("path")
      .style("opacity", 0.3);

  // Then highlight only those that are an ancestor of the current segment.
  vis.selectAll("path")
      .filter(function(node) {
        return (sequenceArray.indexOf(node) >= 0);
  })
  .style("opacity", 1);
}

// Restore everything to full opacity when moving off the visualization.
function mouseleave(d) {

  // Hide the breadcrumb trail
  d3.select("#trail")
      .style("visibility", "hidden");

  // Deactivate all segments during transition.
  d3.selectAll("path").on("mouseover", null);

  // Transition each segment to full opacity and then reactivate it.
  d3.selectAll("path")
      .transition()
      .duration(1000)
      .style("opacity", 1)
      .on("end", function() {
              d3.select(this).on("mouseover", mouseover);
            });

  d3.select("#explanation")
      .style("visibility", "hidden");
}

function initializeBreadcrumbTrail() {
  // Add the svg area.
  var trail = d3.select("#sequence").append("svg:svg")
      .attr("width", width)
      .attr("height", 50)
      .attr("id", "trail");
  // Add the label at the end, for the percentage.
  trail.append("svg:text")
    .attr("id", "endlabel")
    .style("fill", "#000");
}

// Generate a string that describes the points of a breadcrumb polygon.
function breadcrumbPoints(d, i) {
  var points = [];
  points.push("0,0");
  points.push(b.w + ",0");
  points.push(b.w + b.t + "," + (b.h / 2));
  points.push(b.w + "," + b.h);
  points.push("0," + b.h);
  if (i > 0) { // Leftmost breadcrumb; don't include 6th vertex.
    points.push(b.t + "," + (b.h / 2));
  }
  return points.join(" ");
}

// Update the breadcrumb trail to show the current sequence and percentage.
function updateBreadcrumbs(nodeArray, percentageString) {

  // Data join; key function combines name and depth (= position in sequence).
  var trail = d3.select("#trail")
      .selectAll("g")
      .data(nodeArray, function(d) { return d.data.name + d.depth; });

  // Remove exiting nodes.
  trail.exit().remove();

  // Add breadcrumb and label for entering nodes.
  var entering = trail.enter().append("svg:g");

  entering.append("svg:polygon")
      .attr("points", breadcrumbPoints)
      .style("fill", function(d) { 
        console.log(type_color[d.data.data.type]);
        return type_color[d.data.data.type]; 
      });

  entering.append("svg:text")
      .attr("x", (b.w + b.t) / 2)
      .attr("y", b.h / 2)
      .attr("dy", "0.35em")
      .attr("text-anchor", "middle")
      .attr("font-size", "10px") // TODO: Adjust font size to fit in
      .text(function(d) { return d.data.name; });

  // Merge enter and update selections; set position for all nodes.
  entering.merge(trail).attr("transform", function(d, i) {
    return "translate(" + i * (b.w + b.s) + ", 0)";
  });

  // Now move and update the percentage at the end.
  // d3.select("#trail").select("#endlabel")
  //     .attr("x", (nodeArray.length + 0.5) * (b.w + b.s))
  //     .attr("y", b.h / 2)
  //     .attr("dy", "0.35em")
  //     .attr("text-anchor", "middle")
  //     .text(percentageString);

  // Make the breadcrumb trail visible, if it's hidden.
  d3.select("#trail")
      .style("visibility", "");

}

function drawLegend() {

  // Dimensions of legend item: width, height, spacing, radius of rounded rect.
  var li = {
    w: 75, h: 30, s: 3, r: 3
  };

  var legend = d3.select("#legend").append("svg:svg")
      .attr("width", li.w)
      .attr("height", d3.keys(colors).length * (li.h + li.s));

  var g = legend.selectAll("g")
      .data(d3.entries(colors))
      .enter().append("svg:g")
      .attr("transform", function(d, i) {
              return "translate(0," + i * (li.h + li.s) + ")";
           });

  // g.append("svg:rect")
  //     .attr("rx", li.r)
  //     .attr("ry", li.r)
  //     .attr("width", li.w)
  //     .attr("height", li.h)
  //     .style("fill", function(d) { return d.value; });
  
  g.append("svg:rect")
      .attr("rx", li.r)
      .attr("ry", li.r)
      .attr("width", li.w)
      .attr("height", li.h)
      .style("fill", function(d) { return d.osd_count; });
        

  g.append("svg:text")
      .attr("x", li.w / 2)
      .attr("y", li.h / 2)
      .attr("dy", "0.35em")
      .attr("text-anchor", "middle")
      .text(function(d) { return d.key; });
      // .text(function(d) { console.log(d.key); return d.key; });
}

function toggleLegend() {
  var legend = d3.select("#legend");
  if (legend.style("visibility") == "hidden") {
    legend.style("visibility", "");
  } else {
    legend.style("visibility", "hidden");
  }
}

// Take a 2-column CSV and transform it into a hierarchical structure suitable
// for a partition layout. The first column is a sequence of step names, from
// root to leaf, separated by hyphens. The second column is a count of how 
// often that sequence occurred.
// function buildHierarchy(csv) {
//   var root = {"name": "root", "children": []};
//   for (var i = 0; i < csv.length; i++) {
//     var sequence = csv[i][0];
//     var size = +csv[i][1];
//     if (isNaN(size)) { // e.g. if this is a header row
//       continue;
//     }
//     var parts = sequence.split("-");
//     var currentNode = root;
//     for (var j = 0; j < parts.length; j++) {
//       var children = currentNode["children"];
//       var nodeName = parts[j];
//       var childNode;
//       if (j + 1 < parts.length) {
//    // Not yet at the end of the sequence; move down the tree.
//  	var foundChild = false;
//  	for (var k = 0; k < children.length; k++) {
//  	  if (children[k]["name"] == nodeName) {
//  	    childNode = children[k];
//  	    foundChild = true;
//  	    break;
//  	  }
//  	}
//   // If we don't already have a child node for this branch, create it.
//  	if (!foundChild) {
//  	  childNode = {"name": nodeName, "children": []};
//  	  children.push(childNode);
//  	}
//  	currentNode = childNode;
//       } else {
//  	// Reached the end of the sequence; create a leaf node.
//  	childNode = {"name": nodeName, "size": size};
//  	children.push(childNode);
//       }
//     }
//   }
//   return root;
// };
