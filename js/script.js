if (navigator.userAgent.match(/iPhone/i) || navigator.userAgent.match(/iPad/i)) {
	var viewportmeta = document.querySelectorAll('meta[name="viewport"]')[0];
	if (viewportmeta) {
		viewportmeta.content = 'width=device-width, minimum-scale=1.0, maximum-scale=1.0';
		document.body.addEventListener('gesturestart', function() {
			viewportmeta.content = 'width=device-width, minimum-scale=0.25, maximum-scale=1.6';
		}, false);
	}
}

$(function() {
	
	var buildFilmCover = function(key, val, pid, name, info) {
		if(val.critics_consensus)
			$('.film-shelf').find('.film-' + pid + ' .info').after('<p class="info">'+val.critics_consensus+'</p>');

		$('.film-shelf')
			.find('.film-' + pid)
				.append('<ul class="rating"><li><span class="barchart"><img src="img/bar.png" height="10" width="' + val.ratings.critics_score + '%" /></span><span>Critics rating: <b>'+val.ratings.critics_rating+ '</b></span></li></ul>')
				.removeClass('no-img')
				.prepend('<img src="'+val.posters.profile+'" alt="" />')
			.find('.rating')
				.append('<li><span class="barchart"><img src="img/bar.png" height="10" width="' + val.ratings.audience_score + '%" /></span><span>Audience rating: <b>'+val.ratings.audience_rating+ '</b></span></li>').end()
			.find('h2')	
				.append(' <span>('+val.year+')</span>');

		if(val.alternate_ids) {
			$('.film-shelf').find('.film-' + pid + ' .info:last')
				.after('<p class="info"><a href="http://www.imdb.com/title/tt'+val.alternate_ids.imdb+'">Read more about <i>\''+name+'\'</i> on IMDb</a></p>');
		}
	};
	
	var getFilmDetails = function(name, pid) {
		//console.log('getting film: '+ name);
		$.ajax({
			url: "http://api.rottentomatoes.com/api/public/v1.0/movies.json?apikey=qaam9n2aqvnmppuuh3kt3p82&q="+name,
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
	
	var getProgrammeList = function(url, type) {
		//localStorage.clear();	
		//var programmeStore = JSON.parse(localStorage.getItem("progList"));
		
		//console.log(localStorage.progList);
		
		$.getJSON(url, function(data) {
			// cache response
			localStorage.setItem("progList", JSON.stringify(data));
			//console.log( JSON.stringify(data));

			var listOfIds = [];

			if(type=='broadcasts') dataType = data.broadcasts;
			else dataType = data.episodes;

			$.each(dataType, function(key, val) {
				var filmTitle = val.programme.title;
				var uniqueId = val.programme.pid;
				var serviceId;
				if(val.service)
					serviceId = val.service.id;
				else
					serviceId = 'iplayer';
				
				//check id not already used
				var filmAlreadyRendered = $.inArray(uniqueId, listOfIds) != -1;
				
				if(!filmAlreadyRendered) {
					listOfIds.push(uniqueId);
					$('.film-shelf').append('<li class="film-'+uniqueId+' ' + serviceId +' no-img"></li>');
					$('.film-shelf .film-'+uniqueId).append('<h2><a href="http://bbc.co.uk/programmes/'+val.programme.pid+'">' + val.programme.title + '</a></h2>');
					
					if(val.start) {
						$('.film-shelf .film-'+uniqueId+ ' h2')
							.after('<time>'+$.format.date(val.start, "dd MMM yyyy")+' (' +$.format.date(val.start, "HH:mm")+ ')</time>');
					}
					else {
						$('.film-shelf .film-'+uniqueId+ ' h2')
							.after('<time><a href="http://bbc.co.uk/programmes/'+val.programme.pid+'"><b>Watch now</b></a> ('+val.programme.media.availability+')</time>');
					}
					
					$('.film-shelf .film-'+uniqueId).append('<p class="info">'+val.programme.short_synopsis+'</p>')
					
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
							$('.film-shelf .film-'+uniqueId).append('<p class="info">'+synopsis+'</p>');
							$('.film-shelf').find('.film-' + uniqueId).prepend('<img src="http://www.bbc.co.uk/iplayer/images/episode/'+uniqueId+'_640_360.jpg" alt="" width="210px" />');
						});
					}
				}
				else {
					// just add in the new time
					if(val.start) {
						$('.film-shelf .film-'+uniqueId+ ' time:last')
							.after('<time>'+$.format.date(val.start, "dd MMM yyyy")+' (' +$.format.date(val.start, "HH:mm")+ ')</time>');
					}
				}
			});
		});	
	};

	var guideSection = function($this, heading, url, dataType) {
		$('.choice li').removeClass('current');
		$this.addClass('current');
		$('h1').text(heading);
		$('.film-shelf').remove();
		$('div[role=main]').append('<ul class="film-shelf"></ul>');
		getProgrammeList(url, dataType);
	};
				
	$('#tomorrow').click(function() {
		guideSection($(this), 'BBC films tomorrow', 'http://www.bbc.co.uk/tv/programmes/formats/films/schedules/tomorrow.json', 'broadcasts');
	});
	
	$('#today').click(function() {
		guideSection($(this), 'BBC films today', 'http://www.bbc.co.uk/tv/programmes/formats/films/schedules/today.json', 'broadcasts');
	});

	$('#now').click(function() {
		guideSection($(this), 'Films available now on iPlayer', 'http://www.bbc.co.uk/programmes/formats/films/player/episodes.json', 'episodes');
	});

	$('#sevendays').click(function() {
		guideSection($(this), 'BBC films in the next seven days', 'http://www.bbc.co.uk/tv/programmes/formats/films/schedules/upcoming.json', 'broadcasts');
	});
	
	$('#today').trigger('click');
	
});