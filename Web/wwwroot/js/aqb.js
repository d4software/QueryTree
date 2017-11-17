/*
 * jQuery UI Timepicker
 *
 * Copyright 2010-2013, Francois Gelinas
 * Dual licensed under the MIT or GPL Version 2 licenses.
 * http://jquery.org/license
 *
 * http://fgelinas.com/code/timepicker
 *
 * Depends:
 *	jquery.ui.core.js
 *  jquery.ui.position.js (only if position settings are used)
 *
 * Change version 0.1.0 - moved the t-rex up here
 *
                                                  ____
       ___                                      .-~. /_"-._
      `-._~-.                                  / /_ "~o\  :Y
          \  \                                / : \~x.  ` ')
           ]  Y                              /  |  Y< ~-.__j
          /   !                        _.--~T : l  l<  /.-~
         /   /                 ____.--~ .   ` l /~\ \<|Y
        /   /             .-~~"        /| .    ',-~\ \L|
       /   /             /     .^   \ Y~Y \.^>/l_   "--'
      /   Y           .-"(  .  l__  j_j l_/ /~_.-~    .
     Y    l          /    \  )    ~~~." / `/"~ / \.__/l_
     |     \     _.-"      ~-{__     l  :  l._Z~-.___.--~
     |      ~---~           /   ~~"---\_  ' __[>
     l  .                _.^   ___     _>-y~
      \  \     .      .-~   .-~   ~>--"  /
       \  ~---"            /     ./  _.-'
        "-.,_____.,_  _.--~\     _.-~
                    ~~     (   _}       -Row
                           `. ~(
                             )  \
                            /,`--'~\--'~\
                  ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
                             ->T-Rex<-
*/

(function ($) {

    $.extend($.ui, { timepicker: { version: "0.3.3"} });

    var PROP_NAME = 'timepicker',
        tpuuid = new Date().getTime();

    /* Time picker manager.
    Use the singleton instance of this class, $.timepicker, to interact with the time picker.
    Settings for (groups of) time pickers are maintained in an instance object,
    allowing multiple different settings on the same page. */

    function Timepicker() {
        this.debug = true; // Change this to true to start debugging
        this._curInst = null; // The current instance in use
        this._disabledInputs = []; // List of time picker inputs that have been disabled
        this._timepickerShowing = false; // True if the popup picker is showing , false if not
        this._inDialog = false; // True if showing within a "dialog", false if not
        this._dialogClass = 'ui-timepicker-dialog'; // The name of the dialog marker class
        this._mainDivId = 'ui-timepicker-div'; // The ID of the main timepicker division
        this._inlineClass = 'ui-timepicker-inline'; // The name of the inline marker class
        this._currentClass = 'ui-timepicker-current'; // The name of the current hour / minutes marker class
        this._dayOverClass = 'ui-timepicker-days-cell-over'; // The name of the day hover marker class

        this.regional = []; // Available regional settings, indexed by language code
        this.regional[''] = { // Default regional settings
            hourText: 'Hour',           // Display text for hours section
            minuteText: 'Minute',       // Display text for minutes link
            amPmText: ['AM', 'PM'],     // Display text for AM PM
            closeButtonText: 'Done',        // Text for the confirmation button (ok button)
            nowButtonText: 'Now',           // Text for the now button
            deselectButtonText: 'Deselect'  // Text for the deselect button
        };
        this._defaults = { // Global defaults for all the time picker instances
            showOn: 'focus',    // 'focus' for popup on focus,
                                // 'button' for trigger button, or 'both' for either (not yet implemented)
            button: null,                   // 'button' element that will trigger the timepicker
            showAnim: 'fadeIn',             // Name of jQuery animation for popup
            showOptions: {},                // Options for enhanced animations
            appendText: '',                 // Display text following the input box, e.g. showing the format

            beforeShow: null,               // Define a callback function executed before the timepicker is shown
            onSelect: null,                 // Define a callback function when a hour / minutes is selected
            onClose: null,                  // Define a callback function when the timepicker is closed

            timeSeparator: ':',             // The character to use to separate hours and minutes.
            periodSeparator: ' ',           // The character to use to separate the time from the time period.
            showPeriod: false,              // Define whether or not to show AM/PM with selected time
            showPeriodLabels: true,         // Show the AM/PM labels on the left of the time picker
            showLeadingZero: true,          // Define whether or not to show a leading zero for hours < 10. [true/false]
            showMinutesLeadingZero: true,   // Define whether or not to show a leading zero for minutes < 10.
            altField: '',                   // Selector for an alternate field to store selected time into
            defaultTime: 'now',             // Used as default time when input field is empty or for inline timePicker
                                            // (set to 'now' for the current time, '' for no highlighted time)
            myPosition: 'left top',         // Position of the dialog relative to the input.
                                            // see the position utility for more info : http://jqueryui.com/demos/position/
            atPosition: 'left bottom',      // Position of the input element to match
                                            // Note : if the position utility is not loaded, the timepicker will attach left top to left bottom
            //NEW: 2011-02-03
            onHourShow: null,			    // callback for enabling / disabling on selectable hours  ex : function(hour) { return true; }
            onMinuteShow: null,             // callback for enabling / disabling on time selection  ex : function(hour,minute) { return true; }

            hours: {
                starts: 0,                  // first displayed hour
                ends: 23                    // last displayed hour
            },
            minutes: {
                starts: 0,                  // first displayed minute
                ends: 55,                   // last displayed minute
                interval: 5,                // interval of displayed minutes
                manual: []                  // optional extra manual entries for minutes
            },
            rows: 4,                        // number of rows for the input tables, minimum 2, makes more sense if you use multiple of 2
            // 2011-08-05 0.2.4
            showHours: true,                // display the hours section of the dialog
            showMinutes: true,              // display the minute section of the dialog
            optionalMinutes: false,         // optionally parse inputs of whole hours with minutes omitted

            // buttons
            showCloseButton: false,         // shows an OK button to confirm the edit
            showNowButton: false,           // Shows the 'now' button
            showDeselectButton: false,       // Shows the deselect time button
            
            maxTime: {
                hour: null,
                minute: null
            },
            minTime: {
                hour: null,
                minute: null
            }
			
        };
        $.extend(this._defaults, this.regional['']);

        this.tpDiv = $('<div id="' + this._mainDivId + '" class="ui-timepicker ui-widget ui-helper-clearfix ui-corner-all " style="display: none"></div>');
    }

    $.extend(Timepicker.prototype, {
        /* Class name added to elements to indicate already configured with a time picker. */
        markerClassName: 'hasTimepicker',

        /* Debug logging (if enabled). */
        log: function () {
            if (this.debug)
                console.log.apply('', arguments);
        },

        _widgetTimepicker: function () {
            return this.tpDiv;
        },

        /* Override the default settings for all instances of the time picker.
        @param  settings  object - the new settings to use as defaults (anonymous object)
        @return the manager object */
        setDefaults: function (settings) {
            extendRemove(this._defaults, settings || {});
            return this;
        },

        /* Attach the time picker to a jQuery selection.
        @param  target    element - the target input field or division or span
        @param  settings  object - the new settings to use for this time picker instance (anonymous) */
        _attachTimepicker: function (target, settings) {
            // check for settings on the control itself - in namespace 'time:'
            var inlineSettings = null;
            for (var attrName in this._defaults) {
                var attrValue = target.getAttribute('time:' + attrName);
                if (attrValue) {
                    inlineSettings = inlineSettings || {};
                    try {
                        inlineSettings[attrName] = eval(attrValue);
                    } catch (err) {
                        inlineSettings[attrName] = attrValue;
                    }
                }
            }
            var nodeName = target.nodeName.toLowerCase();
            var inline = (nodeName == 'div' || nodeName == 'span');

            if (!target.id) {
                this.uuid += 1;
                target.id = 'tp' + this.uuid;
            }
            var inst = this._newInst($(target), inline);
            inst.settings = $.extend({}, settings || {}, inlineSettings || {});
            if (nodeName == 'input') {
                this._connectTimepicker(target, inst);
                // init inst.hours and inst.minutes from the input value
                this._setTimeFromField(inst);
            } else if (inline) {
                this._inlineTimepicker(target, inst);
            }


        },

        /* Create a new instance object. */
        _newInst: function (target, inline) {
            var id = target[0].id.replace(/([^A-Za-z0-9_-])/g, '\\\\$1'); // escape jQuery meta chars
            return {
                id: id, input: target, // associated target
                inline: inline, // is timepicker inline or not :
                tpDiv: (!inline ? this.tpDiv : // presentation div
                    $('<div class="' + this._inlineClass + ' ui-timepicker ui-widget  ui-helper-clearfix"></div>'))
            };
        },

        /* Attach the time picker to an input field. */
        _connectTimepicker: function (target, inst) {
            var input = $(target);
            inst.append = $([]);
            inst.trigger = $([]);
            if (input.hasClass(this.markerClassName)) { return; }
            this._attachments(input, inst);
            input.addClass(this.markerClassName).
                keydown(this._doKeyDown).
                keyup(this._doKeyUp).
                bind("setData.timepicker", function (event, key, value) {
                    inst.settings[key] = value;
                }).
                bind("getData.timepicker", function (event, key) {
                    return this._get(inst, key);
                });
            $.data(target, PROP_NAME, inst);
        },

        /* Handle keystrokes. */
        _doKeyDown: function (event) {
            var inst = $.timepicker._getInst(event.target);
            var handled = true;
            inst._keyEvent = true;
            if ($.timepicker._timepickerShowing) {
                switch (event.keyCode) {
                    case 9: $.timepicker._hideTimepicker();
                        handled = false;
                        break; // hide on tab out
                    case 13:
                        $.timepicker._updateSelectedValue(inst);
                        $.timepicker._hideTimepicker();

						return false; // don't submit the form
						break; // select the value on enter
                    case 27: $.timepicker._hideTimepicker();
                        break; // hide on escape
                    default: handled = false;
                }
            }
            else if (event.keyCode == 36 && event.ctrlKey) { // display the time picker on ctrl+home
                $.timepicker._showTimepicker(this);
            }
            else {
                handled = false;
            }
            if (handled) {
                event.preventDefault();
                event.stopPropagation();
            }
        },

        /* Update selected time on keyUp */
        /* Added verion 0.0.5 */
        _doKeyUp: function (event) {
            var inst = $.timepicker._getInst(event.target);
            $.timepicker._setTimeFromField(inst);
            $.timepicker._updateTimepicker(inst);
        },

        /* Make attachments based on settings. */
        _attachments: function (input, inst) {
            var appendText = this._get(inst, 'appendText');
            var isRTL = this._get(inst, 'isRTL');
            if (inst.append) { inst.append.remove(); }
            if (appendText) {
                inst.append = $('<span class="' + this._appendClass + '">' + appendText + '</span>');
                input[isRTL ? 'before' : 'after'](inst.append);
            }
            input.unbind('focus.timepicker', this._showTimepicker);
            input.unbind('click.timepicker', this._adjustZIndex);

            if (inst.trigger) { inst.trigger.remove(); }

            var showOn = this._get(inst, 'showOn');
            if (showOn == 'focus' || showOn == 'both') { // pop-up time picker when in the marked field
                input.bind("focus.timepicker", this._showTimepicker);
                input.bind("click.timepicker", this._adjustZIndex);
            }
            if (showOn == 'button' || showOn == 'both') { // pop-up time picker when 'button' element is clicked
                var button = this._get(inst, 'button');

                // Add button if button element is not set
                if(button == null) {
                    button = $('<button class="ui-timepicker-trigger" type="button">...</button>');
                    input.after(button);
                }

                $(button).bind("click.timepicker", function () {
                    if ($.timepicker._timepickerShowing && $.timepicker._lastInput == input[0]) {
                        $.timepicker._hideTimepicker();
                    } else if (!inst.input.is(':disabled')) {
                        $.timepicker._showTimepicker(input[0]);
                    }
                    return false;
                });

            }
        },


        /* Attach an inline time picker to a div. */
        _inlineTimepicker: function(target, inst) {
            var divSpan = $(target);
            if (divSpan.hasClass(this.markerClassName))
                return;
            divSpan.addClass(this.markerClassName).append(inst.tpDiv).
                bind("setData.timepicker", function(event, key, value){
                    inst.settings[key] = value;
                }).bind("getData.timepicker", function(event, key){
                    return this._get(inst, key);
                });
            $.data(target, PROP_NAME, inst);

            this._setTimeFromField(inst);
            this._updateTimepicker(inst);
            inst.tpDiv.show();
        },

        _adjustZIndex: function(input) {
            input = input.target || input;
            var inst = $.timepicker._getInst(input);
            inst.tpDiv.css('zIndex', $.timepicker._getZIndex(input) +1);
        },

        /* Pop-up the time picker for a given input field.
        @param  input  element - the input field attached to the time picker or
        event - if triggered by focus */
        _showTimepicker: function (input) {
            input = input.target || input;
            if (input.nodeName.toLowerCase() != 'input') { input = $('input', input.parentNode)[0]; } // find from button/image trigger

            if ($.timepicker._isDisabledTimepicker(input) || $.timepicker._lastInput == input) { return; } // already here

            // fix v 0.0.8 - close current timepicker before showing another one
            $.timepicker._hideTimepicker();

            var inst = $.timepicker._getInst(input);
            if ($.timepicker._curInst && $.timepicker._curInst != inst) {
                $.timepicker._curInst.tpDiv.stop(true, true);
            }
            var beforeShow = $.timepicker._get(inst, 'beforeShow');
            extendRemove(inst.settings, (beforeShow ? beforeShow.apply(input, [input, inst]) : {}));
            inst.lastVal = null;
            $.timepicker._lastInput = input;

            $.timepicker._setTimeFromField(inst);

            // calculate default position
            if ($.timepicker._inDialog) { input.value = ''; } // hide cursor
            if (!$.timepicker._pos) { // position below input
                $.timepicker._pos = $.timepicker._findPos(input);
                $.timepicker._pos[1] += input.offsetHeight; // add the height
            }
            var isFixed = false;
            $(input).parents().each(function () {
                isFixed |= $(this).css('position') == 'fixed';
                return !isFixed;
            });

            var offset = { left: $.timepicker._pos[0], top: $.timepicker._pos[1] };

            $.timepicker._pos = null;
            // determine sizing offscreen
            inst.tpDiv.css({ position: 'absolute', display: 'block', top: '-1000px' });
            $.timepicker._updateTimepicker(inst);


            // position with the ui position utility, if loaded
            if ( ( ! inst.inline )  && ( typeof $.ui.position == 'object' ) ) {
                inst.tpDiv.position({
                    of: inst.input,
                    my: $.timepicker._get( inst, 'myPosition' ),
                    at: $.timepicker._get( inst, 'atPosition' ),
                    // offset: $( "#offset" ).val(),
                    // using: using,
                    collision: 'flip'
                });
                var offset = inst.tpDiv.offset();
                $.timepicker._pos = [offset.top, offset.left];
            }


            // reset clicked state
            inst._hoursClicked = false;
            inst._minutesClicked = false;

            // fix width for dynamic number of time pickers
            // and adjust position before showing
            offset = $.timepicker._checkOffset(inst, offset, isFixed);
            inst.tpDiv.css({ position: ($.timepicker._inDialog && $.blockUI ?
			    'static' : (isFixed ? 'fixed' : 'absolute')), display: 'none',
                left: offset.left + 'px', top: offset.top + 'px'
            });
            if ( ! inst.inline ) {
                var showAnim = $.timepicker._get(inst, 'showAnim');
                var duration = $.timepicker._get(inst, 'duration');

                var postProcess = function () {
                    $.timepicker._timepickerShowing = true;
                    var borders = $.timepicker._getBorders(inst.tpDiv);
                    inst.tpDiv.find('iframe.ui-timepicker-cover'). // IE6- only
					css({ left: -borders[0], top: -borders[1],
					    width: inst.tpDiv.outerWidth(), height: inst.tpDiv.outerHeight()
					});
                };

                // Fixed the zIndex problem for real (I hope) - FG - v 0.2.9
                $.timepicker._adjustZIndex(input);
                //inst.tpDiv.css('zIndex', $.timepicker._getZIndex(input) +1);

                if ($.effects && $.effects[showAnim]) {
                    inst.tpDiv.show(showAnim, $.timepicker._get(inst, 'showOptions'), duration, postProcess);
                }
                else {
                    inst.tpDiv.show((showAnim ? duration : null), postProcess);
                }
                if (!showAnim || !duration) { postProcess(); }
                if (inst.input.is(':visible') && !inst.input.is(':disabled')) { inst.input.focus(); }
                $.timepicker._curInst = inst;
            }
        },

        // This is an enhanced copy of the zIndex function of UI core 1.8.?? For backward compatibility.
        // Enhancement returns maximum zindex value discovered while traversing parent elements,
        // rather than the first zindex value found. Ensures the timepicker popup will be in front,
        // even in funky scenarios like non-jq dialog containers with large fixed zindex values and
        // nested zindex-influenced elements of their own.
        _getZIndex: function (target) {
            var elem = $(target);
            var maxValue = 0;
            var position, value;
            while (elem.length && elem[0] !== document) {
                position = elem.css("position");
                if (position === "absolute" || position === "relative" || position === "fixed") {
                    value = parseInt(elem.css("zIndex"), 10);
                    if (!isNaN(value) && value !== 0) {
                        if (value > maxValue) { maxValue = value; }
                    }
                }
                elem = elem.parent();
            }

            return maxValue;
        },

        /* Refresh the time picker
           @param   target  element - The target input field or inline container element. */
        _refreshTimepicker: function(target) {
            var inst = this._getInst(target);
            if (inst) {
                this._updateTimepicker(inst);
            }
        },


        /* Generate the time picker content. */
        _updateTimepicker: function (inst) {
            inst.tpDiv.empty().append(this._generateHTML(inst));
            this._rebindDialogEvents(inst);

        },

        _rebindDialogEvents: function (inst) {
            var borders = $.timepicker._getBorders(inst.tpDiv),
                self = this;
            inst.tpDiv
			.find('iframe.ui-timepicker-cover') // IE6- only
				.css({ left: -borders[0], top: -borders[1],
				    width: inst.tpDiv.outerWidth(), height: inst.tpDiv.outerHeight()
				})
			.end()
            // after the picker html is appended bind the click & double click events (faster in IE this way
            // then letting the browser interpret the inline events)
            // the binding for the minute cells also exists in _updateMinuteDisplay
            .find('.ui-timepicker-minute-cell')
                .unbind()
                .bind("click", { fromDoubleClick:false }, $.proxy($.timepicker.selectMinutes, this))
                .bind("dblclick", { fromDoubleClick:true }, $.proxy($.timepicker.selectMinutes, this))
            .end()
            .find('.ui-timepicker-hour-cell')
                .unbind()
                .bind("click", { fromDoubleClick:false }, $.proxy($.timepicker.selectHours, this))
                .bind("dblclick", { fromDoubleClick:true }, $.proxy($.timepicker.selectHours, this))
            .end()
			.find('.ui-timepicker td a')
                .unbind()
				.bind('mouseout', function () {
				    $(this).removeClass('ui-state-hover');
				    if (this.className.indexOf('ui-timepicker-prev') != -1) $(this).removeClass('ui-timepicker-prev-hover');
				    if (this.className.indexOf('ui-timepicker-next') != -1) $(this).removeClass('ui-timepicker-next-hover');
				})
				.bind('mouseover', function () {
				    if ( ! self._isDisabledTimepicker(inst.inline ? inst.tpDiv.parent()[0] : inst.input[0])) {
				        $(this).parents('.ui-timepicker-calendar').find('a').removeClass('ui-state-hover');
				        $(this).addClass('ui-state-hover');
				        if (this.className.indexOf('ui-timepicker-prev') != -1) $(this).addClass('ui-timepicker-prev-hover');
				        if (this.className.indexOf('ui-timepicker-next') != -1) $(this).addClass('ui-timepicker-next-hover');
				    }
				})
			.end()
			.find('.' + this._dayOverClass + ' a')
				.trigger('mouseover')
			.end()
            .find('.ui-timepicker-now').bind("click", function(e) {
                    $.timepicker.selectNow(e);
            }).end()
            .find('.ui-timepicker-deselect').bind("click",function(e) {
                    $.timepicker.deselectTime(e);
            }).end()
            .find('.ui-timepicker-close').bind("click",function(e) {
                    $.timepicker._hideTimepicker();
            }).end();
        },

        /* Generate the HTML for the current state of the time picker. */
        _generateHTML: function (inst) {

            var h, m, row, col, html, hoursHtml, minutesHtml = '',
                showPeriod = (this._get(inst, 'showPeriod') == true),
                showPeriodLabels = (this._get(inst, 'showPeriodLabels') == true),
                showLeadingZero = (this._get(inst, 'showLeadingZero') == true),
                showHours = (this._get(inst, 'showHours') == true),
                showMinutes = (this._get(inst, 'showMinutes') == true),
                amPmText = this._get(inst, 'amPmText'),
                rows = this._get(inst, 'rows'),
                amRows = 0,
                pmRows = 0,
                amItems = 0,
                pmItems = 0,
                amFirstRow = 0,
                pmFirstRow = 0,
                hours = Array(),
                hours_options = this._get(inst, 'hours'),
                hoursPerRow = null,
                hourCounter = 0,
                hourLabel = this._get(inst, 'hourText'),
                showCloseButton = this._get(inst, 'showCloseButton'),
                closeButtonText = this._get(inst, 'closeButtonText'),
                showNowButton = this._get(inst, 'showNowButton'),
                nowButtonText = this._get(inst, 'nowButtonText'),
                showDeselectButton = this._get(inst, 'showDeselectButton'),
                deselectButtonText = this._get(inst, 'deselectButtonText'),
                showButtonPanel = showCloseButton || showNowButton || showDeselectButton;



            // prepare all hours and minutes, makes it easier to distribute by rows
            for (h = hours_options.starts; h <= hours_options.ends; h++) {
                hours.push (h);
            }
            hoursPerRow = Math.ceil(hours.length / rows); // always round up

            if (showPeriodLabels) {
                for (hourCounter = 0; hourCounter < hours.length; hourCounter++) {
                    if (hours[hourCounter] < 12) {
                        amItems++;
                    }
                    else {
                        pmItems++;
                    }
                }
                hourCounter = 0;

                amRows = Math.floor(amItems / hours.length * rows);
                pmRows = Math.floor(pmItems / hours.length * rows);

                // assign the extra row to the period that is more densely populated
                if (rows != amRows + pmRows) {
                    // Make sure: AM Has Items and either PM Does Not, AM has no rows yet, or AM is more dense
                    if (amItems && (!pmItems || !amRows || (pmRows && amItems / amRows >= pmItems / pmRows))) {
                        amRows++;
                    } else {
                        pmRows++;
                    }
                }
                amFirstRow = Math.min(amRows, 1);
                pmFirstRow = amRows + 1;

                if (amRows == 0) {
                    hoursPerRow = Math.ceil(pmItems / pmRows);
                } else if (pmRows == 0) {
                    hoursPerRow = Math.ceil(amItems / amRows);
                } else {
                    hoursPerRow = Math.ceil(Math.max(amItems / amRows, pmItems / pmRows));
                }
            }


            html = '<table class="ui-timepicker-table ui-widget-content ui-corner-all"><tr>';

            if (showHours) {

                html += '<td class="ui-timepicker-hours">' +
                        '<div class="ui-timepicker-title ui-widget-header ui-helper-clearfix ui-corner-all">' +
                        hourLabel +
                        '</div>' +
                        '<table class="ui-timepicker">';

                for (row = 1; row <= rows; row++) {
                    html += '<tr>';
                    // AM
                    if (row == amFirstRow && showPeriodLabels) {
                        html += '<th rowspan="' + amRows.toString() + '" class="periods" scope="row">' + amPmText[0] + '</th>';
                    }
                    // PM
                    if (row == pmFirstRow && showPeriodLabels) {
                        html += '<th rowspan="' + pmRows.toString() + '" class="periods" scope="row">' + amPmText[1] + '</th>';
                    }
                    for (col = 1; col <= hoursPerRow; col++) {
                        if (showPeriodLabels && row < pmFirstRow && hours[hourCounter] >= 12) {
                            html += this._generateHTMLHourCell(inst, undefined, showPeriod, showLeadingZero);
                        } else {
                            html += this._generateHTMLHourCell(inst, hours[hourCounter], showPeriod, showLeadingZero);
                            hourCounter++;
                        }
                    }
                    html += '</tr>';
                }
                html += '</table>' + // Close the hours cells table
                        '</td>'; // Close the Hour td
            }

            if (showMinutes) {
                html += '<td class="ui-timepicker-minutes">';
                html += this._generateHTMLMinutes(inst);
                html += '</td>';
            }

            html += '</tr>';


            if (showButtonPanel) {
                var buttonPanel = '<tr><td colspan="3"><div class="ui-timepicker-buttonpane ui-widget-content">';
                if (showNowButton) {
                    buttonPanel += '<button type="button" class="ui-timepicker-now ui-state-default ui-corner-all" '
                                   + ' data-timepicker-instance-id="#' + inst.id.replace(/\\\\/g,"\\") + '" >'
                                   + nowButtonText + '</button>';
                }
                if (showDeselectButton) {
                    buttonPanel += '<button type="button" class="ui-timepicker-deselect ui-state-default ui-corner-all" '
                                   + ' data-timepicker-instance-id="#' + inst.id.replace(/\\\\/g,"\\") + '" >'
                                   + deselectButtonText + '</button>';
                }
                if (showCloseButton) {
                    buttonPanel += '<button type="button" class="ui-timepicker-close ui-state-default ui-corner-all" '
                                   + ' data-timepicker-instance-id="#' + inst.id.replace(/\\\\/g,"\\") + '" >'
                                   + closeButtonText + '</button>';
                }

                html += buttonPanel + '</div></td></tr>';
            }
            html += '</table>';

            return html;
        },

        /* Special function that update the minutes selection in currently visible timepicker
         * called on hour selection when onMinuteShow is defined  */
        _updateMinuteDisplay: function (inst) {
            var newHtml = this._generateHTMLMinutes(inst);
            inst.tpDiv.find('td.ui-timepicker-minutes').html(newHtml);
            this._rebindDialogEvents(inst);
                // after the picker html is appended bind the click & double click events (faster in IE this way
                // then letting the browser interpret the inline events)
                // yes I know, duplicate code, sorry
/*                .find('.ui-timepicker-minute-cell')
                    .bind("click", { fromDoubleClick:false }, $.proxy($.timepicker.selectMinutes, this))
                    .bind("dblclick", { fromDoubleClick:true }, $.proxy($.timepicker.selectMinutes, this));
*/

        },

        /*
         * Generate the minutes table
         * This is separated from the _generateHTML function because is can be called separately (when hours changes)
         */
        _generateHTMLMinutes: function (inst) {

            var m, row, html = '',
                rows = this._get(inst, 'rows'),
                minutes = Array(),
                minutes_options = this._get(inst, 'minutes'),
                minutesPerRow = null,
                minuteCounter = 0,
                showMinutesLeadingZero = (this._get(inst, 'showMinutesLeadingZero') == true),
                onMinuteShow = this._get(inst, 'onMinuteShow'),
                minuteLabel = this._get(inst, 'minuteText');

            if ( ! minutes_options.starts) {
                minutes_options.starts = 0;
            }
            if ( ! minutes_options.ends) {
                minutes_options.ends = 59;
            }
            if ( ! minutes_options.manual) {
                minutes_options.manual = [];
            }
            for (m = minutes_options.starts; m <= minutes_options.ends; m += minutes_options.interval) {
                minutes.push(m);
            }
            for (i = 0; i < minutes_options.manual.length;i++) {
                var currMin = minutes_options.manual[i];

                // Validate & filter duplicates of manual minute input
                if (typeof currMin != 'number' || currMin < 0 || currMin > 59 || $.inArray(currMin, minutes) >= 0) {
                    continue;
                }
                minutes.push(currMin);
            }

            // Sort to get correct order after adding manual minutes
            // Use compare function to sort by number, instead of string (default)
            minutes.sort(function(a, b) {
                return a-b;
            });

            minutesPerRow = Math.round(minutes.length / rows + 0.49); // always round up

            /*
             * The minutes table
             */
            // if currently selected minute is not enabled, we have a problem and need to select a new minute.
            if (onMinuteShow &&
                (onMinuteShow.apply((inst.input ? inst.input[0] : null), [inst.hours , inst.minutes]) == false) ) {
                // loop minutes and select first available
                for (minuteCounter = 0; minuteCounter < minutes.length; minuteCounter += 1) {
                    m = minutes[minuteCounter];
                    if (onMinuteShow.apply((inst.input ? inst.input[0] : null), [inst.hours, m])) {
                        inst.minutes = m;
                        break;
                    }
                }
            }



            html += '<div class="ui-timepicker-title ui-widget-header ui-helper-clearfix ui-corner-all">' +
                    minuteLabel +
                    '</div>' +
                    '<table class="ui-timepicker">';

            minuteCounter = 0;
            for (row = 1; row <= rows; row++) {
                html += '<tr>';
                while (minuteCounter < row * minutesPerRow) {
                    var m = minutes[minuteCounter];
                    var displayText = '';
                    if (m !== undefined ) {
                        displayText = (m < 10) && showMinutesLeadingZero ? "0" + m.toString() : m.toString();
                    }
                    html += this._generateHTMLMinuteCell(inst, m, displayText);
                    minuteCounter++;
                }
                html += '</tr>';
            }

            html += '</table>';

            return html;
        },

        /* Generate the content of a "Hour" cell */
        _generateHTMLHourCell: function (inst, hour, showPeriod, showLeadingZero) {

            var displayHour = hour;
            if ((hour > 12) && showPeriod) {
                displayHour = hour - 12;
            }
            if ((displayHour == 0) && showPeriod) {
                displayHour = 12;
            }
            if ((displayHour < 10) && showLeadingZero) {
                displayHour = '0' + displayHour;
            }

            var html = "";
            var enabled = true;
            var onHourShow = this._get(inst, 'onHourShow');		//custom callback
            var maxTime = this._get(inst, 'maxTime');
            var minTime = this._get(inst, 'minTime');

            if (hour == undefined) {
                html = '<td><span class="ui-state-default ui-state-disabled">&nbsp;</span></td>';
                return html;
            }

            if (onHourShow) {
            	enabled = onHourShow.apply((inst.input ? inst.input[0] : null), [hour]);
            }
			
            if (enabled) {
                if ( !isNaN(parseInt(maxTime.hour)) && hour > maxTime.hour ) enabled = false;
                if ( !isNaN(parseInt(minTime.hour)) && hour < minTime.hour ) enabled = false;
            }
			
            if (enabled) {
                html = '<td class="ui-timepicker-hour-cell" data-timepicker-instance-id="#' + inst.id.replace(/\\\\/g,"\\") + '" data-hour="' + hour.toString() + '">' +
                   '<a class="ui-state-default ' +
                   (hour == inst.hours ? 'ui-state-active' : '') +
                   '">' +
                   displayHour.toString() +
                   '</a></td>';
            }
            else {
            	html =
            		'<td>' +
		                '<span class="ui-state-default ui-state-disabled ' +
		                (hour == inst.hours ? ' ui-state-active ' : ' ') +
		                '">' +
		                displayHour.toString() +
		                '</span>' +
		            '</td>';
            }
            return html;
        },

        /* Generate the content of a "Hour" cell */
        _generateHTMLMinuteCell: function (inst, minute, displayText) {
             var html = "";
             var enabled = true;
             var hour = inst.hours;
             var onMinuteShow = this._get(inst, 'onMinuteShow');		//custom callback
             var maxTime = this._get(inst, 'maxTime');
             var minTime = this._get(inst, 'minTime');

             if (onMinuteShow) {
            	 //NEW: 2011-02-03  we should give the hour as a parameter as well!
             	enabled = onMinuteShow.apply((inst.input ? inst.input[0] : null), [inst.hours,minute]);		//trigger callback
             }

             if (minute == undefined) {
                 html = '<td><span class="ui-state-default ui-state-disabled">&nbsp;</span></td>';
                 return html;
             }

            if (enabled && hour !== null) {
                if ( !isNaN(parseInt(maxTime.hour)) && !isNaN(parseInt(maxTime.minute)) && hour >= maxTime.hour && minute > maxTime.minute ) enabled = false;
                if ( !isNaN(parseInt(minTime.hour)) && !isNaN(parseInt(minTime.minute)) && hour <= minTime.hour && minute < minTime.minute ) enabled = false;
            }
			
             if (enabled) {
	             html = '<td class="ui-timepicker-minute-cell" data-timepicker-instance-id="#' + inst.id.replace(/\\\\/g,"\\") + '" data-minute="' + minute.toString() + '" >' +
	                   '<a class="ui-state-default ' +
	                   (minute == inst.minutes ? 'ui-state-active' : '') +
	                   '" >' +
	                   displayText +
	                   '</a></td>';
             }
             else {

            	html = '<td>' +
	                 '<span class="ui-state-default ui-state-disabled" >' +
	                 	displayText +
	                 '</span>' +
                 '</td>';
             }
             return html;
        },


        /* Detach a timepicker from its control.
           @param  target    element - the target input field or division or span */
        _destroyTimepicker: function(target) {
            var $target = $(target);
            var inst = $.data(target, PROP_NAME);
            if (!$target.hasClass(this.markerClassName)) {
                return;
            }
            var nodeName = target.nodeName.toLowerCase();
            $.removeData(target, PROP_NAME);
            if (nodeName == 'input') {
                inst.append.remove();
                inst.trigger.remove();
                $target.removeClass(this.markerClassName)
                    .unbind('focus.timepicker', this._showTimepicker)
                    .unbind('click.timepicker', this._adjustZIndex);
            } else if (nodeName == 'div' || nodeName == 'span')
                $target.removeClass(this.markerClassName).empty();
        },

        /* Enable the date picker to a jQuery selection.
           @param  target    element - the target input field or division or span */
        _enableTimepicker: function(target) {
            var $target = $(target),
                target_id = $target.attr('id'),
                inst = $.data(target, PROP_NAME);

            if (!$target.hasClass(this.markerClassName)) {
                return;
            }
            var nodeName = target.nodeName.toLowerCase();
            if (nodeName == 'input') {
                target.disabled = false;
                var button = this._get(inst, 'button');
                $(button).removeClass('ui-state-disabled').disabled = false;
                inst.trigger.filter('button').
                    each(function() { this.disabled = false; }).end();
            }
            else if (nodeName == 'div' || nodeName == 'span') {
                var inline = $target.children('.' + this._inlineClass);
                inline.children().removeClass('ui-state-disabled');
                inline.find('button').each(
                    function() { this.disabled = false }
                )
            }
            this._disabledInputs = $.map(this._disabledInputs,
                function(value) { return (value == target_id ? null : value); }); // delete entry
        },

        /* Disable the time picker to a jQuery selection.
           @param  target    element - the target input field or division or span */
        _disableTimepicker: function(target) {
            var $target = $(target);
            var inst = $.data(target, PROP_NAME);
            if (!$target.hasClass(this.markerClassName)) {
                return;
            }
            var nodeName = target.nodeName.toLowerCase();
            if (nodeName == 'input') {
                var button = this._get(inst, 'button');

                $(button).addClass('ui-state-disabled').disabled = true;
                target.disabled = true;

                inst.trigger.filter('button').
                    each(function() { this.disabled = true; }).end();

            }
            else if (nodeName == 'div' || nodeName == 'span') {
                var inline = $target.children('.' + this._inlineClass);
                inline.children().addClass('ui-state-disabled');
                inline.find('button').each(
                    function() { this.disabled = true }
                )

            }
            this._disabledInputs = $.map(this._disabledInputs,
                function(value) { return (value == target ? null : value); }); // delete entry
            this._disabledInputs[this._disabledInputs.length] = $target.attr('id');
        },

        /* Is the first field in a jQuery collection disabled as a timepicker?
        @param  target_id element - the target input field or division or span
        @return boolean - true if disabled, false if enabled */
        _isDisabledTimepicker: function (target_id) {
            if ( ! target_id) { return false; }
            for (var i = 0; i < this._disabledInputs.length; i++) {
                if (this._disabledInputs[i] == target_id) { return true; }
            }
            return false;
        },

        /* Check positioning to remain on screen. */
        _checkOffset: function (inst, offset, isFixed) {
            var tpWidth = inst.tpDiv.outerWidth();
            var tpHeight = inst.tpDiv.outerHeight();
            var inputWidth = inst.input ? inst.input.outerWidth() : 0;
            var inputHeight = inst.input ? inst.input.outerHeight() : 0;
            var viewWidth = document.documentElement.clientWidth + $(document).scrollLeft();
            var viewHeight = document.documentElement.clientHeight + $(document).scrollTop();

            offset.left -= (this._get(inst, 'isRTL') ? (tpWidth - inputWidth) : 0);
            offset.left -= (isFixed && offset.left == inst.input.offset().left) ? $(document).scrollLeft() : 0;
            offset.top -= (isFixed && offset.top == (inst.input.offset().top + inputHeight)) ? $(document).scrollTop() : 0;

            // now check if timepicker is showing outside window viewport - move to a better place if so.
            offset.left -= Math.min(offset.left, (offset.left + tpWidth > viewWidth && viewWidth > tpWidth) ?
			Math.abs(offset.left + tpWidth - viewWidth) : 0);
            offset.top -= Math.min(offset.top, (offset.top + tpHeight > viewHeight && viewHeight > tpHeight) ?
			Math.abs(tpHeight + inputHeight) : 0);

            return offset;
        },

        /* Find an object's position on the screen. */
        _findPos: function (obj) {
            var inst = this._getInst(obj);
            var isRTL = this._get(inst, 'isRTL');
            while (obj && (obj.type == 'hidden' || obj.nodeType != 1)) {
                obj = obj[isRTL ? 'previousSibling' : 'nextSibling'];
            }
            var position = $(obj).offset();
            return [position.left, position.top];
        },

        /* Retrieve the size of left and top borders for an element.
        @param  elem  (jQuery object) the element of interest
        @return  (number[2]) the left and top borders */
        _getBorders: function (elem) {
            var convert = function (value) {
                return { thin: 1, medium: 2, thick: 3}[value] || value;
            };
            return [parseFloat(convert(elem.css('border-left-width'))),
			parseFloat(convert(elem.css('border-top-width')))];
        },


        /* Close time picker if clicked elsewhere. */
        _checkExternalClick: function (event) {
            if (!$.timepicker._curInst) { return; }
            var $target = $(event.target);
            if ($target[0].id != $.timepicker._mainDivId &&
				$target.parents('#' + $.timepicker._mainDivId).length == 0 &&
				!$target.hasClass($.timepicker.markerClassName) &&
				!$target.hasClass($.timepicker._triggerClass) &&
				$.timepicker._timepickerShowing && !($.timepicker._inDialog && $.blockUI))
                $.timepicker._hideTimepicker();
        },

        /* Hide the time picker from view.
        @param  input  element - the input field attached to the time picker */
        _hideTimepicker: function (input) {
            var inst = this._curInst;
            if (!inst || (input && inst != $.data(input, PROP_NAME))) { return; }
            if (this._timepickerShowing) {
                var showAnim = this._get(inst, 'showAnim');
                var duration = this._get(inst, 'duration');
                var postProcess = function () {
                    $.timepicker._tidyDialog(inst);
                    this._curInst = null;
                };
                if ($.effects && $.effects[showAnim]) {
                    inst.tpDiv.hide(showAnim, $.timepicker._get(inst, 'showOptions'), duration, postProcess);
                }
                else {
                    inst.tpDiv[(showAnim == 'slideDown' ? 'slideUp' :
					    (showAnim == 'fadeIn' ? 'fadeOut' : 'hide'))]((showAnim ? duration : null), postProcess);
                }
                if (!showAnim) { postProcess(); }

                this._timepickerShowing = false;

                this._lastInput = null;
                if (this._inDialog) {
                    this._dialogInput.css({ position: 'absolute', left: '0', top: '-100px' });
                    if ($.blockUI) {
                        $.unblockUI();
                        $('body').append(this.tpDiv);
                    }
                }
                this._inDialog = false;

                var onClose = this._get(inst, 'onClose');
                 if (onClose) {
                     onClose.apply(
                         (inst.input ? inst.input[0] : null),
 					    [(inst.input ? inst.input.val() : ''), inst]);  // trigger custom callback
                 }

            }
        },



        /* Tidy up after a dialog display. */
        _tidyDialog: function (inst) {
            inst.tpDiv.removeClass(this._dialogClass).unbind('.ui-timepicker');
        },

        /* Retrieve the instance data for the target control.
        @param  target  element - the target input field or division or span
        @return  object - the associated instance data
        @throws  error if a jQuery problem getting data */
        _getInst: function (target) {
            try {
                return $.data(target, PROP_NAME);
            }
            catch (err) {
                throw 'Missing instance data for this timepicker';
            }
        },

        /* Get a setting value, defaulting if necessary. */
        _get: function (inst, name) {
            return inst.settings[name] !== undefined ?
			inst.settings[name] : this._defaults[name];
        },

        /* Parse existing time and initialise time picker. */
        _setTimeFromField: function (inst) {
            if (inst.input.val() == inst.lastVal) { return; }
            var defaultTime = this._get(inst, 'defaultTime');

            var timeToParse = defaultTime == 'now' ? this._getCurrentTimeRounded(inst) : defaultTime;
            if ((inst.inline == false) && (inst.input.val() != '')) { timeToParse = inst.input.val() }

            if (timeToParse instanceof Date) {
                inst.hours = timeToParse.getHours();
                inst.minutes = timeToParse.getMinutes();
            } else {
                var timeVal = inst.lastVal = timeToParse;
                if (timeToParse == '') {
                    inst.hours = -1;
                    inst.minutes = -1;
                } else {
                    var time = this.parseTime(inst, timeVal);
                    inst.hours = time.hours;
                    inst.minutes = time.minutes;
                }
            }


            $.timepicker._updateTimepicker(inst);
        },

        /* Update or retrieve the settings for an existing time picker.
           @param  target  element - the target input field or division or span
           @param  name    object - the new settings to update or
                           string - the name of the setting to change or retrieve,
                           when retrieving also 'all' for all instance settings or
                           'defaults' for all global defaults
           @param  value   any - the new value for the setting
                       (omit if above is an object or to retrieve a value) */
        _optionTimepicker: function(target, name, value) {
            var inst = this._getInst(target);
            if (arguments.length == 2 && typeof name == 'string') {
                return (name == 'defaults' ? $.extend({}, $.timepicker._defaults) :
                    (inst ? (name == 'all' ? $.extend({}, inst.settings) :
                    this._get(inst, name)) : null));
            }
            var settings = name || {};
            if (typeof name == 'string') {
                settings = {};
                settings[name] = value;
            }
            if (inst) {
                extendRemove(inst.settings, settings);
                if (this._curInst == inst) {
                    this._hideTimepicker();
                	this._updateTimepicker(inst);
                }
                if (inst.inline) {
                    this._updateTimepicker(inst);
                }
            }
        },


        /* Set the time for a jQuery selection.
	    @param  target  element - the target input field or division or span
	    @param  time    String - the new time */
	    _setTimeTimepicker: function(target, time) {
		    var inst = this._getInst(target);
		    if (inst) {
			    this._setTime(inst, time);
    			this._updateTimepicker(inst);
	    		this._updateAlternate(inst, time);
		    }
	    },

        /* Set the time directly. */
        _setTime: function(inst, time, noChange) {
            var origHours = inst.hours;
            var origMinutes = inst.minutes;
            if (time instanceof Date) {
                inst.hours = time.getHours();
                inst.minutes = time.getMinutes();
            } else {
                var time = this.parseTime(inst, time);
                inst.hours = time.hours;
                inst.minutes = time.minutes;
            }

            if ((origHours != inst.hours || origMinutes != inst.minutes) && !noChange) {
                inst.input.trigger('change');
            }
            this._updateTimepicker(inst);
            this._updateSelectedValue(inst);
        },

        /* Return the current time, ready to be parsed, rounded to the closest minute by interval */
        _getCurrentTimeRounded: function (inst) {
            var currentTime = new Date(),
                currentMinutes = currentTime.getMinutes(),
                minutes_options = this._get(inst, 'minutes'),
                // round to closest interval
                adjustedMinutes = Math.round(currentMinutes / minutes_options.interval) * minutes_options.interval;
            currentTime.setMinutes(adjustedMinutes);
            return currentTime;
        },

        /*
        * Parse a time string into hours and minutes
        */
        parseTime: function (inst, timeVal) {
            var retVal = new Object();
            retVal.hours = -1;
            retVal.minutes = -1;

            if(!timeVal)
                return '';

            var timeSeparator = this._get(inst, 'timeSeparator'),
                amPmText = this._get(inst, 'amPmText'),
                showHours = this._get(inst, 'showHours'),
                showMinutes = this._get(inst, 'showMinutes'),
                optionalMinutes = this._get(inst, 'optionalMinutes'),
                showPeriod = (this._get(inst, 'showPeriod') == true),
                p = timeVal.indexOf(timeSeparator);

            // check if time separator found
            if (p != -1) {
                retVal.hours = parseInt(timeVal.substr(0, p), 10);
                retVal.minutes = parseInt(timeVal.substr(p + 1), 10);
            }
            // check for hours only
            else if ( (showHours) && ( !showMinutes || optionalMinutes ) ) {
                retVal.hours = parseInt(timeVal, 10);
            }
            // check for minutes only
            else if ( ( ! showHours) && (showMinutes) ) {
                retVal.minutes = parseInt(timeVal, 10);
            }

            if (showHours) {
                var timeValUpper = timeVal.toUpperCase();
                if ((retVal.hours < 12) && (showPeriod) && (timeValUpper.indexOf(amPmText[1].toUpperCase()) != -1)) {
                    retVal.hours += 12;
                }
                // fix for 12 AM
                if ((retVal.hours == 12) && (showPeriod) && (timeValUpper.indexOf(amPmText[0].toUpperCase()) != -1)) {
                    retVal.hours = 0;
                }
            }

            return retVal;
        },

        selectNow: function(event) {
            var id = $(event.target).attr("data-timepicker-instance-id"),
                $target = $(id),
                inst = this._getInst($target[0]);
            //if (!inst || (input && inst != $.data(input, PROP_NAME))) { return; }
            var currentTime = new Date();
            inst.hours = currentTime.getHours();
            inst.minutes = currentTime.getMinutes();
            this._updateSelectedValue(inst);
            this._updateTimepicker(inst);
            this._hideTimepicker();
        },

        deselectTime: function(event) {
            var id = $(event.target).attr("data-timepicker-instance-id"),
                $target = $(id),
                inst = this._getInst($target[0]);
            inst.hours = -1;
            inst.minutes = -1;
            this._updateSelectedValue(inst);
            this._hideTimepicker();
        },


        selectHours: function (event) {
            var $td = $(event.currentTarget),
                id = $td.attr("data-timepicker-instance-id"),
                newHours = parseInt($td.attr("data-hour")),
                fromDoubleClick = event.data.fromDoubleClick,
                $target = $(id),
                inst = this._getInst($target[0]),
                showMinutes = (this._get(inst, 'showMinutes') == true);

            // don't select if disabled
            if ( $.timepicker._isDisabledTimepicker($target.attr('id')) ) { return false }

            $td.parents('.ui-timepicker-hours:first').find('a').removeClass('ui-state-active');
            $td.children('a').addClass('ui-state-active');
            inst.hours = newHours;

            // added for onMinuteShow callback
            var onMinuteShow = this._get(inst, 'onMinuteShow'),
                maxTime = this._get(inst, 'maxTime'),
                minTime = this._get(inst, 'minTime');
            if (onMinuteShow || maxTime.minute || minTime.minute) {
                // this will trigger a callback on selected hour to make sure selected minute is allowed. 
                this._updateMinuteDisplay(inst);
            }

            this._updateSelectedValue(inst);

            inst._hoursClicked = true;
            if ((inst._minutesClicked) || (fromDoubleClick) || (showMinutes == false)) {
                $.timepicker._hideTimepicker();
            }
            // return false because if used inline, prevent the url to change to a hashtag
            return false;
        },

        selectMinutes: function (event) {
            var $td = $(event.currentTarget),
                id = $td.attr("data-timepicker-instance-id"),
                newMinutes = parseInt($td.attr("data-minute")),
                fromDoubleClick = event.data.fromDoubleClick,
                $target = $(id),
                inst = this._getInst($target[0]),
                showHours = (this._get(inst, 'showHours') == true);

            // don't select if disabled
            if ( $.timepicker._isDisabledTimepicker($target.attr('id')) ) { return false }

            $td.parents('.ui-timepicker-minutes:first').find('a').removeClass('ui-state-active');
            $td.children('a').addClass('ui-state-active');

            inst.minutes = newMinutes;
            this._updateSelectedValue(inst);

            inst._minutesClicked = true;
            if ((inst._hoursClicked) || (fromDoubleClick) || (showHours == false)) {
                $.timepicker._hideTimepicker();
                // return false because if used inline, prevent the url to change to a hashtag
                return false;
            }

            // return false because if used inline, prevent the url to change to a hashtag
            return false;
        },

        _updateSelectedValue: function (inst) {
            var newTime = this._getParsedTime(inst);
            if (inst.input) {
                inst.input.val(newTime);
                inst.input.trigger('change');
            }
            var onSelect = this._get(inst, 'onSelect');
            if (onSelect) { onSelect.apply((inst.input ? inst.input[0] : null), [newTime, inst]); } // trigger custom callback
            this._updateAlternate(inst, newTime);
            return newTime;
        },

        /* this function process selected time and return it parsed according to instance options */
        _getParsedTime: function(inst) {

            if (inst.hours == -1 && inst.minutes == -1) {
                return '';
            }

            // default to 0 AM if hours is not valid
            if ((inst.hours < inst.hours.starts) || (inst.hours > inst.hours.ends )) { inst.hours = 0; }
            // default to 0 minutes if minute is not valid
            if ((inst.minutes < inst.minutes.starts) || (inst.minutes > inst.minutes.ends)) { inst.minutes = 0; }

            var period = "",
                showPeriod = (this._get(inst, 'showPeriod') == true),
                showLeadingZero = (this._get(inst, 'showLeadingZero') == true),
                showHours = (this._get(inst, 'showHours') == true),
                showMinutes = (this._get(inst, 'showMinutes') == true),
                optionalMinutes = (this._get(inst, 'optionalMinutes') == true),
                amPmText = this._get(inst, 'amPmText'),
                selectedHours = inst.hours ? inst.hours : 0,
                selectedMinutes = inst.minutes ? inst.minutes : 0,
                displayHours = selectedHours ? selectedHours : 0,
                parsedTime = '';

            // fix some display problem when hours or minutes are not selected yet
            if (displayHours == -1) { displayHours = 0 }
            if (selectedMinutes == -1) { selectedMinutes = 0 }

            if (showPeriod) {
                if (inst.hours == 0) {
                    displayHours = 12;
                }
                if (inst.hours < 12) {
                    period = amPmText[0];
                }
                else {
                    period = amPmText[1];
                    if (displayHours > 12) {
                        displayHours -= 12;
                    }
                }
            }

            var h = displayHours.toString();
            if (showLeadingZero && (displayHours < 10)) { h = '0' + h; }

            var m = selectedMinutes.toString();
            if (selectedMinutes < 10) { m = '0' + m; }

            if (showHours) {
                parsedTime += h;
            }
            if (showHours && showMinutes && (!optionalMinutes || m != 0)) {
                parsedTime += this._get(inst, 'timeSeparator');
            }
            if (showMinutes && (!optionalMinutes || m != 0)) {
                parsedTime += m;
            }
            if (showHours) {
                if (period.length > 0) { parsedTime += this._get(inst, 'periodSeparator') + period; }
            }

            return parsedTime;
        },

        /* Update any alternate field to synchronise with the main field. */
        _updateAlternate: function(inst, newTime) {
            var altField = this._get(inst, 'altField');
            if (altField) { // update alternate field too
                $(altField).each(function(i,e) {
                    $(e).val(newTime);
                });
            }
        },

        _getTimeAsDateTimepicker: function(input) {
            var inst = this._getInst(input);
            if (inst.hours == -1 && inst.minutes == -1) {
                return '';
            }

            // default to 0 AM if hours is not valid
            if ((inst.hours < inst.hours.starts) || (inst.hours > inst.hours.ends )) { inst.hours = 0; }
            // default to 0 minutes if minute is not valid
            if ((inst.minutes < inst.minutes.starts) || (inst.minutes > inst.minutes.ends)) { inst.minutes = 0; }

            return new Date(0, 0, 0, inst.hours, inst.minutes, 0);
        },
        /* This might look unused but it's called by the $.fn.timepicker function with param getTime */
        /* added v 0.2.3 - gitHub issue #5 - Thanks edanuff */
        _getTimeTimepicker : function(input) {
            var inst = this._getInst(input);
            return this._getParsedTime(inst);
        },
        _getHourTimepicker: function(input) {
            var inst = this._getInst(input);
            if ( inst == undefined) { return -1; }
            return inst.hours;
        },
        _getMinuteTimepicker: function(input) {
            var inst= this._getInst(input);
            if ( inst == undefined) { return -1; }
            return inst.minutes;
        }

    });



    /* Invoke the timepicker functionality.
    @param  options  string - a command, optionally followed by additional parameters or
    Object - settings for attaching new timepicker functionality
    @return  jQuery object */
    $.fn.timepicker = function (options) {
        /* Initialise the time picker. */
        if (!$.timepicker.initialized) {
            $(document).mousedown($.timepicker._checkExternalClick);
            $.timepicker.initialized = true;
        }

         /* Append timepicker main container to body if not exist. */
        if ($("#"+$.timepicker._mainDivId).length === 0) {
            $('body').append($.timepicker.tpDiv);
        }

        var otherArgs = Array.prototype.slice.call(arguments, 1);
        if (typeof options == 'string' && (options == 'getTime' || options == 'getTimeAsDate' || options == 'getHour' || options == 'getMinute' ))
            return $.timepicker['_' + options + 'Timepicker'].
			    apply($.timepicker, [this[0]].concat(otherArgs));
        if (options == 'option' && arguments.length == 2 && typeof arguments[1] == 'string')
            return $.timepicker['_' + options + 'Timepicker'].
                apply($.timepicker, [this[0]].concat(otherArgs));
        return this.each(function () {
            typeof options == 'string' ?
			$.timepicker['_' + options + 'Timepicker'].
				apply($.timepicker, [this].concat(otherArgs)) :
			$.timepicker._attachTimepicker(this, options);
        });
    };

    /* jQuery extend now ignores nulls! */
    function extendRemove(target, props) {
        $.extend(target, props);
        for (var name in props)
            if (props[name] == null || props[name] == undefined)
                target[name] = props[name];
        return target;
    };

    $.timepicker = new Timepicker(); // singleton instance
    $.timepicker.initialized = false;
    $.timepicker.uuid = new Date().getTime();
    $.timepicker.version = "0.3.3";

    // Workaround for #4055
    // Add another global to avoid noConflict issues with inline event handlers
    window['TP_jQuery_' + tpuuid] = $;

})(jQuery);

/*
	Masked Input plugin for jQuery
	Copyright (c) 2007-2013 Josh Bush (digitalbush.com)
	Licensed under the MIT license (http://digitalbush.com/projects/masked-input-plugin/#license)
	Version: 1.3.1
*/
(function(e){function t(){var e=document.createElement("input"),t="onpaste";return e.setAttribute(t,""),"function"==typeof e[t]?"paste":"input"}var n,a=t()+".mask",r=navigator.userAgent,i=/iphone/i.test(r),o=/android/i.test(r);e.mask={definitions:{9:"[0-9]",a:"[A-Za-z]","*":"[A-Za-z0-9]"},dataName:"rawMaskFn",placeholder:"_"},e.fn.extend({caret:function(e,t){var n;if(0!==this.length&&!this.is(":hidden"))return"number"==typeof e?(t="number"==typeof t?t:e,this.each(function(){this.setSelectionRange?this.setSelectionRange(e,t):this.createTextRange&&(n=this.createTextRange(),n.collapse(!0),n.moveEnd("character",t),n.moveStart("character",e),n.select())})):(this[0].setSelectionRange?(e=this[0].selectionStart,t=this[0].selectionEnd):document.selection&&document.selection.createRange&&(n=document.selection.createRange(),e=0-n.duplicate().moveStart("character",-1e5),t=e+n.text.length),{begin:e,end:t})},unmask:function(){return this.trigger("unmask")},mask:function(t,r){var c,l,s,u,f,h;return!t&&this.length>0?(c=e(this[0]),c.data(e.mask.dataName)()):(r=e.extend({placeholder:e.mask.placeholder,completed:null},r),l=e.mask.definitions,s=[],u=h=t.length,f=null,e.each(t.split(""),function(e,t){"?"==t?(h--,u=e):l[t]?(s.push(RegExp(l[t])),null===f&&(f=s.length-1)):s.push(null)}),this.trigger("unmask").each(function(){function c(e){for(;h>++e&&!s[e];);return e}function d(e){for(;--e>=0&&!s[e];);return e}function m(e,t){var n,a;if(!(0>e)){for(n=e,a=c(t);h>n;n++)if(s[n]){if(!(h>a&&s[n].test(R[a])))break;R[n]=R[a],R[a]=r.placeholder,a=c(a)}b(),x.caret(Math.max(f,e))}}function p(e){var t,n,a,i;for(t=e,n=r.placeholder;h>t;t++)if(s[t]){if(a=c(t),i=R[t],R[t]=n,!(h>a&&s[a].test(i)))break;n=i}}function g(e){var t,n,a,r=e.which;8===r||46===r||i&&127===r?(t=x.caret(),n=t.begin,a=t.end,0===a-n&&(n=46!==r?d(n):a=c(n-1),a=46===r?c(a):a),k(n,a),m(n,a-1),e.preventDefault()):27==r&&(x.val(S),x.caret(0,y()),e.preventDefault())}function v(t){var n,a,i,l=t.which,u=x.caret();t.ctrlKey||t.altKey||t.metaKey||32>l||l&&(0!==u.end-u.begin&&(k(u.begin,u.end),m(u.begin,u.end-1)),n=c(u.begin-1),h>n&&(a=String.fromCharCode(l),s[n].test(a)&&(p(n),R[n]=a,b(),i=c(n),o?setTimeout(e.proxy(e.fn.caret,x,i),0):x.caret(i),r.completed&&i>=h&&r.completed.call(x))),t.preventDefault())}function k(e,t){var n;for(n=e;t>n&&h>n;n++)s[n]&&(R[n]=r.placeholder)}function b(){x.val(R.join(""))}function y(e){var t,n,a=x.val(),i=-1;for(t=0,pos=0;h>t;t++)if(s[t]){for(R[t]=r.placeholder;pos++<a.length;)if(n=a.charAt(pos-1),s[t].test(n)){R[t]=n,i=t;break}if(pos>a.length)break}else R[t]===a.charAt(pos)&&t!==u&&(pos++,i=t);return e?b():u>i+1?(x.val(""),k(0,h)):(b(),x.val(x.val().substring(0,i+1))),u?t:f}var x=e(this),R=e.map(t.split(""),function(e){return"?"!=e?l[e]?r.placeholder:e:void 0}),S=x.val();x.data(e.mask.dataName,function(){return e.map(R,function(e,t){return s[t]&&e!=r.placeholder?e:null}).join("")}),x.attr("readonly")||x.one("unmask",function(){x.unbind(".mask").removeData(e.mask.dataName)}).bind("focus.mask",function(){clearTimeout(n);var e;S=x.val(),e=y(),n=setTimeout(function(){b(),e==t.length?x.caret(0,e):x.caret(e)},10)}).bind("blur.mask",function(){y(),x.val()!=S&&x.change()}).bind("keydown.mask",g).bind("keypress.mask",v).bind(a,function(){setTimeout(function(){var e=y(!0);x.caret(e),r.completed&&e==x.val().length&&r.completed.call(x)},0)}),y()}))}})})(jQuery);
/*
 *
 * Copyright (c) 2006-2014 Sam Collett (http://www.texotela.co.uk)
 * Dual licensed under the MIT (http://www.opensource.org/licenses/mit-license.php)
 * and GPL (http://www.opensource.org/licenses/gpl-license.php) licenses.
 *
 * Version 1.4.1
 * Demo: http://www.texotela.co.uk/code/jquery/numeric/
 *
 */
(function (factory) {
    if (typeof define === 'function' && define.amd) {
        define(['jquery'], factory);
    } else {
        factory(window.jQuery);
    }
}(function ($) {
    /*
     * Allows only valid characters to be entered into input boxes.
     * Note: fixes value when pasting via Ctrl+V, but not when using the mouse to paste
      *      side-effect: Ctrl+A does not work, though you can still use the mouse to select (or double-click to select all)
     *
     * @name     numeric
     * @param    config      { decimal : "." , negative : true }
     * @param    callback     A function that runs if the number is not valid (fires onblur)
     * @author   Sam Collett (http://www.texotela.co.uk)
     * @example  $(".numeric").numeric();
     * @example  $(".numeric").numeric(","); // use , as separator
     * @example  $(".numeric").numeric({ decimal : "," }); // use , as separator
     * @example  $(".numeric").numeric({ negative : false }); // do not allow negative values
     * @example  $(".numeric").numeric({ decimalPlaces : 2 }); // only allow 2 decimal places
     * @example  $(".numeric").numeric(null, callback); // use default values, pass on the 'callback' function
     *
     */
    $.fn.numeric = function (config, callback) {
        if (typeof config === 'boolean') {
            config = { decimal: config, negative: true, decimalPlaces: -1 };
        }
        config = config || {};
        // if config.negative undefined, set to true (default is to allow negative numbers)
        if (typeof config.negative == "undefined") { config.negative = true; }
        // set decimal point
        var decimal = (config.decimal === false) ? "" : config.decimal || ".";
        // allow negatives
        var negative = (config.negative === true) ? true : false;
        // set decimal places
        var decimalPlaces = (typeof config.decimalPlaces == "undefined") ? -1 : config.decimalPlaces;
        // callback function
        callback = (typeof (callback) == "function" ? callback : function () { });
        // set data and methods
        return this.data("numeric.decimal", decimal).data("numeric.negative", negative).data("numeric.callback", callback).data("numeric.decimalPlaces", decimalPlaces).keypress($.fn.numeric.keypress).keyup($.fn.numeric.keyup).blur($.fn.numeric.blur);
    };

    $.fn.numeric.keypress = function (e) {
        // get decimal character and determine if negatives are allowed
        var decimal = $.data(this, "numeric.decimal");
        var negative = $.data(this, "numeric.negative");
        var decimalPlaces = $.data(this, "numeric.decimalPlaces");
        // get the key that was pressed
        var key = e.charCode ? e.charCode : e.keyCode ? e.keyCode : 0;
        // allow enter/return key (only when in an input box)
        if (key == 13 && this.nodeName.toLowerCase() == "input") {
            return true;
        }
        else if (key == 13) {
            return false;
        }
            //dont allow #, $, %
        else if (key == 35 || key == 36 || key == 37) {
            return false;
        }
        var allow = false;
        // allow Ctrl+A
        if ((e.ctrlKey && key == 97 /* firefox */) || (e.ctrlKey && key == 65) /* opera */) { return true; }
        // allow Ctrl+X (cut)
        if ((e.ctrlKey && key == 120 /* firefox */) || (e.ctrlKey && key == 88) /* opera */) { return true; }
        // allow Ctrl+C (copy)
        if ((e.ctrlKey && key == 99 /* firefox */) || (e.ctrlKey && key == 67) /* opera */) { return true; }
        // allow Ctrl+Z (undo)
        if ((e.ctrlKey && key == 122 /* firefox */) || (e.ctrlKey && key == 90) /* opera */) { return true; }
        // allow or deny Ctrl+V (paste), Shift+Ins
        if ((e.ctrlKey && key == 118 /* firefox */) || (e.ctrlKey && key == 86) /* opera */ ||
          (e.shiftKey && key == 45)) { return true; }
        // if a number was not pressed
        if (key < 48 || key > 57) {
            var value = $(this).val();
            /* '-' only allowed at start and if negative numbers allowed */
            if ($.inArray('-', value.split('')) !== 0 && negative && key == 45 && (value.length === 0 || parseInt($.fn.getSelectionStart(this), 10) === 0)) { return true; }
            /* only one decimal separator allowed */
            if (decimal && key == decimal.charCodeAt(0) && $.inArray(decimal, value.split('')) != -1) {
                allow = false;
            }
            // check for other keys that have special purposes
            if (
                key != 8 /* backspace */ &&
                key != 9 /* tab */ &&
                key != 13 /* enter */ &&
                key != 35 /* end */ &&
                key != 36 /* home */ &&
                key != 37 /* left */ &&
                key != 39 /* right */ &&
                key != 46 /* del */
            ) {
                allow = false;
            }
            else {
                // for detecting special keys (listed above)
                // IE does not support 'charCode' and ignores them in keypress anyway
                if (typeof e.charCode != "undefined") {
                    // special keys have 'keyCode' and 'which' the same (e.g. backspace)
                    if (e.keyCode == e.which && e.which !== 0) {
                        allow = true;
                        // . and delete share the same code, don't allow . (will be set to true later if it is the decimal point)
                        if (e.which == 46) { allow = false; }
                    }
                        // or keyCode != 0 and 'charCode'/'which' = 0
                    else if (e.keyCode !== 0 && e.charCode === 0 && e.which === 0) {
                        allow = true;
                    }
                }
            }
            // if key pressed is the decimal and it is not already in the field
            if (decimal && key == decimal.charCodeAt(0)) {
                if ($.inArray(decimal, value.split('')) == -1) {
                    allow = true;
                }
                else {
                    allow = false;
                }
            }
        }
        else {
            allow = true;
            // remove extra decimal places
            if (decimal && decimalPlaces > 0) {
                var selectionStart = $.fn.getSelectionStart(this);
                var selectionEnd = $.fn.getSelectionEnd(this);
                var dot = $.inArray(decimal, $(this).val().split(''));
                if (selectionStart === selectionEnd && dot >= 0 && selectionStart > dot && $(this).val().length > dot + decimalPlaces) {
                    allow = false;
                }
            }

        }
        return allow;
    };

    $.fn.numeric.keyup = function (e) {
        var val = $(this).val();
        if (val && val.length > 0) {
            // get carat (cursor) position
            var carat = $.fn.getSelectionStart(this);
            var selectionEnd = $.fn.getSelectionEnd(this);
            // get decimal character and determine if negatives are allowed
            var decimal = $.data(this, "numeric.decimal");
            var negative = $.data(this, "numeric.negative");
            var decimalPlaces = $.data(this, "numeric.decimalPlaces");

            // prepend a 0 if necessary
            if (decimal !== "" && decimal !== null) {
                // find decimal point
                var dot = $.inArray(decimal, val.split(''));
                // if dot at start, add 0 before
                if (dot === 0) {
                    this.value = "0" + val;
                    carat++;
                    selectionEnd++;
                }
                // if dot at position 1, check if there is a - symbol before it
                if (dot == 1 && val.charAt(0) == "-") {
                    this.value = "-0" + val.substring(1);
                    carat++;
                    selectionEnd++;
                }
                val = this.value;
            }

            // if pasted in, only allow the following characters
            var validChars = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, '-', decimal];
            // get length of the value (to loop through)
            var length = val.length;
            // loop backwards (to prevent going out of bounds)
            for (var i = length - 1; i >= 0; i--) {
                var ch = val.charAt(i);
                // remove '-' if it is in the wrong place
                if (i !== 0 && ch == "-") {
                    val = val.substring(0, i) + val.substring(i + 1);
                }
                    // remove character if it is at the start, a '-' and negatives aren't allowed
                else if (i === 0 && !negative && ch == "-") {
                    val = val.substring(1);
                }
                var validChar = false;
                // loop through validChars
                for (var j = 0; j < validChars.length; j++) {
                    // if it is valid, break out the loop
                    if (ch == validChars[j]) {
                        validChar = true;
                        break;
                    }
                }
                // if not a valid character, or a space, remove
                if (!validChar || ch == " ") {
                    val = val.substring(0, i) + val.substring(i + 1);
                }
            }
            // remove extra decimal characters
            var firstDecimal = $.inArray(decimal, val.split(''));
            if (firstDecimal > 0) {
                for (var k = length - 1; k > firstDecimal; k--) {
                    var chch = val.charAt(k);
                    // remove decimal character
                    if (chch == decimal) {
                        val = val.substring(0, k) + val.substring(k + 1);
                    }
                }
            }

            // remove extra decimal places
            if (decimal && decimalPlaces > 0) {
                var dot = $.inArray(decimal, val.split(''));
                if (dot >= 0) {
                    val = val.substring(0, dot + decimalPlaces + 1);
                    selectionEnd = Math.min(val.length, selectionEnd);
                }
            }
            // set the value and prevent the cursor moving to the end
            this.value = val;
            $.fn.setSelection(this, [carat, selectionEnd]);
        }
    };

    $.fn.numeric.blur = function () {
        var decimal = $.data(this, "numeric.decimal");
        var callback = $.data(this, "numeric.callback");
        var negative = $.data(this, "numeric.negative");
        var val = this.value;
        if (val !== "") {
            var re = new RegExp("^" + (negative ? "-?" : "") + "\\d+$|^" + (negative ? "-?" : "") + "\\d*" + decimal + "\\d+$");
            if (!re.exec(val)) {
                callback.apply(this);
            }
        }
    };

    $.fn.removeNumeric = function () {
        return this.data("numeric.decimal", null).data("numeric.negative", null).data("numeric.callback", null).data("numeric.decimalPlaces", null).unbind("keypress", $.fn.numeric.keypress).unbind("keyup", $.fn.numeric.keyup).unbind("blur", $.fn.numeric.blur);
    };

    // Based on code from http://javascript.nwbox.com/cursor_position/ (Diego Perini <dperini@nwbox.com>)
    $.fn.getSelectionStart = function (o) {
        if (o.type === "number") {
            return undefined;
        }
        else if (o.createTextRange && document.selection) {
            var r = document.selection.createRange().duplicate();
            r.moveEnd('character', o.value.length);
            if (r.text == '') return o.value.length;

            return Math.max(0, o.value.lastIndexOf(r.text));
        } else {
            try { return o.selectionStart; }
            catch (e) { return 0; }
        }
    };

    // Based on code from http://javascript.nwbox.com/cursor_position/ (Diego Perini <dperini@nwbox.com>)
    $.fn.getSelectionEnd = function (o) {
        if (o.type === "number") {
            return undefined;
        }
        else if (o.createTextRange && document.selection) {
            var r = document.selection.createRange().duplicate()
            r.moveStart('character', -o.value.length)
            return r.text.length
        } else return o.selectionEnd
    }

    // set the selection, o is the object (input), p is the position ([start, end] or just start)
    $.fn.setSelection = function (o, p) {
        // if p is number, start and end are the same
        if (typeof p == "number") { p = [p, p]; }
        // only set if p is an array of length 2
        if (p && p.constructor == Array && p.length == 2) {
            if (o.type === "number") {
                o.focus();
            }
            else if (o.createTextRange) {
                var r = o.createTextRange();
                r.collapse(true);
                r.moveStart('character', p[0]);
                r.moveEnd('character', p[1] - p[0]);
                r.select();
            }
            else {
                o.focus();
                try {
                    if (o.setSelectionRange) {
                        o.setSelectionRange(p[0], p[1]);
                    }
                } catch (e) {
                }
            }
        }
    };

}));
(function ($) {
    $.QueryString = (function (a) {
        if (a == "") return {};
        var b = {};
        for (var i = 0; i < a.length; ++i) {
            var p = a[i].split('=');
            if (p.length != 2) continue;
            b[p[0]] = decodeURIComponent(p[1].replace(/\+/g, " "));
        }
        return b;
    })(window.location.search.substr(1).split('&'))
})(jQuery);
if (!Array.prototype.find) {
    Array.prototype.find = function (predicate) {
        if (this === null) {
            throw new TypeError('Array.prototype.find called on null or undefined');
        }
        if (typeof predicate !== 'function') {
            throw new TypeError('predicate must be a function');
        }
        var list = Object(this);
        var length = list.length >>> 0;
        var thisArg = arguments[1];
        var value;

        for (var i = 0; i < length; i++) {
            value = list[i];
            if (predicate.call(thisArg, value, i, list)) {
                return value;
            }
        }
        return undefined;
    };
}
Array.prototype.move = function (old_index, new_index) {
    if (new_index >= this.length) {
        var k = new_index - this.length;
        while ((k--) + 1) {
            this.push(undefined);
        }
    }
    var val = this.splice(old_index, 1)[0];
    if (new_index > old_index) {
        new_index--;
    }
    this.splice(new_index, 0, val);
    return this; // for testing purposes
};
// 'utils' Module
//
// Depends on: nothing

utils = {};

utils.CreateGuid = function() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = Math.random()*16|0, v = c == 'x' ? r : (r&0x3|0x8);
        return v.toString(16);
    });
};

utils.FormatDateTime = function(date, time) {
    if (date != undefined && time != undefined) {
        return moment(date).format("YYYY-MM-DD") + " " + time;
    }
    return null;
};

utils.GetParameterByName = function (name) {
    name = name.replace(/[\[]/, "\\[").replace(/[\]]/, "\\]");
    var regex = new RegExp("[\\?&]" + name + "=([^&#]*)"),
        results = regex.exec(location.search);
    return results === null ? "" : decodeURIComponent(results[1].replace(/\+/g, " "));
}

utils.GetHiddenValByName = function (name) {
    return $("input[name='"+name+ "']").val()
}

//xAxisType = self.selectedNode().ColumnTypes()[xAxis])
utils.RenderChart = function (resultsContainer, data, graphType, xIndex, xAxisType, yIndex, yAxisType) {
    if (data && data.length > 0) {

        var svgWidth = $(resultsContainer).innerWidth();
        var svgHeight = 460;

        var margin = { top: 20, right: 20, bottom: 40, left: 50 };

        if (svgWidth - margin.left - margin.right > 600) {
            var extraMargin = Math.floor((svgWidth - margin.left - margin.right - 600) / 2);
            margin.left += extraMargin;
            margin.right += extraMargin;
        }

        var width = svgWidth - margin.left - margin.right;
        var height = 400;


        switch (graphType) {
            case "Line Chart":
                var theData = data.slice();
                theData.sort(function (a, b) {
                    if (a[xIndex] < b[xIndex]) {
                        return -1;
                    }
                    if (a[xIndex] > b[xIndex]) {
                        return 1;
                    }
                    // a must be equal to b
                    return 0;
                });

                var xScale, xAxis, xSelector;
                if (tools.IsDatetimeType(xAxisType)) {
                    xSelector = function (d) { return new Date(d[xIndex]); };

                    xScale = d3.time.scale()
                        .domain(d3.extent(theData, xSelector))
                        .range([0, width]);

                    xAxis = d3.svg.axis()
                        .scale(xScale)
                        .orient("bottom")
                        .ticks(5);
                } else {
                    xSelector = function (d) { return d[xIndex]; };

                    xScale = d3.scale.linear()
                        .domain(d3.extent(theData, xSelector))
                        .range([0, width]);

                    xAxis = d3.svg.axis()
                        .scale(xScale)
                        .orient("bottom")
                        .ticks(5);
                }


                var ySelector = function (d) { return d[yIndex]; };

                var min = 0;
                var max = Math.max.apply(null, theData.map(ySelector));

                var yScale = d3.scale.linear()
                    .domain([min, max])
                    .range([height, 0]);

                var yAxis = d3.svg.axis()
                    .scale(yScale)
                    .orient("left")
                    .ticks(5);

                var parent = $(resultsContainer).empty();

                // create svg
                var svg = d3.select('#' + parent.attr('id'))
                    .append('svg')
                    .attr("width", svgWidth)
                    .attr("height", svgHeight);

                var inner = svg.append("g")
                   .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

                // x axis
                var xAxisGroup = inner.append("g")
                        .attr("transform", "translate(0," + height + ")");

                xAxisGroup.call(xAxis)

                xAxisGroup.selectAll("line,path")
                    .attr("fill", "none")
                    .attr("stroke", "#333333")
                    .attr("shape-rendering", "crispEdges");

                xAxisGroup.selectAll("text")
                    .attr("font-family", "sans-serif")
                    .attr("text-anchor", "end")
                    .attr("font-size", "11px");

                // y axis
                var yAxisGroup = inner.append("g");

                yAxisGroup.call(yAxis);

                yAxisGroup.selectAll("text")
                    .attr("font-family", "sans-serif")
                    .attr("text-anchor", "end")
                    .attr("font-size", "11px");

                yAxisGroup.selectAll("line,path")
                    .attr("fill", "none")
                    .attr("stroke", "#333333")
                    .attr("shape-rendering", "crispEdges");

                var line = d3.svg.line()
                .x(function (d) {
                    return xScale(xSelector(d));
                })
                .y(function (d) {
                    return yScale(ySelector(d));
                });

                // create lines
                inner.append("path")
                    .datum(theData)
                    .attr("fill", "none")
                    .attr("d", line)
                    .attr("stroke", "rgb(100, 100, 255)")
                    .attr("stroke-width", "1px");
                break;
            case "Bar Chart":
                var xSelector = function (d) { return d[xIndex]; };
                var ySelector = function (d) { return d[yIndex]; };

                var theData = data.slice(0, 25);

                var xScale = d3.scale.ordinal()
                    .domain(d3.range(theData.length))
                    .rangeRoundPoints([0, width], 1)

                var xAxis = d3.svg.axis()
                    .scale(xScale)
                    .orient("bottom")
                    .ticks(theData.length)
                    .tickFormat(function (d) {
                        return xSelector(theData[d])
                    });

                var min = 0; //Math.min.apply(null, theData.map(function (row) { return Math.min.apply(null, row.slice(1)) }));;
                var max = Math.max.apply(null, theData.map(ySelector));


                var yScale = d3.scale.linear()
                    .domain([min, max])
                    .range([height, 0]);

                var yAxis = d3.svg.axis()
                    .scale(yScale)
                    .orient("left")
                    .ticks(5);

                var parent = $(resultsContainer).empty();

                // create svg
                var svg = d3.select('#' + parent.attr('id'))
                    .append('svg')
                    .attr("width", svgWidth)
                    .attr("height", svgHeight);

                var inner = svg.append("g")
                   .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

                // x axis
                var xAxisGroup = inner.append("g")
                        .attr("transform", "translate(0," + height + ")");

                xAxisGroup.call(xAxis);

                xAxisGroup.selectAll("line,path")
                    .attr("fill", "none")
                    .attr("stroke", "#333333")
                    .attr("shape-rendering", "crispEdges");

                xAxisGroup.selectAll(".domain")
                    .attr("stroke", "none");

                xAxisGroup.selectAll("text")
                    .style("text-anchor", "end")
                    .attr("dx", "-.8em")
                    .attr("dy", ".15em")
                    .attr("transform", "rotate(-65)")
                    .attr("font-family", "sans-serif")
                    .attr("text-anchor", "end")
                    .attr("font-size", "11px");


                // y axis
                var yAxisGroup = inner.append("g");

                yAxisGroup.call(yAxis);

                yAxisGroup.selectAll("text")
                    .attr("font-family", "sans-serif")
                    .attr("text-anchor", "end")
                    .attr("font-size", "11px");

                yAxisGroup.selectAll("line,path")
                    .attr("fill", "none")
                    .attr("stroke", "#333333")
                    .attr("shape-rendering", "crispEdges");

                var xOffset = 0;
                var xSpace = width / theData.length;
                if (theData.length > 1) {
                    var range = xScale.range();
                    xSpace = range[1] - range[0];
                    for (var i = 1; i + 1 < theData.length; i++) {
                        var diff = range[i + 1] - range[i]
                        if (diff < xSpace) {
                            xSpace = diff;
                        }
                    }
                    xOffset = range[0] - (xSpace / 2);
                }

                var bars = inner.append("g")
                    .selectAll("g")
                    .data(theData)
                    .enter().append("g")
                    .attr("transform", function (d, j) { return "translate(" + (xOffset + (j * xSpace)) + ",0)"; });

                var barMargin = 6;
                var barWidth = xSpace - (2 * barMargin);

                bars.append("rect")
                    .attr("x", barMargin)
                    .attr("y", function (d) { return yScale(ySelector(d)); })
                    .attr("height", function (d) { return height - yScale(ySelector(d)); })
                    .attr("width", barWidth - 1)
                    .on('mouseover', function (d) {
                        d3.select(this.parentNode).selectAll("rect").attr("opacity", 0.8);
                        d3.select(this.parentNode).selectAll("text").attr("fill", "black");
                    }).on('mouseout', function (d) {
                        d3.select(this.parentNode).selectAll("rect").attr("opacity", 1);
                        d3.select(this.parentNode).selectAll("text").attr("fill", "none");
                    })
                    .attr("fill", "rgb(255, 100, 100)");

                bars.append("text")
                    .attr("text-anchor", "middle")
                    .attr("fill", "none")
                    .attr("x", barMargin + (.5 * barWidth))
                    .attr("y", function (d) { return yScale(ySelector(d)) - 3; })
                    .text(function (d) { return ySelector(d); });

                svg.attr("height", $('svg > g').get(0).getBBox().height + 6);

                $(".bar").css("background-color", "Red");
                break;
            case "Pie Chart":
                var radius = Math.min(width, height) / 2;

                var unfilteredData = data.slice(0, 25);
                var total = unfilteredData.reduce(function (curr, row) { return curr + row[yIndex]; }, 0);

                var other = 0;
                var theData = [];

                $.each(unfilteredData, function (i, row) {
                    if (total != 0) {
                        var percentage = 100 * row[yIndex] / total;
                        if (percentage >= 1) {
                            theData.push([row[xIndex], row[yIndex], percentage, false]);
                        } else {
                            other += row[yIndex];
                        }
                    } else {
                        theData.push([row[xIndex], row[yIndex], null, false]);
                    }
                });

                if (other > 0) {
                    theData.push(["Other", other, total != 0 ? other / total : null, true]);
                }


                theData.sort(function (a, b) {
                    if (a[1] < b[1]) {
                        return -1;
                    }
                    if (a[1] > b[1]) {
                        return 1;
                    }
                    // a must be equal to b
                    return 0;
                });


                var xSelector = function (d) { return d[xIndex]; };
                var ySelector = function (d) { return d[yIndex]; };

                var pie = d3.layout.pie()
                    .sort(null)
                    .startAngle(-0.25 * Math.PI)
                    .endAngle(1.75 * Math.PI)
                    .value(function (d) {
                        return d[1];
                    });

                var arc = d3.svg.arc()
                    .outerRadius(radius * 0.8)
                    .innerRadius(radius * 0.4);

                var outerArc = d3.svg.arc()
                    .outerRadius(radius * 0.9)
                    .innerRadius(radius * 0.9);

                var parent = $(resultsContainer).empty();

                // create svg
                var svg = d3.select('#' + parent.attr('id'))
                    .append('svg')
                    .attr("width", width + margin.left + margin.right)
                    .attr("height", height + margin.top + margin.bottom);

                var g = svg.append("g")
                   .attr("transform", "translate(" + (margin.left + (width / 2)) + "," + (margin.top + (height / 2)) + ")");

                var lineFunction = d3.svg.line()
                    .x(function (d) { return d[0]; })
                    .y(function (d) { return d[1]; })
                    .interpolate("linear");

                var getLabel = function (segment) {
                    var result = segment.data[0]

                    //if (instance.LabelType() == "Name and Value") {
                    result += " (" + segment.data[1] + ")";
                    //} else if (instance.LabelType() == "Name and Percentage") {
                    //    if (segment.data[2] != null) {
                    //        result += " (" + parseFloat(segment.data[2].toPrecision(3)) + "%)";
                    //    } else {
                    //        result += " (" + segment.data[1] + ")";
                    //    }
                    //}
                    return result;
                }


                var colours = ['#98abc5', '#8a89a6', '#7b6888', '#6b486b', '#a05d56', '#d0743c', '#ff8c00', '#7283a2'];

                var otherColour = '#BBB';

                $.each(pie(theData), function (i, segment) {
                    var segmentGrp = g.append("g"),
                        innerPoint = arc.centroid(segment),
                        outerPoint = outerArc.centroid(segment),
                        onLeftSide = outerPoint[0] < 0,
                        textPoint = [onLeftSide ? -radius : radius, outerPoint[1]];

                    var slice = segmentGrp.append("path")
                        .attr("fill", (segment.data[3] ? otherColour : colours[i % colours.length]))
                        .attr("d", arc(segment));

                    var lineGraph = segmentGrp.append("path")
                        .attr("d", lineFunction([innerPoint, outerPoint, textPoint]))
                        .attr("stroke", "black")
                        .attr("stroke-width", 1)
                        .attr("fill", "none");

                    var text = segmentGrp.append("text")
                        .text(getLabel(segment))
                        .attr('x', textPoint[0])
                        .attr('y', textPoint[1])
                        .attr('text-anchor', onLeftSide ? 'end' : 'start')
                        .attr('alignment-baseline', 'middle');

                })

                break;
            default:
                $(resultsContainer).empty();
        }

    } else {
        $(resultsContainer).empty();
    }
}
// 'backend' Module
//
// Depends on: utils.js

backend = {};

(function () {

    backend.CheckConnection = function (models, callback) {
        var databaseId = utils.GetHiddenValByName('DatabaseConnectionID');
        $.getJSON("/api/connection/?databaseId=" + databaseId, function (data) {
            callback(data);
        });
    };

    backend.LoadTables = function (callback) {
        var databaseId = utils.GetHiddenValByName('DatabaseConnectionID');
        $.getJSON("/api/tables/?databaseId=" + databaseId, function (data) {
            callback(data);
        })
        .fail(function () {
            callback([]);
        });
    };

    backend.GetJoins = function (tableName, callback) {
        var databaseId = utils.GetHiddenValByName('DatabaseConnectionID');
        $.getJSON("/api/joins/?databaseId=" + databaseId + "&tableName=" + tableName, function (data) {
            callback(data);
        })
        .fail(function () {
            callback([]);
        });
    };

    var lock = false,
        callbacks = [],
        latestNodes = null;

    backend.saveQuery = function (serverQueryKey, nodes, callback) {
        if (callback) {
            callbacks.push(callback);
        }

        if (lock) {
            latestNodes = nodes;
        } else {
            lock = true;
            latestNodes = null;
            $.ajax({
                "url": '/api/Nodes',
                "type": 'POST',
                "data": {
                    id: serverQueryKey(),
                    databaseId: utils.GetHiddenValByName('DatabaseConnectionID'),
                    nodes: JSON.stringify(nodes)
                },
                "dataType": "json"
            }).done(function (data) {
                serverQueryKey(data.id);
                lock = false;

                // if we have callbacks then obviously something changed while we were getting results, add this callback to queue and resave to get latest data
                if (latestNodes) {
                    var tmp = latestNodes;
                    latestNodes = null;
                    backend.saveQuery(serverQueryKey, tmp);
                } else {
                    while (callbacks.length > 0) {
                        callbacks.shift()();
                    }
                }
            }).fail(function () {
                lock = false;
                latestNodes = null;
                callbacks.length = 0;
            });
        }
    }

    backend.LoadData = function (serverQueryKey, nodes, nodeId, startRow, rowCount, format, output, callback) {
        if (!serverQueryKey()) {
            backend.saveQuery(serverQueryKey, nodes, function () {
                backend.LoadData(serverQueryKey, nodes, nodeId, startRow, rowCount, format, output, callback);
            });
        } else {
            $.getJSON("/api/data/?id=" + serverQueryKey() + "&nodeId=" + nodeId + "&startRow=" + startRow + "&rowCount=" + rowCount, function (data) {
                if (data.query) {
                    console.log(data.query);
                }
                callback(data);
            })
            .fail(function (jqXHR, textStatus, errorThrown) {
                if (jqXHR.status == "404") {
                    serverQueryKey(null);
                    backend.LoadData(serverQueryKey, nodes, nodeId, startRow, rowCount, format, output, callback);
                } else {
                    callback({ status: "error" })
                }
            });
        }
    };

    backend.SaveSchedule = function (schedule, callback) {
        $.ajax({
            "url": '/api/schedule',
            "type": 'POST',
            "contentType": "application/json",
            "data": JSON.stringify(schedule),
            "dataType": "json"
        }).done(function (data) {
            callback(data);
        }).fail(function (data) {
            callback(data);
        });
    }

    backend.GetSchedule = function (queryId) {
        return $.ajax({
            "url": '/api/schedule?id=' + queryId,
            "type": 'GET',
            "contentType": "application/json",
            "dataType": "json"
        });
    }

    backend.LoadQueryColumnsName = function (queryId) {
        return $.ajax({
            "url": "/api/QueryColumnsName?queryId=" + queryId,
            "type": 'GET'
        });
    };
})();
// 'nodes' Module
//
// Defines a number of classes that can be used to create nodes on the workspace
//
// Depends on: knockout.js, utils.js, backend.js

var getTransmitterPoint;
var getReceiverPoint;
var theChart = null;

getTransmitterPoint = function (node) {
    var point = { };
    point.x = node.Left() + 60; // (48 + 12), 12 pixels left of the source node's right edge
    point.y = node.Top() + 24; // (48 / 2), half way down the source node
    return point;
};

getReceiverPoint = function (node) {
    var point = { };
    point.x = node.Left() - 12; // 12 pixels left of this node's left edge
    point.y = node.Top() + 24; // (48 / 2), half way down the destination node
    return point;
};

nodes = {};

// Base class for all Workspace Nodes
nodes.NodeBase = function(properties) {
    var instance = {};
            
    // The name to display beneath this node's icon
    instance.Name = ko.observable(properties.Name);

    if (properties.Tool) {
        // A reference to this node's tool type
        instance.Tool = properties.Tool;

        // The path of the icon for this node
        instance.SymbolPath = properties.Tool.SymbolPath;
    }

    // The location of this node's options UI template
    instance.OptionsTemplateUrl = properties.OptionsTemplateUrl;

    // The location of this node
    instance.Top = ko.observable(properties.Top);
    instance.Left = ko.observable(properties.Left);

    // Is this node currently selected
    instance.IsSelected = ko.observable(false);

    // An array of this node's columns
    instance.ColumnItems = ko.observableArray();

    instance.SetColumns = function (column_names, column_types) {
        var cols = [];
        if (column_names && column_types && column_names.length == column_types.length) {
            for (var i = 0; i < column_names.length; i++) {
                cols.push({ column_name: column_names[i], column_type: column_types[i] });
            }
        }
        instance.ColumnItems(cols);
    }

    instance.ColumnTypes = ko.computed(function () {
        var items = instance.ColumnItems();

        if (items === undefined) {
            return [];
        } else {
            return items.map(function (col) { return col.column_type; });
        }
    });

    instance.Columns = ko.computed(function () {
        var items = instance.ColumnItems();

        if (items === undefined) {
            return [];
        } else {
            return items.map(function (col) { return col.column_name; });
        }

    });

    // A unique ID for this Node
    instance.Id = properties.Id;
    if (instance.Id == undefined) {
        instance.Id = utils.CreateGuid();
    }

    instance.ErrorText = ko.observable(null);

    // All nodes get notified when selected so they can render their results
    instance.OnSelected = function(models) {
    }

    // All nodes get notified when the options window is closed
    instance.OnOptionsUpdated = function() {
    }

	// All nodes have the opportunity to override this and say whether they are configured or not
    instance.IsConfigured = function () {
        return true;
    }

    // default base instace of a function to get the core settings
    // which the qt.exe process needs. Nodes may override this 
    // function to pass more settings to qt.exe
    instance.GetCoreSettings = function() {
        var settings = {
            "Type": instance.Tool.Name,
            "Id": instance.Id
        }

        return settings;
                    
    }

    // default base instance of a function by which the system
    // will get the properties from a node that need to be
    // saved. Nodes may override this function to persist more
    // of their settings
    instance.GetSaveSettings = function() {
        var settings = instance.GetCoreSettings();
                
        settings["Name"] = instance.Name();
        settings["Top"] = instance.Top();
        settings["Left"] = instance.Left();

        if (instance.Columns()) {
            settings["Columns"] = instance.Columns();
        }

        if (instance.ColumnTypes()) {
            settings["ColumnTypes"] = instance.ColumnTypes();
        }

        return settings;
    }
            
    instance.LoadSettings = function(settings, model) {
        instance.Name(settings.Name);
        instance.Id = settings.Id;
        instance.Top(settings.Top);
        instance.Left(settings.Left);
        instance.SetColumns(settings.Columns, settings.ColumnTypes);
    }

    instance.GetRightExtent = function() {
        if (instance.GetTransmitterPoint) {
            var p = instance.GetTransmitterPoint();
            return p.x + 16;
        }
        else {
            return instance.Left() + 64;
        }
    }

    instance.GetBottomExtent = function() {
        return instance.Top() + 80;
    }

    return instance;
};

// Base class for all Data Source type Workspace Nodes
nodes.DataSourceBase = function(properties) {
    var instance = new nodes.NodeBase(properties);
    instance.Type = 'DataSource';

    // This node's current data set
    instance.Data = ko.observableArray();
    instance.TotalPages = ko.computed(function() {
        return Math.floor(instance.Data().length / 10.0) + 1;
    });

    instance.CurrentPage = ko.observable(1);

    instance.CurrentPageData = ko.computed(function() {
        return instance.Data.slice((instance.CurrentPage() - 1) * 10, Math.min(((instance.CurrentPage() - 1) * 10) + 9, instance.Data().length - 1));
    });

    instance.GetTransmitterPoint = function() {
        return getTransmitterPoint(this);
    };

    var innerLoadSettings = instance.LoadSettings;
    instance.LoadSettings = function (settings, model) {
        innerLoadSettings(settings, model);
    };

    return instance;
};

nodes.DatabaseTable = function(properties) {
    var instance = new nodes.DataSourceBase(properties);
    instance.Tables = ko.observableArray();
    instance.Table = ko.observable();
    instance.TablesLoading = ko.observable(false);
    
    instance.Table.subscribe(function (val) {
        if (/Data Table [0-9]+/.test(instance.Name()) || $.inArray(instance.Name(), instance.Tables()) >=  0) {
            instance.Name(val);
        }
    });

    instance.loadTables = function (callback) {
        if (instance.Tables().length == 0) {
            instance.TablesLoading(true);
            backend.LoadTables(function(data) {
                if (data.status == null) {
                    instance.Tables(data);
                    instance.TablesLoading(false);
                }

                if (callback) {
                    callback();
                }
            });
        }
    };

    var innerGetCoreSettings = instance.GetCoreSettings;
    instance.GetCoreSettings = function() {
        var settings = innerGetCoreSettings();
        settings.Table = instance.Table();
        return settings;                
    }
            
    var innerGetSaveSettings = instance.GetSaveSettings;
    instance.GetSaveSettings = function() {
        var settings = innerGetSaveSettings();
        settings.Tables = instance.Tables();
        return settings;
    };

    var innerLoadSettings = instance.LoadSettings;
    instance.LoadSettings = function(settings, model) {
        innerLoadSettings(settings, model);
        instance.Tables(settings.Tables);
        instance.Table(settings.Table);
    };

    instance.IsConfigured = function () {
        return instance.Tables().length > 0;
    }

    instance.OnSelected = function(models) {
        // Load the tables if they are empty
        instance.loadTables();

        var optionsDiv = $(".dialog[data-node-id='" + models.SelectedNode().Id + "']");
        optionsDiv.find("a.refreshData").click(function() { 
            instance.Tables.removeAll();
            instance.loadTables();
        });
    }

    return instance;
};

// Base class for all Data Processing type Workspace Nodes
nodes.DataProcessorBase = function(properties) {
    var instance = new nodes.NodeBase(properties);
    instance.Type = 'DataProcessor';

    // This node's current data set
    instance.Data = ko.observableArray();
    instance.TotalPages = ko.computed(function() {
        return Math.floor(instance.Data().length / 10.0) + 1;
    });
    instance.CurrentPage = ko.observable(1);

    instance.CurrentPageData = ko.computed(function() {
        return instance.Data.slice((instance.CurrentPage() - 1) * 10, Math.min(((instance.CurrentPage() - 1) * 10) + 9, instance.Data().length));
    });

    // Indicates whether this node will accpet new input connections
    instance.IsInputAllowed = ko.observable(true);

    // An array of ids to this node's input nodes
    instance.Inputs = ko.observableArray();

    // A standard way of storing references to this node's inputs
    instance.InputRefs = ko.observableArray();

    // An event handler that is called when a new input is connected
    instance.OnInputsUpdated = function(model) {
        // Update the InputRefs map
        instance.InputRefs.removeAll();
        $.each(instance.Inputs(), function(i, inputId) {
            var inputRef = model.GetNodeById(inputId);
            if (inputRef != null) {
                instance.InputRefs.push(inputRef);
            }
        });
        instance.IsInputAllowed(instance.Inputs().length < instance.Tool.MaxInputs)
        if (instance.Inputs().length == 0) {
            instance.ColumnItems.removeAll();
            instance.Data.removeAll();
        }
    };

    // Helper function to get all the column names from all the inputs
    instance.AllInputColumns = ko.computed(function() {
        var result = [];
        $.each(instance.InputRefs(), function(i, inputRef) {
            if (inputRef.Columns() != undefined) {
                $.each(inputRef.Columns(), function(j, col) {
                    result.push(col);
                });
            }
        });
        return result;
    });

    // Helper function to get all the column names from all the inputs
    instance.NumericInputColumns = ko.computed(function () {
        var result = [];
        $.each(instance.InputRefs(), function (i, inputRef) {
            if (inputRef.ColumnItems() != undefined) {
                var columns = inputRef.ColumnItems();
                for (var i = 0; i < columns.length; i++) {
                    if (tools.IsNumericType(columns[i].column_type)) {
                        result.push(columns[i].column_name);
                    }
                }
            }
        });
        return result;
    });

    // Helper function to get all the column names from all the inputs
    instance.NumericOrDatetimeInputColumns = ko.computed(function () {
        var result = [];
        $.each(instance.InputRefs(), function (i, inputRef) {
            if (inputRef.ColumnItems() != undefined) {
                var columns = inputRef.ColumnItems();
                for (var i = 0; i < columns.length; i++) {
                    if (tools.IsNumericType(columns[i].column_type) || tools.IsDatetimeType(columns[i].column_type)) {
                        result.push(columns[i].column_name);
                    }
                }
            }
        });
        return result;
    });

    // Helper function to get info of all the columns from all the inputs
    instance.AllInputColumnInfos = ko.computed(function() {
        var result = [];
        $.each(instance.InputRefs(), function(i, inputRef) {
            if (inputRef.ColumnItems() != undefined) {
                $.each(inputRef.ColumnItems(), function (j, col) {
                    result.push({ InputId: inputRef.Id, Index: j, Name: col.column_name, Type: col.column_type });
                });
            }
        });
        return result;
    })

    // Helper function to get info of all the columns from all the inputs
    instance.NumericInputColumnInfos = ko.computed(function () {
        var result = [];
        $.each(instance.InputRefs(), function (i, inputRef) {
            if (inputRef.ColumnItems() != undefined) {
                $.each(inputRef.ColumnItems(), function (j, col) {
                    if (tools.IsNumericType(col.column_type)) {
                        result.push({ InputId: inputRef.Id, Index: j, Name: col.column_name, Type: col.column_type });
                    }
                });
            }
        });
        return result;
    })

    // Helper function to get the columns from a specified input
    instance.GetInputColumns = function(i) {
        if (instance.InputRefs().length > i) {
            return instance.InputRefs()[i].Columns();
        }
        else {
            return [];
        }
    }

    // Helper function to get the name of a specified input
    instance.GetInputName = function(i) {
        if (instance.InputRefs().length > i) {
            return instance.InputRefs()[i].Name();
        }
        else {
            return "";
        }
    }

    var innerGetCoreSettings = instance.GetCoreSettings;
    instance.GetCoreSettings = function () {
        var settings = innerGetCoreSettings();
        settings.Inputs = instance.Inputs();
        return settings;
    }

    var innerLoadSettings = instance.LoadSettings;
    instance.LoadSettings = function(settings, model) {
        innerLoadSettings(settings, model);
        instance.Inputs(settings.Inputs);
        instance.OnInputsUpdated(model);
    }

    instance.GetTransmitterPoint = function() {
        return getTransmitterPoint(this);
    }

    instance.GetReceiverPoint = function() {
        return getReceiverPoint(this);
    }

    return instance;
};

nodes.Join = function(properties) {
    var instance = new nodes.DataProcessorBase(properties);

    instance.JoinType = ko.observable();
    instance.Table1Column = ko.observable();
    instance.Table2Column = ko.observable();

    instance.Table1Columns = ko.computed(function() {
        return instance.GetInputColumns(0);
    });

    instance.Table2Columns = ko.computed(function() {
        return instance.GetInputColumns(1);
    });
            
    instance.Table1Name = ko.computed(function() {
        return instance.GetInputName(0);
    });
            
    instance.Table2Name = ko.computed(function() {
        return instance.GetInputName(1);
    });

    var innerGetCoreSettings = instance.GetCoreSettings;
    instance.GetCoreSettings = function() {
        var settings = innerGetCoreSettings();
        settings.JoinType = instance.JoinType();
        settings.Table1Column = instance.Table1Column();
        settings.Table2Column = instance.Table2Column();
        return settings;
    };

    var innerLoadSettings = instance.LoadSettings;
    instance.LoadSettings = function(settings, model) {
        innerLoadSettings(settings, model);
        instance.JoinType(settings.JoinType);
        instance.Table1Column(settings.Table1Column);
        instance.Table2Column(settings.Table2Column);
    };

    instance.OnOptionsUpdated = function(model) {
    }

    instance.CalculateColumns = function () {
        var columnInfos = instance.AllInputColumnInfos(),
            columnNames = columnInfos.map(function (col) { return col.Name; }),
            columnTypes = columnInfos.map(function (col) { return col.Type; });

        instance.SetColumns(columnNames, columnTypes)
    }

    return instance;
};
        
nodes.Select = function(properties) {
    var instance = new nodes.DataProcessorBase(properties);
    instance.IncludedColumnIndexes = ko.observableArray();
    instance.ColumnAliases = ko.observableArray();
    instance.EditingPosition = ko.observable(null);
    instance.EditColumnName = ko.observable();

    var innerGetCoreSettings = instance.GetCoreSettings;
    instance.GetCoreSettings = function() {
        var settings = innerGetCoreSettings();
        settings.IncludedColumnIndexes = instance.IncludedColumnIndexes();
        settings.ColumnAliases = instance.ColumnAliases();
        return settings;
    }

    var innerLoadSettings = instance.LoadSettings;
    instance.LoadSettings = function(settings, model) {
        innerLoadSettings(settings, model);
        instance.IncludedColumnIndexes(settings.IncludedColumnIndexes || []);
        instance.ColumnAliases(settings.ColumnAliases || []);
    }

    instance.GetColumnName = function(i) {
        if (instance.IncludedColumnIndexes().length > i() && instance.IncludedColumnIndexes()[i()] != null) {
            var j = instance.IncludedColumnIndexes()[i()];
            var name = instance.AllInputColumns()[j];

            if (instance.ColumnAliases().length > i() && instance.ColumnAliases()[i()] != null) {
                name = instance.ColumnAliases()[i()];
            }
            
            return name;
        }
        else {
            return "";
        }
    }

    instance.EnableEditMode = function (item, event) {
        // Cunning plan to force you to finish editing one item before editing the next item - causes all kinds of problems
        if (instance.EditingPosition() == null) {
            var i = $(event.target).parent().prevAll().length;
            instance.EditColumnName($(event.target).parent().find("span").text());
            instance.EditingPosition(i);
        }
        event.cancelBubble = true;
        return false;
    }

    instance.FinishedEditMode = function (item, event) {
        if (instance.EditingPosition() != null) {
            instance.ColumnAliases()[instance.EditingPosition()] = instance.EditColumnName();
            instance.EditingPosition(null);
            instance.EditColumnName(null);
            var i = $(event.target).parent().prevAll().length;
            $(event.target).parent().find("span").text(instance.ColumnAliases()[i]);
        }
        event.cancelBubble = true;
        return false;
    }

    instance.RemoveAll = function() {
        instance.IncludedColumnIndexes.removeAll();
        instance.ColumnAliases.removeAll();
    }

    instance.AddAll = function() {
        instance.IncludedColumnIndexes.removeAll();
        $.each(instance.AllInputColumnInfos(), function(i, info) {
            instance.IncludedColumnIndexes.push(info.Index);
        });
    }

    instance.RemoveItem = function(item, event) {
        var i = $(event.target).parent().prevAll().length;
        instance.IncludedColumnIndexes.splice(i, 1);
        if (instance.ColumnAliases().length > i) {
            instance.ColumnAliases.splice(i, 1);
        }
    }

    instance.IsEditing = function (i) {
        return instance.EditingPosition() === i();
    }

    instance.MoveAlias = function (i, j) {
        if (instance.EditingPosition() != null) {
            instance.EditingPosition(null);
            instance.EditColumnName(null);
        }
        instance.ColumnAliases().move(i, j);
    }

    instance.AddItem = function (i, val) {
        if (instance.ColumnAliases().length > i) {
            instance.ColumnAliases().splice(i, 0, null);
        }
    }

    instance.CalculateColumns = function () {
        var columnInfos = instance.IncludedColumnIndexes().map(function (i) { return instance.AllInputColumnInfos()[i]; }),
            columnNames = columnInfos.map(function (col) { return col.Name; }),
            columnTypes = columnInfos.map(function (col) { return col.Type; });

        instance.SetColumns(columnNames, columnTypes)
    }

    return instance;
}

nodes.Filter = function(properties) {
    var instance = new nodes.DataProcessorBase(properties);
    instance.FilterColumnIndex = ko.observable();
    instance.Operator = ko.observable();
    instance.FilterCompareColumnIndex = ko.observable(null);
    instance.FilterValue1 = ko.observable();
    instance.FilterBoolValue1 = ko.observable();
    instance.FilterDateValue1 = ko.observable(new Date());
    instance.FilterTimeValue1 = ko.observable("00:00");
    instance.CaseSensitive = ko.observable();
            
    var innerGetCoreSettings = instance.GetCoreSettings;
    instance.GetCoreSettings = function() {
        var settings = innerGetCoreSettings();
        settings.FilterColumnIndex = instance.FilterColumnIndex();
        settings.Operator = instance.Operator();
        if (instance.FilterCompareColumnIndex()) {
            settings.FilterCompareColumnIndex = instance.FilterCompareColumnIndex();
        }
        if (instance.FilterColumnIsBool()) {
            settings.FilterValue1 = instance.FilterBoolValue1();
        }
        else if (instance.FilterColumnIsDatetime()) {
            settings.FilterValue1 = utils.FormatDateTime(
                    instance.FilterDateValue1(),
                    instance.FilterTimeValue1());
        }
        else {
            settings.FilterValue1 = instance.FilterValue1();
        }
        settings.CaseSensitive = instance.CaseSensitive();
        return settings;
    }

    var innerLoadSettings = instance.LoadSettings;
    instance.LoadSettings = function(settings, model) {
        innerLoadSettings(settings, model);
        instance.FilterColumnIndex(settings.FilterColumnIndex);
        instance.Operator(settings.Operator);
        instance.FilterCompareColumnIndex(settings.FilterCompareColumnIndex);
        if (instance.FilterColumnIsBool()) {
            instance.FilterBoolValue1(settings.FilterValue1);
        }
        else if (instance.FilterColumnIsDatetime()) {
            var dt = new Date(Date.parse(settings.FilterValue1))
            instance.FilterDateValue1(dt);
            instance.FilterTimeValue1(moment(dt).format("HH:mm"));
        }
        else {
            instance.FilterValue1(settings.FilterValue1);
        }
        instance.CaseSensitive(settings.CaseSensitive);
    }
           
    instance.FilterColumnIsText = ko.computed(function() {
        var colInfo = instance.AllInputColumnInfos()[instance.FilterColumnIndex()];
        if (colInfo != null && tools.IsTextType(colInfo.Type)) {
            return true;
        } else {
            return false;
        }
    });

    instance.FilterColumnIsBool = ko.computed(function() {
        var colInfo = instance.AllInputColumnInfos()[instance.FilterColumnIndex()];
        if (colInfo != null && colInfo.Type != null) {
            return colInfo.Type.toUpperCase() == "BIT";
        }
        else {
            return false;
        }
    });

    instance.FilterColumnIsDatetime = ko.computed(function() {
        var colInfo = instance.AllInputColumnInfos()[instance.FilterColumnIndex()];
        if (colInfo != null && tools.IsDatetimeType(colInfo.Type)) {
            return true;
        }
        else {
            return false;
        }
    });

    instance.FilterColumnIsNumeric = ko.computed(function() {
        var colInfo = instance.AllInputColumnInfos()[instance.FilterColumnIndex()];
        if (colInfo != null && tools.IsNumericType(colInfo.Type)) {
            return true;
        }
        else {
            return false;
        }
    });
            
    instance.ValidOperators = ko.computed(function() {
        var results = [];
        $.each(instance.Tool.Operators(), function(i, o) {
            if ((instance.FilterColumnIsNumeric() && o.number) ||
                (instance.FilterColumnIsText() && o.text) ||
                (instance.FilterColumnIsDatetime() && o.date) ||
                (instance.FilterColumnIsBool() && o.bool)) {
                    results.push(o);
            }
        });
        return results;
    });

    instance.ShowFilterCompareValue = ko.computed(function () {
        var operatorDef = instance.Tool.Operators().find(function (o) {
            return o.type == instance.Operator();
        });

        if (operatorDef) {
            return operatorDef.compareValue;
        }
        return false;
    });

    instance.ShowFilterCompareBool = ko.computed(function() {
        return instance.FilterColumnIsBool() && instance.ShowFilterCompareValue() && instance.FilterCompareColumnIndex() == null;
    });

    instance.ShowFilterCompareDatetime = ko.computed(function() {
        return instance.FilterColumnIsDatetime() && instance.ShowFilterCompareValue() && instance.FilterCompareColumnIndex() == null;
    });

    instance.ShowFilterCompareNumeric = ko.computed(function() {
        return instance.FilterColumnIsNumeric() && instance.ShowFilterCompareValue() && instance.FilterCompareColumnIndex() == null;
    });

    instance.ShowFilterCompareValue1 = ko.computed(function() {
        return instance.FilterColumnIsNumeric() == false &&instance.FilterColumnIsBool() == false && instance.FilterColumnIsDatetime() == false && instance.ShowFilterCompareValue() && instance.FilterCompareColumnIndex() == null;
    });
            
    instance.ShowCaseSensitive = ko.computed(function () {
        var operatorDef = instance.Tool.Operators().find(function(o) {
            return o.type == instance.Operator();
        });

        if (instance.FilterColumnIsText() && operatorDef && operatorDef.showCaseSensitive) {
            return true;
        }
        else {
            return false;
        }
    });

    instance.AllInputColumnsPlusEnteredValue = ko.computed(function() {
        var result = instance.AllInputColumnInfos().slice(0);
        result.splice(0, 0, { Index: null, Name: "Enter a value..."}); // This needs to go at the front of the array in so that a Null Compare Column setting will leave the dropdown on this option
        return result;
    });

    return instance;
};

nodes.Sort = function(properties) {
            
    var instance = new nodes.DataProcessorBase(properties);
    instance.SortColumns = ko.observableArray([{
        SortColumn: ko.observable(),
        Descending: ko.observable(false)
    }]);

    instance.AddSort = function () {
        instance.SortColumns.push({
            SortColumn: ko.observable(),
            Descending: ko.observable(false)
        });
    }

    instance.RemoveSort = function (item, event) {
        instance.SortColumns.remove(item);
    }
    
    instance.OnOptionsUpdated = function(model) {
    }

    var innerGetCoreSettings = instance.GetCoreSettings;
    instance.GetCoreSettings = function() {
        var settings = innerGetCoreSettings();
        
        settings.SortColumns = [];
        settings.SortDirections = [];

        $.each(instance.SortColumns(), function (i, c) {
            settings.SortColumns.push(c.SortColumn());
            settings.SortDirections.push(!c.Descending())
        });

        return settings;
    }

    var innerLoadSettings = instance.LoadSettings;
    instance.LoadSettings = function(settings, model) {
        innerLoadSettings(settings, model);
        instance.SortColumns([]);

        if (settings.SortColumn != null) {
            instance.SortColumns().push({
                SortColumn: ko.observable(settings.SortColumn),
                Descending: ko.observable(settings.Descending | false)
            });
        }

        if (settings.SortColumns != null) {
            $.each(settings.SortColumns, function (i, c) {
                instance.SortColumns().push({
                    SortColumn: ko.observable(c),
                    Descending: ko.observable(false)
                });
            });
        }

        if (settings.SortDirections != null) {
            $.each(settings.SortDirections, function (i, d) {
                instance.SortColumns()[i].Descending(!d);
            });
        }
    }
           
    return instance;
};

nodes.Summarize = function(properties) {
    var instance = new nodes.DataProcessorBase(properties);

    instance.ShowGroupBy = ko.observable(false);
    instance.GroupByColumns = ko.observableArray();
    instance.Statistics = ko.observableArray();

    instance.ForEachColumns = ko.computed(function () {
        return instance.AllInputColumns();
    });

    instance.GroupColumns = ko.computed(function () {
        return instance.AllInputColumnInfos();
    });

    instance.GroupByFunctions = function (index) {
        var results = [];
        var col = instance.GroupColumns()[index];
        if (col) {
            if (tools.IsDatetimeType(col.Type)) {
                results = instance.Tool.DateFunctions();
            }
        }

        return results;
    }

    instance.AggColumns = ko.computed(function () {
        return instance.AllInputColumnInfos().filter(function (col) { return tools.IsNumericType(col.Type); });
    });


    var innerGetCoreSettings = instance.GetCoreSettings;
    instance.GetCoreSettings = function () {
        var settings = innerGetCoreSettings();
        settings.GroupByColumnIndexes = instance.GroupByColumns().map(function (item) { return item.index(); });
        settings.GroupByFunctions = instance.GroupByColumns().map(function (item) { return item.groupByFunction(); });
        settings.AggFunctions = [];
        settings.AggColumnIndexes = [];
        $.each(instance.Statistics(), function (i, statistic) {
            settings.AggFunctions.push(statistic.AggFunction());
            settings.AggColumnIndexes.push(statistic.AggColumn());
        });
        return settings;
    }

    var innerLoadSettings = instance.LoadSettings;
    instance.LoadSettings = function (settings, model) {
        innerLoadSettings(settings, model);
        var groupBys = [];
        for (var i = 0; i < settings.GroupByColumnIndexes.length; i++) {
            if (settings.GroupByFunctions.length > i) {
                groupBys.push({
                    "index": ko.observable(settings.GroupByColumnIndexes[i]),
                    "groupByFunction": ko.observable(settings.GroupByFunctions[i])
                });
            }
        };
        instance.GroupByColumns(groupBys);

        var statistics = [];
        for (var i = 0; i < settings.AggFunctions.length; i++) {
            if (settings.AggColumnIndexes.length > i) {
                statistics.push({
                    "AggFunction": ko.observable(settings.AggFunctions[i]),
                    "AggColumn": ko.observable(settings.AggColumnIndexes[i]),
                });
            }
        }
        instance.Statistics(statistics);
    }

    instance.GetColumnName = function (i) {
        if (instance.AllInputColumns().length > i) {
            return instance.AllInputColumns()[i];
        }
        else {
            return "";
        }
    }

    instance.AddStatistic = function () {
        instance.Statistics.push({
            "AggFunction": ko.observable(2),
            "AggColumn": ko.observable()
        });
    };

    instance.RemoveStatistic = function (item, event) {
        instance.Statistics.remove(item);
    };

    instance.AddGroupBy = function () {
        instance.GroupByColumns.push({
            "index": ko.observable(0),
            "groupByFunction": ko.observable()
        });
    };

    instance.RemoveGroupBy = function (item, event) {
        instance.GroupByColumns.remove(item);
    };

    instance.AddStatistic();

    return instance;
};

nodes.Extract = function(properties) {
    var instance = new nodes.DataProcessorBase(properties);
    instance.InputColumnIndex = ko.observable(0);
    instance.StartType = ko.observable(1);
    instance.StartPosition = ko.observable(1);
    instance.StartSearch = ko.observable("");
    instance.EndType = ko.observable(1);
    instance.EndPosition = ko.observable(0);
    instance.EndSearch = ko.observable("");
    instance.ResultColumnName = ko.observable("");
    instance.ShowStartPosition = ko.computed(function() {
        return instance.StartType() == 2;
    });
    instance.ShowEndPosition = ko.computed(function() {
        return instance.EndType() == 2 || instance.EndType() == 3;
    });
    instance.ShowStartSearch = ko.computed(function() {
        return instance.StartType() > 2;
    });
    instance.ShowEndSearch = ko.computed(function() {
        return instance.EndType() > 3;
    });
    instance.EndPositionText = ko.computed(function() {
        if (instance.EndType() == 3) {
            return "Length";
        }
        else {
            return "Position"
        }
    })


    var innerGetCoreSettings = instance.GetCoreSettings;
    instance.GetCoreSettings = function() {
        var settings = innerGetCoreSettings();
        settings.InputColumnIndex = instance.InputColumnIndex();
        settings.StartType = instance.StartType();
        settings.StartPosition = instance.StartPosition();
        settings.StartSearch = instance.StartSearch();
        settings.EndType = instance.EndType();
        settings.EndPosition = instance.EndPosition();
        settings.EndSearch = instance.EndSearch();
        settings.ResultColumnName = instance.ResultColumnName();
        return settings;
    }

    var innerLoadSettings = instance.LoadSettings;
    instance.LoadSettings = function(settings, model) {
        innerLoadSettings(settings, model);
        instance.InputColumnIndex(settings.InputColumnIndex);
        instance.StartType(settings.StartType);
        instance.StartPosition(settings.StartPosition);
        instance.StartSearch(settings.StartSearch);
        instance.EndType(settings.EndType);
        instance.EndPosition(settings.EndPosition);
        instance.EndSearch(settings.EndSearch);
        instance.ResultColumnName(settings.ResultColumnName);
    };

    return instance;
};

nodes.Append = function(properties) {
    var instance = new nodes.DataProcessorBase(properties);
    instance.IncludeUniqueColumns = ko.observable(true);

    var innerGetCoreSettings = instance.GetCoreSettings;
    instance.GetCoreSettings = function() {
        var settings = innerGetCoreSettings();
        settings.IncludeUniqueColumns = instance.IncludeUniqueColumns();
        return settings;
    }

    var innerLoadSettings = instance.LoadSettings;
    instance.LoadSettings = function(settings, model) {
        innerLoadSettings(settings, model);
        instance.IncludeUniqueColumns(settings.IncludeUniqueColumns);
    }
            
    return instance;
};

// Base class for all Data Visualisation type Workspace Nodes
nodes.DataVisualisationBase = function(properties) {
    var instance = new nodes.DataProcessorBase(properties);
    instance.Type = 'DataVisualisation';

    instance.GetTransmitterPoint = undefined;

    return instance;
};

// Base class for various types of graph
nodes.Graph = function(properties) {
    var instance = new nodes.DataVisualisationBase(properties);
    instance.ChartTitle = ko.observable();
    instance.HorizontalAxis = ko.observable();
    instance.HorizontalAxisLabel = ko.observable();
    instance.VerticalAxisLabel = ko.observable();
    instance.DataSeriesColumnIndexes = ko.observableArray();
    instance.Values1 = ko.observable();

    var innerGetCoreSettings = instance.GetCoreSettings;
    instance.GetCoreSettings = function () {
        var settings = innerGetCoreSettings();
        settings.HorizontalAxis = instance.HorizontalAxis();
        settings.DataSeriesColumnIndexes = instance.DataSeriesColumnIndexes();
        return settings;
    };

    var innerGetSaveSettings = instance.GetSaveSettings;
    instance.GetSaveSettings = function () {
        var settings = innerGetSaveSettings();
        settings.ChartTitle = instance.ChartTitle();
        settings.HorizontalAxisLabel = instance.HorizontalAxisLabel();
        settings.VerticalAxisLabel = instance.VerticalAxisLabel();
        return settings;
    };

    var innerLoadSettings = instance.LoadSettings;
    instance.LoadSettings = function (settings, model) {
        innerLoadSettings(settings, model);
        instance.ChartTitle(settings.ChartTitle)
        instance.HorizontalAxis(settings.HorizontalAxis);
        instance.HorizontalAxisLabel(settings.HorizontalAxisLabel);
        instance.VerticalAxisLabel(settings.VerticalAxisLabel);
        instance.DataSeriesColumnIndexes(settings.DataSeriesColumnIndexes);
        instance.Values1(settings.Values1);
    };

    instance.RemoveAll = function() {
        instance.DataSeriesColumnIndexes.removeAll();
    }

    instance.AddAll = function() {
        instance.DataSeriesColumnIndexes.removeAll();
        $.each(instance.AllInputColumnInfos(), function(i, info) {
            instance.DataSeriesColumnIndexes.push(info.Index);
        });
    }

    instance.RemoveItem = function(item, event) {
        instance.DataSeriesColumnIndexes.splice($(event.target).parent().prevAll().length, 1);
    }

    instance.GetColumnName = function(i) {
        if (instance.AllInputColumns().length > i) {
            return instance.AllInputColumns()[i];
        }
        else {
            return "";
        }
    }

    var innerOnInputsUpdated = instance.OnInputsUpdated;
    instance.OnInputsUpdated = function(model) {
        innerOnInputsUpdated(model);
        if (instance.DataSeriesColumnIndexes().length == 0 && instance.Values1() != null && instance.Inputs().length > 0) {
            var input1 = model.GetNodeById(instance.Inputs()[0]);
            $.each(input1.Columns(), function(i, inputCol) {
                if (inputCol == instance.Values1()) {
                    instance.DataSeriesColumnIndexes([ i ]);
                }
            })
        }
    }

    return instance;
}

nodes.LineChart = function (properties) {
    var instance = new nodes.Graph(properties);
    instance.RenderResults = function (resultsContainer, model) {
        if ($(resultsContainer).hasClass("chart") === false) {
            $(resultsContainer).addClass("chart")
        }

        if ($(resultsContainer).hasClass("linechart") === false) {
            $(resultsContainer).addClass("linechart")
        }

        $(resultsContainer).empty();

        if (instance.Inputs().length > 0 && instance.HorizontalAxis() != null && instance.DataSeriesColumnIndexes().length > 0) {
            backend.LoadData(models.ServerQueryKey, models.GetCoreNodeSettings(), models.SelectedNode().Id, null, null, "JSON", null,
                function (data) {

                    var margin = { top: 20, right: 20, bottom: 40, left: 50 },
                        width = $(resultsContainer).innerWidth() - margin.left - margin.right,
                        height = $(resultsContainer).innerHeight() - margin.top - margin.bottom;


                    var xScale, xAxis, xSelector;
                    if (tools.IsDatetimeType(data.column_types[0])) {
                        xSelector = function (d) { return new Date(d[0]); };

                        xScale = d3.time.scale()
                            .domain(d3.extent(data.rows, xSelector))
                            .range([0, width]);

                        xAxis = d3.svg.axis()
                            .scale(xScale)
                            .orient("bottom")
                            .ticks(5);
                    } else {
                        xSelector = function (d) { return d[0]; };

                        xScale = d3.scale.linear()
                            .domain(d3.extent(data.rows, xSelector))
                            .range([0, width]);

                        xAxis = d3.svg.axis()
                            .scale(xScale)
                            .orient("bottom")
                            .ticks(5);
                    }

                    var min = Math.min.apply(null, data.rows.map(function (row) { return Math.min.apply(null, row.slice(1)) }));;
                    var max = Math.max.apply(null, data.rows.map(function (row) { return Math.max.apply(null, row.slice(1)) }));


                    var yScale = d3.scale.linear()
                        .domain([min, max])
                        .range([height, 0]);

                    var yAxis = d3.svg.axis()
                        .scale(yScale)
                        .orient("left")
                        .ticks(5);

                    var parent = $(resultsContainer).empty();

                    // create svg
                    var svg = d3.select('#' + parent.attr('id'))
                        .append('svg')
                        .attr("width", width + margin.left + margin.right)
                        .attr("height", height + margin.top + margin.bottom);
                    
                    var inner = svg.append("g")
                       .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

                    // x axis
                    var xAxisGroup = inner.append("g")
                            .attr("transform", "translate(0," + height + ")");
                    
                    xAxisGroup.call(xAxis)

                    xAxisGroup.selectAll("line,path")
                        .attr("fill", "none")
                        .attr("stroke", "#333333")
                        .attr("shape-rendering", "crispEdges");

                    xAxisGroup.selectAll("text")
                        .attr("font-family", "sans-serif")
                        .attr("text-anchor", "end")
                        .attr("font-size", "11px");

                    var xTitle = instance.HorizontalAxisLabel();
                    if (xTitle) {
                        xAxisGroup.append("text")
                                .attr("class", "label")
                                .attr("text-anchor", "middle")
                                .attr("x", width / 2)
                                .attr("y", margin.bottom - 6)
                                .text(xTitle);
                    }

                    // y axis
                    var yAxisGroup = inner.append("g");;

                    yAxisGroup.call(yAxis);

                    yAxisGroup.selectAll("text")
                        .attr("font-family", "sans-serif")
                        .attr("text-anchor", "end")
                        .attr("font-size", "11px");

                    yAxisGroup.selectAll("line,path")
                        .attr("fill", "none")
                        .attr("stroke", "#333333")
                        .attr("shape-rendering", "crispEdges");

                    var yTitle = instance.VerticalAxisLabel()
                    if (yTitle) {
                        yAxisGroup.append("text")
                                .attr("transform", "rotate(-90)")
                                .attr("x", -(height / 2))
                                .attr("y", -(margin.left - 6))
                                .attr("dy", ".71em")
                                .style("text-anchor", "middle")
                                .text(yTitle);
                    }

                    for (var i = 1; i < data.columns.length; i++) {
                        var line = d3.svg.line()
                        .x(function (d) {
                            return xScale(xSelector(d));
                        })
                        .y(function (d) {
                            return yScale(d[i]);
                        });

                        // create lines
                        inner.append("path")
                            .datum(data.rows)
                            .attr("fill", "none")
                            .attr("d", line)
                            .attr("stroke", instance.Tool.GetSeriesColor(i, 1))
                            .attr("stroke-width", "1px");
                    }
                }
            );
        }
    };

    return instance;
};

nodes.BarChart = function(properties) {
    var instance = new nodes.Graph(properties);
    instance.RenderResults = function (resultsContainer, model) {
        if ($(resultsContainer).hasClass("chart") === false) {
            $(resultsContainer).addClass("chart")
        }

        if ($(resultsContainer).hasClass("barchart") === false) {
            $(resultsContainer).addClass("barchart")
        }

        if (instance.Inputs().length > 0 && instance.HorizontalAxis() != null && instance.DataSeriesColumnIndexes().length > 0) {
            backend.LoadData(models.ServerQueryKey, models.GetCoreNodeSettings(), models.SelectedNode().Id, null, null, "JSON", null,
                function (data) {
                    var margin = { top: 20, right: 20, bottom: 40, left: 50 },
                                            width = $(resultsContainer).innerWidth() - margin.left - margin.right,
                                            height = $(resultsContainer).innerHeight() - margin.top - margin.bottom;

                    var xSelector = function (d) { return d[0]; };

                    var theData = data.rows.slice(0, 25);

                    var xScale = d3.scale.ordinal()
                        .domain(theData.map(xSelector))
                        .rangeRoundPoints([0, width], 1)

                    var xAxis = d3.svg.axis()
                        .scale(xScale)
                        .orient("bottom")
                        .ticks(theData.length);

                    var min = 0; //Math.min.apply(null, theData.map(function (row) { return Math.min.apply(null, row.slice(1)) }));;
                    var max = Math.max.apply(null, theData.map(function (row) { return Math.max.apply(null, row.slice(1)) }));


                    var yScale = d3.scale.linear()
                        .domain([min, max])
                        .range([height, 0]);

                    var yAxis = d3.svg.axis()
                        .scale(yScale)
                        .orient("left")
                        .ticks(5);

                    var parent = $(resultsContainer).empty();

                    // create svg
                    var svg = d3.select('#' + parent.attr('id'))
                        .append('svg')
                        .attr("width", width + margin.left + margin.right)
                        .attr("height", height + margin.top + margin.bottom);

                    var inner = svg.append("g")
                       .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

                    // x axis
                    var xAxisGroup = inner.append("g")
                            .attr("transform", "translate(0," + height + ")");

                    xAxisGroup.call(xAxis);

                    xAxisGroup.selectAll("line,path")
                        .attr("fill", "none")
                        .attr("stroke", "#333333")
                        .attr("shape-rendering", "crispEdges");

                    xAxisGroup.selectAll(".domain")
                        .attr("stroke", "none");

                    xAxisGroup.selectAll("text")
                        .style("text-anchor", "end")
                        .attr("dx", "-.8em")
                        .attr("dy", ".15em")
                        .attr("transform", "rotate(-65)")
                        .attr("font-family", "sans-serif")
                        .attr("text-anchor", "end")
                        .attr("font-size", "11px");

                    var xTitle = instance.HorizontalAxisLabel();
                    if (xTitle) {
                        xAxisGroup.append("text")
                                .attr("class", "label")
                                .attr("text-anchor", "middle")
                                .attr("x", width / 2)
                                .attr("y", margin.bottom - 6)
                                .text(xTitle);
                    }

                    // y axis
                    var yAxisGroup = inner.append("g");

                    yAxisGroup.call(yAxis);

                    yAxisGroup.selectAll("text")
                        .attr("font-family", "sans-serif")
                        .attr("text-anchor", "end")
                        .attr("font-size", "11px");

                    yAxisGroup.selectAll("line,path")
                        .attr("fill", "none")
                        .attr("stroke", "#333333")
                        .attr("shape-rendering", "crispEdges");

                    var yTitle = instance.VerticalAxisLabel()
                    if (yTitle) {
                        yAxisGroup.append("text")
                                .attr("transform", "rotate(-90)")
                                .attr("x", -(height / 2))
                                .attr("y", -(margin.left - 6))
                                .attr("dy", ".71em")
                                .style("text-anchor", "middle")
                                .text(yTitle);
                    }

                    var xOffset = 0;
                    var xSpace = width / theData.length;
                    if (theData.length > 1) {
                        var range = xScale.range();
                        xSpace = range[1] - range[0];
                        for (var i = 1; i + 1 < theData.length; i++) {
                            var diff = range[i + 1] - range[i]
                            if (diff < xSpace) {
                                xSpace = diff;
                            }
                        }
                        xOffset = range[0] - (xSpace / 2);
                    }

                    var bars = inner.append("g")
                        .selectAll("g")
                        .data(theData)
                        .enter().append("g")
                        .attr("transform", function (d, j) { return "translate(" + (xOffset + (j * xSpace)) + ",0)"; });

                    var barMargin = 6;
                    var barWidth = (xSpace - (2 * barMargin)) / (data.columns.length - 1);

                    for (var i = 1; i < data.columns.length; i++) {

                        bars.append("rect")
                            .attr("x", barMargin + ((i - 1) * barWidth))
                            .attr("y", function (d) { return yScale(d[i]); })
                            .attr("height", function (d) { return height - yScale(d[i]); })
                            .attr("width", barWidth - 1)
                            .on('mouseover', function (d) {
                                d3.select(this.parentNode).selectAll("rect").attr("opacity", 0.8);
                                d3.select(this.parentNode).selectAll("text").attr("fill", "black");
                            }).on('mouseout', function (d) {
                                d3.select(this.parentNode).selectAll("rect").attr("opacity", 1);
                                d3.select(this.parentNode).selectAll("text").attr("fill", "none");
                            })
                            .attr("fill", instance.Tool.GetSeriesColor(i, 1));

                        bars.append("text")
                            .attr("text-anchor", "middle")
                            .attr("fill", "none")
                            .attr("x", barMargin + ((i - .5) * barWidth))
                            .attr("y", function (d) { return yScale(d[i]) - 3; })
                            .text(function (d) { return d[i]; });
                    }

                    svg.attr("height", $('svg > g').get(0).getBBox().height + 6);

                    $(".bar").css("background-color", "Red");
                }
            );
        }
        else {
            $(resultsContainer).empty();
        }
    };

    return instance;
};

nodes.PieChart = function (properties) {
    var instance = new nodes.Graph(properties);

    instance.MinPercentage = ko.observable(1);

    instance.LabelType = ko.observable();

    instance.LabelTypes = ["Name Only", "Name and Value", "Name and Percentage"];

    instance.Colours = ['#98abc5', '#8a89a6', '#7b6888', '#6b486b', '#a05d56', '#d0743c', '#ff8c00', '#7283a2'];

    instance.OtherColour = '#BBB';

    var innerGetSaveSettings = instance.GetSaveSettings;
    instance.GetSaveSettings = function () {
        var settings = innerGetSaveSettings();
        settings.LabelType = instance.LabelType();
        settings.MinPercentage = instance.MinPercentage();
        return settings;
    };


    var innerLoadSettings = instance.LoadSettings;
    instance.LoadSettings = function (settings, model) {
        innerLoadSettings(settings, model);
        instance.LabelType(settings.LabelType);
        instance.MinPercentage(settings.MinPercentage);
    }


    instance.AllNumericInputColumnInfos = ko.pureComputed(function () {
        return instance.AllInputColumnInfos()
            .filter(function (colInfo) {
                return tools.IsNumericType(colInfo.Type)
            });
    });

    instance.DataSeriesColumnIndexes.push(null);


    instance.VerticalAxis = ko.pureComputed({
        read: function () {
            return instance.DataSeriesColumnIndexes()[0];
        },
        write: function (value) {
            instance.DataSeriesColumnIndexes()[0] = value;
        },
        owner: instance
    });

    instance.RenderResults = function (resultsContainer, model) {
        if ($(resultsContainer).hasClass("chart") === false) {
            $(resultsContainer).addClass("chart")
        }

        if ($(resultsContainer).hasClass("piechart") === false) {
            $(resultsContainer).addClass("piechart")
        }

        if (instance.Inputs().length > 0 && instance.HorizontalAxis() != null && instance.DataSeriesColumnIndexes().length > 0) {
            backend.LoadData(models.ServerQueryKey, models.GetCoreNodeSettings(), models.SelectedNode().Id, null, null, "JSON", null,
                function (data) {
                    var margin = { top: 20, right: 20, bottom: 20, left: 50 },
                        width = $(resultsContainer).innerWidth() - margin.left - margin.right,
                        height = $(resultsContainer).innerHeight() - margin.top - margin.bottom,
                        radius = Math.min(width, height) / 2;
                    
                    var unfilteredData = data.rows.slice(0, 25)
                        .sort(function (a, b) { return b[1] - a[1]; });

                    var total = unfilteredData.reduce(function (acc, item) { return acc + item[1]; }, 0),
                        other = 0,
                        filteredData = [];
                    
                    $.each(unfilteredData, function (i, datum) {
                        if (total != 0) {
                            datum[2] = 100 * datum[1] / total;
                            if (datum[2] >= instance.MinPercentage()) {
                                datum[3] = false;
                                filteredData.push(datum);
                            } else {
                                other += datum[1];
                            }
                        } else {
                            datum[2] = null;
                            datum[3] = false;
                            filteredData.push(datum);
                        }
                    });

                    if (other > 0) {
                        filteredData.push(["Other", other, total != 0 ? other / total : null, true]);
                    }

                    var pie = d3.layout.pie()
                        .sort(null)
                        .startAngle(-0.25 * Math.PI)
                        .endAngle(1.75 * Math.PI)
	                    .value(function (d) {
	                        return d[1];
	                    });

                    var arc = d3.svg.arc()
	                    .outerRadius(radius * 0.8)
	                    .innerRadius(radius * 0.4);

                    var outerArc = d3.svg.arc()
	                    .outerRadius(radius * 0.9)
	                    .innerRadius(radius * 0.9);

                    var parent = $(resultsContainer).empty();

                    // create svg
                    var svg = d3.select('#' + parent.attr('id'))
                        .append('svg')
                        .attr("width", width + margin.left + margin.right)
                        .attr("height", height + margin.top + margin.bottom);

                    var g = svg.append("g")
                       .attr("transform", "translate(" + (margin.left + (width / 2)) + "," + (margin.top + (height / 2)) + ")");
                        
                    var lineFunction = d3.svg.line()
                        .x(function (d) { return d[0]; })
                        .y(function (d) { return d[1]; })
                        .interpolate("linear");

                    var getLabel = function (segment) {
                        var result = segment.data[0]

                        if (instance.LabelType() == "Name and Value") {
                            result += " (" + segment.data[1] + ")";
                        } else if (instance.LabelType() == "Name and Percentage") {
                            if (segment.data[2] != null) {
                                result += " (" + parseFloat(segment.data[2].toPrecision(3)) + "%)";
                            } else {
                                result += " (" + segment.data[1] + ")";
                            }
                        }
                        return result;
                    }

                    $.each(pie(filteredData), function (i, segment) {
                        var segmentGrp = g.append("g"),
                            innerPoint = arc.centroid(segment),
                            outerPoint = outerArc.centroid(segment),
                            onLeftSide = outerPoint[0] < 0,
                            textPoint = [onLeftSide ? -radius : radius, outerPoint[1]];
                        
                        var slice = segmentGrp.append("path")
                            .attr("fill", (segment.data[3] ? instance.OtherColour : instance.Colours[i % instance.Colours.length]))
                            .attr("d", arc(segment));

                        var lineGraph = segmentGrp.append("path")
                            .attr("d", lineFunction([innerPoint, outerPoint, textPoint]))
                            .attr("stroke", "black")
                            .attr("stroke-width", 1)
                            .attr("fill", "none");

                        var text = segmentGrp.append("text")
                            .text(getLabel(segment))
                            .attr('x', textPoint[0])
                            .attr('y', textPoint[1])
                            .attr('text-anchor', onLeftSide ? 'end' : 'start')
                            .attr('alignment-baseline', 'middle');

                    })
                }
            );
        }
        else {
            $(resultsContainer).empty();
        }
    };

    return instance;
};
// 'tools' Module
//
// Defines a number of different tool classes that can be used to populate
// the toolbar of the application workspace
//
// Depends on: nodes.js, knockout.js

tools = {
    TemplatesFolder: "/partials/"
};

tools.ToolBase = function(properties) {
    var instance = {};

    instance.Name = properties.Name;
    instance.Visible = properties.Visible;
    instance.Title = properties.Title;
    instance.Description = properties.Description;
    instance.SymbolPath = properties.SymbolPath;
    instance.CreatedCount = 0;
    instance.OpenOptionsOnDrop = false;
    instance.AllowConnectOnDrop = true;
    instance.MaxInputs = 0;
    instance.AllowImageExport = false;
    instance.HelpUrl = null;

    instance.createNode = function(name, y, x, id) {
        this.CreatedCount += 1;
        return new properties.NodeType({
            Name: name,
            Top: y, 
            Left: x, 
            SymbolPath: properties.SymbolPath,
            OptionsTemplateUrl: properties.OptionsTemplateUrl,
            Tool: this,
            Id: id
        });
    }

    instance.Colors = [
        [100, 100, 255],
        [255, 100, 100],
        [100, 255, 100],
        [100, 255, 255],
        [255, 255, 100],
        [255, 100, 255]
    ];

    instance.GetSeriesColor = function(seriesNumber, opacity) {
        var baseColor = instance.Colors[seriesNumber % instance.Colors.length].slice(0);
        var offset = 100 / Math.floor(seriesNumber / instance.Colors.length);
        if (seriesNumber >= instance.Colors.length) {
            for (var i = 0; i < baseColor.length; i++) {
                baseColor[i] -= offset;
            }
        }

        return "rgba(" + baseColor[0] + "," + baseColor[1] + "," + baseColor[2] + "," + opacity + ")";
    };

    return instance;
};

tools.DatabaseTable = function() {
    var instance = new tools.ToolBase({
        Name: "Data Table",
        Title: "Data Table",
        Visible: true,
        Description: "Loads a database table", 
        SymbolPath: "M15.499,23.438c-3.846,0-7.708-0.987-9.534-3.117c-0.054,0.236-0.09,0.48-0.09,0.737v3.877c0,3.435,4.988,4.998,9.625,4.998s9.625-1.563,9.625-4.998v-3.877c0-0.258-0.036-0.501-0.09-0.737C23.209,22.451,19.347,23.438,15.499,23.438zM15.499,15.943c-3.846,0-7.708-0.987-9.533-3.117c-0.054,0.236-0.091,0.479-0.091,0.736v3.877c0,3.435,4.988,4.998,9.625,4.998s9.625-1.563,9.625-4.998v-3.877c0-0.257-0.036-0.501-0.09-0.737C23.209,14.956,19.347,15.943,15.499,15.943zM15.5,1.066c-4.637,0-9.625,1.565-9.625,5.001v3.876c0,3.435,4.988,4.998,9.625,4.998s9.625-1.563,9.625-4.998V6.067C25.125,2.632,20.137,1.066,15.5,1.066zM15.5,9.066c-4.211,0-7.625-1.343-7.625-3c0-1.656,3.414-3,7.625-3s7.625,1.344,7.625,3C23.125,7.724,19.711,9.066,15.5,9.066z",
        NodeType: nodes.DatabaseTable,
        OptionsTemplateUrl: tools.TemplatesFolder + "DatabaseTable.html",
    });
    instance.OpenOptionsOnDrop = true;
    instance.HelpUrl = "http://querytreeapp.com/help/tools/data-table/"

    return instance;
};
        
tools.Join = function() {
    var instance = new tools.ToolBase({
        Name: "Join",
        Title: "Join",
        Visible: true,
        Description: "Link two tables together where two column values are the same", 
        SymbolPath: "M29.342,15.5L21.785999999999998,11.137V13.75H20.374999999999996C19.586999999999996,13.74,19.043999999999997,13.509,18.355999999999995,13.007C17.334999999999994,12.262,16.261999999999993,10.826,14.804999999999994,9.439C13.367,8.06,11.291,6.73,8.5,6.749H2.812V10.248999999999999H8.5C10.731,10.261,11.940999999999999,11.434,13.57,13.183C14.267,13.936,14.998000000000001,14.763,15.894,15.506C14.498000000000001,16.671,13.482,18.022,12.41,19.007C11.227,20.088,10.208,20.73,8.498000000000001,20.748H2.813V24.248H8.529C12.280999999999999,24.249000000000002,14.564,21.929000000000002,16.148,20.182000000000002C16.965,19.287000000000003,17.685,18.491000000000003,18.357,17.991000000000003C19.043,17.489000000000004,19.587,17.259000000000004,20.374,17.249000000000002H21.785999999999998V19.863000000000003L29.342,15.5Z",
        NodeType: nodes.Join,
        OptionsTemplateUrl: tools.TemplatesFolder + "Join.html"
    });
            
    instance.JoinType = ko.observableArray([
        { id: "Inner", text: "Only matches from both" }, // Inner Join
        { id: "LeftOuter", text: "All of Table 1, with matches from Table 2" }, // Left Outer Join
        { id: "RightOuter", text: "All of Table 2, with matches from Table 1" }, // Right Outer Join
        { id: "FullOuter", text: "All of both tables, matched where possible" }, // Full Outer Join
        { id: "Cross", text: "Every possible combination" } // Cross Join
    ]);
    instance.MaxInputs = 2;
    instance.HelpUrl = "http://querytreeapp.com/help/tools/join/"

    return instance;
};

tools.Filter = function() {
    var instance = new tools.ToolBase({
        Name: "Filter",
        Title: "Filter",
        Visible: true,
        Description: "Remove rows from a table that don't meet certain criteria", 
        SymbolPath: "M29.772,26.433L22.645999999999997,19.307C23.605999999999998,17.724,24.168999999999997,15.871999999999998,24.169999999999998,13.886C24.169,8.093,19.478,3.401,13.688,3.399C7.897,3.401,3.204,8.093,3.204,13.885C3.204,19.674,7.897,24.366,13.688,24.366C15.675,24.366,17.527,23.803,19.11,22.843L26.238,29.97L29.772,26.433ZM7.203,13.885C7.2090000000000005,10.303,10.106,7.407,13.687000000000001,7.399C17.266000000000002,7.407,20.165,10.303,20.171,13.885C20.163999999999998,17.465,17.266,20.361,13.687,20.369C10.106,20.361,7.209,17.465,7.203,13.885Z",
        NodeType: nodes.Filter,
        OptionsTemplateUrl: tools.TemplatesFolder + "Filter.html"
    });

    instance.Operators = ko.observableArray([
        { type: "EqualTo", simpleName: 'is equal to', number: true, text: true, date: true, bool: true, compareValue: true, showCaseSensitive: true },
        { type: "DoesNotEqual", simpleName: 'is not equal to', number: true, text: true, date: true, bool: true, compareValue: true, showCaseSensitive: true },
        { type: "GreaterThan", simpleName: 'is greater than', number: true, text: true, date: true, bool: false, compareValue: true, showCaseSensitive: false },
        { type: "GreaterThanOrEqualTo", simpleName: 'is greater than or equal to', number: true, text: true, date: true, bool: false, compareValue: true, showCaseSensitive: false },
        { type: "LessThan", simpleName: 'is less than', number: true, text: true, date: true, bool: false, compareValue: true, showCaseSensitive: false },
        { type: "LessThanOrEqualTo", simpleName: 'is less than or equal to', number: true, text: true, date: true, bool: false, compareValue: true, showCaseSensitive: false },
        { type: "StartsWith", simpleName: 'starts with', number: false, text: true, date: false, bool: false, compareValue: true, showCaseSensitive: true },
        { type: "EndsWith", simpleName: 'ends with', number: false, text: true, date: false, bool: false, compareValue: true, showCaseSensitive: true },
        { type: "Contains", simpleName: 'contains', number: false, text: true, date: false, bool: false, compareValue: true, showCaseSensitive: true },
        { type: "DoesNotContain", simpleName: 'doesn\'t contain', number: false, text: true, date: false, bool: false, compareValue: true, showCaseSensitive: true },
        { type: "IsEmpty", simpleName: 'is empty', number: true, text: true, date: true, bool: true, compareValue: false, showCaseSensitive: false },
        { type: "IsNotEmpty", simpleName: 'is not empty', number: true, text: true, date: true, bool: true, compareValue: false, showCaseSensitive: false },
        { type: "Last24Hours", simpleName: 'was in the last 24 hours', number: false, text: false, date: true, bool: false, compareValue: false, showCaseSensitive: false },
        { type: "Next24Hours", simpleName: 'is in the next 24 hours', number: false, text: false, date: true, bool: false, compareValue: false, showCaseSensitive: false },
        { type: "Last7Days", simpleName: 'was in the last 7 days', number: false, text: false, date: true, bool: false, compareValue: false, showCaseSensitive: false },
        { type: "Next7Days", simpleName: 'is in the next 7 days', number: false, text: false, date: true, bool: false, compareValue: false, showCaseSensitive: false },
        { type: "ThisMonth", simpleName: 'is this month', number: false, text: false, date: true, bool: false, compareValue: false, showCaseSensitive: false },
        { type: "NextMonth", simpleName: 'is next month', number: false, text: false, date: true, bool: false, compareValue: false, showCaseSensitive: false },
        { type: "LastMonth", simpleName: 'was last month', number: false, text: false, date: true, bool: false, compareValue: false, showCaseSensitive: false },
        { type: "Last90Days", simpleName: 'was in the last 90 days', number: false, text: false, date: true, bool: false, compareValue: false, showCaseSensitive: false },
        { type: "Next90Days", simpleName: 'is in the next 90 days', number: false, text: false, date: true, bool: false, compareValue: false, showCaseSensitive: false }
    ]);
    instance.MaxInputs = 1;
    instance.HelpUrl = "http://querytreeapp.com/help/tools/filter/";

    return instance;
};

tools.Sort = function() {
    var instance = new tools.ToolBase({ 
        Name: "Sort",
        Title: "Sort",
        Visible: true,
        Description: "Sort the rows into ascending or descending order of values", 
        SymbolPath: "M21.786,20.654C21.168000000000003,20.459,20.379,19.951,19.495,19.067C18.738,18.325,17.956,17.369,17.155,16.326C16.964000000000002,16.582,16.773,16.836000000000002,16.581,17.096C16.057,17.805,15.522,18.52,14.977,19.223C16.881,21.532999999999998,18.857,23.801,21.786,24.174999999999997V26.875999999999998L29.342000000000002,22.513999999999996L21.786,18.151999999999994V20.654ZM9.192,11.933C9.948,12.674,10.73,13.629999999999999,11.531,14.672C11.726,14.41,11.921000000000001,14.151,12.118,13.884C12.638,13.181000000000001,13.169,12.472000000000001,13.71,11.774000000000001C11.678,9.311,9.577000000000002,6.867000000000001,6.314000000000001,6.7490000000000006H2.814000000000001V10.249H6.314000000000001C6.969,10.223,7.996,10.735,9.192,11.933ZM21.786,10.341V12.876L29.342000000000002,8.512999999999998L21.786,4.149999999999998V6.796999999999997C19.882,7.015999999999997,18.361,8.144999999999998,17.035,9.440999999999997C14.839,11.623999999999997,12.919,14.607999999999997,11.024000000000001,16.979C9.157,19.416999999999998,7.283000000000001,20.866999999999997,6.312000000000001,20.75H2.812000000000001V24.25H6.312000000000001C8.497000000000002,24.221,10.191,22.984,11.652000000000001,21.557C13.846,19.372999999999998,15.768,16.39,17.661,14.018999999999998C19.205,12.003,20.746,10.679,21.786,10.341Z",
        NodeType: nodes.Sort,
        OptionsTemplateUrl: tools.TemplatesFolder + "Sort.html"
    });
    instance.MaxInputs = 1;
    instance.HelpUrl = "http://querytreeapp.com/help/tools/sort/";

    return instance;
};

tools.Select = function() {
    var instance = new tools.ToolBase({
        Name: "Select",
        Title: "Select",
        Visible: true,
        Description: "Pick which columns you want and in what order they should appear",
        SymbolPath: "M29.548,3.043c-1.081-0.859-2.651-0.679-3.513,0.401L16,16.066l-3.508-4.414c-0.859-1.081-2.431-1.26-3.513-0.401c-1.081,0.859-1.261,2.432-0.401,3.513l5.465,6.875c0.474,0.598,1.195,0.944,1.957,0.944c0.762,0,1.482-0.349,1.957-0.944L29.949,6.556C30.809,5.475,30.629,3.902,29.548,3.043zM24.5,24.5h-17v-17h12.756l2.385-3H6C5.171,4.5,4.5,5.171,4.5,6v20c0,0.828,0.671,1.5,1.5,1.5h20c0.828,0,1.5-0.672,1.5-1.5V12.851l-3,3.773V24.5z",
        NodeType: nodes.Select,
        OptionsTemplateUrl: tools.TemplatesFolder + "Select.html"
    });
    instance.MaxInputs = 1;
    instance.HelpUrl = "http://querytreeapp.com/help/tools/select/";

    return instance;
}

tools.Append = function() {
    var instance = new tools.ToolBase({ 
        Name: "Append",
        Title: "Append",
        Visible: true,
        Description: "Create a table from the child values on each row of the source table", 
        SymbolPath: "M26.679,7.858c-0.176-0.138-0.404-0.17-0.606-0.083l-9.66,4.183c-0.42,0.183-0.946,0.271-1.486,0.271c-0.753,0.002-1.532-0.173-2.075-0.412c-0.194-0.083-0.356-0.176-0.471-0.259c0.042-0.021,0.09-0.042,0.146-0.064l8.786-3.804l1.31,0.561V6.612c0-0.244-0.106-0.475-0.283-0.612c-0.176-0.138-0.406-0.17-0.605-0.083l-9.66,4.183c-0.298,0.121-0.554,0.268-0.771,0.483c-0.213,0.208-0.397,0.552-0.394,0.934c0,0.01,0.003,0.027,0.003,0.027v14.73c0,0.006-0.002,0.012-0.002,0.019c0,0.005,0.002,0.007,0.002,0.012v0.015h0.002c0.021,0.515,0.28,0.843,0.528,1.075c0.781,0.688,2.091,1.073,3.484,1.093c0.66,0,1.33-0.1,1.951-0.366l9.662-4.184c0.255-0.109,0.422-0.383,0.422-0.692V8.471C26.961,8.227,26.855,7.996,26.679,7.858zM20.553,5.058c-0.017-0.221-0.108-0.429-0.271-0.556c-0.176-0.138-0.404-0.17-0.606-0.083l-9.66,4.183C9.596,8.784,9.069,8.873,8.53,8.873C7.777,8.874,6.998,8.699,6.455,8.46C6.262,8.378,6.099,8.285,5.984,8.202C6.026,8.181,6.075,8.16,6.13,8.138l8.787-3.804l1.309,0.561V3.256c0-0.244-0.106-0.475-0.283-0.612c-0.176-0.138-0.407-0.17-0.606-0.083l-9.66,4.183C5.379,6.864,5.124,7.011,4.907,7.227C4.693,7.435,4.51,7.779,4.513,8.161c0,0.011,0.003,0.027,0.003,0.027v14.73c0,0.006-0.001,0.013-0.001,0.019c0,0.005,0.001,0.007,0.001,0.012v0.016h0.002c0.021,0.515,0.28,0.843,0.528,1.075c0.781,0.688,2.091,1.072,3.485,1.092c0.376,0,0.754-0.045,1.126-0.122V11.544c-0.01-0.7,0.27-1.372,0.762-1.856c0.319-0.315,0.708-0.564,1.19-0.756L20.553,5.058z",
        NodeType: nodes.Append,
        OptionsTemplateUrl: tools.TemplatesFolder + "Append.html"
    });
    instance.MaxInputs = 9999;
    instance.HelpUrl = "http://querytreeapp.com/help/tools/append/";

    return instance;
};

tools.LineChart = function() {
    var instance = new tools.ToolBase({ 
        Name: "Line Chart",
        Title: "Line Chart",
        Visible: true,
        Description: "Draw a line chart with lines coming from one or more columns on the source table", 
        SymbolPath: "M3.625,25.062C3.086,24.947000000000003,2.74,24.416,2.855,23.875L2.855,23.875L6.51,6.584L8.777,15.843L10.7,10.655000000000001L14.280999999999999,14.396L18.163999999999998,1.293000000000001L21.098,13.027000000000001L23.058,11.518L28.329,23.258000000000003C28.555,23.762000000000004,28.329,24.353,27.824,24.579000000000004L27.824,24.579000000000004C27.319000000000003,24.806000000000004,26.728,24.579000000000004,26.502000000000002,24.075000000000003L26.502000000000002,24.075000000000003L22.272000000000002,14.647000000000002L19.898000000000003,16.473000000000003L18.002000000000002,8.877000000000002L15.219000000000003,18.270000000000003L11.465000000000003,14.346000000000004L8.386,22.66L6.654999999999999,15.577L4.811999999999999,24.288C4.710999999999999,24.76,4.297,25.082,3.8329999999999993,25.082L3.8329999999999993,25.082C3.765,25.083,3.695,25.076,3.625,25.062L3.625,25.062Z",
        NodeType: nodes.LineChart,
        OptionsTemplateUrl: tools.TemplatesFolder + "LineChart.html"
    });
    instance.MaxInputs = 1;
    instance.AllowImageExport = true;
    instance.HelpUrl = "http://querytreeapp.com/help/tools/line-chart/";

    return instance;
};

tools.BarChart = function() {
    var instance = new tools.ToolBase({ 
        Name: "Bar Chart",
        Title: "Bar Chart",
        Visible: true,
        Description: "Draw a bar chart with the the size of the bars coming from one or more columns on the source table", 
        SymbolPath: "M21.25,8.375V28H27.75V8.375H21.25ZM12.25,28H18.75V4.125H12.25V28ZM3.25,28H9.75V12.625H3.25V28Z",
        NodeType: nodes.BarChart,
        OptionsTemplateUrl: tools.TemplatesFolder + "BarChart.html"
    });
    instance.MaxInputs = 1;
    instance.AllowImageExport = true;
    instance.HelpUrl = "http://querytreeapp.com/help/tools/bar-chart/";

    return instance;
};

tools.PieChart = function () {
    var instance = new tools.ToolBase({
        Name: "Pie Chart",
        Title: "Pie Chart",
        Visible: true,
        Description: "Draw a pie chart with the the size of the segments coming from one of columns on the source table",
        SymbolPath: "M17.203,10.187c0.959,0.194,1.862,0.652,2.62,1.358l6.851-5.207c-0.063-0.073-0.116-0.151-0.182-0.222c-2.5-2.758-5.845-4.275-9.283-4.543L17.203,10.187zM29.744,18.748c0.867-3.688,0.219-7.666-1.97-10.958l-6.838,5.198c0.514,0.974,0.708,2.057,0.597,3.119L29.744,18.748zM21.057,17.867c-0.297,0.629-0.717,1.215-1.266,1.712c-2.236,2.028-5.692,1.86-7.719-0.378c-2.027-2.237-1.86-5.695,0.377-7.723c0.85-0.771,1.876-1.222,2.933-1.365l0.005-8.575c-3.111,0.162-6.188,1.354-8.676,3.612c-5.728,5.198-6.16,14.06-0.964,19.792c5.195,5.729,14.052,6.164,19.781,0.964c1.699-1.543,2.92-3.409,3.679-5.418L21.057,17.867z",
        NodeType: nodes.PieChart,
        OptionsTemplateUrl: tools.TemplatesFolder + "PieChart.html"
    });
    instance.MaxInputs = 1;
    instance.AllowImageExport = true;
    instance.HelpUrl = "http://querytreeapp.com/help/tools/pie-chart/";

    return instance;
};

tools.Summarize = function () {
    var instance = new tools.ToolBase({
        Name: "Summarize",
        Title: "Summarize",
        Visible: true,
        Description: "Displays the statistics for the connected source table2",
        SymbolPath: "M22.646,19.307c0.96-1.583,1.523-3.435,1.524-5.421C24.169,8.093,19.478,3.401,13.688,3.399C7.897,3.401,3.204,8.093,3.204,13.885c0,5.789,4.693,10.481,10.484,10.481c1.987,0,3.839-0.563,5.422-1.523l7.128,7.127l3.535-3.537L22.646,19.307zM13.688,20.369c-3.582-0.008-6.478-2.904-6.484-6.484c0.006-3.582,2.903-6.478,6.484-6.486c3.579,0.008,6.478,2.904,6.484,6.486C20.165,17.465,17.267,20.361,13.688,20.369zM15.687,9.051h-4v2.833H8.854v4.001h2.833v2.833h4v-2.834h2.832v-3.999h-2.833V9.051z",
        NodeType: nodes.Stats2,
        OptionsTemplateUrl: tools.TemplatesFolder + "Stats2.html"
    });

    instance.AggFunctions = ko.observableArray([
        { id: 1, text: "Number" },
        { id: 2, text: "Total" },
        { id: 3, text: "Minimum" },
        { id: 4, text: "Maximum" },
        { id: 5, text: "Average" },
        { id: 6, text: "Median" }
    ]);

    instance.DateFunctions = ko.observableArray([
        { id: 1, text: "Date" },
        { id: 2, text: "Month" },
        { id: 3, text: "Year" },
    ]);

    instance.MaxInputs = 1;
    instance.HelpUrl = "http://querytreeapp.com/help/tools/summarize/";

    return instance;
};

tools.Extract = function () {
    var instance = new tools.ToolBase({
        Name: "Extract",
        Title: "Extract",
        Visible: true,
        Description: "Makes a new column by extracting text from within another column",
        SymbolPath: "M14.505,5.873c-3.937,2.52-5.904,5.556-5.904,9.108c0,1.104,0.192,1.656,0.576,1.656l0.396-0.107c0.312-0.12,0.563-0.18,0.756-0.18c1.128,0,2.07,0.411,2.826,1.229c0.756,0.82,1.134,1.832,1.134,3.037c0,1.157-0.408,2.14-1.224,2.947c-0.816,0.807-1.801,1.211-2.952,1.211c-1.608,0-2.935-0.661-3.979-1.984c-1.044-1.321-1.565-2.98-1.565-4.977c0-2.259,0.443-4.327,1.332-6.203c0.888-1.875,2.243-3.57,4.067-5.085c1.824-1.514,2.988-2.272,3.492-2.272c0.336,0,0.612,0.162,0.828,0.486c0.216,0.324,0.324,0.606,0.324,0.846L14.505,5.873zM27.465,5.873c-3.937,2.52-5.904,5.556-5.904,9.108c0,1.104,0.192,1.656,0.576,1.656l0.396-0.107c0.312-0.12,0.563-0.18,0.756-0.18c1.104,0,2.04,0.411,2.808,1.229c0.769,0.82,1.152,1.832,1.152,3.037c0,1.157-0.408,2.14-1.224,2.947c-0.816,0.807-1.801,1.211-2.952,1.211c-1.608,0-2.935-0.661-3.979-1.984c-1.044-1.321-1.565-2.98-1.565-4.977c0-2.284,0.449-4.369,1.35-6.256c0.9-1.887,2.256-3.577,4.068-5.067c1.812-1.49,2.97-2.236,3.474-2.236c0.336,0,0.612,0.162,0.828,0.486c0.216,0.324,0.324,0.606,0.324,0.846L27.465,5.873z",
        NodeType: nodes.Extract,
        OptionsTemplateUrl: tools.TemplatesFolder + "Extract.html"
    });
    instance.MaxInputs = 1;

    instance.StartTypes = ko.observableArray([
        { id: 1, text: "The beginning" },
        { id: 2, text: "At a specific position" },
        { id: 3, text: "At the first occurrence of..." },
        { id: 4, text: "After the first occurrence of..." },
    ]);

    instance.EndTypes = ko.observableArray([
        { id: 1, text: "The end" },
        { id: 2, text: "At a specific position" },
        { id: 3, text: "At a specific length" },
        { id: 4, text: "At the next occurrence of..." },
        { id: 5, text: "After the next occurrence of..." },
    ]);

    instance.HelpUrl = "http://querytreeapp.com/help/tools/extract/";

    return instance;
}

tools.IsNumericType = function (theType) {
    switch (theType.toUpperCase()) {
        case "INTEGER":
        case "INT":
        case "SMALLINT":
        case "TINYINT":
        case "MEDIUMINT":
        case "BIGINT":
        case "DECIMAL":
        case "NUMERIC":
        case "FLOAT":
        case "DOUBLE":
        case "REAL":
        case "MONEY":
        case "SMALLMONEY":
        case "DOUBLE PRECISION":
        case "SMALLSERIAL":
        case "SERIAL": 
        case "BIGSERIAL":
        case "INT4":
            return true;
        default:
            return false;
    }
}

tools.IsDatetimeType = function (theType) {
    switch (theType.toUpperCase()) {
        case "DATE":
        case "DATETIME":
        case "DATETIME2":
        case "TIME":
        case "TIMESTAMP":
        case "TIMESTAMP WITHOUT TIME ZONE":
        case "TIMESTAMP WITH TIME ZONE":
        case "DATE":
        case "TIME WITHOUT TIME ZONE":
        case "TIME WITH TIME ZONE":
        case "INTERVAL":
            return true;
        default:
            return false;
    }
}

tools.IsTextType = function (theType) {
    switch (theType.toUpperCase()) {
        case "VARCHAR":
        case "NVARCHAR":
        case "CHAR":
        case "NCHAR":
        case "TEXT":
        case "NTEXT":
        case "XML":
        case "UNIQUEIDENTIFIER":
        case "BINARY":
        case "VARBINARY":
        case "IMAGE":
        case "ENUM":
        case "CHARACTER VARYING":
        case "CHARACTER":
        case "TEXT":
        case "USER-DEFINED": // Treat any user defined columns as text
            return true;
        default:
            return false;
    }
}

// 'models' Module
//
// Defines the View Models for this application
//
// Depends on: knockout.js, nodes.js, tools.js, utils.js
models = {

    ResultsOnly: ko.observable(false),
    ResultsOnlyLoaded: ko.observable(false),
    ServerQueryKey: ko.observable(),

    ui_state: {
        workspace_canvas: null,
        dragging_handle: null,
        connecting_handle: null,
        connector: {
            IsVisible: ko.observable(false),
            StartX: ko.observable(),
            StartY: ko.observable(),
            EndX: ko.observable(),
            EndY: ko.observable()
        }
    },

    SelectedNode: ko.observable(),
    SelectedConnector: ko.observable(),

    SuggestedConnection: {
        IsVisible: ko.observable(false),
        FromNodeId: ko.observable(null),
        ToNodeId: ko.observable(null),
        ToDroppingPoint: {
            X: ko.observable(0),
            Y: ko.observable(0)
        }
    },

    Tools: [
        new tools.DatabaseTable(),
        new tools.Sort(),
        new tools.Filter(),
        new tools.Join(),
        new tools.Summarize(),
        new tools.Select(),
        new tools.Append(),
        new tools.Stats(),
        new tools.Stats2(),
        new tools.Extract(),
        new tools.LineChart(),
        new tools.BarChart(),
        new tools.PieChart()
    ]
};

models.SelectedNodeHasRender = ko.computed(function() {
    if (models.SelectedNode() != null) {
        return models.SelectedNode().RenderResults ? true : false;
    }
    else {
        return false;
    }
});


models.SelectedNodeHasRenderAndNotError = ko.computed(function() {
    if (models.SelectedNode() != null) {
        return models.SelectedNodeHasRender() && !models.SelectedNodeHasError() ? true : false;
    }
    else {
        return false;
    }
});

var formatNumber = function(num) {
    nStr = num + '';
    x = nStr.split('.');
    x1 = x[0];
    x2 = x.length > 1 ? '.' + x[1] : '';
    var rgx = /(\d+)(\d{3})/;
    while (rgx.test(x1)) {
        x1 = x1.replace(rgx, '$1' + ',' + '$2');
    }
    return x1 + x2;
};

models.CurrentData = ko.observableArray();        
models.CurrentRowStart = ko.observable(0);
models.CurrentRowStartFormatted = ko.computed(function() {
    return formatNumber(models.CurrentRowStart());
});
models.CurrentRowEnd = ko.observable(null);
models.CurrentRowEndFormatted = ko.computed(function() {
    return formatNumber(models.CurrentRowEnd());
});
models.CurrentRowsTotal = ko.observable();
models.CurrentRowsTotalFormatted = ko.computed(function() {
    return formatNumber(models.CurrentRowsTotal());
});
models.DataPageSize = ko.observable(10);

models.CurrentDataColumns = ko.computed(function() {
    if (models.SelectedNode() != null) {
        return models.SelectedNode().Columns();
    }
    else {
        return null;
    }
});

models.IsPreviousVisible = ko.computed(function() {
    if (models.CurrentRowStart() != null) {
        return models.CurrentRowStart() > 1;
    }
    else {
        return false;
    }
});

models.IsNextVisible = ko.computed(function() {
    if (models.CurrentRowEnd () != null) {
        return models.CurrentRowEnd() < models.CurrentRowsTotal();
    }
    else {
        return false;
    }
});

models.IsDataVisible = ko.computed(function() {
    if (models.SelectedNode() != null && models.CurrentData() != null && models.CurrentData().length > 0 && models.SelectedNodeStatus() == "ok" && models.RenderResults == undefined) {
        return true;
    }
    else {
        return false;
    }
});

models.SelectedNodeStatus = ko.observable(null);

models.SelectedNodeHasError = ko.computed(function() {
    return (models.SelectedNodeStatus() != null && models.SelectedNodeStatus() != "ok");
});

models.SelectedNodeErrorText = ko.computed(function () {
    if (models.SelectedNode() != null) {
        return models.SelectedNode().ErrorText();
    }
    else {
        return null;
    }
});

models.ObjectSelected = ko.computed(function() {
    return models.SelectedNode() != null;
});

models.ShowOptions = ko.computed(function() {
    return models.SelectedNode() != null;
});

models.ShowExportImage = ko.computed(function() {
    return models.SelectedNode() != null && models.SelectedNode().Tool.AllowImageExport;
});

models.ShowExport = ko.computed(function() {
    return models.IsDataVisible() || models.ShowExportImage();
});

var buildNodesArgs = function (models) {
    var nodes = []
    $.each(models.current_nodes(), function (i, node) {
        // Only get the 'core' settings, not the full 'save' settings because 
        // qt.exe doesn't need to know about all the visual aspects of the tree
        nodes.push(node.GetCoreSettings());
    });

    return nodes = JSON.stringify(nodes);
}

models.ExportFileName = ko.observable();

models.ExportUrl = ko.observable();
        
models.Export = function () {
    var databaseId = utils.GetHiddenValByName('DatabaseConnectionID');
    var node = models.SelectedNode();
    if (node != null) {
        if (models.ShowExportImage()) {
            var parent = $("div[data-results-node-id='" + node.Id + "']")
            var svg = document.getElementById(parent.attr("Id")).children[0];

            var serializer = new XMLSerializer();

            var img = new Image();
            img.src = 'data:image/svg+xml;base64,' + window.btoa(serializer.serializeToString(svg));

            var canvas = document.createElement("canvas");// get it's context
            canvas.width = $(svg).width()
            canvas.height = $(svg).height()

            ctx = canvas.getContext('2d');
            ctx.fillStyle = "#FFFFFF";
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            
            var dataUrl = canvas.toDataURL("image/png");
            dataUrl = dataUrl.replace(":image/png;", ":application/octet-stream;");
            models.ExportUrl(dataUrl);
            models.ExportFileName("image.png");
            return true;
        } else {
            if (models.ServerQueryKey()) {
                models.ExportUrl("/api/export/?id=" + models.ServerQueryKey() + "&nodeId=" + node.Id);
                models.ExportFileName("export.xlsx");
            } else {
                models.ExportUrl(null);
                models.ExportFileName(null);
            }
            return true;
        }
    } else {
        models.ExportFileName("");
        models.ExportUrl("");
    }
};

models.current_nodes = ko.observableArray();

models.findTool = function(name) {
    var result = null;
    $.each(models.Tools, function(i, val) {
        if (val.Name === name) {
            result = val;
        }
    });
    return result;
};


models.GetNodeAt = function (x, y) {
    var result = null;
    $.each(models.current_nodes(), function (i, val) {
        if (val.Top() <= y && (val.Top() + 48) >= y && val.Left() <= x && (val.Left() + 48) >= x) {
            result = val;
        }
    });
    return result;
}

models.GetNodeDragHandle = function(x, y) {
    var val = models.GetNodeAt(x, y), result = null;
    if (val != null) {
        result = { node: val, x: x - val.Left(), y: y - val.Top() };
    }
    return result;
}

models.GetNodeConnectionHandle = function(x, y, fromType) {
    var result = null;
    $.each(models.current_nodes(), function(i, node) {
        if (node.Inputs && fromType === 'output' && node.Top() <= y && (node.Top() + 48) >= y && (node.Left() - 16) <= x && (node.Left() + 48) >= x) {
            result = { node: node, type: 'input', mouseX: x, mouseY: y };
        }
        if ((node.Type === 'DataSource' || node.Type === 'DataProcessor') && (fromType === 'input' || fromType == undefined) && (node.Top() + 20) <= y && (node.Top() + 28) >= y && (node.Left() + 56) <= x && (node.Left() + 64) >= x) {
            result = { node: node, type: 'output', mouseX: x, mouseY: y };
        }
    });
    return result;
}

models.GetControlPoint = function(point1, point2) {
    return {
        x: Math.min(point1.x, point2.x) + (Math.abs(point1.x - point2.x) / 2),
        y: Math.min(point1.y, point2.y)
    }
}

models.GetConnectorAt = function(x, y) {
    var result = null;

    $.each(models.current_nodes(), function (i, node) {
        if (node.Inputs) {
            $.each(node.Inputs(), function (j, input) {
                for (var t = 0; t <= 1; t += 0.05) {

                    var receiverPoint = node.GetReceiverPoint();
                    var transmitterPoint = models.GetNodeById(input).GetTransmitterPoint();
                    var controlPoint = models.GetControlPoint(transmitterPoint, receiverPoint);

                    // Based on http://antoineleclair.ca/2011/08/27/understanding-quadratic-bezier-curves/
                    var p1x = transmitterPoint.x;
                    var p1y = transmitterPoint.y;
                    var cx = controlPoint.x;
                    var cy = controlPoint.y;
                    var p2x = receiverPoint.x;
                    var p2y = receiverPoint.y;

                    // Calculate the point on the curve for this value of t
                    var c1x = p1x + (cx - p1x) * t;
                    var c1y = p1y + (cy - p1y) * t;
                    var c2x = cx + (p2x - cx) * t;
                    var c2y = cy + (p2y - cy) * t;
                    var tx = c1x + (c2x - c1x) * t;
                    var ty = c1y + (c2y - c1y) * t;

                    var curvePoint = { x: tx, y: ty };

                    // Debug code
                    //var circle = new fabric.Circle({
                    //    top: curvePoint.y,
                    //    left: curvePoint.x,
                    //    strokeWidth: 1,
                    //    radius: 12,
                    //    fill: '#f00',
                    //    stroke: 'none',
                    //});
                    //models.ui_state.workspace_canvas.add(circle);
                    //models.ui_state.workspace_canvas.renderAll();
                    // End of Debug code

                    if ((curvePoint.x - 12) < x && x < (curvePoint.x + 12) && (curvePoint.y - 12) < y && y < (curvePoint.y + 12)) {
                        result = { fromNodeId: input, toNodeId: node.Id }
                        return false;
                    }
                }
            });
        }
    });
    return result;
}

models.RemoveConnector = function(fromNodeId, toNodeId) { 
    var destNode = models.GetNodeById(toNodeId);
    var removedInputs = destNode.Inputs.remove(function(input) {
        return input === fromNodeId;
    });

    $.each(removedInputs, function(j, removedInput) {
        // If this node has inputs, remove the connectors
        if (destNode.inputPaths) {
            models.ui_state.workspace_canvas.remove(destNode.inputPaths[removedInput]);
            models.ui_state.workspace_canvas.remove(destNode.inputCircles[removedInput]);

            var newInputPaths = {};
            for (var path in destNode.inputPaths) {
                if (path !== removedInput) {
                    newInputPaths[path] = destNode.inputPaths[path];
                }
            }
            destNode.inputPaths = newInputPaths;

            var newInputCircles = {};
            for (var circle in destNode.inputCircles) {
                if (circle !== removedInput) {
                    newInputCircles[circle] = destNode.inputCircles[circle];
                }
            }
            destNode.inputCircles = newInputCircles;
        }
    });

    if (removedInputs.length > 0) {
        destNode.OnInputsUpdated(models);
    }
}

models.GetNodeById = function(id) {
    var result = null;
    $.each(models.current_nodes(), function(i, val) {
        if (val.Id === id) {
            result = val;
        }
    });
    return result;
}

models.RemoveNode = function(id) {

    // Remove this node's ID from the list of inputs on other nodes
    $.each(models.current_nodes(), function(i, otherNode) {
        if (otherNode.Inputs) {
            var removedInputs = otherNode.Inputs.remove(function(input) {
                return input === id
            });

            $.each(removedInputs, function(j, removedInput) {
                // If this node has inputs, remove the connectors
                if (otherNode.inputPaths) {
                    models.ui_state.workspace_canvas.remove(otherNode.inputPaths[removedInput]);
                    models.ui_state.workspace_canvas.remove(otherNode.inputCircles[removedInput]);

                    delete otherNode.inputPaths[removedInput];
                    delete otherNode.inputCircles[removedInput];
                }
            });

            if (removedInputs.length > 0) {
                otherNode.OnInputsUpdated(models);
            }
        }
    });

    // Node remove this node
    var nodes = models.current_nodes.remove(function(node) {
        return node.Id === id;
    });

    if (nodes) {
        $.each(nodes, function(i, node) {

            // If the canvas has a group, remove it
            if (node.iconGroup) {
                models.ui_state.workspace_canvas.remove(node.iconGroup);
            }

            // If this node has inputs, remove the connectors
            if (node.inputPaths) {
                $.each(node.inputPaths, function(i, path) {
                    models.ui_state.workspace_canvas.remove(path);
                });

                $.each(node.inputCircles, function(i, circle) {
                    models.ui_state.workspace_canvas.remove(circle);
                });
            }

            if (node === models.SelectedNode()) {
                models.SelectedNode(null);
            }
        });
    }
}

models.IsCircularDependency = function(fromNode, toNode) {

    var checkInputsForId = function(inputs, id) {
        var result = false;
        $.each(inputs, function(i, val) {
            if (val === id) {
                result = true;
                return false;
            }
            else {
                var inputNode = models.GetNodeById(val);
                if (inputNode && inputNode.Inputs) {
                    if (checkInputsForId(inputNode.Inputs(), id)) {
                        result = true;
                        return false;
                    }
                }
            }
        });
        return result;
    }

    if (fromNode.Inputs) {
        return checkInputsForId(fromNode.Inputs(), toNode.Id);
    }
    else {
        return false;
    }
};

models.GetNodeInSuggestionRange = function(x, y, leftToRight, currentId) {
    var closestNode = null;
    if (leftToRight == undefined) {
        leftToRight = true;
    }
    $.each(models.current_nodes(), function (i, node) {
        if (currentId && node.Id == currentId) {
            return;
        }

        var otherNodePoint = null;
        if (leftToRight) {
            if (node.GetTransmitterPoint) {
                otherNodePoint = node.GetTransmitterPoint();
            }
        }
        else {
            if (node.GetReceiverPoint) {
                otherNodePoint = node.GetReceiverPoint();
            }
        }

        if (otherNodePoint != null) {
            var distance = Math.sqrt(Math.pow(x - otherNodePoint.x, 2) + Math.pow(y - otherNodePoint.y, 2))
            if (distance < 80) {
                if (closestNode == null || closestNode.distance > distance) {
                    closestNode = {
                        distance: distance,
                        node: node
                    }
                }
            }
        }
    });

    if (closestNode) {
        return closestNode.node;
    }
    else {
        return null;
    }
};

models.SuggestedConnection.FromPoint = ko.computed(function() {
    var fromNode = models.GetNodeById(models.SuggestedConnection.FromNodeId());
    if (fromNode != null) {
        var fromPoint = fromNode.GetTransmitterPoint();

        return {
            X: fromPoint.x,
            Y: fromPoint.y
        };
    }
    else {
        return {
            X: 0,
            Y: 0
        }
    }
});

models.SuggestedConnection.ToPoint = ko.computed(function() {
    var toNode = models.GetNodeById(models.SuggestedConnection.ToNodeId());
    if (toNode != null) {
        var toPoint = toNode.GetReceiverPoint();

        return {
            X: toPoint.x,
            Y: toPoint.y
        }
    }
    else {
        if (models.SuggestedConnection.ToDroppingPoint.X() !== 0 && models.SuggestedConnection.ToDroppingPoint.Y() !== 0) {
            return {
                X: models.SuggestedConnection.ToDroppingPoint.X(),
                Y: models.SuggestedConnection.ToDroppingPoint.Y()
            }
        }
        else {
            return {
                X: 0,
                Y: 0
            }
        }
    }
});

models.RemoveEverything = function() {
    // Clean everything up
    models.current_nodes.removeAll();
    if (models.ui_state.workspace_canvas != null) {
        models.ui_state.workspace_canvas.clear();
    }            
    models.SelectedNode(null);
    models.SelectedConnector(null);

    $.each(models.Tools, function(i, tool) {
        tool.CreatedCount = 0;
    });
}

models.MaxNodesWidth = function() {
    var result = 0;
    $.each(models.current_nodes(), function(i, node) {
        result = Math.max(result, node.GetRightExtent());
    });
    return result;
};

models.MaxNodesHeight = function() {
    var result = 0;
    $.each(models.current_nodes(), function(i, node) {
        result = Math.max(result, node.GetBottomExtent());
    });
    return result;
};

models.FormatColumn = function(index, data) {
    var column_type = null;

    if (models.SelectedNode() != null) {
        column_type = models.SelectedNode().ColumnTypes()[index];
    }

    if (data != null) {
        switch (column_type) {
            case 'datetime':
                return moment(data).format('lll');
            case 'date':
                return moment(data).format('ll');
            default:
                return data;
        }
    }

    return null;
}

models.GetCoreNodeSettings = function () {
    var nodes = []
    $.each(models.current_nodes(), function (i, node) {
        // Only get the 'core' settings, not the full 'save' settings because 
        // qt.exe doesn't need to know about all the visual aspects of the tree
        nodes.push(node.GetCoreSettings());
    });

    return nodes;
}
// 'events' Module
//
// This file contains controllers for responding to user/system events
//
// Depends on: knockout.js, models.js, utils.js, platform-specific.js, backend.js

// Helper function to get the mouse position on the
// canvas, based on a jQuery event object 'e'
var getMouse = function(event) {
    var workspace_pos = $("#workspace_canvas").offset();
    if (event.touches && event.touches.length > 0) {
        return { x: event.touches[0].pageX - workspace_pos.left - 1, y: event.touches[0].pageY - workspace_pos.top };
    }
    else {
        return { x: event.pageX - workspace_pos.left - 1, y: event.pageY - workspace_pos.top };
    }
}

events = {};
        
events.OnBottomPanelResize = function(event, ui) {

    events.OnResultsPanelResize(ui.offset.top);
}

events.SetBottomPanelSize = function() {
    $("div#bottom_panel").css("height", $(window).height() - ($("div#top_panel").height() + $("div#navbar").height()) + "px");
    $("div#bottom_panel").find(".flexibleHeight").css("height", $("div#bottom_panel").height() - 12);
}

events.OnResultsPanelResize = function(resizerPosition) {
    var topPanelHeight = resizerPosition - $("div#navbar").height();
    var bottomPanelHeight = $(window).height() - resizerPosition;

    $("div#top_panel").css("height", topPanelHeight + "px");
    $("div#bottom_panel").css("height", bottomPanelHeight + "px");

    var div = $("#workspace");
    models.ui_state.workspace_canvas.setWidth(Math.max(div.width() - 15, models.MaxNodesWidth()));
    models.ui_state.workspace_canvas.setHeight(Math.max(div.height() - 3, models.MaxNodesHeight()));
    models.ui_state.workspace_canvas.calcOffset();

    $("div#bottom_panel").find(".flexibleHeight").css("height", $("div#bottom_panel").height() - 12);

    if (models.SelectedNode() && models.SelectedNode().RenderResults) {
        models.SelectedNode().RenderResults($("#nonTabularResultsContainer > div[data-results-node-id='" + models.SelectedNode().Id + "']"), models);
    }
}

events.OnToolDrag = function(event, ui, tool) {
    var helperPos = ui.helper.offset();
    var workspacePos = $("#workspace_canvas").offset();

    var dropPosition = {
        left: (helperPos.left - workspacePos.left) - 12,
        top: (helperPos.top - workspacePos.top) + 24
    };

    // Determine whether this type of tool has a receiver, if not then don't auto connect
    if (tool.AllowConnectOnDrop) {

        if (tool.MaxInputs > 0) {

            var suggestNode = models.GetNodeInSuggestionRange(dropPosition.left, dropPosition.top);

            if (suggestNode && suggestNode.GetTransmitterPoint) {

                models.SuggestedConnection.FromNodeId(suggestNode.Id);
                models.SuggestedConnection.ToNodeId(null);

                if (Math.abs((dropPosition.top - 24) - suggestNode.Top()) < 10) {
                    dropPosition.top = suggestNode.Top() + 24;
                }

                var horizontalDistance = Math.abs(dropPosition.left - suggestNode.Left() + 12);

                if (horizontalDistance > 110 && horizontalDistance < 130) {
                    dropPosition.left = suggestNode.Left() + 120 - 12;
                }

                var recvPoint = {
                    x: dropPosition.left,
                    y: dropPosition.top
                };

                models.SuggestedConnection.ToDroppingPoint.X(recvPoint.x);
                models.SuggestedConnection.ToDroppingPoint.Y(recvPoint.y);
                models.SuggestedConnection.IsVisible(true);
            }
            else {
                models.SuggestedConnection.IsVisible(false);
            }
        }
    }

    $("#dropTarget").offset({
        top: dropPosition.top + workspacePos.top - 24,
        left: dropPosition.left + workspacePos.left + 12
    });
}

events.OnToolDrop = function(event, ui, tool) {
    var workspacePos = $("#workspace_canvas").offset();
    var dropPos = $("#dropTarget").offset();
    var connected = false;
    if (tool) {
        var newNode = tool.createNode(
                tool.Title + " " + (tool.CreatedCount + 1),
                dropPos.top - workspacePos.top, 
                dropPos.left - workspacePos.left);

        models.current_nodes.push(newNode);

        if (models.SuggestedConnection.IsVisible() === true) {
            newNode.Inputs.push(models.SuggestedConnection.FromNodeId());
            newNode.OnInputsUpdated(models);
            connected = true;
        }

        events.LoadNodeOptionsTemplate(newNode, function() {
            // Wait until the options template is loaded before selecting the 
            // node in case it wants to modify its options UI at all
            events.SelectNode(newNode);
            if (newNode.Tool.OpenOptionsOnDrop || connected) {
                events.ShowOptionsDialog();
            }
        });
    }
}

events.LoadNodeOptionsTemplate = function(newNode, callback) {
    // Load the node's options template into the DOM
    $("#node_options_container").append("<div class='dialog' data-node-id='" + newNode.Id + "'></div>");
    $("#node_options_container > div[data-node-id='" + newNode.Id + "']").load(newNode.OptionsTemplateUrl, function() {
        // Wait till now to do this to avoid errors on full page applyBingings
        var optionsContainer = $("#node_options_container > div[data-node-id='" + newNode.Id + "']");
        ko.applyBindings(newNode, optionsContainer[0]);
        $('.node_options a').button();
        if (newNode.Tool.HelpUrl) {
            optionsContainer.append("<a class='toolHelpLink' href='#'>How does this tool work?</a>");
            optionsContainer.find(".toolHelpLink")
                .click(function() {
                    platformSpecific.OpenLink(newNode.Tool.HelpUrl);
                });
        }

        if (callback) {
            callback();
        }
    });
}

events.OnWindowResize = function() {
    events.OnResultsPanelResize($("#resize_bar").offset().top);
}

var snapToNode = function(staticNode, snappingNode, rightToLeft) {

    var mult = 1;

    if (rightToLeft) {
        mult = -1;
    }

    if (Math.abs(snappingNode.Top() - staticNode.Top()) < 10) {
        snappingNode.Top(staticNode.Top());
    }

    var horizontalDistance = Math.abs(snappingNode.Left() - staticNode.Left());

    if (horizontalDistance > 110 && horizontalDistance < 130) {
        snappingNode.Left(staticNode.Left() + (120 * mult));
    }
}

events.OnCanvasMouseMove = function(e) {
    var mouse = getMouse(e);
    if (models.ui_state.dragging_handle) {
        models.ui_state.dragging_handle.node.Top(mouse.y - models.ui_state.dragging_handle.y);
        models.ui_state.dragging_handle.node.Left(mouse.x - models.ui_state.dragging_handle.x);

        var suggested = false;

        // If this node takes inputs, check other nodes' position, if one is nearby suggest an auto-connect
        if (models.ui_state.dragging_handle.node.GetReceiverPoint) {

            // If there is a node close by and it's not already connected
            var receiverPoint = models.ui_state.dragging_handle.node.GetReceiverPoint();
            var suggestNode = models.GetNodeInSuggestionRange(receiverPoint.x, receiverPoint.y, true, models.ui_state.dragging_handle.node.Id);

            if (suggestNode && models.ui_state.dragging_handle.node.IsInputAllowed() === true && models.ui_state.dragging_handle.node.Inputs.indexOf(suggestNode.Id) == -1) {
                models.SuggestedConnection.FromNodeId(suggestNode.Id);
                models.SuggestedConnection.ToNodeId(models.ui_state.dragging_handle.node.Id);
                models.SuggestedConnection.IsVisible(true);
                suggested = true;
            }
            else {
                models.SuggestedConnection.IsVisible(false);
            }

            if (suggestNode != null) {
                snapToNode(suggestNode, models.ui_state.dragging_handle.node);
            }
        }

        // No suggested inputs near by, look for a suggested output
        if (suggested === false && models.ui_state.dragging_handle.node.GetTransmitterPoint) {

            // If there is an outputting node near by
            var transmitterPoint = models.ui_state.dragging_handle.node.GetTransmitterPoint();
            var suggestNode = models.GetNodeInSuggestionRange(transmitterPoint.x, transmitterPoint.y, false, models.ui_state.dragging_handle.node.Id);

            if (suggestNode && suggestNode.IsInputAllowed() === true && suggestNode.Inputs.indexOf(models.ui_state.dragging_handle.node.Id) == -1) {
                models.SuggestedConnection.FromNodeId(models.ui_state.dragging_handle.node.Id);
                models.SuggestedConnection.ToNodeId(suggestNode.Id);
                models.SuggestedConnection.IsVisible(true);
            }
            else {
                models.SuggestedConnection.IsVisible(false);
            }

            if (suggestNode != null) {
                snapToNode(suggestNode, models.ui_state.dragging_handle.node, true);
            }
        }
    }
    else if (models.ui_state.connecting_handle) {
        models.ui_state.connector.EndX(mouse.x);
        models.ui_state.connector.EndY(mouse.y);
    }
    else {
        var node = models.GetNodeAt(mouse.x, mouse.y);
        if (node != null) {
            $("html,body").css("cursor", "move");
        }
        else {
            $("html,body").css("cursor", "");
        }
    }
};

events.FetchSelectedNodeData = function(startRow, rowCount, callback) {
    if (models.SelectedNode() != null) {

        if (models.SelectedNode().IsConfigured() === true) {
            if (models.SelectedNodeHasRender() === false) {
            	var requestedNodeId = models.SelectedNode().Id;
            	models.SelectedNodeStatus("not_ready");

            	startRow = startRow || 0;
            	rowCount = rowCount || models.DataPageSize();

            	// Call server to get the data
            	backend.LoadData(models.ServerQueryKey, models.GetCoreNodeSettings(), models.SelectedNode().Id, startRow, rowCount, "JSON", null, function (data) {

            		if (data.status && models.SelectedNode() && models.SelectedNode().Id === requestedNodeId) {
            		    models.SelectedNodeStatus(data.status)

            		    models.SelectedNode().SetColumns(data.columns, data.column_types);

            			if (data.status === "ok") {
            				models.CurrentData(data.rows);
            				models.CurrentRowStart(startRow + 1);
            				models.CurrentRowEnd(startRow + data.rows.length);
            				models.CurrentRowsTotal(data.row_count);
            			}

            			if (data.status === "error") {
            				models.SelectedNode().ErrorText("Something went wrong while trying to fetch the data. Please contact an administrator.")
            			}
            		}
            	});
            }
            else {
            	models.CurrentData(null);
            	models.CurrentRowStart(null);
            	models.CurrentRowEnd(null);
            	models.CurrentRowsTotal(null);

            	// This node wants to render it's own results, so tell it to do so now
            	models.SelectedNode().RenderResults($("#nonTabularResultsContainer > div[data-results-node-id='" + models.SelectedNode().Id + "']"), models);
            }
        }
    }
}

events.SelectNode = function(node) {
    models.SelectedNode(node);
    models.SelectedNodeStatus(null);
    models.CurrentData(null);
    models.CurrentRowStart(0);
    models.CurrentRowEnd(null);
    models.CurrentRowsTotal(null);
    if (node != null) {
        node.OnSelected(models);
    }
}

events.OnCanvasMouseUp = function (e) {
    var modelChanged = false;
    var mouse = getMouse(e);
    if (models.ui_state.dragging_handle) {
        if (models.SelectedNode() != models.ui_state.dragging_handle.node) {
            events.SelectNode(models.ui_state.dragging_handle.node);
            events.FetchSelectedNodeData(0, models.DataPageSize());
        }

        if (models.SuggestedConnection.IsVisible()) {

            var node = models.GetNodeById(models.SuggestedConnection.ToNodeId());
            node.Inputs.push(models.SuggestedConnection.FromNodeId());
            node.OnInputsUpdated(models);

            models.SuggestedConnection.IsVisible(false);

            modelChanged = true;
        }
    }
    else {
        events.SelectNode(null);
    }
    models.ui_state.dragging_handle = null;

    if (models.ui_state.connecting_handle) {
        var connectToNode = models.GetNodeConnectionHandle(mouse.x, mouse.y, models.ui_state.connecting_handle.type);
        if (connectToNode && connectToNode.node.IsInputAllowed() && models.IsCircularDependency(models.ui_state.connecting_handle.node, connectToNode.node) == false) {
            if (models.ui_state.connecting_handle.type == 'input') {
                models.ui_state.connecting_handle.node.Inputs.push(connectToNode.node.Id);
                models.ui_state.connecting_handle.node.OnInputsUpdated(models);
            }
            else {
                connectToNode.node.Inputs.push(models.ui_state.connecting_handle.node.Id);
                connectToNode.node.OnInputsUpdated(models);
            }

            modelChanged = true;
        }

        models.ui_state.connecting_handle = null;
        models.ui_state.connector.IsVisible(false)
    }
    else if (models.ui_state.selecting_connector) {
        models.SelectedConnector(models.ui_state.selecting_connector);
    }
    else {
        models.SelectedConnector(null);
    }
    models.ui_state.selecting_connector = null;

    if (modelChanged) {
        backend.saveQuery(models.ServerQueryKey, models.GetCoreNodeSettings());
    }
}

events.OnCanvasMouseDown = function (e) {
    var mouse = getMouse(e);

    models.ui_state.dragging_handle = models.GetNodeDragHandle(mouse.x, mouse.y);
    if (models.ui_state.dragging_handle == null) {
        models.ui_state.connecting_handle = models.GetNodeConnectionHandle(mouse.x, mouse.y);

        if (models.ui_state.connecting_handle) {
            models.ui_state.connector.StartX(mouse.x);
            models.ui_state.connector.StartY(mouse.y);
            models.ui_state.connector.EndX(mouse.x);
            models.ui_state.connector.EndY(mouse.y);
            models.ui_state.connector.IsVisible(true);
        }
        else {
            models.ui_state.selecting_connector = models.GetConnectorAt(mouse.x, mouse.y);
        }
    }
},

events.OnCanvasDoubleClick = function (e) {
    if (models.SelectedNode() != null) {
        events.ShowOptionsDialog();
    }

    // Clear move cursor that might be hanging around from the tool hover
    $("html,body").css("cursor", "");
},

events.UpdateSelectedNodeOptions = function () {
    // Call OnOptionsUpdated on the selected node
    var node = models.SelectedNode();
    if (node) {
        node.OnOptionsUpdated(models);
    }
},

events.ShowOptionsDialog = function () {
    var optionsDiv = $(".dialog[data-node-id='" + models.SelectedNode().Id + "']");
    optionsDiv.dialog({
        title:"Tool Options",
        modal:true,
        buttons:[
            {
                text: "Ok", click: function () {
                    events.UpdateSelectedNodeOptions();
                    $(this).dialog("close");
                    backend.saveQuery(models.ServerQueryKey, models.GetCoreNodeSettings(), function () {
                        events.FetchSelectedNodeData();
                    });
                }


            },
            {
                text: "Remove Tool",
                class: 'removeButton',
                click: function () {
                    events.DeleteSelectedObject();
                    $(this).dialog("close");
                }
            }
        ],
        dragStop:function (event) {
            event.cancelBubble = true;
        },
        width:360,
        resizeStop: function( event, ui ) {
            // Pass any changes in height on to the expandable height items
            $(optionsDiv).find(".expandingHeight").each(function(i, element) {
                $(element).height($(element).height() + (ui.size.height - ui.originalSize.height));
            });
            $(optionsDiv).width("");
        }
    });
};
        
events.DeleteSelectedObject = function() {
    if (models.SelectedNode() != null) {
        $("#node_options_container > div[data-node-id='" + models.SelectedNode().Id + "']").remove();
        models.RemoveNode(models.SelectedNode().Id);
    }
    else if (models.SelectedConnector() != null) {
        models.RemoveConnector(models.SelectedConnector().fromNodeId, models.SelectedConnector().toNodeId);
    }

    backend.saveQuery(models.ServerQueryKey, models.GetCoreNodeSettings());
}

events.PagerStart = function() {
    if (models.SelectedNode() != null) {
        events.FetchSelectedNodeData(0, models.DataPageSize());
    }
}

events.PagerEnd = function() {
    if (models.SelectedNode() != null) {
        var start = (parseInt(models.CurrentRowsTotal() / models.DataPageSize()) * models.DataPageSize());
        if (start == models.CurrentRowsTotal()) {
            start -= models.DataPageSize();
        }
        var count = models.CurrentRowsTotal() - start;
        events.FetchSelectedNodeData(start, count);
    }
}

events.PagerNext = function() {
    if (models.SelectedNode() != null) {                
        events.FetchSelectedNodeData(models.CurrentRowStart() - 1 + models.DataPageSize(), models.DataPageSize());
    }
}

events.PagerPrev = function() {
    if (models.SelectedNode() != null) {
        events.FetchSelectedNodeData(models.CurrentRowStart() - 1 - models.DataPageSize(), models.DataPageSize());
    }
}
        
events.OnKeyUp = function(e) {
    if ($(document.activeElement).is("body")) {
        if (e.which === 46 || e.which === 8) { // Delete and backspace
            events.DeleteSelectedObject();
            return false;
        }
    }
}

events.OnKeyPress = function(e) {
    if (e.which === 13) { // Enter
        $("button.ui-state-focus").click(); // Click any button that currently has focus
        return false;
    }
}

// 'views' Module
//
// This file contains functions that render the model onto the DOM/Canvas
//
// Depends on: knockout.js, fabric.js, Delicious_500.font, jquery.ui.timepicker.js, jquery.maskedinput.min.js, jquery.numeric.js
//             models.js, events.js, nodes.js, 

views = {};

// helper function for finding the points on a connector path between two nodes
var getConnectorParameters = function(sourceNode, destinationNode) {
    var source = sourceNode.GetTransmitterPoint();
    var destination = destinationNode.GetReceiverPoint();
    return getConnectorParametersFromCoords(source.x, source.y, destination.x, destination.y);
}

var getConnectorParametersFromCoords = function(sourceX, sourceY, destinationX, destinationY) {
    return { 
        Top: Math.min(sourceY, destinationY) + (Math.abs(destinationY - sourceY) / 2),
        Left: Math.min(sourceX, destinationX) + (Math.abs(destinationX - sourceX) / 2),
        Height: Math.abs(destinationY - sourceY),
        Width: Math.abs(destinationX - sourceX),
        StartX: Math.abs(Math.min(0, destinationX - sourceX)),
        StartY: Math.abs(Math.min(0, destinationY - sourceY)),
        CurvePointX: (Math.abs(destinationX - sourceX) / 2),
        CurvePointY: 0,
        EndX: Math.abs(Math.max(0, destinationX - sourceX)),
        EndY: Math.abs(Math.max(0, destinationY - sourceY)),
        EndPointX: destinationX,
        EndPointY: destinationY
    };
}

views.RenderToolbarSymbol = function(element, valueAccessor) {
    var symbol_path = valueAccessor().SymbolPath;
    // This should work, but somehow doesn't, we'll have to use attributes in the HTML for now
    /*var parent = $(element).parent();
    var options = { width: parent.width(), height: parent.height() };*/
    var canvas = new fabric.StaticCanvas(element/*, options*/);

    var color = "#d9d9d9";

    var path = new fabric.Path(symbol_path, { 
        top: 16,
        left: 16,
        height: 32,
        width: 32,
        strokeWidth: 0,
        fill: color
    });

    canvas.add(path);
    canvas.renderAll();
}

var _dragged = null;
views.RenderDraggableToolbarButton = function(element, valueAccessor) {
    $(element).draggable({
        helper: function() {
            var helper = $("<div></div>").text(valueAccessor().Title);
            $(element).append(helper);
            return helper;
        },
        drag: function (event, ui) {
            events.OnToolDrag(event, ui, _dragged);
        },
        start: function () {
            _dragged = valueAccessor();
            $("#dropTarget").text(_dragged.Title).show();
        },
        stop: function() {
            models.SuggestedConnection.IsVisible(false);
            $("#dropTarget").hide();
        },
    });
}

views.RenderDroppableArea = function (element, valueAccessor) {
    $(element).droppable({
        drop: function (event, ui) {
            if (_dragged != null) {
                events.OnToolDrop(event, ui, _dragged);
                _dragged = null;
            }
        }
    });
}

views.CreateWorkspace = function(element, valueAccessor) {
    var div = $("#workspace");
    $("#workspace_canvas").attr("width", div.width()).attr("height", div.height());
    div[0].onselectstart = function() { return false; }

    models.ui_state.workspace_canvas = new fabric.StaticCanvas("workspace_canvas");
}

var drawOrUpdateConnector = function(
    isVisible,
    startX,
    startY,
    endX,
    endY,
    referenceHolder,
    color,
    isFront
    ) {
    if (isVisible === true) {
        var connectorParams = getConnectorParametersFromCoords(
            startX,
            startY,
            endX,
            endY);

        if (referenceHolder.path) {
            referenceHolder.path.path[0][1] = connectorParams.StartX;
            referenceHolder.path.path[0][2] = connectorParams.StartY;
            referenceHolder.path.path[1][1] = connectorParams.CurvePointX;
            referenceHolder.path.path[1][2] = connectorParams.CurvePointY;
            referenceHolder.path.path[1][3] = connectorParams.EndX;
            referenceHolder.path.path[1][4] = connectorParams.EndY;
            referenceHolder.path.set("top", connectorParams.Top);
            referenceHolder.path.set("left", connectorParams.Left);
            referenceHolder.path.set("height", connectorParams.Height);
            referenceHolder.path.set("width", connectorParams.Width);

            referenceHolder.circle.set("top", endY);
            referenceHolder.circle.set("left", endX);
        }
        else {
            referenceHolder.path = new fabric.Path("M" + connectorParams.StartX + " " + connectorParams.StartY  + " Q" + connectorParams.CurvePointX  + "," + connectorParams.CurvePointY + " " + connectorParams.EndX  + "," + connectorParams.EndY, {
                strokeWidth: 2,
                stroke: color,
                fill: "",
                top: connectorParams.Top,
                left: connectorParams.Left,
                height: connectorParams.Height,
                width: connectorParams.Width
            });

            referenceHolder.circle = new fabric.Circle({
                top: connectorParams.EndPointY,
                left: connectorParams.EndPointX,
                strokeWidth: 1,
                radius: 4,
                fill: color,
                stroke: 'none'
            });

            referenceHolder.circle.hasBorders = false;
            models.ui_state.workspace_canvas.add(referenceHolder.circle);
            models.ui_state.workspace_canvas.add(referenceHolder.path);

            if (isFront) {
                models.ui_state.workspace_canvas.bringToFront(referenceHolder.circle);
                models.ui_state.workspace_canvas.bringToFront(referenceHolder.path);
            }
            else {
                models.ui_state.workspace_canvas.sendToBack(referenceHolder.circle);
                models.ui_state.workspace_canvas.sendToBack(referenceHolder.path);
            }
        }
        models.ui_state.workspace_canvas.renderAll();
    }
    else {
        if (referenceHolder.path) {
            models.ui_state.workspace_canvas.remove(referenceHolder.path);
            models.ui_state.workspace_canvas.remove(referenceHolder.circle);
        }
        referenceHolder.path = null;
        referenceHolder.circle = null;
    }
}

views.RedrawConnector = function() {

    drawOrUpdateConnector(
        models.ui_state.connector.IsVisible(),
        models.ui_state.connector.StartX(),
        models.ui_state.connector.StartY(),
        models.ui_state.connector.EndX(),
        models.ui_state.connector.EndY(),
        models.ui_state.connector,
        "#900",
        true
    );

}

views.RedrawSuggestedConnector = function() {

    drawOrUpdateConnector(
        models.SuggestedConnection.IsVisible(),
        models.SuggestedConnection.FromPoint().X,
        models.SuggestedConnection.FromPoint().Y,
        models.SuggestedConnection.ToPoint().X,
        models.SuggestedConnection.ToPoint().Y,
        models.SuggestedConnection,
        "#a6a6a6",
        false
    );
}

views.RedrawWorkspace = function(element, valueAccessor) {
                
    // Draw connectors between the nodes first
    $.each(models.current_nodes(), function(i, node) {
        if (node.Inputs) {
            $.each(node.Inputs(), function(i, val) {
                if (node.inputPaths == undefined) {
                    node.inputPaths = {};
                    node.inputCircles = {};
                }

                var sourceNode = models.GetNodeById(val);
                if (sourceNode != null) { // If we're still loading up the nodes, this may be null, that's ok, we're redraw again in a minute
                    var connectorParams = getConnectorParameters(sourceNode, node);
    
                    // If we've already draw this connector, just update the params
                    if (node.inputPaths[val]) {
                        var arrow = node.inputPaths[val];
    
                        // Update the coords of arrow.path to reflect the new positions of the nodes
                        arrow.path[0][1] = connectorParams.StartX;
                        arrow.path[0][2] = connectorParams.StartY;
                        arrow.path[1][1] = connectorParams.CurvePointX;
                        arrow.path[1][2] = connectorParams.CurvePointY;
                        arrow.path[1][3] = connectorParams.EndX;
                        arrow.path[1][4] = connectorParams.EndY;
                        arrow.set("top", connectorParams.Top);
                        arrow.set("left", connectorParams.Left);
                        arrow.set("height", connectorParams.Height);
                        arrow.set("width", connectorParams.Width);
    
                        circle = node.inputCircles[val];
                        circle.set("top", connectorParams.EndPointY);
                        circle.set("left", connectorParams.EndPointX);
                    }
                    else {
                        // Can't find this connector, add it
                        node.inputPaths[val] = new fabric.Path("M" + connectorParams.StartX + " " + connectorParams.StartY  + " Q" + connectorParams.CurvePointX  + "," + connectorParams.CurvePointY + " " + connectorParams.EndX  + "," + connectorParams.EndY, {
                            strokeWidth: 2,
                            stroke: "#666",
                            fill: "",
                            top: connectorParams.Top,
                            left: connectorParams.Left,
                            height: connectorParams.Height, 
                            width: connectorParams.Width
                        });
    
                        models.ui_state.workspace_canvas.add(node.inputPaths[val]);
                        models.ui_state.workspace_canvas.sendToBack(node.inputPaths[val]);
    
                        node.inputCircles[val] = new fabric.Circle({
                            top: connectorParams.EndPointY,
                            left: connectorParams.EndPointX,
                            strokeWidth: 1,
                            radius: 4,
                            fill: '#666',
                            stroke: 'none'
                        });
    
                        node.inputCircles[val].hasBorders = false;
                        models.ui_state.workspace_canvas.add(node.inputCircles[val]);
                        models.ui_state.workspace_canvas.sendToBack(node.inputCircles[val]);
                    }
                }
            });
        }
    });

    $.each(models.current_nodes(), function(i, node) {

        // Keep a reference to the canvas object for this
        // node on the node itself, if it already exists
        // then just move it on redraws
        if (node.iconGroup) {
            node.iconGroup.top = node.Top() + 40; // ((48 + 8 + 24) / 2), all icons are 48 px high, text is 24 px high with 8px spacer
            if (node.Inputs) {
                if (node.Type === "DataSource" || node.Type === "DataProcessor") {
                    node.iconGroup.left = node.Left() + 24; // Group goes from -16 to +64, mid point is 24
                }
                else {
                    node.iconGroup.left = node.Left() + 16; // Group goes from -16 to +48, mid point is 16 
                }
            }
            else {
                node.iconGroup.left = node.Left() + 32; // Group does from 0 to +64, mid point is 32
            }

            // Check the text is still right
            var textObj = node.iconGroup.getObjects()[2];
            if (textObj.getText() !== node.Name()) {
                textObj.setText(node.Name());
            }
        }
        else {
            node.iconGroup = new fabric.Group();
            node.iconGroup.hasControls = false;
            node.iconGroup.hasBorders = false;
                    
            var fillColor = '#fff';
            if (node == models.SelectedNode()) {
                fillColor = '#ccf';
            }

            // Draw border / square background 48 x 48
            var rect = new fabric.Rect({
                top: node.Top() + 24, //  (48 / 2)
                left: node.Left() + 24, // (48 / 2)
                height: 48,
                width: 48,
                stroke: '#111',
                strokeWidth: 3,
                rx: 5,
                ry: 5,
                fill: fillColor 
            });

            node.iconGroup.add(rect);

            // Draw the symbol, offet by 8 to move it into the centre of the rect
            var symbol = new fabric.Path(node.SymbolPath, { 
                top: node.Top() + 24, // (32 / 2) + 8 
                left: node.Left() + 24, // (32 / 2) + 8
                fill: "#111",
                width: 32,
                height: 32
            });

            // scale up from 32x32 to 48x48
            symbol.scale(1.5);
                    
            node.iconGroup.add(symbol);

            // Draw the name below the icon
            var text = new fabric.Text(node.Name(), {
                fontFamily: 'Delicious_500', 
                left: node.Left() + 32, // (64 / 2), Half text width 
                top: node.Top() + 68, // 48 + 8 + (24 / 2), Icon height plus half of text height plus 8px spacer
                width: 64,
                height: 24,
                fontSize: 18,
                textAlign: "Center",
                fill: '#111'
            });

            node.iconGroup.add(text);

            // If the node exposes results, render a lollipop on the right
            if (node.Type === "DataSource" || node.Type === "DataProcessor") {
                var line = new fabric.Line([
                    node.Left() + 48,
                    node.Top() + 24, // (48 / 2), half way down the right hand edge of the rect
                    node.Left() + 60,
                    node.Top() + 24 // (48 / 2)
                ], { 
                    strokeWidth: 3
                });

                node.iconGroup.add(line);

                var circle = new fabric.Circle({
                    top: node.Top() + 24, // (48 / 2), half way down the right hand edge of the rect
                    left: node.Left() + 60,
                    strokeWidth: 3,
                    radius: 4,
                    fill: '#f00',
                    stroke: '#111'
                });

                circle.hasBorders = false;
                node.iconGroup.add(circle);
            }

            // If the node has Inputs, render a lollipop on the left
            if (node.Inputs) {
                var line = new fabric.Line([
                    node.Left() - 8,
                    node.Top() + 24, // (48 / 2), half way down the right hand edge of the rect
                    node.Left(),
                    node.Top() + 24 // (48 / 2)
                ], { 
                    strokeWidth: 3
                });

                node.iconGroup.add(line);

                var arc = new fabric.Path("M4 0 a4 4 0 0 1 0 8", { 
                    top: node.Top() + 24,
                    left: node.Left() - 12,
                    fill: "none",
                    width: 8,
                    height: 8,
                    stroke: '#111',
                    strokeWidth: 3
                });

                arc.hasBorders = false;
                node.iconGroup.add(arc);
            }

            models.ui_state.workspace_canvas.add(node.iconGroup);
        }
    });

    models.ui_state.workspace_canvas.renderAll();
}

var _dataSubscription = null;

views.UpdateSelectedConnector = function(connector) {

    if (connector) {
        var destNode = models.GetNodeById(connector.toNodeId);
        if (destNode.inputPaths) {
            destNode.inputPaths[connector.fromNodeId].set("stroke", "#900");
            destNode.inputCircles[connector.fromNodeId].set("fill", "#900");
        }
    }
    else {
        $.each(models.current_nodes(), function(i, node) {
            if (node.inputPaths) {
                for (var fromNodeId in node.inputPaths) {
                    node.inputPaths[fromNodeId].set("stroke", "#666");
                    node.inputCircles[fromNodeId].set("fill", "#666");
                }
            }
        });
    }

    models.ui_state.workspace_canvas.renderAll();
}

views.UpdateSelectedNode = function(node) {

    if (node) {
        // Change this node's color to indicate selection
        if (node.iconGroup) {
            node.iconGroup.item(0).set("fill", "#ccf");
        }

        // Reset the color of other nodes
        $.each(models.current_nodes(), function(i, otherNode) {
            if (otherNode != node) {
                if (otherNode.iconGroup) {
                    otherNode.iconGroup.item(0).set("fill", "#fff");
                }
            }
        });

        models.ui_state.workspace_canvas.renderAll();
    }
    else {
                
        $.each(models.current_nodes(), function(i, node) {
            if (node.iconGroup) {
                node.iconGroup.item(0).set("fill", "#fff");
            }
        });
        models.ui_state.workspace_canvas.renderAll();
    }
}

views.RenderSelectedNodeResults = function(element, valueAccessor) {
    $(element).children().hide();
    var node = valueAccessor();
    if (node() && node().RenderResults ) {
        // If this node does not already have a div for its results, create one
        var container = $(element).find("div[data-results-node-id='" + node().Id + "']");
        if (container.length === 0) {
            container = $("<div id='result_container_" + node().Id + "' data-results-node-id='" + node().Id + "'></div>");
            $(element).append(container);
        }
        container.show();
    }
}

views.RenderDraggableColumn = function (element) {
    var connector = ".connectedColumnList";
    $(element).draggable({
        connectToSortable: connector,
        helper: "clone",
        revert: "invalid",
        start: function( event, ui ) {
            // as this draggable item doesn't have a width from it's parent, set it explicitly
            // based on the current calculated width of an item in the list (i.e. prev)
            $(ui.helper).width($(ui.helper).prev().width());
        }
    });
};

views.RenderSortableColumnList = function (element, valueAccessor, allBindingsAccessor, viewModel) {
    var connector = ".connectedColumnList";
    var values = valueAccessor();
    var $element = $(element),
        data = values['data'],
        options = {
            connectWith: connector,
            dropOnEmpty: true,
            revert: true,
            start: function (event, ui) {
                if (ui.item.hasClass("selectedColumn")) {
                    viewModel.removeAt = ui.item.prevAll().length;
                }
            },
            stop: function (event, ui) {
                if (viewModel.removeAt != null) {
                    if (values['onMove'] != null) {
                        values['onMove'](viewModel.removeAt, ui.item.prevAll().length);
                    }
                    data.splice(viewModel.removeAt, 1);
                    data.splice(ui.item.prevAll().length, 0, parseInt(ui.item.attr("data-bind-col-index")));
                    ui.item.remove();
                    viewModel.removeAt = null;
                }
            },
            receive: function (event, ui) {
                if (values['onDrop'] != null) {
                    values['onDrop'](droppedPosition, parseInt(ui.item.attr("data-bind-col-index")));
                }
                var droppedPosition = $(this).children(".availableColumn").prevAll().length;
                data.splice(droppedPosition, 0, parseInt(ui.item.attr("data-bind-col-index")));
                $(event.target).children(".availableColumn").remove();
            }
        };

    $element.sortable(options).disableSelection();
};

views.DatePickerInit = function(element, valueAccessor, allBindingsAccessor) {
    //initialize datepicker with some optional options
    var options = allBindingsAccessor().datepickerOptions || {},
        $el = $(element);

    var onDateChange = function() {
        var observable = valueAccessor();
        observable($el.datepicker("getDate"));
    };

    options.onSelect = onDateChange;
    $el.change(onDateChange);

    $el.mask("9999-99-99");
    $el.datepicker(options);

    //handle disposal (if KO removes by the template binding)
    ko.utils.domNodeDisposal.addDisposeCallback(element, function() {
        $el.datepicker("destroy");
    });

};
    
views.DatePickerUpdate = function(element, valueAccessor) {
    var value = ko.utils.unwrapObservable(valueAccessor()),
        $el = $(element);

    //handle date data coming via json from Microsoft
    if (String(value).indexOf('/Date(') == 0) {
        value = new Date(parseInt(value.replace(/\/Date\((.*?)\)\//gi, "$1")));
    }

    var current = $el.datepicker("getDate");

    if ((value != undefined) && (value - current !== 0)) {
        $el.datepicker("setDate", value);
    }
};

views.TimePickerInit = function(element, valueAccessor, allBindingsAccessor) {
    //initialize datepicker with some optional options
    var options = allBindingsAccessor().timepickerOptions || {},
        $el = $(element);

    var onTimeChanged = function() {
        var observable = valueAccessor();
        observable($el.timepicker("getTime"));
    };

    options.onSelect = onTimeChanged;
    $el.change(onTimeChanged);

    $el.mask("99:99");
    $el.timepicker(options);
};
    
views.TimePickerUpdate = function(element, valueAccessor) {
    var value = ko.utils.unwrapObservable(valueAccessor()),
        $el = $(element);

    var current = $el.timepicker("getTime");

    if ((value != undefined) && (value - current !== 0)) {
        $el.timepicker("setTime", value);
    }
};

views.NumericInputInit = function(element, valueAccessor, allBindingsAccessor) {
    $(element).numeric();

    $(element).change(function() {
        var observable = valueAccessor();
        observable(parseFloat($(element).val()));
    });
};

views.NumericInputUpdate = function(element, valueAccessor) {
    var value = ko.utils.unwrapObservable(valueAccessor()),
        $el = $(element);

    var current = parseFloat($el.val());

    if ((value != undefined) && (value - current !== 0)) {
        $el.val(value);
    }
};
// Tell knockout about all our views
ko.bindingHandlers.canvas_symbol = {
    init: views.RenderToolbarSymbol
}

ko.bindingHandlers.draggable_tool = {
    init: views.RenderDraggableToolbarButton
}
ko.bindingHandlers.droppable_area = {
    init: views.RenderDroppableArea
}

ko.bindingHandlers.draw_nodes = {
    init: views.CreateWorkspace,
    update: views.RedrawWorkspace
}

ko.bindingHandlers.render_options = {
    update: views.RenderOptions
}

ko.bindingHandlers.render_results = {
    update: views.RenderSelectedNodeResults
}

ko.bindingHandlers.draggable_column = {
    init: views.RenderDraggableColumn
}

ko.bindingHandlers.draggable_column_trash = {
    init: views.RenderDraggaleColumnTrash
}
        
ko.bindingHandlers.sortable_column_list = {
    init: views.RenderSortableColumnList
};

ko.bindingHandlers.datepicker = {
    init: views.DatePickerInit,
    update: views.DatePickerUpdate
};

ko.bindingHandlers.timepicker = {
    init: views.TimePickerInit,
    update: views.TimePickerUpdate
};

ko.bindingHandlers.numeric = {
    init: views.NumericInputInit,
    update: views.NumericInputUpdate
};

$(document).ready(function() {

    $("input:text").focus(function() {
        $(this).select();
    });

    // Wire up all the UI events to their event handlers
    $("#workspace_canvas").bind("touchmove", events.OnCanvasMouseMove);
    $("#workspace_canvas").mousemove(events.OnCanvasMouseMove);
    $("#workspace_canvas").bind("touchstart", events.OnCanvasMouseDown);
    $("#workspace_canvas").mousedown(events.OnCanvasMouseDown);
    $("#workspace_canvas").bind("touchend", events.OnCanvasMouseUp);
    $("#workspace_canvas").mouseup(events.OnCanvasMouseUp);
    $("#workspace_canvas").dblclick(events.OnCanvasDoubleClick);

    $(window).resize(events.OnWindowResize);
            


    models.ui_state.connector.IsVisible.subscribe(views.RedrawConnector);
    models.ui_state.connector.StartX.subscribe(views.RedrawConnector);
    models.ui_state.connector.StartY.subscribe(views.RedrawConnector);
    models.ui_state.connector.EndX.subscribe(views.RedrawConnector);
    models.ui_state.connector.EndY.subscribe(views.RedrawConnector);

    models.SuggestedConnection.FromPoint.subscribe(views.RedrawSuggestedConnector);
    models.SuggestedConnection.ToPoint.subscribe(views.RedrawSuggestedConnector);
    models.SuggestedConnection.IsVisible.subscribe(views.RedrawSuggestedConnector);

    models.SelectedNode.subscribe(views.UpdateSelectedNode);
    models.SelectedConnector.subscribe(views.UpdateSelectedConnector);

    $("#result_options a.open-dialog").button({
        icons: { primary: "ui-icon-newwin" }
    });
    $("#result_options a.button").button();

    $("#showConfig").click(events.ShowOptionsDialog);
    //$("#export").click(events.ExportSelectedObject);
    $("#showQuery").click(events.ShowQueryForSelectedObject);
    $("#delete").click(events.DeleteSelectedObject);

    $(".notificationBar > .closeButton").click(function(e) { $(this).parent().slideUp("slow"); } );

    $("#PagerStart").click(events.PagerStart);
    $("#PagerPrev").click(events.PagerPrev);
    $("#PagerNext").click(events.PagerNext);
    $("#PagerEnd").click(events.PagerEnd);

    $(window).keyup(events.OnKeyUp);
    $(window).keypress(events.OnKeyPress);

    models.ResultsOnly($.QueryString["resultsOnly"] == "true");

    if (models.SelectedNode() != null) {
        events.FetchSelectedNodeData();
    }

    ko.applyBindings(models, $("#binding-root")[0]);

    $("#resize_bar").draggable({
        helper: function (event) {
            return $("<div class='bottomPanelResizer'></div>");
        },
        axis: "y",
        create: events.SetBottomPanelSize,
        stop: events.OnBottomPanelResize
    });

    $("div#bottom_left_panel").show();
    events.OnWindowResize();
});