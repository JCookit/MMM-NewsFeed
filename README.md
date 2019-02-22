# MMM-NewsFeed

This is a module for the [MagicMirror²](https://github.com/MichMich/MagicMirror/).

You can display news from different RSS feeds.

## Installing the module

Clone this repository in your MagicMirror/modules folder.

```bash
cd ./MMM-NewsFeed
npm i
```

## Using the module

To use this module, add the following configuration block to the modules array in the `config/config.js` file:
```js
var config = {
    modules: [
        {
            module: 'MMM-NewsFeed',
            config: {
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
                updateInterval: 30 * 1000, //every 30 seconds
                animationSpeed: 2.5 * 1000,
                maxNewsItems: 0,
                ignoreOldItems: false,
                ignoreOlderThan: 2 * 24 * 60 * 60 * 1000, // 2 days
                logFeedWarnings: false
            }
        }
    ]
}
```

## Configuration options

| Option              | Description
|-------------------- |-----------
| `feeds`             | *Required* List of RSS feeds with a title and url. If you have trouble with encoding you can specify a different one wit the encoding-attribute.
| `showSourceTitle`   | *Optional* Boolean property to show the source of the feed (e. g. 'bild.de')
| `showPublishDate`   | *Optional* Boolean property to show the puplish date of the feed item (e. g. '11 hours ago')
| `showImage`         | *Optional* Boolean property. If the feed provides an image it will be displayed
| `showDescription`   | *Optional* Boolean property to show a description of the news item
| `truncDescription`  | *Optional* Boolean property to shorten the description if too long
| `lengthDescription` | *Optional* Integer value to define how many letters the description should contain
| `hideLoading`       | *Optional* Boolean property to hide the loading label on startup 
| `reloadInterval`    | *Optional* Integer value to reload the known RSS feeds
| `updateInterval`    | *Optional* Integer value of display duration of one news item
| `animationSpeed`    | *Optional* Integer value of the fading speed between news items
| `maxNewsItems`      | *Optional* Integer value of the maximum news items to load
| `ignoreOldItems`    | *Optional* Boolean property if older news items should be displayed
| `ignoreOlderThan`   | *Optional* Integer value for maximum age from news items
| `logFeedWarnings`   | *Optional* Boolean property for logging feed warnings when consuming


