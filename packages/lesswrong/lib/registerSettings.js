import {registerSetting} from 'meteor/vulcan:core'

registerSetting('forumType', 'LessWrong', 'What type of Forum is being run, {LessWrong, AlignmentForum, EAForum}')

// HeadTags
registerSetting('logoUrl', null, 'Absolute URL for the logo image');
registerSetting('title', 'My App', 'App title');
registerSetting('tagline', null, 'App tagline');
registerSetting('description');
registerSetting('siteImage', null, 'An image used to represent the site on social media');
registerSetting('faviconUrl', '/img/favicon.ico', 'Favicon absolute URL');

// EventsPast.jsx
registerSetting('forum.numberOfDays', 5, 'Number of days to display in Daily view');

// Comments callbacks
registerSetting('forum.commentInterval', 15, 'How long users should wait in between comments (in seconds)');

// helpers.js
registerSetting('forum.outsideLinksPointTo', 'link', 'Whether to point RSS links to the linked URL (“link”) or back to the post page (“page”)');
registerSetting('forum.requirePostsApproval', false, 'Require posts to be approved manually');
registerSetting('twitterAccount', null, 'Twitter account associated with the app');
registerSetting('siteUrl', null, 'Main site URL');

// posts/schema.js
registerSetting('forum.postExcerptLength', 30, 'Length of posts excerpts in words');

// posts/callbacks/other.js
registerSetting('forum.trackClickEvents', true, 'Track clicks to posts pages');

// posts/callbacks/validation.js
registerSetting('forum.postInterval', 30, 'How long users should wait between each posts, in seconds');
registerSetting('forum.maxPostsPerDay', 5, 'Maximum number of posts a user can create in a day');

// robots.js
registerSetting('disallowCrawlers', false, 'Whether to serve a robots.txt that asks crawlers not to index');

// rss.js
registerSetting('forum.RSSLinksPointTo', 'link', 'Where to point RSS links to');