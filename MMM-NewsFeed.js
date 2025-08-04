/* global Module */

/* Magic Mirror
 * Module: MMM-NewsFeed
 *
 * By Stefan Nachtrab
 * MIT Licensed.
 */

Module.register("MMM-NewsFeed", {
	// Default module config.
	defaults: {
		feeds: [
			{
				title: "bild.de",
				url: "https://www.bild.de/rssfeeds/vw-home/vw-home-16725562,dzbildplus=true,sort=1,teaserbildmobil=false,view=rss2.bild.xml"
			}
		],
		showSourceTitle: true,
		showPublishDate: true,
		showImage: true,
		showDescription: true,
		truncDescription: true,
		lengthDescription: 500,
		hideLoading: false,
		reloadInterval: 5 * 60 * 1000, // every 5 minutes
		updateInterval: 30 * 1000, // every 30 seconds
		animationSpeed: 1.0 * 1000,
		maxNewsItems: 0, // 0 for unlimited
		ignoreOldItems: false,
		ignoreOlderThan: 2 * 24 * 60 * 60 * 1000, // 2 days
		logFeedWarnings: false
	},

	requiresVersion: "2.1.0", // Required version of MagicMirror

	getScripts: function () {
		return ["moment.js"];
	},
	// Define required translations.
	getTranslations: function () {
		return false;
	},
	start: function () {
		Log.info("[jc][news] Starting module: " + this.name);

		// Set locale.
		moment.locale(config.language);

		this.newsItems = [];
		this.loaded = false;
		this.activeItem = 0;
		this.updateTimer = null;  // Store the update interval timer
		this.isVisible = false;   // Track visibility state

		// Delay initial feed registration to ensure node helper is ready
		const self = this;
		setTimeout(function() {
			console.log("[jc][news] Registering feeds after delay");
			self.registerFeeds();
		}, 2000); // 2 second delay
	},

	// Listen for MMM-pages notifications
	notificationReceived: function (notification, payload, sender) {
		// We don't need to handle page change notifications!
		// MMM-pages will call show() and hide() for us automatically
	},

	// Override the show method (called when module becomes visible)
	show: function(speed, callback) {
		console.log("[jc][news] Module show() called - resuming updates");
		this.resumeUpdates();
		
		// Call the parent show method
		Module.prototype.show.call(this, speed, callback);
	},

	// Override the hide method (called when module becomes hidden)  
	hide: function(speed, callback) {
		console.log("[jc][news] Module hide() called - pausing updates");
		this.pauseUpdates();

		// see if this works; increase the activeItem on hide, so the next show starts with the next item
		this.activeItem++;
		
		// Call the parent hide method
		Module.prototype.hide.call(this, speed, callback);
	},

	// Pause news updates
	pauseUpdates: function () {
		console.log("[jc][news] Pausing news updates - timer exists:", !!this.updateTimer);
		if (this.updateTimer) {
			clearInterval(this.updateTimer);
			this.updateTimer = null;
			console.log("[jc][news] Timer cleared successfully");
		} else {
			console.log("[jc][news] No timer to clear");
		}
	},

	// Resume news updates
	resumeUpdates: function () {
		console.log("[jc][news] Resuming news updates - loaded:", this.loaded, "timer exists:", !!this.updateTimer);
		if (this.loaded && !this.updateTimer) {
			console.log("[jc][news] Starting new update timer");
			this.scheduleUpdateInterval();
		} else {
			console.log("[jc][news] Not starting timer - loaded:", this.loaded, "timer exists:", !!this.updateTimer);
		}
	},
	// Override socket notification handler.
	socketNotificationReceived: function (notification, payload) {
		if (notification === "MMM-NEWSFEED_NEWS_ITEMS") {
			Log.info("payload", payload);
			this.generateFeed(payload);

			if (!this.loaded) {
				this.scheduleUpdateInterval();
			}

			this.loaded = true;
		}
	},
	// Override dom generator.
	getDom: function () {
		const wrapper = document.createElement("div");

		if (this.activeItem >= this.newsItems.length) {
			this.activeItem = 0;
		}

		if (this.newsItems.length > 0) {
			const hasImage = this.config.showImage && this.newsItems[this.activeItem].images.length > 0;

			// Attribution (source and timestamp)
			if (this.config.showSourceTitle || this.config.showPublishDate) {
				const sourceAndTimestamp = document.createElement("div");
				sourceAndTimestamp.className = "light small dimmed";

				if (this.config.showSourceTitle && this.newsItems[this.activeItem].sourceTitle !== "") {
					sourceAndTimestamp.innerHTML = this.newsItems[this.activeItem].sourceTitle;
				}
				if (this.config.showSourceTitle && this.newsItems[this.activeItem].sourceTitle !== "" && this.config.showPublishDate) {
					sourceAndTimestamp.innerHTML += ", ";
				}
				if (this.config.showPublishDate) {
					sourceAndTimestamp.innerHTML += moment(new Date(this.newsItems[this.activeItem].pubdate)).fromNow();
				}
				if (this.config.showSourceTitle && this.newsItems[this.activeItem].sourceTitle !== "" || this.config.showPublishDate) {
					sourceAndTimestamp.innerHTML += ":";
				}

				wrapper.appendChild(sourceAndTimestamp);
			}

			// Headline
			const title = document.createElement("div");
			title.className = "bright medium light";
			title.innerHTML = this.newsItems[this.activeItem].title;
			wrapper.appendChild(title);

			if (hasImage) {
				// Container for image and description side by side
				const contentContainer = document.createElement("div");
				contentContainer.className = "content-container";
				
				// Image
				const imagePanel = document.createElement("div");
				imagePanel.className = "image-panel";
				const image = document.createElement("img");
				image.className = "news-image";
				image.src = this.newsItems[this.activeItem].images[0];
				imagePanel.appendChild(image);
				contentContainer.appendChild(imagePanel);

				// Description beside image
				if (this.config.showDescription) {
					const description = document.createElement("div");
					description.className = "description-beside-image small light";
					const txtDesc = this.newsItems[this.activeItem].description;
					description.innerHTML = (this.config.truncDescription ? (txtDesc.length > this.config.lengthDescription ? txtDesc.substring(0, this.config.lengthDescription) + "..." : txtDesc) : txtDesc);
					contentContainer.appendChild(description);
				}

				wrapper.appendChild(contentContainer);
			} else {
				// No image - description spans full width
				if (this.config.showDescription) {
					const description = document.createElement("div");
					description.className = "description-full-width small light";
					const txtDesc = this.newsItems[this.activeItem].description;
					description.innerHTML = (this.config.truncDescription ? (txtDesc.length > this.config.lengthDescription ? txtDesc.substring(0, this.config.lengthDescription) + "..." : txtDesc) : txtDesc);
					wrapper.appendChild(description);
				}
			}

			if (this.config.hideLoading) {
				this.show();
			}

		} else {
			if (this.config.hideLoading) {
				this.hide();
			} else {
				wrapper.innerHTML = this.translate("LOADING");
				wrapper.className = "small dimmed";
			}
		}

		return wrapper;
	},
	/* registerFeeds()
	 * registers the feeds to be used by the backend.
	 */
	registerFeeds: function () {
		this.config.feeds.forEach(feed => {
			//console.log("[jc] sending socket notification for:", feed.url);
			this.sendSocketNotification("MMM-NEWSFEED_ADD_FEED", {
				feed: feed,
				config: this.config
			});
		});
	},
	/* generateFeed()
	 * Generate an ordered list of items for this configured module.
	 *
	 * attribute feeds object - An object with feeds returned by the node helper.
	 */
	generateFeed: function (feeds) {
		let newsItems = [];
		for (const feed in feeds) {
			Log.info("feed", feed);
			const feedItems = feeds[feed];
			if (this.subscribedToFeed(feed)) {
				for (const item of feedItems) {
					item.sourceTitle = this.titleForFeed(feed);
					if (!(this.config.ignoreOldItems && ((Date.now() - new Date(item.pubdate)) > this.config.ignoreOlderThan))) {
						newsItems.push(item);
					}
				}
			}
		}
		newsItems.sort(function (a, b) {
			const dateA = new Date(a.pubdate);
			const dateB = new Date(b.pubdate);
			return dateB - dateA;
		});
		
		// Shuffle using Fisher-Yates
		for (let i = newsItems.length - 1; i > 0; i--) {
			const j = Math.floor(Math.random() * (i + 1));
			[newsItems[i], newsItems[j]] = [newsItems[j], newsItems[i]];
		}
    
		if (this.config.maxNewsItems > 0) {
			newsItems = newsItems.slice(0, this.config.maxNewsItems);
		}

		this.newsItems = newsItems;
	},
	/* subscribedToFeed(feedUrl)
		 * Check if this module is configured to show this feed.
		 *
		 * attribute feedUrl string - Url of the feed to check.
		 *
		 * returns bool
		 */
	subscribedToFeed: function (feedUrl) {
		for (const feed of this.config.feeds) {
			if (feed.url === feedUrl) {
				return true;
			}
		}
		return false;
	},
	/* titleForFeed(feedUrl)
		 * Returns title for a specific feed Url.
		 *
		 * attribute feedUrl string - Url of the feed to check.
		 *
		 * returns string
		 */
	titleForFeed: function (feedUrl) {
		for (const feed of this.config.feeds) {
			if (feed.url === feedUrl) {
				return feed.title || "";
			}
		}
		return "";
	},
	/* scheduleUpdateInterval()
	 * Schedule visual update.
	 */
	scheduleUpdateInterval: function () {
		const self = this;

		console.log("[jc][news] scheduleUpdateInterval called - clearing existing timer");
		// Clear any existing timer first
		if (this.updateTimer) {
			clearInterval(this.updateTimer);
		}

		self.updateDom(self.config.animationSpeed);

		console.log("[jc][news] Setting new update timer with interval:", this.config.updateInterval);
		this.updateTimer = setInterval(function () {
			console.log("[jc][news] Timer fired - advancing to next item");
			self.activeItem++;
			self.updateDom(self.config.animationSpeed);
		}, this.config.updateInterval);
		
		console.log("[jc][news] Timer set successfully, ID:", this.updateTimer);
	},
	getStyles: function () {
		return [
			"MMM-NewsFeed.css",
		];
	}
});
