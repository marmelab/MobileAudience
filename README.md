MobileAudience
==============

This Mobile Webapp is a proof-of-concept of mixing D3.js with a touch UI. The application shows TV audience and market shares for 8 TV channels across several days. The UI accepts touch gestures like tap to select, drag to scroll, pinch to zoom, and swipe to change day. The interface is in French, and the data is fake.

[Demo](http://marmelab.github.io/MobileAudience/)

<a href="http://vimeo.com/67210593"><img alt="D3.js on mobile devices: TV Audience webapp demo" title="D3.js on mobile devices: TV Audience webapp demo" src="http://marmelab.com/img/MobileAudience.png"></a>

Made with D3.js, Bootstrap 3, jQuery 2, hammer.js, and a few other JS libs. The Data is purely fictionnal.

Purpose
-------

Is it possible to use the power of D3.js to manipulate visually attractive and interactive data visualizations on mobile devices? Is is possible to create a webapp providing a rich user experience, supporting native mobile gestures, and with acceptable performance? This project is there to answer these questions.

Discoveries
-----------

* Don't use SVG on D3.js. Performance is abysmall on Mobile devices. Instead, use HTML (divs) and CSS.
* Don't try to reimplement zoom using iScroll. Performance is poor on old mobile devices, and on heavy pages. Instead, rely on native zoom.
* Use fastclick to get a more responsive app
* Don't use a fancy layout with movable sidebars and fixed headers if you intend to have one pane supporting zoom. Make the layour simple.
* Prepare for a looong period of testing

Authors
-------

* [François Zaninotto](https://github.com/fzaninotto)
* [Emmanuel Quentin](https://github.com/manuquentin) 
* Proudly sponsored by [marmelab](marmelab.com)

TODO
----

* Android compatibility