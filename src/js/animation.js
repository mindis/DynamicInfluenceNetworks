var App = App || {};

// handles the animation of the DIM simulation
function AnimationManager() {
  this.isActive = true;

  this.currentTime = 0; // in terms of timestep
  this.totalTime = 1;
  this.isPlaying = false;

  this.interval = null;
  this.speed = 1; // plays at real speed to begin with

  this.updateTimestep = 50; // 50ms between updates of animation

  var that = this;

  // set up event handlers for buttons
  d3.select(".frIcon")
    .on("click", function(d) {
      that.decreaseSpeed();
    });

  d3.select(".sbIcon")
    .on("click", function(d) {
      that.stepBackward();
    });

  d3.select(".ppIcon")
    .on("click", function(d) {
      that.togglePlay(); // change icon

      d3.select(this)
        .property("src", !that.isPlaying ? "./lib/Icons/playIcon.svg" : "./lib/Icons/pauseIcon.svg");
    });

  d3.select(".sfIcon")
    .on("click", function(d) {
      that.stepForward();
    });

  d3.select(".ffIcon")
    .on("click", function(d) {
      that.increaseSpeed();
    });
}

AnimationManager.prototype.toggleActive = function() {
  // set active to false
  this.isActive = !this.isActive;
}

AnimationManager.prototype.setTotalTimesteps = function(t) {
  this.totalTime = t - 1;
}

AnimationManager.prototype.togglePlay = function() {
  // toggle between playing and paused
  this.isPlaying = !this.isPlaying;

  var that = this;

  if (this.isPlaying) {
    this.interval = setInterval(function() {
      var startData = App.dataset[Math.floor(that.currentTime)];
      var endData = App.dataset[Math.floor(that.currentTime) + 1];

      // console.log(this);

      var timeRange = [
        startData.timeWindow[1],
        endData.timeWindow[1]
      ];

      var ms_delt = that.updateTimestep * that.speed; // time elapsed this update
      var t_delt = (timeRange[1] - timeRange[0]) * 1000; // total ms between timesteps
      var t_pc = ms_delt / t_delt;

      that.currentTime = (that.currentTime + t_pc) % that.totalTime;
      // console.log(that.currentTime);
      if (isNaN(that.currentTime)) {
        that.currentTime = 0;
      }

      that.updateData();

    }, that.updateTimestep)
  } else {
    clearInterval(this.interval);
    // restart simulation on pause
    App.panels.forceDirected.simulation
      .alpha(0.3)
      .restart();
  }
}

AnimationManager.prototype.stepForward = function() {
  this.currentTime = Math.floor(this.currentTime + 1) % this.totalTime;

  if (this.isPlaying) {
    this.togglePlay();
  }

  this.updateData();
}

AnimationManager.prototype.stepBackward = function() {
  this.currentTime = (Math.ceil(this.currentTime - 1) + this.totalTime) % this.totalTime;

  if (this.isPlaying) {
    this.togglePlay();
  }

  this.updateData();
}

AnimationManager.prototype.increaseSpeed = function() {
  // increase speed of play
  if (this.speed < 32) {
    this.speed *= 2;
  }
}

AnimationManager.prototype.decreaseSpeed = function() {
  // decrease speed of play
  if (this.speed > 1/32) {
    this.speed /= 2;
  }
}

AnimationManager.prototype.updateData = function() {
  // interpolate values between timesteps
  var startData = App.dataset[Math.floor(this.currentTime)];
  var endData = App.dataset[Math.floor(this.currentTime) + 1];

  var keys = Object.keys(startData.data);

  var t_pcElap = this.currentTime - Math.floor(this.currentTime); // % elapsed between timesteps

  var interpolatedData = {};

  for (var key of keys) {
    interpolatedData[key] = {
      name: key,
      hits: interpolateHits(t_pcElap, startData.data[key].hits, endData.data[key].hits),
      inf: interpolateFlux(t_pcElap, startData.data[key].inf, endData.data[key].inf),
      outf: interpolateFlux(t_pcElap, startData.data[key].outf, endData.data[key].outf)
    }
  }

  App.data = interpolatedData;
  App.panels.forceDirected.updateData(App.data);


  // update other components in UI
  App.item = Math.round(this.currentTime);
  App.timeSlider.setPosition(this.currentTime);
  App.panels.topVis.drawMarkers();
  App.panels.bottomVis.drawMarkers();

  // h1: start hits, h2: end hits
  function interpolateHits(pcElap, h1, h2) {
    return h1 + (h2 - h1) * pcElap;
  }

  // f1: start fluxi, f2: end fluxi
  function interpolateFlux(pcElap, f1, f2) {
    var intFlux = new Array(f1.length);

    for (var ind in f1) {
      intFlux[ind] = {
        name: f1[ind].name,
        flux: f1[ind].flux + (f2[ind].flux - f1[ind].flux) * pcElap
      };
    }

    return intFlux;
  }
}