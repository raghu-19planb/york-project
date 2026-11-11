// Story mode. A page opened with ?short in its address shows only its animation, filling the window, so it can
// sit in the tall frame of the story player on the home page (stories.js): the shape of a phone held upright.
// This runs in the <head>, before the page is drawn, so nothing else is seen first.
if (new URLSearchParams(location.search).has('short')) document.documentElement.classList.add('short');
