/*

Copyright (c) 2012, Nicolas Ramz
All rights reserved.

Redistribution and use in source and binary forms, with or without
modification, are permitted provided that the following conditions are met: 

1. Redistributions of source code must retain the above copyright notice, this
   list of conditions and the following disclaimer. 
2. Redistributions in binary form must reproduce the above copyright notice,
   this list of conditions and the following disclaimer in the documentation
   and/or other materials provided with the distribution. 

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND
ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT OWNER OR CONTRIBUTORS BE LIABLE FOR
ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
(INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND
ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
(INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.

The views and conclusions contained in the software and documentation are those
of the authors and should not be interpreted as representing official policies, 
either expressed or implied, of the FreeBSD Project.

http://lab.warpdesign.fr

*/

(function(global) { $(function() {
	var count = 0;

	/* Handler */
	function Handler(options) {
		this.transformPrefix = Modernizr.prefixed('transform');
		this.touchSupport = Modernizr.touch;

		this.type = options.type;
		this.el = $(options.src);
		this.parent = this.el.parent();
		this.center = options.center;
		this.active = false;
		this.touchId = 0;

		this.bindEvents();
	}

	Handler.prototype = {
		setCenter: function(center) {
			this.center = center;
		},

		bindEvents: function(event) {
			if (this.touchSupport) {
				this.el.bind('touchstart', jQuery.proxy(this.onStart, this));
				this.el.bind('touchmove', jQuery.proxy(this.onMove, this));
				this.el.bind('touchend', jQuery.proxy(this.onEnd, this));
			} else {
				this.el.bind('mousedown', jQuery.proxy(this.onStart, this));
				$(window).bind('mouseup', jQuery.proxy(this.onEnd, this));					
			}
		},

		onStart: function(event) {
			if (this.touchSupport)
				event.preventDefault();
			else
				$(window).bind('mousemove', jQuery.proxy(this.onMove, this));

			this.active = true;
			this.touchId = this.touchSupport ? event.originalEvent.changedTouches[0].identifier : 0;
			this.parent.removeClass('smooth');

			$(window).trigger('start.'+this.type, event.originalEvent);

			return false;
		},

		onMove: function(event) {
			var touches = this.touchSupport ? event.originalEvent.changedTouches : [event.originalEvent],
				i;

			if (!this.active)
				return false;

			if (this.touchSupport)
				event.preventDefault();

			for (i = 0; i < touches.length; i++) {
				if (!this.touchSupport || touches[i].identifier === this.touchId) {
					var pos = touches[i],
						angle = Trigo.getSinusAngle(this.center, {x: pos.pageX, y: pos.pageY});
					
					this.setCSSAngle(angle);

					break;
				}
			}
		},

		onEnd: function(event) {
			if (!this.active)
				return;

			this.active = false;
			this.parent.addClass('smooth');

			var pos = this.touchSupport ? event.originalEvent.changedTouches[0] : event.originalEvent,
				angle = Trigo.getSinusAngle(this.center, {x: pos.pageX, y: pos.pageY}),
				roundedAngle = Trigo.getNearestSinusAngleFrom(angle);

			this.setCSSAngle(roundedAngle);

			if (!this.touchSupport)
				$(window).unbind('mousemove');

			$(window).trigger('end.' + this.type, Trigo.getTimeFromAngle(roundedAngle, this.type));
		},

		setTime: function(time, noSnap) {
			this.time = time;
			this.setCSSAngle(Trigo.getAngleFromTime(time));
		},

		setCSSAngle: function(rad) {
			this.parent.css(this.transformPrefix, "rotate(" + rad + "rad)");				
		}
	};

	/* Clock */
	function Clock(src) {
		this.setup(src);
		this.bindEvents();
	}

	Clock.prototype = {
		setup: function(options) {
			this.minutes = options.minutes || 15;
			this.hours = options.hours || 4;
			this.clock = $(options.el);
			this.clockCenter = this.selectedHandler = null;
			this.setCenterPos();
			this.hourHandler = new Handler({
				src: $('.hours .handler', $(options.el)),
				type: 'hours',
				center: this.clockCenter
			});
			this.transformPrefix = Modernizr.prefixed('transform');

			this.minuteHandler = new Handler({
				src: $('.minutes .handler', $(options.el)),
				type: 'minutes',
				center: this.clockCenter
			});

			var width = $(options.el).width(),
				angle = 0;

			for (var i = 0, j = 3; i < 12; i++) {
				var num = (j++%12) || 12;
				$('<div class="container"><div class="tag"></div><span>' + num + '</span></div>').css(this.transformPrefix, "rotate("+angle+"deg)").appendTo(options.el);

				angle+=30;
			}

			this.onWindowResize();
			this.moveArrows();
		},
		
		bindEvents: function() {
			$(window).bind('move.minutes end.minutes', jQuery.proxy(this.onMinutesChange, this));
			$(window).bind('move.hours end.hours', jQuery.proxy(this.onHoursChange, this));

			$(document).bind('scrollstop', function(e){
				e.stopPropagation();
				e.stopImmediatePropagation();    
				scrollInProgress = false;    
			});
			$(document).bind('scrollstart', function(e){
				e.stopPropagation();
				e.stopImmediatePropagation();    
				scrollInProgress = true;    
			});

			$(window).resize(jQuery.proxy(this.onWindowResize, this));
		},

		moveArrows: function() {
			this.hourHandler.setTime(this.hours);
			this.minuteHandler.setTime(this.minutes/5);
		},

		setCenterPos: function() {
			this.clockCenter = {
				x: this.clock.offset().left + (this.clock.width()/2),
				y: this.clock.offset().top + (this.clock.height()/2)
			};
		},

		onWindowResize: function(event) {
			this.setCenterPos();
			this.minuteHandler.setCenter(this.clockCenter);
			this.hourHandler.setCenter(this.clockCenter);
		},

		onHoursChange: function(event, hours) {
			this.hours = hours;
		},

		onMinutesChange: function(event, minutes) {
			this.minutes = minutes;
		}
	};

	/* Trigo */
	var Trigo = {
		getSinusAngle: function(point1, point2) {
			var alpha = h = 0.0;

			if (point2.x < point1.x) {
				h = Math.sqrt((point1.x - point2.x)*(point1.x - point2.x) + (point1.y - point2.y)*(point1.y - point2.y)),
				alpha = Math.PI - Math.asin((point1.y - point2.y)/h);
			} else {
				h = Math.sqrt((point2.x - point1.x)*(point2.x - point1.x) + (point1.y - point2.y)*(point1.y - point2.y)),
				alpha = Math.asin((point1.y - point2.y)/h);
			}
			
			if (point2.y < point1.y)
				return "-" + alpha;
			else
				return "-" + (2 * Math.PI + alpha);
		},

		getNearestSinusAngleFrom: function(angle, idx) {	
			var dif = 10,
				nearestIndex = -1,
				testAngle = 0,
				temp = -1,
				i,
				max;

			angle = Math.abs(angle % 6);

			for (i = 0, max = this.lookup.length; i < max; i++) {
				testAngle = this.lookup[i],
				temp = Math.abs(angle - testAngle);

				if (temp < dif) {
					nearestIndex = i;
					dif = temp;
				}
			}

			if ((angle > Math.PI) && (angle < (3 * Math.PI)/2))
				nearestIndex += 1;

			return (idx !== undefined) ? nearestIndex : "-" + this.lookup[nearestIndex];
		},

		getAngleFromTime: function(time) {
			return -this.lookup[this.angles[time]];
		},

		getTimeFromAngle: function(angle, type) {
			var i,
				max;

			angle = Math.abs(angle);
			
			for (i = 0, max = this.lookup.length; i < max; i++) {
				if (angle == this.lookup[i]) {
					return (type == 'minutes') ? (5 * this.times[i]) % 60 : this.times[i];
				}
			}

			return -99;
		},

		lookup: [
			0,				// 360
			(11*Math.PI)/6,	// 330
			(5*Math.PI)/3,	// 300
			(3*Math.PI)/2,	// 270
			(4*Math.PI)/3,	// 240
			(7*Math.PI)/6,	// 210
			Math.PI,		// 180
			(5*Math.PI)/6,	// 150
			(2*Math.PI)/3,	// 120
			(Math.PI)/2,	// 90
			(Math.PI)/3,	// 60
			(Math.PI)/6		// 30
		],

		angles: [ 9, 10, 11, 0, 1, 2, 3, 4, 5, 6, 7, 8 ],

		times: [ 3, 4, 5, 6, 7, 8, 9, 10, 11, 0, 1, 2 ]
	};

	/* /Trigo */

	global.Clock = Clock;

})})(window);