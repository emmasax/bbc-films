$(function() {

	var ONE_HOUR = 60 * 60 * 1000;
	var SIX_HOURS = 60 * 60 * 6 * 1000;
	var TWELVE_HOURS = 60 * 60 * 12 * 1000;
	var ONE_SECOND = 1000;
	
	var buildFilmCover = function(val, pid, name, info) {
		if(val) {
			if(val.ratings.critics_score >= 0) {
				$('.film-shelf').find('.film-' + pid).find('.details')
					.append('<div class="rating"><img class="score" src="img/bar.png" height="20" width="' + val.ratings.critics_score + '%" /><p class="critic">'+val.ratings.critics_score + '% ' + val.ratings.critics_rating+ '</p></div>')
			}
		}
	};
	
	var getReview = function(name, pid) {
		$.ajax({
			url: "http://api.rottentomatoes.com/api/public/v1.0/movies.json?apikey=" + rottenTomsKey + "&q="+encodeURIComponent(name) + "&page_limit=10&page=1",
			dataType: "jsonp",
			success: function(data) {
				var info = '';
				var done = false;
				buildFilmCover(data.movies[0], pid, name, info);
			},
			error: function() {
				$('.film-shelf').find('.film-' + pid).append('<p>Couldn\'t find the review</p>');
			}
		});
	};	

	var outputFilmSleeves = function(data, type) {
		if(data.length == 0) {
			$('div[role=main]').append('<p class="film-shelf">No films</p>');
		}
		else {
			var filmShelf = $('<ul class="film-shelf" />');
			var listOfIds = [];
			
			$.each(data, function(key, val) {
				var filmTitle = val.programme.title;
				var uniqueId = val.programme.pid;
				var serviceId = 'iplayer';
				var iplayerBBC4 = false;
				if(val.service) serviceId = val.service.id;
				if(serviceId == 'iplayer' && val.programme.ownership.service.key == 'bbcfour') {
					iplayerBBC4 = true;
				}

				//check id not already used
				var filmAlreadyRendered = $.inArray(uniqueId, listOfIds) != -1;

				if(!filmAlreadyRendered) {
					listOfIds.push(uniqueId);

					filmShelf.append('<li class="film film-' + uniqueId + ' no-img"></li>');
					var film = filmShelf.find('.film-' + uniqueId);
					film.append('<a class="header-img" href="http://bbc.co.uk/programmes/'+val.programme.pid+'"><img class="channel" src="img/'+serviceId+'.png" width="64" alt="'+val.programme.ownership.service.title+'" /></a><div class="details"></div>');
          
          var details = film.find('.details');
          
          details.append('<h2>' + val.programme.title + '</h2>');

					if(val.start) {
						var showingAt = $.format.date(val.start, "HH:mm");
						if(selection != 'today' && selection != 'tomorrow') {
							showingAt = $.format.date(val.start, "HH:mm") + " - " + $.format.date(val.start, "D MMMM yyyy");
						}						
						film.find('.header-img').append('<p class="time"><time class="first">' + showingAt + '</time></p>');
					}
					else {
						film.find('.header-img').append('<p class="time"><time class="first">Watch now (' + val.programme.media.availability + ')</time></p>');
					}
					
					$.getJSON("http://www.bbc.co.uk/programmes/"+uniqueId+".json", function(data) {
						var synopsis = data.programme.short_synopsis;
						details.parent().removeClass('no-img');
						film.find('a:first')
							.prepend('<img class="hero" src="http://www.bbc.co.uk/iplayer/images/episode/' + uniqueId + '_640_360.jpg" alt="" width="320" />');
            details.append('<p class="synopsis">' + synopsis + '</p>');
            
            // Related links
            // if(data.programme.links.length > 0) {
            //   details.append('<ul class="related"></ul>');
            //   $.each(data.programme.links, function(key, val) {
            //     if((val.title).indexOf(data.programme.title) != -1) {
            //       details.find('.related').append('<li><a href="'+val.url+'">'+val.title+'</a></li>');
            //     }
            //   });
            // }
            
					});
          
          getReview(val.programme.title, uniqueId)
				}
				else {
					// just add in the new time
					if(val.start) {
						var showingAt = $.format.date(val.start, "HH:mm");
						if(selection != 'today' && selection != 'tomorrow')
							showingAt = $.format.date(val.start, "HH:mm") + " - " + $.format.date(val.start, "dd MMM yyyy");
						filmShelf.find('.film-' + uniqueId + ' time:last')
							.after('<time>' + showingAt + '</time>');
					}
				}
			});
			$('div[role=main]').append(filmShelf);
		}
	};
	
	var updateTimestamp = function() {
		var currentDate = new Date();
		localStorage.setItem('timestamp_' + selection, currentDate.getTime());
	};
	
	var fresh = function() {
		var timestamp = localStorage.getItem('timestamp_' + selection);
		if(timestamp) {
			var currentDate = new Date();
			var currentTime = currentDate.getTime();
			return (currentTime - timestamp) < ONE_HOUR;
		}
		else
			return false;
	};
	
	var getData = function(url, type) {
		var filmData = localStorage.getItem(selection);
		
    // if(!filmData || !fresh()) {
		$.getJSON(url, function(data) {
			filmData = data.broadcasts;
			if(type == 'episodes') filmData = data.episodes;
			outputFilmSleeves(filmData);
			localStorage.setItem(selection, JSON.stringify(filmData));
			updateTimestamp();
		});			
    // }
    // else {
    //   outputFilmSleeves($.parseJSON(filmData));
    // }
	};

	//var selection = $('header option:selected').val();
	var selection = 'sevendays';
	
	$('header select').change(function() {
		var selected = $(this).find('option:selected');
		selection = selected.val();

		$('.film-shelf').remove();
		switch(selection) {
			case 'now':
				getData('http://www.bbc.co.uk/programmes/formats/films/player/episodes.json', 'episodes');
				break;
			case 'today':
				getData('http://www.bbc.co.uk/tv/programmes/formats/films/schedules/today.json', 'broadcasts');
				break;
			case 'tomorrow':
				getData('http://www.bbc.co.uk/tv/programmes/formats/films/schedules/tomorrow.json', 'broadcasts');
				break;
			default:
				selected.attr('selected', true);
				getData('http://www.bbc.co.uk/tv/programmes/formats/films/schedules/upcoming.json', 'broadcasts');
		}
	});
	
	$('header select').trigger('change');
	
	$('#clear').click(function() {
		localStorage.clear();
		alert('cleared');
	});
	
});