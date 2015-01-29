// ui_data
// base variables initialization
ui_data.init = function() {
	this.currentVersion = '$VERSION';
	this.isBattle = worker.so.state.is_fighting();
	this.isDungeon = worker.so.state.fight_type() === 'dungeon';
	this.god_name = worker.so.state.stats.godname.value;
	this.char_name = worker.so.state.stats.name.value;
	this.char_sex = worker.so.state.stats.gender.value === 'male' ? worker.GUIp_i18n.hero : worker.GUIp_i18n.heroine;
	ui_storage.set('ui_s', '');
	worker.localStorage.GUIp_CurrentUser = this.god_name;
	if (worker.so.state.bricks_cnt() === 1000) {
		document.body.classList.add('has_temple');
		this.hasTemple = true;
	}

	// init mobile cookies
	worker.document.cookie = 'm_f=1';
	worker.document.cookie = 'm_pp=1';
	worker.document.cookie = 'm_fl=1';

	// init forum data
	if (!ui_storage.get('Forum1')) {
		if (worker.GUIp_locale === 'ru') {
			ui_storage.set('Forum1', '{}');
			ui_storage.set('Forum2', '{"2812": 0}');
			ui_storage.set('Forum3', '{}');
			ui_storage.set('Forum4', '{}');
			ui_storage.set('Forum5', '{}');
			ui_storage.set('Forum6', '{}');
			ui_storage.set('ForumInformers', '{}');

			// clear old data
			worker.localStorage.removeItem('GUIp_' + this.god_name + ':posts');
			worker.localStorage.removeItem('GUIp_Options:User');
			var informer_flags = ui_storage.get('informer_flags') && JSON.parse(ui_storage.get('informer_flags')) || null;
			if (informer_flags) {
				delete informer_flags['new posts'];
				ui_storage.set('informer_flags', JSON.stringify(informer_flags));
			}
		} else {
			ui_storage.set('Forum1', '{"2800": 0}');
			ui_storage.set('Forum2', '{}');
			ui_storage.set('Forum3', '{}');
			ui_storage.set('Forum4', '{}');
			ui_storage.set('ForumInformers', '{}');
		}
	}

	if (!this.isBattle && !this.isDungeon) {
		for (var i = 0, lines = [], len = worker.localStorage.length; i < len; i++) {
			if (worker.localStorage.key(i).match(/Dungeon:/)) {
				lines.push(worker.localStorage.key(i));
			}
		}
		for (i = 0, len = lines.length; i < len; i++) {
			worker.localStorage.removeItem(lines[i]);
		}
	}

	this._getLEMRestrictions();
	worker.setInterval(this._getLEMRestrictions, 60*60*1000);

	this._getWantedMonster();
	worker.setInterval(this._getWantedMonster, 5*60*1000);

	this._sendPing();
	worker.setInterval(this._sendPing, 60*60*1000);
};
ui_data._getLEMRestrictions = function() {
	if (isNaN(ui_storage.get('LEMRestrictions:Date')) || Date.now() - ui_storage.get('LEMRestrictions:Date') > 24*60*60*1000) {
		ui_utils.getXHR('http://www.godalert.info/Dungeons/guip.cgi', ui_data._parseLEMRestrictions);
	}
};
ui_data._parseLEMRestrictions = function(xhr) {
	var restrictions = JSON.parse(xhr.responseText);
	ui_storage.set('LEMRestrictions:Date', Date.now());
	ui_storage.set('LEMRestrictions:FirstRequest', restrictions.first_request);
	ui_storage.set('LEMRestrictions:TimeFrame', restrictions.time_frame);
	ui_storage.set('LEMRestrictions:RequestLimit', restrictions.request_limit);
};
ui_data._getWantedMonster = function() {
	if (isNaN(ui_storage.get('WantedMonster:Date')) ||
		ui_utils.dateToMoscowTimeZone(+ui_storage.get('WantedMonster:Date')) < ui_utils.dateToMoscowTimeZone(Date.now())) {
		ui_utils.getXHR('/news', ui_data._parseWantedMonster);
	} else {
		ui_improver.wantedMonsters = new RegExp(ui_storage.get('WantedMonster:Value'));
	}
};
ui_data._parseWantedMonster = function(xhr) {
	var temp = xhr.responseText.match(/(?:Разыскиваются|Wanted)[\s\S]+?>([^<]+?)<\/a>[\s\S]+?>([^<]+?)<\/a>/),
		newWantedMonster = temp ? temp[1] + '|' + temp[2] : '';
	if (newWantedMonster !== ui_storage.get('WantedMonster:Value')) {
		ui_storage.set('WantedMonster:Date', Date.now());
		ui_storage.set('WantedMonster:Value', newWantedMonster);
		ui_improver.wantedMonsters = new RegExp(newWantedMonster);
	}
};
ui_data._sendPing = function() {
	if (isNaN(ui_storage.get('lastPing')) ||
		ui_utils.dateToMoscowTimeZone(+ui_storage.get('lastPing')) < ui_utils.dateToMoscowTimeZone(Date.now())) {

		if (!worker.localStorage.GUIp_id) {
			var id;
			do {
				id = Math.random().toString(36).replace(/[^a-z0-9]+/g, '').substr(1, 10);
			} while (id.length < 10);
			worker.localStorage.GUIp_id = id;
		}

		var ping_url = 'http://guip.pe.hu/counter.php?date=' + ui_utils.dateToMoscowTimeZone(Date.now()).replace(/\//g, '-') +
													'&godname=' + ui_data.god_name +
													'&locale=' + worker.GUIp_locale +
													'&system=' + (worker.navigator.appVersion.match(/Windows|Linux|Android/)[0] || 'Other') +
													'&browser=' + worker.GUIp_browser +
													'&id=' + worker.localStorage.GUIp_id;
		ui_utils.getXHR(ping_url, ui_data._parsePing);
	}
};
ui_data._parsePing = function(xhr) {
	if (xhr.responseText.match(/Ping successful\./)) {
		ui_storage.set('lastPing', Date.now());
	}
};
