// visit-sequence.js

// Main Execution

function main(url){
	d3.json(url, function(text){
		if (!root) {
			createVisualization(text);
		}else{
			updateVisualization(text);
			// updateData(text);
		}
	});
}



url = "https://raw.githubusercontent.com/GindaChen/cs739-osdvisual/master/data/timeseries/beesly.timeseries.0.json"
url2 = "https://raw.githubusercontent.com/GindaChen/cs739-osdvisual/master/data/timeseries/beesly.timeseries.1.json"



function singleTestCase() {
	main(url)
	setTimeout(function(){
		main(url2)
	} , 1000)
}


function multipleTestCase() {
	a = [0]
	a.map(function(d){
		setTimeout(function(){
			var dataurl = "https://raw.githubusercontent.com/GindaChen/cs739-osdvisual/master/data/timeseries/beesly.timeseries." + d +".json"
			main(dataurl)
		}, d * 1000)
		return null;
	})
}

singleTestCase()
// multipleTestCase()


// @Define Dimensions of sunburst.
var width = 750;
var height = 600;
var cornerRadius = 20;
var radius = Math.min(width, height) / 2;

// Breadcrumb dimensions:
// width, height, spacing, width of tip/tail.
var b = {
	w: 120, h: 40, s: 3, t: 10
};


// @Define Colors

var type_color = {
	"root" : "#089ec7",
	"room" : "#6ab975",
	"rack" : "#1ac9be",
	"row" : "#008c62",
	"host" : "#5687d1",
	"osd" : "#7b615c",
	"ipservice" : "#de783b"
};

var osd_color = {
	"up": "#0000AA",
	"down": "#AA0000",
};


// @Define Total size of all segments;
// we set this later, after loading the data.
var totalSize = 0;

// @Define History stack
var aHistory = [];

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
	.padAngle(d => Math.min((d.x1 - d.x0) / 2, 0.005))
  	.padRadius(radius / 2)
	.innerRadius(function(d) { return Math.sqrt(d.y0); })
	.outerRadius(function(d) { return Math.sqrt(d.y1); })
	.cornerRadius(cornerRadius)


var root = null;

// @Define Last zoomed element
var prevTarget = root;

// Main function to draw and set up the visualization, once we have the data.
function createVisualization(json) {

	// Basic setup of page elements.
	initializeBreadcrumbTrail();
	drawLegend();
	d3.select("#togglelegend").on("click", toggleLegend);

	// Show legend at the beginning
	toggleLegend();

	// Bounding circle underneath the sunburst, to make it easier to detect
	// when the mouse leaves the parent g.
	vis.append("svg:circle")
		.attr("r", radius)
		.style("opacity", 0);

	updateVisualization(json);
 };

 function updateVisualization(json){
 	root = d3.hierarchy(json)
		.sum(function(d) {
			// OK I think here we have a data artifact
			let magicNumber = 0.4;
			// let magicNumber = 1;
			return Math.pow(d.osd_counts, magicNumber);
		})
		.sort(function(a, b) { return a.osd_counts - b.osd_counts; });
	if(!!!prevTarget) prevTarget = root;

	// TODO: Optional Filter - link it into panel
	var nodes = partition(root).descendants();

	// var path = vis.data([json]).selectAll("path").remove();
	var path = vis.data([json]).selectAll("path")
		.data([json]).exit().remove();

	path = vis.data([json]).selectAll("path")
		.data(nodes)
		.enter().append("svg:path")
		.attr("display", function(d) { return d.depth-prevTarget.depth<6 && d.depth!=root.depth ? null: "none"; })
		.attr("d", arc)
		.attr("fill-rule", "evenodd")
		.style("opacity", 1)
		.on("mouseover", mouseover)
		.on("click", click);

	// path.filter(d => d.children);
	path.on("click", click);

	// TODO: Color for each piece
	path.style("fill", function(d) {
		var a = d.data;
		var osd_counts = a.osd_counts;
		var osd_health = a.osd_health;
		if (isNaN(osd_counts) || isNaN(osd_health)) { return null; }

		// 2. Show whether under this level there are node down

		// Some color functions
		colorFunc = {
			expFunc: function(c, x){ return Math.exp(x*c)/Math.exp(c); },
			sigmoidFunc: function(c, x, threashold){
				threashold = threashold == null? 6/8 : threashold;
				return 1 / (1 + Math.exp(- c * (x - threashold)));
			},
		}

		var fraction = osd_health / osd_counts;

		var c = 30;
		var basecolorval = colorFunc.expFunc(c, fraction);

		// var c = 64;
		// var basecolorval = colorFunc.sigmoidFunc(c, fraction, 0.5);

		var h = 120 * basecolorval; // hue ranging from 0-120 (0 is standard red, 120 is standard green)

		// 3. Construct a gradient of the node
		//return rgbString(r,g,b);

		return d3.hsl(h, 0.80, 0.5);
		// return d3.hsl(h, 0.80, 0.5, fraction == 1 ? 0.4: 1);

	});

	// Add the mouseleave handler to the bounding circle.
	d3.select("#container").on("mouseleave", mouseleave);

	// Get total size of the tree = value of root node from partition.
	totalSize = path.datum().value;

	// TODO: An elegant (black magic) solution
	//  to avoid gliches of the first click option
	// click(root);
 }

// TODO: Implement for transition
// @Define manage the
// - Transition of the elements
// - History
 function click(p){

 	let target;

 	if (!prevTarget) {
 		target = p; 		// 1. Initialization: In case of null pointer
 	} else if (prevTarget == p && p.parent) {
 		target = p.parent;  // 2. Chosen the center node: Go back one level
 	} else if (!p.children){
 		target = p.parent;	// 3. Chosen an OSD: expand its parent
 	} else{
 		target = p;         // 4. Chosen an internal node: Expand its child
 	}

 	prevTarget = target;

 	// 1. Transition zoom in
 	// TODO: Adjust x0 and x1
 	root.each(function(d){
      d.target = {
      	x0: Math.max(0, Math.min(1, (d.x0 - target.x0) / (target.x1 - target.x0))) * 2 * Math.PI,
        x1: Math.max(0, Math.min(1, (d.x1 - target.x0) / (target.x1 - target.x0))) * 2 * Math.PI,
        y0: Math.max(0, d.y0 - target.y0),
        y1: Math.max(0, d.y1 - target.y0)
      };
    });


	// t = vis.selectAll("path").transition().duration(1000);
	t = 1000;
  vis.selectAll("path").transition().duration(t)
	.tween("data", d => {
		const i = d3.interpolate(d.current, d.target);
		return t => d.current = i(t);
	})
	.attrTween("d", d => () => arc(d.current))
	.attr("fill-opacity", d => {
		if(d == target){ return 0; }
		return 1;
	})
	.attr("display", function(d){
		return d.depth-prevTarget.depth<6 && d.depth!=root.depth < 6 ? null: "none";
	});

}


// TODO: Ugly Code
osd_properties = {
	"crush_weight": Number,
	"depth": Number,
	"exists": Boolean,
	"device_class": String,
	"primary_affinity": Number,
	"reweight": Number,
	"status": String,
};

function dataToString(item){
	data = item.data;
	if (data.type == "osd") {
		var keys = Object.getOwnPropertyNames(osd_properties);
		return keys.map(function(d){
			var foo = osd_properties[d];
			return d + ": " + foo(data[d])
		}).join("\n");
	}
	return "id: " + String(data.id)   + "\n" +
		"type: " + String(data.type) + "\n";
}




// Fade all but the current sequence, and show it in the breadcrumb trail.
function mouseover(d) {

	// -- Change the information of container

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


	// -- Animation (global)

	// Fade all the segments.
	d3.selectAll("path").style("opacity", 0.3);

	// If the selection is the current expanded element,
	// highlight its direct decendents
	if (prevTarget == d) {
		var haloDepth = prevTarget.depth + 1;
		vis.selectAll("path")
		.filter(function(node) {
			return (node.depth <= haloDepth);
		})
		.style("opacity", 1);
	} else{
		// If the selection is not the current expanded element,
		// highlight only those that are an ancestor of the current segment.
		vis.selectAll("path")
		.filter(function(node) {
			return (sequenceArray.indexOf(node) >= 0);
		})
		.style("opacity", 1);
	}
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
		.duration(10)
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
// TODO: Change name `percentage` etc.
function updateBreadcrumbs(nodeArray, percentageString) {


	// console.log(nodeArray);
	// Data join; key function combines name and depth (= position in sequence).
	var trail = d3.select("#trail")
		.selectAll("g")
		.data(nodeArray, function(d) {
			return d.data.name + d.depth;
		});

	// Remove exiting nodes.
	trail.exit().remove();

	// Add breadcrumb and label for entering nodes.
	var entering = trail.enter().append("svg:g");

	entering.append("svg:polygon")
		.attr("points", breadcrumbPoints)
		.style("fill", function(d) {
			return type_color[d.data.data.type];
		});

	entering.append("svg:text")
		.attr("x", (b.w + b.t) / 2)
		.attr("y", b.h / 2)
		.attr("dy", "0.35em")
		.attr("text-anchor", "middle")
		.attr("font-size", "10px") // TODO: Adjust font size to fit in
		.text(function(d) { return d.data.name + " (" + d.data.type + ")"; });

	// Merge enter and update selections; set position for all nodes.
	entering.merge(trail).attr("transform", function(d, i) {
		// s = d.data.name + " (" + d.data.type + ")"
		// w = b.w + s.length;
		return "translate(" + i * (b.w + b.s) + ", 0)";
	});

	// Make the breadcrumb trail visible, if it's hidden.
	d3.select("#trail").style("visibility", "");

}

function drawLegend() {

	// Dimensions of legend item: width, height, spacing, radius of rounded rect.
	var li = {
		w: 75, h: 30, s: 3, r: 3
	};

	var legend = d3.select("#legend").append("svg:svg")
		.attr("width", li.w)
		.attr("height", d3.keys(type_color).length * (li.h + li.s));

	var g = legend.selectAll("g")
		.data(d3.entries(type_color))
		.enter().append("svg:g")
		.attr("transform", function(d, i) {
				// s = d.data.name + " (" + d.data.type + ")"
				// w = b.w + s.length;
				return "translate(0," + i * (li.h + li.s) + ")";
		 });

	g.append("svg:rect")
		.attr("rx", li.r)
		.attr("ry", li.r)
		.attr("width", li.w)
		.attr("height", li.h)
		.style("fill", function(d) {
			return type_color[d.key];
		});


	g.append("svg:text")
		.attr("x", li.w / 2)
		.attr("y", li.h / 2)
		.attr("dy", "0.35em")
		.attr("text-anchor", "middle")
		.text(function(d) { return d.key; });
}

function toggleLegend() {
	var legend = d3.select("#legend");
	if (legend.style("visibility") == "hidden") {
		legend.style("visibility", "");
	} else {
		legend.style("visibility", "hidden");
	}
}
