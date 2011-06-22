$(function() {

	var ONE_DAY = 60 * 60 * 24 * 1000; // 86,400,000 milliseconds
	var ONE_SECOND = 1000;
	
	var buildFilmCover = function(key, val, pid, name, info) {
		if(val.critics_consensus)
			$('.film-shelf').find('.film-' + pid + ' .info').after('<p class="info">'+val.critics_consensus+'</p>');

		$('.film-shelf')
			.find('.film-' + pid + ' div')
				.append('<ul class="rating"><li><img class="score" src="img/bar.png" height="20" width="' + val.ratings.critics_score + '%" /><img src="img/star-rating.png" height="20" width="140px" /></li><li><b>'+val.ratings.critics_rating+ '</b></li></ul>')
				.removeClass('no-img')
			.find('a:first')
				.html('<img src="'+val.posters.profile+'" alt="" />')
			.find('h2')	
				.append(' <span>('+val.year+')</span>');

		if(val.alternate_ids) {
			$('.film-shelf').find('.film-' + pid + ' .info:last')
				.after('<p class="info"><a href="http://www.imdb.com/title/tt'+val.alternate_ids.imdb+'">Read more about <i>\''+name+'\'</i> on IMDb</a></p>');
		}
	};
	
	var getFilmDetails = function(name, pid) {
		$.ajax({
			url: "http://api.rottentomatoes.com/api/public/v1.0/movies.json?apikey=" + rottenTomsKey + "&q="+name,
			dataType: "jsonp",
			success: function(data) {
				var info = '';
				var done = false;
				$.each(data.movies, function(key, val) {
					if(val.title == name && !done) {
						buildFilmCover(key, val, pid, name, info);
						done = true;
					}
				});
			},
			error: function() {
				$('.film-shelf').find('.film-' + pid).append('<p>Couldn\'t find the film info</p>');
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
				if(val.service) serviceId = val.service.id;

				//check id not already used
				var filmAlreadyRendered = $.inArray(uniqueId, listOfIds) != -1;

				if(!filmAlreadyRendered) {
					listOfIds.push(uniqueId);
					filmShelf.append('<li class="film-' + uniqueId + ' no-img"><div class="' + serviceId + '" data-id="'+val.programme.pid+'"></div></li>');
					var film = filmShelf.find('.film-' + uniqueId + ' div');
					film.append('<a class="header-img" href="http://bbc.co.uk/programmes/'+val.programme.pid+'"></a>')
						.append('<h2>' + val.programme.title + '</h2>')
						.append('<p class="info">' + val.programme.short_synopsis + '</p>');
						
					var filmHeader = filmShelf.find('.film-' + uniqueId + ' h2');

					if(val.start) {
						var showingAt = $.format.date(val.start, "HH:mm");
						if(selection != 'today' && selection != 'tomorrow')
							showingAt = $.format.date(val.start, "dd MMM yyyy") + ' at ' + $.format.date(val.start, "HH:mm");
						
						filmHeader.after('<time>' + showingAt + '</time>');
					}
					else
						filmHeader.after('<time><a href="http://bbc.co.uk/programmes/' + val.programme.pid + '"><b>Watch now</b></a> (' + val.programme.media.availability + ')</time>');
					
					if(serviceId != 'bbc_hd') {
						getFilmDetails(filmTitle, uniqueId);
					}
					else {
						// get bbc hd film info
						$.getJSON("http://www.bbc.co.uk/programmes/"+uniqueId+".json", function(data) {
							var synopsis;
							if(data.programme.long_synopsis) synopsis = data.programme.long_synopsis;
							else if(data.programme.medium_synopsis) synopsis = data.programme.medium_synopsis;
							else if(data.programme.short_synopsis) synopsis = data.programme.short_synopsis;
							film.find('a:first')
								.html('<img src="http://www.bbc.co.uk/iplayer/images/episode/' + uniqueId + '_640_360.jpg" alt="" width="210px" />')
								.append('<p class="info">' + synopsis + '</p>');
						});
					}
				}
				else {
					// just add in the new time
					if(val.start) {
						var showingAt = $.format.date(val.start, "HH:mm");
						if(selection != 'today' && selection != 'tomorrow')
							showingAt = $.format.date(val.start, "dd MMM yyyy") + ' at ' + $.format.date(val.start, "HH:mm");
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
			//console.log('timestamp fresh? ' + ((currentTime - timestamp) < ONE_DAY));
//			return (currentTime - timestamp) < ONE_SECOND;
			return (currentTime - timestamp) < ONE_DAY;
		}
		else
			return false;
	};
	
	var getData = function(url, type) {
		var filmData = localStorage.getItem(selection);
		
		if(!filmData || !fresh()) {
			//console.log('getting api');
			$.getJSON(url, function(data) {
				filmData = data.broadcasts;
				if(type == 'episodes') filmData = data.episodes;
				outputFilmSleeves(filmData);
				localStorage.setItem(selection, JSON.stringify(filmData));
				updateTimestamp();
			});			
		}
		else {
			console.log('using storage');
			outputFilmSleeves($.parseJSON(filmData));
		}
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
	
	$('.film-shelf a.header-img').click(function(ev) {
		ev.preventDefault();
		var popupId = $(this).closest('li div').attr('data-id');

		var filmPopup = $('li.film-' + popupId + ' div').clone();
		
		filmPopup.dialog({
			title: filmPopup.find('h2'),
			width: '500',
			height: '280',
			modal: true,
			closeText: 'X'
		});
	});
	
});