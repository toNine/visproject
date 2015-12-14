var raw_data = null;
// Assumes data entries are ordered
d3.csv(
    "data.csv",
    function(d) {
      return {
        year: +d.year,
        month: +d.month,
        date: +d.date,
        day: +d.day,
        project: d.project,
        name: d.name,
        startHh: d.start_hh,
        startMm: d.start_mm,
        endHh: d.end_hh,
        endMm: d.end_mm,
      };
    },
    function(error, rows) {
      raw_data = rows;
      console.log(rows);

      // Globals
      var width = 1000;

      // Calendar Layout
      var daysInWeek = 7,
          hoursInDay = 24;

      // Calendar Heatmap
      // Calendar Side-barchart
      // Bottom Parameters
      var minDate = new Date(2015, 9 - 1, 4),
          maxDate = new Date(2015, 12 - 1, 9),
          weekAfterMinDate = new Date(2015, 9 - 1, 11),
          dayAfterMinDate = new Date(2015, 9 - 1, 5);

      var weeklyMinutes = d3.nest()
          .key(startOfWeek)
          .rollup(function(d) { return d3.sum(d, getDurationMm); })
          .entries(rows);
      var dailyMinutes = d3.nest()
          .key(dateOfRow)
          .rollup(function(d) { return d3.sum(d, getDurationMm); })
          .entries(rows);

      var bottomBarChartHeight = 250,
          bottomBarChartYPadding = 30,
          bottomBarChartXPadding = 50;

      var bottomBarChartXScale = d3.time.scale()
          .domain([minDate, maxDate])
          .range([0, width - bottomBarChartXPadding]);
      var bottomBarChartXAxis = d3.svg.axis()
          .orient("bottom")
          .scale(bottomBarChartXScale);
      var bottomBarChartYScale = d3.scale.linear()
          .domain([0, d3.max(weeklyMinutes, function(d) { return d.values; }) / 60])
          .range([bottomBarChartHeight - bottomBarChartYPadding, 0]);
      var bottomBarChartYAxis = d3.svg.axis()
          .orient("left")
          .scale(bottomBarChartYScale);

      // Bottom Bar Charts
      var bottomBarChart = d3.select("body").append("svg")
          .attr("width", width)
          .attr("height", bottomBarChartHeight);
          
      bottomBarChart.append("g")
          .attr("transform", "translate(" + bottomBarChartXPadding + ", " + (bottomBarChartHeight - bottomBarChartYPadding) + ")")
          .call(bottomBarChartXAxis);
      bottomBarChart.append("g")
          .attr("transform", "translate(" + bottomBarChartXPadding + ", 0)")
          .call(bottomBarChartYAxis);

      // Bottom week bars
      var weekBars = bottomBarChart.append("g").attr("class", "weekly-bars")
        .selectAll(".weekBar")
        .data(weeklyMinutes).enter()
        .append("rect")
        .attr("fill", "steelblue")
        .attr("width", bottomBarChartXScale(weekAfterMinDate) - bottomBarChartXScale(minDate) - 1)
        .attr("height", function(d) { return bottomBarChartHeight - bottomBarChartYPadding - bottomBarChartYScale(d.values / 60)})
        .attr("x", function(d) { return bottomBarChartXScale(Date.parse(d.key)) + bottomBarChartXPadding; })
        .attr("y", function(d) { return bottomBarChartYScale(d.values / 60); });

      // Bottom day bars
      var dailyBars = bottomBarChart.append("g").attr("class", "daily-bars")
        .selectAll(".dayBar")
        .data(dailyMinutes).enter()
        .append("rect")
        .attr("fill", "orange")
        .attr("width", bottomBarChartXScale(dayAfterMinDate) - bottomBarChartXScale(minDate) - 1)
        .attr("height" , function(d) { return bottomBarChartHeight - bottomBarChartYPadding - bottomBarChartYScale(d.values / 60)})
        .attr("x", function(d) { return bottomBarChartXScale(Date.parse(d.key)) + bottomBarChartXPadding; })
        .attr("y", function(d) { return bottomBarChartYScale(d.values / 60); });

      
      // Bottom Project Lines

      /*
      var barChartDomain = weekAggregate.map(function(el, i) { return el.key; });

      var weekAggregateXScale = d3.scale.ordinal()
          .domain(barChartDomain)
          .rangeRoundBands([0, 1000]);
      var xAxis = d3.svg.axis()
          .scale(weekAggregateXScale)
          .orient("bottom");

          // x, y, width, height
      barChart.selectAll(".bar")
          .data(weekAggregate)
          .enter().append("rect")
          .attr("class", "bar")
          .attr("fill", "steelblue")
          .attr("x", function(d) { console.log(d); return weekAggregateXScale(d.key); })
          .attr("y", function(d) { return weekAggregateYScale(d.values); })
          .attr("width", 20)
          .attr("height", function(d) {return 150 - weekAggregateYScale(d.values); });
      // var weekBarWidth = 10;
      // */

      // weekAggregate.forEach(function(el, i) {
        // console.log(Math.floor(el.values / 60) + ":" + el.values % 60);
      // });

    });

/*
 * Helper Functions
 */
var getDurationMm = function(row) {
  return (row.endHh - row.startHh) * 60 + (row.endMm - row.startMm);
}

var dateOfRow = function(row) {
  return new Date(row.year, row.month - 1, row.date);
}

var startOfWeek = function(row) {
  var date = new Date(row.year, row.month - 1, row.date),
      diff = row.day - 1;
  date.setDate(date.getDate() - diff);
  return date.toString();
}

var dateString = function(row) {
  return row.year + "/" + row.month + "/" + row.date;
}

var durationString = function(minutes) {
  return Math.floor(minutes / 60) + ":" + minutes % 60;
}

