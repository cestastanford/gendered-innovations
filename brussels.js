// ========================== Global variables ========================== 

var margin = {top: 20, right: 20, bottom: 30, left: 60},
    width = 600 - margin.left - margin.right,
    height = 300 - margin.top - margin.bottom;

queue()
    .defer(d3.csv, "./d/network_brussels.csv")
    .defer(d3.json, "./d/world-50m.json")
    .defer(d3.csv, "./d/locations_lat_long.csv")
    .await(ready);

function ready(error, csv_data, world, locations) {

  // ========================== Mapping the network ==========================

  var map_projection = d3.geo.eckert3()
      .translate([width / 2, height / 2])
      .rotate([50, 0])
      .center([65, 52])
      .scale(550);

  var map_path = d3.geo.path()
      .projection(map_projection);

  var brussels_svg = d3.select("#brussels_network").append("svg")
      .attr("width", width)
      .attr("height", height);

  brussels_svg.append("rect")
    .attr("width", width)
    .attr("height", height);

  brussels_svg.append("text")
    .attr("class","map title")
    .text("Brussels")
    .attr("transform","translate(" + map_projection.translate()[0]+ ",120)")
    .attr("text-anchor","middle")
    .attr("font-family","sans-serif");

  var g = brussels_svg.append("g");

  g.selectAll("path")
      .data(topojson.feature(world, world.objects.countries).features)
    .enter().append("path")
      .attr("d", map_path)
      .attr("class", "feature");

  g.append("path")
      .datum(topojson.mesh(world, world.objects.countries, function(a, b) { return a !== b; }))
      .attr("class", "mesh")
      .attr("d", map_path);

  // ========================== Network viz ==========================

  // array of nodes
  var nodes = {};

  // compute nodes from links
  csv_data.forEach(function(link) {
      key = link.target + '@' + link.source;
      link.target = nodes[key] || (nodes[key] = {name: link.target});
      link.source = nodes[link.source] || (nodes[link.source] = {name: link.source});
  })

  var locationHash = {};

  for (loc in locations) {
    locationHash[locations[loc].location] = locations[loc];
  }

  for (n in nodes) {
    if(locationHash[nodes[n].name]) {
      nodes[n].lat = locationHash[nodes[n].name].latitude
      nodes[n].long = locationHash[nodes[n].name].longitude

    }
  }

  var force = d3.layout.force()
    .nodes(d3.values(nodes))
    .links(csv_data)
    .size([width, height])
    .linkDistance(80)
    .charge(-10)
    .gravity(0)
    .on("tick", tick)
    .start();

  // add the edges
  var path = brussels_svg.append("g").selectAll("path")
    .data(force.links())
  .enter().append("path")
    .attr("class", "link");

  // define the nodes
  var node = brussels_svg.selectAll(".node")
    .data(force.nodes())
  .enter().append("g")
    .attr("class", "node")
    .on("mouseover", mouseover)
    .on("mouseout", mouseout)
    .call(force.drag);

  // add the nodes
  node.append("circle")
    .attr("r", 5)
    .style("fill", "#8a0000");

  // add the text 
  node.append("text")
    .attr("x", 12)
    .attr("dy", ".35em")
    .text(function(d) { return d.name; });

    for (n in nodes) {
      if(nodes[n].long) {
        var projectedNode = map_projection([nodes[n].long,nodes[n].lat])
        nodes[n].x = projectedNode[0];
        nodes[n].px = projectedNode[0];
        nodes[n].y = projectedNode[1];
        nodes[n].py = projectedNode[1];
        nodes[n].fixed = true;

      }

    }

  // ========================== Functions ==========================

  // add the edges
  function tick() {
    path.attr("d", function(d) {
        var dx = d.target.x - d.source.x,
            dy = d.target.y - d.source.y,
            dr = Math.sqrt(dx * dx + dy * dy);
        return "M" + 
            d.source.x + "," + 
            d.source.y + "A" + 
            dr + "," + dr + " 0 0,1 " + 
            d.target.x + "," + 
            d.target.y;
    });

    node
        .attr("transform", function(d) { 
            return "translate(" + d.x + "," + d.y + ")"; });
  }

  // resize nodes on mouseover and mouseout
  function mouseover() {
    d3.select(this).select("circle").transition()
        .duration(750)
        .attr("r", 8);
  }  
  function mouseout() {
    d3.select(this).select("circle").transition()
        .duration(750)
        .attr("r", 5);
  }
};