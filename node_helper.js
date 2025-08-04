/* Magic Mirror
 * Node Helper: Newsfeed
 *
 * By Michael Teeuw http://michaelteeuw.nl
 * MIT Licensed.
 */

const NodeHelper = require("node_helper");
const validUrl = require("valid-url");
const Fetcher = require("./fetcher.js");

module.exports = NodeHelper.create({
	// Subclass start method.
	start: function () {
		console.log("Starting module: " + this.name);
		this.fetchers = [];
	},

	// Subclass socketNotificationReceived received.
	socketNotificationReceived: function (notification, payload) {
		if (notification === "MMM-NEWSFEED_ADD_FEED") {
			//console.log("[jc] socketNotificationReceived: " + notification);
			this.createFetcher(payload.feed, payload.config);
			return;
		}
	},

	/* createFetcher(feed, config)
	 * Creates a fetcher for a new feed if it doesn't exist yet.
	 * Otherwise it reuses the existing one.
	 *
	 * attribute feed object - A feed object.
	 * attribute config object - A configuration object containing reload interval in milliseconds.
	 */
	createFetcher: function (feed, config) {
		const self = this;

		const url = feed.url || "";
		const encoding = feed.encoding || "UTF-8";
		const reloadInterval = feed.reloadInterval || config.reloadInterval || 5 * 60 * 1000;

		if (!validUrl.isUri(url)) {
			self.sendSocketNotification("MMM-NEWSFEED_INCORRECT_URL", url);
			return;
		}

		let fetcher;
		if (typeof self.fetchers[url] === "undefined") {
			//console.log("[jc] Create new news fetcher for url: " + url + " - Interval: " + reloadInterval);
			fetcher = new Fetcher(url, reloadInterval, encoding, config.logFeedWarnings);

			fetcher.onReceive(function (fetcher) {
				self.broadcastFeeds();
			});

			fetcher.onError(function (fetcher, error) {
				self.sendSocketNotification("MMM-NEWSFEED_FETCH_ERROR", {
					url: fetcher.url(),
					error: error
				});
			});

			self.fetchers[url] = fetcher;
		} else {
			//console.log("[jc] Use existing news fetcher for url: " + url);
			fetcher = self.fetchers[url];
			fetcher.setReloadInterval(reloadInterval);
			fetcher.broadcastItems();
		}

		fetcher.startFetch();
	},

	/* broadcastFeeds()
	 * Creates an object with all feed items of the different registered feeds,
	 * and broadcasts these using sendSocketNotification.
	 */
	broadcastFeeds: function () {
		const feeds = {};
		for (let f in this.fetchers) {
			feeds[f] = this.fetchers[f].items();
		}

		this.sendSocketNotification("MMM-NEWSFEED_NEWS_ITEMS", feeds);
	}
});
