/* Magic Mirror
 * Fetcher
 *
 * By Michael Teeuw http://michaelteeuw.nl
 * MIT Licensed.
 */

const FeedMe = require("feedme");
const request = require("request");
const iconv = require("iconv-lite");
const getUrls = require("get-urls");

/* Fetcher
 * Responsible for requesting an update on the set interval and broadcasting the data.
 *
 * attribute url string - URL of the news feed.
 * attribute reloadInterval number - Reload interval in milliseconds.
 * attribute logFeedWarnings boolean - Log warnings when there is an error parsing a news article.
 */

const Fetcher = function (url, reloadInterval, encoding, logFeedWarnings) {
	const self = this;
	if (reloadInterval < 1000) {
		reloadInterval = 1000;
	}

	let reloadTimer = null;
	let items = [];

	let fetchFailedCallback = function () {
	};
	let itemsReceivedCallback = function () {
	};

	/* private methods */

	/* fetchNews()
	 * Request the new items.
	 */

	const fetchNews = function () {

		console.log('[jc] In fetchNews');

		clearTimeout(reloadTimer);
		reloadTimer = null;
		items = [];

		const parser = new FeedMe();

		parser.on("item", function (item) {
			const title = item.title;
			let description = item.description || item.summary || item.content || "";
			let imageSearch = [
				item.description,
				item["content:encoded"],
				item.summary,
				item.content,
				item["media:content"] && item["media:content"].url,
				item["media:thumbnail"] && item["media:thumbnail"].url
			].filter(Boolean).join(" ");
			const pubdate = item.pubdate || item.published || item.updated || item["dc:date"];
			const url = item.url || item.link || "";


			//console.log("[jc] Title: " + title);
			//console.log("Description: " + description);
			//console.log("[jc] ImageSearch: " + imageSearch);
			//console.log("Pubdate: " + pubdate);
			//console.log("Url: " + url);
			//console.log("[jc] item: " + JSON.stringify(item, null, 2));
			if (title && pubdate) {
				const urlMatches = Array.from(getUrls(imageSearch));
				const qualityUrlMatches = [];
				urlMatches.filter(match => match.match(/\.(jpg|jpeg|png|gif|webp)(\?.*)?/i)).forEach(match => {
					qualityUrlMatches.push(
						match.replace(/(%27|%22|'|")$/, '')
						    .replace(",w=120,", ",w=400,")
							.replace("-thumbsmall-", "-thumb-"))
				});
				const cleanRegex = /(<([^>]+)>)/ig;
				description = description.toString().replace(cleanRegex, "");
				items.push({
					title: title,
					description: description,
					pubdate: pubdate,
					url: url,
					images: qualityUrlMatches
				});

				// if (qualityUrlMatches.length > 0) {
				// 	console.log("[jc] Found image URLs:", qualityUrlMatches);
				// }

			} else if (logFeedWarnings) {
				console.log("Can't parse feed item:");
				console.log(item);
				console.log("Title: " + title);
				console.log("Description: " + description);
				console.log("Pubdate: " + pubdate);
			}
		});

		parser.on("end", function () {
			console.log("[jc] end parsing - " + url);
			self.broadcastItems();
			scheduleTimer();
		});

		parser.on("error", function (error) {
			fetchFailedCallback(self, error);
			scheduleTimer();
		});

		const headers = {
			"User-Agent": "Mozilla/5.0 (Node.js " + Number(process.version.match(/^v(\d+\.\d+)/)[1]) + ") MagicMirror/" + global.version + " (https://github.com/MichMich/MagicMirror/)",
			"Cache-Control": "max-age=0, no-cache, no-store, must-revalidate",
			"Pragma": "no-cache"
		}

		request({uri: url, encoding: null, headers: headers})
			.on("error", function (error) {
				fetchFailedCallback(self, error);
				scheduleTimer();
			})
			.pipe(iconv.decodeStream(encoding)).pipe(parser);

	};

	/* scheduleTimer()
	 * Schedule the timer for the next update.
	 */
	var scheduleTimer = function () {
		console.log('[jc] Schedule update timer.');
		clearTimeout(reloadTimer);
		reloadTimer = setTimeout(function () {
			fetchNews();
		}, reloadInterval);
	};

	/* public methods */

	/* setReloadInterval()
	 * Update the reload interval, but only if we need to increase the speed.
	 *
	 * attribute interval number - Interval for the update in milliseconds.
	 */
	this.setReloadInterval = function (interval) {
		if (interval > 1000 && interval < reloadInterval) {
			reloadInterval = interval;
		}
	};

	/* startFetch()
	 * Initiate fetchNews();
	 */
	this.startFetch = function () {
		fetchNews();
	};

	/* broadcastItems()
	 * Broadcast the existing items.
	 */
	this.broadcastItems = function () {
		if (items.length <= 0) {
			//console.log('No items to broadcast yet.');
			return;
		}
		//console.log('Broadcasting ' + items.length + ' items.');
		itemsReceivedCallback(self);
	};

	this.onReceive = function (callback) {
		itemsReceivedCallback = callback;
	};

	this.onError = function (callback) {
		fetchFailedCallback = callback;
	};

	this.url = function () {
		return url;
	};

	this.items = function () {
		return items;
	};
};

module.exports = Fetcher;
